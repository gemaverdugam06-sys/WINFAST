CREATE OR REPLACE FUNCTION public.is_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(trim(COALESCE(_email, ''))) = 'ing.gemaverduga@gmail.com';
$$;

REVOKE ALL ON FUNCTION public.is_admin_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO authenticated, service_role;

DO $$
DECLARE
  primary_admin_id uuid;
BEGIN
  SELECT id
  INTO primary_admin_id
  FROM auth.users
  WHERE lower(email) = 'ing.gemaverduga@gmail.com';

  IF primary_admin_id IS NULL THEN
    RAISE EXCEPTION 'Primary administrator account was not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  DELETE FROM public.user_roles
  WHERE role IN ('admin'::public.app_role, 'moderator'::public.app_role)
    AND user_id <> primary_admin_id;

  DELETE FROM public.user_roles
  WHERE user_id = primary_admin_id
    AND role = 'moderator'::public.app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (primary_admin_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_purchase(_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only administrators can delete purchases'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.resenas_vendedores
  WHERE compra_id = _purchase_id;

  DELETE FROM public.compras
  WHERE id = _purchase_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found'
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_purchase(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  nombre_completo text,
  username text,
  ciudad text,
  avatar_url text,
  is_blocked boolean,
  motivo_bloqueo text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only administrators can list users'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(NULLIF(trim(p.nombre_completo), ''), NULLIF(trim(p.full_name), '')),
    p.username,
    p.ciudad,
    p.avatar_url,
    COALESCE(p.is_blocked, false),
    p.motivo_bloqueo,
    u.created_at
  FROM auth.users AS u
  LEFT JOIN public.profiles AS p ON p.id = u.id
  ORDER BY u.created_at DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
