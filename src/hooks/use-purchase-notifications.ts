import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

type PurchaseNotification = {
  id: string;
  compra_id: string | null;
  mensaje: string;
  tipo: string;
  leido: boolean | null;
  created_at: string | null;
  datos: Record<string, unknown> | null;
};

export function usePurchaseNotifications() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<PurchaseNotification[]>([]);
  const [historyNotifications, setHistoryNotifications] = useState<PurchaseNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setHistoryNotifications([]);
      return;
    }

    const { data: rows } = await supabase
      .from("notificaciones")
      .select("id, compra_id, mensaje, tipo, leido, created_at, datos")
      .eq("user_id", user.id)
      .in("tipo", [
        "compra_solicitada",
        "compra_actualizada",
        "promocion_aprobada",
        "promocion_rechazada",
        "publicidad_aprobada",
        "publicidad_rechazada",
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
      if (
        item.tipo === "promocion_aprobada" ||
        item.tipo === "promocion_rechazada" ||
        item.tipo === "publicidad_aprobada" ||
        item.tipo === "publicidad_rechazada"
      ) {
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
  }, [user]);

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
  }, [refresh, user]);

  const decidePurchase = async (
    notification: PurchaseNotification | string,
    estado: "CONFIRMADA" | "CANCELADA",
  ): Promise<boolean> => {
    const purchaseId = typeof notification === "string" ? notification : notification.compra_id;
    if (!purchaseId || !user) return false;

    const { error } = await supabase
      .from("compras")
      .update({ estado, confirmed_at: estado === "CONFIRMADA" ? new Date().toISOString() : null })
      .eq("id", purchaseId);

    if (error) {
      toast.error("No se pudo actualizar la solicitud");
      return false;
    }

    let notificationUpdate = supabase
      .from("notificaciones")
      .update({ leido: true })
      .eq("compra_id", purchaseId)
      .eq("user_id", user.id);

    if (typeof notification !== "string") {
      notificationUpdate = notificationUpdate.eq("id", notification.id);
    } else {
      notificationUpdate = notificationUpdate.eq("tipo", "compra_solicitada");
    }

    await notificationUpdate;
    await refresh();
    toast.success(estado === "CONFIRMADA" ? "Compra aceptada" : "Solicitud rechazada");
    return true;
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

  const getNotificationMessage = (notification: PurchaseNotification) => {
    const details = notification.datos ?? {};
    const title = typeof details.producto_titulo === "string" ? details.producto_titulo : undefined;
    const reason = typeof details.motivo === "string" ? details.motivo : undefined;
    const placement = typeof details.ubicacion === "string" ? details.ubicacion : undefined;

    if (notification.tipo === "promocion_aprobada" && title) {
      return `${t("notification_promotion_approved_prefix")} «${title}» ${t(
        "notification_promotion_approved_suffix",
      )}`;
    }
    if (notification.tipo === "promocion_rechazada" && title) {
      return `${t("notification_promotion_rejected_prefix")} «${title}». ${t(
        "notification_reason_prefix",
      )} ${reason || t("notification_unspecified_reason")}`;
    }
    if (notification.tipo === "publicidad_aprobada") {
      const adKey = placement ? (`advertising_slot_${placement}` as const) : null;
      const adLabel = adKey ? `: ${t(adKey)}` : "";
      return `${t("notification_advertising_approved")}${adLabel}`;
    }
    if (notification.tipo === "publicidad_rechazada") {
      const adKey = placement ? (`advertising_slot_${placement}` as const) : null;
      const adLabel = adKey ? `: ${t(adKey)}` : "";
      const reasonSuffix = reason ? `. ${t("notification_reason_prefix")} ${reason}` : "";
      return `${t("notification_advertising_rejected")}${adLabel}${reasonSuffix}`;
    }
    return notification.mensaje;
  };

  return {
    notifications,
    historyNotifications,
    decidePurchase,
    deleteNotification,
    markAsRead,
    getNotificationMessage,
  };
}
