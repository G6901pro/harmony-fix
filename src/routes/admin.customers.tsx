import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
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
  StatCard,
  TextArea,
  TextInput,
} from "@/components/admin/ui";

import { money, statusLabel } from "@/lib/admin/data";
import { dateOnly, dateTime, logActivity, type CustomerProfile } from "@/lib/admin/db";
import {
  couponStatusLabel,
  couponValueLabel,
  createCustomerCoupon,
  deleteCustomerCoupon,
  fetchCouponsForCustomer,
  type CustomerCoupon,
} from "@/lib/coupons";


export const Route = createFileRoute("/admin/customers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Customers · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="customers"
      eyebrow="Clientele"
      title="Customer management"
      description="Review every account, inspect order history and block or restore access."
    >
      <CustomersModule />
    </AdminPage>
  ),
});

type OrderLite = {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  placed_at: string;
};

function CustomersModule() {
  const [rows, setRows] = useState<CustomerProfile[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<CustomerProfile | null>(null);
  const [couponFor, setCouponFor] = useState<CustomerProfile | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);



  async function load() {
    setLoading(true);
    const [p, o] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, is_blocked, blocked_at, deleted_at, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, user_id, order_number, status, total, currency, placed_at")
        .order("placed_at", { ascending: false }),
    ]);
    setError(p.error?.message ?? o.error?.message ?? null);
    setRows((p.data ?? []) as CustomerProfile[]);
    setOrders((o.data ?? []) as OrderLite[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (c) =>
        (showRemoved || !c.deleted_at) &&
        (!q ||
          (c.full_name ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query, showRemoved]);

  const spendOf = (id: string) =>
    orders.filter((o) => o.user_id === id).reduce((s, o) => s + Number(o.total ?? 0), 0);
  const ordersOf = (id: string) => orders.filter((o) => o.user_id === id);

  async function toggleBlock(customer: CustomerProfile) {
    const next = !customer.is_blocked;
    if (
      next &&
      !window.confirm(`Block ${customer.email ?? "this customer"}? They will lose store access.`)
    )
      return;
    const { error: err } = await supabase
      .from("profiles")
      .update({ is_blocked: next, blocked_at: next ? new Date().toISOString() : null })
      .eq("id", customer.id);
    if (err) return setError(err.message);
    void logActivity(next ? "customer.block" : "customer.unblock", "profiles", customer.id, {
      email: customer.email,
    });
    setActive(null);
    void load();
  }

  /**
   * Soft delete: the profile row (and therefore every order, invoice and review
   * attached to it) is kept for records, but the account is removed and blocked.
   */
  async function removeCustomer(customer: CustomerProfile) {
    if (
      !window.confirm(
        `Delete ${customer.email ?? "this customer"}? Their account is removed and blocked, but order history is kept.`,
      )
    )
      return;
    const now = new Date().toISOString();
    const { data: session } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("profiles")
      .update({
        deleted_at: now,
        deleted_by: session.user?.id ?? null,
        is_blocked: true,
        blocked_at: customer.blocked_at ?? now,
      })
      .eq("id", customer.id);
    if (err) return setError(err.message);
    void logActivity("customer.delete", "profiles", customer.id, { email: customer.email });
    setActive(null);
    void load();
  }

  async function restoreCustomer(customer: CustomerProfile) {
    const { error: err } = await supabase
      .from("profiles")
      .update({ deleted_at: null, deleted_by: null, is_blocked: false, blocked_at: null })
      .eq("id", customer.id);
    if (err) return setError(err.message);
    void logActivity("customer.restore", "profiles", customer.id, { email: customer.email });
    void load();
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Customers" value={rows.filter((c) => !c.deleted_at).length} />
        <StatCard
          label="Blocked"
          value={rows.filter((c) => c.is_blocked && !c.deleted_at).length}
        />
        <StatCard label="Removed" value={rows.filter((c) => c.deleted_at).length} />
        <StatCard
          label="Lifetime value"
          value={money(orders.reduce((s, o) => s + Number(o.total ?? 0), 0))}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            className="pl-11"
            placeholder="Search name, email or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showRemoved}
            onChange={(e) => setShowRemoved(e.target.checked)}
          />
          Show removed accounts
        </label>
      </div>

      <ErrorText message={error} />

      <div className="mt-6">
        <DataTable
          columns={["Customer", "Contact", "Joined", "Orders", "Spend", "Status", "Actions"]}
          loading={loading}
          empty={filtered.length === 0}
          minWidth={1080}
        >
          {filtered.map((c) => (
            <Row key={c.id}>
              <Cell>
                <span className="font-medium text-foreground">{c.full_name ?? "Unnamed"}</span>
              </Cell>
              <Cell className="text-xs text-muted-foreground">
                <p>{c.email ?? "—"}</p>
                <p>{c.phone ?? "—"}</p>
              </Cell>
              <Cell className="text-xs text-muted-foreground">{dateOnly(c.created_at)}</Cell>
              <Cell>{ordersOf(c.id).length}</Cell>
              <Cell>{money(spendOf(c.id))}</Cell>
              <Cell>
                {c.deleted_at ? (
                  <Pill tone="danger">Removed</Pill>
                ) : c.is_blocked ? (
                  <Pill tone="danger">Blocked</Pill>
                ) : (
                  <Pill tone="success">Active</Pill>
                )}
              </Cell>
              <Cell>
                <div className="flex justify-end gap-2">
                  <button type="button" className={ghostButton} onClick={() => setActive(c)}>
                    History
                  </button>
                  {c.deleted_at ? (
                    <button
                      type="button"
                      className={ghostButton}
                      onClick={() => void restoreCustomer(c)}
                    >
                      Restore
                    </button>
                  ) : (
                    <>
                      <button type="button" className={ghostButton} onClick={() => setCouponFor(c)}>
                        Add Coupon
                      </button>
                      <button
                        type="button"
                        className={c.is_blocked ? ghostButton : dangerButton}
                        onClick={() => void toggleBlock(c)}
                      >
                        {c.is_blocked ? "Unblock" : "Block"}
                      </button>
                      <button
                        type="button"
                        className={dangerButton}
                        onClick={() => void removeCustomer(c)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `${active.full_name ?? "Customer"} · history` : ""}
        wide
      >
        {active ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {active.email ?? "—"} · joined {dateOnly(active.created_at)}
              {active.is_blocked ? ` · blocked ${dateTime(active.blocked_at)}` : ""}
              {active.deleted_at ? ` · removed ${dateTime(active.deleted_at)}` : ""}
            </p>
            {ordersOf(active.id).length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders placed yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {ordersOf(active.id).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm text-foreground">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">{dateTime(o.placed_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Pill>{statusLabel(o.status)}</Pill>
                      <span className="text-sm">{money(Number(o.total))}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Modal>

      <CouponModal customer={couponFor} onClose={() => setCouponFor(null)} />
    </div>

  );
}

/** Issue a personalised coupon locked to one customer's account. */
function CouponModal({
  customer,
  onClose,
}: {
  customer: CustomerProfile | null;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrderTotal, setMinOrderTotal] = useState("0");
  const [usageLimit, setUsageLimit] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [issued, setIssued] = useState<CustomerCoupon[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    setCode(
      `VV-${(customer.full_name ?? customer.email ?? "CUST")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 4)
        .toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
    );
    setDiscountType("percent");
    setDiscountValue("10");
    setMinOrderTotal("0");
    setUsageLimit("1");
    setExpiresAt("");
    setTerms("");
    setMessage(null);
    void fetchCouponsForCustomer(customer.id).then(setIssued);
  }, [customer]);

  async function submit() {
    if (!customer) return;
    setBusy(true);
    setMessage(null);
    const result = await createCustomerCoupon({
      code,
      discountType,
      discountValue: Number(discountValue),
      minOrderTotal: Number(minOrderTotal),
      usageLimit: Number(usageLimit),
      expiresAt: expiresAt || null,
      terms,
      customerId: customer.id,
      customerEmail: customer.email ?? null,
    });
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    void logActivity("coupon.create", "coupons", customer.id, { code, email: customer.email });
    setMessage(`Coupon ${code.toUpperCase()} issued to ${customer.email ?? "this customer"}.`);
    setIssued(await fetchCouponsForCustomer(customer.id));
  }

  async function removeCoupon(coupon: CustomerCoupon) {
    if (!customer || deletingId) return;
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(coupon.id);
    setMessage(null);
    try {
      const result = await deleteCustomerCoupon(coupon.id);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      void logActivity("coupon.delete", "coupons", customer.id, { code: coupon.code });
      setMessage(`Coupon ${coupon.code} deleted.`);
      setIssued(await fetchCouponsForCustomer(customer.id));
    } catch (error) {
      console.error("[admin] coupon delete failed", error);
      setMessage("Unable to delete coupon. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Modal
      open={!!customer}
      onClose={onClose}
      title={customer ? `Add coupon · ${customer.full_name ?? customer.email ?? "Customer"}` : ""}
      wide
    >
      {customer ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This coupon can only be redeemed by {customer.email ?? "this customer"}. It disables
            itself once the usage limit is reached or the expiry date passes.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Coupon code">
              <TextInput value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </Field>
            <Field label="Discount type">
              <Select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "amount")}
              >
                <option value="percent">Percentage (%)</option>
                <option value="amount">Fixed amount (BDT)</option>
              </Select>
            </Field>
            <Field label={discountType === "percent" ? "Discount (%)" : "Discount amount (BDT)"}>
              <TextInput
                type="number"
                min={1}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </Field>
            <Field label="Minimum spend (BDT)">
              <TextInput
                type="number"
                min={0}
                value={minOrderTotal}
                onChange={(e) => setMinOrderTotal(e.target.value)}
              />
            </Field>
            <Field label="Usage limit">
              <TextInput
                type="number"
                min={1}
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
              />
            </Field>
            <Field label="Expiration date">
              <TextInput
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Terms shown to the customer">
            <TextArea
              rows={2}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="One-time use, not valid with other offers."
            />
          </Field>

          {message ? <p className="text-sm text-foreground">{message}</p> : null}

          <div className="flex justify-end gap-2">
            <button type="button" className={ghostButton} onClick={onClose}>
              Close
            </button>
            <button type="button" className={goldButton} disabled={busy} onClick={() => void submit()}>
              {busy ? "Issuing…" : "Issue coupon"}
            </button>
          </div>

          {issued.length > 0 ? (
            <div>
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                Coupons issued to this customer
              </p>
              <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                {issued.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="font-mono text-sm text-foreground">{c.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {couponValueLabel(c)}
                        {Number(c.min_order_total) > 0
                          ? ` · min ${money(Number(c.min_order_total))}`
                          : ""}
                        {c.expires_at ? ` · expires ${dateOnly(c.expires_at)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Pill tone={couponStatusLabel(c) === "Active" ? "success" : "danger"}>
                        {couponStatusLabel(c)}
                      </Pill>
                      <button
                        type="button"
                        aria-label={`Delete coupon ${c.code}`}
                        disabled={deletingId === c.id}
                        onClick={() => void removeCoupon(c)}
                        className="rounded-full border border-border px-3 py-1.5 text-[9px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:border-destructive/60 hover:text-destructive disabled:opacity-50"
                      >
                        {deletingId === c.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

