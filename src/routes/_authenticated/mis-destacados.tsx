import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface DestacadoItem {
  id: string;
  titulo: string;
  tipo: "PRODUCTO" | "SERVICIO";
  plan: string;
  precio_pagado: number;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  estado: string;
  es_destacado: boolean;
  promocionado_hasta: string | null;
}

export const Route = createFileRoute("/_authenticated/mis-destacados")({
  component: MisDestacadosPage,
});

function MisDestacadosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<DestacadoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("id, titulo, es_destacado, promocionado_hasta, tipo_promocion, precio")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const rows = ((data as any[]) ?? [])
          .filter((item) => Boolean(item.es_destacado) || Boolean(item.promocionado_hasta))
          .map((item) => ({
            id: item.id,
            titulo: item.titulo,
            tipo: "PRODUCTO",
            plan: item.tipo_promocion || "FLASH",
            precio_pagado: Number(item.precio ?? 0),
            fecha_inicio: item.promocionado_hasta ? new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() : null,
            fecha_vencimiento: item.promocionado_hasta,
            estado:
              item.es_destacado && item.promocionado_hasta && new Date(item.promocionado_hasta) > new Date()
                ? "ACTIVO"
                : "VENCIDO",
            es_destacado: Boolean(item.es_destacado),
            promocionado_hasta: item.promocionado_hasta,
          })) as DestacadoItem[];

        setItems(rows);
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar tus destacados");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">⭐ MIS DESTACADOS</h1>
          <Button asChild variant="outline">
            <Link to="/mis-publicaciones">Ver publicaciones</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Todavía no tienes anuncios destacados.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const remaining = item.promocionado_hasta
                ? Math.max(
                    0,
                    Math.ceil((new Date(item.promocionado_hasta).getTime() - Date.now()) / 86400000),
                  )
                : 0;

              return (
                <Card key={item.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-gradient-featured text-warning-foreground border-0 gap-1">
                        <Sparkles className="h-3 w-3" /> {item.plan}
                      </Badge>
                      <Badge variant="outline">{item.tipo}</Badge>
                      <Badge variant={item.estado === "ACTIVO" ? "default" : "secondary"}>
                        {item.estado}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-semibold">{item.titulo}</h2>
                        <p className="text-sm text-muted-foreground">
                          Precio pagado: ${Number(item.precio_pagado).toFixed(2)} · Vence: {item.fecha_vencimiento ? new Date(item.fecha_vencimiento).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{remaining > 0 ? `${remaining} días restantes` : "Sin tiempo restante"}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigate({ to: "/producto/$id", params: { id: item.id } })}
                      >
                        <ExternalLink className="mr-1 h-4 w-4" /> Ver publicación
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: "/promocionar/$productoId", params: { productoId: item.id } })}
                      >
                        🔄 Extender destacado
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
