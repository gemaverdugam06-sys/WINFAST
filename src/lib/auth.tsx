import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/auth-utils";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  roleLoading: false,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    let settled = false;

    const finish = () => {
      if (!active || settled) return;
      settled = true;
      setLoading(false);
    };

    if ((supabase as typeof supabase & { __unavailable?: boolean }).__unavailable) {
      setSession(null);
      setIsAdmin(false);
      finish();
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      finish();
    });

    const timer = window.setTimeout(() => {
      if (!active) return;
      setSession(null);
      setIsAdmin(false);
      finish();
    }, 4000);

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;

        const currentSession = data.session ?? null;
        const userId = currentSession?.user?.id;

        if (userId) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .maybeSingle();

            if (!active) return;

            const isBlocked = Boolean((profileData as { is_blocked?: boolean } | null)?.is_blocked);
            if (!profileError && isBlocked) {
              await supabase.auth.signOut();
              setSession(null);
              setIsAdmin(false);
              finish();
              return;
            }
          } catch {
            // Si la columna no existe aún, la UI sigue funcionando sin bloquear el usuario.
          }
        }

        setSession(currentSession);
        finish();
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setIsAdmin(false);
        finish();
      })
      .finally(() => {
        if (typeof window !== "undefined") window.clearTimeout(timer);
      });

    return () => {
      active = false;
      if (typeof window !== "undefined") window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      setIsAdmin(false);
      setRoleLoading(false);
      return;
    }

    let active = true;
    setIsAdmin(false);
    setRoleLoading(true);

    void supabase.rpc("sync_my_profile_name");

    const refreshRole = async () => {
      try {
        if (!active) return;

        const allowed = await checkIsAdmin(userId, session?.user?.email ?? null);
        if (active) setIsAdmin(allowed);
      } catch {
        if (active) setIsAdmin(false);
      } finally {
        if (active) setRoleLoading(false);
      }
    };

    refreshRole();

    return () => {
      active = false;
    };
  }, [session?.user?.id, session?.access_token]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        roleLoading,
        isAdmin,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
