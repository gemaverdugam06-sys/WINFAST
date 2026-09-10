-- The platform administrator must remain active so admin and purchase flows work.
UPDATE public.profiles AS p
SET is_blocked = false,
    motivo_bloqueo = NULL
FROM auth.users AS u
WHERE p.id = u.id
  AND lower(trim(u.email)) = 'ing.gemaverduga@gmail.com';

CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR NOT public.is_user_blocked(auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_active() TO authenticated, service_role;