import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Minus, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { currency, type CatalogProduct } from "@/lib/catalog";
import { toast } from "sonner";
import { safeQty, shopActions, useShopState } from "@/lib/shop-store";
import { addProductToBag } from "@/lib/cart-actions";
import { useMockAuth } from "@/lib/mock-auth";
import { useStorefrontProducts } from "@/lib/storefront-products";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Shell({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);

    // Lock background scrolling; only the drawer itself scrolls.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const target = panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
      target?.focus({ preventScroll: true });
    }, 60);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  const overlay = (
    <div
      className={cn(
        "fixed inset-0 z-[100] isolate",
        open ? "pointer-events-auto visible" : "pointer-events-none invisible",
      )}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-500",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 right-0 z-10 flex h-full w-full max-w-[420px] flex-col overflow-hidden border-l border-border bg-background shadow-[0_0_60px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none sm:w-[92vw]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-5">
          <p className="eyebrow truncate">{title}</p>
          <button
            type="button"
            aria-label={`Close ${title.toLowerCase()}`}
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-gold"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-6">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border bg-background px-6 py-5">{footer}</div>
        ) : null}
      </aside>
    </div>
  );

  // Portal to <body> so the drawer is anchored to the viewport and never
  // trapped by a transformed / backdrop-filtered ancestor (e.g. the header).
  if (!mounted) return null;
  return createPortal(overlay, document.body);
}



const goldCta =
  "flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-gold)] py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase";

/** Shared empty state for the bag and wishlist drawers. */
function DrawerEmpty({
  icon: Icon,
  title,
  onClose,
}: {
  icon: typeof ShoppingBag;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full border border-gold/30 bg-surface-2/60">
        <Icon className="size-6 text-gold" aria-hidden />
      </span>
      <p className="mt-5 text-sm font-semibold tracking-[0.2em] text-foreground uppercase">
        {title}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">Nothing selected yet.</p>
      <Link to="/shop" onClick={onClose} className={`${goldCta} mt-7 max-w-[240px]`}>
        Shop now
      </Link>
    </div>
  );
}



export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart } = useShopState();
  const { products } = useStorefrontProducts();
  const { requireAuth } = useMockAuth();
  const navigate = useNavigate();

  const lines = cart
    .map((item) => {
      const product = products.find((p) => p.id === item?.id);
      const stock = Number.isFinite(product?.stock) ? Math.max(0, Math.floor(product!.stock)) : 0;
      const qty = Math.max(1, Math.min(safeQty(item?.qty, 1), stock || 1));
      return { product, qty, stock };
    })
    .filter(
      (line): line is { product: CatalogProduct; qty: number; stock: number } =>
        Boolean(line.product),
    );
  const subtotal = lines.reduce(
    (sum, line) => sum + (Number(line.product.price) || 0) * line.qty,
    0,
  );

  const changeQty = (id: string, next: number, stock: number) => {
    try {
      const result = shopActions.setQty(id, next, stock);
      if (result.clamped && result.qty > 0) {
        toast.error(`Only ${result.max} in stock`);
      }
    } catch (error) {
      console.error("[cart] quantity update failed", error);
      toast.error("Could not update quantity");
    }
  };

  return (
    <Shell
      open={open}
      onClose={onClose}
      title="Your bag"
      footer={
        lines.length ? (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-display text-lg text-gold">{currency.format(subtotal)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={(event) => {
                event.preventDefault();
                onClose();
                requireAuth(() => void navigate({ to: "/checkout" }), "checkout");
              }}
              className={goldCta}
            >
              Checkout
            </Link>
          </div>
        ) : null
      }
    >
      {lines.length === 0 ? (
        <DrawerEmpty icon={ShoppingBag} title="Your bag is empty" onClose={onClose} />

      ) : (
        <ul className="space-y-4">
          {lines.map((line) => (
            <li
              key={line.product.id}
              className="flex gap-4 rounded-[18px] border border-border bg-surface-2/60 p-3"
            >
              <img
                src={line.product.images[0]}
                alt={line.product.name}
                className="size-20 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{line.product.name}</p>
                <p className="mt-1 text-xs text-gold">{currency.format(line.product.price)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${line.product.name}`}
                    onClick={() => changeQty(line.product.id, line.qty - 1, line.stock)}
                    className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground hover:text-gold"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-6 text-center text-xs">{line.qty}</span>
                  <button
                    type="button"
                    disabled={line.qty >= line.stock}
                    aria-label={`Increase quantity of ${line.product.name}`}
                    onClick={() => changeQty(line.product.id, line.qty + 1, line.stock)}
                    className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${line.product.name}`}
                    onClick={() => shopActions.removeFromCart(line.product.id)}
                    className="ml-auto grid size-7 place-items-center rounded-full border border-border text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                {line.qty >= line.stock ? (
                  <p className="mt-2 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                    Max available — {line.stock} in stock
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

export function WishlistDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wishlist } = useShopState();
  const { products } = useStorefrontProducts();
  const items = wishlist
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is CatalogProduct => Boolean(p));

  return (
    <Shell open={open} onClose={onClose} title="Wishlist">
      {items.length === 0 ? (
        <DrawerEmpty icon={Heart} title="Your wishlist is empty" onClose={onClose} />

      ) : (
        <ul className="space-y-4">
          {items.map((product) => (
            <li
              key={product.id}
              className="flex gap-4 rounded-[18px] border border-border bg-surface-2/60 p-3"
            >
              <img
                src={product.images[0]}
                alt={product.name}
                className="size-20 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to="/product/$slug"
                  params={{ slug: product.slug }}
                  onClick={onClose}
                  className="truncate text-sm hover:text-gold"
                >
                  {product.name}
                </Link>
                <p className="mt-1 text-xs text-gold">{currency.format(product.price)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addProductToBag(product)}
                    className="rounded-full border border-gold/40 px-3 py-1.5 text-[9px] tracking-[0.2em] text-gold uppercase hover:bg-gold/10"
                  >
                    Add to bag
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${product.name} from wishlist`}
                    onClick={() => shopActions.toggleWishlist(product.id)}
                    className="ml-auto grid size-7 place-items-center rounded-full border border-border text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

export function SearchDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { products } = useStorefrontProducts();

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) =>
        [p.name, p.brand, p.category, p.sku, p.shortDescription]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 8);
  }, [query, products]);

  return (
    <Shell open={open} onClose={onClose} title="Search the vault">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <label className="sr-only" htmlFor="global-search">
          Search products
        </label>
        <input
          id="global-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ride-ons, RC cars, gifts…"
          className="glass w-full rounded-full py-3 pr-5 pl-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/50 focus:outline-none"
        />
      </div>

      <div className="mt-6">
        {query.trim() && results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pieces match “{query}”.</p>
        ) : null}
        <ul className="space-y-3">
          {results.map((product) => (
            <li key={product.id}>
              <Link
                to="/product/$slug"
                params={{ slug: product.slug }}
                onClick={onClose}
                className="flex items-center gap-4 rounded-[18px] border border-border bg-surface-2/60 p-3 transition-colors hover:border-gold/50"
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="size-14 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{product.name}</span>
                  <span className="mt-1 block text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                    {product.category}
                  </span>
                </span>
                <span className="text-xs text-gold">{currency.format(product.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
        {query.trim() ? (
          <Link
            to="/shop"
            onClick={onClose}
            className="mt-6 inline-block text-xs tracking-[0.2em] text-gold uppercase"
          >
            See all results in shop
          </Link>
        ) : null}
      </div>
    </Shell>
  );
}