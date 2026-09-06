import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useSignedUrl, useSignedUrls } from "@/lib/storage";
import { Header } from "@/components/Header";
import { ReportDialog } from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  MessageCircle,
  ShoppingCart,
  Phone,
  Sparkles,
  ArrowLeft,
  Loader2,
  Star,
  Flag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/error-messages";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { isUserVerified } from "@/lib/auth-utils";

interface Producto {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
  moneda: string;
  ciudad: string;
  imagenes: string[];
  estado: string;
  estado_moderacion: string;
  whatsapp: string | null;
  es_destacado: boolean;
  user_id: string;
  categoria_id: string;
  profiles: {
    nombre_completo: string | null;
    avatar_url: string | null;
    ciudad: string | null;
  } | null;
}

interface VendorStats {
  id: string;
  avg_rating: number;
  review_count: number;
}

export const Route = createFileRoute("/producto/$id")({
  component: ProductoPage,
});

function ProductoPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const [p, setP] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [vendorStats, setVendorStats] = useState<VendorStats | null>(null);
  const [reviewTransactionId, setReviewTransactionId] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const images = useSignedUrls("productos", p?.imagenes ?? []);
  const vendorAvatarUrl = useSignedUrl("avatars", p?.profiles?.avatar_url);

  const eliminarProducto = async () => {
    if (!p || !user || (!isAdmin && p.user_id !== user.id) || deleting) return;
    if (!window.confirm(`¿Deseas eliminar permanentemente la publicación "${p.titulo}"?`)) return;

    setDeleting(true);
    const { error } = await supabase.from("productos").delete().eq("id", p.id);
    setDeleting(false);

    if (error) {
      toast.error(toUserMessage(error, "No se pudo eliminar la publicación."));
      return;
    }

    toast.success("Publicación eliminada");
    nav({ to: "/" });
  };
  useEffect(() => {
    let active = true;

    const loadProducto = async () => {
      try {
        let productoQuery = supabase
          .from("productos")
          .select("*, profiles!productos_user_profile_fk(nombre_completo, avatar_url, ciudad)")
          .eq("id", id)
          .eq("activo", true);

        // Public users only see approved listings. The owner can still review
        // their own pending/rejected listing after publishing it.
        if (isAdmin) {
          productoQuery = productoQuery;
        } else if (user?.id) {
          productoQuery = productoQuery.or(`estado_moderacion.eq.aprobado,user_id.eq.${user.id}`);
        } else {
          productoQuery = productoQuery.eq("estado_moderacion", "aprobado");
        }

        const { data, error } = await productoQuery.maybeSingle();

        if (!active) return;

        if (error) {
          console.error("Error cargando producto:", error);
          setP(null);
          return;
        }

        const producto = (data as Producto | null) ?? null;
        setP(producto);

        // Load vendor stats and recent reviews
        if (producto?.user_id) {
          try {
            // Get vendor stats
            const { data: stats } = await supabase
              .from("perfil_vendedor_stats")
              .select("*")
              .eq("id", producto.user_id)
              .maybeSingle();

            if (stats) {
              setVendorStats({
                id: stats.id ?? producto.user_id,
                avg_rating: Number(stats.promedio_calificacion ?? 0),
                review_count: Number(stats.total_resenas ?? 0),
              });
            }

            // Get recent reviews (first 3)
            const { data: reviews } = await supabase
              .from("resenas_vendedores")
              .select(
                "*, profiles!resenas_vendedores_comprador_id_fkey(nombre_completo, avatar_url)",
              )
              .eq("vendedor_id", producto.user_id)
              .eq("estado", "visible")
              .order("created_at", { ascending: false })
              .limit(3);

            if (reviews) setRecentReviews(reviews);

            if (user?.id && user.id !== producto.user_id) {
              const { data: buyerPurchase } = await supabase
                .from("compras")
                .select("id, estado")
                .eq("producto_id", producto.id)
                .eq("comprador_id", user.id)
                .maybeSingle();

              if (buyerPurchase?.id) {
                setPurchaseStatus(buyerPurchase.estado);
                if (buyerPurchase.estado === "CONFIRMADA") {
                  setReviewTransactionId(buyerPurchase.id);
                }
              }
            }
          } catch (err) {
            console.error("Error loading vendor reviews:", err);
          }
        }
      } catch (error) {
        console.error("Error inesperado cargando producto:", error);
        if (active) setP(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProducto();

    return () => {
      active = false;
    };
  }, [id, user?.id, isAdmin]);

  const isVerified = isUserVerified(user);

  const startChat = async () => {
    if (!user) {
      toast.error("Inicia sesión para chatear");
      nav({ to: "/auth" });
      return;
    }
    if (!isVerified) {
      toast.error("Verifica tu correo electrónico para poder chatear");
      return;
    }
    if (!p) return;
    if (user.id === p.user_id) {
      toast.error("Es tu propio anuncio");
      return;
    }
    const { data: existing } = await supabase
      .from("chats")
      .select("id")
      .eq("producto_id", p.id)
      .eq("comprador_id", user.id)
      .maybeSingle();
    let chatId = existing?.id;
    if (!chatId) {
      const { data: nuevo, error } = await supabase
        .from("chats")
        .insert({ producto_id: p.id, comprador_id: user.id, vendedor_id: p.user_id })
        .select("id")
        .single();
      if (error) {
        toast.error(toUserMessage(error, "No se pudo iniciar el chat."));
        return;
      }
      chatId = nuevo.id;
    } else {
      const { error: restoreError } = await supabase
        .from("chat_user_states")
        .upsert(
          { chat_id: chatId, user_id: user.id, archived_at: null, deleted_at: null },
          { onConflict: "chat_id,user_id" },
        );
      if (restoreError) {
        toast.error(toUserMessage(restoreError, "No se pudo abrir el chat."));
        return;
      }
    }
    nav({ to: "/chat/$chatId", params: { chatId } });
  };

  const handleWhatsapp = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast.error("Inicia sesión para ver WhatsApp");
      nav({ to: "/auth" });
      return;
    }
    if (!isVerified) {
      e.preventDefault();
      toast.error("Verifica tu correo electrónico para contactar por WhatsApp");
      return;
    }
  };

  const requestPurchase = async () => {
    if (!user) {
      toast.error("Inicia sesión para solicitar la compra");
      nav({ to: "/auth" });
      return;
    }
    if (!isVerified || !p || user.id === p.user_id || purchaseStatus || purchaseLoading) return;

    setPurchaseLoading(true);
    const { data, error } = await supabase
      .from("compras")
      .insert({ comprador_id: user.id, vendedor_id: p.user_id, producto_id: p.id })
      .select("id, estado")
      .single();
    setPurchaseLoading(false);

    if (error) {
      toast.error(toUserMessage(error, "No se pudo solicitar la compra."));
      return;
    }

    setPurchaseStatus(data.estado);
    toast.success("Solicitud de compra enviada. Espera la confirmación.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-8 text-center">Producto no encontrado.</div>
      </div>
    );
  }

  const waLink = buildWhatsappLink(
    p.whatsapp,
    `Hola, vi tu anuncio "${p.titulo}" en WINFAST y me interesa. ¿Sigue disponible?`,
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-5xl px-4 py-4">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/" })} className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver
        </Button>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <motion.div
              className="aspect-square overflow-hidden rounded-xl bg-muted"
              initial={{ scale: 0.995, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45 }}
              whileHover={{ scale: 1.02 }}
            >
              {images[idx] && (
                <img
                  src={images[idx]}
                  alt={p.titulo}
                  width={800}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              )}
            </motion.div>
            {images.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {images.map((u, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${i === idx ? "border-primary" : "border-transparent"}`}
                  >
                    <img
                      src={u}
                      alt=""
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {p.estado_moderacion === "pendiente" && (
                <Badge variant="outline">Producto en revisión</Badge>
              )}
              {p.estado_moderacion === "rechazado" && (
                <Badge variant="destructive">Producto rechazado</Badge>
              )}
              {p.es_destacado && (
                <Badge className="bg-gradient-featured text-warning-foreground border-0 gap-1">
                  <Sparkles className="h-3 w-3" /> {t("featured")}
                </Badge>
              )}
              <Badge variant="secondary">
                {p.estado === "nuevo" ? t("new_item") : t("used_item")}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">{p.titulo}</h1>
            <p className="text-3xl font-bold text-primary">
              {p.moneda} {Number(p.precio).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {p.ciudad}
            </p>
            <Card className="p-4 glass-border soft-shadow">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={vendorAvatarUrl ?? undefined} />
                  <AvatarFallback>{p.profiles?.nombre_completo?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">
                    {p.profiles?.nombre_completo ?? "Vendedor"}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.profiles?.ciudad ?? p.ciudad}</p>
                </div>
              </div>
            </Card>
            <div className="flex flex-col gap-2 sm:flex-row">
              {user?.id !== p.user_id && (
                <Button
                  onClick={requestPurchase}
                  disabled={!isVerified || Boolean(purchaseStatus) || purchaseLoading}
                  variant="secondary"
                  className="flex-1"
                >
                  <ShoppingCart className="mr-1 h-4 w-4" />
                  {purchaseLoading
                    ? "Solicitando..."
                    : purchaseStatus === "CONFIRMADA"
                      ? "Compra confirmada"
                      : purchaseStatus === "PENDIENTE"
                        ? "Compra pendiente"
                        : "Solicitar compra"}
                </Button>
              )}
              <motion.div whileHover={{ scale: 1.02 }} className="flex-1 will-change-transform">
                <Button onClick={startChat} className="flex-1 btn-cta">
                  <MessageCircle className="mr-1 h-4 w-4" /> {t("chat_internal")}
                </Button>
              </motion.div>
              {p.whatsapp &&
                (user && isVerified && waLink ? (
                  <motion.div whileHover={{ scale: 1.02 }} className="flex-1 will-change-transform">
                    <Button asChild variant="outline" className="flex-1">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        <Phone className="mr-1 h-4 w-4" /> {t("open_whatsapp")}
                      </a>
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div whileHover={{ scale: 1.02 }} className="flex-1 will-change-transform">
                    <Button variant="outline" className="flex-1" onClick={handleWhatsapp}>
                      <Phone className="mr-1 h-4 w-4" /> {t("open_whatsapp")}
                    </Button>
                  </motion.div>
                ))}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setReportDialogOpen(true)}
                className="text-muted-foreground hover:text-destructive"
                title="Reportar esta publicación"
              >
                <Flag className="h-4 w-4" />
              </Button>
              {(user?.id === p.user_id || isAdmin) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={eliminarProducto}
                  disabled={deleting}
                  className="text-muted-foreground hover:text-destructive"
                  title="Eliminar publicación"
                  aria-label="Eliminar publicación"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {(!user || !isVerified) && (
              <p className="text-xs text-muted-foreground">
                {!user
                  ? "Inicia sesión con una cuenta verificada para ver WhatsApp y chatear."
                  : "Verifica tu correo electrónico para ver WhatsApp y chatear."}
              </p>
            )}
            <div>
              <h2 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">
                {t("description")}
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.descripcion}</p>
            </div>

            {/* Vendor Reviews Section */}
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Opiniones del vendedor</h2>
                <div className="flex items-center gap-3">
                  {reviewTransactionId && (
                    <Link
                      to="/reseña/$transaccionId"
                      params={{ transaccionId: reviewTransactionId }}
                      className="text-xs text-primary hover:underline"
                    >
                      Calificar vendedor
                    </Link>
                  )}
                  {vendorStats && vendorStats.review_count > 0 && (
                    <Link
                      to="/vendedor/$vendedorId/reseñas"
                      params={{ vendedorId: p.user_id }}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver todas ({vendorStats.review_count})
                    </Link>
                  )}
                  {(!vendorStats || vendorStats.review_count === 0) && (
                    <Link
                      to="/vendedor/$vendedorId/reseñas"
                      params={{ vendedorId: p.user_id }}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver reseñas
                    </Link>
                  )}
                </div>
              </div>

              {vendorStats ? (
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(vendorStats.avg_rating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">
                    {(vendorStats.avg_rating || 0).toFixed(1)} de 5
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({vendorStats.review_count}{" "}
                    {vendorStats.review_count === 1 ? "reseña" : "reseñas"})
                  </span>
                </div>
              ) : null}

              {recentReviews.length > 0 ? (
                <div className="space-y-3">
                  {recentReviews.map((review) => (
                    <Card key={review.id} className="p-3">
                      <div className="flex gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={review.profiles?.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {review.profiles?.nombre_completo?.[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold">
                              {review.profiles?.nombre_completo ?? "Comprador"}
                            </p>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < review.calificacion
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comentario && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {review.comentario}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Sin reseñas aún. ¡Sé el primero en reseñar!
                </p>
              )}
            </div>
          </div>
        </div>

        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          reportType="producto"
          objetoId={p.id}
          objectName={p.titulo}
        />
      </main>
    </div>
  );
}
