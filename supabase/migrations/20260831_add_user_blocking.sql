ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_bloqueo text;

CREATE OR REPLACE FUNCTION public.is_user_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_blocked FROM public.profiles WHERE id = _user_id), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_user_blocked(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_profile_block_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF (NEW.is_blocked IS TRUE OR NEW.motivo_bloqueo IS NOT NULL)
       AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Solo un administrador puede establecer bloqueo de usuario'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (
      (NEW.is_blocked IS DISTINCT FROM OLD.is_blocked)
      OR (NEW.motivo_bloqueo IS DISTINCT FROM OLD.motivo_bloqueo)
    ) AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Solo un administrador puede modificar el estado de bloqueo'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_block_state_ins ON public.profiles;
DROP TRIGGER IF EXISTS profiles_guard_block_state_upd ON public.profiles;
CREATE TRIGGER profiles_guard_block_state_ins
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_block_state();
CREATE TRIGGER profiles_guard_block_state_upd
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_block_state();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_admin_update'
  ) THEN
    CREATE POLICY "profiles_admin_update" ON public.profiles
      FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_update_own'
  ) THEN
    DROP POLICY "profiles_update_own" ON public.profiles;
  END IF;

  CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
END $$;