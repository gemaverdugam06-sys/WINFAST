import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/error-messages";
import { validateStrongPassword } from "@/lib/auth-utils";
import { hasPasswordRecoveryCallback } from "@/lib/password-recovery";

export const Route = createFileRoute("/auth/nueva-contrasena")({
  head: () => ({
    meta: [{ title: "Nueva contraseña — WINFAST" }, { name: "robots", content: "noindex" }],
  }),
  component: NuevaContrasenaPage,
});

function NuevaContrasenaPage() {
  const { t } = useI18n();
  const { session, isPasswordRecovery, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(
    () => isPasswordRecovery || hasPasswordRecoveryCallback(window.location.href),
  );

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    void supabase.auth.getSession().then(() => {
      if (active && (isPasswordRecovery || hasPasswordRecoveryCallback(window.location.href))) {
        setReady(true);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [isPasswordRecovery]);

  useEffect(() => {
    if (isPasswordRecovery) setReady(true);
  }, [isPasswordRecovery]);

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
    nav({ to: "/", replace: true });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.35),_transparent_35%),linear-gradient(180deg,_#7c3aed_0%,_#3b82f6_100%)] p-0 text-white sm:p-4">
      <Card className="min-h-screen w-full max-w-lg overflow-hidden rounded-none border border-slate-700/80 bg-slate-950/95 shadow-[0_24px_80px_rgba(124,58,237,0.15)] sm:min-h-0 sm:rounded-[2rem]">
        <CardHeader className="space-y-5 border-b border-slate-700/80 bg-gradient-primary/90 px-5 py-8 text-center sm:px-8 sm:py-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-white shadow-lg shadow-purple-500/20 sm:h-24 sm:w-24">
            <Logo className="h-14 w-14 sm:h-16 sm:w-16" />
          </div>
          <CardTitle className="flex items-center justify-center gap-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            <span>WINFAST</span>
          </CardTitle>
          <CardDescription className="text-sm text-slate-200">
            {t("new_password_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-7 sm:px-8 sm:py-8">
          {!ready && !session ? (
            <div className="space-y-3 text-center text-sm">
              <p className="text-muted-foreground">{t("reset_link_expired")}</p>
              <Button
                asChild
                variant="outline"
                className="w-full rounded-2xl border-slate-600 bg-slate-900 text-white"
              >
                <Link to="/auth/recuperar">{t("send_reset_link")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label htmlFor="pwd-new">{t("new_password")}</Label>
                <div className="relative">
                  <Input
                    id="pwd-new"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 border border-slate-700 bg-slate-950 pr-12 text-base text-white placeholder:text-slate-500 focus:border-primary/70 sm:h-10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-confirm">{t("confirm_password")}</Label>
                <div className="relative">
                  <Input
                    id="pwd-confirm"
                    type={showConfirm ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-12 border border-slate-700 bg-slate-950 pr-12 text-base text-white placeholder:text-slate-500 focus:border-primary/70 sm:h-10"
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowConfirm((value) => !value)}
                    className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-slate-400 hover:text-white"
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl border border-primary/80 bg-gradient-primary/95 text-white shadow-lg shadow-primary/10 hover:bg-gradient-primary"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save_password")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
