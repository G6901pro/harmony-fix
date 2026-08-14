import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "staff";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  loading: boolean;
  /** Set when the last session was ended because the account is blocked or removed. */
  suspendedMessage: string | null;
  clearSuspended: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [suspended, setSuspended] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Identity of the session whose data is currently being loaded. Every async
  // write below is discarded unless it still matches, so a second sign-in in
  // the same tab can never be overwritten by the previous user's in-flight
  // request. Each browser session keeps its own tokens in the auth SDK's own
  // storage, so concurrent users on different browsers never contend.
  const activeUserId = useRef<string | null>(null);

  const load = useCallback(async (current: Session | null) => {
    const user = current?.user ?? null;
    activeUserId.current = user?.id ?? null;
    const token = user?.id ?? null;
    const isCurrent = () => activeUserId.current === token;

    if (!user) {
      setProfile(null);
      setRoles([]);
      return;
    }
    // Ensure a profile row exists for every signed-in customer.
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, is_blocked, deleted_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!isCurrent()) return;

    // A suspended or removed account is signed out immediately.
    if (existing && (existing.is_blocked || existing.deleted_at)) {
      setProfile(null);
      setRoles([]);
      setSuspended(
        existing.deleted_at
          ? "This account has been removed. Please contact support if you think this is a mistake."
          : "Your account has been suspended. Please contact support.",
      );
      await supabase.auth.signOut();
      return;
    }

    setSuspended(null);

    if (!existing) {
      const seeded = {
        id: user.id,
        email: user.email ?? null,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        phone: null,
      };
      // Upsert: the signup trigger may create the row concurrently.
      await supabase.from("profiles").upsert(seeded, { onConflict: "id" });
      if (!isCurrent()) return;
      setProfile(seeded);
    } else {
      setProfile(existing as Profile);
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (!isCurrent()) return;
    setRoles(((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role));
  }, []);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event === "SIGNED_OUT") {
        activeUserId.current = null;
        setProfile(null);
        setRoles([]);
        return;
      }
      // A silent token refresh keeps the same identity — no need to reload.
      if (event === "TOKEN_REFRESHED" && next?.user?.id === activeUserId.current) return;
      // Defer supabase calls out of the callback.
      setTimeout(() => void load(next), 0);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await load(data.session);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);


  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      // Only true admin-tier roles unlock any admin entry point.
      isAdmin: roles.some((r) => r === "super_admin" || r === "admin"),

      loading,
      suspendedMessage: suspended,
      clearSuspended: () => setSuspended(null),
      refreshProfile: () => load(session),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, roles, loading, suspended, load],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Null-safe variant: returns null instead of throwing when no provider is mounted. */
export function useOptionalAuth() {
  return useContext(AuthContext);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
