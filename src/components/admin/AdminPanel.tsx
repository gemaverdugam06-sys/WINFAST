import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ShieldCheck,
  ShieldX,
  Eye,
  Lock,
  Trash2,
  AlertCircle,
  Flag,
  ImageOff,
  MapPin,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { promoEndDate } from "@/lib/promo-plans";
import { reportReasons } from "@/lib/reporting";
import { useSignedUrls } from "@/lib/storage";

interface Tx {
  id: string;
  user_id: string;
  producto_id: string;
  monto: number;
  plan: string;
  estado_pago: string;
  created_at: string;
  comprobante_url: string | null;
  referencia: string | null;
  notas_admin: string | null;
  productos: { titulo: string } | null;
  profiles: { nombre_completo: string | null } | null;
}

interface Compra {
  id: string;
  comprador_id: string;
  vendedor_id: string;
  producto_id: string;
  estado: string;
  created_at: string;
  confirmed_at: string | null;
  productos: { titulo: string } | null;
}

interface ProductoPendiente {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
  moneda: string;
  ciudad: string;
  imagenes: string[];
  categoria_id: string;
  estado_moderacion: string;
  razon_rechazo: string | null;
  created_at: string;
  categorias: { nombre: string } | null;
  profiles: { nombre_completo: string | null; ciudad: string | null } | null;
}

interface Reporte {
  id: string;
  reportero_id: string;
  tipo: string;
  objeto_id: string;
  razon: string;
  descripcion: string | null;
  estado: string;
  accion_tomada: string | null;
  created_at: string;
}

interface ReportedReview {
  id: string;
  calificacion: number;
  comentario: string | null;
  estado: string;
  vendedor_id: string;
  comprador_id: string;
  created_at: string;
}

interface SupportTicket {
  id: string;
  ticket_number: number | null;
  user_id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  response_text: string | null;
  responded_at: string | null;
}

interface UserProfile {
  id: string;
  nombre_completo: string | null;
  ciudad: string | null;
  avatar_url: string | null;
  is_blocked: boolean;
  motivo_bloqueo: string | null;
  created_at: string;
}

const normalizePaymentState = (value: string | null | undefined) => {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  return raw
    .replace(/[-_\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const isPendingState = (value?: string | null) => {
  const normalized = normalizePaymentState(value);
  return [
    "PENDIENTE",
    "PENDING",
    "EN REVISION",
    "EN REVISIÓN",
    "REVISION",
    "REVISIÓN",
    "EN PROCESO",
  ].includes(normalized);
};

const isCompletedState = (value?: string | null) => {
  const normalized = normalizePaymentState(value);
  return ["COMPLETADO", "COMPLETED", "APROBADO", "APPROVED", "ACEPTADO"].includes(normalized);
};

const isRejectedState = (value?: string | null) => {
  const normalized = normalizePaymentState(value);
  return ["RECHAZADO", "REJECTED", "CANCELADO", "RECHAZADA"].includes(normalized);
};

const isHistoryState = (value?: string | null) => isCompletedState(value) || isRejectedState(value);

function ProductoModerationCard({
  producto,
  working,
  onAprobar,
  onRechazar,
  onEliminar,
}: {
  producto: ProductoPendiente;
  working: boolean;
  onAprobar: () => void;
  onRechazar: () => void;
  onEliminar: () => void;
}) {
  const imageUrls = useSignedUrls("productos", producto.imagenes);
  const location = producto.ciudad || producto.profiles?.ciudad;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="grid grid-cols-3 gap-2 md:grid-cols-2">
            <div className="col-span-3 aspect-square overflow-hidden rounded-lg bg-muted md:col-span-2">
              {imageUrls[0] ? (
                <img
                  src={imageUrls[0]}
                  alt={producto.titulo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageOff className="h-10 w-10" />
                </div>
              )}
            </div>
            {imageUrls.slice(1).map((url, index) => (
              <img
                key={`${url}-${index}`}
                src={url}
                alt={`${producto.titulo} ${index + 2}`}
                className="aspect-square w-full rounded-md object-cover"
              />
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-start gap-2">
              <h3 className="min-w-0 flex-1 text-lg font-bold">{producto.titulo}</h3>
              <Badge variant="outline">{producto.estado_moderacion.toUpperCase()}</Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {producto.descripcion}
            </p>
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Precio</dt>
                <dd className="font-semibold">
                  {producto.moneda}{" "}
                  {Number(producto.precio).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Categoría</dt>
                <dd>{producto.categorias?.nombre ?? producto.categoria_id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vendedor</dt>
                <dd>{producto.profiles?.nombre_completo ?? "Usuario"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ubicación</dt>
                <dd className="flex items-center gap-1">
                  {location ? (
                    <>
                      <MapPin className="h-3 w-3" />
                      {location}
                    </>
                  ) : (
                    "No indicada"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fecha de publicación</dt>
                <dd>{new Date(producto.created_at).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:flex-wrap">
          <Button
            className="w-full bg-success text-success-foreground hover:bg-success/90 sm:w-auto"
            disabled={working}
            onClick={onAprobar}
          >
            {working ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="mr-1 h-4 w-4" />
                Aprobar
              </>
            )}
          </Button>
          <Button className="w-full sm:w-auto" variant="destructive" disabled={working} onClick={onRechazar}>
            <ShieldX className="mr-1 h-4 w-4" />
            Rechazar
          </Button>
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive sm:w-auto"
            disabled={working}
            onClick={onEliminar}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminPanel() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productosPendientes, setProductosPendientes] = useState<ProductoPendiente[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [reseniasReportadas, setReseniasReportadas] = useState<ReportedReview[]>([]);
  const [ticketsSoporte, setTicketsSoporte] = useState<SupportTicket[]>([]);
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [razonesPolitica, setRazonesPolitica] = useState<
    Array<{ categoria: string; descripcion: string }>
  >([]);
  const [showRechazarModal, setShowRechazarModal] = useState<{
    productoId: string;
    titulo: string;
  } | null>(null);
  const [razonSeleccionada, setRazonSeleccionada] = useState("");
  const [notasAdicionales, setNotasAdicionales] = useState("");
  const [supportReplies, setSupportReplies] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadCompras();
      loadProductosPendientes();
      loadReportes();
      loadReseniasReportadas();
      loadTicketsSoporte();
      loadUsuarios();
      loadRazonesPolitica();
    }
  }, [user]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transacciones")
        .select(
          `
          *,
          productos (titulo),
          profiles (nombre_completo)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTxs((data as unknown as Tx[]) ?? []);
    } catch {
      toast.error("Error al cargar transacciones");
    } finally {
      setLoading(false);
    }
  };

  const loadCompras = async () => {
    try {
      const { data, error } = await supabase
        .from("compras")
        .select(
          "id, comprador_id, vendedor_id, producto_id, estado, created_at, confirmed_at, productos(titulo)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCompras((data as unknown as Compra[]) ?? []);
    } catch {
      toast.error("No se pudieron cargar las compras");
    }
  };

  const updateCompra = async (compra: Compra, estado: "CONFIRMADA" | "CANCELADA") => {
    setWorking(compra.id);
    const { error } = await supabase
      .from("compras")
      .update({ estado, confirmed_at: estado === "CONFIRMADA" ? new Date().toISOString() : null })
      .eq("id", compra.id);
    setWorking(null);
    if (error) {
      toast.error("No se pudo actualizar la compra");
      return;
    }
    toast.success(estado === "CONFIRMADA" ? "Compra confirmada" : "Compra cancelada");
    await loadCompras();
  };

  const loadProductosPendientes = async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select(
          `
          id,
          titulo,
          descripcion,
          precio,
          moneda,
          ciudad,
          imagenes,
          categoria_id,
          estado_moderacion,
          razon_rechazo,
          created_at,
          categorias (nombre),
          profiles (nombre_completo, ciudad)
        `,
        )
        .eq("estado_moderacion", "pendiente")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProductosPendientes((data as unknown as ProductoPendiente[]) ?? []);
    } catch (err) {
      console.error("Error al cargar productos pendientes:", err);
    }
  };

  const loadReportes = async () => {
    try {
      const { data, error } = await supabase
        .from("reportes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReportes((data as unknown as Reporte[]) ?? []);
    } catch (err) {
      console.error("Error al cargar reportes:", err);
    }
  };

  const loadReseniasReportadas = async () => {
    try {
      const { data, error } = await supabase
        .from("resenas_vendedores")
        .select("*")
        .eq("estado", "reportado")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReseniasReportadas((data as unknown as ReportedReview[]) ?? []);
    } catch (err) {
      console.error("Error al cargar reseñas reportadas:", err);
    }
  };

  const loadTicketsSoporte = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(
          "id, ticket_number, user_id, name, email, category, subject, description, status, created_at, response_text, responded_at",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTicketsSoporte((data as SupportTicket[]) ?? []);
    } catch (err) {
      console.error("Error al cargar tickets de soporte:", err);
    }
  };

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows = ((data as Array<Record<string, unknown>>) ?? []).map((userRow) => ({
        id: String(userRow.id ?? ""),
        nombre_completo:
          typeof userRow.nombre_completo === "string" ? userRow.nombre_completo : null,
        ciudad: typeof userRow.ciudad === "string" ? userRow.ciudad : null,
        avatar_url: typeof userRow.avatar_url === "string" ? userRow.avatar_url : null,
        is_blocked: Boolean(userRow.is_blocked),
        motivo_bloqueo: typeof userRow.motivo_bloqueo === "string" ? userRow.motivo_bloqueo : null,
        created_at:
          typeof userRow.created_at === "string" ? userRow.created_at : new Date().toISOString(),
      }));

      setUsuarios(rows as UserProfile[]);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
    }
  };

  const loadRazonesPolitica = async () => {
    try {
      const { data, error } = await supabase
        .from("politica_contenido")
        .select("categoria, descripcion")
        .eq("estado", true)
        .order("categoria");

      if (error) throw error;
      setRazonesPolitica(
        (data as unknown as Array<{ categoria: string; descripcion: string }>) ?? [],
      );
    } catch (err) {
      console.error("Error al cargar razones de política:", err);
    }
  };

  const verComprobante = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("comprobantes")
        .createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("No se pudo abrir el comprobante");
    }
  };

  const onEliminarComprobante = async (tx: Tx) => {
    if (!tx.comprobante_url) return;

    const ok = window.confirm("¿Deseas eliminar este comprobante adjunto?");
    if (!ok) return;

    try {
      const { error: removeError } = await supabase.storage
        .from("comprobantes")
        .remove([tx.comprobante_url]);
      if (removeError) throw removeError;

      const { error: updateError } = await supabase
        .from("transacciones")
        .update({ comprobante_url: null })
        .eq("id", tx.id);
      if (updateError) throw updateError;

      setTxs((prev) =>
        prev.map((item) => (item.id === tx.id ? { ...item, comprobante_url: null } : item)),
      );

      toast.success("Comprobante eliminado");
      await loadTransactions();
    } catch (error) {
      console.error("Error al eliminar comprobante:", error);
      toast.error("No se pudo eliminar el comprobante");
    }
  };

  const onAprobar = async (tx: Tx) => {
    setWorking(tx.id);
    const mensajeAprobado = "Tu pago ha sido aprobado correctamente.";
    const nuevoEstado = "COMPLETADO";

    setTxs((prev) =>
      prev.map((item) =>
        item.id === tx.id
          ? { ...item, estado_pago: nuevoEstado, notas_admin: mensajeAprobado }
          : item,
      ),
    );

    try {
      const { error: txErr } = await supabase
        .from("transacciones")
        .update({
          estado_pago: nuevoEstado,
          notas_admin: mensajeAprobado,
        })
        .eq("id", tx.id);
      if (txErr) throw txErr;

      const { error: prodErr } = await supabase
        .from("productos")
        .update({
          es_destacado: true,
          promocionado_hasta: promoEndDate(tx.plan),
          tipo_promocion: tx.plan,
        })
        .eq("id", tx.producto_id);
      if (prodErr) throw prodErr;

      toast.success("¡Publicidad aprobada y activada! 🎉");
      await loadTransactions();
    } catch (error) {
      console.error("Error al aprobar transacción:", error);
      setTxs((prev) =>
        prev.map((item) =>
          item.id === tx.id
            ? { ...item, estado_pago: tx.estado_pago, notas_admin: tx.notas_admin }
            : item,
        ),
      );
      toast.error("Error al aprobar transacción");
    } finally {
      setWorking(null);
    }
  };

  const onRechazar = async (id: string) => {
    const motivo = prompt("Motivo del rechazo (Ej: Comprobante borroso):") ?? "";
    if (motivo.trim() === "") {
      toast.error("Debes indicar un motivo para el rechazo.");
      return;
    }
    setWorking(id);
    const mensajeRechazo = `Tu pago ha sido rechazado. Revisa los detalles de tu pago. Motivo: ${motivo}`;
    const nuevoEstado = "RECHAZADO";

    setTxs((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, estado_pago: nuevoEstado, notas_admin: mensajeRechazo } : item,
      ),
    );

    try {
      const { error } = await supabase
        .from("transacciones")
        .update({ estado_pago: nuevoEstado, notas_admin: mensajeRechazo })
        .eq("id", id);
      if (error) throw error;
      toast.success("Transacción rechazada.");
      await loadTransactions();
    } catch (error) {
      console.error("Error al rechazar transacción:", error);
      setTxs((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, estado_pago: "PENDIENTE", notas_admin: mensajeRechazo }
            : item,
        ),
      );
      toast.error("Error al rechazar transacción");
    } finally {
      setWorking(null);
    }
  };

  const onEliminarTransaccion = async (tx: Tx) => {
    const ok = window.confirm(
      `¿Deseas eliminar del historial la transacción de ${tx.productos?.titulo ?? "este producto"}?`,
    );
    if (!ok) return;

    setWorking(tx.id);
    try {
      const { error } = await supabase.from("transacciones").delete().eq("id", tx.id);
      if (error) throw error;

      setTxs((prev) => prev.filter((item) => item.id !== tx.id));
      toast.success("Transacción eliminada del historial");
    } catch (error) {
      console.error("Error al eliminar transacción:", error);
      toast.error("No se pudo eliminar la transacción");
    } finally {
      setWorking(null);
    }
  };

  const onAprobarProducto = async (productoId: string) => {
    setWorking(productoId);
    try {
      const { error } = await supabase
        .from("productos")
        .update({ estado_moderacion: "aprobado" })
        .eq("id", productoId);

      if (error) throw error;
      toast.success("Producto aprobado");
      await loadProductosPendientes();
    } catch (err) {
      console.error("Error al aprobar producto:", err);
      toast.error("Error al aprobar producto");
    } finally {
      setWorking(null);
    }
  };

  const onRechazarProducto = async (productoId: string, titulo: string) => {
    setShowRechazarModal({ productoId, titulo });
    setRazonSeleccionada("");
    setNotasAdicionales("");
  };

  const confirmarRechazo = async () => {
    if (!razonSeleccionada) {
      toast.error("Debes seleccionar una razón");
      return;
    }

    const productoId = showRechazarModal?.productoId;
    if (!productoId) return;

    setWorking(productoId);
    try {
      const razonCompleta = notasAdicionales
        ? `${razonSeleccionada} - ${notasAdicionales}`
        : razonSeleccionada;
      const { error } = await supabase
        .from("productos")
        .update({ estado_moderacion: "rechazado", razon_rechazo: razonCompleta })
        .eq("id", productoId);

      if (error) throw error;
      toast.success("Producto rechazado");
      setShowRechazarModal(null);
      await loadProductosPendientes();
    } catch (err) {
      console.error("Error al rechazar producto:", err);
      toast.error("Error al rechazar producto");
    } finally {
      setWorking(null);
    }
  };

  const onMarcarReporte = async (reporteId: string, nuevoEstado: "revisado" | "resuelto") => {
    setWorking(reporteId);
    try {
      const { error } = await supabase
        .from("reportes")
        .update({ estado: nuevoEstado })
        .eq("id", reporteId);

      if (error) throw error;
      toast.success(`Reporte marcado como ${nuevoEstado}`);
      await loadReportes();
    } catch (err) {
      console.error("Error al actualizar reporte:", err);
      toast.error("Error al actualizar reporte");
    } finally {
      setWorking(null);
    }
  };

  const onEliminarReporte = async (reporteId: string) => {
    if (!window.confirm("¿Deseas eliminar este reporte?")) return;
    setWorking(reporteId);
    const { error } = await supabase.from("reportes").delete().eq("id", reporteId);
    setWorking(null);
    if (error) {
      toast.error("No se pudo eliminar el reporte");
      return;
    }
    toast.success("Reporte eliminado");
    await loadReportes();
  };

  const onEliminarCompra = async (compraId: string) => {
    if (!window.confirm("¿Deseas eliminar esta compra del historial?")) return;
    setWorking(compraId);
    const { error } = await supabase.rpc("admin_delete_purchase", { _purchase_id: compraId });
    setWorking(null);
    if (error) {
      toast.error("No se pudo eliminar la compra");
      return;
    }
    toast.success("Compra eliminada");
    await loadCompras();
  };

  const onCambiarEstadoTicket = async (ticketId: string, status: "in_progress" | "resolved") => {
    setWorking(ticketId);
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", ticketId);
    setWorking(null);
    if (error) {
      toast.error("No se pudo actualizar el ticket");
      return;
    }
    await loadTicketsSoporte();
    toast.success("Ticket actualizado");
  };

  const onEliminarTicket = async (ticketId: string) => {
    if (!window.confirm("¿Deseas eliminar este ticket de soporte?")) return;
    setWorking(ticketId);
    const { error } = await supabase.from("support_tickets").delete().eq("id", ticketId);
    setWorking(null);
    if (error) {
      toast.error("No se pudo eliminar el ticket");
      return;
    }
    toast.success("Ticket eliminado");
    await loadTicketsSoporte();
  };

  const onResponderTicket = async (ticket: SupportTicket) => {
    const reply = supportReplies[ticket.id]?.trim() ?? "";
    if (reply.length < 2) {
      toast.error("Escribe una respuesta antes de enviarla");
      return;
    }

    setWorking(ticket.id);
    const { data, error } = await supabase.functions.invoke("reply-support-ticket", {
      body: { ticket_id: ticket.id, reply },
    });
    setWorking(null);
    if (error || data?.error) {
      const functionError = error as typeof error & { context?: Response };
      const responseBody = functionError?.context
        ? await functionError.context.clone().json().catch(() => null)
        : null;
      toast.error(
        data?.error ??
          responseBody?.error ??
          error?.message ??
          "No se pudo enviar la respuesta",
      );
      return;
    }
    setSupportReplies((current) => ({ ...current, [ticket.id]: "" }));
    await loadTicketsSoporte();
    toast.success("Respuesta enviada al usuario");
  };

  const onOcultarResena = async (resenaId: string) => {
    setWorking(resenaId);
    try {
      const { error } = await supabase
        .from("resenas_vendedores")
        .update({ estado: "oculto" })
        .eq("id", resenaId);

      if (error) throw error;
      toast.success("Reseña ocultada");
      await loadReseniasReportadas();
    } catch (err) {
      console.error("Error al ocultarreseña:", err);
      toast.error("Error al ocultar reseña");
    } finally {
      setWorking(null);
    }
  };

  const onEliminarProducto = async (productoId: string, titulo: string) => {
    const ok = window.confirm(`¿Deseas eliminar permanentemente la publicación "${titulo}"?`);
    if (!ok) return;

    setWorking(productoId);
    try {
      const { error } = await supabase.from("productos").delete().eq("id", productoId);
      if (error) throw error;
      toast.success("Producto eliminado");
      await loadProductosPendientes();
    } catch (err) {
      console.error("Error al eliminar producto:", err);
      toast.error("No se pudo eliminar el producto");
    } finally {
      setWorking(null);
    }
  };

  const onEliminarResena = async (resenaId: string) => {
    const ok = window.confirm("¿Deseas eliminar esta reseña?");
    if (!ok) return;

    setWorking(resenaId);
    try {
      const { error } = await supabase.from("resenas_vendedores").delete().eq("id", resenaId);
      if (error) throw error;
      toast.success("Reseña eliminada");
      await loadReseniasReportadas();
    } catch (err) {
      console.error("Error al eliminar reseña:", err);
      toast.error("No se pudo eliminar la reseña");
    } finally {
      setWorking(null);
    }
  };

  const onToggleUsuarioBloqueado = async (
    usuarioId: string,
    nombre: string,
    estadoActual: boolean,
  ) => {
    const accion = estadoActual ? "desbloquear" : "bloquear";
    const mensaje = `¿Deseas ${accion} al usuario ${nombre || "seleccionado"}?`;
    const ok = window.confirm(mensaje);
    if (!ok) return;

    const motivo = prompt(
      estadoActual ? "Motivo del desbloqueo (opcional):" : "Motivo del bloqueo:",
      estadoActual ? "" : "Incumplimiento de políticas",
    );

    if (!estadoActual && (!motivo || motivo.trim() === "")) {
      toast.error("Debes indicar un motivo para bloquear al usuario");
      return;
    }

    setWorking(usuarioId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_blocked: !estadoActual,
          motivo_bloqueo: estadoActual ? null : motivo?.trim() || "Incumplimiento de políticas",
        })
        .eq("id", usuarioId);

      if (error) throw error;
      toast.success(estadoActual ? "Usuario desbloqueado" : "Usuario bloqueado");
      await loadUsuarios();
    } catch (err) {
      console.error("Error al bloquear/desbloquear usuario:", err);
      const message = err instanceof Error ? err.message : "";
      if (message.includes("column") && message.includes("does not exist")) {
        toast.error(
          "La base de datos no tiene aún los campos de bloqueo. Ejecuta la migración de usuarios bloqueados.",
        );
      } else {
        toast.error("No se pudo actualizar el estado del usuario");
      }
    } finally {
      setWorking(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-md py-20 text-center">
          <Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="text-xl font-bold">Acceso denegado</h1>
        </div>
      </div>
    );
  }

  const pendientes = txs.filter(
    (t) => isPendingState(t.estado_pago) && !isHistoryState(t.estado_pago),
  );
  const otras = txs.filter((t) => !isPendingState(t.estado_pago) || isHistoryState(t.estado_pago));

  const reportesPendientes = reportes.filter((r) => r.estado === "pendiente");
  const reportesResueltos = reportes.filter((r) => r.estado !== "pendiente");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Panel de administración</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="transacciones" className="w-full">
            <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl p-1">
              <TabsTrigger className="min-h-11 shrink-0 px-4 text-sm sm:min-h-9" value="transacciones">
                Transacciones ({pendientes.length})
              </TabsTrigger>
              <TabsTrigger className="min-h-11 shrink-0 px-4 text-sm sm:min-h-9" value="compras">
                Compras ({compras.filter((c) => c.estado === "PENDIENTE").length})
              </TabsTrigger>
              <TabsTrigger className="min-h-11 shrink-0 px-4 text-sm sm:min-h-9" value="moderacion">
                Productos ({productosPendientes.length})
              </TabsTrigger>
              <TabsTrigger className="min-h-11 shrink-0 px-4 text-sm sm:min-h-9" value="reportes">
                Reportes ({reportesPendientes.length})
              </TabsTrigger>
              <TabsTrigger className="min-h-11 shrink-0 px-4 text-sm sm:min-h-9" value="resenias">
                Reseñas ({reseniasReportadas.length})
              </TabsTrigger>
              <TabsTrigger className="min-h-11 shrink-0 px-4 text-sm sm:min-h-9" value="usuarios">
                Usuarios ({usuarios.filter((u) => u.is_blocked).length})
              </TabsTrigger>
              <TabsTrigger className="min-h-11 shrink-0 px-4 text-sm sm:min-h-9" value="soporte">
                Soporte ({ticketsSoporte.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compras" className="space-y-4">
              {compras.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  Sin solicitudes de compra
                </p>
              ) : (
                compras.map((compra) => (
                  <Card key={compra.id}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            compra.estado === "CONFIRMADA"
                              ? "default"
                              : compra.estado === "CANCELADA"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {compra.estado}
                        </Badge>
                        <span className="font-semibold">
                          {compra.productos?.titulo ?? "Producto"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Comprador: {compra.comprador_id} · Vendedor: {compra.vendedor_id}
                      </p>
                      {compra.estado === "PENDIENTE" && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <Button
                            size="sm"
                            disabled={working === compra.id}
                            onClick={() => updateCompra(compra, "CONFIRMADA")}
                          >
                            <ShieldCheck className="mr-1 h-4 w-4" /> Confirmar compra
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={working === compra.id}
                            onClick={() => updateCompra(compra, "CANCELADA")}
                          >
                            <ShieldX className="mr-1 h-4 w-4" /> Cancelar
                          </Button>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={working === compra.id}
                        onClick={() => void onEliminarCompra(compra.id)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Eliminar historial
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* TRANSACCIONES TAB */}
            <TabsContent value="transacciones" className="space-y-4">
              <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                Pendientes ({pendientes.length})
              </h2>
              <div className="space-y-3">
                {pendientes.length === 0 && (
                  <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                    Sin pagos pendientes 🎉
                  </p>
                )}
                {pendientes.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{t.plan}</Badge>
                        <span className="font-bold">${Number(t.monto).toFixed(2)}</span>
                        <span className="text-sm">— {t.productos?.titulo ?? "?"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.profiles?.nombre_completo ?? "Usuario"} ·{" "}
                        {new Date(t.created_at).toLocaleString()}
                        {t.referencia && <> · Ref: {t.referencia}</>}
                      </p>
                      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                        {t.comprobante_url && (
                          <>
                            <Button
                              className="w-full sm:w-auto"
                              size="sm"
                              className="w-full sm:w-auto"
                              variant="outline"
                              onClick={() => verComprobante(t.comprobante_url!)}
                            >
                              <Eye className="mr-1 h-4 w-4" /> Ver comprobante
                            </Button>
                            <Button
                              className="w-full sm:w-auto"
                              size="sm"
                              className="w-full sm:w-auto"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => onEliminarComprobante(t)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" /> Eliminar
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          className="w-full bg-success text-success-foreground hover:bg-success/90 sm:w-auto"
                          disabled={working === t.id}
                          onClick={() => onAprobar(t)}
                        >
                          {working === t.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ShieldCheck className="mr-1 h-4 w-4" /> Aprobar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          variant="destructive"
                          disabled={working === t.id}
                          onClick={() => onRechazar(t.id)}
                        >
                          <ShieldX className="mr-1 h-4 w-4" /> Rechazar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <h2 className="mb-2 mt-8 text-sm font-semibold uppercase text-muted-foreground">
                Historial ({otras.length})
              </h2>
              <div className="space-y-2">
                {otras.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="flex flex-col gap-1 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={t.estado_pago === "COMPLETADO" ? "default" : "destructive"}>
                          {t.estado_pago}
                        </Badge>
                        <Badge variant="outline">{t.plan}</Badge>
                        <span className="font-bold">${Number(t.monto).toFixed(2)}</span>
                        <span className="text-muted-foreground">
                          — {t.productos?.titulo ?? "?"} · {t.profiles?.nombre_completo ?? ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Fecha y hora: {new Date(t.created_at).toLocaleString()}
                      </p>
                      {t.notas_admin && (
                        <p className="mt-1 rounded bg-muted/50 px-2 py-1 text-xs italic text-muted-foreground">
                          {t.notas_admin}
                        </p>
                      )}
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={working === t.id}
                          onClick={() => onEliminarTransaccion(t)}
                        >
                          {working === t.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="mr-1 h-4 w-4" /> Eliminar
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* MODERACIÓN TAB */}
            <TabsContent value="moderacion" className="space-y-4">
              {productosPendientes.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  Sin productos pendientes de moderación 🎉
                </p>
              ) : (
                <div className="space-y-3">
                  {productosPendientes.map((p) => (
                    <ProductoModerationCard
                      key={p.id}
                      producto={p}
                      working={working === p.id}
                      onAprobar={() => onAprobarProducto(p.id)}
                      onRechazar={() => onRechazarProducto(p.id, p.titulo)}
                      onEliminar={() => onEliminarProducto(p.id, p.titulo)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* REPORTES TAB */}
            <TabsContent value="reportes" className="space-y-4">
              <div className="mb-4 flex gap-2">
                <Badge>{reportesPendientes.length} pendientes</Badge>
                <Badge variant="outline">{reportesResueltos.length} resueltos</Badge>
              </div>

              {reportes.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  Sin reportes 🎉
                </p>
              ) : (
                <div className="space-y-3">
                  {reportes.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Flag className="h-4 w-4 text-destructive" />
                          <Badge variant={r.estado === "pendiente" ? "destructive" : "outline"}>
                            {r.estado}
                          </Badge>
                          <Badge variant="secondary">{r.tipo}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">
                          <span className="font-semibold">Razón:</span>{" "}
                          {reportReasons[r.razon as keyof typeof reportReasons] || r.razon}
                        </p>
                        {r.descripcion && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Detalles:</span> {r.descripcion}
                          </p>
                        )}
                        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                          {r.estado === "pendiente" && (
                            <>
                              <Button
                                className="w-full sm:w-auto"
                                size="sm"
                                variant="outline"
                                disabled={working === r.id}
                                onClick={() => onMarcarReporte(r.id, "revisado")}
                              >
                                {working === r.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>Marcar revisado</>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-success text-success-foreground hover:bg-success/90"
                                disabled={working === r.id}
                                onClick={() => onMarcarReporte(r.id, "resuelto")}
                              >
                                {working === r.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>Marcar resuelto</>
                                )}
                              </Button>
                            </>
                          )}
                          <Button
                            className="w-full sm:w-auto"
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={working === r.id}
                            onClick={() => void onEliminarReporte(r.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" /> Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* RESEÑAS REPORTADAS TAB */}
            <TabsContent value="resenias" className="space-y-4">
              {reseniasReportadas.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  Sin reseñas reportadas 🎉
                </p>
              ) : (
                <div className="space-y-3">
                  {reseniasReportadas.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < r.calificacion
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <Badge variant="outline">{r.estado}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>
                        {r.comentario && <p className="text-sm italic">{r.comentario}</p>}
                        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                          <Button
                            className="w-full sm:w-auto"
                            size="sm"
                            variant="destructive"
                            disabled={working === r.id}
                            onClick={() => onOcultarResena(r.id)}
                          >
                            {working === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>Ocultar reseña</>
                            )}
                          </Button>
                          <Button
                            className="w-full sm:w-auto"
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={working === r.id}
                            onClick={() => onEliminarResena(r.id)}
                          >
                            {working === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>Eliminar</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="soporte" className="space-y-4">
              {ticketsSoporte.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  No hay solicitudes de soporte.
                </p>
              ) : (
                ticketsSoporte.map((ticket) => (
                  <Card key={ticket.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={ticket.status === "resolved" ? "default" : "outline"}>
                          {ticket.status}
                        </Badge>
                        <span className="font-semibold">
                          Ticket #{ticket.ticket_number ?? "N/A"}: {ticket.subject}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ticket.name} · {ticket.email} · {ticket.category}
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
                      {ticket.response_text && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                          <p className="font-semibold">Respuesta enviada</p>
                          <p className="mt-1 whitespace-pre-wrap">{ticket.response_text}</p>
                        </div>
                      )}
                      <Textarea
                        value={supportReplies[ticket.id] ?? ""}
                        onChange={(event) =>
                          setSupportReplies((current) => ({
                            ...current,
                            [ticket.id]: event.target.value,
                          }))
                        }
                        placeholder="Escribe una respuesta para el usuario..."
                        maxLength={5000}
                        rows={3}
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          className="w-full sm:w-auto"
                          size="sm"
                          disabled={working === ticket.id}
                          onClick={() => void onResponderTicket(ticket)}
                        >
                          Enviar respuesta
                        </Button>
                        {ticket.status === "open" && (
                          <Button
                            className="w-full sm:w-auto"
                            size="sm"
                            variant="outline"
                            disabled={working === ticket.id}
                            onClick={() => void onCambiarEstadoTicket(ticket.id, "in_progress")}
                          >
                            Marcar en proceso
                          </Button>
                        )}
                        {ticket.status !== "resolved" && (
                          <Button
                            className="w-full sm:w-auto"
                            size="sm"
                            onClick={() => void onCambiarEstadoTicket(ticket.id, "resolved")}
                          >
                            Marcar resuelto
                          </Button>
                        )}
                        <Button
                          className="w-full sm:w-auto"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          disabled={working === ticket.id}
                          onClick={() => void onEliminarTicket(ticket.id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* USUARIOS TAB */}
            <TabsContent value="usuarios" className="space-y-4">
              {usuarios.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  Sin usuarios registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {usuarios.map((u) => (
                    <Card key={u.id}>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={u.is_blocked ? "destructive" : "outline"}>
                            {u.is_blocked ? "Bloqueado" : "Activo"}
                          </Badge>
                          <span className="font-bold">
                            {u.nombre_completo || "Usuario sin nombre"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {u.ciudad || "Sin ciudad"}
                          </span>
                        </div>
                        {u.motivo_bloqueo && (
                          <p className="text-sm text-muted-foreground">
                            Motivo: {u.motivo_bloqueo}
                          </p>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant={u.is_blocked ? "secondary" : "destructive"}
                            disabled={working === u.id}
                            onClick={() =>
                              onToggleUsuarioBloqueado(
                                u.id,
                                u.nombre_completo || "Usuario",
                                u.is_blocked,
                              )
                            }
                          >
                            {working === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : u.is_blocked ? (
                              "Desbloquear"
                            ) : (
                              "Bloquear"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Modal de Rechazo */}
        {showRechazarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Rechazar Producto: {showRechazarModal.titulo}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Razón del rechazo *</Label>
                  <Select value={razonSeleccionada} onValueChange={setRazonSeleccionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una razón..." />
                    </SelectTrigger>
                    <SelectContent>
                      {razonesPolitica.map((r) => (
                        <SelectItem key={r.categoria} value={r.categoria}>
                          {r.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notas adicionales (opcional)</Label>
                  <Textarea
                    placeholder="Agrega comentarios adicionales si lo deseas..."
                    value={notasAdicionales}
                    onChange={(e) => setNotasAdicionales(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowRechazarModal(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={!razonSeleccionada || working === showRechazarModal.productoId}
                    onClick={confirmarRechazo}
                  >
                    {working === showRechazarModal.productoId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Rechazar Producto"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
