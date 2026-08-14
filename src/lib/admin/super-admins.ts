/**
 * Permanent, code-level super admin allowlist.
 *
 * The database `admin_allowlist` table is environment-specific: a new preview
 * server or a fresh backend starts empty, which used to lock the founder out
 * with "These credentials are not authorised for admin access".
 * These addresses are authorised by the codebase itself, so admin access
 * survives any server, preview or database switch. The server self-heals the
 * database row on first sign-in so all role logic keeps working normally.
 */
export const PERMANENT_SUPER_ADMINS = ["arabikabir302@gmail.com"] as const;

export function permanentAdminRole(email: string): "super_admin" | null {
  const normalized = email.trim().toLowerCase();
  return PERMANENT_SUPER_ADMINS.some((e) => e === normalized) ? "super_admin" : null;
}
