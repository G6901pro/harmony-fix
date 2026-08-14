import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, Empty } from "@/components/account/ui";
import { formatDate, money } from "@/lib/account-data";

export const Route = createFileRoute("/_authenticated/account/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, issued_at, order_id, orders(order_number)")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="Invoices"
        title="Invoices & receipts"
        subtitle="Open any invoice to view or download a print-ready copy."
      />

      {isLoading ? (
        <Empty title="Loading invoices…" />
      ) : invoices.length === 0 ? (
        <Empty title="No invoices yet" hint="Invoices are issued once an order is confirmed." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                <th className="px-5 py-4">Invoice</th>
                <th className="px-5 py-4">Order</th>
                <th className="px-5 py-4">Issued</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Amount</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4">{invoice.invoice_number}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {invoice.orders?.order_number ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {formatDate(invoice.issued_at)}
                  </td>
                  <td className="px-5 py-4 text-[10px] tracking-[0.2em] text-gold uppercase">
                    {invoice.status}
                  </td>
                  <td className="px-5 py-4 text-right font-display">{money(invoice.amount)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      to="/account/invoice/$id"
                      params={{ id: invoice.id }}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[10px] tracking-[0.2em] uppercase hover:border-gold/60 hover:text-gold"
                    >
                      <FileText className="size-3.5" /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
