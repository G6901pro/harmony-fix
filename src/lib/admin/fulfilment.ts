import { supabase } from "@/integrations/supabase/client";
import type { OrderStatus } from "./data";

/** Shared shapes for the Orders / Deliveries / Returns / Invoices modules. */

export type ShippingAddress = {
  recipient?: string | null;
  phone?: string | null;
  email?: string | null;
  line1?: string | null;
  line2?: string | null;
  area?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  note?: string | null;
} | null;

export type AdminOrder = {
  id: string;
  user_id: string | null;
  order_number: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  payment_method: string | null;
  payment_provider: string | null;
  payment_txn_id: string | null;
  payment_verified: boolean;
  payment_note: string | null;
  payment_status: string;
  courier: string | null;
  tracking_number: string | null;
  estimated_delivery: string | null;
  delivered_at: string | null;
  placed_at: string;
  updated_at: string;
  shipping_address: ShippingAddress;
};

export type AdminOrderItem = {
  id: string;
  order_id: string;
  product_slug: string;
  product_name: string;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  selected_options: Record<string, unknown> | null;
};

export type AdminOrderEvent = {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
};

export type AdminProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export type AdminInvoice = {
  id: string;
  order_id: string | null;
  user_id: string | null;
  invoice_number: string;
  amount: number;
  status: string;
  issued_at: string;
};

export type AdminDelivery = {
  id: string;
  order_id: string;
  courier: string | null;
  tracking_number: string | null;
  delivery_status: string;
  shipped_at: string | null;
  delivered_at: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  address_summary: string | null;
  note: string | null;
  updated_at: string;
};

export type AdminReturn = {
  id: string;
  order_id: string;
  return_number: string;
  reason: string | null;
  status: string;
  refund_amount: number;
  restock: boolean;
  restocked: boolean;
  requested_at: string;
  resolved_at: string | null;
  note: string | null;
};

/** Human label for an option map like {"Size":"42","Colour":"Black"}. */
export function variantLabel(options: Record<string, unknown> | null | undefined) {
  if (!options) return "";
  const parts = Object.entries(options)
    .filter(([, v]) => v !== null && v !== undefined && `${v}`.trim() !== "")
    .map(([k, v]) => `${k}: ${v}`);
  return parts.join(" · ");
}

export function addressLines(address: ShippingAddress) {
  if (!address) return [] as string[];
  return [
    address.line1,
    address.line2,
    [address.area, address.city].filter(Boolean).join(", "),
    [address.postcode, address.country].filter(Boolean).join(" "),
  ]
    .map((l) => (l ?? "").trim())
    .filter(Boolean);
}

export function addressSummary(address: ShippingAddress) {
  const lines = addressLines(address);
  return lines.length ? lines.join(", ") : "—";
}

export function lineTotal(item: AdminOrderItem) {
  return Number(item.unit_price ?? 0) * Number(item.quantity ?? 0);
}

export function itemCount(items: AdminOrderItem[]) {
  return items.reduce((sum, i) => sum + Number(i.quantity ?? 0), 0);
}

/** All items for a set of orders, grouped by order id. */
export async function fetchItemsByOrder(orderIds: string[]) {
  const map: Record<string, AdminOrderItem[]> = {};
  if (orderIds.length === 0) return map;
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);
  if (error) throw error;
  for (const row of (data ?? []) as AdminOrderItem[]) {
    (map[row.order_id] ??= []).push(row);
  }
  return map;
}

export async function fetchProfilesById(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const map: Record<string, AdminProfile> = {};
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .in("id", ids);
  for (const p of (data ?? []) as AdminProfile[]) map[p.id] = p;
  return map;
}

export type OrderDetail = {
  order: AdminOrder;
  items: AdminOrderItem[];
  events: AdminOrderEvent[];
  profile: AdminProfile | null;
  invoice: AdminInvoice | null;
  delivery: AdminDelivery | null;
  ret: AdminReturn | null;
};

/** Everything the order detail view renders, in one round-trip batch. */
export async function fetchOrderDetail(orderId: string): Promise<OrderDetail> {
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  const typed = order as AdminOrder;

  const [items, events, invoice, delivery, ret, profile] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", orderId),
    supabase
      .from("order_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase.from("invoices").select("*").eq("order_id", orderId).maybeSingle(),
    supabase.from("deliveries").select("*").eq("order_id", orderId).maybeSingle(),
    supabase.from("order_returns").select("*").eq("order_id", orderId).maybeSingle(),
    typed.user_id
      ? supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .eq("id", typed.user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    order: typed,
    items: (items.data ?? []) as AdminOrderItem[],
    events: (events.data ?? []) as AdminOrderEvent[],
    profile: (profile.data ?? null) as AdminProfile | null,
    invoice: (invoice.data ?? null) as AdminInvoice | null,
    delivery: (delivery.data ?? null) as AdminDelivery | null,
    ret: (ret.data ?? null) as AdminReturn | null,
  };
}

/**
 * Update an order. The database logs the status transition into
 * `order_events` automatically, so no manual timeline insert is needed.
 */
export async function updateOrder(orderId: string, changes: Partial<Omit<AdminOrder, "user_id">>) {
  const { error } = await supabase
    .from("orders")
    .update(changes as never)
    .eq("id", orderId);

  if (error) throw error;
}

