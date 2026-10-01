-- Reconcile the admin identity list used by the UI and the database so purchase deletions work for all authorized admins.
CREATE OR REPLACE FUNCTION public.is_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(trim(COALESCE(_email, ''))) IN (
    'ing.gemaverduga@gmail.com',
    'c-alcivar@hotmail.com'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO authenticated, service_role;

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
FROM auth.users AS u
WHERE public.is_admin_email(u.email)
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles AS p
SET is_blocked = false,
    motivo_bloqueo = NULL
FROM auth.users AS u
WHERE p.id = u.id
  AND public.is_admin_email(u.email)
  AND p.is_blocked IS DISTINCT FROM false;
