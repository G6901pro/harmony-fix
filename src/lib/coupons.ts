import { supabase } from "@/integrations/supabase/client";

/**
 * Customer-specific coupons.
 *
 * Coupons are bound to a single customer through `assigned_user_id` (the
 * profile id) plus the email captured at creation time. Reads never touch the
 * `auth` schema — RLS on `public.coupons` scopes each customer to their own
 * rows, and the admin console joins against `public.profiles`.
 */
export type CustomerCoupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_total: number;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  terms: string | null;
  assigned_user_id: string | null;
  assigned_email: string | null;
  created_at: string;
};

const COUPON_COLUMNS =
  "id, code, discount_type, discount_value, min_order_total, usage_limit, used_count, starts_at, expires_at, is_active, terms, assigned_user_id, assigned_email, created_at";

/** True once the coupon is expired, used up or manually switched off. */
export function isCouponSpent(coupon: CustomerCoupon): boolean {
  if (!coupon.is_active) return true;
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) return true;
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() <= Date.now()) return true;
  return false;
}

export function couponStatusLabel(coupon: CustomerCoupon): "Active" | "Used" | "Expired" {
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() <= Date.now()) return "Expired";
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) return "Used";
  return coupon.is_active ? "Active" : "Expired";
}

export function couponValueLabel(coupon: CustomerCoupon): string {
  return coupon.discount_type === "amount" || coupon.discount_type === "fixed"
    ? `৳${Number(coupon.discount_value).toLocaleString("en-US")} off`
    : `${Number(coupon.discount_value)}% off`;
}

/**
 * Coupons the signed-in customer can use: the ones assigned to them plus every
 * active public coupon (`assigned_user_id IS NULL`). Never throws.
 */
export async function fetchMyCoupons(): Promise<CustomerCoupon[]> {
  try {
    const { data: session } = await supabase.auth.getUser();
    const userId = session.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from("coupons")
      .select(COUPON_COLUMNS)
      .or(`assigned_user_id.eq.${userId},and(assigned_user_id.is.null,is_active.eq.true)`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchMyCoupons", error.message);
      return [];
    }

    const now = Date.now();
    const rows = (data ?? []) as CustomerCoupon[];
    return rows.filter((coupon) => {
      // Public coupons that have not started yet are not the customer's business.
      if (coupon.assigned_user_id === null) {
        if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return false;
      }
      return true;
    });
  } catch (error) {
    console.error("fetchMyCoupons", error);
    return [];
  }
}


export type NewCustomerCoupon = {
  code: string;
  discountType: "percent" | "amount";
  discountValue: number;
  minOrderTotal: number;
  usageLimit: number;
  expiresAt: string | null;
  terms: string;
  customerId: string;
  customerEmail: string | null;
};

/** Admin: issue a coupon locked to one customer. */
export async function createCustomerCoupon(
  input: NewCustomerCoupon,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const code = input.code.trim().toUpperCase();
    if (code.length < 3) return { ok: false, message: "Enter a coupon code of at least 3 characters." };
    if (!Number.isFinite(input.discountValue) || input.discountValue <= 0) {
      return { ok: false, message: "Enter a discount greater than zero." };
    }
    if (input.discountType === "percent" && input.discountValue > 100) {
      return { ok: false, message: "A percentage discount cannot exceed 100%." };
    }

    const { error } = await supabase.from("coupons").insert({
      code,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      min_order_total: Math.max(0, input.minOrderTotal || 0),
      usage_limit: Math.max(1, input.usageLimit || 1),
      expires_at: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
      terms: input.terms.trim() || null,
      assigned_user_id: input.customerId,
      assigned_email: input.customerEmail,
      is_active: true,
    });

    if (error) {
      return {
        ok: false,
        message:
          error.code === "23505" || error.message.includes("duplicate")
            ? "That coupon code already exists. Choose another."
            : error.message,
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Unable to create coupon." };
  }
}

/** Admin: coupons issued to one customer. Never throws. */
export async function fetchCouponsForCustomer(customerId: string): Promise<CustomerCoupon[]> {
  try {
    const { data, error } = await supabase
      .from("coupons")
      .select(COUPON_COLUMNS)
      .eq("assigned_user_id", customerId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("fetchCouponsForCustomer", error.message);
      return [];
    }
    return (data ?? []) as CustomerCoupon[];
  } catch (error) {
    console.error("fetchCouponsForCustomer", error);
    return [];
  }
}

/** Admin: permanently remove a coupon. Never throws. */
export async function deleteCustomerCoupon(
  couponId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    if (!couponId) return { ok: false, message: "Missing coupon reference." };
    const { error } = await supabase.from("coupons").delete().eq("id", couponId);
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "You do not have permission to delete this coupon."
            : error.message,
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to delete coupon.",
    };
  }
}

export type AppliedCoupon = {
  couponId: string | null;
  code: string;
  discount: number;
  terms: string | null;
};

export type CouponCheckResult =
  | { ok: true; coupon: AppliedCoupon; message: string }
  | { ok: false; message: string };

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Checkout: ask the database whether a code is valid for the signed-in
 * customer and this cart. All validation happens server-side; this helper
 * never throws and always returns a safe result object.
 */
export async function checkCouponForCheckout(
  code: string,
  subtotal: number,
): Promise<CouponCheckResult> {
  try {
    const trimmed = (code ?? "").trim();
    if (trimmed.length < 3) return { ok: false, message: "Enter a valid coupon code." };

    const { data, error } = await supabase.rpc("preview_coupon", {
      p_code: trimmed,
      p_subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    });

    if (error) {
      console.error("checkCouponForCheckout", error.message);
      return { ok: false, message: "We could not check that coupon. Please try again." };
    }

    const result = (data ?? {}) as Record<string, unknown>;
    if (result["valid"] !== true) {
      const reason = typeof result["reason"] === "string" ? result["reason"] : "";
      const messages: Record<string, string> = {
        not_found: "That coupon code is not valid.",
        not_assigned: "This coupon belongs to another customer.",
        not_started: "This coupon is not active yet.",
        expired: "This coupon has expired.",
        usage_limit_reached: "This coupon has already been fully used.",
        min_order_not_met: `Your bag needs to reach ৳${Number(result["min_order_total"] ?? 0).toLocaleString("en-US")} to use this coupon.`,
      };
      return { ok: false, message: messages[reason] ?? "Coupon is not valid." };
    }

    const discount = toNumber(result["discount_amount"]);
    if (discount <= 0) return { ok: false, message: "This coupon has no value for your bag." };

    return {
      ok: true,
      message: "Coupon applied.",
      coupon: {
        couponId: typeof result["coupon_id"] === "string" ? result["coupon_id"] : null,
        code: typeof result["code"] === "string" ? result["code"] : trimmed.toUpperCase(),
        discount,
        terms: typeof result["terms"] === "string" ? result["terms"] : null,
      },
    };

  } catch (error) {
    console.error("checkCouponForCheckout", error);
    return { ok: false, message: "We could not check that coupon. Please try again." };
  }
}

/** Checkout: mark a coupon as used after the order was created. Never throws. */
export async function consumeCoupon(code: string, orderId: string | null): Promise<boolean> {
  try {
    if (!code) return false;
    const { data, error } = await supabase.rpc("consume_coupon", {
      p_code: code,
      p_order_id: orderId as string,
    });
    if (error) {
      console.error("consumeCoupon", error.message);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error("consumeCoupon", error);
    return false;
  }
}
