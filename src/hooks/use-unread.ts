import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

type ChatUnreadRow = Pick<
  Database["public"]["Tables"]["chats"]["Row"],
  "id" | "comprador_id" | "vendedor_id" | "ultimo_leido_comprador" | "ultimo_leido_vendedor"
>;

/**
 * Cuenta mensajes no leídos en todas las conversaciones del usuario.
 * Un mensaje está "no leído" si fue creado después de ultimo_leido_{rol}
 * y el remitente no es el propio usuario.
 */
export function useUnreadChats() {
  const { user } = useAuth();
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread({});
      setTotal(0);
      return;
    }
    let alive = true;

    const compute = async () => {
      const { data: chats } = await supabase
        .from("chats")
        .select("id, comprador_id, vendedor_id, ultimo_leido_comprador, ultimo_leido_vendedor")
        .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`);
      if (!chats || !alive) return;

      const { data: states, error: statesError } = await supabase
        .from("chat_user_states")
        .select("chat_id, deleted_at")
        .eq("user_id", user.id);
      if (statesError || !alive) return;
      const deletedChatIds = new Set(
        (states ?? []).filter((state) => state.deleted_at).map((state) => state.chat_id),
      );

      const counts: Record<string, number> = {};
      await Promise.all(
        (chats as ChatUnreadRow[])
          .filter((chat) => !deletedChatIds.has(chat.id))
          .map(async (c) => {
            const after =
              c.comprador_id === user.id ? c.ultimo_leido_comprador : c.ultimo_leido_vendedor;
            const { count } = await supabase
              .from("mensajes")
              .select("id", { count: "exact", head: true })
              .eq("chat_id", c.id)
              .neq("remitente_id", user.id)
              .is("deleted_at", null)
              .gt("created_at", after ?? new Date(0).toISOString());
            counts[c.id] = count ?? 0;
          }),
      );
      if (!alive) return;
      setUnread(counts);
      setTotal(Object.values(counts).reduce((a, b) => a + b, 0));
    };

    compute();

    const topic = `unread:${user.id}:${Math.random().toString(36).slice(2)}`;
    const ch = supabase.channel(topic);
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, () =>
      compute(),
    );
    ch.on("postgres_changes", { event: "UPDATE", schema: "public", table: "chats" }, () =>
      compute(),
    );
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_user_states", filter: `user_id=eq.${user.id}` },
      () => compute(),
    );
    ch.subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  return { unread, total };
}
