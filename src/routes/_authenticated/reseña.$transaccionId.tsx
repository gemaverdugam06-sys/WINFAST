import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Star, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/error-messages";

export const Route = createFileRoute("/_authenticated/reseña/$transaccionId")({
  component: PublicarReseñaPage,
});

interface ReviewTransaction {
  id: string;
  vendedor_id?: string | null;
  productos?: {
    titulo?: string | null;
    user_id?: string | null;
  } | null;
}

interface ReviewSeller {
  id: string;
  nombre_completo?: string | null;
  avatar_url?: string | null;
}

interface ExistingReview {
  id: string;
  calificacion: number;
  comentario?: string | null;
}

function PublicarReseñaPage() {
  const { transaccionId } = useParams({ from: "/_authenticated/reseña/$transaccionId" });
  const { user } = useAuth();
  const nav = useNavigate();

  const [calificacion, setCalificacion] = useState<number>(5);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transaccion, setTransaccion] = useState<ReviewTransaction | null>(null);
  const [vendedor, setVendedor] = useState<ReviewSeller | null>(null);
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const { data: tx, error: txError } = await supabase
          .from("compras")
          .select(
            `
            *,
            productos:producto_id (
              titulo,
              user_id
            )
          `,
          )
          .eq("id", transaccionId)
          .eq("comprador_id", user.id)
          .eq("estado", "CONFIRMADA")
          .maybeSingle();

        if (txError) {
          console.error("Error loading purchase for review:", txError);
          setTransaccion(null);
          return;
        }

        if (!tx) {
          setTransaccion(null);
          return;
        }

        setTransaccion(tx);

        if (tx.vendedor_id) {
          const { data: vendedorData, error: vendedorError } = await supabase
            .from("profiles")
            .select("id, nombre_completo, avatar_url")
            .eq("id", tx.vendedor_id)
            .maybeSingle();

          if (!vendedorError && vendedorData) {
            setVendedor(vendedorData);
          } else {
            setVendedor({ id: tx.vendedor_id, nombre_completo: "Vendedor" });
          }
        } else {
          setVendedor(null);
        }

        const { data: existingReview, error: reviewError } = await supabase
          .from("resenas_vendedores")
          .select("*")
          .eq("compra_id", transaccionId)
          .maybeSingle();

        if (reviewError && reviewError.code !== "PGRST116") {
          console.error("Error loading existing review:", reviewError);
        }

        if (existingReview) {
          setExistingReview(existingReview);
          setCalificacion(existingReview.calificacion);
          setComentario(existingReview.comentario || "");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, transaccionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !transaccion || !vendedor) return;

    if (calificacion < 1 || calificacion > 5) {
      toast.error("La calificación debe estar entre 1 y 5");
      return;
    }

    setSubmitting(true);

    try {
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from("resenas_vendedores")
          .update({
            calificacion,
            comentario: comentario || null,
          })
          .eq("id", existingReview.id);

        if (error) throw error;
        toast.success("Reseña actualizada");
      } else {
        // Create new review
        const { error } = await supabase.from("resenas_vendedores").insert({
          compra_id: transaccionId,
          vendedor_id: transaccion.vendedor_id,
          comprador_id: user.id,
          calificacion,
          comentario: comentario || null,
          estado: "visible",
        });

        if (error) throw error;
        toast.success("¡Reseña publicada!");
      }

      // Redirect to vendor reviews
      nav({ to: "/vendedor/$vendedorId/reseñas", params: { vendedorId: vendedor.id } });
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(toUserMessage(error, "Error al guardar la reseña"));
    } finally {
      setSubmitting(false);
    }
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

  if (!transaccion || !vendedor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-xl p-8 text-center">
          <h1 className="text-xl font-semibold">No se puede acceder a esta reseña</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Esta compra no está disponible para calificar o ya no existe.
          </p>
          <Button className="mt-5" onClick={() => nav({ to: "/" })}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/" })} className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{existingReview ? "Editar Reseña" : "Escribir Reseña"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Producto</p>
                <p className="font-semibold">
                  {transaccion.productos?.titulo ?? "Producto comprado"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Vendedor</p>
                <p className="font-semibold">{vendedor.nombre_completo}</p>
              </div>

              <div className="space-y-3">
                <Label>Calificación (1-5 estrellas) *</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCalificacion(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= calificacion
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm font-semibold text-muted-foreground">
                  {calificacion} de 5 estrellas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentario">Comentario (opcional, máximo 500 caracteres)</Label>
                <Textarea
                  id="comentario"
                  placeholder="Comparte tu experiencia con este vendedor..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{comentario.length}/500</p>
              </div>

              <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-600">
                <p>
                  💡 <span className="font-semibold">Consejo:</span> Sé honesto y específico sobre
                  tu experiencia. Esto ayuda a otros compradores a tomar decisiones informadas.
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : existingReview ? (
                    "Actualizar Reseña"
                  ) : (
                    "Publicar Reseña"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => nav({ to: "/" })}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
