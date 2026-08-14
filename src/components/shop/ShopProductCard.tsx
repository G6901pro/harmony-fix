import { Eye, GitCompareArrows, Heart, ShoppingBag, Zap } from "lucide-react";
import { useQuickView } from "@/lib/quick-view";
import { toast } from "sonner";
import { currency, discountPercent, type CatalogProduct } from "@/lib/catalog";
import { shopActions, useShopState } from "@/lib/shop-store";
import { addProductToBag } from "@/lib/cart-actions";
import { useMockAuth } from "@/lib/mock-auth";
import { Rating } from "@/components/ui/Rating";
import { cn } from "@/lib/utils";

function StockLabel({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="text-[10px] tracking-[0.2em] text-destructive uppercase">Sold out</span>
    );
  if (stock <= 5)
    return (
      <span className="text-[10px] tracking-[0.2em] text-gold uppercase">Only {stock} left</span>
    );
  return (
    <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">In stock</span>
  );
}

export function ShopProductCard({
  product,
  view = "grid",
  onQuickView,
}: {
  product: CatalogProduct;
  view?: "grid" | "list";
  onQuickView?: (product: CatalogProduct) => void;
}) {
  const quickView = useQuickView();
  const openQuickView = () => (onQuickView ?? quickView.open)(product);
  const { wishlist, compare } = useShopState();
  const { requireAuth } = useMockAuth();
  const wished = wishlist.includes(product.id);
  const compared = compare.includes(product.id);
  const discount = discountPercent(product);

  const iconBtn =
    "glass grid size-9 place-items-center rounded-full transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const media = (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-2",
        view === "grid" ? "aspect-square" : "aspect-[4/3] h-full sm:aspect-auto",
      )}
    >
      <button
        type="button"
        aria-label={`Quick view ${product.name}`}
        onClick={openQuickView}
        className="block size-full cursor-pointer"
      >
        <img
          src={product.images[0]}
          alt={product.name}
          width={900}
          height={900}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] group-hover:opacity-0"
        />
        <img
          src={product.images[1] ?? product.images[0]}
          alt=""
          aria-hidden
          width={900}
          height={900}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full scale-[1.06] object-cover opacity-0 transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100 group-hover:opacity-100"
        />
      </button>

      <div className="pointer-events-none absolute top-4 left-4 flex flex-col items-start gap-2">
        {product.isNew ? (
          <span className="glass rounded-full px-3 py-1 text-[9px] tracking-[0.24em] text-gold uppercase">
            New
          </span>
        ) : null}
        {product.isBestSeller ? (
          <span className="glass rounded-full px-3 py-1 text-[9px] tracking-[0.24em] uppercase">
            Best Seller
          </span>
        ) : null}
        {discount > 0 ? (
          <span className="rounded-full bg-[image:var(--gradient-gold)] px-3 py-1 text-[9px] font-semibold tracking-[0.2em] text-primary-foreground uppercase">
            −{discount}%
          </span>
        ) : null}
      </div>

      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 transition-opacity duration-500 group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          aria-label={
            wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`
          }
          aria-pressed={wished}
          onClick={() =>
            requireAuth(() => {
              shopActions.toggleWishlist(product.id);
              toast.success(wished ? "Removed from wishlist" : "Saved to wishlist");
            }, "wishlist")
          }
          className={cn(iconBtn, wished && "text-gold")}
        >
          <Heart className={cn("size-4", wished && "fill-gold")} />
        </button>
        <button
          type="button"
          aria-label={`Compare ${product.name}`}
          aria-pressed={compared}
          onClick={() => {
            shopActions.toggleCompare(product.id);
            toast.success(compared ? "Removed from compare" : "Added to compare");
          }}
          className={cn(iconBtn, compared && "text-gold")}
        >
          <GitCompareArrows className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Quick view ${product.name}`}
          onClick={openQuickView}
          className={iconBtn}
        >
          <Eye className="size-4" />
        </button>
      </div>

      {view === "grid" ? (
        <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            disabled={product.stock === 0}
            onClick={() => {
              addProductToBag(product);
            }}
            className="glass flex w-full items-center justify-center gap-2 rounded-full py-3 text-[10px] tracking-[0.24em] uppercase transition-colors hover:text-gold disabled:opacity-50"
          >
            <ShoppingBag className="size-3.5" />
            Add to bag
          </button>
        </div>
      ) : null}
    </div>
  );

  const info = (
    <div className={cn("flex flex-1 flex-col gap-3 p-5", view === "list" && "sm:p-8")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="eyebrow">{product.category}</p>
        <span className="text-[10px] tracking-[0.2em] text-muted-foreground/70 uppercase">
          {product.brand}
        </span>
      </div>
      <h3 className="font-display text-lg leading-snug">
        <button
          type="button"
          onClick={openQuickView}
          className="text-left transition-colors hover:text-gold"
        >
          {product.name}
        </button>
      </h3>
      <p
        className={cn(
          "text-xs leading-relaxed text-muted-foreground",
          view === "grid" && "line-clamp-2",
        )}
      >
        {product.shortDescription}
      </p>
      <Rating value={product.rating} count={product.reviews} />
      <StockLabel stock={product.stock} />
      <div className="mt-auto flex items-baseline gap-3 pt-2">
        <span className="text-base font-medium text-gold">{currency.format(product.price)}</span>
        {product.compareAt ? (
          <span className="text-xs text-muted-foreground line-through">
            {currency.format(product.compareAt)}
          </span>
        ) : null}
      </div>
      {view === "list" ? (
        <div className="flex flex-wrap gap-2 pt-3">
          <button
            type="button"
            disabled={product.stock === 0}
            onClick={() => {
              addProductToBag(product);
            }}
            className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[10px] tracking-[0.22em] uppercase hover:text-gold disabled:opacity-50"
          >
            <ShoppingBag className="size-3.5" /> Add to bag
          </button>
          <button
            type="button"
            disabled={product.stock === 0}
            onClick={() =>
              requireAuth(
                () =>
                  toast("Checkout arrives in a later step", {
                    description: "Your selection is saved in the bag.",
                  }),
                "buy-now",
              )
            }
            className="inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-5 py-2.5 text-[10px] font-semibold tracking-[0.22em] text-primary-foreground uppercase disabled:opacity-50"
          >
            <Zap className="size-3.5" /> Buy now
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <article
      onClick={(event) => {
        // Clicking anywhere on the card opens Quick View, except real controls.
        if ((event.target as HTMLElement).closest("button, a")) return;
        openQuickView();
      }}
      className={cn(
        "lux-card group flex h-full cursor-pointer",
        view === "grid"
          ? "flex-col"
          : "flex-col sm:grid sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]",
      )}
    >
      {media}
      {info}
    </article>
  );
}
