-- Repair the administrator identity and product publishing permissions that were being lost.
-- Run this in Supabase SQL editor against the project that powers WinFast.

CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'user_roles_select_own'
  ) THEN
    CREATE POLICY "user_roles_select_own" ON public.user_roles
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.is_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(trim(COALESCE(_email, ''))) IN (
    'ing.gemaverduga@gmail.com'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO authenticated, service_role;

DO $$
BEGIN
  IF to_regprocedure('public.has_role(uuid,text)') IS NOT NULL
     AND to_regprocedure('public.has_role_text(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.has_role(uuid, text) RENAME TO has_role_text;
  END IF;
END
$$;

GRANT EXECUTE
ON FUNCTION public.has_role_text(uuid, text)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
  OR (
    _role = 'admin'::public.app_role
    AND _user_id = auth.uid()
    AND public.is_admin_email(auth.jwt() ->> 'email')
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE public.is_admin_email(u.email)
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "productos_select_all" ON public.productos;
DROP POLICY IF EXISTS "productos_public_select_approved" ON public.productos;
CREATE POLICY "productos_public_select_approved" ON public.productos
  FOR SELECT TO anon, authenticated
  USING (activo = true AND estado_moderacion = 'aprobado');

DROP POLICY IF EXISTS "productos_owner_select" ON public.productos;
CREATE POLICY "productos_owner_select" ON public.productos
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "productos_admin_select" ON public.productos;
CREATE POLICY "productos_admin_select" ON public.productos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.productos
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.reportes
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.support_tickets
TO authenticated;

DROP POLICY IF EXISTS "productos_insert_own" ON public.productos;
CREATE POLICY "productos_insert_own" ON public.productos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "productos_update_own" ON public.productos;
CREATE POLICY "productos_update_own" ON public.productos
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "productos_delete_own" ON public.productos;
CREATE POLICY "productos_delete_own" ON public.productos
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transacciones_select_own" ON public.transacciones;
CREATE POLICY "transacciones_select_own" ON public.transacciones
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "transacciones_insert_own" ON public.transacciones;
CREATE POLICY "transacciones_insert_own" ON public.transacciones
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transacciones_admin_select" ON public.transacciones;
CREATE POLICY "transacciones_admin_select" ON public.transacciones
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mensajes_select_chat_participant" ON public.mensajes;
CREATE POLICY "mensajes_select_chat_participant" ON public.mensajes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = mensajes.chat_id
        AND (c.comprador_id = auth.uid() OR c.vendedor_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "mensajes_insert_chat_participant" ON public.mensajes;
CREATE POLICY "mensajes_insert_chat_participant" ON public.mensajes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = remitente_id
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id
        AND (c.comprador_id = auth.uid() OR c.vendedor_id = auth.uid())
    )
  );

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificaciones_select_own" ON public.notificaciones;
CREATE POLICY "notificaciones_select_own" ON public.notificaciones
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "notificaciones_insert_own" ON public.notificaciones;
CREATE POLICY "notificaciones_insert_own" ON public.notificaciones
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notificaciones_update_own" ON public.notificaciones;
CREATE POLICY "notificaciones_update_own" ON public.notificaciones
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notificaciones_delete_own" ON public.notificaciones;
CREATE POLICY "notificaciones_delete_own" ON public.notificaciones
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "productos_public_read" ON storage.objects;
CREATE POLICY "productos_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'productos');

DROP POLICY IF EXISTS "productos_owner_insert" ON storage.objects;
CREATE POLICY "productos_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'productos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "productos_owner_update" ON storage.objects;
CREATE POLICY "productos_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'productos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'productos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "productos_owner_delete" ON storage.objects;
CREATE POLICY "productos_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'productos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Do not expose service-role key in frontend or public build output.
-- Keep it only in deployment env vars and server-side code.
