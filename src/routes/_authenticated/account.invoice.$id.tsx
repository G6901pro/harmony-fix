import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Empty } from "@/components/account/ui";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { InvoiceShareBar } from "@/components/invoice/InvoiceShareBar";
import { fetchInvoiceDocument } from "@/lib/invoice";
import { money } from "@/lib/account-data";

export const Route = createFileRoute("/_authenticated/account/invoice/$id")({
  component: InvoiceView,
});

function InvoiceView() {
  const { id } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice-document", id],
    queryFn: () => fetchInvoiceDocument(id),
  });

  if (isLoading) return <Empty title="Loading invoice…" />;
  if (error || !data) return <Empty title="Invoice not found" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/account/invoices" className="text-xs text-gold hover:underline">
          Back to invoices
        </Link>
        <InvoiceShareBar
          invoiceId={data.invoice.id}
          invoiceNumber={data.invoice.invoice_number}
          amountLabel={money(data.invoice.amount)}
        />
      </div>

      <InvoiceDocument data={data} />
    </div>
  );
}
