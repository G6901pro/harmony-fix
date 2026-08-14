/**
 * Category-aware unread notification counters.
 *
 * Every query is defensive: a missing session, a failing table or an offline
 * network resolves to zeroes instead of throwing into the React tree.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/lib/auth";

export type NotificationCategory =
  | "orders"
  | "coupons"
  | "reviews"
  | "payments"
  | "wishlist"
  | "general";

export type CategoryCounts = Record<NotificationCategory, number>;

export const EMPTY_CATEGORY_COUNTS: CategoryCounts = {
  orders: 0,
  coupons: 0,
  reviews: 0,
  payments: 0,
  wishlist: 0,
  general: 0,
};

/** Map a raw notification `kind` onto an account sidebar category. */
export function categoryForKind(kind: string | null | undefined): NotificationCategory {
  const value = typeof kind === "string" ? kind.trim().toLowerCase() : "";
  if (["order", "orders", "shipping", "delivery", "tracking", "return"].includes(value)) {
    return "orders";
  }
  if (["coupon", "coupons", "promo", "promotion", "offer"].includes(value)) return "coupons";
  if (["review", "reviews", "rating"].includes(value)) return "reviews";
  if (["payment", "payments", "invoice", "refund"].includes(value)) return "payments";
  if (["wishlist", "favourite", "favorite", "restock"].includes(value)) return "wishlist";
  return "general";
}

/** The `kind` values that belong to a category, used when marking as read. */
const KINDS_BY_CATEGORY: Record<NotificationCategory, string[]> = {
  orders: ["order", "orders", "shipping", "delivery", "tracking", "return"],
  coupons: ["coupon", "coupons", "promo", "promotion", "offer"],
  reviews: ["review", "reviews", "rating"],
  payments: ["payment", "payments", "invoice", "refund"],
  wishlist: ["wishlist", "favourite", "favorite", "restock"],
  general: [],
};

export type BadgeSnapshot = {
  total: number;
  categories: CategoryCounts;
};

export const EMPTY_SNAPSHOT: BadgeSnapshot = { total: 0, categories: EMPTY_CATEGORY_COUNTS };

export async function fetchUnreadBadges(): Promise<BadgeSnapshot> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, kind")
      .eq("is_read", false)
      .limit(500);
    if (error) {
      console.error("[notification-badges] query failed", error.message);
      return EMPTY_SNAPSHOT;
    }
    const rows = Array.isArray(data) ? data : [];
    const categories: CategoryCounts = { ...EMPTY_CATEGORY_COUNTS };
    for (const row of rows) {
      const category = categoryForKind(row?.kind);
      categories[category] += 1;
    }
    return { total: rows.length, categories };
  } catch (error) {
    console.error("[notification-badges] failed", error);
    return EMPTY_SNAPSHOT;
  }
}

/** Mark every unread notification in a category as read. Never throws. */
export async function markCategoryRead(category: NotificationCategory): Promise<void> {
  try {
    const kinds = KINDS_BY_CATEGORY[category] ?? [];
    let query = supabase
      .from("notifications")
      .update({ is_read: true } as never)
      .eq("is_read", false);
    query = kinds.length > 0 ? query.in("kind", kinds) : query;
    const { error } = await query;
    if (error) console.error("[notification-badges] mark read failed", error.message);
  } catch (error) {
    console.error("[notification-badges] mark read failed", error);
  }
}

export const BADGE_QUERY_KEY = ["notification-badges"] as const;

/** Live unread badge counts for the signed-in user. */
export function useNotificationBadges() {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: [...BADGE_QUERY_KEY, userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: fetchUnreadBadges,
    retry: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`notification-badges-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          () => {
            void queryClient.invalidateQueries({ queryKey: BADGE_QUERY_KEY });
          },
        )
        .subscribe();
    } catch (error) {
      console.error("[notification-badges] realtime failed", error);
    }
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const snapshot = data ?? EMPTY_SNAPSHOT;

  const clear = async (category: NotificationCategory) => {
    if ((snapshot.categories[category] ?? 0) === 0) return;
    await markCategoryRead(category);
    await queryClient.invalidateQueries({ queryKey: BADGE_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: ["header-notifications"] });
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return { total: snapshot.total, categories: snapshot.categories, clear };
}
