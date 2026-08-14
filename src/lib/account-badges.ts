import { supabase } from "@/integrations/supabase/client";

/**
 * Live counters used by the account sidebar badges.
 *
 * Every query is wrapped so a failing table, a missing session or an offline
 * network can never crash the layout — the hook always resolves to zeroes.
 */
export type AccountBadgeCounts = {
  orders: number;
  invoices: number;
  reviews: number;
  notifications: number;
  payments: number;
};

export const EMPTY_BADGES: AccountBadgeCounts = {
  orders: 0,
  invoices: 0,
  reviews: 0,
  notifications: 0,
  payments: 0,
};

const ACTIVE_ORDER_STATUSES = [
  "order_pending",
  "pending_payment",
  "payment_under_review",
  "payment_approved",
  "order_confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
];

async function safeCount(run: () => Promise<{ count: number | null; error: unknown }>) {
  try {
    const { count, error } = await run();
    if (error) {
      console.error("[account-badges]", error);
      return 0;
    }
    return Math.max(0, count ?? 0);
  } catch (error) {
    console.error("[account-badges]", error);
    return 0;
  }
}

export async function fetchAccountBadges(): Promise<AccountBadgeCounts> {
  try {
    const { data: session } = await supabase.auth.getUser();
    const userId = session.user?.id;
    if (!userId) return EMPTY_BADGES;

    const [orders, invoices, reviews, notifications, payments] = await Promise.all([
      safeCount(async () =>
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .in("status", ACTIVE_ORDER_STATUSES as any),
      ),
      safeCount(async () =>
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .neq("status", "paid"),
      ),
      safeCount(async () =>
        supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "pending"),
      ),
      safeCount(async () =>
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_read", false),
      ),
      safeCount(async () =>
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("payment_status", "rejected"),
      ),
    ]);

    return { orders, invoices, reviews, notifications, payments };
  } catch (error) {
    console.error("[account-badges] failed", error);
    return EMPTY_BADGES;
  }
}