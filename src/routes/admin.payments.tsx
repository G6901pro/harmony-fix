import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, dangerButton, ghostButton, goldButton } from "@/components/admin/AdminPage";
import {
  Cell,
  DataTable,
  ErrorText,
  Field,
  Modal,
  Pill,
  Row,
  Select,
  StatCard,
  TextArea,
} from "@/components/admin/ui";
import { RECEIPT_BUCKET, money, resolveMediaUrls, statusLabel } from "@/lib/admin/data";
import { useOrdersRealtime } from "@/lib/admin/use-orders-realtime";
import {
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_STATUSES,
  dateTime,
  logActivity,
} from "@/lib/admin/db";

export const Route = createFileRoute("/admin/payments")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Payments · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="payments"
      eyebrow="Finance"
      title="Payment verification"
      description="Review manual bKash and Dutch-Bangla transfers, inspect screenshots and approve or reject each payment."
    >
      <PaymentsModule />
    </AdminPage>
  ),
});

type PaymentOrder = {
  id: string;
  order_number: string;
  total: number;
  currency: string;
  placed_at: string;
  status: string;
  payment_provider: string | null;
  payment_method: string | null;
  payment_txn_id: string | null;
  payment_status: string;
  payment_screenshot: string | null;
  payment_note: string | null;
  payment_rejection_reason: string | null;
  payment_reviewed_at: string | null;
  shipping_address: {
    phone?: string | null;
    recipient?: string | null;
    email?: string | null;
  } | null;
};

const phoneOf = (o: PaymentOrder) => o.shipping_address?.phone?.trim() || "—";
const nameOf = (o: PaymentOrder) => o.shipping_address?.recipient?.trim() || "—";
const emailOf = (o: PaymentOrder) => o.shipping_address?.email?.trim() || "—";
/** The sender number is captured in the payment note as "Sender: 01…". */
const senderOf = (o: PaymentOrder) =>
  o.payment_note?.match(/Sender:\s*([^\s·]+)/)?.[1]?.trim() || "—";
/** Manual transfers awaiting a decision. */
const isAwaiting = (status: string) => status === "under_review" || status === "pending";

function PaymentsModule() {
  const [rows, setRows] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("under_review");
  const [shots, setShots] = useState<Record<string, string | null>>({});
  const [active, setActive] = useState<PaymentOrder | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("orders")
      .select(
        "id, order_number, total, currency, placed_at, status, payment_provider, payment_method, payment_txn_id, payment_status, payment_screenshot, payment_note, payment_rejection_reason, payment_reviewed_at, shipping_address",
      )
      .order("placed_at", { ascending: false });
    if (err) setError(err.message);
    const list = (data ?? []) as PaymentOrder[];
    setRows(list);
    setLoading(false);
    // Receipts live in the private payment-receipts bucket.
    setShots(await resolveMediaUrls(list.map((o) => o.payment_screenshot), RECEIPT_BUCKET));
  }

  useEffect(() => {
    void load();
  }, []);

  // Live updates: new payment proofs appear without a manual refresh.
  useOrdersRealtime(load, "admin-payments");

  const visible = useMemo(
    () =>
      rows.filter((o) =>
        filter === "all"
          ? true
          : filter === "under_review"
            ? isAwaiting(o.payment_status)
            : o.payment_status === filter,
      ),
    [rows, filter],
  );

  const stats = useMemo(
    () => ({
      pending: rows.filter((o) => isAwaiting(o.payment_status)).length,
      approved: rows.filter((o) => o.payment_status === "approved").length,
      rejected: rows.filter((o) => o.payment_status === "rejected").length,
      value: rows
        .filter((o) => o.payment_status === "approved")
        .reduce((s, o) => s + Number(o.total ?? 0), 0),
    }),
    [rows],
  );

  async function decide(order: PaymentOrder, next: "approved" | "rejected", note?: string) {
    const { data: me } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("orders")
      .update({
        payment_status: next,
        payment_verified: next === "approved",
        payment_rejection_reason: next === "rejected" ? (note ?? null) : null,
        payment_reviewed_at: new Date().toISOString(),
        payment_reviewed_by: me.user?.id ?? null,
        // Approval confirms the order; rejection cancels it.
        status: next === "approved" ? ("order_confirmed" as const) : ("cancelled" as const),
      })
      .eq("id", order.id);
    if (err) return setError(err.message);
    void logActivity(`payment.${next}`, "orders", order.id, { order: order.order_number });
    setActive(null);
    setReason("");
    void load();
  }


  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting review" value={stats.pending} />
        <StatCard label="Approved" value={stats.approved} />
        <StatCard label="Rejected" value={stats.rejected} />
        <StatCard label="Verified value" value={money(stats.value)} />
      </div>

      <div className="mt-6 max-w-xs">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter payments">
          <option value="all">All payments</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
      </div>

      <ErrorText message={error} />

      <div className="mt-6">
        <DataTable
          columns={["Order", "Phone", "Method", "Transaction", "Amount", "Placed", "Status", "Actions"]}
          loading={loading}
          empty={visible.length === 0}
          minWidth={1000}
        >
          {visible.map((o) => (
            <Row key={o.id}>
              <Cell>
                <span className="font-medium text-foreground">{o.order_number}</span>
              </Cell>
              <Cell className="text-muted-foreground">{phoneOf(o)}</Cell>
              <Cell className="text-muted-foreground">
                {PAYMENT_PROVIDER_LABELS[o.payment_provider ?? o.payment_method ?? ""] ??
                  o.payment_provider ??
                  o.payment_method ??
                  "—"}
              </Cell>
              <Cell className="text-xs text-muted-foreground">{o.payment_txn_id ?? "—"}</Cell>
              <Cell>{money(Number(o.total))}</Cell>
              <Cell className="text-xs text-muted-foreground">{dateTime(o.placed_at)}</Cell>
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
              <Cell>
                <div className="flex justify-end gap-2">
                  <button type="button" className={ghostButton} onClick={() => setActive(o)}>
                    Review
                  </button>
                </div>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `Payment · ${active.order_number}` : ""}
        wide
      >
        {active ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Order ID" value={active.order_number} />
              <Info label="Placed" value={dateTime(active.placed_at)} />
              <Info label="Customer" value={nameOf(active)} />
              <Info label="Customer phone" value={phoneOf(active)} />
              <Info label="Customer email" value={emailOf(active)} />
              <Info label="Method" value={PAYMENT_PROVIDER_LABELS[active.payment_provider ?? ""] ?? active.payment_provider ?? "—"} />
              <Info label="Sender number" value={senderOf(active)} />
              <Info label="Transaction ID" value={active.payment_txn_id ?? "—"} />
              <Info label="Amount" value={money(Number(active.total))} />
              <Info label="Reviewed" value={dateTime(active.payment_reviewed_at)} />
            </div>
            {active.payment_note ? (
              <p className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                {active.payment_note}
              </p>
            ) : null}
            <div>
              <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                Payment screenshot
              </p>
              {shots[active.payment_screenshot ?? ""] ? (
                <img
                  src={shots[active.payment_screenshot ?? ""] as string}
                  alt={`Payment proof for ${active.order_number}`}
                  className="max-h-[420px] w-full rounded-lg border border-border object-contain"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No screenshot uploaded.</p>
              )}
            </div>
            <Field label="Rejection reason (sent with a rejection)">
              <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className={dangerButton}
                onClick={() => void decide(active, "rejected", reason)}
              >
                <X className="size-3.5" /> Reject
              </button>
              <button
                type="button"
                className={goldButton}
                onClick={() => void decide(active, "approved")}
              >
                <Check className="size-3.5" /> Approve payment
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}
