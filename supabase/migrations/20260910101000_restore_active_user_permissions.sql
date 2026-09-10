-- Restore the authenticated permissions used before the security hardening.
GRANT EXECUTE ON FUNCTION public.is_current_user_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_support_tickets_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_delivered(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_my_profile_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;