import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { CategoryNav } from "@/components/CategoryNav";
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
        .select("id, titulo, precio, moneda, ciudad, imagenes, es_destacado, promocionado_hasta")
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.35),_transparent_40%),linear-gradient(180deg,_#f0ebff_0%,_#e9e0ff_100%)] text-foreground">
      <Header />

      <section className="relative overflow-hidden border-b bg-gradient-hero text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-600 shadow-lg bg-slate-900 p-10 md:p-14 shadow-card ring-1 ring-slate-600">
            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm shadow-lg">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 shadow-lg">
                  <Logo className="h-8 w-8" />
                </span>
                <span className="font-semibold">WINFAST</span>
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl md:leading-tight logo-heading text-white drop-shadow-lg">
                {t("tagline")}
              </h1>
              <p className="mt-6 max-w-3xl text-slate-200 text-xl md:text-2xl leading-relaxed drop-shadow-lg">
                Compra y vende en Ecuador de manera simple. Encuentra productos cerca de ti y
                publica tu anuncio gratis en segundos.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("search_placeholder")}
                    className="h-12 rounded-2xl bg-white px-4 pl-10 text-foreground placeholder-slate-400 shadow-sm shadow-black/10 border-0"
                  />
                </div>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="h-12 rounded-2xl px-8 btn-cta font-semibold"
                >
                  <Link to="/publicar">
                    <Plus className="mr-1 h-5 w-5" />
                    {t("publish")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-6">
        <CategoryNav categorias={categorias} />

        <div className="mb-3 mt-6 flex flex-wrap items-center gap-2">
          <Button
            variant={hasFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={
              hasFilters
                ? "bg-gradient-primary"
                : "border border-violet-200 bg-white text-slate-900 shadow-[0_8px_20px_rgba(124,58,237,0.08)]"
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
              className="border border-violet-200 bg-white text-slate-900 shadow-[0_8px_20px_rgba(124,58,237,0.08)]"
            >
              <X className="mr-1 h-4 w-4" /> Limpiar
            </Button>
          )}
          {provincia !== "Todas" && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs">🗺️ {provincia}</span>
          )}
          {ciudad !== "Todas" && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs">📍 {ciudad}</span>
          )}
          {(minP || maxP) && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs">
              ${minP || "0"} - ${maxP || "∞"}
            </span>
          )}
        </div>

        {showFilters && (
          <div className="mb-4 grid gap-3 rounded-[1.25rem] border border-violet-100 bg-white p-4 shadow-[0_10px_30px_rgba(124,58,237,0.08)] sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-violet-700">Provincia</label>
              <Select
                value={provincia}
                onValueChange={(v) => {
                  setProvincia(v);
                  setCiudad("Todas");
                }}
              >
                <SelectTrigger className="border-violet-200 bg-white text-slate-900 shadow-[0_6px_16px_rgba(124,58,237,0.06)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-violet-100 bg-white text-slate-900 shadow-[0_10px_25px_rgba(15,23,42,0.12)]">
                  <SelectItem
                    value="Todas"
                    className="text-slate-900 focus:bg-violet-50 focus:text-violet-900"
                  >
                    Todas
                  </SelectItem>
                  {PROVINCIAS.map((p) => (
                    <SelectItem
                      key={p}
                      value={p}
                      className="text-slate-900 focus:bg-violet-50 focus:text-violet-900"
                    >
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-violet-700">
                Ciudad / Cantón
              </label>
              <Select value={ciudad} onValueChange={setCiudad} disabled={provincia === "Todas"}>
                <SelectTrigger className="border-violet-200 bg-white text-slate-900 shadow-[0_6px_16px_rgba(124,58,237,0.06)]">
                  <SelectValue placeholder={provincia === "Todas" ? "Elige provincia" : "Todas"} />
                </SelectTrigger>
                <SelectContent className="border-violet-100 bg-white text-slate-900 shadow-[0_10px_25px_rgba(15,23,42,0.12)]">
                  <SelectItem
                    value="Todas"
                    className="text-slate-900 focus:bg-violet-50 focus:text-violet-900"
                  >
                    Todas
                  </SelectItem>
                  {ciudadesDeProv.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="text-slate-900 focus:bg-violet-50 focus:text-violet-900"
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
                className="border-violet-200 bg-white text-slate-900 shadow-[0_6px_16px_rgba(124,58,237,0.06)]"
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
                className="border-violet-200 bg-white text-slate-900 shadow-[0_6px_16px_rgba(124,58,237,0.06)]"
              />
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-warning" />
          <h2 className="text-lg font-semibold">Recomendados para ti</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
          </div>
        ) : productos.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 py-16 text-center text-muted-foreground">
            No hay productos con esos filtros. Prueba con otros.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {productos.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
