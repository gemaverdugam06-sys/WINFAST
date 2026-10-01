import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { SUPPORT_CATEGORIES } from "@/lib/support-config";
import { sanitizeSupportText, validateSupportTicketInput } from "@/lib/support-validation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/soporte")({
  component: SupportPage,
});

function SupportPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const nextName = user.user_metadata?.nombre_completo ?? user.user_metadata?.name ?? "";
    setName(nextName || "");
    setEmail(user.email ?? "");

    if (!category) {
      setCategory("problema_tecnico");
    }

    if (!user.email) {
      toast.error("Tu cuenta no tiene un correo asociado para enviar la solicitud.");
    }
  }, [user]);

  const descriptionLength = useMemo(() => description.length, [description]);

  const clearForm = () => {
    setCategory("problema_tecnico");
    setSubject("");
    setDescription("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      toast.error("Debes iniciar sesión para enviar una solicitud de soporte.");
      return;
    }

    const validation = validateSupportTicketInput({
      userId: user.id,
      name,
      email,
      category,
      subject,
      description,
    });

    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    const body = {
      name: validation.normalized.name,
      email: validation.normalized.email,
      category: validation.normalized.category,
      subject: validation.normalized.subject,
      description: validation.normalized.description,
      user_id: user.id,
    };

    setLoading(true);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-support-ticket", {
        body,
      });

      if (error) {
        const message =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "No pudimos procesar tu solicitud.";
        toast.error(message || "No pudimos procesar tu solicitud.");
        return;
      }

      const ticketId = data?.ticket_number ?? null;
      const responseMessage =
        typeof data?.message === "string" && data.message
          ? data.message
          : "Solicitud enviada correctamente.";

      setSuccessMessage(responseMessage);
      if (typeof ticketId === "number") {
        setTicketNumber(ticketId);
      }
      clearForm();
      toast.success(responseMessage);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "No pudimos enviar tu solicitud.";
      toast.error(message || "No pudimos enviar tu solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card className="border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-slate-200 bg-white/95">
            <CardTitle className="text-2xl text-slate-900">Soporte técnico</CardTitle>
          </CardHeader>
          <CardContent className="bg-white p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-name">Nombre del usuario *</Label>
                  <Input
                    id="support-name"
                    value={name}
                    onChange={(e) => setName(sanitizeSupportText(e.target.value))}
                    placeholder="Tu nombre"
                    maxLength={120}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-email">Correo electrónico *</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(sanitizeSupportText(e.target.value).toLowerCase())}
                    placeholder="tu@correo.com"
                    maxLength={160}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-category">Categoría *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="support-category">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CATEGORIES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-subject">Asunto *</Label>
                <Input
                  id="support-subject"
                  value={subject}
                  onChange={(e) => setSubject(sanitizeSupportText(e.target.value))}
                  placeholder="Describe brevemente el problema"
                  maxLength={180}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="support-description">Descripción del problema *</Label>
                  <span className="text-xs text-muted-foreground">{descriptionLength}/5000</span>
                </div>
                <Textarea
                  id="support-description"
                  value={description}
                  onChange={(e) => setDescription(sanitizeSupportText(e.target.value))}
                  placeholder="Explica qué ocurre, cuándo pasó y qué esperabas conseguir."
                  rows={7}
                  maxLength={5000}
                  required
                />
              </div>

              {successMessage && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <p>{successMessage}</p>
                  {ticketNumber ? (
                    <p className="mt-1 font-medium">
                      Tu solicitud #{ticketNumber} fue recibida correctamente.
                    </p>
                  ) : null}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar solicitud
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
