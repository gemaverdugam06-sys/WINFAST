import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { type ElementType } from "react";
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
  profiles?: {
    account_type: string;
    business_name: string | null;
  } | null;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const { t } = useI18n();
  const img = useSignedUrl("productos", p.imagenes?.[0]);
  const MotionLink = motion(Link as unknown as ElementType);
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
      className={`group relative flex flex-col overflow-hidden rounded-lg border border-[#dbe4d8] bg-white shadow-[0_3px_12px_rgba(29,64,42,0.07)] transition-all will-change-transform ${
        destacadoActivo ? "ring-1 ring-[#ef7654]/45" : ""
      }`}
    >
      <div className="relative aspect-square overflow-hidden rounded-t-lg bg-[#e9eee5]">
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
          <Badge className="absolute left-2 top-2 gap-1 border-0 bg-[#a9432d] text-white shadow-md uppercase tracking-wide">
            <Sparkles className="h-3 w-3" /> {t("featured")}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-base font-bold text-[#195e48]">
          {p.moneda} {Number(p.precio).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        {p.profiles?.account_type === "business" && (
          <p className="text-xs font-medium text-[#536b5c]">
            {p.profiles.business_name
              ? `${p.profiles.business_name} · ${t("business_badge")}`
              : t("business_badge")}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium leading-tight">{p.titulo}</h3>
        <p className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0 sm:h-3 sm:w-3" />
          {p.ciudad}
        </p>
      </div>
    </MotionLink>
  );
}
