import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  isUserVerified,
  linkPhoneToAccount,
  sendPhoneOtp,
  toE164Phone,
  verifyPhoneOtp,
  validateStrongPassword,
} from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OtpInput } from "@/components/auth/OtpInput";
import { ShoppingBag, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/error-messages";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Iniciar sesión — WINFAST" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const [emailTab, setEmailTab] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneRaw, setPhoneRaw] = useState("");

  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [phoneStep, setPhoneStep] = useState<"input" | "otp">("input");
  const [otp, setOtp] = useState("");
  const [phoneSignupName, setPhoneSignupName] = useState("");

  const [loading, setLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [signupEmail, setSignupEmail] = useState<string>("");
  const [signupPendingVerification, setSignupPendingVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const runWithLoadingGuard = async <T,>(work: () => Promise<T>): Promise<T | undefined> => {
    setLoading(true);
    const timeoutId =
      typeof window !== "undefined" ? window.setTimeout(() => setLoading(false), 10000) : undefined;

    try {
      return await work();
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (isUserVerified(user)) nav({ to: "/", replace: true });
      else nav({ to: "/auth/verificar-telefono", replace: true });
    }
  }, [user, nav]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const tmr = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(tmr);
  }, [cooldown]);

  const resendVerificationEmail = async () => {
    if (!signupEmail) {
      const message = "No hay un correo para reenviar.";
      setSignupMessage(message);
      return toast.error(message);
    }

    if (cooldown > 0) {
      const message = `Espera ${cooldown} segundos antes de reenviar el correo.`;
      setSignupMessage(message);
      return toast.error(message);
    }

    setResendLoading(true);

    try {
      const resendFn = (supabase.auth as typeof supabase.auth & { resend?: (options: { type: "signup"; email: string }) => Promise<{ error?: { message?: string } | null }> }).resend;
      if (!resendFn) {
        const message = "El proveedor de autenticación no soporta el reenvío del correo de verificación.";
        setSignupMessage(message);
        throw new Error(message);
      }

      const { error } = await resendFn({ type: "signup", email: signupEmail });
      if (error) {
        const message = toUserMessage(error, "No se pudo reenviar el correo de verificación.");
        setSignupMessage(message);
        toast.error(message);
        return;
      }

      setCooldown(60);
      setSignupMessage(t("signup_check_email"));
      toast.success(t("signup_email_resent"));
    } catch (error) {
      console.error("Error al reenviar correo de verificación:", error);
      const message = toUserMessage(error, "No se pudo reenviar el correo de verificación.");
      setSignupMessage(message);
      toast.error(message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    await runWithLoadingGuard(async () => {
      try {
        const rateLimitResult = await checkRateLimit({
          key: `signin:${email}`,
          limit: 5,
          window: 60 * 15,
        });

        if (!rateLimitResult.success) {
          const seconds = Math.ceil((rateLimitResult.resetIn || 0) / 1000);
          const minutes = Math.ceil(seconds / 60);
          toast.error(`Demasiados intentos. Intenta en ${minutes} minuto(s).`);
          return;
        }

        if (password.length < 8) {
          toast.error(t("password_min_8"));
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          toast.error(toUserMessage(error, "No se pudo iniciar sesión."));
          return;
        }

        toast.success(t("welcome_back"));
      } catch (error) {
        console.error("Error al iniciar sesión:", error);
        toast.error("No se pudo iniciar sesión. Revisa tu conexión e inténtalo otra vez.");
      }
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (name.trim().length < 2) {
      const message = t("name_required");
      setSignupMessage(message);
      return toast.error(message);
    }
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      const message = "Ingresa un correo electrónico válido.";
      setSignupMessage(message);
      return toast.error(message);
    }
    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      const message = passwordError;
      setSignupMessage(message);
      return toast.error(message);
    }
    if (password !== confirmPassword) {
      const message = t("passwords_mismatch");
      setSignupMessage(message);
      return toast.error(message);
    }

    await runWithLoadingGuard(async () => {
      try {
        const signupRateLimitResult = await checkRateLimit({
          key: `signup:${normalizedEmail}`,
          limit: 3,
          window: 60 * 5,
        });

        if (!signupRateLimitResult.success) {
          const seconds = Math.ceil((signupRateLimitResult.resetIn || 0) / 1000);
          const minutes = Math.ceil(seconds / 60);
          const message = `Demasiados intentos. Intenta de nuevo en ${minutes} minuto(s).`;
          setSignupMessage(message);
          toast.error(message);
          return;
        }

        const phone = phoneRaw.trim() ? toE164Phone(phoneRaw) : null;
        if (phoneRaw.trim() && !phone) {
          const message = t("invalid_phone");
          setSignupMessage(message);
          toast.error(message);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: name.trim() },
          },
        });

        if (error) {
          const message = toUserMessage(error, "No se pudo crear la cuenta. Intenta de nuevo.");
          setSignupMessage(message);
          toast.error(message);
          return;
        }

        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              { id: data.user.id, nombre_completo: name.trim() },
              { onConflict: "id", ignoreDuplicates: false },
            );
          if (profileError) {
            console.error("No se pudo guardar el nombre del perfil:", profileError);
          }
        }

        if (data.session && phone) {
          const linkErr = await linkPhoneToAccount(phone);
          if (linkErr.error) {
            const message = toUserMessage(linkErr.error, "No se pudo vincular el teléfono.");
            setSignupMessage(message);
            toast.error(message);
            return;
          }
          toast.success(t("otp_sent"));
          nav({ to: "/auth/verificar-telefono", replace: true });
          return;
        }

        const verificationRequired = !data.session && Boolean(data.user);
        if (verificationRequired) {
          setSignupPendingVerification(true);
          setSignupEmail(normalizedEmail);
          setSignupMessage(t("signup_check_email"));
          toast.success(t("signup_check_email"));
          setEmailTab("signin");
          setPassword("");
          setConfirmPassword("");
          return;
        }

        const message = data.session ? t("welcome_back") : t("signup_check_email_then_phone");
        setSignupMessage(message);
        toast.success(message);
        if (data.session) {
          nav({ to: "/", replace: true });
          return;
        }

        setEmailTab("signin");
        setPassword("");
        setConfirmPassword("");
        nav({ to: "/auth", replace: true });
      } catch (error) {
        console.error("Error al crear la cuenta:", error);
        const message = toUserMessage(
          error,
          "No se pudo crear la cuenta. Revisa tu conexión e inténtalo otra vez.",
        );
        setSignupMessage(message);
        toast.error(message);
      }
    });
  };

  const sendPhoneCode = async () => {
    const phone = toE164Phone(phoneRaw);
    if (!phone) return toast.error(t("invalid_phone"));

    await runWithLoadingGuard(async () => {
      try {
        const { error } = await sendPhoneOtp(phone);
        if (error) {
          toast.error(toUserMessage(error, "No se pudo enviar el código SMS."));
          return;
        }

        setPhoneE164(phone);
        setPhoneStep("otp");
        setCooldown(60);
        toast.success(t("otp_sent"));
      } catch (error) {
        console.error("Error al enviar código SMS:", error);
        toast.error("No se pudo enviar el código SMS.");
      }
    });
  };

  const verifyPhoneCode = async () => {
    if (!phoneE164 || otp.length < 6) return toast.error(t("enter_6_digit_code"));

    await runWithLoadingGuard(async () => {
      try {
        const { data, error } = await verifyPhoneOtp(phoneE164, otp);
        if (error) {
          toast.error(toUserMessage(error, "Código incorrecto o expirado."));
          return;
        }

        if (phoneSignupName.trim().length >= 2 && data.user) {
          await supabase
            .from("profiles")
            .update({ nombre_completo: phoneSignupName.trim() })
            .eq("id", data.user.id);
        }

        toast.success(t("phone_verified"));
        nav({ to: "/", replace: true });
      } catch (error) {
        console.error("Error al verificar el código SMS:", error);
        toast.error("No se pudo verificar el código. Intenta de nuevo.");
      }
    });
  };

  if (pathname !== "/auth" && pathname !== "/auth/") {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.35),_transparent_35%),linear-gradient(180deg,_#7c3aed_0%,_#3b82f6_100%)] p-2 text-white sm:p-4">
      <Card className="w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-slate-700/80 bg-slate-950/95 shadow-[0_24px_80px_rgba(124,58,237,0.15)] sm:rounded-[2rem]">
        <CardHeader className="space-y-5 border-b border-slate-700/80 bg-gradient-primary/90 px-5 py-8 text-center sm:px-8 sm:py-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-white shadow-lg shadow-purple-500/20 sm:h-24 sm:w-24">
            <Logo className="h-14 w-14 sm:h-16 sm:w-16" />
          </div>
          <CardTitle className="flex items-center justify-center gap-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            <span>WINFAST</span>
          </CardTitle>
          <CardDescription className="text-sm text-slate-200">{t("tagline")}</CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-7 sm:px-8 sm:py-8">
          <Tabs
            value={emailTab}
            onValueChange={(v) => setEmailTab(v as "signin" | "signup")}
            className="space-y-4"
          >
            <TabsList className="grid h-14 w-full grid-cols-2 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 p-1 text-base shadow-sm sm:h-12">
              <TabsTrigger
                value="signin"
                className="rounded-xl border-0 bg-transparent text-base text-slate-300 data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                {t("sign_in")}
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-xl border-0 bg-transparent text-base text-slate-300 data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                {t("sign_up")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="email-in">{t("email")}</Label>
                  <Input
                    id="email-in"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-slate-950 border border-slate-700 text-base text-white placeholder:text-slate-500 focus:border-primary/70 sm:h-10"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pwd-in">{t("password")}</Label>
                    <button
                      type="button"
                      onClick={() => nav({ to: "/auth/recuperar" })}
                      className="text-xs text-primary hover:underline"
                    >
                      {t("forgot_password")}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="pwd-in"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 focus:border-primary/70 pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl border border-primary/80 bg-gradient-primary/95 text-white shadow-lg shadow-primary/10 hover:bg-gradient-primary"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sign_in")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} noValidate className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="name-up">{t("full_name")}</Label>
                  <Input
                    id="name-up"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 focus:border-primary/70"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">{t("email")}</Label>
                  <Input
                    id="email-up"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 focus:border-primary/70"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-up">{t("mobile_number")}</Label>
                  <Input
                    id="phone-up"
                    type="tel"
                    placeholder="0991234567"
                    value={phoneRaw}
                    onChange={(e) => setPhoneRaw(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 focus:border-primary/70"
                  />
                  <p className="text-[11px] text-slate-400">
                    Opcional: podrás verificar tu número dentro de la app después de crear la
                    cuenta.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd-up">{t("password")}</Label>
                  <div className="relative">
                    <Input
                      id="pwd-up"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 focus:border-primary/70 pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd-confirm-up">{t("confirm_password")}</Label>
                  <div className="relative">
                    <Input
                      id="pwd-confirm-up"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 focus:border-primary/70 pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl border border-primary/80 bg-gradient-primary/95 text-white shadow-lg shadow-primary/10 hover:bg-gradient-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    t("sign_up")
                  )}
                </Button>
                <p
                  role="status"
                  aria-live="polite"
                  className="min-h-5 text-center text-xs text-slate-300"
                >
                  {signupMessage}
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">
              ← {t("back_home")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
