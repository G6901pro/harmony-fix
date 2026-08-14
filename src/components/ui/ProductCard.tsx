import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/site-data";
import { currency, type CatalogProduct } from "@/lib/catalog";
import { getProductByName } from "@/lib/catalog";
import { useQuickView } from "@/lib/quick-view";
import { shopActions, useShopState } from "@/lib/shop-store";
import { addProductToBag } from "@/lib/cart-actions";
import { Rating } from "./Rating";

export function ProductCard({
  product,
  catalog,
}: {
  product: Product;
  catalog?: CatalogProduct;
}) {
  const quickView = useQuickView();
  const { wishlist } = useShopState();
  const wished = wishlist.includes(product.id);
  const open = () => {
    const match = catalog ?? getProductByName(product.name);
    if (match) quickView.open(match);
  };

  return (
    <article
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a")) return;
        open();
      }}
      className="lux-card group flex h-full cursor-pointer flex-col"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <img
          src={product.image}
          alt={product.name}
          width={900}
          height={900}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
        />
        {product.badge ? (
          <span className="glass absolute top-4 left-4 rounded-full px-3 py-1 text-[9px] tracking-[0.24em] text-gold uppercase">
            {product.badge}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`Add ${product.name} to wishlist`}
          aria-pressed={wished}
          onClick={() => shopActions.toggleWishlist(product.id)}
          className={`glass absolute top-3 right-3 grid size-9 place-items-center rounded-full transition-all duration-500 group-hover:opacity-100 hover:text-gold focus-visible:opacity-100 ${wished ? "text-gold opacity-100" : "text-foreground opacity-0"}`}
        >
          <Heart className={`size-4 ${wished ? "fill-current" : ""}`} />
        </button>
        <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => addProductToBag(product)}
            className="glass flex w-full items-center justify-center gap-2 rounded-full py-3 text-[10px] tracking-[0.24em] uppercase transition-colors hover:text-gold"
          >
            <ShoppingBag className="size-3.5" />
            Add to bag
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="eyebrow">{product.category}</p>
        <h3 className="font-display text-lg leading-snug">
          <button type="button" onClick={open} className="text-left hover:text-gold">
            {product.name}
          </button>
        </h3>
        <Rating value={product.rating} count={product.reviews} />
        <div className="mt-auto flex items-baseline gap-3 pt-2">
          <span className="text-base font-medium text-gold">{currency.format(product.price)}</span>
          {product.compareAt ? (
            <span className="text-xs text-muted-foreground line-through">
              {currency.format(product.compareAt)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
