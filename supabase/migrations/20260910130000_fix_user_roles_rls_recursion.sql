-- user_roles is consulted by has_role(), which is used by the active-user policy.
-- Applying the same restrictive policy to user_roles creates an authorization loop.
DROP POLICY IF EXISTS "active_users_only" ON public.user_roles;
GRANT SELECT ON public.user_roles TO authenticated;