CREATE OR REPLACE FUNCTION public.admin_delete_purchase(_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_email text;
BEGIN
  current_email := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));

  IF auth.uid() IS NULL OR (
    current_email NOT IN (
      'ing.gemaverduga@gmail.com',
      'c-alcivar@hotmail.com'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'::public.app_role
    )
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