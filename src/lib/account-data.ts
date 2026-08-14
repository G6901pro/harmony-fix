/** Steps for online payments (bKash, bank transfer, card). */
export const ONLINE_FLOW = [
  "pending_payment",
  "payment_under_review",
  "payment_approved",
  "order_confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

/** Steps for cash on delivery — no payment review stages. */
export const COD_FLOW = [
  "order_pending",
  "order_confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

/** Every non-terminal status, used for admin lists and type unions. */
export const ORDER_FLOW = ["order_pending", ...ONLINE_FLOW] as const;

export const TERMINAL_STATES = ["cancelled", "returned"] as const;

export type OrderStatus = (typeof ORDER_FLOW)[number] | (typeof TERMINAL_STATES)[number];

export const ALL_STATUSES: OrderStatus[] = [...ORDER_FLOW, ...TERMINAL_STATES];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  order_pending: "Order Pending",
  pending_payment: "Pending Payment",
  payment_under_review: "Payment Under Review",
  payment_approved: "Payment Approved",
  order_confirmed: "Order Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const STATUS_NOTE: Record<OrderStatus, string> = {
  order_pending: "Order received — awaiting confirmation from our concierge.",
  pending_payment: "Awaiting your payment to begin.",
  payment_under_review: "Our finance desk is verifying your payment.",
  payment_approved: "Payment verified and receipted.",
  order_confirmed: "Your order is confirmed with the atelier.",
  processing: "Being inspected, numbered and prepared.",
  packed: "Sealed in signature packaging.",
  shipped: "Handed to our courier partner.",
  out_for_delivery: "With the courier for final delivery today.",
  delivered: "Delivered. We hope it was worth the wait.",
  cancelled: "This order was cancelled.",
  returned: "This order was returned to us.",
};

export function isTerminal(status: OrderStatus) {
  return status === "cancelled" || status === "returned";
}

/** Cash on delivery is recognised from any of the labels the storefront uses. */
export function isCashOnDelivery(paymentMethod: string | null | undefined) {
  const value = (paymentMethod ?? "").toLowerCase();
  return value === "cod" || value.includes("cash");
}

/** The timeline steps that apply to an order, based on its payment method. */
export function flowFor(paymentMethod: string | null | undefined): readonly OrderStatus[] {
  return isCashOnDelivery(paymentMethod) ? COD_FLOW : ONLINE_FLOW;
}

export function statusIndex(status: OrderStatus, paymentMethod?: string | null) {
  return flowFor(paymentMethod).indexOf(status);
}

const bdt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
export const money = (value: number | string | null | undefined) =>
  `৳${bdt.format(Number(value ?? 0))}`;

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Reviews can be edited or removed only within 24 hours of posting. */
export const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function reviewWindow(createdAt: string) {
  const expires = new Date(createdAt).getTime() + REVIEW_EDIT_WINDOW_MS;
  const msLeft = expires - Date.now();
  const editable = msLeft > 0;
  const hours = Math.floor(msLeft / 3_600_000);
  const minutes = Math.floor((msLeft % 3_600_000) / 60_000);
  return {
    editable,
    label: editable
      ? hours > 0
        ? `${hours}h ${minutes}m left to edit`
        : `${minutes}m left to edit`
      : "Editing window closed",
  };
}
