import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, Empty } from "@/components/account/ui";
import {
  ALL_STATUSES,
  STATUS_LABEL,
  formatDate,
  isTerminal,
  money,
  type OrderStatus,
} from "@/lib/account-data";
import { trackingLabel } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account/orders")({
  component: OrdersPage,
});

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-[9px] tracking-[0.2em] uppercase",
        status === "delivered" && "border-gold/50 text-gold",
        isTerminal(status) && "border-destructive/50 text-destructive",
        status !== "delivered" && !isTerminal(status) && "border-border text-muted-foreground",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function OrdersPage() {
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, total, placed_at, courier, tracking_number, payment_status, payment_rejection_reason, order_items(id, quantity, product_name, image_url)",
        )
        .order("placed_at", { ascending: false });
      if (error) {
        console.error("[account] orders query failed", error.message);
        return [];
      }
      return data ?? [];
    },
  });

  const visible = orders.filter((o) => filter === "all" || o.status === filter);

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="Orders"
        title="Order history"
        subtitle="Every Velocita Vault order, with live tracking from payment to doorstep."
      />

      <div className="flex flex-wrap gap-2">
        {(["all", ...ALL_STATUSES] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full border px-4 py-2 text-[10px] tracking-[0.2em] uppercase transition-colors",
              filter === value
                ? "border-gold/60 text-gold"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "all" ? "All" : STATUS_LABEL[value]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Empty title="Loading orders…" />
      ) : visible.length === 0 ? (
        <Empty
          title="No orders here"
          hint="When you place an order it appears here with full tracking."
        />
      ) : (
        <div className="space-y-4">
          {visible.map((order) => (
            <div key={order.id} className="rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-lg">{order.order_number}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Placed {formatDate(order.placed_at)}
                    {order.courier ? ` · ${order.courier}` : ""}
                    {` · Tracking ${trackingLabel(order.tracking_number)}`}
                  </p>
                </div>
                <StatusPill status={order.status as OrderStatus} />
              </div>

              {order.payment_status === "rejected" ? (
                <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-destructive uppercase">
                    Payment rejected
                  </p>
                  <p className="mt-1.5 text-xs text-foreground">
                    {order.payment_rejection_reason?.trim()
                      ? order.payment_rejection_reason
                      : "Your payment could not be verified. Please re-submit your payment details or contact support."}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {(order.order_items ?? []).slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="size-12 rounded-md border border-border object-cover"
                      />
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {item.quantity} × {item.product_name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <span className="font-display text-lg text-gold">{money(order.total)}</span>
                <Link
                  to="/account/tracking/$id"
                  params={{ id: order.id }}
                  className="rounded-full border border-border px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:border-gold/60 hover:text-gold"
                >
                  Track order
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
