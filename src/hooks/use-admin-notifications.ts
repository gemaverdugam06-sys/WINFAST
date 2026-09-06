import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type ModerationRow = {
  id: string;
  estado_moderacion?: string | null;
};

export function useAdminNotifications() {
  const { user, isAdmin, roleLoading } = useAuth();
  const userId = user?.id;
  const [pendingProducts, setPendingProducts] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingSupportTickets, setPendingSupportTickets] = useState(0);

  useEffect(() => {
    if (!userId || roleLoading || !isAdmin) {
      setPendingProducts(0);
      setPendingReports(0);
      setPendingSupportTickets(0);
      return;
    }

    let active = true;

    const loadAdminNotifications = async () => {
      const [productsResult, reportsResult, ticketsResult] = await Promise.all([
        supabase.from("productos").select("id, estado_moderacion"),
        supabase.from("reportes").select("id").eq("estado", "pendiente"),
        supabase.from("support_tickets").select("id").in("status", ["open", "in_progress"]),
      ]);

      if (!active || productsResult.error || reportsResult.error || ticketsResult.error) {
        return;
      }

      const pending = ((productsResult.data as unknown as ModerationRow[]) ?? []).filter(
        (product) => product.estado_moderacion === "pendiente",
      ).length;
      setPendingProducts(pending);
      setPendingReports(reportsResult.data?.length ?? 0);
      setPendingSupportTickets(ticketsResult.data?.length ?? 0);
    };

    void loadAdminNotifications();
    const interval = window.setInterval(loadAdminNotifications, 30_000);
    const channel = supabase
      .channel(`admin-notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "productos" },
        loadAdminNotifications,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reportes" },
        loadAdminNotifications,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        loadAdminNotifications,
      );
    void channel.subscribe();

    return () => {
      active = false;
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [userId, isAdmin, roleLoading]);

  return { pendingProducts, pendingReports, pendingSupportTickets };
}
