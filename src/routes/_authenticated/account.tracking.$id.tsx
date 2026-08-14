import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, CircleSlash, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, Panel, Empty } from "@/components/account/ui";
import {
  flowFor,
  STATUS_LABEL,
  STATUS_NOTE,
  formatDate,
  formatDateTime,
  isTerminal,
  money,
  statusIndex,
  type OrderStatus,
} from "@/lib/account-data";
import { trackingLabel } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account/tracking/$id")({
  component: TrackingPage,
});

function Stepper({
  status,
  paymentMethod,
  events,
}: {
  status: OrderStatus;
  paymentMethod: string | null;
  events: { status: string; created_at: string; note: string | null }[];
}) {
  // The rendered steps and the highlighted index MUST come from the same flow,
  // otherwise the customer sees the step before the one the admin set.
  const flow = flowFor(paymentMethod);
  const current = statusIndex(status, paymentMethod);
  const stamps = new Map(events.map((e) => [e.status, e.created_at]));

  return (
    <ol className="relative space-y-0">
      {flow.map((stage, index) => {
        const done = !isTerminal(status) && index <= current;
        const active = !isTerminal(status) && index === current;
        return (
          <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border transition-colors",
                  done
                    ? "border-gold bg-[image:var(--gradient-gold)] text-primary-foreground"
                    : "border-border text-muted-foreground",
                  active && "shadow-[var(--shadow-gold)]",
                )}
              >
                {done ? (
                  <Check className="size-4" />
                ) : (
                  <span className="text-[10px]">{index + 1}</span>
                )}
              </span>
              {index < flow.length - 1 ? (
                <span
                  className={cn(
                    "mt-1 w-px flex-1",
                    index < current && !isTerminal(status) ? "bg-gold/60" : "bg-border",
                  )}
                />
              ) : null}
            </div>
            <div className="pb-2">
              <p
                className={cn(
                  "text-sm tracking-wide",
                  done ? "text-foreground" : "text-muted-foreground",
                  active && "text-gold",
                )}
              >
                {STATUS_LABEL[stage]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{STATUS_NOTE[stage]}</p>
              {stamps.get(stage) ? (
                <p className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  {formatDateTime(stamps.get(stage))}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TrackingPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [order, items, events] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase
          .from("order_events")
          .select("status, created_at, note")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
      ]);
      return {
        order: order.data,
        items: items.data ?? [],
        events: events.data ?? [],
      };
    },
  });

  if (isLoading) return <Empty title="Loading tracking…" />;
  if (!data?.order)
    return (
      <div className="space-y-6">
        <Empty title="Order not found" hint="This order is not on your account." />
        <Link to="/account/orders" className="text-xs text-gold hover:underline">
          Back to orders
        </Link>
      </div>
    );

  const order = data.order;
  const status = order.status as OrderStatus;
  const address = (order.shipping_address ?? {}) as Record<string, string>;

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow={`Order ${order.order_number}`}
        title="Order tracking"
        subtitle={`Placed ${formatDate(order.placed_at)}${order.courier ? ` · ${order.courier}` : ""}`}
        action={
          <Link
            to="/account/orders"
            className="rounded-full border border-border px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:border-gold/60 hover:text-gold"
          >
            All orders
          </Link>
        }
      />

      {isTerminal(status) ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-surface p-5">
          {status === "cancelled" ? (
            <CircleSlash className="mt-0.5 size-5 shrink-0 text-destructive" />
          ) : (
            <RotateCcw className="mt-0.5 size-5 shrink-0 text-destructive" />
          )}
          <div>
            <p className="text-sm text-destructive">{STATUS_LABEL[status]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{STATUS_NOTE[status]}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel>
          <h2 className="font-display text-lg">Progress</h2>
          <div className={cn("mt-6", isTerminal(status) && "opacity-50")}>
            <Stepper
              status={status}
              paymentMethod={order.payment_method ?? null}
              events={data.events}
            />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <h2 className="font-display text-lg">Items</h2>
            <ul className="mt-4 space-y-4">
              {data.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="size-14 rounded-md border border-border object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {money(item.unit_price)}
                    </p>
                    {Array.isArray(item.selected_options) && item.selected_options.length > 0 ? (
                      <p className="mt-1 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                        {(item.selected_options as { group: string; value: string }[])
                          .map((o) => `${o.group}: ${o.value}`)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{money(order.shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt>Total</dt>
                <dd className="font-display text-gold">{money(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel>
            <h2 className="font-display text-lg">Delivery</h2>
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p>{address.recipient}</p>
              <p>{address.line1}</p>
              {address.line2 ? <p>{address.line2}</p> : null}
              <p>
                {[address.city, address.postal_code, address.country].filter(Boolean).join(", ")}
              </p>
              <p className="pt-3 text-[10px] tracking-[0.2em] uppercase">
                Tracking{" "}
                <span className={order.tracking_number ? "text-gold" : "text-muted-foreground"}>
                  {trackingLabel(order.tracking_number)}
                </span>
              </p>

              {order.estimated_delivery ? (
                <p className="text-[10px] tracking-[0.2em] uppercase">
                  Estimated {formatDate(order.estimated_delivery)}
                </p>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
