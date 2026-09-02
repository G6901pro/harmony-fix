import { useEffect, useMemo, useState } from "react";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Box,
  Check,
  GitCompareArrows,
  Heart,
  Maximize2,
  Minus,
  PackageCheck,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Share2,
  Shield,
  ShoppingBag,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Crumbs } from "@/components/shop/Crumbs";
import { ProductCarousel } from "@/components/shop/ProductCarousel";
import { Rating } from "@/components/ui/Rating";
import {
  currency,
  discountPercent,
  getProductBySlug,
  
  type CatalogProduct,
} from "@/lib/catalog";
import { ProductOptions } from "@/components/shop/ProductOptions";
import {
  resolveSelection,
  selectionLabel,
  useProductOptions,
} from "@/lib/product-options";
import { relatedProducts } from "@/lib/shop-filters";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { safeQty, shopActions, useShopState } from "@/lib/shop-store";
import { useMockAuth } from "@/lib/mock-auth";
import { useStorefrontProducts } from "@/lib/storefront-products";
import { useVipUserIds } from "@/lib/vip";
import { VipBadge } from "@/components/account/VipBadge";
import { useLanguage } from "@/lib/language";
import { useProductReviews, useReviewEligibility, useSubmitReview } from "@/lib/reviews";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    // Admin-managed products are resolved client-side from the live catalogue.
    const product = getProductBySlug(params.slug) ?? null;
    return { product, slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.product) {
      return {
        meta: [
          { title: "Product — Velocita Vault" },
          { name: "description", content: "Explore this piece from the Velocita Vault collection." },
          { property: "og:title", content: "Product — Velocita Vault" },
          { property: "og:description", content: "Explore this piece from the Velocita Vault collection." },
          { property: "og:type", content: "product" },
          { name: "twitter:card", content: "summary_large_image" },
        ],
      };
    }
    const { product } = loaderData;
    const title = `${product.name} — ${product.brand} | Velocita Vault`;
    return {
      meta: [
        { title },
        { name: "description", content: product.shortDescription },
        { property: "og:title", content: title },
        { property: "og:description", content: product.shortDescription },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: ProductNotFound,
});

function ProductNotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-5 pt-32 text-center">
        <div>
          <h1 className="font-display text-3xl">This piece has left the Vault</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            The product you're looking for is no longer listed.
          </p>
          <Link
            to="/shop"
            className="mt-8 inline-flex rounded-full bg-[image:var(--gradient-gold)] px-7 py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase"
          >
            Back to shop
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

const DELIVERY_BADGES = [
  { icon: Truck, label: "Cash on delivery available" },
  { icon: RotateCcw, label: "14-day easy return" },
  { icon: Shield, label: "Official 24-month warranty" },
  { icon: Box, label: "Premium signature packaging" },
];

function Gallery({ product, images }: { product: CatalogProduct; images: string[] }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => setIndex(0), [product.id, images[0]]);

  return (
    <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)]">
      <ul className="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col sm:overflow-visible">
        {images.map((image, i) => (
          <li key={image + i} className="shrink-0">
            <button
              type="button"
              aria-label={`View image ${i + 1}`}
              aria-pressed={index === i && !showVideo}
              onClick={() => {
                setIndex(i);
                setShowVideo(false);
              }}
              className={cn(
                "size-20 overflow-hidden rounded-lg border transition-colors",
                index === i && !showVideo ? "border-gold" : "border-border hover:border-gold/50",
              )}
            >
              <img src={image} alt="" width={160} height={160} loading="lazy" className="size-full object-cover" />
            </button>
          </li>
        ))}
        <li className="shrink-0">
          <button
            type="button"
            aria-label="Play product video"
            aria-pressed={showVideo}
            onClick={() => setShowVideo(true)}
            className={cn(
              "grid size-20 place-items-center rounded-lg border text-muted-foreground transition-colors",
              showVideo ? "border-gold text-gold" : "border-border hover:border-gold/50",
            )}
          >
            <Play className="size-5" />
          </button>
        </li>
      </ul>

      <div className="order-1 sm:order-2">
        <div
          className="lux-card relative aspect-square overflow-hidden bg-surface-2"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setZoom({
              x: ((event.clientX - rect.left) / rect.width) * 100,
              y: ((event.clientY - rect.top) / rect.height) * 100,
            });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          {showVideo ? (
            <div className="grid size-full place-items-center gap-4 bg-background/60 p-8 text-center">
              <div>
                <Play className="mx-auto size-10 text-gold" aria-hidden />
                <p className="mt-4 font-display text-xl">Product film</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  A full studio film for this piece is being produced by our atelier.
                </p>
              </div>
            </div>
          ) : (
            <img
              src={images[index] ?? images[0]}
              alt={`${product.name} — view ${index + 1}`}
              width={1200}
              height={1200}
              loading="eager"
              decoding="async"
              className="size-full object-cover transition-transform duration-300"
              style={
                zoom
                  ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
                  : undefined
              }
            />
          )}

          <div className="absolute top-4 right-4 flex gap-2">
            <button
              type="button"
              aria-label="360 degree viewer"
              onClick={() => toast("360° viewer coming soon", { description: "Full spin captures are in production." })}
              className="glass grid size-10 place-items-center rounded-full hover:text-gold"
            >
              <RotateCw className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Open fullscreen viewer"
              onClick={() => setFullscreen(true)}
              className="glass grid size-10 place-items-center rounded-full hover:text-gold"
            >
              <Maximize2 className="size-4" />
            </button>
          </div>
        </div>
        <p className="mt-3 text-center text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Hover to zoom · Click expand for fullscreen
        </p>
      </div>

      {fullscreen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen image viewer"
          className="fixed inset-0 z-[90] grid place-items-center bg-background/95 p-6 backdrop-blur-xl"
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            aria-label="Close fullscreen viewer"
            className="absolute top-6 right-6 grid size-11 place-items-center rounded-full border border-border text-foreground hover:text-gold"
          >
            <X className="size-5" />
          </button>
          <img
            src={images[index] ?? images[0]}
            alt={product.name}
            className="max-h-[86vh] w-auto max-w-full rounded-xl object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}

type DisplayReview = {
  id: string;
  name: string;
  date: string;
  rating: number;
  title: string;
  text: string;
  images: string[];
  verified: boolean;
  reply?: string | null;
  pending?: boolean;
  vip?: boolean;
};

function ReviewsBlock({ product }: { product: CatalogProduct }) {
  const { t } = useLanguage();
  const { requireAuth } = useMockAuth();
  const { data: dbReviews = [], isError: reviewsFailed } = useProductReviews(product.slug);
  const { data: eligibility } = useReviewEligibility(product.slug);
  const submit = useSubmitReview(product.slug);

  const vipUserIds = useVipUserIds();
  const [filterStar, setFilterStar] = useState(0);
  const [sort, setSort] = useState<"recent" | "highest" | "lowest">("recent");
  const [withImages, setWithImages] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ rating: 5, title: "", body: "" });

  // Verified buyer reviews first, then the product's default (curated) reviews.
  const productReviews = useMemo<DisplayReview[]>(() => {
    try {
      const live: DisplayReview[] = (Array.isArray(dbReviews) ? dbReviews : [])
        .filter((review) => review && typeof review.id === "string")
        .map((review) => {
          const parsed = review.created_at ? new Date(review.created_at) : null;
          const rating = Number(review.rating);
          return {
            id: review.id,
            name: review.author_name || "Verified buyer",
            date:
              parsed && !Number.isNaN(parsed.getTime())
                ? parsed.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "",
            rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : 5,
            title: review.title ?? "",
            text: review.body ?? "",
            images: [],
            verified: Boolean(review.is_verified_purchase),
            reply: review.admin_reply,
            pending: review.status !== "approved",
            vip: vipUserIds.has(review.user_id),
          };
        });
      // Curated copy is only a safety net for a product with no stored reviews.
      if (live.length > 0) return live;
      return (Array.isArray(product.reviewsList) ? product.reviewsList : [])
        .filter((review) => review && typeof review.id === "string")
        .map((review) => ({
          id: review.id,
          name: review.name ?? "Verified buyer",
          date: review.date ?? "",
          rating: Number.isFinite(review.rating) ? review.rating : 5,
          title: review.title ?? "",
          text: review.text ?? "",
          images: Array.isArray(review.images) ? review.images : [],
          verified: Boolean(review.verified),
        }));
    } catch (error) {
      console.error("[reviews] could not build review list", error);
      return [];
    }
  }, [dbReviews, product.reviewsList, vipUserIds]);

  const list = useMemo(() => {
    let items = [...productReviews];
    if (filterStar) items = items.filter((review) => review.rating === filterStar);
    if (withImages) items = items.filter((review) => review.images.length > 0);
    if (sort === "highest") items.sort((a, b) => b.rating - a.rating);
    if (sort === "lowest") items.sort((a, b) => a.rating - b.rating);
    return items;
  }, [productReviews, filterStar, sort, withImages]);

  const average = productReviews.length
    ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
    : 0;

  const writeLabel = !eligibility?.signedIn
    ? t("reviews.signInToReview")
    : eligibility.alreadyReviewed
      ? t("reviews.alreadyReviewed")
      : !eligibility.verifiedBuyer
        ? t("reviews.buyToReview")
        : t("reviews.write");

  return (
    <section id="reviews" className="mt-20 border-t border-border pt-16">
      <h2 className="font-display text-2xl sm:text-3xl">{t("reviews.heading")}</h2>
      {reviewsFailed ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Live reviews could not be loaded right now.
        </p>
      ) : null}
      <div className="mt-8 grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="lux-card h-fit p-8">
          <p className="font-display text-5xl text-gold">{average.toFixed(1)}</p>
          <Rating value={average} className="mt-3" />
          <p className="mt-2 text-xs text-muted-foreground">
            {t("reviews.basedOn")} {productReviews.length} {t("reviews.verifiedReviews")}
          </p>
          <ul className="mt-6 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = productReviews.filter((review) => review.rating === star).length;
              const pct = productReviews.length
                ? Math.round((count / productReviews.length) * 100)
                : 0;
              return (
                <li key={star} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{star}★</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-[image:var(--gradient-gold)]"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="text-muted-foreground">{count}</span>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={eligibility?.signedIn && !eligibility.canReview}
            onClick={() => requireAuth(() => setFormOpen(true), "review")}
            className="mt-8 w-full rounded-full border border-border py-3 text-[10px] tracking-[0.22em] uppercase transition-colors hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {writeLabel}
          </button>

          {formOpen && eligibility?.canReview ? (
            <form
              className="mt-6 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                submit.mutate(draft, {
                  onSuccess: () => {
                    setFormOpen(false);
                    setDraft({ rating: 5, title: "", body: "" });
                    toast.success(t("reviews.pendingApproval"));
                  },
                  onError: (error) =>
                    toast.error(error instanceof Error ? error.message : "Could not post review"),
                });
              }}
            >
              <select
                aria-label="Rating"
                value={draft.rating}
                onChange={(event) => setDraft({ ...draft, rating: Number(event.target.value) })}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              <input
                value={draft.title}
                maxLength={120}
                placeholder={t("reviews.titlePlaceholder")}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none"
              />
              <textarea
                value={draft.body}
                maxLength={1000}
                required
                placeholder={t("reviews.bodyPlaceholder")}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                className="min-h-28 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submit.isPending}
                  className="flex-1 rounded-full bg-[image:var(--gradient-gold)] py-2.5 text-[10px] tracking-[0.22em] text-primary-foreground uppercase disabled:opacity-60"
                >
                  {t("reviews.submit")}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-full border border-border px-4 py-2.5 text-[10px] tracking-[0.22em] uppercase"
                >
                  {t("reviews.cancel")}
                </button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {[0, 5, 4, 3].map((star) => (
              <button
                key={star}
                type="button"
                aria-pressed={filterStar === star}
                onClick={() => setFilterStar(star)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[10px] tracking-[0.2em] uppercase transition-colors",
                  filterStar === star
                    ? "border-gold text-gold"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {star === 0 ? t("reviews.all") : `${star} stars`}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={withImages}
              onClick={() => setWithImages((v) => !v)}
              className={cn(
                "rounded-full border px-4 py-2 text-[10px] tracking-[0.2em] uppercase transition-colors",
                withImages ? "border-gold text-gold" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t("reviews.withPhotos")}
            </button>
            <label className="sr-only" htmlFor="review-sort">
              Sort reviews
            </label>
            <select
              id="review-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="ml-auto rounded-full border border-border bg-surface px-4 py-2 text-[10px] tracking-[0.16em] uppercase focus:outline-none"
            >
              <option value="recent">Most recent</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </div>

          <ul className="mt-6 space-y-4">
            {list.length === 0 ? (
              <li className="lux-card p-10 text-center text-sm text-muted-foreground">
                {t("reviews.none")}
              </li>
            ) : (
              list.map((review) => (
                <li key={review.id} className="lux-card p-6 sm:p-8">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-medium">{review.name}</p>
                        {review.vip ? <VipBadge compact /> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{review.date}</p>
                    </div>
                    {review.verified ? (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-gold/30 px-3 py-1 text-[9px] tracking-[0.18em] text-gold uppercase">
                        <BadgeCheck className="size-3" /> {t("reviews.verified")}
                      </span>
                    ) : null}
                  </div>
                  <Rating value={review.rating} className="mt-4" />
                  {review.title ? <p className="mt-3 font-display text-lg">{review.title}</p> : null}
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.text}</p>
                  {review.pending ? (
                    <p className="mt-3 text-[10px] tracking-[0.2em] text-gold uppercase">
                      {t("reviews.pendingApproval")}
                    </p>
                  ) : null}
                  {review.reply ? (
                    <div className="mt-4 rounded-lg border border-border bg-surface/60 p-4">
                      <p className="text-[10px] tracking-[0.2em] text-gold uppercase">
                        {t("reviews.storeReply")}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">{review.reply}</p>
                    </div>
                  ) : null}
                  {review.images.length > 0 ? (
                    <ul className="mt-4 flex gap-3">
                      {review.images.map((image) => (
                        <li key={image}>
                          <img
                            src={image}
                            alt=""
                            width={96}
                            height={96}
                            loading="lazy"
                            className="size-20 rounded-lg object-cover"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}


function ProductPage() {
  const loaderData = Route.useLoaderData() as { product: CatalogProduct | null; slug: string };
  const { products: liveProducts, isLoading } = useStorefrontProducts();
  const product =
    liveProducts.find((p) => p.slug === loaderData.slug) ?? loaderData.product ?? null;

  if (!product) {
    return isLoading ? (
      <>
        <Header />
        <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-5 pt-32">
          <p className="text-sm text-muted-foreground">Loading piece…</p>
        </main>
        <Footer />
      </>
    ) : (
      <ProductNotFound />
    );
  }

  return <ProductDetail product={product} catalogue={liveProducts} />;
}

function ProductDetail({
  product,
  catalogue,
}: {
  product: CatalogProduct;
  catalogue: CatalogProduct[];
}) {

  const { wishlist, compare, recentlyViewed } = useShopState();
  const { requireAuth } = useMockAuth();
  const [qty, setQty] = useState(1);
  const discount = discountPercent(product);
  const wished = wishlist.includes(product.id);
  const compared = compare.includes(product.id);

  // Options and variants come exclusively from the Admin Dashboard.
  const { groups, variants, selection, select, hasOptions } = useProductOptions(product.slug);
  const resolved = resolveSelection({
    basePrice: product.price,
    baseSku: product.sku,
    baseStock: product.stock,
    groups,
    variants,
    selection,
  });
  const livePrice = resolved.price;
  const liveSku = resolved.sku;
  const liveStock = Number.isFinite(resolved.stock ?? product.stock)
    ? Math.max(0, Math.floor((resolved.stock ?? product.stock) as number))
    : 0;
  const inStock = hasOptions ? resolved.available && liveStock > 0 : liveStock > 0;
  /** Hard ceiling for the quantity picker: never more than what is in stock. */
  const maxQty = Math.max(1, liveStock);
  const galleryImages = resolved.images.length
    ? [...resolved.images, ...product.images]
    : product.images;

  useEffect(() => {
    try {
      shopActions.markViewed(product.id);
    } catch (error) {
      console.error("[product] markViewed failed", error);
    }
    setQty(1);
  }, [product.id]);

  // Selecting a lower-stock variant must pull the picker back down.
  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(maxQty, safeQty(q, 1))));
  }, [maxQty]);

  const related = relatedProducts(product, 8, catalogue);
  const recent = recentlyViewed
    .filter((id) => id !== product.id)
    .map((id) => catalogue.find((item) => item.id === id))
    .filter((item): item is CatalogProduct => Boolean(item));


  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      toast("Sharing cancelled");
    }
  };

  return (
    <>
      <Header />
      <main className="pt-28 lg:pt-32">
        <div className="mx-auto max-w-[1400px] px-5 py-10 lg:px-10 lg:py-16">
          <Crumbs
            trail={[{ label: "Shop", to: "/shop" }, { label: product.category, to: "/shop" }, { label: product.name }]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
            <Gallery product={product} images={galleryImages} />

            <div className="min-w-0">
              <p className="eyebrow">
                {product.brand} · {product.category}
              </p>
              <h1 className="mt-4 font-display text-3xl leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {product.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Rating value={product.rating} count={product.reviews} />
                <a href="#reviews" className="text-xs text-muted-foreground underline-offset-4 hover:text-gold hover:underline">
                  Read reviews
                </a>
                <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  SKU {liveSku}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap items-baseline gap-4">
                <span className="font-display text-3xl text-gold">{currency.format(livePrice)}</span>
                {product.compareAt ? (
                  <span className="text-sm text-muted-foreground line-through">
                    {currency.format(product.compareAt)}
                  </span>
                ) : null}
                {discount > 0 ? (
                  <span className="rounded-full bg-[image:var(--gradient-gold)] px-3 py-1 text-[9px] font-semibold tracking-[0.2em] text-primary-foreground uppercase">
                    Save {discount}%
                  </span>
                ) : null}
              </div>

              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                {product.shortDescription}
              </p>

              <p className="mt-6 text-[11px] tracking-[0.22em] uppercase">
                {inStock ? (
                  <span className="text-gold">In stock — {liveStock} remaining</span>
                ) : (
                  <span className="text-destructive">Sold out</span>
                )}
              </p>

              <ProductOptions groups={groups} selection={selection} onSelect={select} />

              {/* Purchase area */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-full border border-border p-1">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQty((q) => Math.max(1, safeQty(q, 1) - 1))}
                    className="grid size-9 place-items-center rounded-full text-muted-foreground hover:text-gold"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-sm" aria-live="polite">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={qty >= maxQty}
                    onClick={() =>
                      setQty((q) => {
                        const next = Math.max(1, Math.min(maxQty, safeQty(q, 1) + 1));
                        if (next === q) toast.error(`Only ${maxQty} in stock`);
                        return next;
                      })
                    }
                    className="grid size-9 place-items-center rounded-full text-muted-foreground hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!inStock}
                  onClick={() => {
                    try {
                      const result = shopActions.addToCart(product.id, qty, maxQty);
                      if (result.added <= 0) {
                        toast.error(
                          maxQty > 0
                            ? `You already have all ${maxQty} available in your bag`
                            : "This piece is sold out",
                        );
                        return;
                      }
                      const label = selectionLabel(resolved);
                      toast.success(`${result.added} × ${product.name} added to bag`, {
                        description: result.clamped
                          ? `Limited to ${maxQty} in stock`
                          : label || undefined,
                      });
                    } catch (error) {
                      console.error("[product] add to bag failed", error);
                      toast.error("Could not add to bag. Please try again.");
                    }
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-7 py-3.5 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase transition-all hover:brightness-110 disabled:opacity-50"
                >
                  <ShoppingBag className="size-4" /> Add to bag
                </button>
                <button
                  type="button"
                  onClick={() =>
                    requireAuth(
                      () =>
                        toast("Checkout arrives in a later step", {
                          description: "Your selection is saved in the bag.",
                        }),
                      "buy-now",
                    )
                  }
                  className="glass inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[10px] tracking-[0.24em] uppercase hover:text-gold"
                >
                  <Zap className="size-4" /> Buy now
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                <button
                  type="button"
                  onClick={() =>
                    requireAuth(() => shopActions.toggleWishlist(product.id), "wishlist")
                  }
                  className={cn("inline-flex items-center gap-2 hover:text-gold", wished && "text-gold")}
                >
                  <Heart className={cn("size-4", wished && "fill-gold")} /> Wishlist
                </button>
                <button
                  type="button"
                  onClick={() => shopActions.toggleCompare(product.id)}
                  className={cn("inline-flex items-center gap-2 hover:text-gold", compared && "text-gold")}
                >
                  <GitCompareArrows className="size-4" /> Compare
                </button>
                <button
                  type="button"
                  onClick={() => shopActions.toggleSaveForLater(product.id)}
                  className="inline-flex items-center gap-2 hover:text-gold"
                >
                  <PackageCheck className="size-4" /> Save for later
                </button>
                <button type="button" onClick={share} className="inline-flex items-center gap-2 hover:text-gold">
                  <Share2 className="size-4" /> Share
                </button>
              </div>

              {/* Delivery */}
              <div className="lux-card mt-8 p-6">
                <p className="text-[11px] tracking-[0.22em] uppercase">Delivery & assurance</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Estimated delivery in 2–5 business days, white-glove courier, insured and
                  tracked worldwide.
                </p>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {DELIVERY_BADGES.map((badge) => (
                    <li key={badge.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <badge.icon className="size-4 shrink-0 text-gold" aria-hidden />
                      {badge.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Details */}
          <section className="mt-20 grid gap-10 border-t border-border pt-16 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl">Specifications</h2>
              <dl className="mt-6 divide-y divide-border">
                {product.specs.map((spec) => (
                  <div key={spec.label} className="grid grid-cols-2 gap-4 py-3 text-sm">
                    <dt className="text-muted-foreground">{spec.label}</dt>
                    <dd className="min-w-0">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="space-y-10">
              <div>
                <h2 className="font-display text-2xl">Features</h2>
                <ul className="mt-6 space-y-3">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="font-display text-2xl">What's in the box</h2>
                <ul className="mt-6 space-y-3">
                  {product.boxContents.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                      <Box className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-[11px] tracking-[0.22em] uppercase">Warranty</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{product.warranty}</p>
                </div>
                <div>
                  <h3 className="text-[11px] tracking-[0.22em] uppercase">Age recommendation</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{product.ageGroup} years</p>
                </div>
                <div className="sm:col-span-2">
                  <h3 className="text-[11px] tracking-[0.22em] uppercase">Safety information</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{product.safety}</p>
                </div>
              </div>
            </div>
          </section>

          <ErrorBoundary boundary="product_reviews" silent>
            <ReviewsBlock product={product} />
          </ErrorBoundary>

          <ProductCarousel
            eyebrow="Customers also bought"
            title="Pairs beautifully with this piece."
            products={related.slice(0, 6)}
          />
          <ProductCarousel
            eyebrow="Recommended"
            title="Curated for the same collector."
            products={[...catalogue]
              .filter((item) => item.id !== product.id && item.isFeatured)
              .slice(0, 6)}

          />
          {recent.length > 0 ? (
            <ProductCarousel eyebrow="Recently viewed" title="Return to your last looks." products={recent} />
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
