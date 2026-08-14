import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, ghostButton } from "@/components/admin/AdminPage";
import { DataTable, Row, Cell } from "@/components/admin/ui";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { InvoiceShareBar } from "@/components/invoice/InvoiceShareBar";
import { money, statusLabel } from "@/lib/admin/data";
import { fetchInvoiceDocument, type InvoiceDocumentData } from "@/lib/invoice";
import type { AdminInvoice } from "@/lib/admin/fulfilment";

export const Route = createFileRoute("/admin/invoices")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Invoices · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="payments"
      eyebrow="Finance"
      title="Invoices"
      description="Branded invoices for every approved order — preview, download as PDF or share in one tap."
    >
      <InvoicesBoard />
    </AdminPage>
  ),
});

type Joined = AdminInvoice & { orders: { order_number: string; status: string } | null };

function InvoicesBoard() {
  const [rows, setRows] = useState<Joined[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error: err } = await supabase
        .from("invoices")
        .select("*, orders(order_number, status)")
        .order("issued_at", { ascending: false });
      if (err) setError(err.message);
      setRows((data ?? []) as unknown as Joined[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      {error ? <p className="mb-4 text-xs text-destructive">{error}</p> : null}
      <DataTable
        columns={["Invoice", "Order", "Issued", "Amount", "Order status", ""]}
        loading={loading}
        empty={rows.length === 0}
      >
        {rows.map((row) => (
          <Row key={row.id}>
            <Cell className="font-medium">{row.invoice_number}</Cell>
            <Cell>{row.orders?.order_number ?? "—"}</Cell>
            <Cell>{new Date(row.issued_at).toLocaleDateString("en-GB")}</Cell>
            <Cell>{money(row.amount)}</Cell>
            <Cell>{row.orders ? statusLabel(row.orders.status) : "—"}</Cell>
            <Cell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className={ghostButton}
                  onClick={() => setInvoiceId(row.id)}
                >
                  <Eye className="size-3.5" /> View invoice
                </button>
                {row.order_id ? (
                  <button
                    type="button"
                    className={ghostButton}
                    onClick={() => setOpenId(row.order_id)}
                  >
                    View order
                  </button>
                ) : null}
              </div>
            </Cell>
          </Row>
        ))}
      </DataTable>
      {openId ? <OrderDetailModal orderId={openId} onClose={() => setOpenId(null)} /> : null}
      {invoiceId ? (
        <InvoicePreviewModal invoiceId={invoiceId} onClose={() => setInvoiceId(null)} />
      ) : null}
    </div>
  );
}

function InvoicePreviewModal({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<InvoiceDocumentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    fetchInvoiceDocument(invoiceId)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [invoiceId]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:static print:bg-transparent print:p-0">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
            Invoice preview
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invoice preview"
            className="grid size-9 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:border-gold/60 hover:text-gold"
          >
            <X className="size-4" />
          </button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!data && !error ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="size-6 animate-spin text-gold" />
          </div>
        ) : null}

        {data ? (
          <div className="space-y-4">
            <InvoiceShareBar
              invoiceId={data.invoice.id}
              invoiceNumber={data.invoice.invoice_number}
              amountLabel={money(data.invoice.amount)}
            />
            <InvoiceDocument data={data} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
