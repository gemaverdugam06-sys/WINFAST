import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, Loader2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/error-messages";
import {
  validateProductTitle,
  validateProductDescription,
  getProhibitedContentMessage,
  containsProhibitedKeywords,
} from "@/lib/content-security";
import { z } from "zod";

interface Categoria {
  id: string;
  nombre: string;
}

// Configuración de validación de imágenes
const IMAGE_CONFIG = {
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES: 8,
};

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `${file.name}: Solo JPG, PNG y WebP son permitidos.`,
    };
  }

  if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `${file.name}: El archivo es muy grande (máx. 5MB).`,
    };
  }

  return { valid: true };
};

const schema = z.object({
  titulo: z.string().trim().min(3, "Mínimo 3 caracteres").max(120),
  descripcion: z.string().trim().min(10, "Describe mejor tu producto").max(2000),
  precio: z.number().nonnegative().max(9999999),
  categoria_id: z.string().min(1),
  ciudad: z.string().trim().min(2).max(80),
  estado: z.enum(["nuevo", "usado"]),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
});

const isMissingProductColumnError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message ?? "").toLowerCase();

  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("estado_moderacion") ||
    message.includes("razon_rechazo") ||
    message.includes("column") && message.includes("does not exist")
  );
};

const isProductPermissionError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message ?? "").toLowerCase();

  return (
    code === "42501" ||
    message.includes("permission denied") ||
    message.includes("unauthorized") ||
    message.includes("row-level security")
  );
};

const isStorageBucketMissingError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const message = String((error as { message?: string }).message ?? "").toLowerCase();

  return message.includes("bucket not found") || message.includes("not found") && message.includes("bucket");
};

export const Route = createFileRoute("/_authenticated/publicar")({
  component: PublicarPage,
});

function PublicarPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [estado, setEstado] = useState<"nuevo" | "usado">("nuevo");
  const [whatsapp, setWhatsapp] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const { data, error } = await supabase
          .from("categorias")
          .select("id, nombre")
          .order("orden");

        if (error) throw error;

        if (data) {
          setCategorias(data);
        }
      } catch (err) {
        console.error("Error cargando categorías:", err);
        // No mostrar toast aquí porque es en componente montado
      }
    };

    loadCategorias();
  }, []);

  // Limpiar Object URLs cuando el componente se desmonta
  useEffect(() => {
    return () => {
      previews.forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const addFiles = (list: FileList | null) => {
    if (!list) return;

    const validated: File[] = [];
    const errors: string[] = [];

    for (const file of list) {
      const validation = validateFile(file);
      if (validation.valid) {
        validated.push(file);
      } else if (validation.error) {
        errors.push(validation.error);
      }
    }

    // Mostrar errores de validación
    errors.forEach((err) => toast.error(err));

    // Limitar cantidad total
    const available = IMAGE_CONFIG.MAX_FILES - files.length;
    const toAdd = validated.slice(0, available);

    if (toAdd.length === 0) {
      return;
    }

    setFiles((prev) => [...prev, ...toAdd]);

    // Crear previews con Object URLs (más eficiente que Data URLs)
    toAdd.forEach((f) => {
      const url = URL.createObjectURL(f);
      setPreviews((prev) => [...prev, url]);
    });

    // Feedback positivo
    if (toAdd.length > 0) {
      toast.success(`${toAdd.length} imagen(s) agregada(s)`);
    }
  };

  const removeFile = (i: number) => {
    // Limpiar Object URL cuando se elimina
    const url = previews[i];
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (files.length === 0) {
      toast.error("Agrega al menos una foto");
      return;
    }

    const parsed = schema.safeParse({
      titulo,
      descripcion,
      precio: parseFloat(precio || "0"),
      categoria_id: categoriaId,
      ciudad,
      estado,
      whatsapp,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    const titleValidation = validateProductTitle(parsed.data.titulo);
    if (!titleValidation.valid) {
      toast.error(titleValidation.errors[0]);
      return;
    }

    const descValidation = validateProductDescription(parsed.data.descripcion);
    if (!descValidation.valid) {
      toast.error(descValidation.errors[0]);
      return;
    }

    const combinedText = `${parsed.data.titulo} ${parsed.data.descripcion}`;
    const prohibited = containsProhibitedKeywords(combinedText);
    if (prohibited.found) {
      toast.error(getProhibitedContentMessage());
      console.warn("Prohibited content detected:", prohibited);
      return;
    }

    setLoading(true);
    const uploadedPaths: string[] = [];
    for (const f of files) {
      const ext = f.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("productos").upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type,
      });
      if (error) {
        console.error("Error subiendo imagen del producto:", error);
        if (isStorageBucketMissingError(error)) {
          toast.error("El bucket 'productos' no existe en Supabase Storage. Crea el bucket para poder publicar.");
        } else {
          toast.error(toUserMessage(error, "Error al subir la imagen. Intenta de nuevo."));
        }
        setLoading(false);
        return;
      }
      uploadedPaths.push(path);
    }

    const basePayload = {
      user_id: user.id,
      titulo: parsed.data.titulo,
      descripcion: parsed.data.descripcion,
      precio: parsed.data.precio,
      categoria_id: parsed.data.categoria_id,
      ciudad: parsed.data.ciudad,
      estado: parsed.data.estado,
      whatsapp: parsed.data.whatsapp || null,
      imagenes: uploadedPaths,
      moneda: "USD",
      activo: true,
    };

    const payloadVariants = [
      {
        ...basePayload,
        estado_moderacion: "pendiente",
        razon_rechazo: null,
      },
      basePayload,
    ];

    let insertError: unknown = null;
    let productoId: string | null = null;

    for (const payload of payloadVariants) {
      const { data, error } = await supabase
        .from("productos")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        insertError = error;
        if (!isMissingProductColumnError(error)) {
          break;
        }
        console.warn("El esquema de productos no tiene moderación; reintentando con payload mínimo:", error);
        continue;
      }

      productoId = data?.id ?? null;
      break;
    }

    setLoading(false);

    if (!productoId || insertError) {
      console.error("Error publicando producto:", insertError ?? "No se recibió id del producto");
      if (isProductPermissionError(insertError)) {
        toast.error("No tienes permisos para publicar este anuncio. Revisa tu sesión o los permisos de Supabase.");
      } else if (isMissingProductColumnError(insertError)) {
        toast.error("La estructura real de Supabase no incluye una o más columnas de moderación. Revisa la migración del esquema de productos.");
      } else {
        toast.error(toUserMessage(insertError, "No se pudo publicar el anuncio. Intenta de nuevo."));
      }
      return;
    }

    toast.success("✅ Publicación creada correctamente");
    toast.info("⭐ ¿Quieres darle mayor visibilidad? DESTACAR PUBLICACIÓN");
    nav({ to: "/mis-publicaciones" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("publish_ad")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1">
                <Label>{t("images")}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-lg border"
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {files.length < 8 && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:bg-accent">
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-xs">{t("add_images")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => addFiles(e.target.files)}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="titulo">{t("title")}</Label>
                <Input
                  id="titulo"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="desc">{t("description")}</Label>
                <Textarea
                  id="desc"
                  required
                  rows={4}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={2000}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="precio">{t("price")} (USD)</Label>
                  <Input
                    id="precio"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("condition")}</Label>
                  <Select value={estado} onValueChange={(v) => setEstado(v as "nuevo" | "usado")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuevo">{t("new_item")}</SelectItem>
                      <SelectItem value="usado">{t("used_item")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t("category")}</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ciudad">{t("city")}</Label>
                  <Input
                    id="ciudad"
                    required
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wa">{t("phone")}</Label>
                  <Input
                    id="wa"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+593..."
                    maxLength={20}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("publishing")}
                  </>
                ) : (
                  t("publish_ad")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
