import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, FileText, Heart, Package, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useVipStatus } from "@/lib/vip";
import { VipBadge } from "@/components/account/VipBadge";
import { PageHead, Panel, Empty } from "@/components/account/ui";
import { STATUS_LABEL, formatDate, money, type OrderStatus } from "@/lib/account-data";

export const Route = createFileRoute("/_authenticated/account/")({
  component: OverviewPage,
});

function Stat({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Package;
  label: string;
  value: string | number;
  to: string;
}) {
  return (
    <Link to={to} className="lux-card block p-5">
      <Icon className="size-5 text-gold" />
      <p className="mt-4 font-display text-2xl">{value}</p>
      <p className="mt-1 text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
        {label}
      </p>
    </Link>
  );
}

function OverviewPage() {
  const { user, profile } = useAuth();
  const vip = useVipStatus(user?.id);

  const { data } = useQuery({
    queryKey: ["account-overview", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [orders, wishlist, invoices, notifications] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, total, placed_at")
          .order("placed_at", { ascending: false }),
        supabase.from("wishlist_items").select("id"),
        supabase.from("invoices").select("id"),
        supabase.from("notifications").select("id").eq("is_read", false),
      ]);
      return {
        orders: orders.data ?? [],
        wishlist: wishlist.data?.length ?? 0,
        invoices: invoices.data?.length ?? 0,
        unread: notifications.data?.length ?? 0,
      };
    },
  });

  const orders = data?.orders ?? [];
  const active = orders.filter(
    (o) => !["delivered", "cancelled", "returned"].includes(o.status),
  );
  const spend = orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="Member dashboard"
        title={`Good to see you, ${profile?.full_name?.split(" ")[0] ?? "collector"}`}
        subtitle="A private view of your orders, deliveries and saved pieces."
      />

      {vip.isVip ? (
        <div>
          <VipBadge label={vip.member?.tier || vip.settings.tier_label} />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Package} label="Orders placed" value={orders.length} to="/account/orders" />
        <Stat icon={Truck} label="In progress" value={active.length} to="/account/orders" />
        <Stat icon={Heart} label="Wishlist" value={data?.wishlist ?? 0} to="/account/wishlist" />
        <Stat icon={Bell} label="Unread alerts" value={data?.unread ?? 0} to="/account/notifications" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Recent orders</h2>
            <Link to="/account/orders" className="text-xs text-gold hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {orders.length === 0 ? (
              <Empty title="No orders yet" hint="Your first Velocita piece will appear here." />
            ) : (
              orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  to="/account/tracking/$id"
                  params={{ id: order.id }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background px-4 py-3 transition-colors hover:border-gold/40"
                >
                  <div>
                    <p className="text-sm">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.placed_at)}
                    </p>
                  </div>
                  <span className="text-[10px] tracking-[0.2em] text-gold uppercase">
                    {STATUS_LABEL[order.status as OrderStatus]}
                  </span>
                  <span className="font-display text-base">{money(order.total)}</span>
                </Link>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="font-display text-lg">Account summary</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Lifetime spend</dt>
              <dd className="font-display text-gold">{money(spend)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Invoices</dt>
              <dd>{data?.invoices ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate">{profile?.email ?? user?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{profile?.phone || "Not set"}</dd>
            </div>
          </dl>
          <Link
            to="/account/invoices"
            className="mt-6 inline-flex items-center gap-2 text-xs text-gold hover:underline"
          >
            <FileText className="size-3.5" /> Invoices &amp; receipts
          </Link>
        </Panel>
      </div>
    </div>
  );
}
