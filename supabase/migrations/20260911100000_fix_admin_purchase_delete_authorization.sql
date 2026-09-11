-- Keep the admin identity used by the UI and database in sync.
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

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users AS u
WHERE public.is_admin_email(u.email)
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_delete_purchase(_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_email text;
BEGIN
  current_email := auth.jwt() ->> 'email';

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_admin_email(current_email)
  ) THEN
    RAISE EXCEPTION 'Only administrators can delete purchases'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.resenas_vendedores
  WHERE compra_id = _purchase_id;

  DELETE FROM public.compras
  WHERE id = _purchase_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found'
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_purchase(uuid) TO authenticated;
