/**
 * Unread Orders / Payments counters for the admin sidebar.
 *
 * "Unread" means: created (or payment-updated) after the last time this admin
 * opened that screen. The marker is stored per admin in `admin_seen_markers`
 * so the badge survives refreshes and follows the operator across devices.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminInboxScope = "orders" | "payments";

export type AdminInboxCounts = Record<AdminInboxScope, number>;

const EMPTY: AdminInboxCounts = { orders: 0, payments: 0 };

const AWAITING_PAYMENT = ["under_review", "pending", "submitted"];

async function readMarkers(userId: string) {
  const { data } = await supabase
    .from("admin_seen_markers")
    .select("scope, last_seen_at")
    .eq("user_id", userId);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as { scope: string; last_seen_at: string }[]) {
    map.set(row.scope, row.last_seen_at);
  }
  return map;
}

async function countOrders(since: string | undefined) {
  let query = supabase.from("orders").select("id", { count: "exact", head: true });
  if (since) query = query.gt("placed_at", since);
  const { count } = await query;
  return count ?? 0;
}

async function countPayments(since: string | undefined) {
  let query = supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("payment_status", AWAITING_PAYMENT);
  if (since) query = query.gt("updated_at", since);
  const { count } = await query;
  return count ?? 0;
}

export function useAdminInbox(userId: string | null) {
  const [counts, setCounts] = useState<AdminInboxCounts>(EMPTY);

  const refresh = useCallback(async () => {
    if (!userId) return setCounts(EMPTY);
    try {
      const markers = await readMarkers(userId);
      const [orders, payments] = await Promise.all([
        countOrders(markers.get("orders")),
        countPayments(markers.get("payments")),
      ]);
      setCounts({ orders, payments });
    } catch {
      setCounts(EMPTY);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live: a new order or payment proof lights the badge immediately.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`admin-inbox-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const markSeen = useCallback(
    async (scope: AdminInboxScope) => {
      if (!userId) return;
      try {
        await supabase
          .from("admin_seen_markers")
          .upsert(
            { user_id: userId, scope, last_seen_at: new Date().toISOString() },
            { onConflict: "user_id,scope" },
          );
      } catch {
        /* the badge simply stays until the next successful write */
      }
      await refresh();
    },
    [userId, refresh],
  );

  return { counts, refresh, markSeen };
}
