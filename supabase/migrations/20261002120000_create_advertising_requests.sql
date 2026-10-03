ALTER TABLE public.notificaciones
  ADD COLUMN IF NOT EXISTS datos jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.publicidad_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ubicacion text NOT NULL CHECK (
    ubicacion IN ('banner_principal', 'negocio_destacado', 'categoria', 'productos', 'servicios')
  ),
  precio numeric(10, 2) NOT NULL CHECK (precio >= 0),
  duracion_meses integer NOT NULL DEFAULT 1 CHECK (duracion_meses = 1),
  archivo_path text NOT NULL,
  comprobante_path text NOT NULL,
  url_destino text,
  estado text NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
  notas_admin text,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT publicidad_solicitudes_dates_check CHECK (
    (estado = 'APROBADO' AND fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND fecha_fin > fecha_inicio)
    OR (estado <> 'APROBADO' AND fecha_inicio IS NULL AND fecha_fin IS NULL)
  )
);

CREATE INDEX publicidad_solicitudes_owner_created_idx
  ON public.publicidad_solicitudes(user_id, created_at DESC);
CREATE INDEX publicidad_solicitudes_active_slot_idx
  ON public.publicidad_solicitudes(ubicacion, fecha_fin DESC)
  WHERE estado = 'APROBADO';

ALTER TABLE public.publicidad_solicitudes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.publicidad_solicitudes FROM anon, authenticated;
GRANT SELECT ON TABLE public.publicidad_solicitudes TO authenticated;
GRANT ALL ON TABLE public.publicidad_solicitudes TO service_role;

CREATE POLICY publicidad_solicitudes_select_own_or_admin
ON public.publicidad_solicitudes
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('publicidad', 'publicidad', false)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS publicidad_upload_own ON storage.objects;
CREATE POLICY publicidad_upload_own ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'publicidad'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS publicidad_delete_own ON storage.objects;
CREATE POLICY publicidad_delete_own ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'publicidad'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS publicidad_admin_select ON storage.objects;
CREATE POLICY publicidad_admin_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'publicidad'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE OR REPLACE FUNCTION public.publicidad_archivo_vigente(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.publicidad_solicitudes AS s
    WHERE s.archivo_path = p_path
      AND s.estado = 'APROBADO'
      AND s.fecha_inicio <= now()
      AND s.fecha_fin > now()
  );
$$;

REVOKE ALL ON FUNCTION public.publicidad_archivo_vigente(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publicidad_archivo_vigente(text) TO anon, authenticated;

DROP POLICY IF EXISTS publicidad_active_select ON storage.objects;
CREATE POLICY publicidad_active_select ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'publicidad'
  AND public.publicidad_archivo_vigente(name)
);

CREATE OR REPLACE FUNCTION public.solicitar_publicidad(
  p_ubicacion text,
  p_archivo_path text,
  p_comprobante_path text,
  p_url_destino text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  slot_settings jsonb;
  server_price numeric(10, 2);
  request_id uuid;
  current_account_type text;
  current_business_name text;
  destination text := NULLIF(trim(COALESCE(p_url_destino, '')), '');
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para solicitar publicidad'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT account_type, business_name
  INTO current_account_type, current_business_name
  FROM public.profiles
  WHERE id = actor_id;

  IF current_account_type IS DISTINCT FROM 'business'
     OR NULLIF(trim(COALESCE(current_business_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Completa tu perfil comercial para solicitar publicidad'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_ubicacion NOT IN ('banner_principal', 'negocio_destacado', 'categoria', 'productos', 'servicios') THEN
    RAISE EXCEPTION 'La ubicación publicitaria no es válida'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_archivo_path IS NULL OR p_archivo_path NOT LIKE actor_id::text || '/%'
     OR p_comprobante_path IS NULL OR p_comprobante_path NOT LIKE actor_id::text || '/%' THEN
    RAISE EXCEPTION 'Los archivos deben pertenecer a tu cuenta'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF destination IS NOT NULL AND destination !~* '^https://' THEN
    RAISE EXCEPTION 'El enlace de destino debe usar HTTPS'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'publicidad' AND name = p_archivo_path
  ) OR NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'comprobantes' AND name = p_comprobante_path
  ) THEN
    RAISE EXCEPTION 'No se encontraron el material publicitario y el comprobante'
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT settings -> 'advertising' -> p_ubicacion
  INTO slot_settings
  FROM public.monetization_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  IF slot_settings IS NULL
     OR slot_settings ->> 'enabled' IS DISTINCT FROM 'true'
     OR COALESCE(slot_settings ->> 'price', '') !~ '^[0-9]+([.][0-9]{1,2})?$' THEN
    RAISE EXCEPTION 'Esta ubicación publicitaria no está disponible'
      USING ERRCODE = 'check_violation';
  END IF;

  server_price := (slot_settings ->> 'price')::numeric(10, 2);
  IF server_price < 0 THEN
    RAISE EXCEPTION 'El precio configurado no es válido'
      USING ERRCODE = 'data_exception';
  END IF;

  INSERT INTO public.publicidad_solicitudes (
    user_id, ubicacion, precio, archivo_path, comprobante_path, url_destino
  )
  VALUES (
    actor_id, p_ubicacion, server_price, p_archivo_path, p_comprobante_path, destination
  )
  RETURNING id INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_publicidad(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitar_publicidad(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decidir_solicitud_publicidad(
  p_solicitud_id uuid,
  p_aprobar boolean,
  p_motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  current_state text;
  current_slot text;
  slot_settings jsonb;
  decision_note text := NULLIF(trim(COALESCE(p_motivo, '')), '');
BEGIN
  IF actor_id IS NULL OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Solo un administrador puede decidir solicitudes publicitarias'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_aprobar IS NULL THEN
    RAISE EXCEPTION 'Debes indicar si la solicitud se aprueba o se rechaza'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT p_aprobar AND (decision_note IS NULL OR char_length(decision_note) > 500) THEN
    RAISE EXCEPTION 'El motivo del rechazo debe tener entre 1 y 500 caracteres'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT estado, ubicacion INTO current_state, current_slot
  FROM public.publicidad_solicitudes
  WHERE id = p_solicitud_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud publicitaria no encontrada'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF current_state <> 'PENDIENTE' THEN
    RAISE EXCEPTION 'La solicitud ya fue decidida'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_aprobar THEN
    SELECT settings -> 'advertising' -> current_slot
    INTO slot_settings
    FROM public.monetization_settings
    ORDER BY updated_at DESC
    LIMIT 1;

    IF slot_settings IS NULL OR slot_settings ->> 'enabled' IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Esta ubicación publicitaria ya no está habilitada'
        USING ERRCODE = 'check_violation';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(current_slot), 0);

    IF EXISTS (
      SELECT 1
      FROM public.publicidad_solicitudes AS existing
      WHERE existing.ubicacion = current_slot
        AND existing.estado = 'APROBADO'
        AND existing.fecha_inicio < now() + interval '1 month'
        AND existing.fecha_fin > now()
    ) THEN
      RAISE EXCEPTION 'Esta ubicación ya está reservada durante el próximo mes'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE public.publicidad_solicitudes
  SET estado = CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'RECHAZADO' END,
      notas_admin = decision_note,
      fecha_inicio = CASE WHEN p_aprobar THEN now() ELSE NULL END,
      fecha_fin = CASE WHEN p_aprobar THEN now() + interval '1 month' ELSE NULL END,
      updated_at = now()
  WHERE id = p_solicitud_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decidir_solicitud_publicidad(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decidir_solicitud_publicidad(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.publicidad_activa(p_ubicacion text)
RETURNS TABLE (archivo_path text, url_destino text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.archivo_path, s.url_destino
  FROM public.publicidad_solicitudes AS s
  WHERE s.ubicacion = p_ubicacion
    AND s.estado = 'APROBADO'
    AND s.fecha_inicio <= now()
    AND s.fecha_fin > now()
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.publicidad_activa(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publicidad_activa(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.notificar_decision_publicidad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.estado = 'PENDIENTE' AND NEW.estado IN ('APROBADO', 'RECHAZADO') THEN
    INSERT INTO public.notificaciones (user_id, mensaje, leido, tipo, datos)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.estado = 'APROBADO'
        THEN 'Tu solicitud de publicidad fue aprobada.'
        ELSE 'Tu solicitud de publicidad fue rechazada. Motivo: '
          || COALESCE(NULLIF(trim(NEW.notas_admin), ''), 'Motivo no especificado')
      END,
      false,
      CASE WHEN NEW.estado = 'APROBADO' THEN 'publicidad_aprobada' ELSE 'publicidad_rechazada' END,
      jsonb_build_object(
        'ubicacion', NEW.ubicacion,
        'motivo', CASE WHEN NEW.estado = 'RECHAZADO' THEN NEW.notas_admin ELSE NULL END
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER publicidad_solicitudes_notify_decision
AFTER UPDATE OF estado ON public.publicidad_solicitudes
FOR EACH ROW
EXECUTE FUNCTION public.notificar_decision_publicidad();

REVOKE ALL ON FUNCTION public.notificar_decision_publicidad() FROM PUBLIC, anon, authenticated;