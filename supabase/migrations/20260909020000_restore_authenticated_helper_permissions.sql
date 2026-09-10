-- RLS policies and the authenticated client need these helper functions to run.
-- The previous hardening migration revoked their EXECUTE privilege too broadly.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_my_profile_name() TO authenticated;