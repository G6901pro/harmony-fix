import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ROLE_LABELS, can, type AdminRole } from "@/lib/admin/permissions";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { permanentAdminRole } from "@/lib/admin/super-admins";
import { useAdminInbox, type AdminInboxScope } from "@/lib/admin/use-admin-inbox";
import { useAdminSession } from "@/lib/admin/use-admin-session";

export function AdminShell({
  role,
  email,
  roles = [],
  onSignOut,
  children,
}: {
  role: AdminRole | null;
  email: string | null;
  roles?: readonly AdminRole[];
  onSignOut: () => void;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useAdminSession();
  const userId = session?.user?.id ?? null;
  const { counts, markSeen } = useAdminInbox(userId);
  const isOwner = Boolean(email && permanentAdminRole(email));

  // Opening a screen clears its red badge.
  useEffect(() => {
    if (pathname.startsWith("/admin/orders")) void markSeen("orders");
    if (pathname.startsWith("/admin/payments")) void markSeen("payments");
  }, [pathname, markSeen]);

  const items = ADMIN_NAV.filter(
    (item) =>
      (!item.module || can(roles, item.module, "view")) && (!item.superAdminOnly || isOwner),
  );

  const badgeCount = (scope?: AdminInboxScope) => (scope ? (counts[scope] ?? 0) : 0);


  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-5 py-3 lg:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <Logo compact />
            <span className="hidden rounded-full border border-gold/30 px-3 py-1 text-[9px] tracking-[0.24em] text-gold uppercase sm:inline">
              Control Room
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-foreground">{email}</p>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {role ? ROLE_LABELS[role] : "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] gap-8 px-5 py-8 lg:px-10">
        <nav
          aria-label="Admin modules"
          className="hidden w-56 shrink-0 lg:block"
        >
          <ul className="sticky top-24 space-y-1">
            {items.map((item) => {
              const active =
                item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
              const unread = badgeCount(item.badge);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs tracking-[0.08em] transition-colors ${
                      active
                        ? "border border-gold/40 bg-gold/10 text-gold"
                        : unread > 0
                          ? "border border-destructive/50 bg-destructive/5 text-foreground"
                          : "border border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <item.icon className="size-4" />
                    <span className="flex-1">{item.label}</span>
                    {unread > 0 ? (
                      <span
                        aria-label={`${unread} unread`}
                        className="grid min-w-5 place-items-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground"
                      >
                        {unread > 99 ? "99+" : unread}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}

          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[10px] tracking-[0.16em] text-muted-foreground uppercase hover:border-gold/60 hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
