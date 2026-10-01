-- Track product reach and contact intent without allowing clients to edit counters.
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS vistas BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clics_contacto BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.productos
  DROP CONSTRAINT IF EXISTS productos_vistas_nonnegative,
  DROP CONSTRAINT IF EXISTS productos_clics_contacto_nonnegative;

ALTER TABLE public.productos
  ADD CONSTRAINT productos_vistas_nonnegative CHECK (vistas >= 0),
  ADD CONSTRAINT productos_clics_contacto_nonnegative CHECK (clics_contacto >= 0);

CREATE OR REPLACE FUNCTION public.registrar_vista_producto(p_producto_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  propietario_id UUID;
BEGIN
  SELECT user_id INTO propietario_id
  FROM public.productos
  WHERE id = p_producto_id
    AND activo = true
    AND estado_moderacion = 'aprobado';

  IF propietario_id IS NULL OR auth.uid() = propietario_id THEN
    RETURN;
  END IF;

  UPDATE public.productos
  SET vistas = vistas + 1
  WHERE id = p_producto_id
    AND activo = true
    AND estado_moderacion = 'aprobado';
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_clic_contacto_producto(p_producto_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  propietario_id UUID;
BEGIN
  SELECT user_id INTO propietario_id
  FROM public.productos
  WHERE id = p_producto_id
    AND activo = true
    AND estado_moderacion = 'aprobado';

  IF propietario_id IS NULL OR auth.uid() = propietario_id THEN
    RETURN;
  END IF;

  UPDATE public.productos
  SET clics_contacto = clics_contacto + 1
  WHERE id = p_producto_id
    AND activo = true
    AND estado_moderacion = 'aprobado';
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_vista_producto(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_clic_contacto_producto(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_vista_producto(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_clic_contacto_producto(UUID) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_productos_vistas ON public.productos(vistas DESC);
CREATE INDEX IF NOT EXISTS idx_productos_clics_contacto ON public.productos(clics_contacto DESC);
