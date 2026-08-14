import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { currency } from "@/lib/catalog";
import { searchProducts } from "@/lib/shop-filters";
import { cn } from "@/lib/utils";

export function SearchBar({
  value,
  onValueChange,
  onSubmitQuery,
  placeholder = "Search by product, brand, category or SKU…",
  className,
  autoFocus = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSubmitQuery?: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const suggestions = useMemo(() => searchProducts(value), [value]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => setHighlight(0), [value]);

  const go = (slug: string) => {
    setOpen(false);
    navigate({ to: "/product/$slug", params: { slug } });
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="glass flex items-center gap-3 rounded-full px-5 py-3 transition-colors focus-within:border-gold/50">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="search-suggestions"
          aria-label="Search products"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (event.key === "Enter") {
              if (open && suggestions[highlight]) {
                event.preventDefault();
                go(suggestions[highlight].slug);
              } else {
                onSubmitQuery?.(value);
                setOpen(false);
              }
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onValueChange("")}
            className="shrink-0 text-muted-foreground transition-colors hover:text-gold"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {open && value.trim() ? (
        <div
          id="search-suggestions"
          role="listbox"
          className="glass absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl p-2 shadow-[var(--shadow-lux)]"
        >
          {suggestions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matches for “{value}”. Try a brand, category or SKU.
            </p>
          ) : (
            <ul>
              {suggestions.map((product, index) => (
                <li key={product.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === highlight}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => go(product.slug)}
                    className={cn(
                      "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      index === highlight ? "bg-surface-2/80" : "hover:bg-surface-2/50",
                    )}
                  >
                    <img
                      src={product.images[0]}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{product.name}</span>
                      <span className="block truncate text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                        {product.brand} · {product.category} · {product.sku}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-gold">
                      {currency.format(product.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
