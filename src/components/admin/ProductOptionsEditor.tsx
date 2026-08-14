import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminField, adminLabel, ghostButton } from "@/components/admin/AdminPage";
import { MediaPicker } from "@/components/admin/MediaPicker";
import {
  describeWriteError,
  OPTION_VALUE_STATUS_OPTIONS,
  type AdminOptionGroup,
  type AdminOptionValue,
} from "@/lib/admin/product-options";

/**
 * Unlimited custom option groups for one product. Group names are free text —
 * nothing is hardcoded and no group or value is ever created automatically.
 */
export function ProductOptionsEditor({
  productSlug,
  groups,
  setGroups,
  onError,
  onChanged,
}: {
  productSlug: string | null;
  groups: AdminOptionGroup[];
  setGroups: React.Dispatch<React.SetStateAction<AdminOptionGroup[]>>;
  onError: (message: string | null) => void;
  onChanged?: () => void;
}) {
  async function addGroup() {
    if (!productSlug) {
      onError("Save the product first, then add option groups.");
      return;
    }
    const { data, error } = await supabase
      .from("product_option_groups")
      .insert({ product_slug: productSlug, name: "", sort_order: groups.length })
      .select()
      .single();
    if (error || !data) {
      onError(describeWriteError(error));
      return;
    }
    onError(null);
    setGroups((list) => [
      ...list,
      {
        id: String(data.id),
        product_slug: productSlug,
        name: String(data.name ?? ""),
        is_required: Boolean(data.is_required),
        sort_order: Number(data.sort_order ?? list.length),
        values: [],
      },
    ]);
    onChanged?.();
  }

  async function updateGroup(
    group: AdminOptionGroup,
    patch: Partial<Pick<AdminOptionGroup, "name" | "is_required" | "sort_order">>,
  ) {
    setGroups((list) => list.map((item) => (item.id === group.id ? { ...item, ...patch } : item)));
    const { error } = await supabase
      .from("product_option_groups")
      .update(patch as never)
      .eq("id", group.id);
    if (error) onError(describeWriteError(error));
    else onChanged?.();
  }

  async function removeGroup(group: AdminOptionGroup) {
    const { error } = await supabase.from("product_option_groups").delete().eq("id", group.id);
    if (error) {
      onError(describeWriteError(error));
      return;
    }
    setGroups((list) => list.filter((item) => item.id !== group.id));
    onChanged?.();
  }

  async function addValue(group: AdminOptionGroup) {
    const { data, error } = await supabase
      .from("product_option_values")
      .insert({ group_id: group.id, name: "", sort_order: group.values.length })
      .select()
      .single();
    if (error || !data) {
      onError(describeWriteError(error));
      return;
    }
    onError(null);
    const value: AdminOptionValue = {
      id: String(data.id),
      group_id: group.id,
      name: String(data.name ?? ""),
      sku: (data.sku as string | null) ?? null,
      price_adjustment: Number(data.price_adjustment ?? 0),
      stock: Number(data.stock ?? 0),
      status: (data.status as AdminOptionValue["status"]) ?? "active",
      images: [],
      sort_order: Number(data.sort_order ?? group.values.length),
    };
    setGroups((list) =>
      list.map((item) => (item.id === group.id ? { ...item, values: [...item.values, value] } : item)),
    );
    onChanged?.();
  }

  async function updateValue(value: AdminOptionValue, patch: Partial<AdminOptionValue>) {
    setGroups((list) =>
      list.map((group) => ({
        ...group,
        values: group.values.map((item) => (item.id === value.id ? { ...item, ...patch } : item)),
      })),
    );
    const { error } = await supabase
      .from("product_option_values")
      .update(patch as never)
      .eq("id", value.id);
    if (error) onError(describeWriteError(error));
    else onChanged?.();
  }

  async function removeValue(value: AdminOptionValue) {
    const { error } = await supabase.from("product_option_values").delete().eq("id", value.id);
    if (error) {
      onError(describeWriteError(error));
      return;
    }
    setGroups((list) =>
      list.map((group) => ({
        ...group,
        values: group.values.filter((item) => item.id !== value.id),
      })),
    );
    onChanged?.();
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg tracking-tight">Product options</h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            Create any option group this product needs — Colour, Age group, Length, Battery,
            Storage, Edition, Wheel size or anything else. Only the groups you add here appear on
            the product page. Changes save instantly.
          </p>
        </div>
        <button type="button" onClick={() => void addGroup()} className={ghostButton}>
          <Plus className="size-3.5" /> Add option group
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No option groups. The storefront hides the options section entirely for this product.
          </p>
        ) : null}

        {groups.map((group) => (
          <div key={group.id} className="rounded-lg border border-border/70 p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-52 flex-1">
                <span className={adminLabel}>Option group name</span>
                <input
                  className={adminField}
                  value={group.name}
                  maxLength={60}
                  placeholder="e.g. Colour, Age group, Motor power"
                  onChange={(e) => void updateGroup(group, { name: e.target.value })}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 pb-3 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[#C8A250]"
                  checked={group.is_required}
                  onChange={(e) => void updateGroup(group, { is_required: e.target.checked })}
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => void removeGroup(group)}
                className="mb-2 grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                aria-label={`Delete option group ${group.name || "untitled"}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {group.values.length === 0 ? (
                <p className="text-xs text-muted-foreground">No values yet.</p>
              ) : null}

              {group.values.map((value) => (
                <div
                  key={value.id}
                  className="grid gap-3 rounded-md border border-border/60 p-4 md:grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.9fr_auto]"
                >
                  <div>
                    <span className={adminLabel}>Value</span>
                    <input
                      className={adminField}
                      value={value.name}
                      maxLength={60}
                      placeholder="Value name"
                      onChange={(e) => void updateValue(value, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className={adminLabel}>SKU</span>
                    <input
                      className={adminField}
                      value={value.sku ?? ""}
                      maxLength={60}
                      onChange={(e) => void updateValue(value, { sku: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <span className={adminLabel}>Price +/-</span>
                    <input
                      type="number"
                      step="0.01"
                      className={adminField}
                      value={value.price_adjustment}
                      onChange={(e) =>
                        void updateValue(value, { price_adjustment: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <span className={adminLabel}>Stock</span>
                    <input
                      type="number"
                      min="0"
                      className={adminField}
                      value={value.stock}
                      onChange={(e) => void updateValue(value, { stock: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <span className={adminLabel}>Status</span>
                    <select
                      className={adminField}
                      value={value.status}
                      onChange={(e) =>
                        void updateValue(value, {
                          status: e.target.value as AdminOptionValue["status"],
                        })
                      }
                    >
                      {OPTION_VALUE_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => void removeValue(value)}
                      aria-label={`Delete value ${value.name || "untitled"}`}
                      className="mb-2 grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="md:col-span-6">
                    <MediaPicker
                      label="Value images (optional)"
                      multiple
                      value={value.images}
                      onChange={(next) => void updateValue(value, { images: next })}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void addValue(group)}
              className={`${ghostButton} mt-4`}
            >
              <Plus className="size-3.5" /> Add value
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
