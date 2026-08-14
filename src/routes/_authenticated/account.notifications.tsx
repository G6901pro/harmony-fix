import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BellRing, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, Empty } from "@/components/account/ui";
import { formatDateTime } from "@/lib/account-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id?: string) => {
      const query = supabase.from("notifications").update({ is_read: true });
      const { error } = id ? await query.eq("id", id) : await query.eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["header-notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notification-badges"] });
      void queryClient.invalidateQueries({ queryKey: ["account-badges"] });
    },
    onError: (error) => console.error("[notifications] mark read failed", error),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["header-notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notification-badges"] });
      void queryClient.invalidateQueries({ queryKey: ["account-badges"] });
    },
  });

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="Notifications"
        title="Alerts & updates"
        subtitle="Order milestones, concierge messages and release announcements."
        action={
          items.some((n) => !n.is_read) ? (
            <button
              type="button"
              onClick={() => markRead.mutate(undefined)}
              className="rounded-full border border-border px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:border-gold/60 hover:text-gold"
            >
              Mark all read
            </button>
          ) : undefined
        }
      />

      {isLoading ? (
        <Empty title="Loading notifications…" />
      ) : items.length === 0 ? (
        <Empty title="Nothing new" hint="We'll let you know the moment something changes." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-4 rounded-lg border bg-surface p-5",
                item.is_read ? "border-border" : "border-gold/40",
              )}
            >
              <BellRing
                className={cn("mt-0.5 size-5 shrink-0", item.is_read ? "text-muted-foreground" : "text-gold")}
              />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!item.is_read) markRead.mutate(item.id);
                    if (item.link) window.location.assign(item.link);
                  }}
                  className="block text-left text-sm hover:text-gold"
                >
                  {item.title}
                </button>
                {item.body ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                ) : null}
                <p className="mt-2 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                {!item.is_read ? (
                  <button
                    type="button"
                    aria-label="Mark as read"
                    onClick={() => markRead.mutate(item.id)}
                    className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-gold"
                  >
                    <Check className="size-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Delete notification"
                  onClick={() => remove.mutate(item.id)}
                  className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
