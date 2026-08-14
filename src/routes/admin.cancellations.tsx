import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, RotateCcw, Search, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, adminField, ghostButton } from "@/components/admin/AdminPage";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";
import { money, statusLabel } from "@/lib/admin/data";
import type { AdminOrder } from "@/lib/admin/fulfilment";

export const Route = createFileRoute("/admin/cancellations")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cancellations · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="orders"
      eyebrow="Fulfilment"
      title="Cancellations"
      description="Every cancelled order in one place — with the reason, the value lost and a one-tap restore."
    >
      <CancellationsBoard />
    </AdminPage>
  ),
});

type CancelledOrder = AdminOrder & { payment_rejection_reason?: string | null };

function CancellationsBoard() {
  const [rows, setRows] = useState<CancelledOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "cancelled")
      .order("updated_at", { ascending: false });
    if (err) setError(err.message);
    setRows((data ?? []) as unknown as CancelledOrder[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        (o.shipping_address?.recipient ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const lostValue = filtered.reduce((sum, o) => sum + Number(o.total ?? 0), 0);

  async function restore(order: CancelledOrder) {
    setBusyId(order.id);
    const { error: err } = await supabase
      .from("orders")
      .update({ status: "processing" } as never)
      .eq("id", order.id);
    if (err) setError(err.message);
    await supabase
      .from("order_events")
      .insert({
        order_id: order.id,
        status: "processing",
        note: "Cancellation reversed from the admin console",
      } as never);
    setBusyId(null);
    await load();
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${adminField} pl-11`}
            placeholder="Search order number or customer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="rounded-lg border border-border bg-surface px-5 py-2.5 text-right">
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            {filtered.length} cancelled
          </p>
          <p className="font-display text-lg text-gold">{money(lostValue)}</p>
        </div>
      </div>

      {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Cancelled</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Reason</th>
              <th className="px-5 py-4">Value</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-gold" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                  <XCircle className="mx-auto mb-3 size-6 text-muted-foreground/60" />
                  No cancelled orders. Everything is on track.
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order.id} className="border-b border-border/60">
                  <td className="px-5 py-4 font-medium">{order.order_number}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {new Date(order.updated_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    <span className="block text-foreground">
                      {order.shipping_address?.recipient?.trim() || "—"}
                    </span>
                    <span className="text-xs">{order.shipping_address?.phone?.trim() || "—"}</span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {order.payment_rejection_reason?.trim() ||
                      order.payment_note?.trim() ||
                      "No reason recorded"}
                  </td>
                  <td className="px-5 py-4">{money(order.total)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-[9px] tracking-[0.16em] text-destructive uppercase">
                        {statusLabel(order.status)}
                      </span>
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
                        disabled={busyId === order.id}
                        onClick={() => void restore(order)}
                      >
                        <RotateCcw className="size-3.5" /> Restore
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailId ? <OrderDetailModal orderId={detailId} onClose={() => setDetailId(null)} /> : null}
    </div>
  );
}
