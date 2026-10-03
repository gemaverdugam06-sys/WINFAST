import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type Placement = "banner_principal" | "negocio_destacado" | "categoria" | "productos" | "servicios";

const placementKeys = {
  banner_principal: "advertising_slot_banner_principal",
  negocio_destacado: "advertising_slot_negocio_destacado",
  categoria: "advertising_slot_categoria",
  productos: "advertising_slot_productos",
  servicios: "advertising_slot_servicios",
} as const;

export function AdvertisingSlot({ placement }: { placement: Placement }) {
  const { t } = useI18n();
  const [creativeUrl, setCreativeUrl] = useState<string | null>(null);
  const [destinationUrl, setDestinationUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await supabase.rpc("publicidad_activa", {
        p_ubicacion: placement,
      });
      const currentAd = data?.[0];
      if (error || !currentAd) {
        if (active) {
          setCreativeUrl(null);
          setDestinationUrl(null);
        }
        return;
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from("publicidad")
        .createSignedUrl(currentAd.archivo_path, 3600);

      if (!active) return;
      if (signedError || !signed?.signedUrl) {
        setCreativeUrl(null);
        setDestinationUrl(null);
        return;
      }
      setCreativeUrl(signed.signedUrl);
      setDestinationUrl(currentAd.url_destino);
    };

    void load();
    return () => {
      active = false;
    };
  }, [placement]);

  if (!creativeUrl) return null;

  const image = (
    <img
      src={creativeUrl}
      alt={t(placementKeys[placement])}
      className="h-full w-full object-contain"
      loading="lazy"
    />
  );

  return (
    <aside
      aria-label={t(placementKeys[placement])}
      className="overflow-hidden rounded-lg border bg-card"
    >
      {destinationUrl ? (
        <a href={destinationUrl} target="_blank" rel="sponsored noopener noreferrer">
          {image}
        </a>
      ) : (
        image
      )}
    </aside>
  );
}
