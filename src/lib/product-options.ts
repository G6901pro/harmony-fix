import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fully dynamic product options & variants.
 * Nothing here is hardcoded: option group names, values, prices, stock, SKUs and
 * images are authored entirely in the Admin Dashboard.
 */

export type OptionValueStatus = "default" | "active" | "hidden" | "out_of_stock";

export const OPTION_VALUE_STATUSES: OptionValueStatus[] = [
  "default",
  "active",
  "hidden",
  "out_of_stock",
];

export const OPTION_VALUE_STATUS_LABELS: Record<OptionValueStatus, string> = {
  default: "Default",
  active: "Active",
  hidden: "Hidden",
  out_of_stock: "Out of stock",
};

export type ProductOptionValue = {
  id: string;
  group_id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock: number;
  status: OptionValueStatus;
  images: string[];
  sort_order: number;
};

export type ProductOptionGroup = {
  id: string;
  product_slug: string;
  name: string;
  is_required: boolean;
  sort_order: number;
  values: ProductOptionValue[];
};

export type ProductVariant = {
  id: string;
  product_slug: string;
  /** Map of option group id -> option value id. */
  combination: Record<string, string>;
  label: string | null;
  sku: string | null;
  price: number | null;
  stock: number;
  images: string[];
  is_available: boolean;
  sort_order: number;
};

/** groupId -> valueId */
export type OptionSelection = Record<string, string>;

export type ProductOptionData = {
  groups: ProductOptionGroup[];
  variants: ProductVariant[];
};

export const EMPTY_OPTION_DATA: ProductOptionData = { groups: [], variants: [] };

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toCombination(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw) out[key] = raw;
  }
  return out;
}

/** Reads option groups, their values and variant combinations for one product. */
export async function fetchProductOptions(slug: string): Promise<ProductOptionData> {
  const [groupRes, variantRes] = await Promise.all([
    supabase
      .from("product_option_groups")
      .select("id, product_slug, name, is_required, sort_order")
      .eq("product_slug", slug)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_variants")
      .select("id, product_slug, combination, label, sku, price, stock, images, is_available, sort_order")
      .eq("product_slug", slug)
      .order("sort_order", { ascending: true }),
  ]);

  const groupRows = groupRes.data ?? [];
  if (groupRows.length === 0) {
    return EMPTY_OPTION_DATA;
  }

  const { data: valueRows } = await supabase
    .from("product_option_values")
    .select("id, group_id, name, sku, price_adjustment, stock, status, images, sort_order")
    .in(
      "group_id",
      groupRows.map((group) => group.id),
    )
    .order("sort_order", { ascending: true });

  const values = (valueRows ?? []).map((row) => ({
    id: row.id,
    group_id: row.group_id,
    name: row.name,
    sku: row.sku,
    price_adjustment: Number(row.price_adjustment ?? 0),
    stock: Number(row.stock ?? 0),
    status: (row.status ?? "active") as OptionValueStatus,
    images: toStringArray(row.images),
    sort_order: Number(row.sort_order ?? 0),
  }));

  const groups: ProductOptionGroup[] = groupRows.map((group) => ({
    id: group.id,
    product_slug: group.product_slug,
    name: group.name,
    is_required: Boolean(group.is_required),
    sort_order: Number(group.sort_order ?? 0),
    values: values.filter((value) => value.group_id === group.id),
  }));

  const variants: ProductVariant[] = (variantRes.data ?? []).map((row) => ({
    id: row.id,
    product_slug: row.product_slug,
    combination: toCombination(row.combination),
    label: row.label,
    sku: row.sku,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    stock: Number(row.stock ?? 0),
    images: toStringArray(row.images),
    is_available: Boolean(row.is_available),
    sort_order: Number(row.sort_order ?? 0),
  }));

  return { groups, variants };
}

/** Values a customer can see — hidden values never reach the storefront. */
export function visibleValues(group: ProductOptionGroup): ProductOptionValue[] {
  return group.values.filter((value) => value.status !== "hidden");
}

/** Groups a customer can see — a group with no visible values is dropped entirely. */
export function visibleGroups(groups: ProductOptionGroup[]): ProductOptionGroup[] {
  return groups.filter((group) => visibleValues(group).length > 0);
}

export function isValueSelectable(value: ProductOptionValue): boolean {
  return value.status !== "hidden" && value.status !== "out_of_stock";
}

/** Picks the admin-marked default value per group, else the first selectable one. */
export function initialSelection(groups: ProductOptionGroup[]): OptionSelection {
  const selection: OptionSelection = {};
  for (const group of visibleGroups(groups)) {
    const values = visibleValues(group);
    const chosen =
      values.find((value) => value.status === "default") ??
      values.find(isValueSelectable) ??
      values[0];
    if (chosen) selection[group.id] = chosen.id;
  }
  return selection;
}

export function matchVariant(
  variants: ProductVariant[],
  selection: OptionSelection,
): ProductVariant | null {
  if (variants.length === 0) return null;
  const entries = Object.entries(selection);
  if (entries.length === 0) return null;
  return (
    variants.find((variant) => {
      const combo = Object.entries(variant.combination);
      if (combo.length === 0) return false;
      return combo.every(([groupId, valueId]) => selection[groupId] === valueId);
    }) ?? null
  );
}

export type ResolvedSelection = {
  /** Live unit price for the current selection. */
  price: number;
  /** Live SKU (variant SKU wins, then option value SKU, then product SKU). */
  sku: string;
  /** Live stock for the current selection, or null when options don't track stock. */
  stock: number | null;
  /** Images contributed by the variant or the selected option values. */
  images: string[];
  /** False when the selection is out of stock or marked unavailable. */
  available: boolean;
  variant: ProductVariant | null;
  selectedValues: { group: ProductOptionGroup; value: ProductOptionValue }[];
};

export function resolveSelection(args: {
  basePrice: number;
  baseSku: string;
  baseStock: number;
  groups: ProductOptionGroup[];
  variants: ProductVariant[];
  selection: OptionSelection;
}): ResolvedSelection {
  const { basePrice, baseSku, baseStock, groups, variants, selection } = args;

  const selectedValues: ResolvedSelection["selectedValues"] = [];
  for (const group of visibleGroups(groups)) {
    const value = visibleValues(group).find((item) => item.id === selection[group.id]);
    if (value) selectedValues.push({ group, value });
  }

  const variant = matchVariant(variants, selection);

  const adjustments = selectedValues.reduce((sum, entry) => sum + entry.value.price_adjustment, 0);
  const price = variant?.price != null ? variant.price : Math.max(0, basePrice + adjustments);

  const valueSku = selectedValues.map((entry) => entry.value.sku).filter(Boolean).join(" / ");
  const sku = variant?.sku || valueSku || baseSku;

  // Per-value stock is optional in the admin dashboard: a value left at 0 means
  // "not tracked here", NOT "sold out". Only positive values constrain stock,
  // otherwise we fall back to the product's own inventory.
  const valueStocks = selectedValues
    .map((entry) => Number(entry.value.stock))
    .filter((value) => Number.isFinite(value) && value > 0);
  const stock =
    variant != null
      ? variant.stock > 0
        ? variant.stock
        : baseStock
      : valueStocks.length > 0
        ? Math.min(...valueStocks)
        : selectedValues.length > 0
          ? baseStock
          : null;

  const images = variant?.images.length
    ? variant.images
    : selectedValues.flatMap((entry) => entry.value.images);

  const valuesUnavailable = selectedValues.some((entry) => entry.value.status === "out_of_stock");
  const available = variant
    ? variant.is_available && (variant.stock > 0 || baseStock > 0)
    : !valuesUnavailable && (stock === null || stock > 0 || baseStock > 0);

  return { price, sku, stock, images, available, variant, selectedValues };
}

/** Client-side loader — options are read on the client so the cached page stays static. */
export function useProductOptions(slug: string) {
  const [data, setData] = useState<ProductOptionData>(EMPTY_OPTION_DATA);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<OptionSelection>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(EMPTY_OPTION_DATA);
    setSelection({});

    fetchProductOptions(slug)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setSelection(initialSelection(result.groups));
      })
      .catch(() => {
        if (!cancelled) setData(EMPTY_OPTION_DATA);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const groups = useMemo(() => visibleGroups(data.groups), [data.groups]);

  const select = (groupId: string, valueId: string) =>
    setSelection((current) => ({ ...current, [groupId]: valueId }));

  return { groups, variants: data.variants, selection, select, loading, hasOptions: groups.length > 0 };
}

/** Serialisable snapshot stored on order items. */
export function selectionLabel(resolved: ResolvedSelection): string {
  return resolved.selectedValues.map((entry) => `${entry.group.name}: ${entry.value.name}`).join(" · ");
}

export function selectionPayload(resolved: ResolvedSelection): Record<string, string> {
  return Object.fromEntries(
    resolved.selectedValues.map((entry) => [entry.group.name, entry.value.name]),
  );
}
