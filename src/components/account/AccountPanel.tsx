import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  ChevronLeft,
  Heart,
  LayoutDashboard,
  Lock,

  Pencil,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  Star,
  Ticket,
  UserRound,
  X,
} from "lucide-react";

import { currency } from "@/lib/catalog";
import { useMockAuth } from "@/lib/mock-auth";
import {
  STATUS_LABEL,
  formatDate,
  formatDateTime,
  type OrderStatus,
} from "@/lib/account-data";
import {
  buildTimeline,
  fetchMyOrders,
  fetchOrderByNumber,
  fetchOrderEvents,
  isActiveOrder,
  canCancelOrder,
  cancelOrderById,
  updateOrderShipping,
  trackingLabel,
  type OrderRecord,
} from "@/lib/orders";
import { SavedAddressList } from "@/components/address/SavedAddresses";
import {
  couponStatusLabel,
  couponValueLabel,
  fetchMyCoupons,
  type CustomerCoupon,
} from "@/lib/coupons";
import { cn } from "@/lib/utils";
import {
  useNotificationBadges,
  type NotificationCategory,
} from "@/lib/notification-badges";


type View = "overview" | "edit" | "orders" | "history" | "track" | "addresses" | "coupons";

const rowClass =
  "flex w-full items-center gap-3 rounded-[16px] border border-border bg-surface-2/50 px-4 py-3 text-left text-[11px] font-semibold tracking-[0.2em] text-foreground uppercase transition-colors hover:border-gold/50 hover:text-gold";

/** Category count chip shown at the right edge of a sidebar row. */
function RowBadge({ count }: { count: number }) {
  if (!count || count < 1) return null;
  return (
    <span className="ml-auto inline-flex min-w-[22px] items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
      [{count > 99 ? "99+" : count}]
    </span>
  );
}



type Shipping = {
  recipient: string;
  phone: string;
  address: string;
};

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Read the customer-facing shipping details out of the stored address blob. */
function readShipping(raw: Record<string, unknown> | null | undefined): Shipping {
  const a = raw ?? {};
  const address = [
    str(a.line1) || str(a.address),
    str(a.line2),
    str(a.area),
    str(a.district),
    str(a.division),
    str(a.postal_code),
    str(a.country),
  ]
    .filter(Boolean)
    .join(", ");
  return {
    recipient: str(a.recipient) || str(a.full_name) || str(a.name),
    phone: str(a.phone),
    address,
  };
}

function OrderCard({
  order,
  onEdit,
  onCancel,
  cancelling,
}: {
  order: OrderRecord;
  onEdit: (order: OrderRecord) => void;
  onCancel: (order: OrderRecord) => void;
  cancelling: boolean;
}) {
  const shipping = readShipping(order.shipping_address);
  const cancellable = canCancelOrder(order.status);
  const locked = !cancellable && order.status !== "cancelled" && order.status !== "returned";

  return (
    <li className="rounded-[18px] border border-border bg-surface-2/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs tracking-[0.2em] text-foreground uppercase">
          {order.order_number}
        </span>
        <span className="rounded-full border border-gold/40 px-3 py-1 text-[10px] tracking-[0.18em] text-gold uppercase">
          {STATUS_LABEL[order.status]}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Placed {formatDate(order.placed_at)}</p>
      <ul className="mt-3 space-y-3">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt=""
                className="size-12 shrink-0 rounded-[10px] border border-border object-cover"
              />
            ) : null}
            <span className="min-w-0 text-xs">
              <span className="block truncate text-foreground">{item.product_name}</span>
              <span className="block text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {[item.size ? `Size ${item.size}` : null, item.color, `Qty ${item.quantity}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {currency.format(Number(item.unit_price) * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-[14px] border border-border bg-background/40 p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Shipping details
          </p>
          <button
            type="button"
            onClick={() => onEdit(order)}
            className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-3 py-1 text-[10px] tracking-[0.18em] text-gold uppercase transition-colors hover:border-gold"
          >
            <Pencil className="size-3" aria-hidden /> Edit Details
          </button>
        </div>
        <dl className="mt-2 space-y-1.5 text-xs">
          <div className="flex items-start gap-2">
            <UserRound className="mt-0.5 size-3.5 shrink-0 text-gold" aria-hidden />
            <dt className="sr-only">Customer name</dt>
            <dd className="text-foreground">{shipping.recipient || "Not provided"}</dd>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 size-3.5 shrink-0 text-gold" aria-hidden />
            <dt className="sr-only">Phone number</dt>
            <dd className="text-foreground">{shipping.phone || "Not provided"}</dd>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-gold" aria-hidden />
            <dt className="sr-only">Delivery address</dt>
            <dd className="text-muted-foreground">{shipping.address || "Not provided"}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-3 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        Tracking {trackingLabel(order.tracking_number)}
      </p>
      <p className="mt-3 text-sm text-gold">{currency.format(Number(order.total))}</p>

      {cancellable ? (
        <button
          type="button"
          disabled={cancelling}
          onClick={() => onCancel(order)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-destructive/50 px-4 py-2 text-[10px] font-semibold tracking-[0.2em] text-destructive uppercase transition-colors hover:bg-destructive/10 disabled:opacity-60"
        >
          <Ban className="size-3.5" aria-hidden /> {cancelling ? "Cancelling…" : "Cancel Order"}
        </button>
      ) : locked ? (
        <p className="mt-3 flex items-center justify-center gap-2 rounded-full border border-border bg-background/50 px-4 py-2 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          <Lock className="size-3.5" aria-hidden /> Order Confirmed - Cancellation Locked
        </p>
      ) : null}
    </li>
  );
}

/** Modal for editing the phone number and delivery address on an order. */
function EditShippingDialog({
  order,
  onClose,
  onSave,
}: {
  order: OrderRecord;
  onClose: () => void;
  onSave: (values: { phone: string; address: string }) => Promise<void>;
}) {
  const initial = readShipping(order.shipping_address);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-background/80 p-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit shipping details"
        className="glass w-full max-w-[360px] rounded-[20px] border border-border p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-semibold tracking-[0.22em] text-foreground uppercase">
            Edit Details
          </h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-gold"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          {order.order_number}
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await onSave({ phone: phone.trim(), address: address.trim() });
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-xs text-muted-foreground">
            Phone number
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+880 1XXX-XXXXXX"
              className="mt-1 w-full rounded-[14px] border border-border bg-surface-2/60 px-4 py-3 text-sm text-foreground outline-none focus:border-gold/60"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Delivery address
            <textarea
              value={address}
              rows={3}
              onChange={(event) => setAddress(event.target.value)}
              className="mt-1 w-full resize-none rounded-[14px] border border-border bg-surface-2/60 px-4 py-3 text-sm text-foreground outline-none focus:border-gold/60"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center rounded-full bg-[image:var(--gradient-gold)] py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save details"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AccountPanel({
  open,
  onClose,
  onOpenWishlist,
}: {
  open: boolean;
  onClose: () => void;
  onOpenWishlist: () => void;
}) {
  const { user, updateProfile, signOut } = useMockAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { categories: unread, clear: clearBadges } = useNotificationBadges();
  const [view, setView] = useState<View>("overview");

  /** Open a section and immediately clear its unread badge. */
  const openSection = (next: View, category?: NotificationCategory) => {
    try {
      setView(next);
      if (category) void clearBadges(category);
    } catch (error) {
      console.error("[account-panel] could not open section", error);
    }
  };

  const { data: dbOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["panel-orders"],
    queryFn: fetchMyOrders,
    enabled: open && Boolean(user),
    retry: false,
  });
  const { data: myCoupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ["panel-coupons"],
    queryFn: fetchMyCoupons,
    enabled: open && Boolean(user),
    retry: false,
  });



  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [trackId, setTrackId] = useState("");
  const [tracked, setTracked] = useState<OrderRecord | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackBusy, setTrackBusy] = useState(false);
  /** Bumped whenever a local order record changes, to re-read localStorage. */
  const [localVersion, setLocalVersion] = useState(0);
  const [editing, setEditing] = useState<OrderRecord | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: trackedEvents = [] } = useQuery({
    queryKey: ["panel-order-events", tracked?.id],
    queryFn: () => fetchOrderEvents(tracked!.id),
    // Local-only receipts use the order number as id — nothing to fetch.
    enabled: Boolean(tracked?.id && !tracked.id.startsWith("VV-")),
    retry: false,
  });


  useEffect(() => {
    if (!open || !user) return;
    setView("overview");
    setMessage(null);
    setTrackId("");
    setTracked(null);
    setTrackError(null);
    setFullName(user.fullName);
    setEmail(user.email);
    setPhone(user.phone ?? "");
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  // The database is the single source of truth for every order the customer sees.
  const orders = useMemo<OrderRecord[]>(
    () =>
      [...dbOrders].sort(
        (a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime(),
      ),
    [dbOrders],
  );

  async function saveShipping(order: OrderRecord, values: { phone: string; address: string }) {
    const next = {
      ...(order.shipping_address ?? {}),
      phone: values.phone,
      line1: values.address,
    } as Record<string, unknown>;
    try {
      await updateOrderShipping(order.id, next);
    } catch (err) {
      console.error("[orders] could not save shipping details", err);
    }
    setLocalVersion((v) => v + 1);
    setEditing(null);
  }

  async function cancelOrder(order: OrderRecord) {
    if (!order?.id) return;
    if (!canCancelOrder(order.status)) {
      setMessage("This order can no longer be cancelled.");
      return;
    }
    setCancellingId(order.id);
    setMessage(null);
    try {
      await cancelOrderById(order.id);
      setMessage(`Order ${order.order_number} was cancelled and the stock was restored.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["panel-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["notification-badges"] }),
        queryClient.invalidateQueries({ queryKey: ["header-notifications"] }),
      ]);
    } catch (err) {
      console.error("[orders] could not cancel order", err);
      setMessage(err instanceof Error ? err.message : "Could not cancel this order.");
    } finally {
      setLocalVersion((v) => v + 1);
      setCancellingId(null);
    }
  }



  const active = useMemo(() => orders.filter((o) => isActiveOrder(o.status)), [orders]);
  // Order History is the complete record: every order ever placed, newest first.
  const past = orders;


  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await updateProfile({ fullName, email, phone });
      setMessage("Profile updated.");
      setView("overview");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  async function track(event: React.FormEvent) {
    event.preventDefault();
    const query = trackId.trim();
    if (!query) return;
    setTrackBusy(true);
    setTrackError(null);
    try {
      const found =
        orders.find((o) => o.order_number.toUpperCase() === query.toUpperCase()) ??
        (await fetchOrderByNumber(query));
      setTracked(found ?? null);
      setTrackError(found ? null : "No order found with that number.");
    } catch (err) {
      console.error("[track] order lookup failed", { query, error: err });
      setTracked(null);
      setTrackError("We could not load that order. Please try again.");
    } finally {
      setTrackBusy(false);
    }
  }


  const titles: Record<View, string> = {
    overview: "My Account",
    edit: "Edit Profile",
    orders: "My Orders",
    history: "Order History",
    track: "Track Order",
    addresses: "Saved Addresses",
    coupons: "My Coupons",
  };


  const panel = (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[100] bg-background/70 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Account"
        className={cn(
          "glass fixed top-0 right-0 bottom-0 z-[101] flex h-dvh max-h-dvh w-full max-w-[400px] flex-col border-l transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >

        <header className="flex items-center gap-3 border-b border-border px-6 py-5">
          {view !== "overview" ? (
            <button
              type="button"
              aria-label="Back"
              onClick={() => setView("overview")}
              className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-gold"
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : null}
          <h2 className="text-[11px] font-semibold tracking-[0.24em] text-foreground uppercase">
            {titles[view]}
          </h2>
          <button
            type="button"
            aria-label="Close account panel"
            onClick={onClose}
            className="ml-auto grid size-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-gold"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {view === "overview" ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.fullName} profile photo`}
                    className="size-14 shrink-0 rounded-full border border-gold/30 object-cover"
                  />
                ) : (
                  <span className="grid size-14 place-items-center rounded-full bg-[image:var(--gradient-gold)] text-sm font-semibold text-primary-foreground">
                    {initials || "VV"}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-display text-lg">{user.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <dl className="space-y-2 rounded-[18px] border border-border bg-surface-2/50 p-4 text-xs">
                <div className="flex items-center gap-3">
                  <UserRound className="size-4 text-gold" aria-hidden />
                  <dt className="sr-only">Name</dt>
                  <dd className="truncate">{user.fullName}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-gold" aria-hidden />
                  <dt className="sr-only">Email</dt>
                  <dd className="truncate">{user.email}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="size-4 text-gold" aria-hidden />
                  <dt className="sr-only">Phone</dt>
                  <dd className="truncate text-muted-foreground">
                    {user.phone?.trim() ? user.phone : "No phone added"}
                  </dd>
                </div>
              </dl>

              {message ? <p className="text-xs text-gold">{message}</p> : null}

              <div className="space-y-2">
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => {
                    onClose();
                    void navigate({ to: "/account" });
                  }}
                >
                  <LayoutDashboard className="size-4 text-gold" aria-hidden /> Dashboard
                </button>
                <button type="button" className={rowClass} onClick={() => openSection("edit")}>
                  <UserRound className="size-4 text-gold" aria-hidden /> Edit Profile
                </button>

                <button
                  type="button"
                  className={rowClass}
                  onClick={() => openSection("orders", "orders")}
                >
                  <Package className="size-4 text-gold" aria-hidden /> My Orders
                  <RowBadge count={unread.orders} />
                </button>
                <button type="button" className={rowClass} onClick={() => openSection("track")}>
                  <MapPin className="size-4 text-gold" aria-hidden /> Track Order
                </button>
                <button type="button" className={rowClass} onClick={() => openSection("addresses")}>
                  <MapPin className="size-4 text-gold" aria-hidden /> Saved Addresses
                </button>
                <button type="button" className={rowClass} onClick={() => openSection("history")}>
                  <ReceiptText className="size-4 text-gold" aria-hidden /> Order History
                </button>
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => {
                    void clearBadges("reviews");
                    onClose();
                    void navigate({ to: "/account/reviews" });
                  }}
                >
                  <Star className="size-4 text-gold" aria-hidden /> My Reviews
                  <RowBadge count={unread.reviews} />
                </button>

                <button
                  type="button"
                  className={rowClass}
                  onClick={() => {
                    void clearBadges("wishlist");
                    onClose();
                    onOpenWishlist();
                  }}
                >
                  <Heart className="size-4 text-gold" aria-hidden /> Wishlist
                  <RowBadge count={unread.wishlist} />
                </button>
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => openSection("coupons", "coupons")}
                >
                  <Ticket className="size-4 text-gold" aria-hidden /> My Coupons
                  <RowBadge count={unread.coupons} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-[16px] border border-border px-4 py-3 text-[11px] font-semibold tracking-[0.2em] uppercase transition-colors hover:border-destructive/60 hover:text-destructive"
                >
                  <LogOut className="size-4" aria-hidden /> Logout
                </button>
              </div>
            </div>
          ) : null}

          {view === "coupons" ? (
            <div className="space-y-3">
              {couponsLoading ? (
                <p className="text-xs text-muted-foreground">Loading your coupons…</p>
              ) : myCoupons.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  You have no coupons yet. Personalised offers appear here.
                </p>
              ) : (
                myCoupons.map((coupon: CustomerCoupon) => {
                  const status = couponStatusLabel(coupon);
                  return (
                    <div
                      key={coupon.id}
                      className={cn(
                        "rounded-[18px] border border-border bg-surface-2/50 p-4",
                        status !== "Active" && "opacity-60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm tracking-[0.16em] text-foreground uppercase">
                          {coupon.code}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-3 py-1 text-[10px] tracking-[0.18em] uppercase",
                            status === "Active"
                              ? "border-gold/40 text-gold"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-foreground">{couponValueLabel(coupon)}</p>
                      <dl className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                        {Number(coupon.min_order_total) > 0 ? (
                          <div>
                            Valid on orders above{" "}
                            {currency.format(Number(coupon.min_order_total))}
                          </div>

                        ) : null}
                        <div>
                          {coupon.usage_limit === null
                            ? "Unlimited uses"
                            : `${coupon.used_count}/${coupon.usage_limit} used`}
                        </div>
                        <div>
                          {coupon.expires_at
                            ? `Expires ${formatDate(coupon.expires_at)}`
                            : "No expiry date"}
                        </div>
                        {coupon.terms ? <div>{coupon.terms}</div> : null}
                      </dl>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}


          {view === "edit" ? (
            <form onSubmit={saveProfile} className="space-y-4">
              <label className="block text-xs text-muted-foreground">
                Name
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1 w-full rounded-[14px] border border-border bg-surface-2/60 px-4 py-3 text-sm text-foreground outline-none focus:border-gold/60"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-[14px] border border-border bg-surface-2/60 px-4 py-3 text-sm text-foreground outline-none focus:border-gold/60"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Phone
                <input
                  type="tel"
                  value={phone}
                  placeholder="+880 1XXX-XXXXXX"
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-1 w-full rounded-[14px] border border-border bg-surface-2/60 px-4 py-3 text-sm text-foreground outline-none focus:border-gold/60"
                />
              </label>
              {message ? <p className="text-xs text-destructive">{message}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center rounded-full bg-[image:var(--gradient-gold)] py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </form>
          ) : null}

          {view === "addresses" ? <SavedAddressList /> : null}

          {view === "orders" || view === "history" ? (
            ordersLoading ? (
              <p className="py-12 text-center text-xs text-muted-foreground">Loading orders…</p>
            ) : (view === "orders" ? active : past).length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">
                {view === "orders" ? "No orders in progress." : "No past orders yet."}
              </p>
            ) : (
              <ul className="space-y-3">
                {(view === "orders" ? active : past).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onEdit={setEditing}
                    onCancel={(target) => void cancelOrder(target)}
                    cancelling={cancellingId === order.id}
                  />
                ))}
              </ul>
            )
          ) : null}

          {view === "track" ? (
            <div className="space-y-4">
              <form onSubmit={track} className="space-y-3">
                <label className="block text-xs text-muted-foreground">
                  Order number
                  <input
                    value={trackId}
                    onChange={(event) => setTrackId(event.target.value)}
                    placeholder="VV-20260801-A7K9P2"
                    className="mt-1 w-full rounded-[14px] border border-border bg-surface-2/60 px-4 py-3 text-sm text-foreground outline-none focus:border-gold/60"
                  />
                </label>
                <button
                  type="submit"
                  disabled={trackBusy}
                  className="flex w-full items-center justify-center rounded-full bg-[image:var(--gradient-gold)] py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase disabled:opacity-60"
                >
                  {trackBusy ? "Tracking…" : "Track"}
                </button>
              </form>
              {trackError ? <p className="text-xs text-destructive">{trackError}</p> : null}
              {tracked ? (
                <div className="rounded-[18px] border border-border bg-surface-2/50 p-4">
                  <p className="text-xs tracking-[0.2em] text-foreground uppercase">
                    {tracked.order_number}
                  </p>
                  <p className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                    Placed {formatDate(tracked.placed_at)} · Tracking{" "}
                    {trackingLabel(tracked.tracking_number)}
                  </p>
                  <p className="mt-2 text-[10px] tracking-[0.18em] text-gold uppercase">
                    {STATUS_LABEL[tracked.status]} · {currency.format(Number(tracked.total))}
                  </p>
                  <ul className="mt-3 space-y-2 border-t border-border pt-3">
                    {tracked.order_items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="size-10 shrink-0 rounded-[8px] border border-border object-cover"
                          />
                        ) : null}
                        <span className="min-w-0 text-xs">
                          <span className="block truncate text-foreground">
                            {item.product_name}
                          </span>
                          <span className="block text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                            {[item.size ? `Size ${item.size}` : null, item.color, `Qty ${item.quantity}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <ol className="mt-4 space-y-3">
                    {buildTimeline(tracked.status, trackedEvents, tracked.payment_method).map((step) => (
                      <li key={step.status} className="flex items-start gap-3 text-xs">
                        <span
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            step.done ? "bg-gold" : "bg-border",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block",
                              step.done ? "text-foreground" : "text-muted-foreground",
                              step.active && "text-gold",
                            )}
                          >
                            {step.label}
                          </span>
                          {step.at ? (
                            <span className="block text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                              {formatDateTime(step.at)}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
      {editing ? (
        <EditShippingDialog
          order={editing}
          onClose={() => setEditing(null)}
          onSave={(values) => saveShipping(editing, values)}
        />
      ) : null}
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);

}
