import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PagoItem {
  id: string;
  concepto: string;
  producto_titulo: string | null;
  plan: string;
  monto: number;
  estado: string;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  created_at: string | null;
}

export const Route = createFileRoute("/_authenticated/mis-pagos")({
  component: MisPagosPage,
});

function MisPagosPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PagoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("transacciones")
          .select("id, monto, plan, estado_pago, created_at, producto_id, productos(titulo)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const rows: PagoItem[] = ((data as Array<Record<string, unknown>> | null) ?? []).map(
          (item) => {
            const record = item as Record<string, unknown>;
            const productos = record["productos"] as Record<string, unknown> | undefined;
            const createdAt =
              typeof record["created_at"] === "string" ? record["created_at"] : null;
            return {
              id: String(record["id"] ?? ""),
              concepto: "DESTACAR PUBLICACIÓN",
              producto_titulo:
                typeof productos?.["titulo"] === "string" ? productos["titulo"] : "Publicación",
              plan: typeof record["plan"] === "string" ? record["plan"] : "FLASH",
              monto: Number(record["monto"] ?? 0),
              estado:
                typeof record["estado_pago"] === "string" ? record["estado_pago"] : "PENDIENTE",
              fecha_inicio: createdAt,
              fecha_vencimiento: createdAt,
              created_at: createdAt,
            };
          },
        );

        setItems(rows);
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar tus pagos");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">💳 MIS PAGOS</h1>

        {loading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aún no hay transacciones registradas.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.estado === "COMPLETADO" ? "default" : "secondary"}>
                      {item.estado}
                    </Badge>
                    <Badge variant="outline">{item.plan}</Badge>
                    <span className="font-bold">${Number(item.monto).toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>
                      <strong>Concepto:</strong> {item.concepto}
                    </div>
                    <div>
                      <strong>Publicación:</strong> {item.producto_titulo}
                    </div>
                    <div>
                      <strong>Fecha:</strong>{" "}
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}
                    </div>
                    <div>
                      <strong>Inicio:</strong>{" "}
                      {item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString() : "—"}
                    </div>
                    <div>
                      <strong>Vencimiento:</strong>{" "}
                      {item.fecha_vencimiento
                        ? new Date(item.fecha_vencimiento).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
