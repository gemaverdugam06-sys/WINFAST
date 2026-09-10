-- Harden security-definer helper functions used by RLS and internal logic.
-- Keep admin delete functionality working for authenticated admin users,
-- while removing unnecessary RPC exposure for internal helpers.

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_current_user_active() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_support_tickets_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_messages_delivered(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_messages_read(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_my_profile_name() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_current_user_active() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_support_tickets_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_messages_delivered(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_my_profile_name() TO service_role;

-- Preserve the admin delete action currently used by the admin panel,
-- while preventing anonymous access.
REVOKE ALL ON FUNCTION public.admin_delete_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_purchase(uuid) TO authenticated;

-- Optional but recommended in Supabase Dashboard:
-- Authentication > User signups > Leaked password protection = ON
