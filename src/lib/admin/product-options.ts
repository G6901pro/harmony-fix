import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin-side data layer for the fully dynamic product option & variant system.
 *
 * Nothing here assumes any option name: groups, values, prices, stock, SKUs,
 * images and variant combinations are authored entirely in the dashboard.
 * No demo/seed data is ever generated automatically.
 */

export type OptionValueStatus = "default" | "active" | "hidden" | "out_of_stock";

export const OPTION_VALUE_STATUS_OPTIONS: { value: OptionValueStatus; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "active", label: "Active" },
  { value: "hidden", label: "Hidden" },
  { value: "out_of_stock", label: "Out of stock" },
];

export type AdminOptionValue = {
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

export type AdminOptionGroup = {
  id: string;
  product_slug: string;
  name: string;
  is_required: boolean;
  sort_order: number;
  values: AdminOptionValue[];
};

export type AdminVariant = {
  id: string;
  product_slug: string;
  /** groupId -> valueId */
  combination: Record<string, string>;
  label: string | null;
  sku: string | null;
  price: number | null;
  stock: number;
  images: string[];
  is_available: boolean;
  sort_order: number;
};

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const asCombination = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw) out[key] = raw;
  }
  return out;
};

function toValue(row: Record<string, unknown>): AdminOptionValue {
  return {
    id: String(row.id),
    group_id: String(row.group_id),
    name: String(row.name ?? ""),
    sku: (row.sku as string | null) ?? null,
    price_adjustment: Number(row.price_adjustment ?? 0),
    stock: Number(row.stock ?? 0),
    status: (row.status as OptionValueStatus) ?? "active",
    images: asStrings(row.images),
    sort_order: Number(row.sort_order ?? 0),
  };
}

function toVariant(row: Record<string, unknown>): AdminVariant {
  return {
    id: String(row.id),
    product_slug: String(row.product_slug ?? ""),
    combination: asCombination(row.combination),
    label: (row.label as string | null) ?? null,
    sku: (row.sku as string | null) ?? null,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    stock: Number(row.stock ?? 0),
    images: asStrings(row.images),
    is_available: row.is_available !== false,
    sort_order: Number(row.sort_order ?? 0),
  };
}

/** A stable key for one combination so duplicates can be detected. */
export function combinationKey(combination: Record<string, string>): string {
  return Object.entries(combination)
    .filter(([, valueId]) => Boolean(valueId))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupId, valueId]) => `${groupId}:${valueId}`)
    .join("|");
}

/** Human label for a combination, derived from the admin's own group/value names. */
export function describeCombination(
  groups: AdminOptionGroup[],
  combination: Record<string, string>,
): string {
  const parts: string[] = [];
  for (const group of groups) {
    const valueId = combination[group.id];
    if (!valueId) continue;
    const value = group.values.find((item) => item.id === valueId);
    if (value) parts.push(value.name);
  }
  return parts.join(" / ");
}

/** Cartesian product of every group's values — only run on explicit admin action. */
export function buildCombinations(groups: AdminOptionGroup[]): Record<string, string>[] {
  const usable = groups.filter((group) => group.values.length > 0);
  if (usable.length === 0) return [];
  return usable.reduce<Record<string, string>[]>(
    (acc, group) =>
      acc.flatMap((combo) => group.values.map((value) => ({ ...combo, [group.id]: value.id }))),
    [{}],
  );
}

/** Loads groups, their values, and the variant matrix for one product slug. */
export function useProductOptionsAdmin(productSlug: string | null) {
  const [groups, setGroups] = useState<AdminOptionGroup[]>([]);
  const [variants, setVariants] = useState<AdminVariant[]>([]);
  const [loading, setLoading] = useState(Boolean(productSlug));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!productSlug) {
      setGroups([]);
      setVariants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [groupRes, variantRes] = await Promise.all([
      supabase
        .from("product_option_groups")
        .select("*")
        .eq("product_slug", productSlug)
        .order("sort_order"),
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_slug", productSlug)
        .order("sort_order"),
    ]);

    const groupRows = (groupRes.data ?? []) as Record<string, unknown>[];
    const ids = groupRows.map((row) => String(row.id));
    const valueRes = ids.length
      ? await supabase.from("product_option_values").select("*").in("group_id", ids).order("sort_order")
      : { data: [], error: null };

    const values = ((valueRes.data ?? []) as Record<string, unknown>[]).map(toValue);

    setGroups(
      groupRows.map((row) => ({
        id: String(row.id),
        product_slug: String(row.product_slug ?? productSlug),
        name: String(row.name ?? ""),
        is_required: Boolean(row.is_required),
        sort_order: Number(row.sort_order ?? 0),
        values: values.filter((value) => value.group_id === String(row.id)),
      })),
    );
    setVariants(((variantRes.data ?? []) as Record<string, unknown>[]).map(toVariant));
    setError(groupRes.error?.message ?? variantRes.error?.message ?? null);
    setLoading(false);
  }, [productSlug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { groups, setGroups, variants, setVariants, loading, error, setError, reload };
}

/** Turns a Supabase write failure into an actionable admin message. */
export function describeWriteError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/row-level security|permission denied/i.test(message))
    return "You don't have permission to change product options. Sign in with an admin account.";
  if (/duplicate key|unique constraint/i.test(message))
    return "That combination already exists.";
  return message || "Unable to save changes.";
}
