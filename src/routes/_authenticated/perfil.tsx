import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useSignedUrl } from "@/lib/storage";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/error-messages";
import { validateStrongPassword } from "@/lib/auth-utils";
import { BUSINESS_PLANS } from "@/lib/promo-plans";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessPlanSettings, setBusinessPlanSettings] = useState<
    Record<string, { enabled?: boolean; price?: number }>
  >({});
  const [telefono, setTelefono] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const avatarUrl = useSignedUrl("avatars", avatarPath);

  useEffect(() => {
    const recoveryInUrl = /(?:type=recovery|type%3Drecovery)/i.test(
      `${window.location.hash}${window.location.search}`,
    );
    if (recoveryInUrl) setIsRecoverySession(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecoverySession(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select(
        "nombre_completo, ciudad, avatar_url, account_type, business_name, business_description",
      )
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setNombre(data.nombre_completo ?? "");
          setCiudad(data.ciudad ?? "");
          setAvatarPath(data.avatar_url ?? null);
          setAccountType(data.account_type === "business" ? "business" : "personal");
          setBusinessName(data.business_name ?? "");
          setBusinessDescription(data.business_description ?? "");
        }
      });
    supabase
      .from("monetization_settings")
      .select("settings")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const settings = data?.settings as {
          business?: Record<string, { enabled?: boolean; price?: number }>;
        } | null;
        setBusinessPlanSettings(settings?.business ?? {});
      });
    supabase
      .from("profiles_private")
      .select("telefono")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTelefono(data.telefono ?? "");
      });
  }, [user]);

  const onUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      setUploading(false);
      if (String(upErr.message).toLowerCase().includes("bucket not found")) {
        return toast.error(
          "Falta crear el bucket 'avatars' en Supabase Storage. Ve a Storage > New bucket y créalo para subir la foto de perfil.",
        );
      }
      return toast.error(toUserMessage(upErr, "No se pudo subir la foto."));
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", user.id);
    setUploading(false);
    if (error) return toast.error(toUserMessage(error, "No se pudo guardar el avatar."));
    setAvatarPath(path);
    toast.success(t("saved"));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nombre_completo: nombre,
        ciudad,
        account_type: accountType,
        business_name: businessName.trim() || null,
        business_description: businessDescription.trim() || null,
      })
      .eq("id", user.id);
    const { error: pErr } = await supabase
      .from("profiles_private")
      .upsert({ id: user.id, telefono });
    setSaving(false);
    if (error || pErr)
      return toast.error(toUserMessage(error ?? pErr, "No se pudo actualizar el perfil."));
    toast.success(t("profile_updated"));
    navigate({ to: "/" });
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) return toast.error(passwordError);
    if (newPassword !== confirmNewPassword) {
      return toast.error("Las contraseñas nuevas no coinciden.");
    }
    if (!isRecoverySession && !currentPassword) {
      return toast.error("Ingresa tu contraseña actual.");
    }

    setChangingPassword(true);
    if (!isRecoverySession) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setChangingPassword(false);
        return toast.error("La contraseña actual no es correcta.");
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) return toast.error(toUserMessage(error, "No se pudo cambiar la contraseña."));

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    toast.success("Contraseña actualizada correctamente.");
    if (isRecoverySession) {
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-xl px-4 py-6">
        <Card className="border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-slate-200 bg-white/95">
            <CardTitle className="text-slate-900">{t("profile")}</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="text-2xl">{nombre[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:opacity-90">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1">
                <Label>{t("full_name")}</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("city")}</Label>
                <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-1">
                <Label>{t("account_type")}</Label>
                <Select
                  value={accountType}
                  onValueChange={(value) => setAccountType(value as "personal" | "business")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">{t("personal_account")}</SelectItem>
                    <SelectItem value="business">{t("business_account")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {accountType === "business" && (
                <>
                  <div className="space-y-1">
                    <Label>{t("business_name")}</Label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("business_description")}</Label>
                    <Textarea
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label>{t("phone")}</Label>
                <Input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  maxLength={20}
                  placeholder="+593..."
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-gradient-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("update_profile")}
              </Button>
              {accountType === "business" && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/publicidad" })}
                >
                  {t("advertising_nav")}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("business_plans_title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("business_plans_unavailable")}</p>
            {BUSINESS_PLANS.filter((plan) => businessPlanSettings[plan.key]?.enabled !== false).map(
              (plan) => {
                const labelKey = `business_plan_${plan.key.toLowerCase()}` as
                  "business_plan_negocio" | "business_plan_profesional" | "business_plan_empresa";
                return (
                  <div
                    key={plan.key}
                    className="flex items-center justify-between gap-3 border-t pt-3"
                  >
                    <div>
                      <p className="font-medium">{t(labelKey)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("business_checkout_paused")}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">
                      ${Number(businessPlanSettings[plan.key]?.price ?? plan.price).toFixed(2)} USD
                    </span>
                  </div>
                );
              },
            )}
          </CardContent>
        </Card>
        <Card className="mt-6 border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-slate-200 bg-white/95">
            <CardTitle className="text-slate-900">Cambiar contraseña</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <form onSubmit={changePassword} className="space-y-3">
              {!isRecoverySession && (
                <div className="space-y-1">
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-new-password">Confirmar nueva contraseña</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Usa al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter
                especial.
              </p>
              <Button
                type="submit"
                disabled={changingPassword}
                className="w-full bg-gradient-primary"
              >
                {changingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Cambiar contraseña"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
