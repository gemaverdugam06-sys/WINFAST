import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
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
import { Loader2, SlidersHorizontal, X, Search } from "lucide-react";
import { ECUADOR, PROVINCIAS } from "@/lib/ecuador";

interface Categoria {
  id: string;
  nombre: string;
  icono: string;
}

export const Route = createFileRoute("/categoria/$id")({
  component: CategoriaPage,
});

function CategoriaPage() {
  const { id } = Route.useParams();
  const [productos, setProductos] = useState<ProductCardData[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [provincia, setProvincia] = useState("Todas");
  const [ciudad, setCiudad] = useState("Todas");
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const cat = categorias.find((c) => c.id === id);

  useEffect(() => {
    supabase
      .from("categorias")
      .select("id, nombre, icono")
      .order("orden")
      .then(({ data }) => {
        if (data)
          setCategorias(data.map((categoria) => ({ ...categoria, icono: categoria.icono ?? "" })));
      });
  }, []);

  const ciudadesDeProv = useMemo(() => {
    if (provincia === "Todas") return [];
    return ECUADOR[provincia] ?? [];
  }, [provincia]);

  const hasFilters = useMemo(
    () => provincia !== "Todas" || ciudad !== "Todas" || !!minP || !!maxP || !!q.trim(),
    [provincia, ciudad, minP, maxP, q],
  );

  useEffect(() => {
    setLoading(true);
    const run = async () => {
      let query = supabase
        .from("productos")
        .select("id, titulo, precio, moneda, ciudad, imagenes, es_destacado, promocionado_hasta")
        .eq("activo", true)
        .eq("estado_moderacion", "aprobado")
        .eq("categoria_id", id)
        .order("es_destacado", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
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
  }, [id, q, provincia, ciudad, minP, maxP]);

  const clear = () => {
    setProvincia("Todas");
    setCiudad("Todas");
    setMinP("");
    setMaxP("");
    setQ("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <CategoryNav categorias={categorias} activa={id} />
        <motion.h1
          className="my-6 text-3xl font-extrabold logo-heading md:text-4xl"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {cat?.nombre ?? "Categoría"}
        </motion.h1>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en esta categoría..."
            className="h-11 pl-10"
          />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            variant={hasFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={hasFilters ? "bg-gradient-primary" : ""}
          >
            <SlidersHorizontal className="mr-1 h-4 w-4" /> Filtros
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clear}>
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
          <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-4 glass-border soft-shadow">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Provincia
              </label>
              <Select
                value={provincia}
                onValueChange={(v) => {
                  setProvincia(v);
                  setCiudad("Todas");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas</SelectItem>
                  {PROVINCIAS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Ciudad / Cantón
              </label>
              <Select value={ciudad} onValueChange={setCiudad} disabled={provincia === "Todas"}>
                <SelectTrigger>
                  <SelectValue placeholder={provincia === "Todas" ? "Elige provincia" : "Todas"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas</SelectItem>
                  {ciudadesDeProv.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Precio mínimo (USD)
              </label>
              <Input
                type="number"
                min="0"
                value={minP}
                onChange={(e) => setMinP(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Precio máximo (USD)
              </label>
              <Input
                type="number"
                min="0"
                value={maxP}
                onChange={(e) => setMaxP(e.target.value)}
                placeholder="Sin límite"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
          </div>
        ) : productos.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 py-16 text-center text-muted-foreground">
            No hay productos con esos filtros en esta categoría.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {productos.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
