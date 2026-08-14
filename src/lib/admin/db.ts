import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Shared data types + helpers for the admin dashboard modules. */

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_total: number;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  /** Null = public coupon, available to every customer. */
  assigned_user_id: string | null;
  assigned_email: string | null;
  created_at: string;
};


export type HomepageBlock = {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  image: string | null;
  link_label: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ShippingZone = {
  id: string;
  name: string;
  areas: string;
  delivery_charge: number;
  estimated_days: string | null;
  is_active: boolean;
};

export type SiteSettings = {
  id: string;
  logo_url: string | null;
  favicon_url: string | null;
  loading_logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  social_links: Record<string, string>;
  payment_numbers: Record<string, string>;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  free_shipping_threshold: number;
  default_delivery_charge: number;
  inside_dhaka_delivery_charge: number;
  outside_dhaka_delivery_charge: number;
  maintenance_mode: boolean;
};

export type CustomerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_blocked: boolean;
  blocked_at: string | null;
  /** Soft delete marker — the row stays for order history but the account is removed. */
  deleted_at: string | null;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  user_id: string;
  product_slug: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string | null;
  status: "pending" | "approved" | "rejected" | "hidden";
  is_verified_purchase: boolean;
  order_id: string | null;
  admin_note: string | null;
  moderated_at: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export type ActivityEntry = {
  id: string;
  actor_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export const HOMEPAGE_KINDS = ["hero", "section", "promo", "collection"] as const;
export const HOMEPAGE_KIND_LABELS: Record<string, string> = {
  hero: "Hero banner",
  section: "Homepage section",
  promo: "Promotional banner",
  collection: "Featured collection",
};

export const PAYMENT_PROVIDERS = ["cod", "bkash", "dbbl"] as const;
export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  cod: "Cash on delivery",
  bkash: "bKash manual",
  dbbl: "Dutch-Bangla Bank manual",
  nagad: "Nagad",
  card: "Card",
  bank_transfer: "Bank transfer",
};

export const PAYMENT_STATUSES = ["under_review", "pending", "approved", "rejected"] as const;

/** Write an audit trail entry. Never blocks the calling flow. */
export async function logActivity(
  action: string,
  entity?: string,
  entityId?: string,
  meta: Record<string, unknown> = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("admin_activity_log").insert({
      actor_id: data.user.id,
      actor_email: data.user.email ?? null,
      action,
      entity: entity ?? null,
      entity_id: entityId ?? null,
      meta: meta as never,
    });
  } catch {
    /* audit logging must never break an admin action */
  }
}

/** Generic list loader for a table, with refresh + error state. */
export function useTable<T>(
  table: string,
  options: { orderBy?: string; ascending?: boolean; limit?: number } = {},
) {
  const { orderBy = "created_at", ascending = false, limit } = options;
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from(table as never)
      .select("*")
      .order(orderBy, { ascending });
    if (limit) query = query.limit(limit);
    const { data, error: err } = await query;
    setError(err?.message ?? null);
    setRows((data ?? []) as T[]);
    setLoading(false);
  }, [table, orderBy, ascending, limit]);

  useEffect(() => {
    void reload();
    // Re-read when the admin returns to the tab so a list can never show a
    // stale snapshot after a change made elsewhere (another tab, another admin).
    const refresh = () => {
      if (document.visibilityState === "visible") void reload();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);


  return { rows, loading, error, setError, reload };
}

export const dateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

export const dateOnly = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "—";

/**
 * Live category names for product forms and filters: active categories from the
 * database first (so a category created in the Categories module is instantly
 * selectable), with the curated house categories merged in as a safety net.
 */
export function useCategoryNames() {
  const [names, setNames] = useState<string[]>([]);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("categories")
      .select("name, is_active, sort_order")
      .order("sort_order", { ascending: true });
    const live = (data ?? [])
      .filter((c) => (c as { is_active: boolean }).is_active)
      .map((c) => (c as { name: string }).name);
    setNames(live);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { names, reload };
}
