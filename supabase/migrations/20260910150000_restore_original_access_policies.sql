-- Restore the original access model. Block-state triggers still protect
-- changes to blocking fields, while normal table policies control access.
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'profiles', 'profiles_private', 'productos', 'transacciones',
    'chats', 'mensajes', 'user_roles', 'chat_user_states', 'compras',
    'resenas_vendedores', 'reportes', 'politica_contenido', 'support_tickets'
  ] LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "active_users_only" ON public.%I', target_table);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "active_users_only" ON storage.objects;
DROP POLICY IF EXISTS "active_users_only" ON realtime.messages;