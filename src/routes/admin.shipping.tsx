import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, dangerButton, ghostButton, goldButton } from "@/components/admin/AdminPage";
import {
  Cell,
  DataTable,
  ErrorText,
  Field,
  Modal,
  Panel,
  Pill,
  Row,
  TextInput,
  Toggle,
} from "@/components/admin/ui";
import { money } from "@/lib/admin/data";
import { logActivity, useTable, type ShippingZone, type SiteSettings } from "@/lib/admin/db";

export const Route = createFileRoute("/admin/shipping")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Shipping · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="shipping"
      eyebrow="Logistics"
      title="Shipping settings"
      description="Set the default delivery charge and manage the zones you deliver to."
    >
      <ShippingModule />
    </AdminPage>
  ),
});

type Draft = {
  id?: string;
  name: string;
  areas: string;
  delivery_charge: number;
  estimated_days: string;
  is_active: boolean;
};

function ShippingModule() {
  const { rows, loading, error, setError, reload } = useTable<ShippingZone>("shipping_zones", {
    orderBy: "name",
    ascending: true,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSettings((data as SiteSettings | null) ?? null));
  }, []);

  async function saveDefaults() {
    if (!settings) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("site_settings")
      .update({
        default_delivery_charge: Number(settings.default_delivery_charge) || 0,
        inside_dhaka_delivery_charge: Number(settings.inside_dhaka_delivery_charge) || 0,
        outside_dhaka_delivery_charge: Number(settings.outside_dhaka_delivery_charge) || 0,
        free_shipping_threshold: Number(settings.free_shipping_threshold) || 0,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (err) return setError(err.message);
    void logActivity("shipping.defaults.update", "site_settings", settings.id);
  }

  async function saveZone() {
    if (!draft) return;
    const payload = {
      name: draft.name,
      areas: draft.areas,
      delivery_charge: Number(draft.delivery_charge) || 0,
      estimated_days: draft.estimated_days || null,
      is_active: draft.is_active,
    };
    const { error: err } = draft.id
      ? await supabase.from("shipping_zones").update(payload).eq("id", draft.id)
      : await supabase.from("shipping_zones").insert(payload);
    if (err) return setError(err.message);
    void logActivity(draft.id ? "shipping.zone.update" : "shipping.zone.create", "shipping_zones", draft.id, payload);
    setDraft(null);
    void reload();
  }

  async function removeZone(zone: ShippingZone) {
    if (!window.confirm(`Delete zone “${zone.name}”?`)) return;
    const { error: err } = await supabase.from("shipping_zones").delete().eq("id", zone.id);
    if (err) return setError(err.message);
    void logActivity("shipping.zone.delete", "shipping_zones", zone.id, { name: zone.name });
    void reload();
  }

  return (
    <div className="space-y-8">
      <Panel
        title="Delivery defaults"
        description="Charges applied at checkout based on the customer's division."
      >
        {settings ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Inside Dhaka delivery charge">
              <TextInput
                type="number"
                value={settings.inside_dhaka_delivery_charge}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    inside_dhaka_delivery_charge: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Outside Dhaka delivery charge">
              <TextInput
                type="number"
                value={settings.outside_dhaka_delivery_charge}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    outside_dhaka_delivery_charge: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Free shipping over (0 = off)">
              <TextInput
                type="number"
                value={settings.free_shipping_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Fallback delivery charge">
              <TextInput
                type="number"
                value={settings.default_delivery_charge}
                onChange={(e) =>
                  setSettings({ ...settings, default_delivery_charge: Number(e.target.value) })
                }
              />
            </Field>

            <div className="flex items-end">
              <button
                type="button"
                className={goldButton}
                disabled={saving}
                onClick={() => void saveDefaults()}
              >
                <Save className="size-3.5" /> Save defaults
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </Panel>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg tracking-tight">Delivery zones</h2>
          <button
            type="button"
            className={goldButton}
            onClick={() =>
              setDraft({
                name: "",
                areas: "",
                delivery_charge: 0,
                estimated_days: "",
                is_active: true,
              })
            }
          >
            <Plus className="size-3.5" /> New zone
          </button>
        </div>
        <ErrorText message={error} />
        <DataTable
          columns={["Zone", "Areas", "Charge", "ETA", "Status", "Actions"]}
          loading={loading}
          empty={rows.length === 0}
        >
          {rows.map((z) => (
            <Row key={z.id}>
              <Cell>
                <span className="font-medium text-foreground">{z.name}</span>
              </Cell>
              <Cell className="max-w-xs truncate text-muted-foreground">{z.areas || "—"}</Cell>
              <Cell>{money(Number(z.delivery_charge))}</Cell>
              <Cell className="text-muted-foreground">{z.estimated_days ?? "—"}</Cell>
              <Cell>
                <Pill tone={z.is_active ? "success" : "muted"}>
                  {z.is_active ? "Active" : "Paused"}
                </Pill>
              </Cell>
              <Cell>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={ghostButton}
                    onClick={() =>
                      setDraft({
                        id: z.id,
                        name: z.name,
                        areas: z.areas,
                        delivery_charge: Number(z.delivery_charge),
                        estimated_days: z.estimated_days ?? "",
                        is_active: z.is_active,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button type="button" className={dangerButton} onClick={() => void removeZone(z)}>
                    Delete
                  </button>
                </div>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Edit zone" : "New zone"}>
        {draft ? (
          <div className="space-y-4">
            <Field label="Zone name">
              <TextInput
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Inside Dhaka"
              />
            </Field>
            <Field label="Areas covered (comma separated)">
              <TextInput
                value={draft.areas}
                onChange={(e) => setDraft({ ...draft, areas: e.target.value })}
                placeholder="Gulshan, Banani, Dhanmondi"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Delivery charge">
                <TextInput
                  type="number"
                  value={draft.delivery_charge}
                  onChange={(e) => setDraft({ ...draft, delivery_charge: Number(e.target.value) })}
                />
              </Field>
              <Field label="Estimated delivery">
                <TextInput
                  value={draft.estimated_days}
                  onChange={(e) => setDraft({ ...draft, estimated_days: e.target.value })}
                  placeholder="1–2 days"
                />
              </Field>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Zone active</span>
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
              <button type="button" className={goldButton} onClick={() => void saveZone()}>
                Save zone
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
