-- The receipt upload is optional at transaction creation and can be removed by an admin.
ALTER TABLE public.transacciones
  ALTER COLUMN comprobante_url DROP NOT NULL;