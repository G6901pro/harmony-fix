import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { money, formatDate, STATUS_LABEL, type OrderStatus } from "@/lib/account-data";
import { trackingLabel } from "@/lib/orders";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/admin/db";


const TITLE = "Order Confirmed — Velocita Vault";
const DESCRIPTION = "Your Velocita Vault order has been placed successfully.";

export const Route = createFileRoute("/order-success/$orderId")({
  // Orders are read with the signed-in user's session, so render on the client.
  ssr: false,
  component: OrderSuccessPage,
  errorComponent: () => <NotFound />,
  notFoundComponent: () => <NotFound />,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const shellClass = "rounded-[22px] border border-border bg-surface-2/60 p-6 backdrop-blur";
const primaryBtn =
  "inline-flex items-center justify-center rounded-full bg-gold px-7 py-3 text-[10px] font-medium tracking-[0.25em] text-background uppercase transition-opacity hover:opacity-90";
const ghostBtn =
  "inline-flex items-center justify-center rounded-full border border-border px-7 py-3 text-[10px] tracking-[0.25em] uppercase transition-colors hover:border-gold/60 hover:text-gold";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-[860px] px-5 py-24 lg:px-10 lg:py-32">{children}</main>
      <Footer />
    </>
  );
}

function NotFound() {
  return (
    <Frame>
      <div className={`${shellClass} text-center`}>
        <p className="eyebrow">Order</p>
        <h1 className="mt-3 font-display text-3xl">Order not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We couldn&apos;t find an order with that reference on your account.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className={primaryBtn}>
            Back to shop
          </Link>
        </div>
      </div>
    </Frame>
  );
}

type Address = {
  recipient?: string;
  phone?: string;
  line1?: string;
  area?: string;
  district?: string;
  division?: string;
  postal_code?: string;
  country?: string;
};

function OrderSuccessPage() {
  const { orderId } = Route.useParams();
  const [showDetails, setShowDetails] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["order-success", orderId],
    queryFn: async () => {
      // The database is the only source of truth for a placed order.
      const { data: order, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, total, placed_at, payment_method, payment_status, tracking_number, courier, shipping_address, order_items(id, quantity, product_name, unit_price, image_url, selected_options)",
        )
        .eq("order_number", orderId)
        .maybeSingle();
      if (error) {
        console.error("[order-success] could not load order", { orderId, error });
        throw error;
      }
      return order;
    },
    retry: 1,
  });



  if (isLoading) {
    return (
      <Frame>
        <div className={`${shellClass} flex items-center justify-center gap-3 py-16`}>
          <Loader2 className="size-4 animate-spin text-gold" />
          <span className="text-sm text-muted-foreground">Loading your order…</span>
        </div>
      </Frame>
    );
  }

  if (!data) return <NotFound />;

  const address = (data.shipping_address ?? {}) as Address;
  const itemCount = (data.order_items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const addressLine = [
    address.recipient,
    address.line1,
    address.area,
    address.district,
    address.postal_code,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Frame>
      <div className={`${shellClass} text-center`}>
        <div className="mx-auto grid size-14 place-items-center rounded-full border border-gold/40 bg-gold/10">
          <CheckCircle2 className="size-6 text-gold" />
        </div>
        <p className="eyebrow mt-6">Order Confirmed</p>
        <h1 className="mt-3 font-display text-3xl text-gold lg:text-4xl">
          Thank you for your order.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your order has been placed successfully.
        </p>

        <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border text-left sm:grid-cols-2">
          {[
            ["Order ID", data.order_number],
            ["Order date", formatDate(data.placed_at)],
            ["Order status", STATUS_LABEL[data.status as OrderStatus] ?? data.status],
            [
              "Payment method",
              PAYMENT_PROVIDER_LABELS[data.payment_method ?? ""] ?? data.payment_method ?? "—",
            ],
            ["Order total", money(data.total)],
            ["Items", `${itemCount} item${itemCount === 1 ? "" : "s"}`],
            ["Tracking number", trackingLabel(data.tracking_number)],
            ["Delivery address", addressLine || "—"],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface-2 px-5 py-4">
              <dt className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="mt-1.5 text-sm text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setShowDetails(true)} className={primaryBtn}>
            View order
          </button>
          <Link to="/shop" className={ghostBtn}>
            Continue shopping
          </Link>
        </div>
      </div>

      {showDetails ? (
        <>
          <div
            onClick={() => setShowDetails(false)}
            className="fixed inset-0 z-[70] bg-background/70 backdrop-blur-sm"
            aria-hidden
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Order summary"
            className="glass fixed top-0 right-0 z-[71] flex h-full w-full max-w-[420px] flex-col border-l"
          >
            <header className="flex items-center gap-3 border-b border-border px-6 py-5">
              <h2 className="text-[11px] font-semibold tracking-[0.24em] text-foreground uppercase">
                Order summary
              </h2>
              <button
                type="button"
                aria-label="Close order summary"
                onClick={() => setShowDetails(false)}
                className="ml-auto grid size-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-gold"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 text-left">
              <div>
                <p className="text-xs tracking-[0.2em] text-foreground uppercase">
                  {data.order_number}
                </p>
                <p className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  {formatDate(data.placed_at)} ·{" "}
                  {STATUS_LABEL[data.status as OrderStatus] ?? data.status}
                </p>
              </div>

              <ul className="space-y-3">
                {(data.order_items ?? []).map((item) => {
                  const line = item as typeof item & {
                    image_url?: string | null;
                    size?: string | null;
                    color?: string | null;
                    unit_price?: number | null;
                  };
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-[16px] border border-border bg-surface-2/50 p-3"
                    >
                      {line.image_url ? (
                        <img
                          src={line.image_url}
                          alt={item.product_name}
                          className="size-14 shrink-0 rounded-[10px] border border-border object-cover"
                        />
                      ) : null}
                      <span className="min-w-0 text-xs">
                        <span className="block truncate text-foreground">{item.product_name}</span>
                        <span className="block text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                          {[
                            line.size ? `Size ${line.size}` : null,
                            line.color,
                            `Qty ${item.quantity}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      {line.unit_price != null ? (
                        <span className="ml-auto text-xs text-gold">
                          {money(Number(line.unit_price) * item.quantity)}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              <div className="rounded-[16px] border border-border bg-surface-2/50 p-4">
                <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  Total paid
                </p>
                <p className="mt-1.5 font-display text-xl text-gold">{money(data.total)}</p>
                <p className="mt-3 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  Payment
                </p>
                <p className="mt-1.5 text-sm text-foreground">
                  {PAYMENT_PROVIDER_LABELS[data.payment_method ?? ""] ??
                    data.payment_method ??
                    "—"}
                </p>
              </div>

              <div className="rounded-[16px] border border-border bg-surface-2/50 p-4">
                <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  Delivery address
                </p>
                <p className="mt-1.5 text-sm text-foreground">{addressLine || "—"}</p>
                {address.phone ? (
                  <p className="mt-1 text-xs text-muted-foreground">{address.phone}</p>
                ) : null}
              </div>

              {data.id ? (
                <Link
                  to="/account/tracking/$id"
                  params={{ id: data.id }}
                  className={`${primaryBtn} w-full`}
                >
                  Track this order
                </Link>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </Frame>
  );
}

