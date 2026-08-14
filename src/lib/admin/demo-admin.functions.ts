/**
 * Preview helper: provisions the demo Super Admin account in the backend so the
 * console runs on a real authenticated session (RLS-safe writes, uploads).
 */
import { createServerFn } from "@tanstack/react-start";

const EMAIL = "arabikabir302@gmail.com";
const PASSWORD = "admin123456";

export const ensureDemoAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list?.users.find((u) => u.email?.toLowerCase() === EMAIL);

  if (!user) {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = created.user ?? undefined;
  } else {
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
    });
  }

  if (!user) throw new Error("Unable to provision the demo admin account.");

  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: user.id, role: "super_admin" }, { onConflict: "user_id,role" });

  return { ok: true };
});