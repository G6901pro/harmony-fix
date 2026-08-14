import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { money, statusLabel } from "@/lib/admin/data";
import {
  addressLines,
  fetchOrderDetail,
  lineTotal,
  variantLabel,
  type OrderDetail,
} from "@/lib/admin/fulfilment";
import { resolveMediaUrl } from "@/lib/admin/data";

const PROVIDER_LABELS: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
  cod: "Cash on delivery",
  bank_transfer: "Bank transfer",
};

export function providerLabel(order: {
  payment_provider?: string | null;
  payment_method?: string | null;
}) {
  const key = order.payment_provider ?? "";
  return PROVIDER_LABELS[key] ?? order.payment_method ?? "—";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

function Money({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className={strong ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-display text-lg text-gold" : "text-foreground"}>
        {money(value)}
      </span>
    </div>
  );
}

function ItemThumb({ path, alt }: { path: string | null; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void resolveMediaUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);
  return (
    <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background/60">
      {url ? (
        <img src={url} alt={alt} className="size-full object-cover" loading="lazy" />
      ) : (
        <span className="text-[9px] text-muted-foreground">No image</span>
      )}
    </span>
  );
}

/** Full order record: customer, products, money breakdown, payment, fulfilment. */
export function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError(null);
    fetchOrderDetail(orderId)
      .then((d) => alive && setDetail(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [orderId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close order details"
        className="flex-1 cursor-default"
        onClick={onClose}
      />
      <aside className="h-full w-full max-w-3xl overflow-y-auto border-l border-border bg-background">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Order details
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-tight">
              {detail?.order.order_number ?? "…"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:border-gold/60 hover:text-gold"
          >
            <X className="size-4" />
          </button>
        </header>

        {error ? <p className="px-6 py-6 text-sm text-destructive">{error}</p> : null}

        {!detail && !error ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="size-6 animate-spin text-gold" />
          </div>
        ) : null}

        {detail ? (
          <div className="space-y-6 px-6 py-6">
            <section className="grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-3">
              <Field label="Status" value={statusLabel(detail.order.status)} />
              <Field
                label="Placed"
                value={new Date(detail.order.placed_at).toLocaleString("en-GB")}
              />
              <Field
                label="Last update"
                value={new Date(detail.order.updated_at).toLocaleString("en-GB")}
              />
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-display text-lg tracking-tight">Customer</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Name"
                  value={
                    detail.order.shipping_address?.recipient ?? detail.profile?.full_name ?? "—"
                  }
                />
                <Field
                  label="Email"
                  value={detail.profile?.email ?? detail.order.shipping_address?.email ?? "—"}
                />
                <Field
                  label="Phone"
                  value={detail.order.shipping_address?.phone ?? detail.profile?.phone ?? "—"}
                />
                <Field label="Customer ID" value={detail.order.user_id ?? "Guest"} />
              </div>
              <div className="mt-4">
                <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  Shipping address
                </p>
                <div className="mt-1 text-sm text-foreground">
                  {addressLines(detail.order.shipping_address).length ? (
                    addressLines(detail.order.shipping_address).map((line) => (
                      <p key={line}>{line}</p>
                    ))
                  ) : (
                    <p>—</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-display text-lg tracking-tight">
                Products ({detail.items.length})
              </h3>
              <ul className="mt-4 space-y-4">
                {detail.items.map((item) => (
                  <li key={item.id} className="flex gap-4">
                    <ItemThumb path={item.image_url} alt={item.product_name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {variantLabel(item.selected_options) || "No variant"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {money(item.unit_price)}
                      </p>
                    </div>
                    <p className="text-sm text-foreground">{money(lineTotal(item))}</p>
                  </li>
                ))}
                {detail.items.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No line items recorded.</li>
                ) : null}
              </ul>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="font-display text-lg tracking-tight">Totals</h3>
                <div className="mt-3 divide-y divide-border/60">
                  <Money label="Subtotal" value={Number(detail.order.subtotal)} />
                  <Money label="Delivery charge" value={Number(detail.order.shipping)} />
                  <Money label="Discount" value={-Number(detail.order.discount ?? 0)} />
                  <Money label="Total" value={Number(detail.order.total)} strong />
                </div>
                {detail.order.coupon_code ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Coupon: {detail.order.coupon_code}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="font-display text-lg tracking-tight">Payment</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Method" value={providerLabel(detail.order)} />
                  <Field label="Payment status" value={statusLabel(detail.order.payment_status)} />
                  <Field label="Transaction ID" value={detail.order.payment_txn_id ?? "—"} />
                  <Field
                    label="Verified"
                    value={detail.order.payment_verified ? "Yes" : "Not verified"}
                  />
                  <Field
                    label="Invoice"
                    value={
                      detail.invoice
                        ? `${detail.invoice.invoice_number} · ${money(detail.invoice.amount)}`
                        : "Not issued"
                    }
                  />
                  <Field label="Note" value={detail.order.payment_note ?? "—"} />
                </div>
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="font-display text-lg tracking-tight">Delivery</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Courier"
                    value={detail.delivery?.courier ?? detail.order.courier ?? "—"}
                  />
                  <Field
                    label="Tracking"
                    value={detail.delivery?.tracking_number ?? detail.order.tracking_number ?? "—"}
                  />
                  <Field
                    label="Estimated"
                    value={
                      detail.order.estimated_delivery
                        ? new Date(detail.order.estimated_delivery).toLocaleDateString("en-GB")
                        : "—"
                    }
                  />
                  <Field
                    label="Delivered at"
                    value={
                      detail.order.delivered_at
                        ? new Date(detail.order.delivered_at).toLocaleString("en-GB")
                        : "—"
                    }
                  />
                </div>
                {detail.ret ? (
                  <p className="mt-4 rounded-lg border border-destructive/40 px-3 py-2 text-xs text-destructive">
                    Return {detail.ret.return_number} · {statusLabel(detail.ret.status)} ·{" "}
                    {money(detail.ret.refund_amount)}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="font-display text-lg tracking-tight">Timeline</h3>
                <ol className="mt-4 space-y-3">
                  {detail.events.map((event) => (
                    <li key={event.id} className="border-l border-border pl-4 text-sm">
                      <p className="text-foreground">{statusLabel(event.status)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString("en-GB")}
                        {event.note ? ` · ${event.note}` : ""}
                      </p>
                    </li>
                  ))}
                  {detail.events.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No status history yet.</li>
                  ) : null}
                </ol>
              </div>
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
