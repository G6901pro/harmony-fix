import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { TAXONOMY_KEY } from "@/lib/taxonomy";

import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, dangerButton, ghostButton, goldButton } from "@/components/admin/AdminPage";
import {
  Cell,
  DataTable,
  ErrorText,
  Field,
  Modal,
  Pill,
  Row,
  Select,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/admin/ui";
import { slugify } from "@/lib/admin/data";
import { logActivity, useTable, type Category, type Collection } from "@/lib/admin/db";

export const Route = createFileRoute("/admin/categories")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Categories · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="products"
      action="update"
      eyebrow="Merchandising"
      title="Categories & collections"
      description="Structure the catalogue into categories, subcategories and curated collections."
    >
      <CategoriesModule />
    </AdminPage>
  ),
});

type Draft = {
  id?: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string;
  sort_order: number;
  is_active: boolean;
};

const emptyDraft: Draft = {
  name: "",
  slug: "",
  parent_id: null,
  description: "",
  sort_order: 0,
  is_active: true,
};

function CategoriesModule() {
  const [tab, setTab] = useState<"categories" | "collections">("categories");
  return (
    <div>
      <div className="mb-6 flex gap-2">
        {(["categories", "collections"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-5 py-2 text-[10px] font-semibold tracking-[0.2em] uppercase transition-colors ${
              tab === t
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "categories" ? <CategoryTable /> : <CollectionTable />}
    </div>
  );
}

function CategoryTable() {
  const queryClient = useQueryClient();
  const { rows, loading, error, setError, reload } = useTable<Category>("categories", {
    orderBy: "sort_order",
    ascending: true,
  });
  const [draft, setDraft] = useState<Draft | null>(null);

  const parents = useMemo(() => rows.filter((c) => !c.parent_id), [rows]);
  const nameOf = (id: string | null) => rows.find((c) => c.id === id)?.name ?? "—";

  /** Storefront navigation, filters and homepage read the same cached list. */
  const refreshStorefront = () => {
    void queryClient.invalidateQueries({ queryKey: TAXONOMY_KEY });
  };

  async function save() {
    if (!draft) return;
    const payload = {
      name: draft.name,
      slug: draft.slug || slugify(draft.name),
      parent_id: draft.parent_id,
      description: draft.description || null,
      sort_order: Number(draft.sort_order) || 0,
      is_active: draft.is_active,
    };
    const { error: err } = draft.id
      ? await supabase.from("categories").update(payload).eq("id", draft.id)
      : await supabase.from("categories").insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    void logActivity(draft.id ? "category.update" : "category.create", "categories", draft.id, payload);
    setDraft(null);
    void reload();
    refreshStorefront();
  }

  async function remove(row: Category) {
    if (!window.confirm(`Delete category “${row.name}”?`)) return;
    const { error: err } = await supabase.from("categories").delete().eq("id", row.id);
    if (err) return setError(err.message);
    void logActivity("category.delete", "categories", row.id, { name: row.name });
    void reload();
    refreshStorefront();
  }


  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button type="button" className={goldButton} onClick={() => setDraft({ ...emptyDraft })}>
          <Plus className="size-3.5" /> New category
        </button>
      </div>
      <ErrorText message={error} />
      <DataTable
        columns={["Name", "Slug", "Parent", "Order", "Status", "Actions"]}
        loading={loading}
        empty={rows.length === 0}
      >
        {rows.map((c) => (
          <Row key={c.id}>
            <Cell>
              <span className="font-medium text-foreground">{c.name}</span>
            </Cell>
            <Cell className="text-muted-foreground">/{c.slug}</Cell>
            <Cell className="text-muted-foreground">{c.parent_id ? nameOf(c.parent_id) : "—"}</Cell>
            <Cell className="text-muted-foreground">{c.sort_order}</Cell>
            <Cell>
              <Pill tone={c.is_active ? "success" : "muted"}>
                {c.is_active ? "Active" : "Hidden"}
              </Pill>
            </Cell>
            <Cell>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={ghostButton}
                  onClick={() =>
                    setDraft({
                      id: c.id,
                      name: c.name,
                      slug: c.slug,
                      parent_id: c.parent_id,
                      description: c.description ?? "",
                      sort_order: c.sort_order,
                      is_active: c.is_active,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => void remove(c)}
                  className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </Cell>
          </Row>
        ))}
      </DataTable>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit category" : "New category"}
      >
        {draft ? (
          <div className="space-y-4">
            <Field label="Name">
              <TextInput
                value={draft.name}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    name: e.target.value,
                    slug: draft.id ? draft.slug : slugify(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Slug">
              <TextInput
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
            </Field>
            <Field label="Parent category (leave empty for a top-level category)">
              <Select
                value={draft.parent_id ?? ""}
                onChange={(e) => setDraft({ ...draft, parent_id: e.target.value || null })}
              >
                <option value="">None — top level</option>
                {parents
                  .filter((p) => p.id !== draft.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Description">
              <TextArea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>
            <Field label="Sort order">
              <TextInput
                type="number"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
              />
            </Field>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Visible on the storefront</span>
              <Toggle
                label="Active"
                checked={draft.is_active}
                onChange={(v) => setDraft({ ...draft, is_active: v })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className={ghostButton} onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button type="button" className={goldButton} onClick={() => void save()}>
                Save category
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

type CollectionDraft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

function CollectionTable() {
  const queryClient = useQueryClient();
  const { rows, loading, error, setError, reload } = useTable<Collection>("collections", {

    orderBy: "sort_order",
    ascending: true,
  });
  const [draft, setDraft] = useState<CollectionDraft | null>(null);

  async function save() {
    if (!draft) return;
    const payload = {
      name: draft.name,
      slug: draft.slug || slugify(draft.name),
      description: draft.description || null,
      sort_order: Number(draft.sort_order) || 0,
      is_active: draft.is_active,
    };
    const { error: err } = draft.id
      ? await supabase.from("collections").update(payload).eq("id", draft.id)
      : await supabase.from("collections").insert(payload);
    if (err) return setError(err.message);
    void logActivity(draft.id ? "collection.update" : "collection.create", "collections", draft.id, payload);
    setDraft(null);
    void reload();
    void queryClient.invalidateQueries({ queryKey: TAXONOMY_KEY });
  }

  async function remove(row: Collection) {
    if (!window.confirm(`Delete collection “${row.name}”?`)) return;
    const { error: err } = await supabase.from("collections").delete().eq("id", row.id);
    if (err) return setError(err.message);
    void logActivity("collection.delete", "collections", row.id, { name: row.name });
    void reload();
    void queryClient.invalidateQueries({ queryKey: TAXONOMY_KEY });
  }


  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          className={goldButton}
          onClick={() =>
            setDraft({ name: "", slug: "", description: "", sort_order: 0, is_active: true })
          }
        >
          <Plus className="size-3.5" /> New collection
        </button>
      </div>
      <ErrorText message={error} />
      <DataTable
        columns={["Collection", "Slug", "Order", "Status", "Actions"]}
        loading={loading}
        empty={rows.length === 0}
      >
        {rows.map((c) => (
          <Row key={c.id}>
            <Cell>
              <p className="font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.description ?? "—"}</p>
            </Cell>
            <Cell className="text-muted-foreground">/{c.slug}</Cell>
            <Cell className="text-muted-foreground">{c.sort_order}</Cell>
            <Cell>
              <Pill tone={c.is_active ? "success" : "muted"}>
                {c.is_active ? "Active" : "Hidden"}
              </Pill>
            </Cell>
            <Cell>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={ghostButton}
                  onClick={() =>
                    setDraft({
                      id: c.id,
                      name: c.name,
                      slug: c.slug,
                      description: c.description ?? "",
                      sort_order: c.sort_order,
                      is_active: c.is_active,
                    })
                  }
                >
                  Edit
                </button>
                <button type="button" className={dangerButton} onClick={() => void remove(c)}>
                  Delete
                </button>
              </div>
            </Cell>
          </Row>
        ))}
      </DataTable>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit collection" : "New collection"}
      >
        {draft ? (
          <div className="space-y-4">
            <Field label="Name">
              <TextInput
                value={draft.name}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    name: e.target.value,
                    slug: draft.id ? draft.slug : slugify(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Slug">
              <TextInput
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <TextArea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>
            <Field label="Sort order">
              <TextInput
                type="number"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
              />
            </Field>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Visible on the storefront</span>
              <Toggle
                label="Active"
                checked={draft.is_active}
                onChange={(v) => setDraft({ ...draft, is_active: v })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className={ghostButton} onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button type="button" className={goldButton} onClick={() => void save()}>
                Save collection
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
