-- Restore the administrator role for the platform owner account.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(trim(email)) = 'ing.gemaverduga@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;