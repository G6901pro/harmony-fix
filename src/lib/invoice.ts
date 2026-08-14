import { supabase } from "@/integrations/supabase/client";
import type { AdminInvoice, AdminOrder, AdminOrderItem } from "@/lib/admin/fulfilment";

export type InvoiceDocumentData = {
  invoice: AdminInvoice;
  order: AdminOrder | null;
  items: AdminOrderItem[];
};

/** Everything the branded invoice document renders, in one batch. */
export async function fetchInvoiceDocument(invoiceId: string): Promise<InvoiceDocumentData> {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();
  if (error) throw error;
  const typed = invoice as AdminInvoice;

  if (!typed.order_id) return { invoice: typed, order: null, items: [] };

  const [orderRes, itemsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", typed.order_id).maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", typed.order_id),
  ]);

  return {
    invoice: typed,
    order: (orderRes.data ?? null) as AdminOrder | null,
    items: (itemsRes.data ?? []) as AdminOrderItem[],
  };
}

/** Public-ish link a customer can open for this invoice. */
export function invoiceShareUrl(invoiceId: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/account/invoice/${invoiceId}`;
}

export function invoiceShareText(invoiceNumber: string, amountLabel: string) {
  return `Velocita Vault invoice ${invoiceNumber} — ${amountLabel}. Behind products, Building family.`;
}
