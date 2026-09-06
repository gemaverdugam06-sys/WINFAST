import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Send,
  ShoppingBag,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { toUserMessage } from "@/lib/error-messages";
import { useSignedUrls } from "@/lib/storage";
import { toast } from "sonner";

interface Mensaje {
  id: string;
  chat_id: string;
  remitente_id: string;
  contenido: string;
  created_at: string;
  deleted_at: string | null;
  delivered_at: string | null;
  editado_en: string | null;
  estado_envio: string;
  read_at: string | null;
  avatar_remitente: string | null;
  nombre_remitente: string | null;
}
interface ChatInfo {
  id: string;
  comprador_id: string;
  vendedor_id: string;
  producto_id: string | null;
  productos: { id: string; titulo: string } | null;
}

interface CompraChat {
  id: string;
  estado: string;
  producto_id: string;
}

export const Route = createFileRoute("/_authenticated/chat/$chatId")({
  component: ChatPage,
});

function ChatPage() {
  const { chatId } = Route.useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [info, setInfo] = useState<ChatInfo | null>(null);
  const [compra, setCompra] = useState<CompraChat | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("winfast-chat-sound") !== "off";
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<Set<string> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  const avatarPaths = [
    ...new Set(
      mensajes
        .map((mensaje) => mensaje.avatar_remitente)
        .filter((path): path is string => Boolean(path)),
    ),
  ];
  const avatarUrls = useSignedUrls("avatars", avatarPaths);
  const avatarUrlByPath = new Map(
    avatarPaths.map((path, index) => [path, avatarUrls[index] ?? ""]),
  );

  const reproducirTono = () => {
    if (!soundEnabledRef.current || typeof window === "undefined") return;

    const AudioContextClass =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = audioContext;
    if (audioContext.state === "suspended") void audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);
  };

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    window.localStorage.setItem("winfast-chat-sound", soundEnabled ? "on" : "off");
  }, [soundEnabled]);

  // Función dedicada a traer los mensajes actualizados de la base de datos
  const refrescarMensajes = async () => {
    if (!chatId) return;
    const { data } = await supabase
      .from("mensajes")
      .select("*")
      .eq("chat_id", chatId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (!data) return;

    const mensajesBase = data as unknown as Array<Omit<Mensaje, "nombre_remitente">>;
    const remitenteIds = [...new Set(mensajesBase.map((mensaje) => mensaje.remitente_id))];
    const perfilesMap = new Map<string, { nombre: string | null; avatar: string | null }>();

    if (remitenteIds.length > 0) {
      const { data: perfiles } = await supabase
        .from("profiles")
        .select("id, nombre_completo, avatar_url")
        .in("id", remitenteIds);

      for (const perfil of perfiles ?? []) {
        perfilesMap.set(perfil.id, {
          nombre: perfil.nombre_completo,
          avatar: perfil.avatar_url,
        });
      }
    }

    const mensajesActualizados = mensajesBase.map((mensaje) => ({
      ...mensaje,
      nombre_remitente: perfilesMap.get(mensaje.remitente_id)?.nombre ?? null,
      avatar_remitente: perfilesMap.get(mensaje.remitente_id)?.avatar ?? null,
    }));
    const nuevosMensajesEntrantes = mensajesActualizados.some(
      (mensaje) => mensaje.remitente_id !== user?.id && !messageIdsRef.current?.has(mensaje.id),
    );
    if (messageIdsRef.current && nuevosMensajesEntrantes) reproducirTono();
    messageIdsRef.current = new Set(mensajesActualizados.map((mensaje) => mensaje.id));
    setMensajes(mensajesActualizados);
  };

  useEffect(() => {
    if (!chatId) return;

    // Cargar metadatos del chat
    supabase
      .from("chats")
      .select("id, comprador_id, vendedor_id, producto_id, productos:producto_id (id, titulo)")
      .eq("id", chatId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        const chat = data as unknown as ChatInfo;
        setInfo(chat);
        const { data: purchase } = await supabase
          .from("compras")
          .select("id, estado, producto_id")
          .eq("producto_id", chat.producto_id ?? "")
          .eq("comprador_id", chat.comprador_id)
          .eq("vendedor_id", chat.vendedor_id)
          .maybeSingle();
        if (purchase) setCompra(purchase);
      });

    // Carga inicial de mensajes
    refrescarMensajes().then(() => setLoading(false));

    // Realtime actualiza tanto mensajes nuevos como sus recibos de entrega/lectura.
    const ch = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mensajes", filter: `chat_id=eq.${chatId}` },
        () => {
          refrescarMensajes();
        },
      )
      .subscribe();

    // RESPALDO SEGURO: Polling activo cada 3 segundos por si el websocket falla localmente
    const intervaloRespaldo = setInterval(() => {
      refrescarMensajes();
    }, 3000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(intervaloRespaldo);
    };
  }, [chatId]);

  // Actualizar indicador de lectura
  useEffect(() => {
    if (!user || !info) return;
    const readUpdate: Database["public"]["Tables"]["chats"]["Update"] =
      info.comprador_id === user.id
        ? { ultimo_leido_comprador: new Date().toISOString() }
        : { ultimo_leido_vendedor: new Date().toISOString() };
    supabase
      .from("chats")
      .update(readUpdate)
      .eq("id", chatId)
      .then(() => {});
  }, [user?.id, info?.id, mensajes.length, chatId]);

  // Mantener scroll abajo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes.length]);

  useEffect(() => {
    if (!user || !chatId || loading || mensajes.length === 0) return;
    void confirmReceipts();
  }, [user?.id, chatId, loading, mensajes.length]);

  const canEditMessage = (createdAt: string) => {
    if (!user) return false;
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return diffMs <= 5 * 60 * 1000;
  };

  const formatMessageDateTime = (createdAt: string) =>
    new Date(createdAt).toLocaleString("es-EC", {
      dateStyle: "short",
      timeStyle: "short",
    });

  const confirmReceipts = async () => {
    if (!user || !chatId) return;
    const pendingDeliveryIds = mensajes
      .filter((mensaje) => mensaje.remitente_id !== user.id && !mensaje.delivered_at)
      .map((mensaje) => mensaje.id);

    if (pendingDeliveryIds.length > 0) {
      const { error } = await supabase.rpc("mark_messages_delivered", {
        _message_ids: pendingDeliveryIds,
      });
      if (error) {
        console.error("No se pudo confirmar la entrega:", error);
        toast.error("No se pudo confirmar la entrega. Aplica la migración del chat en Supabase.");
        return;
      }
    }

    const { error } = await supabase.rpc("mark_messages_read", { _chat_id: chatId });
    if (error) {
      console.error("No se pudo confirmar la lectura:", error);
      toast.error("No se pudo confirmar la lectura. Aplica la migración del chat en Supabase.");
      return;
    }

    await refrescarMensajes();
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = texto.trim();
    if (!v || !user) return;

    if (editingMessageId) {
      const original = mensajes.find((m) => m.id === editingMessageId);
      const withinWindow = original ? canEditMessage(original.created_at) : false;
      if (!original || !withinWindow) {
        toast.error("Ya no puedes editar este mensaje porque pasaron más de 5 minutos.");
        return;
      }

      const { error } = await supabase
        .from("mensajes")
        .update({ contenido: v, editado_en: new Date().toISOString() })
        .eq("id", editingMessageId)
        .eq("remitente_id", user.id);

      if (error) {
        toast.error(toUserMessage(error, "No se pudo editar el mensaje."));
        return;
      }

      setEditingMessageId(null);
      setTexto("");
      await refrescarMensajes();
      return;
    }

    setTexto("");

    const { error } = await supabase.from("mensajes").insert({
      chat_id: chatId,
      remitente_id: user.id,
      contenido: v,
      estado_envio: "sent",
    });

    if (error) {
      toUserMessage(error, "No se pudo enviar el mensaje.");
      toast.error("No se pudo enviar el mensaje.");
      setTexto(v);
      return;
    }

    await refrescarMensajes();
    await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId);
  };

  const borrarMensaje = async (mensajeId: string) => {
    const original = mensajes.find((m) => m.id === mensajeId);
    if (
      !original ||
      !canEditMessage(original.created_at) ||
      !user ||
      original.remitente_id !== user.id
    ) {
      toast.error("Ya no puedes borrar este mensaje porque pasó el tiempo permitido.");
      return;
    }

    const { error } = await supabase
      .from("mensajes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", mensajeId)
      .eq("remitente_id", user.id);

    if (error) {
      toast.error(toUserMessage(error, "No se pudo borrar el mensaje."));
      return;
    }

    await refrescarMensajes();
    toast.success("Mensaje eliminado");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="border-b bg-card">
        <div className="container mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
          <Button variant="ghost" size="icon" onClick={() => nav({ to: "/chats" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {info?.productos ? (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {info.productos.titulo}
              </span>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link to="/producto/$id" params={{ id: info.productos.id }}>
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Ver publicación
                </Link>
              </Button>
            </>
          ) : (
            <span className="truncate text-sm font-semibold text-muted-foreground">
              Producto ya no disponible
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
            title={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
            onClick={() => setSoundEnabled((enabled) => !enabled)}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {compra && info?.productos && (
        <div className="border-b bg-muted/30">
          <div className="container mx-auto flex max-w-2xl items-center gap-2 px-4 py-2 text-sm">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span className="truncate">{info.productos.titulo}</span>
            <span className="text-muted-foreground">Compra: {compra.estado}</span>
            {user?.id === info.comprador_id && compra.estado === "CONFIRMADA" && (
              <Link
                to="/reseña/$transaccionId"
                params={{ transaccionId: compra.id }}
                className="ml-auto flex shrink-0 items-center gap-1 text-primary hover:underline"
              >
                <Star className="h-4 w-4" /> Calificar vendedor
              </Link>
            )}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-2xl space-y-2 px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : mensajes.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("no_messages")}</p>
          ) : (
            mensajes.map((m) => {
              const mine = m.remitente_id === user?.id;
              const editable = mine && canEditMessage(m.created_at);
              const statusIcon = mine ? (m.read_at ? "✓✓" : m.delivered_at ? "✓✓" : "✓") : null;
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                >
                  {!mine && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={
                          m.avatar_remitente
                            ? avatarUrlByPath.get(m.avatar_remitente) || undefined
                            : undefined
                        }
                      />
                      <AvatarFallback>{m.nombre_remitente?.[0] ?? "U"}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    <p className="mb-1 text-xs font-semibold opacity-80">
                      {m.nombre_remitente ?? "Usuario"}
                    </p>
                    {editingMessageId === m.id ? (
                      <div className="space-y-2">
                        <Input
                          value={texto}
                          onChange={(e) => setTexto(e.target.value)}
                          maxLength={1000}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={enviar}>
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingMessageId(null);
                              setTexto("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap">{m.contenido}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-80">
                          {m.editado_en && <span>Editado</span>}
                          <span>{formatMessageDateTime(m.created_at)}</span>
                        </div>
                      </>
                    )}
                    {mine && (
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-80">
                        {statusIcon && (
                          <span className={m.read_at ? "text-blue-500" : undefined}>
                            {statusIcon}
                          </span>
                        )}
                        {editable && (
                          <>
                            <button
                              type="button"
                              className="ml-1 underline underline-offset-2"
                              onClick={() => {
                                setEditingMessageId(m.id);
                                setTexto(m.contenido);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="underline underline-offset-2"
                              onClick={() => borrarMensaje(m.id)}
                            >
                              Borrar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {mine && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={
                          m.avatar_remitente
                            ? avatarUrlByPath.get(m.avatar_remitente) || undefined
                            : undefined
                        }
                      />
                      <AvatarFallback>{m.nombre_remitente?.[0] ?? "U"}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <form onSubmit={enviar} className="sticky bottom-0 border-t bg-background">
        <div className="container mx-auto flex max-w-2xl gap-2 px-4 py-3">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={editingMessageId ? "Edita tu mensaje" : t("type_message")}
            maxLength={1000}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-gradient-primary"
            disabled={!texto.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
