import { products, type CatalogProduct } from "./catalog";
import {
  AGE_KEYS,
  BRAND_KEYS,
  CATEGORY_KEYS,
  COLOR_KEYS,
  matchesAny,
} from "./filter-match";

export type SortKey =
  | "newest"
  | "popular"
  | "rated"
  | "price-asc"
  | "price-desc"
  | "az"
  | "za";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Popular" },
  { value: "rated", label: "Best Rated" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "az", label: "Name: A–Z" },
  { value: "za", label: "Name: Z–A" },
];

export type Filters = {
  query: string;
  categories: string[];
  brands: string[];
  ages: string[];
  colors: string[];
  minRating: number;
  /** null = no price constraint (full dynamic catalogue range). */
  price: [number, number] | null;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  newOnly: boolean;
  bestSellerOnly: boolean;
  featuredOnly: boolean;
};

export const defaultFilters: Filters = {
  query: "",
  categories: [],
  brands: [],
  ages: [],
  colors: [],
  minRating: 0,
  price: null,
  inStockOnly: false,
  onSaleOnly: false,
  newOnly: false,
  bestSellerOnly: false,
  featuredOnly: false,
};

export function activeFilterCount(filters: Filters) {
  let count =
    filters.categories.length +
    filters.brands.length +
    filters.ages.length +
    filters.colors.length;
  if (filters.minRating > 0) count += 1;
  if (filters.price) count += 1;
  for (const key of ["inStockOnly", "onSaleOnly", "newOnly", "bestSellerOnly", "featuredOnly"] as const) {
    if (filters[key]) count += 1;
  }
  if (filters.query.trim()) count += 1;
  return count;
}

export function searchProducts(query: string, limit = 6): CatalogProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products
    .map((product) => {
      const haystack = [
        product.name,
        product.brand,
        product.category,
        product.sku,
        product.shortDescription,
      ]
        .join(" ")
        .toLowerCase();
      const score = haystack.includes(q)
        ? product.name.toLowerCase().startsWith(q)
          ? 3
          : product.name.toLowerCase().includes(q)
            ? 2
            : 1
        : 0;
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.product.popularity - a.product.popularity)
    .slice(0, limit)
    .map((entry) => entry.product);
}

export function filterProducts(list: CatalogProduct[], filters: Filters) {
  const q = filters.query.trim().toLowerCase();
  return list.filter((product) => {
    if (q) {
      const haystack = [product.name, product.brand, product.category, product.sku]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    // OR within each group, AND across groups. Matching is normalised so
    // case, dash style, spacing and "years" suffixes never break a match.
    if (!matchesAny(product, CATEGORY_KEYS, filters.categories)) return false;
    if (!matchesAny(product, BRAND_KEYS, filters.brands)) return false;
    if (!matchesAny(product, AGE_KEYS, filters.ages)) return false;
    if (!matchesAny(product, COLOR_KEYS, filters.colors)) return false;
    if (filters.minRating && product.rating < filters.minRating) return false;
    if (filters.price && (product.price < filters.price[0] || product.price > filters.price[1]))
      return false;
    if (filters.inStockOnly && product.stock === 0) return false;
    if (filters.onSaleOnly && !product.compareAt) return false;
    if (filters.newOnly && !product.isNew) return false;
    if (filters.bestSellerOnly && !product.isBestSeller) return false;
    if (filters.featuredOnly && !product.isFeatured) return false;
    return true;
  });
}

export function sortProducts(list: CatalogProduct[], sort: SortKey) {
  const sorted = [...list];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "popular":
      return sorted.sort((a, b) => b.popularity - a.popularity);
    case "rated":
      return sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "az":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "za":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return sorted;
  }
}

export function relatedProducts(
  product: CatalogProduct,
  limit = 8,
  pool: CatalogProduct[] = products,
) {
  return pool
    .filter((item) => item.id !== product.id)

    .map((item) => ({
      item,
      score:
        (item.category === product.category ? 3 : 0) +
        (item.brand === product.brand ? 2 : 0) +
        (item.ageGroup === product.ageGroup ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.item.popularity - a.item.popularity)
    .slice(0, limit)
    .map((entry) => entry.item);
}
