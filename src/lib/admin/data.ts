import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "product-media";

export type AdminProduct = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  base_price: number;
  compare_at_price: number | null;
  category: string;
  brand: string | null;
  sku: string | null;
  main_image: string | null;
  gallery_images: string[];
  stock_status: string;
  stock_quantity: number;
  /** "draft" until the admin presses “Upload product”; only live rows reach the storefront. */
  status: string;

  is_featured: boolean;
  is_active: boolean;
  created_at: string;
};

export type OptionGroup = {
  id: string;
  product_slug: string;
  name: string;
  is_required: boolean;
  sort_order: number;
};

export type OptionValue = {
  id: string;
  group_id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock: number;
  status: "active" | "hidden" | "out_of_stock";
  sort_order: number;
};

export type MediaAsset = {
  id: string;
  name: string;
  url: string;
  path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export const STOCK_STATUSES = ["in_stock", "low_stock", "out_of_stock", "preorder"] as const;
export const STOCK_LABELS: Record<string, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  preorder: "Pre-order",
};

export const ORDER_STATUSES = [
  "order_pending",
  "pending_payment",
  "payment_under_review",
  "payment_approved",
  "order_confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Bucket holding customer-uploaded payment proofs. */
export const RECEIPT_BUCKET = "payment-receipts";

/** Storage is private — resolve a temporary readable URL for a stored path. */
export async function resolveMediaUrl(
  pathOrUrl: string | null,
  bucket: string = MEDIA_BUCKET,
): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (/^(https?:\/\/|data:)/.test(pathOrUrl)) return pathOrUrl;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(pathOrUrl, 60 * 60 * 8);
  if (error) console.error("[media] could not sign url", { bucket, pathOrUrl, error });
  return data?.signedUrl ?? null;
}

export async function resolveMediaUrls(paths: (string | null)[], bucket: string = MEDIA_BUCKET) {
  const entries = await Promise.all(
    paths.filter(Boolean).map(async (p) => [p as string, await resolveMediaUrl(p, bucket)] as const),
  );
  return Object.fromEntries(entries) as Record<string, string | null>;
}

export async function uploadMedia(file: File) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data: userData } = await supabase.auth.getUser();
  const { data, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      name: file.name,
      url: path,
      path,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: userData.user?.id ?? null,
    })
    .select()
    .single();
  if (insertError) throw insertError;
  return data as MediaAsset;
}

export async function deleteMedia(asset: MediaAsset) {
  if (asset.path) await supabase.storage.from(MEDIA_BUCKET).remove([asset.path]);
  await supabase.from("media_assets").delete().eq("id", asset.id);
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

// Bangladeshi Taka is the only currency used across the storefront and admin.
export const money = (n: number) =>
  `৳${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n ?? 0))}`;