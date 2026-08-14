import logoAsset from "@/assets/velocita-logo.png";
import { BRAND } from "@/lib/site-data";
import type { InvoiceDocumentData } from "@/lib/invoice";
import { addressLines } from "@/lib/admin/fulfilment";

function money(value: number | null | undefined, currency = "BDT") {
  const n = Number(value ?? 0);
  return `${currency} ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Branded, print-ready invoice document.
 * Wrapped in `.invoice-print-area` so the print stylesheet can isolate it.
 */
export function InvoiceDocument({ data }: { data: InvoiceDocumentData }) {
  const { invoice, order, items } = data;
  const currency = order?.currency ?? "BDT";
  const lines = addressLines(order?.shipping_address ?? null);
  const paid = invoice.status === "paid" || order?.payment_verified;

  return (
    <article className="invoice-print-area overflow-hidden rounded-2xl border border-gold/25 bg-surface">
      <div className="h-1.5 w-full bg-[image:var(--gradient-gold)]" />

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border px-8 py-7">
        <div className="flex items-center gap-4">
          <img
            src={logoAsset}
            alt={`${BRAND.name} logo`}
            width={180}
            height={100}
            className="h-14 w-auto object-contain"
          />
          <div>
            <p className="font-display text-xl tracking-[0.18em] uppercase">
              Velocita<span className="text-gold-gradient"> Vault</span>
            </p>
            <p className="mt-1 text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
              {BRAND.tagline}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-[0.24em] text-gold uppercase">Invoice</p>
          <p className="mt-2 font-display text-2xl tracking-tight">{invoice.invoice_number}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Issued {new Date(invoice.issued_at).toLocaleDateString("en-GB")}
          </p>
          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[9px] tracking-[0.2em] uppercase ${
              paid ? "border-gold/40 text-gold" : "border-border text-muted-foreground"
            }`}
          >
            {paid ? "Paid" : (invoice.status ?? "issued")}
          </span>
        </div>
      </header>

      <div className="grid gap-6 border-b border-border px-8 py-6 sm:grid-cols-3">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Billed to</p>
          <p className="mt-2 text-sm text-foreground">
            {order?.shipping_address?.recipient ?? "—"}
          </p>
          {lines.map((line) => (
            <p key={line} className="text-sm text-muted-foreground">
              {line}
            </p>
          ))}
          {order?.shipping_address?.phone ? (
            <p className="text-sm text-muted-foreground">{order.shipping_address.phone}</p>
          ) : null}
        </div>
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Order</p>
          <p className="mt-2 text-sm text-foreground">{order?.order_number ?? "—"}</p>
          <p className="text-sm text-muted-foreground">
            {order ? new Date(order.placed_at).toLocaleDateString("en-GB") : "—"}
          </p>
          {order?.payment_txn_id ? (
            <p className="text-sm text-muted-foreground">Txn {order.payment_txn_id}</p>
          ) : null}
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">From</p>
          <p className="mt-2 text-sm text-foreground">{BRAND.name}</p>
          <p className="text-sm text-muted-foreground">{BRAND.address}</p>
          <p className="text-sm text-muted-foreground">{BRAND.phone}</p>
          <p className="text-sm text-muted-foreground">{BRAND.email}</p>
        </div>
      </div>

      <div className="px-8 py-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="py-3">Item</th>
              <th className="py-3 text-center">Qty</th>
              <th className="py-3 text-right">Unit</th>
              <th className="py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">
                  No line items recorded.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="py-3 pr-4">{item.product_name}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">{money(item.unit_price, currency)}</td>
                  <td className="py-3 text-right">
                    {money(Number(item.unit_price) * Number(item.quantity), currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <dl className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{money(order?.subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>{money(order?.shipping, currency)}</dd>
          </div>
          {Number(order?.discount ?? 0) > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Discount</dt>
              <dd>-{money(order?.discount, currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-gold/30 pt-3">
            <dt className="text-[10px] tracking-[0.2em] uppercase">Total</dt>
            <dd className="font-display text-xl text-gold">{money(invoice.amount, currency)}</dd>
          </div>
        </dl>
      </div>

      <footer className="border-t border-border px-8 py-5 text-center">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
          {BRAND.tagline}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Thank you for collecting with {BRAND.name}. Questions? {BRAND.email}
        </p>
      </footer>
    </article>
  );
}
