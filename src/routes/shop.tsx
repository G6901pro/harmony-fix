import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Grid2X2, Grid3X3, LayoutGrid, List, SlidersHorizontal, Ticket } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Crumbs } from "@/components/shop/Crumbs";
import { SearchBar } from "@/components/shop/SearchBar";
import { FilterPanel } from "@/components/shop/FilterPanel";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { SkeletonGrid } from "@/components/shop/Skeletons";
import { EmptyState } from "@/components/shop/EmptyState";
import { ProductCarousel } from "@/components/shop/ProductCarousel";
import { computePriceBounds, type CatalogProduct } from "@/lib/catalog";
import { useStorefrontProducts } from "@/lib/storefront-products";
import {
  defaultFilters,
  filterProducts,
  sortProducts,
  activeFilterCount,
  SORT_OPTIONS,
  type Filters,
  type SortKey,
} from "@/lib/shop-filters";
import { useShopState } from "@/lib/shop-store";
import { cn } from "@/lib/utils";

const TITLE = "Shop All Luxury Toys & Ride-Ons — Velocita Vault";
const DESCRIPTION =
  "Browse the full Velocita Vault collection: ride-on and electric cars, collector RC machines, educational ateliers and heirloom gifts. Filter by age, brand, price and rating.";

/**
 * Storefront navigation ("View all collections", "Shop best sellers",
 * "Shop new arrivals", category tiles) lands here with search parameters, so
 * every entry point opens the catalogue already filtered.
 */
type ShopSearch = {
  category?: string;
  brand?: string;
  age?: string;
  tag?: "best-sellers" | "new-arrivals" | "featured" | "sale";
  q?: string;
};

const asString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export const Route = createFileRoute("/shop")({
  component: ShopPage,
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    const tag = asString(search['tag']);
    return {
      ...(asString(search['category']) ? { category: asString(search['category'])! } : {}),
      ...(asString(search['brand']) ? { brand: asString(search['brand'])! } : {}),
      ...(asString(search['age']) ? { age: asString(search['age'])! } : {}),
      ...(tag === "best-sellers" || tag === "new-arrivals" || tag === "featured" || tag === "sale"
        ? { tag }
        : {}),
      ...(asString(search['q']) ? { q: asString(search['q'])! } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const PAGE_SIZE = 24;

function filtersFromSearch(search: ShopSearch): Filters {
  return {
    ...defaultFilters,
    query: search.q ?? "",
    categories: search.category ? [search.category] : [],
    brands: search.brand ? [search.brand] : [],
    ages: search.age ? [search.age] : [],
    newOnly: search.tag === "new-arrivals",
    bestSellerOnly: search.tag === "best-sellers",
    featuredOnly: search.tag === "featured",
    onSaleOnly: search.tag === "sale",
  };
}

const HEADINGS: Record<NonNullable<ShopSearch["tag"]>, string> = {
  "best-sellers": "Best sellers, chosen by our collectors.",
  "new-arrivals": "The newest arrivals in the Vault.",
  featured: "Featured pieces from the atelier.",
  sale: "Reduced, never compromised.",
};

function ShopPage() {
  const search = Route.useSearch();
  const [filters, setFilters] = useState<Filters>(() => filtersFromSearch(search));
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [columns, setColumns] = useState(4);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { recentlyViewed } = useShopState();
  const { products, isFetching } = useStorefrontProducts();

  // A fresh link (or an in-app navigation to a different section) reseeds the
  // filter panel so the requested slice is what the visitor sees.
  const searchKey = JSON.stringify(search);
  useEffect(() => {
    setFilters(filtersFromSearch(search));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);


  // Price range is derived from the live catalogue on every data change.
  const priceBounds = useMemo(() => computePriceBounds(products), [products]);

  // Keep any user-selected range inside the current catalogue bounds.
  useEffect(() => {
    setFilters((prev) => {
      if (!prev.price) return prev;
      const [min, max] = priceBounds;
      const lo = Math.min(Math.max(prev.price[0], min), max);
      const hi = Math.max(Math.min(prev.price[1], max), min);
      if (lo === prev.price[0] && hi === prev.price[1]) return prev;
      return { ...prev, price: [lo, hi] as [number, number] };
    });
  }, [priceBounds]);

  const results = useMemo(
    () => sortProducts(filterProducts(products, filters), sort),
    [products, filters, sort],
  );

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(timer);
  }, [filters, sort, page]);

  useEffect(() => setPage(1), [filters, sort]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const total = results.length;
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCount = activeFilterCount(filters);

  const gridCols =
    view === "list"
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : columns === 3
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";

  const recentProducts = recentlyViewed
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is CatalogProduct => Boolean(product));

  const viewButtons: {
    label: string;
    icon: typeof Grid2X2;
    active: boolean;
    onClick: () => void;
  }[] = [
    {
      label: "2 columns",
      icon: Grid2X2,
      active: view === "grid" && columns === 2,
      onClick: () => {
        setView("grid");
        setColumns(2);
      },
    },
    {
      label: "3 columns",
      icon: Grid3X3,
      active: view === "grid" && columns === 3,
      onClick: () => {
        setView("grid");
        setColumns(3);
      },
    },
    {
      label: "4 columns",
      icon: LayoutGrid,
      active: view === "grid" && columns === 4,
      onClick: () => {
        setView("grid");
        setColumns(4);
      },
    },
    { label: "List view", icon: List, active: view === "list", onClick: () => setView("list") },
  ];

  const tag = search.tag as ShopSearch["tag"];
  const sliceLabel = tag
    ? tag === "best-sellers"
      ? "Best Sellers"
      : tag === "new-arrivals"
        ? "New Arrivals"
        : tag === "featured"
          ? "Featured"
          : "On Sale"
    : ((search.category ?? search.brand ?? search.age ?? null) as string | null);

  const heading = tag
    ? HEADINGS[tag]
    : sliceLabel
      ? `${sliceLabel}, inspected and numbered.`
      : "Every piece, inspected and numbered.";

  return (
    <>
      <Header />
      <main className="pt-28 lg:pt-32">
        {/* Luxury page header */}
        <section className="border-b border-border bg-surface/40">
          <div className="mx-auto max-w-[1400px] px-5 py-14 lg:px-10 lg:py-20">
            <Crumbs
              trail={[
                { label: "Shop" },
                ...(sliceLabel ? [{ label: sliceLabel }] : []),
              ]}
            />
            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
              <div className="min-w-0">
                <p className="eyebrow flex items-center gap-3">
                  <span className="hairline-gold inline-block h-px w-8" aria-hidden />
                  {sliceLabel ?? "The Vault Collection"}
                </p>
                <h1 className="mt-4 font-display text-4xl leading-[1.03] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  {heading}
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {DESCRIPTION}
                </p>
              </div>
              <SearchBar
                value={filters.query}
                onValueChange={(query) => setFilters((prev) => ({ ...prev, query }))}
                className="w-full"
              />
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-12 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-10 lg:py-16">
          {/* Sticky desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
              <FilterPanel filters={filters} onChange={setFilters} priceBounds={priceBounds} />
              <div className="lux-card mt-8 flex items-start gap-3 p-5">
                <Ticket className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] tracking-[0.22em] uppercase">Coupons</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Concierge coupon codes unlock at checkout — arriving in a later release.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            {/* Toolbar */}
            <div className="glass grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-4 py-3 sm:px-5">
              <p className="min-w-0 truncate text-xs text-muted-foreground">
                Showing{" "}
                <span className="text-foreground">
                  {start}–{end}
                </span>{" "}
                of <span className="text-foreground">{total}</span> products
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] tracking-[0.2em] uppercase hover:text-gold lg:hidden"
                >
                  <SlidersHorizontal className="size-3.5" />
                  Filters{activeCount ? ` (${activeCount})` : ""}
                </button>
                <div className="hidden items-center gap-1 rounded-full border border-border p-1 sm:flex">
                  {viewButtons.map((button) => (
                    <button
                      key={button.label}
                      type="button"
                      aria-label={button.label}
                      aria-pressed={button.active}
                      onClick={button.onClick}
                      className={cn(
                        "grid size-8 place-items-center rounded-full transition-colors",
                        button.active
                          ? "bg-surface-2 text-gold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <button.icon className="size-4" />
                    </button>
                  ))}
                </div>
                <label className="sr-only" htmlFor="sort-select">
                  Sort products
                </label>
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-[10px] tracking-[0.16em] text-foreground uppercase focus:border-gold/50 focus:outline-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid */}
            <div className="mt-8">
              {loading || isFetching ? (
                <SkeletonGrid
                  count={view === "list" ? 3 : columns * 2}
                  view={view}
                  columns={columns}
                />
              ) : total === 0 ? (
                filters.query.trim() ? (
                  <EmptyState
                    variant="search"
                    title={`No results for “${filters.query}”`}
                    description="We couldn't match that name, brand, category or SKU. Try a broader term or clear your search."
                    actionLabel="Clear search"
                    onAction={() => setFilters((prev) => ({ ...prev, query: "" }))}
                  />
                ) : activeCount > 0 ? (
                  <EmptyState
                    variant="filter"
                    title="No pieces match these filters"
                    description="Your combination is a little too precise. Relax a filter or two and the Vault will open again."
                    actionLabel="Clear all filters"
                    onAction={() => setFilters(defaultFilters)}
                  />
                ) : (
                  <EmptyState
                    title="The Vault is being restocked"
                    description="No products are currently listed. Our atelier is preparing the next release."
                  />
                )
              ) : (
                <div className={cn("grid animate-[lux-fade-in_0.5s_ease-out] gap-5", gridCols)}>
                  {pageItems.map((product) => (
                    <ShopProductCard key={product.id} product={product} view={view} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!loading && pageCount > 1 ? (
              <nav
                aria-label="Pagination"
                className="mt-12 flex flex-wrap items-center justify-center gap-2"
              >
                {Array.from({ length: pageCount }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-current={page === index + 1 ? "page" : undefined}
                    onClick={() => {
                      setPage(index + 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={cn(
                      "grid size-10 place-items-center rounded-full border text-xs transition-colors",
                      page === index + 1
                        ? "border-gold text-gold"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </nav>
            ) : null}

            {recentProducts.length > 0 ? (
              <ProductCarousel
                eyebrow="Recently Viewed"
                title="Back to what caught your eye."
                products={recentProducts}
              />
            ) : null}
          </div>
        </div>
      </main>
      <Footer />

      {/* Mobile filter drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[70] lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!drawerOpen}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={cn(
            "absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-500",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          role="dialog"
          aria-label="Product filters"
          className={cn(
            "absolute inset-y-0 left-0 w-[88%] max-w-sm overflow-y-auto border-r border-border bg-background p-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            priceBounds={priceBounds}
            onClose={() => setDrawerOpen(false)}
          />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="mt-8 w-full rounded-full bg-[image:var(--gradient-gold)] py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase"
          >
            Show {total} products
          </button>
        </div>
      </div>
    </>
  );
}
