/**
 * Two-step Super Admin authentication.
 *
 * Step 1 — `requestAdminVerification`: credentials are checked on the server and
 * the email is matched against the private admin allowlist. No browser session
 * is created, so a correct password alone never opens the control room.
 * Step 2 — `confirmAdminVerification`: called only from `/admin/verify`, the page
 * the emailed verification link lands on. It records a time-boxed access grant
 * that the admin guard requires before rendering any console surface.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { permanentAdminRole } from "@/lib/admin/super-admins";

export const requestAdminVerification = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => ({
    email: String(data.email ?? "").trim().toLowerCase(),
    password: String(data.password ?? ""),
  }))
  .handler(async ({ data }) => {
    if (!data.email || data.password.length < 6) {
      throw new Error("Enter your operator email and password.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allowedRow } = await supabaseAdmin
      .from("admin_allowlist")
      .select("email, role")
      .ilike("email", data.email)
      .maybeSingle();

    // Code-level founders stay authorised even on a brand new backend.
    const permanent = permanentAdminRole(data.email);
    if (!allowedRow && permanent) {
      await supabaseAdmin
        .from("admin_allowlist")
        .upsert({ email: data.email, role: permanent }, { onConflict: "email" });
    }

    const allowed = allowedRow ?? (permanent ? { email: data.email, role: permanent } : null);


    if (!allowed) {
      throw new Error("These credentials are not authorised for admin access.");
    }

    // Locate (or provision on first run) the operator identity.
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = list?.users.find((u) => u.email?.toLowerCase() === data.email);

    if (!user) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (error) throw new Error("Unable to prepare the operator account.");
      user = created.user ?? undefined;
    }

    if (!user) throw new Error("Unable to prepare the operator account.");

    // Verify the password without ever creating a browser session.
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Authentication is not configured.");

    const checker = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const signIn = async () =>
      checker.auth.signInWithPassword({ email: data.email, password: data.password });

    let { error: signInError } = await signIn();

    if (signInError) {
      // First-time operators (allowlisted, but no admin access grant has ever
      // been issued for them) establish their password on this first sign-in.
      const { count } = await supabaseAdmin
        .from("admin_access_grants")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((count ?? 0) === 0) {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: data.password,
          email_confirm: true,
        });
        ({ error: signInError } = await signIn());
      }
    }

    if (signInError) throw new Error("Incorrect email or password.");
    await checker.auth.signOut();


    // Any older grant is retired: entry must be re-authorised by email each time.
    await supabaseAdmin
      .from("admin_access_grants")
      .update({ revoked: true })
      .eq("user_id", user.id)
      .eq("revoked", false);

    return { ok: true as const, email: data.email };
  });

export const confirmAdminVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String(context.claims.email ?? "").toLowerCase();
    if (!email) throw new Error("This session has no verified email address.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allowedRow } = await supabaseAdmin
      .from("admin_allowlist")
      .select("email, role")
      .ilike("email", email)
      .maybeSingle();

    const permanent = permanentAdminRole(email);
    if (!allowedRow && permanent) {
      await supabaseAdmin
        .from("admin_allowlist")
        .upsert({ email, role: permanent }, { onConflict: "email" });
    }

    const allowed = allowedRow ?? (permanent ? { email, role: permanent } : null);

    if (!allowed) {
      return { ok: false as const, reason: "not_authorised" as const };
    }


    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: allowed.role }, { onConflict: "user_id,role" });

    await supabaseAdmin
      .from("admin_access_grants")
      .update({ revoked: true })
      .eq("user_id", context.userId)
      .eq("revoked", false);

    const { error } = await supabaseAdmin.from("admin_access_grants").insert({
      user_id: context.userId,
      email,
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
    if (error) throw new Error("Unable to record the verification.");

    return { ok: true as const, role: allowed.role };
  });

export const revokeAdminVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("admin_access_grants")
      .update({ revoked: true })
      .eq("user_id", context.userId)
      .eq("revoked", false);
    return { ok: true as const };
  });
