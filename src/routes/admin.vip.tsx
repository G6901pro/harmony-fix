import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, dangerButton, goldButton } from "@/components/admin/AdminPage";
import {
  Cell,
  DataTable,
  ErrorText,
  Field,
  Panel,
  Pill,
  Row,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/admin/ui";
import { money } from "@/lib/admin/data";
import { logActivity } from "@/lib/admin/db";
import { DEFAULT_VIP_SETTINGS, type VipSettings } from "@/lib/vip";

export const Route = createFileRoute("/admin/vip")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "VIP customers · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="customers"
      eyebrow="Loyalty"
      title="VIP customers"
      description="Configure how customers qualify for VIP status and manage current members."
    >
      <VipModule />
    </AdminPage>
  ),
});

type MemberRow = {
  user_id: string;
  tier: string;
  qualified_at: string;
  expires_at: string | null;
  qualifying_total: number;
  granted_manually: boolean;
};

function VipModule() {
  const [settings, setSettings] = useState<VipSettings | null>(null);
  const [benefitsText, setBenefitsText] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");

  async function loadMembers() {
    const { data, error: err } = await supabase
      .from("vip_members")
      .select("*")
      .order("qualified_at", { ascending: false });
    if (err) return setError(err.message);
    const rows = (data ?? []) as MemberRow[];
    setMembers(rows);
    if (rows.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in(
          "id",
          rows.map((row) => row.user_id),
        );
      const map: Record<string, string> = {};
      for (const profile of profiles ?? []) {
        map[profile.id] = profile.full_name || profile.email || profile.id;
      }
      setNames(map);
    }
  }

  useEffect(() => {
    void supabase
      .from("vip_settings")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const value: VipSettings = data
          ? {
              is_enabled: Boolean(data.is_enabled),
              threshold_amount: Number(data.threshold_amount),
              window_days: Number(data.window_days),
              membership_days: Number(data.membership_days),
              tier_label: data.tier_label || "VIP",
              benefits: Array.isArray(data.benefits) ? data.benefits : [],
            }
          : DEFAULT_VIP_SETTINGS;
        setSettings(value);
        setBenefitsText(value.benefits.join("\n"));
      });
    void loadMembers();
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    const benefits = benefitsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const { error: err } = await supabase
      .from("vip_settings")
      .update({
        is_enabled: settings.is_enabled,
        threshold_amount: Number(settings.threshold_amount) || 0,
        window_days: Number(settings.window_days) || 30,
        membership_days: Number(settings.membership_days) || 365,
        tier_label: settings.tier_label || "VIP",
        benefits,
      })
      .eq("id", true);
    setSaving(false);
    if (err) return setError(err.message);
    setError(null);
    setSettings({ ...settings, benefits });
    void logActivity("vip.settings.update", "vip_settings", undefined, { benefits });
  }

  async function grantVip() {
    const email = grantEmail.trim().toLowerCase();
    if (!email || !settings) return;
    const { data: profile, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (lookupError) return setError(lookupError.message);
    if (!profile) return setError(`No customer found with the email ${email}`);
    const { error: err } = await supabase.from("vip_members").insert({
      user_id: profile.id,
      tier: settings.tier_label,
      granted_manually: true,
      expires_at: new Date(
        Date.now() + (Number(settings.membership_days) || 365) * 86_400_000,
      ).toISOString(),
    });
    if (err) return setError(err.message);
    setError(null);
    setGrantEmail("");
    void logActivity("vip.member.grant", "vip_members", profile.id);
    void loadMembers();
  }

  async function revokeVip(member: MemberRow) {
    if (!window.confirm(`Remove VIP status from ${names[member.user_id] ?? "this customer"}?`)) {
      return;
    }
    const { error: err } = await supabase
      .from("vip_members")
      .delete()
      .eq("user_id", member.user_id);
    if (err) return setError(err.message);
    void logActivity("vip.member.revoke", "vip_members", member.user_id);
    void loadMembers();
  }

  return (
    <div className="space-y-8">
      <ErrorText message={error} />

      <Panel
        title="VIP eligibility"
        description="Customers qualify automatically once their confirmed orders inside the window reach the threshold."
      >
        {settings ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="VIP programme enabled">
              <Toggle
                checked={settings.is_enabled}
                onChange={(value) => setSettings({ ...settings, is_enabled: value })}
                label={settings.is_enabled ? "Active" : "Paused"}
              />
            </Field>
            <Field label="Tier label">
              <TextInput
                value={settings.tier_label}
                maxLength={24}
                onChange={(e) => setSettings({ ...settings, tier_label: e.target.value })}
              />
            </Field>
            <Field label="Qualifying spend (৳)">
              <TextInput
                type="number"
                value={settings.threshold_amount}
                onChange={(e) =>
                  setSettings({ ...settings, threshold_amount: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Qualifying window (days)">
              <TextInput
                type="number"
                value={settings.window_days}
                onChange={(e) => setSettings({ ...settings, window_days: Number(e.target.value) })}
              />
            </Field>
            <Field label="Membership length (days)">
              <TextInput
                type="number"
                value={settings.membership_days}
                onChange={(e) =>
                  setSettings({ ...settings, membership_days: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Benefits (one per line)">
              <TextArea
                rows={5}
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <button
                type="button"
                className={goldButton}
                disabled={saving}
                onClick={() => void saveSettings()}
              >
                <Save className="size-3.5" /> Save VIP settings
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </Panel>

      <Panel title="Grant VIP manually" description="Useful for concierge or partner accounts.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <Field label="Customer email">
              <TextInput
                value={grantEmail}
                placeholder="customer@example.com"
                onChange={(e) => setGrantEmail(e.target.value)}
              />
            </Field>
          </div>
          <button type="button" className={goldButton} onClick={() => void grantVip()}>
            <Crown className="size-3.5" /> Grant VIP
          </button>
        </div>
      </Panel>

      <div>
        <h2 className="mb-4 font-display text-lg tracking-tight">
          VIP members ({members.length})
        </h2>
        <DataTable
          head={["Customer", "Tier", "Qualifying spend", "Qualified", "Expires", ""]}
          empty={members.length === 0 ? "No VIP members yet." : undefined}
        >
          {members.map((member) => (
            <Row key={member.user_id}>
              <Cell>{names[member.user_id] ?? member.user_id.slice(0, 8)}</Cell>
              <Cell>
                <Pill tone={member.granted_manually ? "neutral" : "gold"}>
                  {member.tier}
                  {member.granted_manually ? " · manual" : ""}
                </Pill>
              </Cell>
              <Cell>{money(Number(member.qualifying_total) || 0)}</Cell>
              <Cell>{new Date(member.qualified_at).toLocaleDateString()}</Cell>
              <Cell>
                {member.expires_at ? new Date(member.expires_at).toLocaleDateString() : "Never"}
              </Cell>
              <Cell>
                <button
                  type="button"
                  className={dangerButton}
                  onClick={() => void revokeVip(member)}
                >
                  <Trash2 className="size-3.5" /> Revoke
                </button>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
