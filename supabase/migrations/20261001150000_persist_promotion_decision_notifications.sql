CREATE OR REPLACE FUNCTION public.aprobar_transaccion_promocion(p_transaccion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  transaction_user_id uuid;
  transaction_product_id uuid;
  transaction_plan text;
  transaction_state text;
  product_title text;
  plan_settings jsonb;
  official_duration integer;
  approval_note text := 'Tu pago ha sido aprobado y tu publicación ahora está destacada.';
BEGIN
  IF actor_id IS NULL OR NOT public.has_role(actor_id, 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede aprobar promociones'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT t.user_id, t.producto_id, t.plan, t.estado_pago, p.titulo
  INTO transaction_user_id, transaction_product_id, transaction_plan, transaction_state, product_title
  FROM public.transacciones AS t
  LEFT JOIN public.productos AS p ON p.id = t.producto_id
  WHERE t.id = p_transaccion_id
  FOR UPDATE OF t;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no encontrada'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF transaction_user_id IS NULL THEN
    RAISE EXCEPTION 'La transacción no tiene un usuario propietario'
      USING ERRCODE = 'check_violation';
  END IF;

  IF transaction_state IS DISTINCT FROM 'PENDIENTE' THEN
    RAISE EXCEPTION 'La transacción ya no está pendiente de aprobación'
      USING ERRCODE = 'check_violation';
  END IF;

  transaction_plan := upper(trim(COALESCE(transaction_plan, '')));
  IF transaction_plan NOT IN ('FLASH', 'BASICO', 'PLUS', 'PRO', 'MEGA') THEN
    RAISE EXCEPTION 'Plan de promoción no válido'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT ms.settings -> 'featured' -> transaction_plan
  INTO plan_settings
  FROM public.monetization_settings AS ms
  ORDER BY ms.updated_at DESC
  LIMIT 1;

  IF plan_settings IS NULL OR plan_settings = 'null'::jsonb
     OR plan_settings ->> 'enabled' IS DISTINCT FROM 'true'
     OR COALESCE(plan_settings ->> 'durationDays', '') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'La configuración server-side del plan es inválida'
      USING ERRCODE = 'data_exception';
  END IF;

  official_duration := (plan_settings ->> 'durationDays')::integer;
  IF official_duration < 1 THEN
    RAISE EXCEPTION 'La duración server-side del plan es inválida'
      USING ERRCODE = 'data_exception';
  END IF;

  UPDATE public.transacciones
  SET estado_pago = 'COMPLETADO',
      notas_admin = approval_note
  WHERE id = p_transaccion_id
    AND estado_pago = 'PENDIENTE';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La transacción ya no está pendiente de aprobación'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.productos
  SET es_destacado = true,
      promocionado_hasta = now() + make_interval(days => official_duration),
      tipo_promocion = transaction_plan
  WHERE id = transaction_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El producto asociado no existe'
      USING ERRCODE = 'no_data_found';
  END IF;

END;
$$;

REVOKE ALL ON FUNCTION public.aprobar_transaccion_promocion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprobar_transaccion_promocion(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rechazar_transaccion_promocion(
  p_transaccion_id uuid,
  p_motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  transaction_user_id uuid;
  transaction_state text;
  product_title text;
  rejection_reason text := NULLIF(trim(COALESCE(p_motivo, '')), '');
  admin_note text;
BEGIN
  IF actor_id IS NULL OR NOT public.has_role(actor_id, 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede rechazar promociones'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF rejection_reason IS NULL THEN
    RAISE EXCEPTION 'Debes indicar un motivo para el rechazo'
      USING ERRCODE = 'check_violation';
  END IF;

  IF char_length(rejection_reason) > 500 THEN
    RAISE EXCEPTION 'El motivo de rechazo no puede superar 500 caracteres'
      USING ERRCODE = 'string_data_right_truncation';
  END IF;

  SELECT t.user_id, t.estado_pago, p.titulo
  INTO transaction_user_id, transaction_state, product_title
  FROM public.transacciones AS t
  LEFT JOIN public.productos AS p ON p.id = t.producto_id
  WHERE t.id = p_transaccion_id
  FOR UPDATE OF t;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no encontrada'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF transaction_user_id IS NULL THEN
    RAISE EXCEPTION 'La transacción no tiene un usuario propietario'
      USING ERRCODE = 'check_violation';
  END IF;

  IF transaction_state IS DISTINCT FROM 'PENDIENTE' THEN
    RAISE EXCEPTION 'La transacción ya no está pendiente de rechazo'
      USING ERRCODE = 'check_violation';
  END IF;

  admin_note := rejection_reason;

  UPDATE public.transacciones
  SET estado_pago = 'RECHAZADO',
      notas_admin = admin_note
  WHERE id = p_transaccion_id
    AND estado_pago = 'PENDIENTE';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La transacción ya no está pendiente de rechazo'
      USING ERRCODE = 'check_violation';
  END IF;

END;
$$;

REVOKE ALL ON FUNCTION public.rechazar_transaccion_promocion(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rechazar_transaccion_promocion(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.disparar_notificacion_publicidad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  product_title text;
  notification_type text;
  notification_message text;
BEGIN
  IF OLD.estado_pago = 'PENDIENTE'
     AND NEW.estado_pago IN ('COMPLETADO', 'APROBADO', 'RECHAZADO') THEN
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'La transacción no tiene un usuario propietario'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT p.titulo
    INTO product_title
    FROM public.productos AS p
    WHERE p.id = NEW.producto_id;

    IF NEW.estado_pago IN ('COMPLETADO', 'APROBADO') THEN
      notification_type := 'promocion_aprobada';
      notification_message := format(
        'Tu promoción para "%s" fue aprobada. Tu publicación ahora está destacada.',
        COALESCE(product_title, 'tu publicación')
      );
    ELSE
      notification_type := 'promocion_rechazada';
      notification_message := format(
        'Tu promoción para "%s" fue rechazada. Motivo: %s',
        COALESCE(product_title, 'tu publicación'),
        COALESCE(NULLIF(trim(NEW.notas_admin), ''), 'Motivo no especificado')
      );
    END IF;

    INSERT INTO public.notificaciones (user_id, mensaje, leido, tipo)
    VALUES (NEW.user_id, notification_message, false, notification_type);
  END IF;

  RETURN NEW;
END;
$$;
