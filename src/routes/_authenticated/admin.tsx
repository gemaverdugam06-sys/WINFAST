import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/auth-utils";
import { Loader2 } from "lucide-react";

const AdminPanel = lazy(() =>
  import("@/components/admin/AdminPanel").then((m) => ({ default: m.AdminPanel })),
);

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const admin = await checkIsAdmin(data.user.id, data.user.email ?? null);
    if (!admin) throw redirect({ to: "/" });
  },
  component: AdminPage,
});

function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AdminPanel />
    </Suspense>
  );
}
