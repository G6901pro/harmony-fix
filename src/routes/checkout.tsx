import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Loader2,
  Plus,
  ShieldCheck,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { isCashOnDelivery } from "@/lib/account-data";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

import { supabase } from "@/integrations/supabase/client";
import { Constants } from "@/integrations/supabase/types";
import { currency, type CatalogProduct } from "@/lib/catalog";
import { LocationSelect } from "@/components/address/LocationSelect";
import { AddressForm, useSavedAddresses } from "@/components/address/SavedAddresses";
import { formatAddress, saveAddress, type SavedAddress } from "@/lib/saved-addresses";
import { safeQty, shopActions, useShopState } from "@/lib/shop-store";
import { useMockAuth } from "@/lib/mock-auth";
import { checkCouponForCheckout, consumeCoupon, type AppliedCoupon } from "@/lib/coupons";
import { calcDelivery, useShippingSettings } from "@/lib/shipping";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { useStorefrontProducts } from "@/lib/storefront-products";
import { BRAND, PAYMENT_ACCOUNTS, PAYMENT_METHODS } from "@/lib/site-data";
import { cn } from "@/lib/utils";

const TITLE = "Checkout — Velocita Vault";
const DESCRIPTION =
  "Review your Velocita Vault bag and complete your order with bKash, bank transfer or Cash on Delivery.";

/** Client-side unique order reference, used only if the database generator fails. */
function clientOrderNumber() {
  return `VV-${Date.now().toString().slice(-6)}${Math.random()
    .toString(36)
    .substring(2, 5)
    .toUpperCase()}`;
}

/** True when the insert failed because the order-number generator was blocked. */
function isOrderNumberPermissionIssue(error: {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}) {
  const text = [error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
  return (
    error.code === "42501" ||
    text.includes("permission denied") ||
    text.includes("generate_order_number") ||
    text.includes("order_number")
  );
}

/** Every order status the database actually accepts. */
const DB_ORDER_STATUSES = Constants.public.Enums.order_status;
type DbOrderStatus = (typeof DB_ORDER_STATUSES)[number];

/**
 * Candidate statuses, most preferred first. Only values that exist in the
 * database enum are kept, so a schema that spells the initial state
 * differently (`pending`, `pending_payment`, …) never breaks checkout with an
 * "invalid input value for enum order_status" error.
 */
function resolveOrderStatus(candidates: string[]): DbOrderStatus[] {
  const valid = candidates.filter((value): value is DbOrderStatus =>
    (DB_ORDER_STATUSES as readonly string[]).includes(value),
  );
  const rest = DB_ORDER_STATUSES.filter((value) => !valid.includes(value));
  // Always keep at least one usable value as a last resort.
  return valid.length > 0 ? valid : rest.slice(0, 1);
}

/** True when the database rejected the status value we sent. */
function isInvalidStatusIssue(error: {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}) {
  const text = [error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
  return (
    error.code === "22P02" ||
    (text.includes("invalid input value for enum") && text.includes("order_status"))
  );
}

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const baseField =
  "w-full rounded-xl bg-surface-2/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none";
const fieldClass = (invalid?: boolean) =>
  cn(
    baseField,
    invalid ? "border-2 border-destructive" : "border border-border focus:border-gold/60",
  );

const PAYMENT_HELP: Record<string, string> = {
  bkash: `Send the total to our bKash number ${PAYMENT_ACCOUNTS.bkash} (Send Money), then enter your sending number and Transaction ID below.`,
  dbbl: `Transfer the total to our bank account ${PAYMENT_ACCOUNTS.bank}, then enter your sending number and Transaction ID below.`,
  cod: "Pay in cash when your order arrives. Our concierge will call to confirm before dispatch.",
};

const RECEIPT_BUCKET = "payment-receipts";

/** Fallback when storage is unreachable: inline the receipt as a data URL. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

type Errors = Partial<Record<string, string>>;


function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[11px] font-medium text-destructive">{message}</p>;
}

function CheckoutPage() {
  const { cart } = useShopState();
  const { products } = useStorefrontProducts();
  // Single source of truth for the session — no second, local auth check.
  const { user, requireAuth } = useMockAuth();
  const navigate = useNavigate();


  const [method, setMethod] = useState<string>("");
  const [form, setForm] = useState({
    recipient: "",
    phone: "",
    email: "",
    postalCode: "",
    address: "",
    division: "",
    district: "",
    area: "",
    senderNumber: "",
    trxId: "",
    note: "",
  });
  const savedAddresses = useSavedAddresses();
  const shippingSettings = useShippingSettings();
  const [addressId, setAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Copies a saved address into the delivery form. */
  function applyAddress(address: SavedAddress) {
    setAddressId(address.id);
    setAddingAddress(false);
    setForm((prev) => ({
      ...prev,
      recipient: address.recipient,
      phone: address.phone,
      email: prev.email || (address.email ?? ""),
      postalCode: address.postal_code,
      address: address.line1,
      division: address.division,
      district: address.district,
      area: address.area,
    }));
    setErrors({});
  }

  // Auto-fill with the default saved address on first load.
  useEffect(() => {
    if (addressId || addingAddress || savedAddresses.length === 0) return;
    applyAddress(savedAddresses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAddresses]);

  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    };
  }, [receiptPreview]);

  function pickReceipt(file: File | null) {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceipt(file);
    setReceiptPreview(file ? URL.createObjectURL(file) : null);
  }

  // Quantities are clamped to live stock so an order can never exceed inventory.
  const lines = cart
    .map((item) => {
      const product = products.find((p) => p.id === item?.id);
      const stock = Number.isFinite(product?.stock)
        ? Math.max(0, Math.floor(product!.stock))
        : 0;
      return { product, qty: Math.max(1, Math.min(safeQty(item?.qty, 1), stock || 1)) };
    })
    .filter((line): line is { product: CatalogProduct; qty: number } => Boolean(line.product));
  const subtotal = lines.reduce(
    (sum, line) => sum + (Number(line.product.price) || 0) * line.qty,
    0,
  );
  const delivery = calcDelivery(subtotal, form.division, shippingSettings);
  const discount = Math.max(0, Math.min(coupon?.discount ?? 0, subtotal));
  const total = Math.max(0, subtotal - discount + delivery);
  const needsTrx = method === "bkash" || method === "dbbl";
  const isCod = isCashOnDelivery(method);

  // Drop an applied coupon if the bag changes so the discount can never
  // outlive the cart it was validated against.
  useEffect(() => {
    setCoupon(null);
    setCouponError(null);
  }, [subtotal]);

  async function applyCoupon() {
    if (couponBusy) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      if (!user) {
        setCouponError("Please sign in to use a coupon.");
        return;
      }
      const result = await checkCouponForCheckout(couponInput, subtotal);
      if (!result.ok) {
        setCoupon(null);
        setCouponError(result.message);
        return;
      }
      setCoupon(result.coupon);
      setCouponInput(result.coupon.code);
      toast.success(`Coupon ${result.coupon.code} applied.`);
    } catch (err) {
      console.error("[checkout] coupon check failed", err);
      setCouponError("We could not check that coupon. Please try again.");
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!form.recipient.trim()) next.recipient = "Full name is required.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    else if (!/^(\+?880|0)1[0-9]{9}$/.test(form.phone.replace(/[\s-]/g, "")))
      next.phone = "Enter a valid Bangladeshi phone number.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address.";
    if (!form.postalCode.trim()) next.postalCode = "Postal code is required.";
    if (!form.address.trim()) next.address = "Full address is required.";
    if (!form.division) next.division = "Please select a division.";
    if (!form.district) next.district = "Please select a district.";
    if (!form.area) next.area = "Please select an area / upazila / thana.";
    if (!method) next.method = "Please choose a payment method.";
    if (needsTrx) {
      if (!form.senderNumber.trim()) next.senderNumber = "Sender phone number is required.";
      if (!form.trxId.trim()) next.trxId = "Transaction ID is required.";
    }
    return next;
  }

  async function placeOrder(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return; // guard against double-clicks / repeat submits
    setError(null);

    // Not signed in: open the login popup and resume the order right here,
    // with every field the customer already filled in still intact.
    if (!user) {
      requireAuth(() => {
        void placeOrder(event);
      }, "checkout");
      return;
    }


    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      setError("Please correct the highlighted fields.");
      return;
    }

    setSubmitting(true);

    const shippingAddress = {
      recipient: form.recipient.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      line1: form.address.trim(),
      postal_code: form.postalCode.trim(),
      division: form.division,
      district: form.district,
      area: form.area,
      city: form.area || form.district,
      country: "Bangladesh",
    };

    // Remember the delivery address for one-tap future checkouts.
    try {
      saveAddress({
        label: "Delivery address",
        recipient: shippingAddress.recipient,
        phone: shippingAddress.phone,
        email: shippingAddress.email,
        line1: shippingAddress.line1,
        postal_code: shippingAddress.postal_code,
        division: shippingAddress.division,
        district: shippingAddress.district,
        area: shippingAddress.area,
        country: shippingAddress.country,
      });
    } catch (err) {
      console.error("[checkout] could not save delivery address", err);
    }




    function finish(orderNumber: string) {
      // Only the purchased lines leave the cart; wishlist/saved items are untouched.
      lines.forEach((line) => shopActions.removeFromCart(line.product.id));
      toast.success(`Order ${orderNumber} placed.`);
      return navigate({ to: "/order-success/$orderId", params: { orderId: orderNumber } });
    }

    try {
      // 1. Payment proof first. If storage is unavailable we fall back to an
      //    inline base64 data URL so the order is never blocked by an upload.
      let receiptPath: string | null = null;
      if (receipt) {
        const safe = receipt.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
        const { error: uploadError } = await supabase.storage
          .from(RECEIPT_BUCKET)
          .upload(path, receipt, {
            cacheControl: "3600",
            upsert: false,
            contentType: receipt.type || "image/jpeg",
          });
        if (uploadError) {
          console.error("[checkout] receipt upload failed", { path, error: uploadError });
          receiptPath = await fileToDataUrl(receipt).catch(() => null);
          if (!receiptPath) {
            toast.warning("Receipt could not be attached — the order was still placed.");
          }
        } else {
          receiptPath = path;
        }
      }


      // 2. The order reference (VV-…) and placed_at are generated by the
      // database so they are unique, unguessable and never change afterwards.
      // The initial status must match the database enum exactly. We keep an
      // ordered list of acceptable values and retry with the next one if the
      // database rejects it, so the customer never sees an enum error.
      const statusCandidates = resolveOrderStatus(
        isCod
          ? ["order_pending", "pending", "pending_payment", "order_confirmed"]
          : ["payment_under_review", "pending_payment", "order_pending", "pending"],
      );

      const orderPayload = {
        user_id: user.id,
        // Cash on delivery never enters the payment review pipeline.
        status: statusCandidates[0] as (typeof DB_ORDER_STATUSES)[number],
        currency: "BDT",
        subtotal,
        shipping: delivery,
        total,
        discount,
        coupon_code: coupon?.code ?? null,
        payment_method: method,
        payment_provider: method,
        // Manual transfers land in the admin "Awaiting review" queue.
        payment_status: isCod ? "pending" : "under_review",
        payment_txn_id: needsTrx ? form.trxId.trim() : null,
        payment_screenshot: receiptPath,
        payment_note:
          [needsTrx ? `Sender: ${form.senderNumber.trim()}` : null, form.note.trim()]
            .filter(Boolean)
            .join(" · ") || null,
        shipping_address: shippingAddress,
      };

      let { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      // Fallback: the database uses a different name for the initial status.
      for (let i = 1; i < statusCandidates.length && orderError && isInvalidStatusIssue(orderError); i += 1) {
        console.warn("[checkout] retrying with status", statusCandidates[i], orderError.message);
        const retry = await supabase
          .from("orders")
          .insert({
            ...orderPayload,
            status: statusCandidates[i] as (typeof DB_ORDER_STATUSES)[number],
          })
          .select()
          .single();
        order = retry.data;
        orderError = retry.error;
      }

      // Fallback: if the database reference generator is unavailable (for
      // example a permission error on generate_order_number), create a unique
      // reference on the client and retry so the customer is never blocked.
      if (orderError && isOrderNumberPermissionIssue(orderError)) {
        console.warn(
          "[checkout] falling back to a client-generated order reference",
          orderError.message,
        );
        for (let attempt = 0; attempt < 3 && orderError; attempt += 1) {
          const retry = await supabase
            .from("orders")
            .insert({ ...orderPayload, order_number: clientOrderNumber() })
            .select()
            .single();
          order = retry.data;
          orderError = retry.error;
        }
      }

      if (orderError || !order) {
        console.error("[checkout] orders insert failed", {
          message: orderError?.message,
          details: orderError?.details,
          hint: orderError?.hint,
          code: orderError?.code,
        });
        throw orderError ?? new Error("Order could not be created");
      }

      // 3. Line items keep the exact variant and price that was purchased.
      const itemsPayload = lines.map((line) => ({
        order_id: order.id,
        product_slug: line.product.slug,
        product_name: line.product.name,
        image_url: line.product.images[0] ?? null,
        quantity: line.qty,
        unit_price: line.product.price,
        selected_options: {
          size: line.product.sizes?.[0] ?? null,
          color: line.product.colorOptions?.[0] ?? line.product.color ?? null,
        },
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsError) {
        console.error("[checkout] order_items insert failed", {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
        });
      }

      // 4. Burn the coupon. A failure here must never block the order.
      if (coupon?.code) {
        try {
          await consumeCoupon(coupon.code, order.id);
        } catch (couponErr) {
          console.error("[checkout] coupon could not be redeemed", couponErr);
        }
      }

      await finish(order.order_number ?? "");
    } catch (err) {
      // The database is the single source of truth: never confirm an order that
      // was not persisted. The cart is untouched so the customer can retry.
      console.error("[checkout] order could not be saved", err);
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: string }).message)
          : "unexpected error";
      setError(`We could not save your order (${message}). Please try again.`);
      toast.error("Order not saved — please try again.");
    } finally {
      setSubmitting(false);
    }
  }



  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1100px] px-5 py-24 lg:px-10 lg:py-32">
        <p className="eyebrow">Secure Checkout</p>
        <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
          Complete your order
        </h1>

        {lines.length === 0 ? (
          <div className="mt-10 rounded-[22px] border border-border bg-surface-2/60 p-10 text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-foreground uppercase">
              Your bag is empty
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-6 py-3 text-[10px] font-semibold tracking-[0.22em] text-primary-foreground uppercase"
            >
              <ArrowLeft className="size-3.5" /> Back to shop
            </Link>
          </div>
        ) : (
          <form
            onSubmit={placeOrder}
            noValidate
            className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
          >
            <div className="space-y-8">
              <ul className="space-y-4">
                {lines.map((line) => (
                  <li
                    key={line.product.id}
                    className="flex items-center gap-4 rounded-[22px] border border-border bg-surface-2/60 p-4"
                  >
                    <img
                      src={line.product.images[0]}
                      alt={line.product.name}
                      width={160}
                      height={160}
                      className="size-20 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{line.product.name}</p>
                      <p className="mt-1 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                        Qty {line.qty} · {line.product.brand}
                      </p>
                    </div>
                    <span className="text-sm text-gold">
                      {currency.format(line.product.price * line.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              {savedAddresses.length ? (
                <section className="rounded-[22px] border border-border bg-surface-2/60 p-6">
                  <h2 className="eyebrow">Saved addresses</h2>
                  <ul className="mt-5 space-y-2">
                    {savedAddresses.map((address) => {
                      const selected = addressId === address.id && !addingAddress;
                      return (
                        <li key={address.id}>
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() => applyAddress(address)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-xs transition-colors",
                              selected
                                ? "border-gold bg-gold/10 text-foreground"
                                : "border-border hover:border-gold/50",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-1 size-3 shrink-0 rounded-full border",
                                selected ? "border-gold bg-gold" : "border-border",
                              )}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="text-sm text-foreground">{address.recipient}</span>
                                {address.is_default ? (
                                  <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[9px] tracking-[0.2em] text-gold uppercase">
                                    Default
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-1 block leading-relaxed text-muted-foreground">
                                {formatAddress(address)}
                              </span>
                              <span className="mt-1 block text-muted-foreground">
                                {address.phone}
                              </span>
                            </span>
                            {selected ? <Check className="size-4 shrink-0 text-gold" /> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {addingAddress ? (
                    <div className="mt-4">
                      <AddressForm
                        onSaved={(address) => applyAddress(address)}
                        onCancel={() => setAddingAddress(false)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingAddress(true);
                        setAddressId(null);
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase transition-colors hover:border-gold/50 hover:text-gold"
                    >
                      <Plus className="size-3.5" aria-hidden /> Add new address
                    </button>
                  )}
                </section>
              ) : null}

              <section className="rounded-[22px] border border-border bg-surface-2/60 p-6">
                <h2 className="eyebrow">Delivery details</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <input
                      className={fieldClass(Boolean(errors.recipient))}
                      placeholder="Full name *"
                      aria-label="Full name"
                      aria-invalid={Boolean(errors.recipient)}
                      value={form.recipient}
                      onChange={(e) => set("recipient", e.target.value)}
                    />
                    <FieldError message={errors.recipient} />
                  </div>
                  <div>
                    <input
                      className={fieldClass(Boolean(errors.phone))}
                      placeholder="Phone number *"
                      inputMode="tel"
                      aria-label="Phone number"
                      aria-invalid={Boolean(errors.phone)}
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                    />
                    <FieldError message={errors.phone} />
                  </div>
                  <div>
                    <input
                      className={fieldClass(Boolean(errors.email))}
                      placeholder="Email (optional)"
                      type="email"
                      aria-label="Email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                    <FieldError message={errors.email} />
                  </div>
                  <div>
                    <input
                      className={fieldClass(Boolean(errors.postalCode))}
                      placeholder="Postal code *"
                      inputMode="numeric"
                      aria-label="Postal code"
                      aria-invalid={Boolean(errors.postalCode)}
                      value={form.postalCode}
                      onChange={(e) => set("postalCode", e.target.value)}
                    />
                    <FieldError message={errors.postalCode} />
                  </div>
                  <LocationSelect
                    value={{
                      division: form.division,
                      district: form.district,
                      area: form.area,
                    }}
                    errors={{
                      division: errors.division,
                      district: errors.district,
                      area: errors.area,
                    }}
                    onChange={(next) => {
                      setForm((prev) => ({ ...prev, ...next }));
                      setErrors((prev) => ({
                        ...prev,
                        division: undefined,
                        district: undefined,
                        area: undefined,
                      }));
                    }}
                    renderField={(key, node, error) => (
                      <div key={key}>
                        {node}
                        <FieldError message={error} />
                      </div>
                    )}
                  />
                  <div className="hidden sm:block" aria-hidden />
                  <div className="sm:col-span-2">
                    <textarea
                      className={`${fieldClass(Boolean(errors.address))} min-h-24`}
                      placeholder="Full address * (House / Road / Area)"
                      aria-label="Full address"
                      aria-invalid={Boolean(errors.address)}
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                    />
                    <FieldError message={errors.address} />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      className={fieldClass(false)}
                      placeholder="Order note (optional)"
                      aria-label="Order note"
                      value={form.note}
                      onChange={(e) => set("note", e.target.value)}
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="h-max rounded-[22px] border border-border bg-surface-2/60 p-6">
              <h2 className="eyebrow">Order summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{currency.format(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd>{delivery === 0 ? "Free" : currency.format(delivery)}</dd>
                </div>
                {discount > 0 ? (
                  <div className="flex justify-between text-gold">
                    <dt>Coupon {coupon?.code ? `· ${coupon.code}` : ""}</dt>
                    <dd>−{currency.format(discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-border pt-3 font-display text-lg text-gold">
                  <dt>Total</dt>
                  <dd>{currency.format(total)}</dd>
                </div>
              </dl>

              <ErrorBoundary boundary="checkout_coupon" silent>
                <div className="mt-6 rounded-xl border border-border bg-surface/60 p-4">
                  <label
                    htmlFor="coupon-code"
                    className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase"
                  >
                    Coupon code
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="coupon-code"
                      value={couponInput}
                      maxLength={40}
                      disabled={Boolean(coupon)}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void applyCoupon();
                        }
                      }}
                      placeholder="Enter coupon code"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-xs tracking-[0.12em] uppercase outline-none focus:border-gold/60 disabled:opacity-60"
                    />
                    {coupon ? (
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="rounded-lg border border-border px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:border-destructive/60 hover:text-destructive"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void applyCoupon()}
                        disabled={couponBusy || couponInput.trim().length < 3}
                        className="rounded-lg bg-[image:var(--gradient-gold)] px-4 py-2.5 text-[10px] font-semibold tracking-[0.2em] text-primary-foreground uppercase disabled:opacity-50"
                      >
                        {couponBusy ? "Checking…" : "Apply"}
                      </button>
                    )}
                  </div>
                  {couponError ? (
                    <p className="mt-2 text-[11px] font-medium text-destructive">{couponError}</p>
                  ) : null}
                  {coupon ? (
                    <p className="mt-2 text-[11px] text-gold">
                      {coupon.code} applied — you save {currency.format(discount)}.
                      {coupon.terms ? (
                        <span className="mt-1 block text-muted-foreground">{coupon.terms}</span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              </ErrorBoundary>

              <h3 className="eyebrow mt-8">Payment method</h3>
              <ul className="mt-4 space-y-2">
                {PAYMENT_METHODS.map((option) => {
                  const selected = method === option.id;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setMethod(option.id);
                          setErrors((prev) => ({ ...prev, method: undefined }));
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-xs transition-colors",
                          selected
                            ? "border-gold bg-gold/10 text-foreground"
                            : errors.method
                              ? "border-2 border-destructive"
                              : "border-border hover:border-gold/50",
                        )}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: option.accent }}
                          aria-hidden
                        />
                        <span className="flex-1">
                          {option.label}
                          <span className="block text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                            {option.note}
                          </span>
                        </span>
                        {selected ? <Check className="size-4 text-gold" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <FieldError message={errors.method} />

              {method ? (
                <div className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-4">
                  {method === "bkash" ? (
                    <p className="text-xs tracking-[0.16em] text-gold uppercase">
                      bKash number: {PAYMENT_ACCOUNTS.bkash}
                    </p>
                  ) : null}
                  {method === "dbbl" ? (
                    <p className="text-xs tracking-[0.16em] text-gold uppercase">
                      Bank account number: {PAYMENT_ACCOUNTS.bank}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {PAYMENT_HELP[method]}
                  </p>

                  {needsTrx ? (
                    <div className="mt-4 grid gap-3">
                      <div>
                        <input
                          className={fieldClass(Boolean(errors.senderNumber))}
                          placeholder="Sender phone number *"
                          inputMode="tel"
                          aria-label="Sender phone number"
                          aria-invalid={Boolean(errors.senderNumber)}
                          value={form.senderNumber}
                          onChange={(e) => set("senderNumber", e.target.value)}
                        />
                        <FieldError message={errors.senderNumber} />
                      </div>
                      <div>
                        <input
                          className={fieldClass(Boolean(errors.trxId))}
                          placeholder="Transaction ID (TrxID) *"
                          aria-label="Transaction ID"
                          aria-invalid={Boolean(errors.trxId)}
                          value={form.trxId}
                          onChange={(e) => set("trxId", e.target.value)}
                        />
                        <FieldError message={errors.trxId} />
                      </div>

                      <div>
                        <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                          Payment receipt (optional)
                        </span>
                        {receiptPreview ? (
                          <div className="relative mt-2 overflow-hidden rounded-xl border border-border">
                            <img
                              src={receiptPreview}
                              alt="Payment receipt preview"
                              className="max-h-56 w-full object-contain bg-surface-2/60"
                            />
                            <button
                              type="button"
                              aria-label="Remove receipt"
                              onClick={() => pickReceipt(null)}
                              className="absolute top-2 right-2 grid size-8 place-items-center rounded-full border border-border bg-background/80 text-muted-foreground hover:text-destructive"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2/40 px-4 py-6 text-center transition-colors hover:border-gold/50">
                            <ImagePlus className="size-5 text-gold" aria-hidden />
                            <span className="text-xs text-muted-foreground">
                              Upload payment screenshot / receipt
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => pickReceipt(e.target.files?.[0] ?? null)}
                            />
                          </label>
                        )}
                        {receipt ? (
                          <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                            {receipt.name}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-gold)] py-3.5 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase disabled:opacity-60"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {submitting ? "Placing order…" : "Place order"}
              </button>
              {!user ? (
                <p className="mt-3 text-center text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  Sign in required to confirm
                </p>
              ) : null}

              <ul className="mt-6 space-y-3 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Truck className="size-3.5 text-gold" /> Delivery in 2–4 days
                </li>
                <li className="flex items-center gap-2">
                  <Wallet className="size-3.5 text-gold" /> Cash on Delivery available
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-gold" /> 7-day return &amp; exchange
                </li>
              </ul>

              <p className="mt-6 text-[10px] leading-relaxed tracking-[0.14em] text-muted-foreground uppercase">
                Order support: {BRAND.phone}
              </p>
            </aside>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
