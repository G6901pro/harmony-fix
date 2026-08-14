/**
 * Bearer-token attacher for server functions.
 *
 * Replaces the generated `attachSupabaseAuth`: reading the session can reject
 * (expired refresh token, offline, a session left behind by a previous user),
 * and an unhandled rejection there surfaces to the user as a bare
 * "Load failed" instead of the real result. Here a failed session read simply
 * means "no bearer token" — the server then answers with a proper 401 or
 * handles the call as anonymous.
 */
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const attachSupabaseAuthSafe = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error) token = data.session?.access_token;
    } catch {
      /* stale or unreadable session — continue without a bearer token */
    }
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
