import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type PurchaseNotification = {
  id: string;
  compra_id: string | null;
  mensaje: string;
  tipo: string;
  leido: boolean | null;
  created_at: string | null;
};

export function usePurchaseNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PurchaseNotification[]>([]);
  const [historyNotifications, setHistoryNotifications] = useState<PurchaseNotification[]>([]);

  const refresh = async () => {
    if (!user) {
      setNotifications([]);
      setHistoryNotifications([]);
      return;
    }

    const { data: rows } = await supabase
      .from("notificaciones")
      .select("id, compra_id, mensaje, tipo, leido, created_at")
      .eq("user_id", user.id)
      .in("tipo", [
        "compra_solicitada",
        "compra_actualizada",
        "promocion_aprobada",
        "promocion_rechazada",
      ])
      .order("created_at", { ascending: false })
      .limit(50);

    const notificationsRows = (rows as PurchaseNotification[]) ?? [];
    const compraIds = [
      ...new Set(notificationsRows.map((item) => item.compra_id).filter(Boolean)),
    ] as string[];

    const purchaseStateById = new Map<string, string>();
    if (compraIds.length > 0) {
      const { data: compras } = await supabase
        .from("compras")
        .select("id, estado")
        .in("id", compraIds);

      for (const compra of compras ?? []) {
        purchaseStateById.set(compra.id, compra.estado);
      }
    }

    const active: PurchaseNotification[] = [];
    const history: PurchaseNotification[] = [];

    for (const item of notificationsRows) {
      if (item.tipo === "promocion_aprobada" || item.tipo === "promocion_rechazada") {
        (item.leido ? history : active).push(item);
        continue;
      }

      if (!item.compra_id) {
        active.push(item);
        continue;
      }

      const compraEstado = purchaseStateById.get(item.compra_id);
      if (!compraEstado || compraEstado === "PENDIENTE") {
        active.push(item);
      } else {
        history.push(item);
      }
    }

    setNotifications(active);
    setHistoryNotifications(history);
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setHistoryNotifications([]);
      return;
    }

    let active = true;

    const load = async () => {
      if (!active) return;
      await refresh();
    };

    void load();
    const channel = supabase
      .channel(`purchase-notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
          filter: `user_id=eq.${user.id}`,
        },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const decidePurchase = async (
    notification: PurchaseNotification,
    estado: "CONFIRMADA" | "CANCELADA",
  ) => {
    if (!notification.compra_id) return;
    const { error } = await supabase
      .from("compras")
      .update({ estado, confirmed_at: estado === "CONFIRMADA" ? new Date().toISOString() : null })
      .eq("id", notification.compra_id);

    if (error) {
      toast.error("No se pudo actualizar la solicitud");
      return;
    }

    await supabase.from("notificaciones").update({ leido: true }).eq("id", notification.id);
    await refresh();
    toast.success(estado === "CONFIRMADA" ? "Compra aceptada" : "Solicitud rechazada");
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from("notificaciones")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user?.id ?? "");

    if (error) {
      toast.error("No se pudo eliminar la notificación");
      return;
    }

    await refresh();
    toast.success("Notificación eliminada");
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("notificaciones")
      .update({ leido: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("No se pudo marcar la notificación como leída");
      return;
    }

    await refresh();
  };

  return { notifications, historyNotifications, decidePurchase, deleteNotification, markAsRead };
}
