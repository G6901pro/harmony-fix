import { Fragment, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, adminField, adminLabel, ghostButton } from "@/components/admin/AdminPage";
import { money, ORDER_STATUSES, statusLabel, type OrderStatus } from "@/lib/admin/data";
import { useOrdersRealtime } from "@/lib/admin/use-orders-realtime";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";

export const Route = createFileRoute("/admin/orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Orders & payments · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="orders"
      eyebrow="Fulfilment"
      title="Orders & payments"
      description="Track every order, move it through fulfilment and verify bKash / Nagad transaction IDs."
    >
      <OrdersBoard />
    </AdminPage>
  ),
});

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  currency: string;
  total: number;
  placed_at: string;
  payment_method: string | null;
  payment_provider: string | null;
  payment_txn_id: string | null;
  payment_verified: boolean;
  payment_note: string | null;
  courier: string | null;
  tracking_number: string | null;
  payment_status: string;
  shipping_address: { phone?: string | null; recipient?: string | null } | null;
};

const PROVIDERS = ["bkash", "nagad", "card", "cod", "bank_transfer"];
const PROVIDER_LABELS: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
  cod: "Cash on delivery",
  bank_transfer: "Bank transfer",
};

/**
 * Workload views. "Active" is the default board: it hides everything that has
 * already left the pipeline (delivered, cancelled, returned) so the team only
 * sees orders that still need work.
 */
const CLOSED_STATUSES: OrderStatus[] = ["delivered", "cancelled", "returned"];

const VIEWS = [
  { id: "active", label: "Active" },
  { id: "needs_action", label: "Needs action" },
  { id: "in_transit", label: "In transit" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

const VIEW_MATCHERS: Record<ViewId, (o: OrderRow) => boolean> = {
  active: (o) => !CLOSED_STATUSES.includes(o.status),
  needs_action: (o) =>
    ["pending_payment", "payment_under_review", "payment_approved", "order_confirmed"].includes(
      o.status,
    ),
  in_transit: (o) => ["processing", "packed", "shipped", "out_for_delivery"].includes(o.status),
  delivered: (o) => o.status === "delivered",
  cancelled: (o) => o.status === "cancelled" || o.status === "returned",
  all: () => true,
};



function OrdersBoard() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<ViewId>("active");
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("orders")
      .select("*")
      .order("placed_at", { ascending: false });
    if (err) setError(err.message);
    setRows((data ?? []) as OrderRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  // Live updates: any new order or payment change re-renders the board.
  useOrdersRealtime(load, "admin-orders-board");

  const counts = useMemo(() => {
    const map = {} as Record<ViewId, number>;
    for (const v of VIEWS) map[v.id] = rows.filter(VIEW_MATCHERS[v.id]).length;
    return map;
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((o) => {
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          o.order_number.toLowerCase().includes(q) ||
          (o.payment_txn_id ?? "").toLowerCase().includes(q);
        return (
          matchesQuery &&
          VIEW_MATCHERS[view](o) &&
          (status === "all" || o.status === status)
        );
      }),
    [rows, query, status, view],
  );

  async function patch(order: OrderRow, changes: Partial<OrderRow>) {
    setRows((list) => list.map((o) => (o.id === order.id ? { ...o, ...changes } : o)));
    const { error: err } = await supabase.from("orders").update(changes).eq("id", order.id);
    if (err) setError(err.message);
    if (changes.status) {
      await supabase
        .from("order_events")
        .insert({ order_id: order.id, status: changes.status, note: "Updated from admin console" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Order views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-semibold tracking-[0.18em] uppercase transition-colors ${
              view === v.id
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
            }`}
          >
            {v.label}
            <span className="rounded-full bg-background/60 px-2 py-0.5 text-[9px]">
              {counts[v.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${adminField} pl-11`}
            placeholder="Search order number or transaction ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className={adminField}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Placed</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Payment</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Verify</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-gold" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  No orders in this view.
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <Fragment key={order.id}>
                  <tr className="border-b border-border/60">
                    <td className="px-5 py-4 font-medium">{order.order_number}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(order.placed_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      <span className="block text-foreground">
                        {order.shipping_address?.recipient?.trim() || "—"}
                      </span>
                      <span className="text-xs">
                        {order.shipping_address?.phone?.trim() || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">{money(order.total)}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {PROVIDER_LABELS[order.payment_provider ?? ""] ??
                        order.payment_method ??
                        "—"}
                      {order.payment_txn_id ? (
                        <span className="ml-2 text-xs">#{order.payment_txn_id}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        aria-label={`Status for ${order.order_number}`}
                        className={adminField}
                        value={order.status}
                        onChange={(e) =>
                          void patch(order, { status: e.target.value as OrderStatus })
                        }
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {statusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {order.payment_verified ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-1.5 text-[9px] tracking-[0.16em] text-gold uppercase">
                            <CheckCircle2 className="size-3" /> Verified
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className={ghostButton}
                          onClick={() => setDetailId(order.id)}
                        >
                          View order
                        </button>
                        <button
                          type="button"
                          className={ghostButton}
                          onClick={() => setOpenId(openId === order.id ? null : order.id)}
                        >
                          {openId === order.id ? "Close" : "Payment"}
                        </button>
                      </div>
                    </td>

                  </tr>
                  {openId === order.id ? (
                    <tr className="border-b border-border/60 bg-background/40">
                      <td colSpan={7} className="px-5 py-6">
                        <div className="grid gap-5 md:grid-cols-4">
                          <div>
                            <span className={adminLabel}>Provider</span>
                            <select
                              className={adminField}
                              value={order.payment_provider ?? ""}
                              onChange={(e) =>
                                void patch(order, { payment_provider: e.target.value })
                              }
                            >
                              <option value="">—</option>
                              {PROVIDERS.map((p) => (
                                <option key={p} value={p}>
                                  {PROVIDER_LABELS[p]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span className={adminLabel}>Transaction ID</span>
                            <input
                              className={adminField}
                              placeholder="e.g. 9F7KD21XZ"
                              maxLength={64}
                              defaultValue={order.payment_txn_id ?? ""}
                              onBlur={(e) =>
                                void patch(order, { payment_txn_id: e.target.value.trim() })
                              }
                            />
                          </div>
                          <div className="md:col-span-2">
                            <span className={adminLabel}>Verification note</span>
                            <input
                              className={adminField}
                              placeholder="Matched against bKash statement…"
                              maxLength={300}
                              defaultValue={order.payment_note ?? ""}
                              onBlur={(e) => void patch(order, { payment_note: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            className={ghostButton}
                            onClick={() =>
                              void patch(order, {
                                payment_verified: true,
                                payment_status: "approved",
                                status: "payment_approved",
                              })
                            }
                          >
                            <ShieldCheck className="size-3.5" /> Mark verified & approve
                          </button>
                          <button
                            type="button"
                            className={ghostButton}
                            onClick={() =>
                              void patch(order, {
                                payment_verified: false,
                                payment_status: "under_review",
                                status: "payment_under_review",
                              })
                            }
                          >
                            Flag for review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {detailId ? <OrderDetailModal orderId={detailId} onClose={() => setDetailId(null)} /> : null}
    </div>
  );
}
