/**
 * Account sidebar badge counts.
 *
 * Badges represent UNREAD NOTIFICATIONS only — never raw entity counts — so a
 * badge always clears once the customer has actually looked at the section.
 */
import type { BadgeSnapshot, NotificationCategory } from "@/lib/notification-badges";

export type AccountBadgeCounts = {
  orders: number;
  invoices: number;
  reviews: number;
  notifications: number;
  payments: number;
  coupons: number;
  wishlist: number;
};

export const EMPTY_BADGES: AccountBadgeCounts = {
  orders: 0,
  invoices: 0,
  reviews: 0,
  notifications: 0,
  payments: 0,
  coupons: 0,
  wishlist: 0,
};

/** Map a live unread snapshot onto the sidebar badge shape. */
export function badgesFromSnapshot(snapshot: BadgeSnapshot | undefined): AccountBadgeCounts {
  if (!snapshot) return EMPTY_BADGES;
  const c = snapshot.categories;
  return {
    orders: c.orders ?? 0,
    invoices: c.invoices ?? 0,
    reviews: c.reviews ?? 0,
    payments: c.payments ?? 0,
    coupons: c.coupons ?? 0,
    wishlist: c.wishlist ?? 0,
    notifications: snapshot.total ?? 0,
  };
}

/** Which notification category a given account path "reads". */
export function categoryForPath(pathname: string): NotificationCategory | null {
  const path = (pathname || "").replace(/\/+$/, "");
  if (path.startsWith("/account/orders") || path.startsWith("/account/tracking")) return "orders";
  if (path.startsWith("/account/invoice")) return "invoices";
  if (path.startsWith("/account/reviews")) return "reviews";
  if (path.startsWith("/account/payments")) return "payments";
  if (path.startsWith("/account/wishlist")) return "wishlist";
  return null;
}
