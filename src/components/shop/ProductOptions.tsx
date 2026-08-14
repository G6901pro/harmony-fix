import { cn } from "@/lib/utils";
import { currency } from "@/lib/catalog";
import {
  isValueSelectable,
  visibleValues,
  type OptionSelection,
  type ProductOptionGroup,
} from "@/lib/product-options";

type Props = {
  groups: ProductOptionGroup[];
  selection: OptionSelection;
  onSelect: (groupId: string, valueId: string) => void;
};

/**
 * Renders only the option groups assigned to this product in the Admin Dashboard.
 * No option name is hardcoded and nothing is generated automatically — if the
 * admin created no groups, the caller renders nothing at all.
 */
export function ProductOptions({ groups, selection, onSelect }: Props) {
  if (groups.length === 0) return null;

  return (
    <div className="mt-8 space-y-6">
      {groups.map((group) => {
        const values = visibleValues(group);
        const selectedValue = values.find((value) => value.id === selection[group.id]);

        return (
          <fieldset key={group.id} className="min-w-0">
            <legend className="flex w-full flex-wrap items-center gap-2 text-[10px] tracking-[0.22em] uppercase">
              <span className="text-muted-foreground">{group.name}</span>
              {group.is_required ? <span className="text-gold">*</span> : null}
              {selectedValue ? <span className="text-foreground">— {selectedValue.name}</span> : null}
            </legend>

            <div className="mt-3 flex flex-wrap gap-2">
              {values.map((value) => {
                const selectable = isValueSelectable(value);
                const active = selection[group.id] === value.id;
                const adjustment = value.price_adjustment;

                return (
                  <button
                    key={value.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${group.name}: ${value.name}`}
                    disabled={!selectable}
                    onClick={() => onSelect(group.id, value.id)}
                    className={cn(
                      "group inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs transition-colors",
                      active
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-muted-foreground hover:border-gold/50 hover:text-foreground",
                      !selectable && "cursor-not-allowed opacity-40 line-through",
                    )}
                  >
                    {value.images[0] ? (
                      <img
                        src={value.images[0]}
                        alt=""
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="-ml-2 size-6 rounded-full object-cover"
                      />
                    ) : null}
                    <span>{value.name}</span>
                    {adjustment !== 0 ? (
                      <span className="text-[10px] tracking-[0.12em] opacity-80">
                        {adjustment > 0 ? "+" : "−"}
                        {currency.format(Math.abs(adjustment))}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
