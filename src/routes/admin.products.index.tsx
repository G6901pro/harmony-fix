import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, adminField, goldButton } from "@/components/admin/AdminPage";
import {
  money,
  resolveMediaUrls,
  STOCK_LABELS,
  STOCK_STATUSES,
  type AdminProduct,
} from "@/lib/admin/data";
import { CATEGORIES } from "@/lib/catalog";
import { useCategoryNames } from "@/lib/admin/db";

export const Route = createFileRoute("/admin/products/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Products · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="products"
      eyebrow="Catalogue"
      title="Product management"
      description="Search, filter and maintain every product in the Velocita Vault catalogue."
      actions={
        <Link to="/admin/products/$id" params={{ id: "new" }} className={goldButton}>
          <Plus className="size-3.5" /> New product
        </Link>
      }
    >
      <ProductList />
    </AdminPage>
  ),
});

function ProductList() {
  const [rows, setRows] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const { names: liveCategories } = useCategoryNames();

  // Categories the filter offers: live categories from the database, the curated
  // house list, and anything already used by a product row.
  const categoryOptions = useMemo(
    () => [...new Set<string>([...liveCategories, ...CATEGORIES, ...rows.map((p) => p.category)])].filter(Boolean),
    [liveCategories, rows],
  );

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    const list = (data ?? []) as AdminProduct[];
    setRows(list);
    setLoading(false);
    setThumbs(await resolveMediaUrls(list.map((p) => p.main_image)));
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((p) => {
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q);
        const matchesCategory = category === "all" || p.category === category;
        const matchesStock = stock === "all" || p.stock_status === stock;
        return matchesQuery && matchesCategory && matchesStock;
      }),
    [rows, query, category, stock],
  );

  async function remove(product: AdminProduct) {
    if (!window.confirm(`Delete “${product.title}”? This cannot be undone.`)) return;
    const { error: err } = await supabase.from("products").delete().eq("id", product.id);
    if (err) {
      setError(err.message);
      return;
    }
    void load();
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${adminField} pl-11`}
            placeholder="Search by title, slug or SKU"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className={adminField}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className={adminField}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          aria-label="Filter by stock status"
        >
          <option value="all">All stock states</option>
          {STOCK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STOCK_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Price</th>
              <th className="px-5 py-4">Stock</th>
              <th className="px-5 py-4">Visibility</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>

          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-gold" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  No products match your filters.
                </td>
              </tr>
            ) : (

              filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 overflow-hidden rounded-md border border-border bg-secondary">
                        {thumbs[p.main_image ?? ""] ? (
                          <img
                            src={thumbs[p.main_image ?? ""] as string}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{p.title}</p>
                        <p className="truncate text-xs text-muted-foreground">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{p.category}</td>
                  <td className="px-5 py-4">{money(p.base_price)}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-gold/25 px-2.5 py-1 text-[9px] tracking-[0.16em] text-gold uppercase">
                      {STOCK_LABELS[p.stock_status] ?? p.stock_status}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">{p.stock_quantity}</span>
                  </td>
                  <td className="px-5 py-4">
                    {p.status === "draft" || !p.is_active ? (
                      <span
                        title="Saved but not published — open the product and press “Upload product”."
                        className="rounded-full border border-border px-2.5 py-1 text-[9px] tracking-[0.16em] text-muted-foreground uppercase"
                      >
                        Draft
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-500/40 px-2.5 py-1 text-[9px] tracking-[0.16em] text-emerald-400 uppercase">
                        Live
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        to="/admin/products/$id"
                        params={{ id: p.id }}
                        aria-label={`Edit ${p.title}`}
                        className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold"
                      >
                        <Pencil className="size-3.5" />
                      </Link>
                      <button
                        type="button"
                        aria-label={`Delete ${p.title}`}
                        onClick={() => void remove(p)}
                        className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}