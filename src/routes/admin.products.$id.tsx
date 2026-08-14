import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminPage,
  adminField,
  adminLabel,
  ghostButton,
  goldButton,
} from "@/components/admin/AdminPage";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { ProductOptionsEditor } from "@/components/admin/ProductOptionsEditor";
import { ProductVariantsEditor } from "@/components/admin/ProductVariantsEditor";
import { useProductOptionsAdmin } from "@/lib/admin/product-options";
import {
  slugify,
  STOCK_LABELS,
  STOCK_STATUSES,
  type AdminProduct,
} from "@/lib/admin/data";
import { BRANDS, CATEGORIES } from "@/lib/catalog";
import { useCategoryNames } from "@/lib/admin/db";
import { useInvalidateStorefront } from "@/lib/storefront-products";

export const Route = createFileRoute("/admin/products/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Edit product · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProductFormRoute,
});

type Draft = {
  title: string;
  slug: string;
  description: string;
  base_price: string;
  compare_at_price: string;
  category: string;
  brand: string;
  sku: string;
  main_image: string[];
  gallery_images: string[];
  stock_status: string;
  stock_quantity: string;
  is_featured: boolean;
  is_active: boolean;
};

/** Per-field validation messages keyed by draft field. */
type FieldErrors = Partial<Record<keyof Draft, string>>;

/** Turn a Supabase write failure into something an admin can act on. */
function describeSaveError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/duplicate key|unique constraint/i.test(message))
    return "A product with this slug or SKU already exists. Use a different one.";
  if (/row-level security|permission denied/i.test(message))
    return "You don't have permission to save products. Sign in with an admin account.";
  return message || "Unable to save product.";
}

/** Field class with a bold red border when the field has a validation error. */
function fieldCls(base: string, message?: string) {
  return message ? `${base} border-2 border-destructive` : base;
}

function ErrText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[11px] font-medium text-destructive">{message}</p>;
}



const EMPTY: Draft = {
  title: "",
  slug: "",
  description: "",
  base_price: "0",
  compare_at_price: "",
  category: CATEGORIES[0],
  brand: BRANDS[0],
  sku: "",
  main_image: [],
  gallery_images: [],
  stock_status: "in_stock",
  stock_quantity: "0",
  is_featured: false,
  is_active: true,
};



function ProductFormRoute() {
  const { id } = useParams({ from: "/admin/products/$id" });
  const isNew = id === "new";
  return (
    <AdminPage
      module="products"
      action={isNew ? "create" : "update"}
      eyebrow="Catalogue"
      title={isNew ? "Add product" : "Edit product"}
      description="Product details, imagery, stock and unlimited custom option groups."
    >
      <ProductForm id={id} />
    </AdminPage>
  );
}

function ProductForm({ id }: { id: string }) {
  const isNew = id === "new";
  const navigate = useNavigate();
  const invalidateStorefront = useInvalidateStorefront();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const { names: liveCategories } = useCategoryNames();
  // Live categories from the Categories module first, curated house list merged in.
  const categoryOptions = useMemo(
    () => [...new Set<string>([...liveCategories, ...CATEGORIES, draft.category])].filter(Boolean),
    [liveCategories, draft.category],
  );
  const [optionSlug, setOptionSlug] = useState<string | null>(null);
  const { groups, setGroups, variants, setVariants } = useProductOptionsAdmin(optionSlug);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [productId, setProductId] = useState<string | null>(isNew ? null : id);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});




  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    void (async () => {
      const { data, error: err } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (err || !data) {
        setError(err?.message ?? "Product not found.");
        setLoading(false);
        return;
      }
      const p = data as AdminProduct;
      setDraft({
        title: p.title,
        slug: p.slug,
        description: p.description ?? "",
        base_price: String(p.base_price ?? 0),
        compare_at_price: p.compare_at_price == null ? "" : String(p.compare_at_price),
        category: p.category,
        brand: p.brand ?? "",
        sku: p.sku ?? "",
        main_image: p.main_image ? [p.main_image] : [],
        gallery_images: p.gallery_images ?? [],
        stock_status: p.stock_status,
        stock_quantity: String(p.stock_quantity ?? 0),
        is_featured: p.is_featured,
        is_active: p.is_active,
      });
      setOptionSlug(p.slug);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);


  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
    setPublished(false);
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    // Details or imagery changed — the product must be saved again before publishing.
    setCanPublish(false);
  }

  /** Required-field validation for the two-step save → publish workflow. */
  function validate(d: Draft): FieldErrors {
    const next: FieldErrors = {};
    if (!d.title.trim()) next.title = "Product title is required.";
    if (!(d.slug || slugify(d.title)).trim()) next.slug = "A URL slug is required.";
    if (!d.base_price.trim() || Number.isNaN(Number(d.base_price)) || Number(d.base_price) <= 0)
      next.base_price = "Enter a price greater than 0.";
    if (!d.category.trim()) next.category = "Category is required.";
    if (!d.main_image[0]) next.main_image = "A main image is required.";
    if (!d.sku.trim()) next.sku = "SKU is required.";
    if (!d.stock_quantity.trim() || Number.isNaN(Number(d.stock_quantity)) || Number(d.stock_quantity) < 0)
      next.stock_quantity = "Enter a valid stock quantity.";
    return next;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const found = validate(draft);
    setFieldErrors(found);
    if (Object.keys(found).length) {
      setError("Please correct the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    try {
      const slug = (draft.slug || slugify(draft.title)).trim();

      const payload = {
        title: draft.title.trim(),
        slug,
        description: draft.description.trim() || null,
        base_price: Number(draft.base_price) || 0,
        compare_at_price: draft.compare_at_price ? Number(draft.compare_at_price) : null,
        category: draft.category,
        brand: draft.brand || null,
        sku: draft.sku.trim() || null,
        main_image: draft.main_image[0] ?? null,
        gallery_images: draft.gallery_images,
        stock_status: draft.stock_status,
        stock_quantity: Number(draft.stock_quantity) || 0,
        is_featured: draft.is_featured,
        is_active: draft.is_active,
      };

      if (isNew) {
        const { data, error: err } = await supabase
          .from("products")
          // New products start as a draft; "Upload product" publishes them.
          .insert({ ...payload, status: "draft" })
          .select()
          .single();
        if (err) throw err;
        const created = data as AdminProduct;
        setProductId(created.id);
        setOptionSlug(created.slug);
        navigate({ to: "/admin/products/$id", params: { id: created.id } });
      } else {
        const { error: err } = await supabase.from("products").update(payload).eq("id", id);
        if (err) throw err;
        setProductId(id);
        setOptionSlug(slug);
      }
      invalidateStorefront();
      setSaved(true);
      setCanPublish(true);
    } catch (err) {
      setError(describeSaveError(err));
    } finally {
      setSaving(false);
    }
  }


  /** Publish: flip the saved row live so it appears in the storefront immediately. */
  async function publish() {
    const target = productId ?? (isNew ? null : id);
    if (!target) {
      setError("Save the product first, then upload it to the storefront.");
      return;
    }
    setError(null);
    setPublishing(true);
    try {
      const { error: err } = await supabase
        .from("products")
        .update({ status: "published", is_active: true })
        .eq("id", target);
      if (err) throw err;
      setDraft((d) => ({ ...d, is_active: true }));
      invalidateStorefront();
      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish product.");
    } finally {
      setPublishing(false);
    }
  }


  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="space-y-8">
        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg tracking-tight">Product details</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className={adminLabel} htmlFor="p-title">
                Product title
              </label>
              <input
                id="p-title"
                className={fieldCls(adminField, fieldErrors.title)}
                value={draft.title}
                maxLength={140}
                onChange={(e) => {
                  set("title", e.target.value);
                  if (isNew) set("slug", slugify(e.target.value));
                }}
              />
              <ErrText message={fieldErrors.title} />

            </div>
            <div>
              <label className={adminLabel} htmlFor="p-slug">
                URL slug
              </label>
              <input
                id="p-slug"
                className={adminField}
                value={draft.slug}
                maxLength={140}
                onChange={(e) => set("slug", slugify(e.target.value))}
              />
            </div>
            <div className="md:col-span-2">
              <label className={adminLabel} htmlFor="p-desc">
                Description
              </label>
              <textarea
                id="p-desc"
                className={`${adminField} min-h-32`}
                value={draft.description}
                maxLength={4000}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="p-price">
                Base price
              </label>
              <input
                id="p-price"
                type="number"
                step="0.01"
                min="0"
                className={fieldCls(adminField, fieldErrors.base_price)}
                value={draft.base_price}
                onChange={(e) => set("base_price", e.target.value)}
              />
              <ErrText message={fieldErrors.base_price} />

            </div>
            <div>
              <label className={adminLabel} htmlFor="p-compare">
                Compare-at price (optional)
              </label>
              <input
                id="p-compare"
                type="number"
                step="0.01"
                min="0"
                className={adminField}
                value={draft.compare_at_price}
                onChange={(e) => set("compare_at_price", e.target.value)}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="p-category">
                Category
              </label>
              <select
                id="p-category"
                className={fieldCls(adminField, fieldErrors.category)}
                value={draft.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ErrText message={fieldErrors.category} />

            </div>
            <div>
              <label className={adminLabel} htmlFor="p-brand">
                Brand
              </label>
              <select
                id="p-brand"
                className={adminField}
                value={draft.brand}
                onChange={(e) => set("brand", e.target.value)}
              >
                <option value="">—</option>
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminLabel} htmlFor="p-sku">
                SKU
              </label>
              <input
                id="p-sku"
                className={fieldCls(adminField, fieldErrors.sku)}
                value={draft.sku}
                maxLength={60}
                onChange={(e) => set("sku", e.target.value)}
              />
              <ErrText message={fieldErrors.sku} />

            </div>
            <div>
              <label className={adminLabel} htmlFor="p-stock-status">
                Stock status
              </label>
              <select
                id="p-stock-status"
                className={adminField}
                value={draft.stock_status}
                onChange={(e) => set("stock_status", e.target.value)}
              >
                {STOCK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STOCK_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminLabel} htmlFor="p-stock-qty">
                Stock quantity
              </label>
              <input
                id="p-stock-qty"
                type="number"
                min="0"
                className={fieldCls(adminField, fieldErrors.stock_quantity)}
                value={draft.stock_quantity}
                onChange={(e) => set("stock_quantity", e.target.value)}
              />
              <ErrText message={fieldErrors.stock_quantity} />

            </div>
            <div className="flex items-center gap-6 md:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[#C8A250]"
                  checked={draft.is_featured}
                  onChange={(e) => set("is_featured", e.target.checked)}
                />
                Featured on homepage
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[#C8A250]"
                  checked={draft.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                />
                Visible in storefront
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg tracking-tight">Imagery</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div>
              <MediaPicker
                label="Main image"
                value={draft.main_image}
                onChange={(v) => set("main_image", v)}
              />
              <ErrText message={fieldErrors.main_image} />
            </div>

            <MediaPicker
              label="Gallery images"
              multiple
              value={draft.gallery_images}
              onChange={(v) => set("gallery_images", v)}
            />
          </div>
        </section>

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className={goldButton}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {isNew ? "Create product" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={!canPublish || publishing}
            title={
              canPublish
                ? "Publish this product to the storefront"
                : "Save changes first to enable publishing"
            }
            className={`${ghostButton} ${!canPublish || publishing ? "cursor-not-allowed opacity-40" : "border-gold/60 text-gold"}`}
          >
            {publishing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UploadCloud className="size-3.5" />
            )}
            Upload product
          </button>
          {saved ? <span className="text-xs text-gold">Saved</span> : null}
          {published ? (
            <span className="text-xs text-gold">Published — live in storefront</span>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Save changes first, then press “Upload product” to publish it instantly to the
          storefront.
        </p>

      </form>

      <ProductOptionsEditor
        productSlug={optionSlug}
        groups={groups}
        setGroups={setGroups}
        onError={setError}
      />

      <ProductVariantsEditor
        productSlug={optionSlug}
        groups={groups}
        variants={variants}
        setVariants={setVariants}
        onError={setError}
      />
    </div>
  );
}