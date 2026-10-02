REVOKE UPDATE ON TABLE public.transacciones FROM authenticated;

GRANT UPDATE (comprobante_url) ON TABLE public.transacciones TO authenticated;