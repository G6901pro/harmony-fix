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
  TextInput,
  Toggle,
} from "@/components/admin/ui";
import { money } from "@/lib/admin/data";
import { dateOnly, logActivity, useTable, type Coupon } from "@/lib/admin/db";

export const Route = createFileRoute("/admin/coupons")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Coupons · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="coupons"
      action="view"
      eyebrow="Promotions"
      title="Coupon management"
      description="Create, edit and retire discount codes across the storefront."
    >
      <CouponsModule />
    </AdminPage>
  ),
});

type Draft = {
  id?: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_total: number;
  usage_limit: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
};

const empty: Draft = {
  code: "",
  discount_type: "percent",
  discount_value: 10,
  min_order_total: 0,
  usage_limit: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

function CouponsModule() {
  const { rows, loading, error, setError, reload } = useTable<Coupon>("coupons");
  const [draft, setDraft] = useState<Draft | null>(null);

  async function save() {
    if (!draft) return;
    const payload = {
      code: draft.code.trim().toUpperCase(),
      discount_type: draft.discount_type,
      discount_value: Number(draft.discount_value) || 0,
      min_order_total: Number(draft.min_order_total) || 0,
      usage_limit: draft.usage_limit ? Number(draft.usage_limit) : null,
      starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
      expires_at: draft.expires_at ? new Date(draft.expires_at).toISOString() : null,
      is_active: draft.is_active,
    };
    const { error: err } = draft.id
      ? await supabase.from("coupons").update(payload).eq("id", draft.id)
      : // New coupons from this screen are public: never bound to one customer.
        await supabase
          .from("coupons")
          .insert({ ...payload, assigned_user_id: null, assigned_email: null });

    if (err) return setError(err.message);
    void logActivity(draft.id ? "coupon.update" : "coupon.create", "coupons", draft.id, payload);
    setDraft(null);
    void reload();
  }

  async function remove(row: Coupon) {
    if (!window.confirm(`Delete coupon ${row.code}?`)) return;
    const { error: err } = await supabase.from("coupons").delete().eq("id", row.id);
    if (err) return setError(err.message);
    void logActivity("coupon.delete", "coupons", row.id, { code: row.code });
    void reload();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button type="button" className={goldButton} onClick={() => setDraft({ ...empty })}>
          <Plus className="size-3.5" /> New coupon
        </button>
      </div>
      <ErrorText message={error} />
      <DataTable
        columns={[
          "Code",
          "Audience",
          "Discount",
          "Min order",
          "Usage",
          "Window",
          "Status",
          "Actions",
        ]}
        loading={loading}
        empty={rows.length === 0}
        minWidth={1040}
      >
        {rows.map((c) => (
          <Row key={c.id}>
            <Cell>
              <span className="font-medium tracking-[0.14em] text-foreground uppercase">
                {c.code}
              </span>
            </Cell>
            <Cell>
              {c.assigned_user_id ? (
                <Pill tone="muted">Private · {c.assigned_email ?? "1 customer"}</Pill>
              ) : (
                <Pill tone="success">Public · all customers</Pill>
              )}
            </Cell>
            <Cell>
              {c.discount_type === "percent"
                ? `${c.discount_value}%`
                : money(Number(c.discount_value))}
            </Cell>
            <Cell className="text-muted-foreground">{money(Number(c.min_order_total))}</Cell>
            <Cell className="text-muted-foreground">
              {c.used_count}
              {c.usage_limit ? ` / ${c.usage_limit}` : ""}
            </Cell>
            <Cell className="text-xs text-muted-foreground">
              {dateOnly(c.starts_at)} → {dateOnly(c.expires_at)}
            </Cell>
            <Cell>
              <Pill tone={c.is_active ? "success" : "muted"}>
                {c.is_active ? "Active" : "Paused"}
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
                      code: c.code,
                      discount_type: c.discount_type,
                      discount_value: Number(c.discount_value),
                      min_order_total: Number(c.min_order_total),
                      usage_limit: c.usage_limit ? String(c.usage_limit) : "",
                      starts_at: c.starts_at ? c.starts_at.slice(0, 10) : "",
                      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
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

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Edit coupon" : "New coupon"}>
        {draft ? (
          <div className="space-y-4">
            <Field label="Code">
              <TextInput
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="VAULT10"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Discount type">
                <Select
                  value={draft.discount_type}
                  onChange={(e) => setDraft({ ...draft, discount_type: e.target.value })}
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </Select>
              </Field>
              <Field label="Value">
                <TextInput
                  type="number"
                  value={draft.discount_value}
                  onChange={(e) => setDraft({ ...draft, discount_value: Number(e.target.value) })}
                />
              </Field>
              <Field label="Minimum order total">
                <TextInput
                  type="number"
                  value={draft.min_order_total}
                  onChange={(e) => setDraft({ ...draft, min_order_total: Number(e.target.value) })}
                />
              </Field>
              <Field label="Usage limit (blank = unlimited)">
                <TextInput
                  type="number"
                  value={draft.usage_limit}
                  onChange={(e) => setDraft({ ...draft, usage_limit: e.target.value })}
                />
              </Field>
              <Field label="Starts">
                <TextInput
                  type="date"
                  value={draft.starts_at}
                  onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
                />
              </Field>
              <Field label="Expires">
                <TextInput
                  type="date"
                  value={draft.expires_at}
                  onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Coupon active</span>
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
                Save coupon
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
