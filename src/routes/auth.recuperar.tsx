import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/error-messages";

export const Route = createFileRoute("/auth/recuperar")({
  head: () => ({
    meta: [{ title: "Recuperar contraseña — WINFAST" }, { name: "robots", content: "noindex" }],
  }),
  component: RecuperarPage,
});

function RecuperarPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/nueva-contrasena`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) {
      const status = "status" in error ? Number(error.status) : 0;
      const fallback =
        status >= 500 || String(error.message ?? "") === "{}"
          ? "Supabase no pudo enviar el correo. Verifica el proveedor de correo de Supabase y que esta URL de Vercel esté permitida en Authentication > URL Configuration."
          : "No se pudo enviar el enlace de recuperación.";
      toast.error(
        status >= 500 || String(error.message ?? "") === "{}"
          ? fallback
          : toUserMessage(error, fallback),
      );
      return;
    }
    setSent(true);
    toast.success(t("reset_email_sent"));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(145deg,#eaf1df_0%,#f5f7f1_48%,#e7f0e7_100%)] p-4 text-[#20362a]">
      <Card className="w-full max-w-md overflow-hidden rounded-xl border border-[#d8e3d5] bg-white shadow-[0_18px_60px_rgba(25,70,48,0.12)]">
        <CardHeader className="space-y-4 border-b border-[#d6e2d4] bg-gradient-primary px-8 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg">
            <Logo className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">{t("forgot_password")}</CardTitle>
          <CardDescription className="text-sm text-white/85">
            {t("forgot_password_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 py-8">
          {sent ? (
            <div className="space-y-4 text-center text-sm text-[#4b6252]">
              <p>{t("reset_email_sent")}</p>
              <p>{t("check_spam")}</p>
              <Button
                variant="outline"
                className="w-full rounded-lg border-[#cbd8c9] bg-white text-[#244635] hover:bg-[#edf3e8]"
                onClick={() => nav({ to: "/auth" })}
              >
                {t("back_to_sign_in")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email-reset">{t("email")}</Label>
                <Input
                  id="email-reset"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="border-[#cbd8c9] bg-white text-[#1a2d24] placeholder:text-[#77877a] focus-visible:ring-2 focus-visible:ring-[#588d57]"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg border-0 bg-gradient-primary text-white shadow-sm hover:brightness-95"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("send_reset_link")}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-xs text-[#647267]">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1 rounded-sm text-[#315b43] underline-offset-4 hover:text-[#a0442f] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195e48]"
            >
              <ArrowLeft className="h-3 w-3" /> {t("back_to_sign_in")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
