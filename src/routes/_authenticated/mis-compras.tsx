import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { usePurchaseNotifications } from "@/hooks/use-purchase-notifications";
import { Loader2, ShieldCheck, ShieldX, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

interface CompraItem {
  id: string;
  comprador_id: string;
  vendedor_id: string;
  producto_id: string;
  estado: string;
  created_at: string;
  confirmed_at: string | null;
  productos: { titulo: string } | null;
}

export const Route = createFileRoute("/_authenticated/mis-compras")({
  component: MisComprasPage,
});

function MisComprasPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { decidePurchase } = usePurchaseNotifications();
  const [compras, setCompras] = useState<CompraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!userId) {
        setCompras([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("compras")
          .select(
            "id, comprador_id, vendedor_id, producto_id, estado, created_at, confirmed_at, productos(titulo)",
          )
          .or(`comprador_id.eq.${userId},vendedor_id.eq.${userId}`)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (active) setCompras((data as unknown as CompraItem[]) ?? []);
      } catch (error) {
        console.error("Error al cargar compras:", error);
        if (active) {
          setCompras([]);
          toast.error("No se pudieron cargar tus compras");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [userId, reloadKey]);

  const comoComprador = compras.filter((compra) => compra.comprador_id === userId);
  const comoVendedor = compras.filter((compra) => compra.vendedor_id === userId);

  const actualizarCompra = async (compraId: string, estado: "CONFIRMADA" | "CANCELADA") => {
    setWorking(compraId);
    const updated = await decidePurchase(compraId, estado);
    setWorking(null);
    if (updated) setReloadKey((current) => current + 1);
  };

  const renderCompras = (items: CompraItem[], rol: "comprador" | "vendedor") => {
    if (loading) {
      return (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando compras...
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {rol === "comprador"
              ? "Aún no has solicitado ninguna compra."
              : "Aún no tienes solicitudes para tus publicaciones."}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((compra) => (
          <Card key={compra.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      compra.estado === "CONFIRMADA"
                        ? "default"
                        : compra.estado === "CANCELADA"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {compra.estado === "PENDIENTE"
                      ? "Pendiente"
                      : compra.estado === "CONFIRMADA"
                        ? "Confirmada"
                        : "Cancelada"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {rol === "comprador" ? "Como comprador" : "Como vendedor"}
                  </span>
                </div>
                <h2 className="truncate font-semibold">
                  {compra.productos?.titulo ?? "Publicación no disponible"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {new Date(compra.created_at).toLocaleString("es-EC")}
                </p>
              </div>

              {rol === "vendedor" && compra.estado === "PENDIENTE" && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    disabled={working === compra.id}
                    onClick={() => void actualizarCompra(compra.id, "CONFIRMADA")}
                  >
                    <ShieldCheck className="mr-1 h-4 w-4" /> Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={working === compra.id}
                    onClick={() => void actualizarCompra(compra.id, "CANCELADA")}
                  >
                    <ShieldX className="mr-1 h-4 w-4" /> Rechazar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Mis compras</h1>
            <p className="text-sm text-muted-foreground">
              Consulta tus solicitudes y gestiona las compras de tus publicaciones.
            </p>
          </div>
        </div>

        <Tabs defaultValue="comprador" className="space-y-4">
          <TabsList className="grid w-full max-w-xl grid-cols-2">
            <TabsTrigger value="comprador">Como comprador ({comoComprador.length})</TabsTrigger>
            <TabsTrigger value="vendedor">Como vendedor ({comoVendedor.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="comprador">{renderCompras(comoComprador, "comprador")}</TabsContent>
          <TabsContent value="vendedor">{renderCompras(comoVendedor, "vendedor")}</TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
