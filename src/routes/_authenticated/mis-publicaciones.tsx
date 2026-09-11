import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSignedUrl } from "@/lib/storage";
import {
  Sparkles,
  Trash2,
  Edit,
  Loader2,
  Plus,
  EyeOff,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/error-messages";

interface TxResumen {
  producto_id: string;
  estado_pago: string;
  notas_admin: string | null;
  created_at: string;
}

interface Pub {
  id: string;
  titulo: string;
  precio: number;
  moneda: string;
  imagenes: string[];
  es_destacado: boolean;
  promocionado_hasta: string | null;
  tipo_promocion: string;
  activo: boolean;
  estado_pago?: string;
  notas_admin?: string | null;
  estado_moderacion?: string;
  razon_rechazo?: string | null;
}

interface MonetizationSettings {
  featured?: Record<string, { enabled?: boolean; price?: number; durationDays?: number }>;
}

const normalizePaymentState = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

export const Route = createFileRoute("/_authenticated/mis-publicaciones")({
  component: MisPubs,
});

function MisPubs() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredPlansEnabled, setFeaturedPlansEnabled] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Cargamos únicamente los productos del usuario de forma limpia
      const { data: prods, error: pErr } = await supabase
        .from("productos")
        .select(
          "id, titulo, precio, moneda, imagenes, es_destacado, promocionado_hasta, tipo_promocion, activo",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;

      // Optimizado: Una sola query con JOIN para mejor performance
      const { data: productsWithTx, error: joinErr } = await supabase
        .from("productos")
        .select(
          `
          id,
          titulo,
          descripcion,
          precio,
          moneda,
          imagenes,
          activo,
          created_at,
          es_destacado,
          tipo_promocion,
          promocionado_hasta,
          estado_moderacion,
          razon_rechazo,
          transacciones (
            id,
            estado_pago,
            notas_admin,
            created_at
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (joinErr) throw joinErr;

      const { data: settingsData, error: settingsErr } = await supabase
        .from("monetization_settings")
        .select("settings")
        .limit(1)
        .maybeSingle();

      if (settingsErr && settingsErr.code !== "PGRST116") throw settingsErr;

      const featuredSettings = ((settingsData?.settings as MonetizationSettings | null)?.featured ?? {}) as Record<
        string,
        { enabled?: boolean }
      >;

      const anyPlanEnabled = Object.values(featuredSettings).some((plan) => plan.enabled !== false);
      setFeaturedPlansEnabled(Object.keys(featuredSettings).length === 0 ? true : anyPlanEnabled);

      const listaProductos = (productsWithTx || []).map((p) => {
        const transacciones = Array.isArray(p.transacciones) ? p.transacciones : [];
        const latestTx = transacciones.reduce<(typeof transacciones)[number] | null>((latest, current) => {
          if (!latest) return current;
          return new Date(current.created_at ?? 0).getTime() > new Date(latest.created_at ?? 0).getTime()
            ? current
            : latest;
        }, null);

        const estadoPago = normalizePaymentState(latestTx?.estado_pago);

        return {
          id: p.id,
          titulo: p.titulo,
          descripcion: p.descripcion,
          precio: p.precio,
          moneda: p.moneda,
          imagenes: p.imagenes,
          activo: p.activo,
          created_at: p.created_at,
          es_destacado: p.es_destacado,
          tipo_promocion: p.tipo_promocion,
          promocionado_hasta: p.promocionado_hasta,
          estado_pago: estadoPago || null,
          notas_admin: latestTx?.notas_admin ?? null,
          estado_moderacion: p.estado_moderacion || "pendiente",
          razon_rechazo: p.razon_rechazo || null,
        };
      }) as Pub[];

      setItems(listaProductos);
    } catch (err: unknown) {
      const message = toUserMessage(err, "Error al sincronizar con el servidor");
      console.error("Error sincronizando publicaciones:", err);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const del = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (error) return toast.error(toUserMessage(error, "No se pudo eliminar el anuncio."));
    toast.success("Eliminado");
    load();
  };

  const toggleActive = async (p: Pub) => {
    const { error } = await supabase.from("productos").update({ activo: !p.activo }).eq("id", p.id);
    if (error) return toast.error(toUserMessage(error, "No se pudo actualizar el anuncio."));
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("my_listings")}</h1>
          <Button asChild className="bg-gradient-primary">
            <Link to="/publicar">
              <Plus className="h-4 w-4" /> {t("publish")}
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 py-16 text-center text-muted-foreground">
            {t("no_listings")}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <PubRow
                key={p.id}
                p={p}
                featuredPlansEnabled={featuredPlansEnabled}
                onDelete={() => del(p.id)}
                onToggle={() => toggleActive(p)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PubRow({
  p,
  featuredPlansEnabled,
  onDelete,
  onToggle,
}: {
  p: Pub;
  featuredPlansEnabled: boolean;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const nav = useNavigate();
  const img = useSignedUrl("productos", p.imagenes?.[0]);
  const estadoPago = normalizePaymentState(p.estado_pago);
  const promoActiva =
    p.es_destacado && p.promocionado_hasta && new Date(p.promocionado_hasta) > new Date();

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col p-0">
        <div className="flex items-center gap-3 p-3">
          <button
            onClick={() => nav({ to: "/producto/$id", params: { id: p.id } })}
            className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted"
          >
            {img && <img src={img} alt="" className="h-full w-full object-cover" />}
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{p.titulo}</h3>
            <p className="text-sm font-bold text-primary">
              {p.moneda} {Number(p.precio).toFixed(2)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant={p.activo ? "default" : "secondary"} className="text-[10px]">
                {p.activo ? t("active") : t("inactive")}
              </Badge>
              {p.estado_moderacion === "pendiente" && (
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400 gap-1">
                  <Clock className="h-3 w-3" /> En espera
                </Badge>
              )}
              {p.estado_moderacion === "aprobado" && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] gap-1 border-0">
                  <CheckCircle2 className="h-3 w-3" /> Aprobado
                </Badge>
              )}
              {p.estado_moderacion === "rechazado" && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertCircle className="h-3 w-3" /> Rechazado
                </Badge>
              )}
              {promoActiva && (
                <Badge className="bg-gradient-featured text-warning-foreground border-0 gap-1 text-[10px] uppercase tracking-wide">
                  <Sparkles className="h-3 w-3" /> DESTACADO · {p.tipo_promocion}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {!promoActiva && estadoPago !== "PENDIENTE" && featuredPlansEnabled && (
              <Button
                size="sm"
                className="bg-gradient-featured text-warning-foreground hover:opacity-90"
                onClick={() =>
                  nav({ to: "/promocionar/$productoId", params: { productoId: p.id } })
                }
              >
                <Sparkles className="h-3 w-3" /> DESTACAR PUBLICACIÓN
              </Button>
            )}
            {!promoActiva && estadoPago !== "PENDIENTE" && !featuredPlansEnabled && (
              <Badge variant="secondary" className="text-[10px]">
                DESTACADO temporalmente inactivo
              </Badge>
            )}
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={() => nav({ to: "/editar/$id", params: { id: p.id } })}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="outline" onClick={onToggle}>
                {p.activo ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="outline" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* 🔔 CUADRO DE AVISO DE MODERACIÓN */}
        {p.estado_moderacion === "pendiente" && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 border-t border-amber-100 dark:border-amber-900/50">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Tu anuncio está en espera de revisión por nuestro equipo de moderación.</span>
          </div>
        )}
        {p.estado_moderacion === "rechazado" && (
          <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-400 border-t border-rose-100 dark:border-rose-900/50">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Anuncio Rechazado: </span>
              <span>
                {p.razon_rechazo || "Infringe las políticas de seguridad. Por favor, publica otro anuncio."}
              </span>
            </div>
          </div>
        )}

        {/* 🔔 CUADRO DE AVISO DIRECTO DE PUBLICIDAD */}
        {estadoPago && (
          <>
            {estadoPago === "PENDIENTE" && (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 border-t border-amber-100 dark:border-amber-900/50">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Tu pago para destacar este anuncio está siendo revisado por el administrador.
                </span>
              </div>
            )}
            {estadoPago === "COMPLETADO" && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 border-t border-emerald-100 dark:border-emerald-900/50">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {p.notas_admin ||
                    "¡Tu publicidad ha sido aprobada y el anuncio ya está destacado! 🎉"}
                </span>
              </div>
            )}
            {estadoPago === "RECHAZADO" && (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-400 border-t border-rose-100 dark:border-rose-900/50">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold">Publicidad Rechazada: </span>
                  <span>
                    {p.notas_admin || "Por favor, verifica el comprobante e intenta de nuevo."}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
