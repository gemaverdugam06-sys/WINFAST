-- Complete the support ticket fields used by the admin panel and reply flow.
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS response_text text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

DROP POLICY IF EXISTS "support_tickets_admin_select" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_select" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "support_tickets_admin_update" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete support tickets" ON public.support_tickets;
CREATE POLICY "Admins delete support tickets" ON public.support_tickets
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
