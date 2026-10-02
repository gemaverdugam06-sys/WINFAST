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
DECLARE
  current_email text;
BEGIN
  current_email := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));

  IF auth.uid() IS NULL OR (
    current_email NOT IN (
      'ing.gemaverduga@gmail.com',
      'c-alcivar@hotmail.com'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'::public.app_role
    )
  ) THEN
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