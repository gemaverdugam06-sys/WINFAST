import { createFileRoute } from "@tanstack/react-router";
import { Bell, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { usePurchaseNotifications } from "@/hooks/use-purchase-notifications";

export const Route = createFileRoute("/_authenticated/notificaciones")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { historyNotifications, deleteNotification, getNotificationMessage } =
    usePurchaseNotifications();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Historial de notificaciones</h1>
            <p className="text-sm text-muted-foreground">
              Aquí puedes revisar y eliminar las notificaciones de tu cuenta.
            </p>
          </div>
        </div>

        {historyNotifications.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
            No tienes notificaciones en el historial.
          </div>
        ) : (
          <div className="divide-y rounded-lg border bg-card">
            {historyNotifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{getNotificationMessage(notification)}</p>
                  {notification.created_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString("es-EC")}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Eliminar notificación"
                  title="Eliminar notificación"
                  onClick={() => void deleteNotification(notification.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
