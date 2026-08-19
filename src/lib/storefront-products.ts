import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { products as houseCatalog, type CatalogProduct } from "@/lib/catalog";
import type { Product } from "@/lib/site-data";
import { PRODUCT_IMAGES } from "@/lib/product-images";
import fallbackImage from "@/assets/p1.jpg";

export const STOREFRONT_PRODUCTS_KEY = ["storefront-products"] as const;
const MEDIA_BUCKET = "product-media";

type DbProduct = {
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
  gallery_images: string[] | null;
  stock_quantity: number;
  stock_status: string;
  is_featured: boolean;
  is_active: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  age_group: string | null;
  color: string | null;
  created_at: string;
};

/** Curated house pieces keyed by slug — used to fill attributes the DB row omits. */
const houseBySlug = new Map(houseCatalog.map((product) => [product.slug, product]));

/** Storage is private — resolve short-lived readable URLs for stored paths. */
async function resolveImages(paths: string[]) {
  const map = new Map<string, string>();
  const storagePaths: string[] = [];
  for (const path of paths) {
    if (/^(https?:)?\/\//.test(path) || path.startsWith("data:") || path.startsWith("/")) {
      map.set(path, path);
    } else {
      storagePaths.push(path);
    }
  }
  if (storagePaths.length) {
    const { data } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(storagePaths, 60 * 60 * 4);
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl);
    }
  }
  return map;
}

/**
 * Inventory truth: the managed quantity always wins. Quantity above zero means
 * buyable, quantity exactly zero means sold out. The `stock_status` flag is only
 * consulted when the quantity is not tracked at all (null/undefined), so a stale
 * flag can never cause a false "sold out" or a false "in stock".
 */
function resolveStock(row: DbProduct): number {
  const raw = row.stock_quantity;
  if (raw !== null && raw !== undefined && Number.isFinite(Number(raw))) {
    return Math.max(0, Math.floor(Number(raw)));
  }
  const status = String(row.stock_status ?? "").toLowerCase();
  const soldOut =
    status.includes("out") || status.includes("sold") || status.includes("unavailable");
  return soldOut ? 0 : 99;
}


type ReviewStat = { count: number; average: number };

function toCatalogProduct(
  row: DbProduct,
  urls: Map<string, string>,
  reviewStats?: Map<string, ReviewStat>,
): CatalogProduct {
  const images = [row.main_image, ...(row.gallery_images ?? [])]
    .filter((value): value is string => Boolean(value))
    .map((value) => urls.get(value) ?? value);

  // Imported rows may have no stored image yet — reuse the bundled storefront
  // image for the same slug so cards keep their original artwork. Never
  // overrides an image the database does provide.
  const bundledImages = PRODUCT_IMAGES[row.slug]
    ? [PRODUCT_IMAGES[row.slug]]
    : (houseBySlug.get(row.slug)?.images ?? []);

  // Attributes the products table does not store yet (age group, colour,
  // ratings) fall back to the curated house entry with the same slug so every
  // filter group has data to match against.
  const house = houseBySlug.get(row.slug);
  const stats = reviewStats?.get(row.slug);

  return {
    id: row.id,
    slug: row.slug,
    name: row.title,
    shortDescription: row.description || (house?.shortDescription ?? ""),
    brand: row.brand ?? house?.brand ?? "Velocita Signature",
    category: row.category || (house?.category ?? ""),
    sku: row.sku ?? "",
    ageGroup: row.age_group ?? house?.ageGroup ?? "",
    color: row.color ?? house?.color ?? "",
    price: Number(row.base_price ?? 0),
    compareAt: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    // Real approved reviews win; the curated entry is only a fallback.
    rating: stats?.count ? stats.average : (house?.rating ?? 5),
    reviews: stats?.count ?? house?.reviews ?? 0,
    // Trust the quantity first: a stale `stock_status` flag must not make an
    // in-stock item look sold out.
    stock: resolveStock(row),

    images: images.length ? images : bundledImages.length ? bundledImages : [fallbackImage],
    isNew: Boolean(row.is_new_arrival),
    isBestSeller: Boolean(row.is_best_seller),
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at,
    popularity: house?.popularity ?? 0,
    // The database does not store rich detail copy yet — reuse the original
    // curated entry for the same slug when it exists, otherwise derive basics
    // from the row. Nothing here overwrites a value the row does provide.
    specs: house?.specs?.length
      ? house.specs
      : [
          { label: "Brand", value: row.brand ?? "Velocita Signature" },
          { label: "Category", value: row.category },
          ...(row.sku ? [{ label: "SKU", value: row.sku }] : []),
          ...(row.age_group ?? house?.ageGroup
            ? [{ label: "Recommended age", value: `${row.age_group ?? house?.ageGroup} years` }]
            : []),
        ],
    features: house?.features ?? [],
    boxContents: house?.boxContents ?? [],
    warranty: house?.warranty ?? "24-month international warranty with concierge support.",
    safety: house?.safety ?? "Adult supervision recommended during first use and charging.",
    colorOptions: house?.colorOptions ?? [],
    reviewsList: [],
  };
}

/** Approved review counts / averages, keyed by product slug. */
async function fetchReviewStats(slugs: string[]) {
  const map = new Map<string, ReviewStat>();
  if (!slugs.length) return map;
  const { data } = await supabase
    .from("reviews")
    .select("product_slug, rating")
    .eq("is_approved", true)
    .in("product_slug", slugs);
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const entry = totals.get(row.product_slug) ?? { sum: 0, count: 0 };
    entry.sum += Number(row.rating ?? 0);
    entry.count += 1;
    totals.set(row.product_slug, entry);
  }
  for (const [slug, { sum, count }] of totals) {
    map.set(slug, { count, average: count ? sum / count : 0 });
  }
  return map;
}

export async function fetchStorefrontProducts(): Promise<CatalogProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as DbProduct[];
  const paths = rows.flatMap((row) =>
    [row.main_image, ...(row.gallery_images ?? [])].filter((v): v is string => Boolean(v)),
  );
  const [urls, reviewStats] = await Promise.all([
    resolveImages(paths),
    fetchReviewStats(rows.map((row) => row.slug)),
  ]);
  return rows.map((row) => toCatalogProduct(row, urls, reviewStats));
}


/**
 * Live catalogue: products managed in the admin dashboard, followed by the
 * curated house collection. Admin edits appear as soon as the cache refetches.
 */
export function useStorefrontProducts() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: STOREFRONT_PRODUCTS_KEY,
    queryFn: fetchStorefrontProducts,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Admin edits made in another tab flip this key — refetch so the storefront stays live.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "vv-storefront-updated") {
        void queryClient.invalidateQueries({ queryKey: STOREFRONT_PRODUCTS_KEY });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  // The database is the source of truth, but the curated house collection is
  // always merged in as a safety net so no original piece can disappear from
  // the storefront if a row is missing or the fetch fails.
  const dbProducts = query.data ?? [];
  const dbSlugs = new Set(dbProducts.map((product) => product.slug));
  const all = [...dbProducts, ...houseCatalog.filter((product) => !dbSlugs.has(product.slug))];

  return { ...query, dbProducts, products: all };
}


/** Invalidate every storefront surface after an admin write. */
export function useInvalidateStorefront() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: STOREFRONT_PRODUCTS_KEY });
    try {
      localStorage.setItem("vv-storefront-updated", String(Date.now()));
    } catch {
      /* storage unavailable */
    }
  };
}

/** Map a catalogue product onto the homepage card shape. */
export function toHomeCard(product: CatalogProduct): Product {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    compareAt: product.compareAt,
    rating: product.rating,
    reviews: product.reviews,
    image: product.images[0],
    badge: product.isNew ? "New" : product.isBestSeller ? "Best Seller" : undefined,
    stock: product.stock,
  };
}