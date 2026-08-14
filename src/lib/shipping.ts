import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Delivery pricing rules configured by admins in the Control Room. */
export type ShippingSettings = {
  insideDhaka: number;
  outsideDhaka: number;
  freeShippingOver: number;
};

export const DEFAULT_SHIPPING: ShippingSettings = {
  insideDhaka: 60,
  outsideDhaka: 120,
  freeShippingOver: 0,
};

/** Live shipping settings from the store configuration. Never throws. */
export function useShippingSettings(): ShippingSettings {
  const [settings, setSettings] = useState<ShippingSettings>(DEFAULT_SHIPPING);

  useEffect(() => {
    let active = true;
    void supabase
      .from("site_settings")
      .select(
        "inside_dhaka_delivery_charge, outside_dhaka_delivery_charge, default_delivery_charge, free_shipping_threshold",
      )
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        const fallback = Number(data.default_delivery_charge) || 0;
        setSettings({
          insideDhaka: Number(data.inside_dhaka_delivery_charge ?? fallback) || 0,
          outsideDhaka: Number(data.outside_dhaka_delivery_charge ?? fallback) || 0,
          freeShippingOver: Number(data.free_shipping_threshold) || 0,
        });
      });
    return () => {
      active = false;
    };
  }, []);

  return settings;
}

/** True when the selected division is inside the Dhaka delivery zone. */
export function isInsideDhaka(division: string | null | undefined): boolean {
  return (division ?? "").trim().toLowerCase() === "dhaka";
}

/**
 * Delivery charge for a bag: free once the subtotal reaches the
 * "free shipping over" threshold, otherwise the inside/outside Dhaka rate.
 */
export function calcDelivery(
  subtotal: number,
  division: string | null | undefined,
  settings: ShippingSettings,
): number {
  if (!(subtotal > 0)) return 0;
  if (settings.freeShippingOver > 0 && subtotal >= settings.freeShippingOver) return 0;
  return isInsideDhaka(division) ? settings.insideDhaka : settings.outsideDhaka;
}
