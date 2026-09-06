import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  Plus,
  MessageCircle,
  User,
  LogOut,
  Globe,
  ShieldCheck,
  Bell,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useUnreadChats } from "@/hooks/use-unread";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { usePurchaseNotifications } from "@/hooks/use-purchase-notifications";

export function Header() {
  const { user, signOut, isAdmin, roleLoading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const { total: unread } = useUnreadChats();
  const { pendingProducts, pendingReports, pendingSupportTickets } = useAdminNotifications();
  const pendingAdminNotifications = pendingProducts + pendingReports + pendingSupportTickets;
  const {
    notifications: purchaseNotifications,
    historyNotifications,
    decidePurchase,
    deleteNotification,
  } = usePurchaseNotifications();

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="sticky top-0 z-40 border-b bg-background/60 backdrop-blur-lg glass"
    >
      <div className="container mx-auto flex h-16 items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <Logo className="h-9 w-9 drop-shadow-sm" />
          <span className="text-[1.9rem] font-black leading-none tracking-[-0.06em] text-slate-950">
            WINFAST
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "es" ? "en" : "es")}>
            <Globe className="h-4 w-4" />
            <span className="ml-1 text-xs font-semibold uppercase">{lang}</span>
          </Button>

          {user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={t("chats")}
              >
                <Link to="/chats">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              </Button>

              {(purchaseNotifications.length > 0 || historyNotifications.length > 0) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      aria-label="Solicitudes de compra"
                    >
                      <ShoppingBag className="h-5 w-5" />
                      {purchaseNotifications.length > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                          {purchaseNotifications.length}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    {purchaseNotifications.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Pendientes
                        </div>
                        {purchaseNotifications.map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className="flex-col items-stretch gap-2"
                          >
                            <span className="text-sm">{notification.mensaje}</span>
                            {notification.tipo === "compra_solicitada" && (
                              <span className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => void decidePurchase(notification, "CONFIRMADA")}
                                >
                                  Aceptar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void decidePurchase(notification, "CANCELADA")}
                                >
                                  Rechazar
                                </Button>
                              </span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}

                    {historyNotifications.length > 0 && (
                      <>
                        {purchaseNotifications.length > 0 && <DropdownMenuSeparator />}
                        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Historial
                        </div>
                        {historyNotifications.map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className="cursor-default items-start gap-2 focus:bg-transparent focus:text-current"
                          >
                            <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                              {notification.mensaje}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              aria-label="Eliminar notificación"
                              title="Eliminar notificación"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void deleteNotification(notification.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate({ to: "/notificaciones" })}>
                          Ver historial completo
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {!roleLoading && isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label="Notificaciones de administración"
                  onClick={() => navigate({ to: "/admin" })}
                >
                  <ShieldCheck className="h-5 w-5" />
                  {pendingAdminNotifications > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {pendingAdminNotifications > 99 ? "99+" : pendingAdminNotifications}
                    </span>
                  )}
                </Button>
              )}

              <motion.div whileHover={{ scale: 1.02 }} className="will-change-transform">
                <Button asChild className="btn-cta hover:opacity-95">
                  <Link to="/publicar">
                    <Plus className="h-4 w-4" />{" "}
                    <span className="hidden sm:inline ml-1">{t("publish")}</span>
                  </Link>
                </Button>
              </motion.div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t("profile")}>
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => navigate({ to: "/mis-publicaciones" })}>
                    {t("my_listings")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/perfil" })}>
                    {t("profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/soporte" })}>
                    Soporte técnico
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/chats" })}>
                    <MessageCircle className="mr-2 h-4 w-4" /> {t("chats")}
                    {unread > 0 && (
                      <span className="ml-auto rounded-full bg-destructive px-2 text-[10px] font-bold text-destructive-foreground">
                        {unread}
                      </span>
                    )}
                  </DropdownMenuItem>
                  {!roleLoading && isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                        <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Panel Admin
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate({ to: "/" });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> {t("sign_out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <motion.div whileHover={{ scale: 1.02 }} className="will-change-transform">
              <Button asChild className="btn-cta hover:opacity-95">
                <Link to="/auth">{t("sign_in")}</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
