/**
 * Real order reads. Every order (id, reference, dates, status, tracking) lives
 * in the database — nothing here is generated on the client.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  flowFor,
  STATUS_LABEL,
  STATUS_NOTE,
  isTerminal,
  statusIndex,
  type OrderStatus,
} from "@/lib/account-data";

export type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  image_url: string | null;
  /** Present on locally stored receipts. */
  size?: string | null;
  color?: string | null;
};

export type OrderRecord = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  placed_at: string;
  courier: string | null;
  tracking_number: string | null;
  estimated_delivery: string | null;
  payment_method?: string | null;
  shipping_address?: Record<string, unknown> | null;
  order_items: OrderItem[];
};

export type OrderEvent = {
  status: string;
  created_at: string;
  note: string | null;
};

const ORDER_SELECT =
  "id, order_number, status, total, placed_at, payment_method, shipping_address, courier, tracking_number, estimated_delivery, order_items(id, product_name, quantity, unit_price, image_url)";

export const TRACKING_PENDING = "Not yet assigned";

export const trackingLabel = (value: string | null | undefined) =>
  value?.trim() ? value.trim() : TRACKING_PENDING;

export async function fetchMyOrders(): Promise<OrderRecord[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("placed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OrderRecord[];
}

export async function fetchOrderByNumber(orderNumber: string): Promise<OrderRecord | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("order_number", orderNumber.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as OrderRecord) ?? null;
}

export async function fetchOrderEvents(orderId: string): Promise<OrderEvent[]> {
  const { data, error } = await supabase
    .from("order_events")
    .select("status, created_at, note")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export const isActiveOrder = (status: OrderStatus) => !isTerminal(status) && status !== "delivered";

/** Professional timeline: every stage, with the real timestamp when reached. */
export function buildTimeline(
  status: OrderStatus,
  events: OrderEvent[],
  paymentMethod?: string | null,
) {
  const stamps = new Map(events.map((event) => [event.status, event.created_at]));
  const current = statusIndex(status, paymentMethod);
  return flowFor(paymentMethod).map((stage, index) => ({
    status: stage,
    label: STATUS_LABEL[stage],
    note: STATUS_NOTE[stage],
    at: stamps.get(stage) ?? null,
    done: !isTerminal(status) && index <= current,
    active: !isTerminal(status) && index === current,
  }));
}

/** Statuses a customer is still allowed to cancel themselves. */
export const CANCELLABLE_STATUSES: OrderStatus[] = ["order_pending", "processing"];

export const canCancelOrder = (status: OrderStatus | null | undefined) =>
  Boolean(status) && CANCELLABLE_STATUSES.includes(status as OrderStatus);

/**
 * Persist a customer-side cancellation.
 * The database function re-checks ownership and status, restores stock,
 * logs the event and raises a notification — all in one transaction.
 */
export async function cancelOrderById(orderId: string) {
  if (!orderId) throw new Error("Missing order id");
  const { error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId });
  if (error) throw new Error(error.message || "Could not cancel this order.");
}


/** Persist edited shipping details (phone / delivery address). */
export async function updateOrderShipping(
  orderId: string,
  shippingAddress: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("orders")
    .update({ shipping_address: shippingAddress as never })
    .eq("id", orderId);
  if (error) throw error;
}
