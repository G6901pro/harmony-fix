/**
 * Velocita Vault — Admin role & permission architecture.
 *
 * Frontend source of truth for the admin RBAC model. The backend (Lovable Cloud)
 * mirrors the same role names in the `app_role` enum, so this file can be reused
 * verbatim by future server-side guards.
 */

export const ADMIN_ROLES = ["super_admin", "admin", "manager", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

/** Higher number = more authority. Useful for "can manage this user" checks. */
export const ROLE_RANK: Record<AdminRole, number> = {
  super_admin: 40,
  admin: 30,
  manager: 20,
  staff: 10,
};

export const ADMIN_MODULES = [
  "products",
  "orders",
  "payments",
  "customers",
  "reviews",
  "inventory",
  "homepage",
  "settings",
  "coupons",
  "reports",
  "media",
  "shipping",
  "security",
] as const;
export type AdminModule = (typeof ADMIN_MODULES)[number];

export const MODULE_LABELS: Record<AdminModule, string> = {
  products: "Products",
  orders: "Orders",
  payments: "Payments",
  customers: "Customers",
  reviews: "Reviews",
  inventory: "Inventory",
  homepage: "Homepage",
  settings: "Website Settings",
  coupons: "Coupons",
  reports: "Reports",
  media: "Media Library",
  shipping: "Shipping",
  security: "Security",
};

export const ACTIONS = ["view", "create", "update", "delete", "approve"] as const;
export type AdminAction = (typeof ACTIONS)[number];

export type ModulePermissions = Partial<Record<AdminAction, boolean>>;
export type PermissionMatrix = Record<AdminModule, ModulePermissions>;

const NONE: ModulePermissions = {};
const VIEW: ModulePermissions = { view: true };
const EDIT: ModulePermissions = { view: true, create: true, update: true };
const FULL: ModulePermissions = {
  view: true,
  create: true,
  update: true,
  delete: true,
  approve: true,
};

function matrix(fill: (m: AdminModule) => ModulePermissions): PermissionMatrix {
  return Object.fromEntries(ADMIN_MODULES.map((m) => [m, fill(m)])) as PermissionMatrix;
}

/**
 * Only Super Admin holds full permissions across every module.
 * Everything below is intentionally narrower and easy to extend.
 */
export const PERMISSIONS: Record<AdminRole, PermissionMatrix> = {
  super_admin: matrix(() => FULL),
  admin: matrix((m) => {
    if (m === "security") return VIEW;
    if (m === "settings") return EDIT;
    return { view: true, create: true, update: true, delete: true };
  }),
  manager: matrix((m) => {
    if (m === "security" || m === "settings") return NONE;
    if (m === "homepage" || m === "reports") return VIEW;
    if (m === "payments") return { view: true, approve: true };
    return EDIT;
  }),
  staff: matrix((m) => {
    if (["orders", "inventory", "media"].includes(m)) return { view: true, update: true };
    if (["products", "customers", "reviews", "shipping", "coupons"].includes(m)) return VIEW;
    return NONE;
  }),
};

export function highestRole(roles: readonly AdminRole[]): AdminRole | null {
  const sorted = [...roles].sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a]);
  return sorted[0] ?? null;
}

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

export function can(
  roles: readonly AdminRole[],
  moduleName: AdminModule,
  action: AdminAction = "view",
): boolean {
  return roles.some((role) => PERMISSIONS[role]?.[moduleName]?.[action] === true);
}

export function allowedModules(roles: readonly AdminRole[]): AdminModule[] {
  return ADMIN_MODULES.filter((m) => can(roles, m, "view"));
}
