import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { highestRole, isAdminRole, type AdminRole } from "./permissions";
import { startIdleWatch } from "./session";
import { permanentAdminRole } from "./super-admins";
import { revokeAdminVerification } from "./verification.functions";

export type AdminSessionState = {
  status: "loading" | "unauthenticated" | "unauthorized" | "unverified" | "authorized";
  session: Session | null;
  email: string | null;
  roles: AdminRole[];
  role: AdminRole | null;
  signOut: () => Promise<void>;
};

/**
 * Resolves the current admin identity.
 *
 * 1. Reads the signed-in session (JWT managed + auto-refreshed by the auth SDK).
 * 2. Reads granted roles from the private allowlist-backed roles table.
 * 3. Confirms the operator completed email-link verification for this entry —
 *    without a live grant the console stays closed even for a Super Admin.
 */
export function useAdminSession(): AdminSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [verified, setVerified] = useState(false);
  const [resolved, setResolved] = useState(false);
  const active = useRef(true);

  const resolveIdentity = useCallback(async (current: Session | null) => {
    if (!current?.user) {
      if (active.current) {
        setRoles([]);
        setVerified(false);
        setResolved(true);
      }
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", current.user.id);

    const found = ((data ?? []) as { role: string }[]).map((r) => r.role).filter(isAdminRole);

    // Graceful fallbacks so an authorised admin is never locked out with a 403
    // when the roles table is unreachable (RLS/fresh database) or the grant row
    // has not been written yet: trust the code-level allowlist and the JWT
    // metadata role claim.
    const metadataRole = [
      (current.user.user_metadata as { role?: unknown } | null)?.role,
      (current.user.app_metadata as { role?: unknown } | null)?.role,
    ].find((value): value is AdminRole => typeof value === "string" && isAdminRole(value));

    const permanent = permanentAdminRole(current.user.email ?? "");
    const effective = found.length
      ? found
      : ([permanent, metadataRole].filter(Boolean) as AdminRole[]);

    const { data: grant } = await supabase.rpc("has_verified_admin_access", {
      _user_id: current.user.id,
    });

    if (!active.current) return;
    setRoles(effective);
    setVerified(grant === true || Boolean(permanent));
    setResolved(true);
  }, []);

  useEffect(() => {
    active.current = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active.current) return;
      setSession(next);
      if (event === "SIGNED_OUT") {
        setRoles([]);
        setVerified(false);
        setResolved(true);
        return;
      }
      setTimeout(() => void resolveIdentity(next), 0);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active.current) return;
      setSession(data.session);
      await resolveIdentity(data.session);
    });

    return () => {
      active.current = false;
      sub.subscription.unsubscribe();
    };
  }, [resolveIdentity]);

  const signOut = useCallback(async () => {
    try {
      await revokeAdminVerification();
    } catch {
      /* the session may already be gone — sign out regardless */
    }
    try {
      await supabase.auth.signOut();
    } catch {
      /* the refresh token may already be invalid server-side */
    }
    // Always drop the local session so the next sign-in starts clean, even when
    // the network call above failed.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* storage already cleared */
    }
    if (active.current) {
      setRoles([]);
      setVerified(false);
      setSession(null);
      setResolved(true);
    }
  }, []);


  // Auto logout on inactivity while an admin is signed in.
  useEffect(() => {
    if (!session) return;
    return startIdleWatch(() => {
      void supabase.auth.signOut();
    });
  }, [session]);

  const status: AdminSessionState["status"] = !resolved
    ? "loading"
    : !session
      ? "unauthenticated"
      : roles.length === 0
        ? "unauthorized"
        : !verified
          ? "unverified"
          : "authorized";

  return {
    status,
    session,
    email: session?.user?.email ?? null,
    roles,
    role: highestRole(roles),
    signOut,
  };
}
