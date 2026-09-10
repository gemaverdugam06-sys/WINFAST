-- Restore execution for trigger functions that exist in this deployment.
-- Function names differ between older WinFast schemas, so do not fail the
-- migration when an optional trigger function is absent.
DO $$
BEGIN
	IF to_regprocedure('public.check_contenido_prohibido()') IS NOT NULL THEN
		GRANT EXECUTE ON FUNCTION public.check_contenido_prohibido() TO authenticated;
	END IF;
	IF to_regprocedure('public.guard_producto_promo_fields()') IS NOT NULL THEN
		GRANT EXECUTE ON FUNCTION public.guard_producto_promo_fields() TO authenticated;
	END IF;
	IF to_regprocedure('public.guard_transacciones_insert()') IS NOT NULL THEN
		GRANT EXECUTE ON FUNCTION public.guard_transacciones_insert() TO authenticated;
	END IF;
	IF to_regprocedure('public.guard_producto_moderation()') IS NOT NULL THEN
		GRANT EXECUTE ON FUNCTION public.guard_producto_moderation() TO authenticated;
	END IF;
	IF to_regprocedure('public.guard_resena_insert()') IS NOT NULL THEN
		GRANT EXECUTE ON FUNCTION public.guard_resena_insert() TO authenticated;
	END IF;
	IF to_regprocedure('public.update_resena_timestamp()') IS NOT NULL THEN
		GRANT EXECUTE ON FUNCTION public.update_resena_timestamp() TO authenticated;
	END IF;
END $$;