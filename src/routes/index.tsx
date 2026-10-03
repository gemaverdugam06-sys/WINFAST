import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { CategoryNav } from "@/components/CategoryNav";
import { AdvertisingSlot } from "@/components/AdvertisingSlot";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { Search, Sparkles, Plus, Loader2, SlidersHorizontal, X } from "lucide-react";
import { ECUADOR, PROVINCIAS } from "@/lib/ecuador";

interface Categoria {
  id: string;
  nombre: string;
  icono: string;
}

const CATEGORIAS_POR_DEFECTO: Categoria[] = [
  { id: "tecnologia", nombre: "Tecnología y Electrónica", icono: "Laptop" },
  { id: "vehiculos", nombre: "Vehículos", icono: "Car" },
  { id: "hogar", nombre: "Hogar y Muebles", icono: "Sofa" },
  { id: "moda", nombre: "Moda y Belleza", icono: "Shirt" },
  { id: "inmuebles", nombre: "Inmuebles", icono: "Home" },
  { id: "deportes", nombre: "Deportes y Aire Libre", icono: "Dumbbell" },
  { id: "empleo", nombre: "Empleo y Servicios", icono: "Briefcase" },
  { id: "ninos", nombre: "Niños y Bebés", icono: "Baby" },
  { id: "mascotas", nombre: "Mascotas", icono: "PawPrint" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WINFAST — Marketplace de Ecuador" },
      {
        name: "description",
        content:
          "Compra, vende y promociona tus anuncios en Ecuador. Tecnología, vehículos, hogar, moda, inmuebles y más.",
      },
      { property: "og:title", content: "WINFAST" },
      {
        property: "og:description",
        content: "Marketplace de Ecuador con publicaciones destacadas.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { t } = useI18n();
  const [productos, setProductos] = useState<ProductCardData[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [q, setQ] = useState("");
  const [provincia, setProvincia] = useState("Todas");
  const [ciudad, setCiudad] = useState("Todas");
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const backendUnavailable = Boolean(
          (supabase as typeof supabase & { __unavailable?: boolean }).__unavailable,
        );
        if (backendUnavailable) {
          setCategorias(CATEGORIAS_POR_DEFECTO);
          return;
        }

        const { data, error } = await supabase
          .from("categorias")
          .select("id, nombre, icono")
          .order("orden");

        if (error) throw error;

        if (data) {
          setCategorias(data.map((categoria) => ({ ...categoria, icono: categoria.icono ?? "" })));
        }
      } catch (err) {
        console.error("Error cargando categorías:", err);
        setCategorias(CATEGORIAS_POR_DEFECTO);
        toast.error("No se pudieron actualizar las categorías; se muestran las predeterminadas.");
      }
    };

    loadCategorias();

    // La expiración de promociones es opcional y no debe ejecutarse en todas las bases
    // de datos. Se elimina para evitar el 404 recurrente si la RPC no existe.
  }, []);

  const ciudadesDeProv = useMemo(() => {
    if (provincia === "Todas") return [];
    return ECUADOR[provincia] ?? [];
  }, [provincia]);

  const hasFilters = useMemo(
    () => provincia !== "Todas" || ciudad !== "Todas" || !!minP || !!maxP,
    [provincia, ciudad, minP, maxP],
  );

  useEffect(() => {
    setLoading(true);
    const run = async () => {
      let query = supabase
        .from("productos")
        .select(
          "id, titulo, precio, moneda, ciudad, imagenes, es_destacado, promocionado_hasta, profiles!productos_user_profile_fk(account_type, business_name)",
        )
        .eq("activo", true)
        .eq("estado_moderacion", "aprobado")
        .order("es_destacado", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60);
      if (q.trim()) query = query.ilike("titulo", `%${q.trim()}%`);
      if (ciudad && ciudad !== "Todas") {
        query = query.eq("ciudad", ciudad);
      } else if (provincia !== "Todas") {
        const cities = ECUADOR[provincia] ?? [];
        if (cities.length) query = query.in("ciudad", cities);
      }
      const min = parseFloat(minP);
      if (!isNaN(min)) query = query.gte("precio", min);
      const max = parseFloat(maxP);
      if (!isNaN(max)) query = query.lte("precio", max);
      const { data } = await query;
      const normalized = ((data as ProductCardData[]) ?? []).map((p) => ({
        ...p,
        es_destacado:
          Boolean(p.es_destacado) &&
          (!p.promocionado_hasta || new Date(p.promocionado_hasta) > new Date()),
      }));
      setProductos(normalized);
      setLoading(false);
    };
    const tm = setTimeout(run, 250);
    return () => clearTimeout(tm);
  }, [q, provincia, ciudad, minP, maxP]);

  const clear = () => {
    setProvincia("Todas");
    setCiudad("Todas");
    setMinP("");
    setMaxP("");
  };

  return (
    <div className="min-h-screen bg-[#f5f7f1] text-[#1a2d24]">
      <Header />

      <section className="border-b border-[#244f3d] bg-[linear-gradient(112deg,#123f34_0%,#195e48_70%,#638b45_100%)] text-white">
        <div className="container mx-auto grid gap-5 px-4 py-6 sm:py-8 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-10">
          <div>
            <p className="mb-2 text-xs font-bold uppercase text-[#c8e779]">
              WinFast <span className="px-1 text-white/60">/</span> Ecuador
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
              {t("tagline")}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Encuentra productos cerca de ti o publica algo que ya no necesitas.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#55715f]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search_placeholder")}
                className="h-12 rounded-lg border border-white/70 bg-white pl-12 text-[#1a2d24] shadow-sm placeholder:text-[#7a887d] focus-visible:ring-[#a8ce4d]"
              />
            </div>
            <Button
              asChild
              size="lg"
              className="h-12 rounded-lg border border-[#c8e779] bg-[#c8e779] px-5 font-bold text-[#193a2b] shadow-none hover:bg-[#d8f194]"
            >
              <Link to="/publicar">
                <Plus className="mr-1 h-5 w-5" />
                {t("publish")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-7xl px-4 py-5 sm:py-7">
        <AdvertisingSlot placement="banner_principal" />
        <CategoryNav categorias={categorias} />
        <div className="mt-4">
          <AdvertisingSlot placement="negocio_destacado" />
        </div>

        <div className="mb-3 mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant={hasFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={
              hasFilters
                ? "bg-[#195e48] text-white hover:bg-[#124b39]"
                : "border border-[#d7e2d5] bg-white text-[#30443a] hover:bg-[#edf3e8]"
            }
          >
            <SlidersHorizontal className="mr-1 h-4 w-4" /> Filtros{" "}
            {hasFilters && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px]">●</span>
            )}
          </Button>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="border border-[#d7e2d5] bg-white text-[#30443a] hover:bg-[#edf3e8]"
            >
              <X className="mr-1 h-4 w-4" /> Limpiar
            </Button>
          )}
          {provincia !== "Todas" && (
            <span className="rounded-md bg-[#e7efdc] px-3 py-1 text-xs text-[#31523b]">
              {provincia}
            </span>
          )}
          {ciudad !== "Todas" && (
            <span className="rounded-md bg-[#e7efdc] px-3 py-1 text-xs text-[#31523b]">
              {ciudad}
            </span>
          )}
          {(minP || maxP) && (
            <span className="rounded-md bg-[#e7efdc] px-3 py-1 text-xs text-[#31523b]">
              ${minP || "0"} - ${maxP || "∞"}
            </span>
          )}
        </div>

        {showFilters && (
          <div className="mb-4 grid gap-3 rounded-lg border border-[#dbe4d8] bg-white p-4 shadow-sm sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#315b43]">Provincia</label>
              <Select
                value={provincia}
                onValueChange={(v) => {
                  setProvincia(v);
                  setCiudad("Todas");
                }}
              >
                <SelectTrigger className="border-[#d3dfd0] bg-white text-[#1a2d24]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#d3dfd0] bg-white text-[#1a2d24]">
                  <SelectItem
                    value="Todas"
                    className="text-[#1a2d24] focus:bg-[#edf3e8] focus:text-[#174c37]"
                  >
                    Todas
                  </SelectItem>
                  {PROVINCIAS.map((p) => (
                    <SelectItem
                      key={p}
                      value={p}
                      className="text-[#1a2d24] focus:bg-[#edf3e8] focus:text-[#174c37]"
                    >
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#315b43]">
                Ciudad / Cantón
              </label>
              <Select value={ciudad} onValueChange={setCiudad} disabled={provincia === "Todas"}>
                <SelectTrigger className="border-[#d3dfd0] bg-white text-[#1a2d24]">
                  <SelectValue placeholder={provincia === "Todas" ? "Elige provincia" : "Todas"} />
                </SelectTrigger>
                <SelectContent className="border-[#d3dfd0] bg-white text-[#1a2d24]">
                  <SelectItem
                    value="Todas"
                    className="text-[#1a2d24] focus:bg-[#edf3e8] focus:text-[#174c37]"
                  >
                    Todas
                  </SelectItem>
                  {ciudadesDeProv.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="text-[#1a2d24] focus:bg-[#edf3e8] focus:text-[#174c37]"
                    >
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-violet-700">
                Precio mínimo (USD)
              </label>
              <Input
                type="number"
                min="0"
                value={minP}
                onChange={(e) => setMinP(e.target.value)}
                placeholder="0"
                className="border-[#d3dfd0] bg-white text-[#1a2d24]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-violet-700">
                Precio máximo (USD)
              </label>
              <Input
                type="number"
                min="0"
                value={maxP}
                onChange={(e) => setMaxP(e.target.value)}
                placeholder="Sin límite"
                className="border-[#d3dfd0] bg-white text-[#1a2d24]"
              />
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#e96f50]" />
          <h2 className="font-display text-lg font-bold text-[#1a2d24]">Descubre en WinFast</h2>
        </div>

        <div className="mb-4">
          <AdvertisingSlot placement="productos" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
          </div>
        ) : productos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d3dfd0] bg-white py-16 text-center text-[#647267]">
            No hay productos con esos filtros. Prueba con otros.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {productos.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
