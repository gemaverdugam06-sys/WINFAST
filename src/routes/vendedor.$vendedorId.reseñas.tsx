import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useSignedUrl } from "@/lib/storage";
import { useAuth } from "@/lib/auth";

interface Reseña {
  id: string;
  calificacion: number;
  comentario: string | null;
  created_at: string;
  comprador_id: string;
  profiles: {
    nombre_completo: string | null;
    avatar_url: string | null;
  } | null;
}

interface VendedorStats {
  id: string;
  nombre_completo: string | null;
  avatar_url: string | null;
  ciudad: string | null;
  total_reseñas: number;
  promedio_calificacion: number;
}

export const Route = createFileRoute("/vendedor/$vendedorId/reseñas")({
  component: ReseñasVendedor,
});

function ReseñasVendedor() {
  const { vendedorId } = useParams({ from: "/vendedor/$vendedorId/reseñas" });
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [vendedor, setVendedor] = useState<VendedorStats | null>(null);
  const [reseñas, setReseñas] = useState<Reseña[]>([]);
  const [loading, setLoading] = useState(true);
  const avatarUrl = useSignedUrl("avatars", vendedor?.avatar_url);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let vendorRow = null;
        const { data: vendedorData, error: vendedorError } = await supabase
          .from("perfil_vendedor_stats")
          .select("*")
          .eq("id", vendedorId)
          .maybeSingle();

        if (!vendedorError && vendedorData) {
          vendorRow = vendedorData;
        } else {
          const { data: fallbackProfile, error: fallbackError } = await supabase
            .from("profiles")
            .select("id, nombre_completo, avatar_url, ciudad")
            .eq("id", vendedorId)
            .maybeSingle();

          if (!fallbackError && fallbackProfile) {
            vendorRow = {
              id: fallbackProfile.id ?? vendedorId,
              nombre_completo: fallbackProfile.nombre_completo,
              avatar_url: fallbackProfile.avatar_url,
              ciudad: fallbackProfile.ciudad,
              total_resenas: 0,
              promedio_calificacion: 0,
            };
          }
        }

        if (vendorRow) {
          setVendedor({
            id: vendorRow.id ?? vendedorId,
            nombre_completo: vendorRow.nombre_completo,
            avatar_url: vendorRow.avatar_url,
            ciudad: vendorRow.ciudad,
            total_reseñas: Number(vendorRow.total_resenas ?? 0),
            promedio_calificacion: Number(vendorRow.promedio_calificacion ?? 0),
          });
        }

        const { data: reseñasData, error: reseñasError } = await supabase
          .from("resenas_vendedores")
          .select(
            `
            id,
            calificacion,
            comentario,
            created_at,
            comprador_id
          `,
          )
          .eq("vendedor_id", vendedorId)
          .eq("estado", "visible")
          .order("created_at", { ascending: false });

        if (reseñasError) {
          console.error("Error loading reviews:", reseñasError);
          setReseñas([]);
          return;
        }

        const compradorIds = [...new Set((reseñasData ?? []).map((review) => review.comprador_id))];
        const profilesById = new Map<string, { nombre_completo: string | null; avatar_url: string | null }>();

        if (compradorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, nombre_completo, avatar_url")
            .in("id", compradorIds);

          for (const profile of profilesData ?? []) {
            profilesById.set(profile.id, profile);
          }
        }

        setReseñas(
          (reseñasData ?? []).map((review) => ({
            ...review,
            created_at: review.created_at ?? new Date().toISOString(),
            profiles: profilesById.get(review.comprador_id) ?? null,
          })),
        );
      } catch (error) {
        console.error("Error loading reviews:", error);
        setReseñas([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [vendedorId, user?.id]);

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-3xl px-4 py-6">
          <Card>
            <CardContent className="py-10 text-center">
              <h1 className="text-xl font-bold">Inicia sesión para ver las reseñas</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Necesitas ingresar a tu cuenta para consultar las opiniones de los vendedores.
              </p>
              <Button className="mt-4" onClick={() => nav({ to: "/auth" })}>
                Iniciar sesión
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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

  if (!vendedor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-8 text-center">Vendedor no encontrado.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/" })} className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver
        </Button>

        {/* Vendor Profile Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback>{vendedor.nombre_completo?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{vendedor.nombre_completo}</h1>
                <p className="text-sm text-muted-foreground">{vendedor.ciudad}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(vendedor.promedio_calificacion)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{vendedor.promedio_calificacion.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({vendedor.total_reseñas} {vendedor.total_reseñas === 1 ? "reseña" : "reseñas"})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Reseñas de Compradores</h2>

          {reseñas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Este vendedor aún no tiene reseñas.
              </CardContent>
            </Card>
          ) : (
            reseñas.map((reseña) => (
              <Card key={reseña.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage
                        src={
                          reseña.profiles?.avatar_url
                            ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${reseña.profiles.avatar_url}`
                            : undefined
                        }
                      />
                      <AvatarFallback>
                        {reseña.profiles?.nombre_completo?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold">
                            {reseña.profiles?.nombre_completo ?? "Usuario"}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < reseña.calificacion
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-bold">{reseña.calificacion}/5</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(reseña.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {reseña.comentario && (
                        <p className="mt-3 text-sm leading-relaxed">{reseña.comentario}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
