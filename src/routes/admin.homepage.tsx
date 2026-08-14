import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
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
import { MediaPicker } from "@/components/admin/MediaPicker";
import {
  HOMEPAGE_KINDS,
  HOMEPAGE_KIND_LABELS,
  logActivity,
  useTable,
  type HomepageBlock,
} from "@/lib/admin/db";

export const Route = createFileRoute("/admin/homepage")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Homepage · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="homepage"
      eyebrow="Storefront"
      title="Homepage manager"
      description="Curate hero banners, featured collections, homepage sections and promotional banners."
    >
      <HomepageModule />
    </AdminPage>
  ),
});

type Draft = {
  id?: string;
  kind: string;
  title: string;
  subtitle: string;
  body: string;
  image: string | null;
  link_label: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
};

const empty: Draft = {
  kind: "hero",
  title: "",
  subtitle: "",
  body: "",
  image: null,
  link_label: "",
  link_url: "",
  sort_order: 0,
  is_active: true,
};

function HomepageModule() {
  const { rows, loading, error, setError, reload } = useTable<HomepageBlock>("homepage_blocks", {
    orderBy: "sort_order",
    ascending: true,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filter, setFilter] = useState("all");

  const visible = rows.filter((r) => filter === "all" || r.kind === filter);

  async function save() {
    if (!draft) return;
    const payload = {
      kind: draft.kind,
      title: draft.title,
      subtitle: draft.subtitle || null,
      body: draft.body || null,
      image: draft.image,
      link_label: draft.link_label || null,
      link_url: draft.link_url || null,
      sort_order: Number(draft.sort_order) || 0,
      is_active: draft.is_active,
    };
    const { error: err } = draft.id
      ? await supabase.from("homepage_blocks").update(payload).eq("id", draft.id)
      : await supabase.from("homepage_blocks").insert(payload);
    if (err) return setError(err.message);
    void logActivity(draft.id ? "homepage.update" : "homepage.create", "homepage_blocks", draft.id, payload);
    setDraft(null);
    void reload();
  }

  async function toggle(block: HomepageBlock) {
    const { error: err } = await supabase
      .from("homepage_blocks")
      .update({ is_active: !block.is_active })
      .eq("id", block.id);
    if (err) return setError(err.message);
    void reload();
  }

  async function remove(block: HomepageBlock) {
    if (!window.confirm(`Delete “${block.title}”?`)) return;
    const { error: err } = await supabase.from("homepage_blocks").delete().eq("id", block.id);
    if (err) return setError(err.message);
    void logActivity("homepage.delete", "homepage_blocks", block.id, { title: block.title });
    void reload();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select
          className="max-w-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by block type"
        >
          <option value="all">All blocks</option>
          {HOMEPAGE_KINDS.map((k) => (
            <option key={k} value={k}>
              {HOMEPAGE_KIND_LABELS[k]}
            </option>
          ))}
        </Select>
        <button type="button" className={goldButton} onClick={() => setDraft({ ...empty })}>
          <Plus className="size-3.5" /> New block
        </button>
      </div>
      <ErrorText message={error} />
      <DataTable
        columns={["Block", "Type", "Link", "Order", "Live", "Actions"]}
        loading={loading}
        empty={visible.length === 0}
      >
        {visible.map((b) => (
          <Row key={b.id}>
            <Cell>
              <p className="font-medium text-foreground">{b.title}</p>
              <p className="text-xs text-muted-foreground">{b.subtitle ?? "—"}</p>
            </Cell>
            <Cell>
              <Pill>{HOMEPAGE_KIND_LABELS[b.kind] ?? b.kind}</Pill>
            </Cell>
            <Cell className="text-xs text-muted-foreground">{b.link_url ?? "—"}</Cell>
            <Cell className="text-muted-foreground">{b.sort_order}</Cell>
            <Cell>
              <Toggle
                label={`Toggle ${b.title}`}
                checked={b.is_active}
                onChange={() => void toggle(b)}
              />
            </Cell>
            <Cell>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={ghostButton}
                  onClick={() =>
                    setDraft({
                      id: b.id,
                      kind: b.kind,
                      title: b.title,
                      subtitle: b.subtitle ?? "",
                      body: b.body ?? "",
                      image: b.image,
                      link_label: b.link_label ?? "",
                      link_url: b.link_url ?? "",
                      sort_order: b.sort_order,
                      is_active: b.is_active,
                    })
                  }
                >
                  Edit
                </button>
                <button type="button" className={dangerButton} onClick={() => void remove(b)}>
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
        title={draft?.id ? "Edit block" : "New homepage block"}
        wide
      >
        {draft ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Block type">
                <Select
                  value={draft.kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                >
                  {HOMEPAGE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {HOMEPAGE_KIND_LABELS[k]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sort order">
                <TextInput
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Title">
              <TextInput
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <Field label="Subtitle">
              <TextInput
                value={draft.subtitle}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
              />
            </Field>
            <Field label="Body copy">
              <TextArea
                rows={3}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Button label">
                <TextInput
                  value={draft.link_label}
                  onChange={(e) => setDraft({ ...draft, link_label: e.target.value })}
                />
              </Field>
              <Field label="Button link">
                <TextInput
                  value={draft.link_url}
                  onChange={(e) => setDraft({ ...draft, link_url: e.target.value })}
                  placeholder="/shop"
                />
              </Field>
            </div>
            <MediaPicker
              label="Block image"
              value={draft.image ? [draft.image] : []}
              onChange={(next) => setDraft({ ...draft, image: next[0] ?? null })}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Live on the homepage</span>
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
                Save block
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
