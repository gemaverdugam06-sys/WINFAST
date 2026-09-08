import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import "../styles.css";
import { toUserMessage } from "@/lib/error-messages";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const OG_IMAGE = import.meta.env.VITE_OG_IMAGE_URL ?? "https://your-domain.com/og-image.png";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const userMessage = toUserMessage(error, "Algo salió mal. Intenta de nuevo.");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{userMessage}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV || window.matchMedia("(display-mode: standalone)").matches) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!visible || !installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    setVisible(false);
    setInstallEvent(null);
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 shadow-lg sm:left-auto sm:max-w-sm">
      <p className="text-sm font-medium text-foreground">Instala WINFAST en tu dispositivo</p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
        >
          Ahora no
        </button>
        <button
          type="button"
          onClick={install}
          className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Instalar
        </button>
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  const [supabaseDown, setSupabaseDown] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("supabase_down");
      const unavailable = Boolean(
        (supabase as typeof supabase & { __unavailable?: boolean }).__unavailable,
      );
      setSupabaseDown(!!stored || unavailable);
    } catch {
      setSupabaseDown(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") router.navigate({ to: "/auth/nueva-contrasena" });
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "supabase_down") setSupabaseDown(!!e.newValue);
    }
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          {supabaseDown && (
            <div className="w-full bg-yellow-50 border-y border-yellow-200 text-yellow-800 text-center py-2 text-sm">
              Módulo de backend temporalmente no disponible — algunas funciones pueden no funcionar.
              Modo solo lectura activado.
            </div>
          )}
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <Outlet />
            </div>
            <Footer />
          </div>
          <InstallAppPrompt />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [{ charSet: "utf-8" }, { title: "WINFAST — Compra y vende fácil en Ecuador" }],
    links: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
