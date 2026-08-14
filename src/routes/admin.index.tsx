import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeDollarSign,
  Clock,
  CreditCard,
  PackageCheck,
  ShoppingBag,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Cell, DataTable, Panel, Pill, Row, StatCard } from "@/components/admin/ui";
import { useAdminSession } from "@/lib/admin/use-admin-session";
import { ROLE_LABELS } from "@/lib/admin/permissions";
import { money, statusLabel } from "@/lib/admin/data";
import { dateTime, type CustomerProfile } from "@/lib/admin/db";
import { useOrdersRealtime } from "@/lib/admin/use-orders-realtime";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Restricted area" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: () => (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  ),
});

type OrderSummary = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  placed_at: string;
  payment_status: string;
  user_id: string;
};

type LowStockProduct = {
  id: string;
  title: string;
  slug: string;
  stock_quantity: number;
  low_stock_threshold: number;
  stock_status: string;
};

function AdminDashboard() {
  const { role, roles, email, signOut } = useAdminSession();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Single loader so the metrics can be refreshed live from realtime events.
  const load = useCallback(async () => {
    const [o, c, p] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, status, total, currency, placed_at, payment_status, user_id")
        .order("placed_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, is_blocked, blocked_at, deleted_at, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("id, title, slug, stock_quantity, low_stock_threshold, stock_status"),
    ]);
    const products = (p.data ?? []) as LowStockProduct[];
    setOrders((o.data ?? []) as OrderSummary[]);
    setCustomers((c.data ?? []) as CustomerProfile[]);
    setProductCount(products.length);
    setLowStock(
      products
        .filter((x) => x.stock_quantity <= (x.low_stock_threshold ?? 5))
        .sort((a, b) => a.stock_quantity - b.stock_quantity)
        .slice(0, 8),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOrdersRealtime(load, "admin-dashboard");

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.payment_status === "approved" || o.status === "delivered");
    const revenue = paid.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    return {
      revenue,
      totalSales: orders.length,
      pendingOrders: orders.filter((o) =>
        [
          "order_pending",
          "pending_payment",
          "payment_under_review",
          "payment_approved",
          "order_confirmed",
          "processing",
          "packed",
        ].includes(o.status),
      ).length,

      pendingPayments: orders.filter(
        (o) => o.payment_status === "pending" || o.payment_status === "under_review",
      ).length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      customers: customers.length,
      blocked: customers.filter((c) => c.is_blocked).length,
    };
  }, [orders, customers]);

  return (
    <AdminShell role={role} roles={roles} email={email} onSignOut={() => void signOut()}>
      <div className="border-b border-border pb-6">
        <p className="eyebrow">Velocita Vault</p>
        <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
          Dashboard overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Signed in as {role ? ROLE_LABELS[role] : "—"}. Live trading, fulfilment and inventory
          signals across the vault.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Revenue"
          value={money(stats.revenue)}
          hint="Approved payments & delivered orders"
          icon={<BadgeDollarSign className="size-4" />}
        />
        <StatCard
          label="Total sales"
          value={stats.totalSales}
          hint="All orders placed"
          icon={<ShoppingBag className="size-4" />}
        />
        <StatCard
          label="Pending orders"
          value={stats.pendingOrders}
          hint="Awaiting fulfilment"
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Pending payments"
          value={stats.pendingPayments}
          hint="Manual transfers to verify"
          icon={<CreditCard className="size-4" />}
        />
        <StatCard
          label="Delivered orders"
          value={stats.delivered}
          hint="Completed journeys"
          icon={<PackageCheck className="size-4" />}
        />
        <StatCard
          label="Customers"
          value={stats.customers}
          hint={`${stats.blocked} blocked · ${productCount} products live`}
          icon={<Users className="size-4" />}
        />
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel
          title="Low stock products"
          description="At or below their alert threshold."
          actions={
            <Link
              to="/admin/products"
              className="text-[10px] tracking-[0.2em] text-gold uppercase hover:underline"
            >
              Inventory
            </Link>
          }
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every product is comfortably stocked.</p>
          ) : (
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{p.title}</p>
                    <p className="truncate text-xs text-muted-foreground">/{p.slug}</p>
                  </div>
                  <span className="flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="size-3.5" />
                    {p.stock_quantity} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recent customers"
          actions={
            <Link
              to="/admin/customers"
              className="text-[10px] tracking-[0.2em] text-gold uppercase hover:underline"
            >
              All customers
            </Link>
          }
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No customer accounts yet.</p>
          ) : (
            <ul className="space-y-3">
              {customers.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{c.full_name ?? "Unnamed"}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.email ?? "—"}</p>
                  </div>
                  {c.is_blocked ? <Pill tone="danger">Blocked</Pill> : <Pill tone="muted">Active</Pill>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg tracking-tight">Recent orders</h2>
          <Link
            to="/admin/orders"
            className="text-[10px] tracking-[0.2em] text-gold uppercase hover:underline"
          >
            All orders
          </Link>
        </div>
        <DataTable
          columns={["Order", "Placed", "Status", "Payment", "Total"]}
          loading={loading}
          empty={orders.length === 0}
        >
          {orders.slice(0, 8).map((o) => (
            <Row key={o.id}>
              <Cell>
                <span className="font-medium text-foreground">{o.order_number}</span>
              </Cell>
              <Cell className="text-muted-foreground">{dateTime(o.placed_at)}</Cell>
              <Cell>
                <Pill>{statusLabel(o.status)}</Pill>
              </Cell>
              <Cell>
                <Pill
                  tone={
                    o.payment_status === "approved"
                      ? "success"
                      : o.payment_status === "rejected"
                        ? "danger"
                        : "muted"
                  }
                >
                  {statusLabel(o.payment_status)}
                </Pill>
              </Cell>
              <Cell>{money(Number(o.total))}</Cell>
            </Row>
          ))}
        </DataTable>
      </section>
    </AdminShell>
  );
}
