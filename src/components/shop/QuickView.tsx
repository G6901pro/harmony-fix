import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Loader2,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  colorToken,
  currency,
  discountPercent,
  getRelatedProducts,
  type CatalogProduct,
} from "@/lib/catalog";
import { safeQty, shopActions, useShopState } from "@/lib/shop-store";
import { addProductToBag } from "@/lib/cart-actions";
import { Rating } from "@/components/ui/Rating";
import { cn } from "@/lib/utils";

type ButtonState = "idle" | "loading" | "success";

const PANEL =
  "relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[22px] border border-border bg-surface/95 shadow-[var(--shadow-lux)] backdrop-blur-2xl";

export function QuickView({
  product,
  onClose,
  onOpen,
}: {
  product: CatalogProduct | null;
  onClose: () => void;
  onOpen?: (product: CatalogProduct) => void;
}) {
  const navigate = useNavigate();
  const { wishlist } = useShopState();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [imageIndex, setImageIndex] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [bagState, setBagState] = useState<ButtonState>("idle");
  const [buyState, setBuyState] = useState<ButtonState>("idle");

  // Reset per-product selections whenever a new product is opened.
  useEffect(() => {
    if (!product) return;
    setImageIndex(0);
    setQty(1);
    setSize(product.sizes?.[0] ?? null);
    setColor(product.colorOptions[0] ?? null);
    setBagState("idle");
    setBuyState("idle");
    scrollRef.current?.scrollTo({ top: 0 });
    shopActions.markViewed(product.id);
  }, [product]);

  // ESC to close + background scroll lock.
  useEffect(() => {
    if (!product) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [product, onClose]);

  const related = useMemo(() => (product ? getRelatedProducts(product, 10) : []), [product]);

  if (!product) return null;

  const wished = wishlist.includes(product.id);
  const discount = discountPercent(product);
  const stock = Number.isFinite(product.stock) ? Math.max(0, Math.floor(product.stock)) : 0;
  const soldOut = stock === 0;
  /** Quantity picker ceiling — never above available stock. */
  const maxQty = Math.max(1, stock);

  const addToBag = () => {
    if (soldOut || bagState !== "idle") return;
    setBagState("loading");
    const added = addProductToBag(product, qty, {
      description: [color, size].filter(Boolean).join(" · ") || undefined,
    });
    if (!added) {
      setBagState("idle");
      return;
    }
    window.setTimeout(() => {
      setBagState("success");
      window.setTimeout(() => setBagState("idle"), 1600);
    }, 450);
  };

  const buyNow = () => {
    if (soldOut || buyState !== "idle") return;
    setBuyState("loading");
    if (!addProductToBag(product, qty, { silent: true })) {
      setBuyState("idle");
      return;
    }
    window.setTimeout(() => {
      setBuyState("success");
      onClose();
      navigate({ to: "/checkout" });
    }, 450);
  };

  const share = async () => {
    const url = `${window.location.origin}/product/${product.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Product link copied");
    } catch {
      toast("Sharing was cancelled");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view: ${product.name}`}
      onClick={onClose}
      className="fixed inset-0 z-[80] grid animate-[lux-fade-in_0.25s_ease-out] place-items-center bg-background/70 p-3 backdrop-blur-xl sm:p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={cn(PANEL, "animate-[quick-view-in_0.35s_cubic-bezier(0.16,1,0.3,1)]")}
      >
        <button
          type="button"
          aria-label="Close quick view"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 grid size-10 place-items-center rounded-full border border-border bg-background/70 text-foreground transition-all duration-500 hover:rotate-90 hover:border-gold/60 hover:text-gold"
        >
          <X className="size-4" />
        </button>

        <div ref={scrollRef} className="overflow-y-auto overscroll-contain">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            {/* Gallery */}
            <div className="p-4 sm:p-6">
              <div className="relative aspect-square overflow-hidden rounded-[20px] border border-border bg-surface-2">
                <img
                  key={product.images[imageIndex]}
                  src={product.images[imageIndex]}
                  alt={`${product.name} — view ${imageIndex + 1}`}
                  width={1200}
                  height={1200}
                  className="size-full animate-[lux-fade-in_0.4s_ease-out] object-cover"
                />
                {discount > 0 ? (
                  <span className="absolute top-4 left-4 rounded-full bg-[image:var(--gradient-gold)] px-3 py-1 text-[9px] font-semibold tracking-[0.2em] text-primary-foreground uppercase">
                    −{discount}%
                  </span>
                ) : null}
                <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-between">
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() =>
                      setImageIndex((i) => (i - 1 + product.images.length) % product.images.length)
                    }
                    className="glass pointer-events-auto grid size-9 place-items-center rounded-full transition-colors hover:text-gold"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setImageIndex((i) => (i + 1) % product.images.length)}
                    className="glass pointer-events-auto grid size-9 place-items-center rounded-full transition-colors hover:text-gold"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              <ul className="mt-4 grid grid-cols-4 gap-3">
                {product.images.map((image, index) => (
                  <li key={image + index}>
                    <button
                      type="button"
                      aria-label={`Show image ${index + 1}`}
                      aria-pressed={index === imageIndex}
                      onClick={() => setImageIndex(index)}
                      className={cn(
                        "block w-full overflow-hidden rounded-xl border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-gold/60",
                        index === imageIndex
                          ? "border-gold shadow-[0_10px_30px_-18px_var(--gold)]"
                          : "border-border opacity-70 hover:opacity-100",
                      )}
                    >
                      <img
                        src={image}
                        alt=""
                        aria-hidden
                        width={300}
                        height={300}
                        className="aspect-square size-full object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Details */}
            <div className="flex flex-col gap-5 border-t border-border p-5 sm:p-8 lg:border-t-0 lg:border-l">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-12">
                <p className="eyebrow">{product.category}</p>
                <span className="text-[10px] tracking-[0.2em] text-muted-foreground/70 uppercase">
                  {product.brand}
                </span>
              </div>

              <h2 className="font-display text-2xl leading-tight sm:text-3xl">{product.name}</h2>
              <Rating value={product.rating} count={product.reviews} />

              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-3xl text-gold">
                  {currency.format(product.price)}
                </span>
                {product.compareAt ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {currency.format(product.compareAt)}
                    </span>
                    <span className="rounded-full border border-gold/40 px-2.5 py-1 text-[9px] tracking-[0.2em] text-gold uppercase">
                      Save {discount}%
                    </span>
                  </>
                ) : null}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.shortDescription}
              </p>

              {product.sizes && product.sizes.length > 0 ? (
                <div>
                  <p className="eyebrow">Size</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {product.sizes.map((option) => (
                      <li key={option}>
                        <button
                          type="button"
                          aria-pressed={size === option}
                          onClick={() => setSize(option)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-[10px] tracking-[0.18em] uppercase transition-all duration-500 hover:-translate-y-0.5 hover:border-gold/60 hover:text-gold",
                            size === option
                              ? "border-gold text-gold"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {option}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {product.colorOptions.length > 0 ? (
              <div>
                <p className="eyebrow">
                  Finish{color ? <span className="ml-2 normal-case">— {color}</span> : null}
                </p>
                <ul className="mt-3 flex flex-wrap gap-3">
                  {product.colorOptions.map((option) => (
                    <li key={option}>
                      <button
                        type="button"
                        aria-label={option}
                        aria-pressed={color === option}
                        onClick={() => setColor(option)}
                        className={cn(
                          "grid size-9 place-items-center rounded-full border transition-all duration-500 hover:-translate-y-0.5 hover:border-gold/70",
                          color === option ? "border-gold" : "border-border",
                        )}
                      >
                        <span
                          className="size-6 rounded-full"
                          style={{ backgroundColor: colorToken(option) }}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              ) : null}


              <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center rounded-full border border-border">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQty((value) => Math.max(1, safeQty(value, 1) - 1))}
                    className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:text-gold"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-sm">{qty}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={qty >= maxQty}
                    onClick={() =>
                      setQty((value) => {
                        const next = Math.max(1, Math.min(maxQty, safeQty(value, 1) + 1));
                        if (next === value) toast.error(`Only ${maxQty} in stock`);
                        return next;
                      })
                    }
                    className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:text-gold"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <span
                  className={cn(
                    "inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase",
                    soldOut
                      ? "text-destructive"
                      : product.stock <= 5
                        ? "text-gold"
                        : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn("size-1.5 rounded-full", soldOut ? "bg-destructive" : "bg-gold")}
                    aria-hidden
                  />
                  {soldOut
                    ? "Sold out"
                    : product.stock <= 5
                      ? `Only ${product.stock} left`
                      : `In stock — ${product.stock} units`}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={soldOut || bagState === "loading"}
                  onClick={addToBag}
                  className={cn(
                    "inline-flex min-w-[180px] flex-1 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[10px] font-semibold tracking-[0.22em] uppercase transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50",
                    bagState === "success"
                      ? "bg-gold/15 text-gold"
                      : "bg-[image:var(--gradient-gold)] text-primary-foreground hover:shadow-[0_18px_50px_-20px_var(--gold)]",
                  )}
                >
                  {bagState === "loading" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : bagState === "success" ? (
                    <Check className="size-3.5" />
                  ) : (
                    <ShoppingBag className="size-3.5" />
                  )}
                  {bagState === "success" ? "Added to bag" : "Add to bag"}
                </button>

                <button
                  type="button"
                  disabled={soldOut || buyState === "loading"}
                  onClick={buyNow}
                  className="glass inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[10px] tracking-[0.22em] uppercase transition-all duration-500 hover:-translate-y-0.5 hover:text-gold active:translate-y-0 disabled:opacity-50"
                >
                  {buyState === "loading" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Zap className="size-3.5" />
                  )}
                  Buy now
                </button>

                <button
                  type="button"
                  aria-pressed={wished}
                  aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
                  onClick={() => {
                    shopActions.toggleWishlist(product.id);
                    toast.success(wished ? "Removed from wishlist" : "Saved to wishlist");
                  }}
                  className={cn(
                    "glass grid size-12 place-items-center rounded-full transition-all duration-500 hover:-translate-y-0.5 hover:text-gold",
                    wished && "text-gold",
                  )}
                >
                  <Heart className={cn("size-4", wished && "fill-gold")} />
                </button>

                <button
                  type="button"
                  aria-label="Share this product"
                  onClick={share}
                  className="glass grid size-12 place-items-center rounded-full transition-all duration-500 hover:-translate-y-0.5 hover:text-gold"
                >
                  <Share2 className="size-4" />
                </button>
              </div>

              <ul className="grid gap-3 rounded-[20px] border border-border bg-surface-2/60 p-5 text-xs text-muted-foreground sm:grid-cols-2">
                <li className="flex items-start gap-3">
                  <Truck className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block text-foreground">Delivery in 2–4 days</span>
                    Inside Dhaka next-day, nationwide 2–4 days
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Wallet className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block text-foreground">Cash on Delivery available</span>
                    Also bKash & Dutch-Bangla Bank
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <RotateCcw className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block text-foreground">7-day return & exchange</span>
                    Unused items in original packaging
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block text-foreground">{product.warranty}</span>
                    SKU {product.sku}
                  </span>
                </li>
              </ul>

              <Link
                to="/product/$slug"
                params={{ slug: product.slug }}
                onClick={onClose}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] text-muted-foreground uppercase transition-colors hover:text-gold"
              >
                <Eye className="size-3.5" /> View full details
              </Link>
            </div>
          </div>

          {/* Specifications */}
          <section className="border-t border-border px-5 py-8 sm:px-8">
            <h3 className="eyebrow flex items-center gap-2">
              <Package className="size-3.5 text-gold" /> Specifications
            </h3>
            <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {product.specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 text-xs"
                >
                  <dt className="text-muted-foreground">{spec.label}</dt>
                  <dd className="text-right text-foreground">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Reviews */}
          <section className="border-t border-border px-5 py-8 sm:px-8">
            <h3 className="eyebrow flex items-center gap-2">
              <BadgeCheck className="size-3.5 text-gold" /> Customer reviews
              <span className="ml-1 normal-case">({product.reviews})</span>
            </h3>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {product.reviewsList.slice(0, 3).map((review) => (
                <li
                  key={review.id}
                  className="rounded-[20px] border border-border bg-surface-2/60 p-5 transition-all duration-500 hover:-translate-y-0.5 hover:border-gold/40"
                >
                  <Rating value={review.rating} />
                  <p className="mt-3 font-display text-base">{review.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {review.text}
                  </p>
                  <p className="mt-4 text-[10px] tracking-[0.2em] text-muted-foreground/80 uppercase">
                    {review.name} · {review.date}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Related products */}
          <section className="border-t border-border px-5 py-8 sm:px-8">
            <h3 className="eyebrow">You may also like</h3>
            <ul className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {related.map((item) => (
                <li key={item.id} className="w-[190px] shrink-0 snap-start">
                  <button
                    type="button"
                    onClick={() => onOpen?.(item)}
                    className="group block w-full overflow-hidden rounded-[20px] border border-border bg-surface-2/60 text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_20px_50px_-30px_var(--gold)]"
                  >
                    <span className="block aspect-square overflow-hidden">
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        width={400}
                        height={400}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      />
                    </span>
                    <span className="block p-4">
                      <span className="block truncate text-sm transition-colors group-hover:text-gold">
                        {item.name}
                      </span>
                      <span className="mt-1 block text-xs text-gold">
                        {currency.format(item.price)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
