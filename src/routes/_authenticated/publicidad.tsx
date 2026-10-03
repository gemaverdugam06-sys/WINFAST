import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ADVERTISING_OPTIONS } from "@/lib/promo-plans";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const PAYPHONE_LINK =
  import.meta.env.VITE_PAYPHONE_LINK ?? "https://ppls.me/yV2qDHkhPNunrElO0Tut1g";

type Placement = keyof typeof ADVERTISING_OPTIONS;
type PlacementSetting = { enabled?: boolean; price?: number };
type AdvertisingRequest = {
  id: string;
  ubicacion: Placement;
  precio: number;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  notas_admin: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
};

const placementKeys = {
  banner_principal: "advertising_slot_banner_principal",
  negocio_destacado: "advertising_slot_negocio_destacado",
  categoria: "advertising_slot_categoria",
  productos: "advertising_slot_productos",
  servicios: "advertising_slot_servicios",
} as const;

const statusKeys = {
  PENDIENTE: "advertising_status_pending",
  APROBADO: "advertising_status_approved",
  RECHAZADO: "advertising_status_rejected",
} as const;

export const Route = createFileRoute("/_authenticated/publicidad")({
  component: AdvertisingPage,
});

function AdvertisingPage() {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const [accountType, setAccountType] = useState("personal");
  const [placements, setPlacements] = useState<Record<string, PlacementSetting>>({});
  const [requests, setRequests] = useState<AdvertisingRequest[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | "">("");
  const [creative, setCreative] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      const [profileResult, settingsResult, requestsResult] = await Promise.all([
        supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle(),
        supabase.from("monetization_settings").select("settings").limit(1).maybeSingle(),
        supabase
          .from("publicidad_solicitudes")
          .select("id, ubicacion, precio, estado, notas_admin, fecha_inicio, fecha_fin, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;
      if (profileResult.error) toast.error(t("error"));
      setAccountType(profileResult.data?.account_type ?? "personal");

      const settings = settingsResult.data?.settings as {
        advertising?: Record<string, PlacementSetting>;
      } | null;
      const nextPlacements = settings?.advertising ?? {};
      setPlacements(nextPlacements);
      const firstAvailable = Object.entries(ADVERTISING_OPTIONS).find(
        ([key]) => nextPlacements[key]?.enabled !== false,
      )?.[0] as Placement | undefined;
      setSelectedPlacement(firstAvailable ?? "");

      if (requestsResult.error) {
        toast.error(t("advertising_request_error"));
        setRequests([]);
      } else {
        setRequests((requestsResult.data as AdvertisingRequest[]) ?? []);
      }
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [t, user]);

  const availablePlacements = Object.keys(ADVERTISING_OPTIONS).filter(
    (key) => placements[key]?.enabled !== false,
  ) as Placement[];
  const selectedPrice = selectedPlacement
    ? Number(placements[selectedPlacement]?.price ?? ADVERTISING_OPTIONS[selectedPlacement].price)
    : null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || accountType !== "business") {
      toast.error(t("advertising_requires_business"));
      return;
    }
    if (!selectedPlacement || !creative || !receipt) {
      toast.error(t("error"));
      return;
    }
    if (!creative.type.startsWith("image/") || creative.size > 5 * 1024 * 1024) {
      toast.error(t("advertising_creative_hint"));
      return;
    }

    setSubmitting(true);
    const requestKey = crypto.randomUUID();
    const creativeExtension = creative.name.split(".").pop()?.toLowerCase() || "jpg";
    const receiptExtension = receipt.name.split(".").pop()?.toLowerCase() || "jpg";
    const creativePath = `${user.id}/${requestKey}.${creativeExtension}`;
    const receiptPath = `${user.id}/${requestKey}-receipt.${receiptExtension}`;
    let creativeUploaded = false;
    let receiptUploaded = false;

    try {
      const { error: creativeError } = await supabase.storage
        .from("publicidad")
        .upload(creativePath, creative, { contentType: creative.type });
      if (creativeError) throw creativeError;
      creativeUploaded = true;

      const { error: receiptError } = await supabase.storage
        .from("comprobantes")
        .upload(receiptPath, receipt, { contentType: receipt.type });
      if (receiptError) throw receiptError;
      receiptUploaded = true;

      const { error } = await supabase.rpc("solicitar_publicidad", {
        p_ubicacion: selectedPlacement,
        p_archivo_path: creativePath,
        p_comprobante_path: receiptPath,
        p_url_destino: destinationUrl.trim() || null,
      });
      if (error) throw error;

      toast.success(t("advertising_request_sent"));
      setCreative(null);
      setReceipt(null);
      setDestinationUrl("");
      const { data } = await supabase
        .from("publicidad_solicitudes")
        .select("id, ubicacion, precio, estado, notas_admin, fecha_inicio, fecha_fin, created_at")
        .order("created_at", { ascending: false });
      setRequests((data as AdvertisingRequest[]) ?? []);
    } catch (error) {
      if (creativeUploaded) await supabase.storage.from("publicidad").remove([creativePath]);
      if (receiptUploaded) await supabase.storage.from("comprobantes").remove([receiptPath]);
      console.error("Advertising request failed:", error);
      toast.error(t("advertising_request_error"));
    } finally {
      setSubmitting(false);
    }
  };

  const dateLocale = lang === "en" ? "en-US" : "es-EC";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto grid max-w-4xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <section className="space-y-5">
          <header className="space-y-2">
            <h1 className="text-2xl font-bold">{t("advertising_title")}</h1>
            <p className="text-sm text-muted-foreground">{t("advertising_description")}</p>
          </header>

          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t("publishing")}</div>
          ) : accountType !== "business" ? (
            <Card>
              <CardContent className="space-y-4 p-5">
                <p className="text-sm">{t("advertising_requires_business")}</p>
                <Button asChild>
                  <Link to="/perfil">{t("profile")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : availablePlacements.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              {t("advertising_request_error")}
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("advertising_slot")}</Label>
                <Select
                  value={selectedPlacement}
                  onValueChange={(value) => setSelectedPlacement(value as Placement)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlacements.map((placement) => (
                      <SelectItem key={placement} value={placement}>
                        {t(placementKeys[placement])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPrice !== null && (
                  <p className="text-sm font-semibold">${selectedPrice.toFixed(2)} USD</p>
                )}
                <p className="text-xs text-muted-foreground">{t("advertising_month_term")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad-creative">{t("advertising_creative")}</Label>
                <Input
                  id="ad-creative"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setCreative(event.target.files?.[0] ?? null)}
                  required
                />
                <p className="text-xs text-muted-foreground">{t("advertising_creative_hint")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad-destination">{t("advertising_target_url")}</Label>
                <Input
                  id="ad-destination"
                  type="url"
                  value={destinationUrl}
                  onChange={(event) => setDestinationUrl(event.target.value)}
                  placeholder="https://"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad-receipt">{t("advertising_receipt")}</Label>
                <Input
                  id="ad-receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
                  required
                />
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p>{t("advertising_payment_hint")}</p>
                <a
                  href={PAYPHONE_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block font-semibold text-primary underline"
                >
                  PayPhone
                </a>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t("advertising_sending") : t("advertising_submit")}
              </Button>
            </form>
          )}
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>{t("advertising_requests")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("advertising_no_requests")}</p>
              ) : (
                requests.map((request) => (
                  <div key={request.id} className="space-y-1 border-t pt-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{t(placementKeys[request.ubicacion])}</span>
                      <Badge variant={request.estado === "RECHAZADO" ? "destructive" : "secondary"}>
                        {t(statusKeys[request.estado])}
                      </Badge>
                    </div>
                    <p>
                      ${Number(request.precio).toFixed(2)} USD · 1 {lang === "en" ? "month" : "mes"}
                    </p>
                    {request.fecha_inicio && request.fecha_fin && (
                      <p className="text-xs text-muted-foreground">
                        {t("advertising_period")}:{" "}
                        {new Date(request.fecha_inicio).toLocaleDateString(dateLocale)}
                        {" - "}
                        {new Date(request.fecha_fin).toLocaleDateString(dateLocale)}
                      </p>
                    )}
                    {request.notas_admin && (
                      <p className="text-xs text-muted-foreground">{request.notas_admin}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
