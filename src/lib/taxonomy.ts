/**
 * Live categories & collections.
 *
 * The storefront navigation, filter sidebar, "View all collections" grid and
 * the admin product form all read from here, so anything an admin creates in
 * the Control Room appears everywhere without a code change.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES as FALLBACK_CATEGORIES } from "@/lib/catalog";
import { collections as fallbackCollections } from "@/lib/site-data";

export const TAXONOMY_KEY = ["storefront-taxonomy"] as const;

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image: string | null;
  sort_order: number;
  children: CategoryNode[];
};

type CategoryRow = Omit<CategoryNode, "children">;

export type CollectionEntry = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string | null;
};

async function fetchTaxonomy() {
  const [categories, collections] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, parent_id, image, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("collections")
      .select("id, name, slug, image, description")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    categories: (categories.data ?? []) as CategoryRow[],
    collections: (collections.data ?? []) as CollectionEntry[],
  };
}

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(
    rows.map((row) => [row.id, { ...row, children: [] }]),
  );
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function useTaxonomy() {
  const { data, isFetching } = useQuery({
    queryKey: TAXONOMY_KEY,
    queryFn: fetchTaxonomy,
    // Categories change from the Control Room, so never serve a stale list:
    // refetch on mount and when the tab regains focus.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });


  return useMemo(() => {
    const rows = data?.categories ?? [];
    const tree = buildTree(rows);

    // Every category name (parents and sub-categories) is filterable.
    const categoryNames = rows.length
      ? Array.from(new Set(rows.map((row) => row.name)))
      : [...FALLBACK_CATEGORIES];

    const collections: CollectionEntry[] = data?.collections?.length
      ? data.collections
      : [];

    return {
      isFetching,
      /** Flat rows, ordered by the admin's sort order. */
      categories: rows,
      /** Parent → sub-category tree for navigation menus. */
      categoryTree: tree,
      categoryNames,
      collections,
      /** Fallback tiles keep the homepage populated before any admin edits. */
      fallbackCollections,
    };
  }, [data, isFetching]);
}
