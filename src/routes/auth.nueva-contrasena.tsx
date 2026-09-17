import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/error-messages";
import { validateStrongPassword } from "@/lib/auth-utils";

export const Route = createFileRoute("/auth/nueva-contrasena")({
  head: () => ({
    meta: [{ title: "Nueva contraseña — WINFAST" }, { name: "robots", content: "noindex" }],
  }),
  component: NuevaContrasenaPage,
});

function NuevaContrasenaPage() {
  const { t } = useI18n();
  const { session, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY" || s) setReady(true);
    });

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (active && (sessionData.session || session)) setReady(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [session]);

  useEffect(() => {
    if (!authLoading && !session && !ready) {
      toast.error(t("reset_link_expired"));
    }
  }, [authLoading, session, ready, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordError = validateStrongPassword(password);
    if (passwordError) return toast.error(passwordError);
    if (password !== confirm) return toast.error(t("passwords_mismatch"));

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(toUserMessage(error, "No se pudo actualizar la contraseña."));
    toast.success(t("password_updated"));
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">{t("new_password")}</CardTitle>
          <CardDescription>{t("new_password_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!ready && !session ? (
            <div className="space-y-3 text-center text-sm">
              <p className="text-muted-foreground">{t("reset_link_expired")}</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth/recuperar">{t("send_reset_link")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="pwd-new">{t("new_password")}</Label>
                <Input
                  id="pwd-new"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pwd-confirm">{t("confirm_password")}</Label>
                <Input
                  id="pwd-confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save_password")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
