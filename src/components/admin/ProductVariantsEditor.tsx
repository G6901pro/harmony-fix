import { useMemo, useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminField, adminLabel, ghostButton } from "@/components/admin/AdminPage";
import { MediaPicker } from "@/components/admin/MediaPicker";
import {
  buildCombinations,
  combinationKey,
  describeCombination,
  describeWriteError,
  type AdminOptionGroup,
  type AdminVariant,
} from "@/lib/admin/product-options";

/**
 * Variant matrix for one product. A variant is any combination of the admin's
 * own option values, with its own price, stock, SKU, images and availability.
 * Combinations are only created when the admin asks for them.
 */
export function ProductVariantsEditor({
  productSlug,
  groups,
  variants,
  setVariants,
  onError,
}: {
  productSlug: string | null;
  groups: AdminOptionGroup[];
  variants: AdminVariant[];
  setVariants: React.Dispatch<React.SetStateAction<AdminVariant[]>>;
  onError: (message: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  const existingKeys = useMemo(
    () => new Set(variants.map((variant) => combinationKey(variant.combination))),
    [variants],
  );

  const missingCombinations = useMemo(() => {
    if (groups.length === 0) return [];
    return buildCombinations(groups).filter(
      (combination) => !existingKeys.has(combinationKey(combination)),
    );
  }, [groups, existingKeys]);

  async function insertVariants(combinations: Record<string, string>[]) {
    if (!productSlug || combinations.length === 0) return;
    setBusy(true);
    const rows = combinations.map((combination, index) => ({
      product_slug: productSlug,
      combination: combination as never,
      sort_order: variants.length + index,
    }));
    const { data, error } = await supabase.from("product_variants").insert(rows).select();
    setBusy(false);
    if (error || !data) {
      onError(describeWriteError(error));
      return;
    }
    onError(null);
    setVariants((list) => [
      ...list,
      ...(data as Record<string, unknown>[]).map((row, index) => ({
        id: String(row.id),
        product_slug: productSlug,
        combination: combinations[index] ?? {},
        label: (row.label as string | null) ?? null,
        sku: (row.sku as string | null) ?? null,
        price: row.price === null || row.price === undefined ? null : Number(row.price),
        stock: Number(row.stock ?? 0),
        images: [],
        is_available: row.is_available !== false,
        sort_order: Number(row.sort_order ?? 0),
      })),
    ]);
  }

  async function updateVariant(variant: AdminVariant, patch: Partial<AdminVariant>) {
    setVariants((list) => list.map((item) => (item.id === variant.id ? { ...item, ...patch } : item)));
    const { error } = await supabase
      .from("product_variants")
      .update(patch as never)
      .eq("id", variant.id);
    if (error) onError(describeWriteError(error));
  }

  async function removeVariant(variant: AdminVariant) {
    const { error } = await supabase.from("product_variants").delete().eq("id", variant.id);
    if (error) {
      onError(describeWriteError(error));
      return;
    }
    setVariants((list) => list.filter((item) => item.id !== variant.id));
  }

  function setCombinationValue(variant: AdminVariant, groupId: string, valueId: string) {
    const next = { ...variant.combination };
    if (valueId) next[groupId] = valueId;
    else delete next[groupId];
    void updateVariant(variant, { combination: next });
  }

  if (groups.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg tracking-tight">Variants</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add at least one option group above to build variant combinations.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg tracking-tight">Variants</h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            Each combination can override price, stock, SKU, images and availability. The product
            page updates live as the customer switches options.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || missingCombinations.length === 0}
            onClick={() => void insertVariants(missingCombinations)}
            className={`${ghostButton} disabled:opacity-40`}
          >
            <Wand2 className="size-3.5" />
            Generate missing combinations
            {missingCombinations.length ? ` (${missingCombinations.length})` : ""}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void insertVariants([{}])}
            className={`${ghostButton} disabled:opacity-40`}
          >
            <Plus className="size-3.5" /> Add variant
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No variants yet. Option-value pricing and stock still apply on their own.
          </p>
        ) : null}

        {variants.map((variant) => (
          <div key={variant.id} className="rounded-lg border border-border/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-sm">
                {describeCombination(groups, variant.combination) || "Unassigned combination"}
              </p>
              <button
                type="button"
                onClick={() => void removeVariant(variant)}
                aria-label="Delete variant"
                className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {groups.map((group) => (
                <div key={group.id}>
                  <span className={adminLabel}>{group.name || "Untitled group"}</span>
                  <select
                    className={adminField}
                    value={variant.combination[group.id] ?? ""}
                    onChange={(e) => setCombinationValue(variant, group.id, e.target.value)}
                  >
                    <option value="">— Any —</option>
                    {group.values.map((value) => (
                      <option key={value.id} value={value.id}>
                        {value.name || "Untitled value"}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-5">
              <div>
                <span className={adminLabel}>Price override</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={adminField}
                  placeholder="Base price"
                  value={variant.price ?? ""}
                  onChange={(e) =>
                    void updateVariant(variant, {
                      price: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <span className={adminLabel}>Stock</span>
                <input
                  type="number"
                  min="0"
                  className={adminField}
                  value={variant.stock}
                  onChange={(e) => void updateVariant(variant, { stock: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <span className={adminLabel}>SKU</span>
                <input
                  className={adminField}
                  maxLength={60}
                  value={variant.sku ?? ""}
                  onChange={(e) => void updateVariant(variant, { sku: e.target.value || null })}
                />
              </div>
              <div>
                <span className={adminLabel}>Label (optional)</span>
                <input
                  className={adminField}
                  maxLength={80}
                  value={variant.label ?? ""}
                  onChange={(e) => void updateVariant(variant, { label: e.target.value || null })}
                />
              </div>
              <label className="flex items-end gap-2 pb-3 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[#C8A250]"
                  checked={variant.is_available}
                  onChange={(e) => void updateVariant(variant, { is_available: e.target.checked })}
                />
                Available
              </label>
            </div>

            <div className="mt-4">
              <MediaPicker
                label="Variant images (optional)"
                multiple
                value={variant.images}
                onChange={(next) => void updateVariant(variant, { images: next })}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
