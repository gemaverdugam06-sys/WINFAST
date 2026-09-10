-- ============================================================================
-- MIGRATION: Add Reviews, Reports, and Content Security System
-- Date: 2026-08-31
-- ============================================================================

-- 1. Add rating and moderation fields to productos table
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS 
  estado_moderacion VARCHAR DEFAULT 'pendiente' CHECK (estado_moderacion IN ('pendiente', 'aprobado', 'rechazado'));
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS 
  razon_rechazo TEXT;

-- 2. Create resenas_vendedores table (Seller reviews)
CREATE TABLE IF NOT EXISTS public.resenas_vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comprador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaccion_id UUID NOT NULL UNIQUE,
  calificacion INTEGER NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario TEXT,
  estado VARCHAR DEFAULT 'visible' CHECK (estado IN ('visible', 'reportado', 'oculto')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resenas_vendedores_vendedor_id 
  ON public.resenas_vendedores(vendedor_id);
CREATE INDEX IF NOT EXISTS resenas_vendedores_comprador_id 
  ON public.resenas_vendedores(comprador_id);
CREATE INDEX IF NOT EXISTS resenas_vendedores_estado 
  ON public.resenas_vendedores(estado);

-- 3. Create perfil_vendedor view with calculated ratings
CREATE OR REPLACE VIEW public.perfil_vendedor_stats AS
SELECT
  p.id,
  p.nombre_completo,
  p.avatar_url,
  p.ciudad,
  COUNT(DISTINCT r.id) as total_resenas,
  COALESCE(ROUND(AVG(r.calificacion)::numeric, 1), 0) as promedio_calificacion,
  COALESCE(MAX(r.updated_at), now()) as ultima_actividad
FROM public.profiles p
LEFT JOIN public.resenas_vendedores r ON r.vendedor_id = p.id AND r.estado = 'visible'
GROUP BY p.id, p.nombre_completo, p.avatar_url, p.ciudad;

-- 4. Create reportes table (for content, users, reviews)
CREATE TABLE IF NOT EXISTS public.reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reportero_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR NOT NULL CHECK (tipo IN ('producto', 'usuario', 'resena')),
  objeto_id UUID NOT NULL, -- producto_id, user_id, or reseña_id
  razon VARCHAR NOT NULL CHECK (razon IN (
    'drogas',
    'armas',
    'explosivos',
    'robado',
    'falsificado',
    'fraude',
    'ilegal',
    'malware',
    'inapropiado',
    'otro'
  )),
  descripcion TEXT,
  estado VARCHAR DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'revisado', 'resuelto')),
  accion_tomada TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reportes_reportero_id 
  ON public.reportes(reportero_id);
CREATE INDEX IF NOT EXISTS reportes_tipo 
  ON public.reportes(tipo);
CREATE INDEX IF NOT EXISTS reportes_estado 
  ON public.reportes(estado);

-- 5. Create politica_contenido table (Prohibited content policy)
CREATE TABLE IF NOT EXISTS public.politica_contenido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria VARCHAR UNIQUE NOT NULL,
  descripcion TEXT NOT NULL,
  ejemplos TEXT,
  estado BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

INSERT INTO public.politica_contenido (categoria, descripcion, ejemplos) VALUES
  ('drogas_sustancias', 'Drogas ilegales y sustancias controladas', 'Marihuana, cocaína, éxtasis, fentanilo, metanfetamina'),
  ('armas_municiones', 'Armas, municiones y explosivos', 'Pistolas, rifles, granadas, explosivos, municiones'),
  ('productos_robados', 'Bienes robados o de procedencia ilícita', 'Electrónicos, joyas, vehículos robados'),
  ('documentos_falsificados', 'Documentación falsificada o modificada', 'Cédulas falsas, pasaportes falsificados, títulos falsos'),
  ('fraude_estafas', 'Actividades de fraude o estafa', 'Esquemas Ponzi, servicios falsos, dinero falso'),
  ('servicios_ilegales', 'Servicios que violen la ley', 'Servicios sexuales ilegales, tráfico de personas'),
  ('malware_archivos_peligrosos', 'Archivos maliciosos o código dañino', 'Virus, ransomware, software espía, troyanos'),
  ('contenido_sexual_menores', 'Material sexual que involucre menores', 'Cualquier explotación infantil')
ON CONFLICT (categoria) DO NOTHING;

-- 6. Guard function: Prevent non-admin users from modifying product moderation fields
CREATE OR REPLACE FUNCTION public.guard_producto_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.estado_moderacion IS DISTINCT FROM 'pendiente' THEN
      RAISE EXCEPTION 'Only administrators can set moderation state'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.estado_moderacion IS DISTINCT FROM OLD.estado_moderacion
     OR NEW.razon_rechazo IS DISTINCT FROM OLD.razon_rechazo THEN
    RAISE EXCEPTION 'Only administrators can modify moderation fields'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS productos_guard_moderation_ins ON public.productos;
DROP TRIGGER IF EXISTS productos_guard_moderation_upd ON public.productos;
CREATE TRIGGER productos_guard_moderation_ins
  BEFORE INSERT ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.guard_producto_moderation();
CREATE TRIGGER productos_guard_moderation_upd
  BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.guard_producto_moderation();

-- 7. Guard function: Only users in a transaction can review each other
CREATE OR REPLACE FUNCTION public.guard_resena_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent self-review
  IF NEW.comprador_id = NEW.vendedor_id THEN
    RAISE EXCEPTION 'Cannot review yourself'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Check if transaction exists and is completed (optional, can be enforced at app level)
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resenas_vendedores_guard_insert ON public.resenas_vendedores;
CREATE TRIGGER resenas_vendedores_guard_insert
  BEFORE INSERT ON public.resenas_vendedores
  FOR EACH ROW EXECUTE FUNCTION public.guard_resena_insert();

-- 8. Update function: Auto-update moderation timestamp
CREATE OR REPLACE FUNCTION public.update_resena_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resenas_vendedores_update_timestamp ON public.resenas_vendedores;
CREATE TRIGGER resenas_vendedores_update_timestamp
  BEFORE UPDATE ON public.resenas_vendedores
  FOR EACH ROW EXECUTE FUNCTION public.update_resena_timestamp();

-- 9. Grant permissions for authenticated users to read reviews and policy
GRANT SELECT ON public.resenas_vendedores TO authenticated;
GRANT SELECT ON public.perfil_vendedor_stats TO authenticated, anon;
GRANT SELECT ON public.politica_contenido TO authenticated, anon;

-- 10. Allow users to insert their own reviews (no update/delete without admin)
CREATE POLICY "Users can insert their own reviews" ON public.resenas_vendedores
  FOR INSERT WITH CHECK (auth.uid() = comprador_id);

CREATE POLICY "Reviews are visible" ON public.resenas_vendedores
  FOR SELECT USING (estado IN ('visible', 'reportado'));

-- 11. Allow admins to manage reportes
CREATE POLICY "Admins manage reportes" ON public.reportes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create reportes" ON public.reportes
  FOR INSERT WITH CHECK (auth.uid() = reportero_id);

CREATE POLICY "Users can view their own reportes" ON public.reportes
  FOR SELECT USING (auth.uid() = reportero_id OR public.has_role(auth.uid(), 'admin'));
