-- Create promotion transactions from server-controlled plan settings.
-- This migration is prepared for review and must be applied separately.

CREATE OR REPLACE FUNCTION public.crear_transaccion_promocion(
  p_producto_id UUID,
  p_plan TEXT,
  p_comprobante_url TEXT DEFAULT NULL,
  p_referencia TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  monto NUMERIC(10,2),
  plan TEXT,
  estado_pago TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id UUID := auth.uid();
  normalized_plan TEXT := upper(trim(COALESCE(p_plan, '')));
  product_owner UUID;
  product_active BOOLEAN;
  moderation_state TEXT;
  plan_settings JSONB;
  official_price NUMERIC(10,2);
  official_duration INTEGER;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para solicitar una promoción'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF normalized_plan NOT IN ('FLASH', 'BASICO', 'PLUS', 'PRO', 'MEGA') THEN
    RAISE EXCEPTION 'Plan de promoción no válido'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT p.user_id, p.activo, p.estado_moderacion
  INTO product_owner, product_active, moderation_state
  FROM public.productos AS p
  WHERE p.id = p_producto_id;

  IF product_owner IS NULL OR product_owner <> actor_id THEN
    RAISE EXCEPTION 'El producto no pertenece al usuario autenticado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF product_active IS DISTINCT FROM true OR moderation_state = 'rechazado' THEN
    RAISE EXCEPTION 'El producto no puede promocionarse en su estado actual'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT ms.settings -> 'featured' -> normalized_plan
  INTO plan_settings
  FROM public.monetization_settings AS ms
  ORDER BY ms.updated_at DESC
  LIMIT 1;

  IF plan_settings IS NULL OR plan_settings = 'null'::jsonb THEN
    RAISE EXCEPTION 'No existe configuración server-side para el plan solicitado'
      USING ERRCODE = 'P0001';
  END IF;

  IF plan_settings ->> 'enabled' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'El plan de promoción no está disponible'
      USING ERRCODE = 'check_violation';
  END IF;

  IF COALESCE(plan_settings ->> 'price', '') !~ '^[0-9]+(\.[0-9]+)?$'
     OR COALESCE(plan_settings ->> 'durationDays', '') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'La configuración server-side del plan es inválida'
      USING ERRCODE = 'data_exception';
  END IF;

  official_price := (plan_settings ->> 'price')::NUMERIC(10,2);
  official_duration := (plan_settings ->> 'durationDays')::INTEGER;

  IF official_price IS NULL OR official_price < 0
     OR official_duration IS NULL OR official_duration < 1 THEN
    RAISE EXCEPTION 'La configuración server-side del plan es inválida'
      USING ERRCODE = 'data_exception';
  END IF;

  IF p_comprobante_url IS NOT NULL
     AND NOT p_comprobante_url LIKE actor_id::TEXT || '/%' THEN
    RAISE EXCEPTION 'El comprobante no pertenece al usuario autenticado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  INSERT INTO public.transacciones (
    user_id,
    producto_id,
    monto,
    plan,
    estado_pago,
    comprobante_url,
    referencia
  )
  VALUES (
    actor_id,
    p_producto_id,
    official_price,
    normalized_plan,
    'PENDIENTE',
    p_comprobante_url,
    NULLIF(trim(p_referencia), '')
  )
  RETURNING
    transacciones.id,
    transacciones.monto,
    transacciones.plan,
    transacciones.estado_pago;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_transaccion_promocion(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_transaccion_promocion(UUID, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.aprobar_transaccion_promocion(p_transaccion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id UUID := auth.uid();
  transaction_plan TEXT;
  transaction_product_id UUID;
  transaction_state TEXT;
  plan_settings JSONB;
  official_duration INTEGER;
BEGIN
  IF actor_id IS NULL OR NOT public.has_role(actor_id, 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede aprobar promociones'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT t.plan, t.producto_id
  INTO transaction_plan, transaction_product_id
  FROM public.transacciones AS t
  WHERE t.id = p_transaccion_id;

  IF transaction_product_id IS NULL THEN
    RAISE EXCEPTION 'Transacción no encontrada'
      USING ERRCODE = 'no_data_found';
  END IF;

  transaction_plan := upper(trim(COALESCE(transaction_plan, '')));
  IF transaction_plan NOT IN ('FLASH', 'BASICO', 'PLUS', 'PRO', 'MEGA') THEN
    RAISE EXCEPTION 'Plan de promoción no válido'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT t.estado_pago
  INTO transaction_state
  FROM public.transacciones AS t
  WHERE t.id = p_transaccion_id;

  IF transaction_state IS DISTINCT FROM 'PENDIENTE' THEN
    RAISE EXCEPTION 'La transacción ya no está pendiente de aprobación'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT ms.settings -> 'featured' -> transaction_plan
  INTO plan_settings
  FROM public.monetization_settings AS ms
  ORDER BY ms.updated_at DESC
  LIMIT 1;

  IF plan_settings IS NULL OR plan_settings = 'null'::jsonb
     OR plan_settings ->> 'enabled' IS DISTINCT FROM 'true'
     OR COALESCE(plan_settings ->> 'durationDays', '') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'La configuración server-side del plan es inválida'
      USING ERRCODE = 'data_exception';
  END IF;

  official_duration := (plan_settings ->> 'durationDays')::INTEGER;
  IF official_duration < 1 THEN
    RAISE EXCEPTION 'La duración server-side del plan es inválida'
      USING ERRCODE = 'data_exception';
  END IF;

  UPDATE public.transacciones
  SET estado_pago = 'COMPLETADO',
      notas_admin = 'Tu pago ha sido aprobado correctamente.'
  WHERE id = p_transaccion_id
    AND estado_pago = 'PENDIENTE';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La transacción ya no está pendiente de aprobación'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.productos
  SET es_destacado = true,
      promocionado_hasta = now() + make_interval(days => official_duration),
      tipo_promocion = transaction_plan
  WHERE id = transaction_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El producto asociado no existe'
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.aprobar_transaccion_promocion(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprobar_transaccion_promocion(UUID) TO authenticated;

-- Keep direct INSERTs from accepting manipulated ownership, plan, amount, or state.
CREATE OR REPLACE FUNCTION public.guard_transacciones_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id UUID := auth.uid();
  plan_settings JSONB;
  expected_monto NUMERIC(10,2);
  product_owner UUID;
  product_active BOOLEAN;
  moderation_state TEXT;
BEGIN
  IF actor_id IS NULL OR public.has_role(actor_id, 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM actor_id THEN
    RAISE EXCEPTION 'La transacción debe pertenecer al usuario autenticado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT p.user_id, p.activo, p.estado_moderacion
  INTO product_owner, product_active, moderation_state
  FROM public.productos AS p
  WHERE p.id = NEW.producto_id;

  IF product_owner IS NULL OR product_owner <> actor_id THEN
    RAISE EXCEPTION 'El producto no pertenece al usuario autenticado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF product_active IS DISTINCT FROM true OR moderation_state = 'rechazado' THEN
    RAISE EXCEPTION 'El producto no puede promocionarse en su estado actual'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.comprobante_url IS NOT NULL
     AND NOT NEW.comprobante_url LIKE actor_id::TEXT || '/%' THEN
    RAISE EXCEPTION 'El comprobante no pertenece al usuario autenticado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  NEW.id := gen_random_uuid();
  NEW.pasarela := 'DEMO';
  NEW.notas_admin := NULL;
  NEW.created_at := now();
  NEW.referencia := NULLIF(trim(NEW.referencia), '');

  NEW.plan := upper(trim(COALESCE(NEW.plan, '')));
  IF NEW.plan NOT IN ('FLASH', 'BASICO', 'PLUS', 'PRO', 'MEGA') THEN
    RAISE EXCEPTION 'Plan de promoción no válido'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT ms.settings -> 'featured' -> NEW.plan
  INTO plan_settings
  FROM public.monetization_settings AS ms
  ORDER BY ms.updated_at DESC
  LIMIT 1;

  IF plan_settings IS NULL OR plan_settings = 'null'::jsonb
     OR plan_settings ->> 'enabled' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'El plan de promoción no está disponible'
      USING ERRCODE = 'check_violation';
  END IF;

  IF COALESCE(plan_settings ->> 'price', '') !~ '^[0-9]+(\.[0-9]+)?$' THEN
    RAISE EXCEPTION 'La configuración server-side del plan es inválida'
      USING ERRCODE = 'data_exception';
  END IF;

  expected_monto := (plan_settings ->> 'price')::NUMERIC(10,2);
  IF expected_monto IS NULL OR NEW.monto IS DISTINCT FROM expected_monto THEN
    RAISE EXCEPTION 'El monto no coincide con el precio oficial del plan'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.estado_pago := 'PENDIENTE';
  RETURN NEW;
END;
$$;
