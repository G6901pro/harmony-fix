import { useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Rating } from "@/components/ui/Rating";
import {
  AGE_GROUPS,
  BRANDS,
  CATEGORIES,
  COLORS,
  currency,
  products,
} from "@/lib/catalog";
import { activeFilterCount, defaultFilters, type Filters } from "@/lib/shop-filters";
import { useTaxonomy } from "@/lib/taxonomy";

import { AGE_KEYS, BRAND_KEYS, CATEGORY_KEYS } from "@/lib/filter-match";
import { matchesAny } from "@/lib/filter-match";
import { cn } from "@/lib/utils";

function Group({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="text-[11px] tracking-[0.24em] uppercase">{title}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-500",
            open && "rotate-180 text-gold",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function Check({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
      <span className="flex min-w-0 items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "grid size-4 shrink-0 place-items-center rounded-[3px] border border-border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
            checked && "border-gold bg-[image:var(--gradient-gold)]",
          )}
        >
          {checked ? (
            <span className="size-1.5 rounded-[1px] bg-primary-foreground" />
          ) : null}
        </span>
        <span className="truncate">{label}</span>
      </span>
      {hint ? <span className="shrink-0 text-xs text-muted-foreground/60">{hint}</span> : null}
    </label>
  );
}

const countBy = (value: string, keys: string[]) =>
  products.filter((product) => matchesAny(product, keys, [value])).length;

export function FilterPanel({
  filters,
  onChange,
  onClose,
  priceBounds,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onClose?: () => void;
  /** Min/max derived from the live catalogue — never hardcoded. */
  priceBounds: [number, number];
}) {
  const [priceMin, priceMax] = priceBounds;
  const sliderValue = filters.price ?? priceBounds;
  const priceDisabled = priceMax <= priceMin;
  // Live categories from the database, so anything created in the Control Room
  // is filterable straight away. Selected values are always kept visible.
  const { categoryNames } = useTaxonomy();
  const categoryOptions = Array.from(
    new Set([...(categoryNames.length ? categoryNames : CATEGORIES), ...filters.categories]),
  );
  const toggle = (key: "categories" | "brands" | "ages" | "colors", value: string) => {
    const list = filters[key];
    onChange({
      ...filters,
      [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    });
  };

  const count = activeFilterCount(filters);


  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-4">
        <p className="min-w-0 truncate font-display text-xl">
          Filters{" "}
          {count > 0 ? <span className="text-sm text-gold">({count})</span> : null}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...defaultFilters, query: filters.query })}
            className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-gold"
          >
            Clear all
          </button>
          {onClose ? (
            <button
              type="button"
              aria-label="Close filters"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full text-muted-foreground hover:text-gold lg:hidden"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <Group title="Category">
        {categoryOptions.map((category) => (
          <Check
            key={category}
            label={category}
            hint={countBy(category, CATEGORY_KEYS)}
            checked={filters.categories.includes(category)}
            onChange={() => toggle("categories", category)}
          />
        ))}
      </Group>

      <Group title="Price range">
        <Slider
          value={sliderValue}
          min={priceMin}
          max={priceDisabled ? priceMin + 1 : priceMax}
          step={1}
          disabled={priceDisabled}
          onValueChange={(value) =>
            onChange({ ...filters, price: [value[0], value[1]] as [number, number] })
          }
          aria-label="Price range"
        />
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{currency.format(sliderValue[0])}</span>
          <span>{currency.format(sliderValue[1])}</span>
        </div>
      </Group>

      <Group title="Age group">
        {AGE_GROUPS.map((age) => (
          <Check
            key={age}
            label={`${age} years`}
            hint={countBy(age, AGE_KEYS)}
            checked={filters.ages.includes(age)}
            onChange={() => toggle("ages", age)}
          />
        ))}
      </Group>

      <Group title="Brand">
        {BRANDS.map((brand) => (
          <Check
            key={brand}
            label={brand}
            hint={countBy(brand, BRAND_KEYS)}
            checked={filters.brands.includes(brand)}
            onChange={() => toggle("brands", brand)}
          />
        ))}
      </Group>

      <Group title="Colour">
        <div className="flex flex-wrap gap-3 pt-1">
          {COLORS.map((color) => {
            const active = filters.colors.includes(color.name);
            return (
              <button
                key={color.name}
                type="button"
                aria-label={color.name}
                aria-pressed={active}
                onClick={() => toggle("colors", color.name)}
                title={color.name}
                className={cn(
                  "size-8 rounded-full border transition-all duration-300",
                  active
                    ? "border-gold shadow-[var(--shadow-gold)]"
                    : "border-border hover:border-gold/50",
                )}
                style={{ backgroundColor: color.token }}
              />
            );
          })}
        </div>
      </Group>

      <Group title="Availability" defaultOpen={false}>
        <Check
          label="In stock only"
          checked={filters.inStockOnly}
          onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
        />
        <Check
          label="On discount"
          checked={filters.onSaleOnly}
          onChange={() => onChange({ ...filters, onSaleOnly: !filters.onSaleOnly })}
        />
      </Group>

      <Group title="Rating" defaultOpen={false}>
        {[5, 4, 3].map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <input
              type="radio"
              name="min-rating"
              checked={filters.minRating === value}
              onChange={() => onChange({ ...filters, minRating: value })}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 rounded-full border border-border",
                filters.minRating === value && "border-gold bg-[image:var(--gradient-gold)]",
              )}
            />
            <Rating value={value} />
            <span className="text-xs">& up</span>
          </label>
        ))}
        {filters.minRating > 0 ? (
          <button
            type="button"
            onClick={() => onChange({ ...filters, minRating: 0 })}
            className="mt-2 text-[10px] tracking-[0.2em] text-muted-foreground uppercase hover:text-gold"
          >
            Reset rating
          </button>
        ) : null}
      </Group>

      <Group title="Collections" defaultOpen={false}>
        <Check
          label="New arrivals"
          checked={filters.newOnly}
          onChange={() => onChange({ ...filters, newOnly: !filters.newOnly })}
        />
        <Check
          label="Best sellers"
          checked={filters.bestSellerOnly}
          onChange={() => onChange({ ...filters, bestSellerOnly: !filters.bestSellerOnly })}
        />
        <Check
          label="Featured products"
          checked={filters.featuredOnly}
          onChange={() => onChange({ ...filters, featuredOnly: !filters.featuredOnly })}
        />
      </Group>
    </div>
  );
}
