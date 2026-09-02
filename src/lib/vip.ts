/**
 * VIP customer system helpers.
 *
 * Eligibility is computed in the database (see `evaluate_vip_status`) from
 * confirmed orders only, so the client just reads settings + membership rows.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VipSettings = {
  is_enabled: boolean;
  threshold_amount: number;
  window_days: number;
  membership_days: number;
  tier_label: string;
  benefits: string[];
};

export const DEFAULT_VIP_SETTINGS: VipSettings = {
  is_enabled: true,
  threshold_amount: 10000,
  window_days: 30,
  membership_days: 365,
  tier_label: "VIP",
  benefits: [
    "Priority concierge support",
    "Free express delivery",
    "Early access to new arrivals",
    "Exclusive VIP-only coupons",
  ],
};

export type VipMember = {
  user_id: string;
  tier: string;
  qualified_at: string;
  expires_at: string | null;
  qualifying_total: number;
  granted_manually: boolean;
};

/** Never throws — falls back to sensible defaults so the UI cannot break. */
export async function fetchVipSettings(): Promise<VipSettings> {
  try {
    const { data, error } = await supabase.from("vip_settings").select("*").limit(1).maybeSingle();
    if (error || !data) return DEFAULT_VIP_SETTINGS;
    return {
      is_enabled: Boolean(data.is_enabled),
      threshold_amount: Number(data.threshold_amount ?? 10000),
      window_days: Number(data.window_days ?? 30),
      membership_days: Number(data.membership_days ?? 365),
      tier_label: data.tier_label || "VIP",
      benefits: Array.isArray(data.benefits) ? data.benefits : DEFAULT_VIP_SETTINGS.benefits,
    };
  } catch {
    return DEFAULT_VIP_SETTINGS;
  }
}

export function isActiveMember(member: VipMember | null | undefined): boolean {
  if (!member) return false;
  if (!member.expires_at) return true;
  return new Date(member.expires_at).getTime() > Date.now();
}

export async function fetchVipMember(userId: string | null | undefined): Promise<VipMember | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from("vip_members")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data as VipMember;
  } catch {
    return null;
  }
}

/** Set of user ids that currently hold active VIP status. */
export async function fetchVipUserIds(): Promise<Set<string>> {
  try {
    const { data, error } = await supabase.from("vip_members").select("user_id, expires_at");
    if (error || !data) return new Set();
    const now = Date.now();
    return new Set(
      data
        .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > now)
        .map((row) => row.user_id),
    );
  } catch {
    return new Set();
  }
}

export function useVipSettings() {
  return useQuery({
    queryKey: ["vip-settings"],
    queryFn: fetchVipSettings,
    staleTime: 60_000,
    retry: false,
  });
}

/** VIP status for the given customer. */
export function useVipStatus(userId: string | null | undefined) {
  const settings = useVipSettings();
  const member = useQuery({
    queryKey: ["vip-member", userId ?? "anon"],
    queryFn: () => fetchVipMember(userId),
    enabled: Boolean(userId),
    retry: false,
  });
  const enabled = settings.data?.is_enabled ?? true;
  return {
    settings: settings.data ?? DEFAULT_VIP_SETTINGS,
    member: member.data ?? null,
    isVip: enabled && isActiveMember(member.data),
  };
}

/** Live set of VIP user ids, used to badge review authors. */
export function useVipUserIds() {
  const { data } = useQuery({
    queryKey: ["vip-user-ids"],
    queryFn: fetchVipUserIds,
    staleTime: 60_000,
    retry: false,
  });
  return data ?? new Set<string>();
}
