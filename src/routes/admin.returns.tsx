import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, adminField, ghostButton } from "@/components/admin/AdminPage";
import { DataTable, Row, Cell } from "@/components/admin/ui";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";
import { money, statusLabel } from "@/lib/admin/data";
import type { AdminReturn } from "@/lib/admin/fulfilment";

export const Route = createFileRoute("/admin/returns")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Returns · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="orders"
      eyebrow="Fulfilment"
      title="Returns"
      description="Returned orders, refund amounts and stock restoration."
    >
      <ReturnsBoard />
    </AdminPage>
  ),
});

const RETURN_STATUSES = ["requested", "approved", "refunded", "completed", "rejected"];

type Joined = AdminReturn & { orders: { order_number: string } | null };

function ReturnsBoard() {
  const [rows, setRows] = useState<Joined[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("order_returns")
      .select("*, orders(order_number)")
      .order("requested_at", { ascending: false });
    if (err) setError(err.message);
    setRows((data ?? []) as unknown as Joined[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(row: Joined, next: string) {
    const { error: err } = await supabase
      .from("order_returns")
      .update({ status: next })
      .eq("id", row.id);
    if (err) setError(err.message);
    void load();
  }

  return (
    <div>
      {error ? <p className="mb-4 text-xs text-destructive">{error}</p> : null}
      <DataTable
        columns={["Return", "Order", "Reason", "Refund", "Restocked", "Status", ""]}
        loading={loading}
        empty={rows.length === 0}
      >
        {rows.map((row) => (
          <Row key={row.id}>
            <Cell className="font-medium">{row.return_number}</Cell>
            <Cell>{row.orders?.order_number ?? "—"}</Cell>
            <Cell>{row.reason ?? "—"}</Cell>
            <Cell>{money(row.refund_amount)}</Cell>
            <Cell>{row.restocked ? "Yes" : "No"}</Cell>
            <Cell>
              <select
                aria-label="Return status"
                className={adminField}
                value={row.status}
                onChange={(e) => void setStatus(row, e.target.value)}
              >
                {RETURN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </Cell>
            <Cell className="text-right">
              <button type="button" className={ghostButton} onClick={() => setOpenId(row.order_id)}>
                View order
              </button>
            </Cell>
          </Row>
        ))}
      </DataTable>
      {openId ? <OrderDetailModal orderId={openId} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
