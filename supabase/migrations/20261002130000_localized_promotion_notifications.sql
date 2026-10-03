CREATE OR REPLACE FUNCTION public.disparar_notificacion_publicidad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  product_title text;
  notification_type text;
  notification_message text;
  notification_data jsonb;
BEGIN
  IF OLD.estado_pago = 'PENDIENTE'
     AND NEW.estado_pago IN ('COMPLETADO', 'APROBADO', 'RECHAZADO') THEN
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'La transacción no tiene un usuario propietario'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT p.titulo
    INTO product_title
    FROM public.productos AS p
    WHERE p.id = NEW.producto_id;

    IF NEW.estado_pago IN ('COMPLETADO', 'APROBADO') THEN
      notification_type := 'promocion_aprobada';
      notification_message := format(
        'Tu promoción para "%s" fue aprobada. Tu publicación ahora está destacada.',
        COALESCE(product_title, 'tu publicación')
      );
      notification_data := jsonb_build_object('producto_titulo', product_title);
    ELSE
      notification_type := 'promocion_rechazada';
      notification_message := format(
        'Tu promoción para "%s" fue rechazada. Motivo: %s',
        COALESCE(product_title, 'tu publicación'),
        COALESCE(NULLIF(trim(NEW.notas_admin), ''), 'Motivo no especificado')
      );
      notification_data := jsonb_build_object(
        'producto_titulo', product_title,
        'motivo', NULLIF(trim(NEW.notas_admin), '')
      );
    END IF;

    INSERT INTO public.notificaciones (user_id, mensaje, leido, tipo, datos)
    VALUES (NEW.user_id, notification_message, false, notification_type, notification_data);
  END IF;

  RETURN NEW;
END;
$$;
