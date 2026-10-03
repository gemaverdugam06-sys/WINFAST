import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Archive, ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { useUnreadChats } from "@/hooks/use-unread";
import { toUserMessage } from "@/lib/error-messages";
import { useSignedUrls } from "@/lib/storage";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type ChatRealtimeRow = Pick<
  Database["public"]["Tables"]["chats"]["Row"],
  "comprador_id" | "vendedor_id"
>;

interface ChatRow {
  id: string;
  producto_id: string | null;
  comprador_id: string;
  vendedor_id: string;
  updated_at: string;
  productos: { titulo: string; imagenes: string[] } | null;
  comprador: { nombre_completo: string | null; avatar_url: string | null } | null;
  vendedor: { nombre_completo: string | null; avatar_url: string | null } | null;
}

interface ChatUserState {
  chat_id: string;
  archived_at: string | null;
  deleted_at: string | null;
}

export const Route = createFileRoute("/_authenticated/chats")({
  component: ChatsPage,
});

function ChatsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { unread } = useUnreadChats();
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [archivedChatIds, setArchivedChatIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const avatarPaths = [
    ...new Set(
      chats
        .flatMap((chat) => [chat.comprador?.avatar_url, chat.vendedor?.avatar_url])
        .filter((path): path is string => Boolean(path)),
    ),
  ];
  const avatarUrls = useSignedUrls("avatars", avatarPaths);
  const avatarUrlByPath = new Map(
    avatarPaths.map((path, index) => [path, avatarUrls[index] ?? ""]),
  );

  const cargarChats = useCallback(async () => {
    if (!user) return;

    // CORREGIDO: Cambiado 'seller_id' por 'vendedor_id' para que coincida con tu tabla
    const { data, error } = await supabase
      .from("chats")
      .select(
        `
        id, producto_id, comprador_id, vendedor_id, updated_at,
        productos:producto_id (titulo, imagenes),
        comprador:profiles!chats_comprador_profile_fk (nombre_completo, avatar_url),
        vendedor:profiles!chats_vendedor_profile_fk (nombre_completo, avatar_url)
      `,
      )
      .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`);

    if (error) {
      toUserMessage(error, "Error al cargar los chats.");
      setLoading(false);
      return;
    }

    const { data: states, error: statesError } = await supabase
      .from("chat_user_states")
      .select("chat_id, archived_at, deleted_at")
      .eq("user_id", user.id);

    if (statesError) {
      toUserMessage(statesError, "Error al cargar el estado de los chats.");
      setLoading(false);
      return;
    }

    const stateByChat = new Map(
      ((states as unknown as ChatUserState[]) ?? []).map((state) => [state.chat_id, state]),
    );
    setArchivedChatIds(
      new Set(
        [...stateByChat.values()]
          .filter((state) => state.archived_at && !state.deleted_at)
          .map((state) => state.chat_id),
      ),
    );

    const chatsOrdenados = ((data as unknown as ChatRow[]) ?? []).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    setChats(chatsOrdenados.filter((chat) => !stateByChat.get(chat.id)?.deleted_at));
    setLoading(false);
  }, [user]);

  const updateChatState = async (chat: ChatRow, action: "archive" | "restore" | "delete") => {
    if (!user) return;
    if (action === "delete" && !window.confirm("¿Eliminar este chat de tu lista?")) return;

    setWorking(chat.id);
    const values =
      action === "archive"
        ? { archived_at: new Date().toISOString(), deleted_at: null }
        : action === "restore"
          ? { archived_at: null, deleted_at: null }
          : { deleted_at: new Date().toISOString() };
    const { error } = await supabase
      .from("chat_user_states")
      .upsert({ chat_id: chat.id, user_id: user.id, ...values }, { onConflict: "chat_id,user_id" });
    setWorking(null);
    if (error) {
      toast.error(toUserMessage(error, "No se pudo actualizar el chat."));
      return;
    }
    await cargarChats();
    toast.success(
      action === "archive"
        ? "Chat archivado"
        : action === "restore"
          ? "Chat restaurado"
          : "Chat eliminado",
    );
  };

  useEffect(() => {
    if (!user) return;

    cargarChats();

    const canalChats = supabase
      .channel("actualizaciones-bandeja-chats")
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, async (payload) => {
        const row = payload.new as ChatRealtimeRow | null;
        if (row && (row.comprador_id === user.id || row.vendedor_id === user.id)) {
          await cargarChats();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalChats);
    };
  }, [cargarChats, user]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">{t("chats")}</h1>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : chats.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 py-16 text-center text-muted-foreground">
            {t("no_chats")}
          </div>
        ) : (
          <div className="space-y-2">
            {[
              {
                title: "Chats",
                items: chats.filter((chat) => !archivedChatIds.has(chat.id)),
                archived: false,
              },
              {
                title: "Archivados",
                items: chats.filter((chat) => archivedChatIds.has(chat.id)),
                archived: true,
              },
            ].map(
              (section) =>
                section.items.length > 0 && (
                  <section key={section.title} className="space-y-2">
                    <h2 className="pt-2 text-sm font-semibold text-muted-foreground">
                      {section.title}
                    </h2>
                    {section.items.map((c) => {
                      const other = c.comprador_id === user?.id ? c.vendedor : c.comprador;
                      const count = unread[c.id] ?? 0;
                      return (
                        <Card
                          key={c.id}
                          className={`transition hover:bg-accent ${count > 0 ? "border-primary/40 bg-primary/5" : ""}`}
                        >
                          <div className="flex items-center gap-3 p-3">
                            <Link
                              to="/chat/$chatId"
                              params={{ chatId: c.id }}
                              className="flex min-w-0 flex-1 items-center gap-3"
                            >
                              <CardContent className="flex items-center gap-3 p-3">
                                <Avatar>
                                  <AvatarImage
                                    src={
                                      other?.avatar_url
                                        ? avatarUrlByPath.get(other.avatar_url) || undefined
                                        : undefined
                                    }
                                  />
                                  <AvatarFallback>
                                    {other?.nombre_completo?.[0] ?? "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`truncate text-sm ${count > 0 ? "font-bold" : "font-semibold"}`}
                                  >
                                    {other?.nombre_completo ?? "Usuario"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {c.productos?.titulo ?? "Producto ya no disponible"}
                                  </p>
                                </div>
                                {count > 0 && (
                                  <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                                    {count > 99 ? "99+" : count}
                                  </span>
                                )}
                              </CardContent>
                            </Link>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                title={section.archived ? "Restaurar chat" : "Archivar chat"}
                                aria-label={section.archived ? "Restaurar chat" : "Archivar chat"}
                                className="rounded-md p-2 hover:bg-accent"
                                disabled={working === c.id}
                                onClick={() =>
                                  updateChatState(c, section.archived ? "restore" : "archive")
                                }
                              >
                                {section.archived ? (
                                  <ArchiveRestore className="h-4 w-4" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                title="Eliminar chat"
                                aria-label="Eliminar chat"
                                className="rounded-md p-2 text-destructive hover:bg-destructive/10"
                                disabled={working === c.id}
                                onClick={() => updateChatState(c, "delete")}
                              >
                                {working === c.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </section>
                ),
            )}
          </div>
        )}
      </main>
    </div>
  );
}
