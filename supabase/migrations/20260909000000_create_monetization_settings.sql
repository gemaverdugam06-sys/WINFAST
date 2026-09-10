CREATE TABLE IF NOT EXISTS public.monetization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monetization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monetization_settings_admin_all"
ON public.monetization_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "monetization_settings_authenticated_select"
ON public.monetization_settings
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.set_monetization_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS monetization_settings_updated_at ON public.monetization_settings;
CREATE TRIGGER monetization_settings_updated_at
BEFORE UPDATE ON public.monetization_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_monetization_settings_updated_at();

GRANT ALL ON public.monetization_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monetization_settings TO authenticated;
