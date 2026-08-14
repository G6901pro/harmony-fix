import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, adminField, ghostButton } from "@/components/admin/AdminPage";
import { DataTable, Row, Cell } from "@/components/admin/ui";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";
import { statusLabel } from "@/lib/admin/data";
import type { AdminDelivery } from "@/lib/admin/fulfilment";

export const Route = createFileRoute("/admin/deliveries")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Deliveries · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="orders"
      eyebrow="Fulfilment"
      title="Deliveries"
      description="Every order that has left the workshop, with courier, tracking and delivery state."
    >
      <DeliveriesBoard />
    </AdminPage>
  ),
});

const DELIVERY_STATUSES = ["pending", "in_transit", "out_for_delivery", "delivered", "returned"];

type Joined = AdminDelivery & { orders: { order_number: string; total: number } | null };

function DeliveriesBoard() {
  const [rows, setRows] = useState<Joined[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("deliveries")
      .select("*, orders(order_number, total)")
      .order("updated_at", { ascending: false });
    if (err) setError(err.message);
    setRows((data ?? []) as unknown as Joined[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => status === "all" || r.delivery_status === status),
    [rows, status],
  );

  async function setDeliveryStatus(row: Joined, next: string) {
    setRows((list) =>
      list.map((r) => (r.id === row.id ? { ...r, delivery_status: next } : r)),
    );
    const { error: err } = await supabase
      .from("deliveries")
      .update({
        delivery_status: next,
        delivered_at: next === "delivered" ? new Date().toISOString() : row.delivered_at,
      })
      .eq("id", row.id);
    if (err) setError(err.message);
    void load();
  }

  return (
    <div>
      <select
        className={`${adminField} max-w-xs`}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Filter deliveries"
      >
        <option value="all">All delivery states</option>
        {DELIVERY_STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>

      {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}

      <div className="mt-6">
        <DataTable
          columns={["Order", "Recipient", "Courier", "Tracking", "State", ""]}
          loading={loading}
          empty={filtered.length === 0}
        >
          {filtered.map((row) => (
            <Row key={row.id}>
              <Cell className="font-medium">{row.orders?.order_number ?? "—"}</Cell>
              <Cell>
                <span className="block">{row.recipient_name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{row.recipient_phone ?? "—"}</span>
              </Cell>
              <Cell>{row.courier ?? "—"}</Cell>
              <Cell>{row.tracking_number ?? "—"}</Cell>
              <Cell>
                <select
                  aria-label="Delivery state"
                  className={adminField}
                  value={row.delivery_status}
                  onChange={(e) => void setDeliveryStatus(row, e.target.value)}
                >
                  {DELIVERY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </Cell>
              <Cell className="text-right">
                <button
                  type="button"
                  className={ghostButton}
                  onClick={() => setOpenId(row.order_id)}
                >
                  View order
                </button>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>

      {openId ? <OrderDetailModal orderId={openId} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
