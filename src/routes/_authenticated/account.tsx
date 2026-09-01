import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CreditCard,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Star,
  UserRound,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { Outlet } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { badgesFromSnapshot, categoryForPath } from "@/lib/account-badges";
import { useNotificationBadges } from "@/lib/notification-badges";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountLayout,
});


const NAV = [
  { to: "/account", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/account/profile", label: "Profile", icon: UserRound },
  { to: "/account/orders", label: "Orders", icon: Package, badge: "orders" },
  { to: "/account/wishlist", label: "Wishlist", icon: Heart },
  { to: "/account/addresses", label: "Addresses", icon: MapPin },
  { to: "/account/payments", label: "Payment Methods", icon: CreditCard, badge: "payments" },
  { to: "/account/invoices", label: "Invoices", icon: FileText, badge: "invoices" },
  { to: "/account/reviews", label: "My Reviews", icon: Star, badge: "reviews" },
  { to: "/account/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
] as const;

/** Small gold pill with a soft glow, shown only when the count is above zero. */
function NavBadge({ count }: { count: number }) {
  if (!Number.isFinite(count) || count <= 0) return null;
  return (
    <span
      aria-label={`${count} needing attention`}
      className="ml-auto inline-grid min-w-[22px] animate-pulse place-items-center rounded-full bg-[image:var(--gradient-gold)] px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-[0_0_12px_rgba(212,175,55,0.65)]"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function AccountLayout() {
  const { profile, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const badgeState = useNotificationBadges();
  const badges = badgesFromSnapshot({
    total: badgeState.total,
    categories: badgeState.categories,
  });

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Viewing a section marks that category's notifications as read.
  useEffect(() => {
    const category = categoryForPath(pathname);
    if (!category || !user?.id) return;
    if ((badgeState.categories[category] ?? 0) === 0) return;
    void badgeState.clear(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user?.id, badgeState.categories]);

  // Live refresh whenever the customer's orders change (notifications are
  // already handled by the realtime subscription inside the badge hook).
  useEffect(() => {
    if (!user?.id) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`account-badges-${user.id}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
          () => void queryClient.invalidateQueries({ queryKey: ["notification-badges"] }),
        )
        .subscribe();
    } catch (error) {
      console.error("[account] badge realtime unavailable", error);
    }
    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        /* teardown must never throw */
      }
    };
  }, [user?.id, queryClient]);


  useEffect(() => {
    setOpen(false);
  }, []);

  const initials = useMemo(() => {
    const source = profile?.full_name || profile?.email || user?.email || "V";
    return source
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [profile, user]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-5 py-4 lg:px-10">
          <Link to="/" aria-label="Velocita Vault home">
            <Logo compact />
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <Link
                to="/admin"
                className="hidden items-center gap-2 rounded-full border border-gold/40 px-4 py-2 text-[10px] tracking-[0.22em] text-gold uppercase sm:inline-flex"
              >
                <ShieldCheck className="size-3.5" /> Admin
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Account menu"
              className="grid size-10 place-items-center rounded-full text-muted-foreground hover:text-gold lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-5 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-10 lg:py-12">
        <aside
          className={cn(
            "lux-card h-max p-3 lg:sticky lg:top-24 lg:block",
            open ? "block" : "hidden",
          )}
        >
          <div className="flex items-center gap-3 border-b border-border px-3 pb-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="size-11 rounded-full object-cover"
              />
            ) : (
              <span className="grid size-11 place-items-center rounded-full bg-[image:var(--gradient-gold)] text-sm font-semibold text-primary-foreground">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {profile?.full_name || "Velocita member"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.email || user?.email}
              </p>
            </div>
          </div>

          <nav className="mt-3 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: "exact" in item ? item.exact : false }}
                activeProps={{
                  className: "bg-secondary text-gold border-gold/30",
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground",
                  "badge" in item && badges[item.badge] > 0
                    ? "border-gold/25 text-foreground shadow-[0_0_18px_-6px_rgba(212,175,55,0.55)]"
                    : "",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
                {"badge" in item ? <NavBadge count={badges[item.badge] ?? 0} /> : null}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-destructive"
            >
              <LogOut className="size-4 shrink-0" /> Logout
            </button>
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
