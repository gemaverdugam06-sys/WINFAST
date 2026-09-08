import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useSignedUrl } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import { MapPin, Sparkles, ImageOff } from "lucide-react";

export interface ProductCardData {
  id: string;
  titulo: string;
  precio: number;
  moneda: string;
  ciudad: string;
  imagenes: string[];
  es_destacado: boolean;
  promocionado_hasta?: string | null;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const { t } = useI18n();
  const img = useSignedUrl("productos", p.imagenes?.[0]);
  const MotionLink = motion(Link as any);
  const destacadoActivo =
    !!p.es_destacado && (!p.promocionado_hasta || new Date(p.promocionado_hasta) > new Date());

  return (
    <MotionLink
      to="/producto/$id"
      params={{ id: p.id }}
      initial={{ y: 12, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ translateY: -4, scale: 1.01 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`group relative flex flex-col overflow-hidden card-rounded border bg-card shadow-card transition-all will-change-transform ${
        destacadoActivo ? "shadow-featured ring-1 ring-warning/30" : ""
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-muted glass-border">
        {img ? (
          <img
            src={img}
            alt={p.titulo}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-12 w-12 sm:h-10 sm:w-10" />
          </div>
        )}
        {destacadoActivo && (
          <Badge className="absolute left-2 top-2 bg-gradient-featured text-warning-foreground border-0 gap-1 shadow-md">
            <Sparkles className="h-3 w-3" /> {t("featured")}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-base font-bold text-primary">
          {p.moneda} {Number(p.precio).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-tight">{p.titulo}</h3>
        <p className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0 sm:h-3 sm:w-3" />
          {p.ciudad}
        </p>
      </div>
    </MotionLink>
  );
}
