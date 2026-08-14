import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CreditCard, MessageSquare, Package, Sparkles, Tag, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  kind: string | null;
  title: string | null;
  body: string | null;
  link: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}

function KindIcon({ kind, read }: { kind: string | null; read: boolean }) {
  const className = cn("mt-0.5 size-4 shrink-0", read ? "text-muted-foreground" : "text-gold");
  if (kind === "payment") return <CreditCard className={className} />;
  if (kind === "order") return <Package className={className} />;
  if (kind === "coupon") return <Tag className={className} />;
  if (kind === "review") return <MessageSquare className={className} />;
  return <Sparkles className={className} />;
}

/**
 * Header notification bell.
 * Safe by design: renders even with no auth provider / no signed-in user,
 * never assumes the notifications query succeeded.
 */
export function NotificationBell({ onRequireAuth }: { onRequireAuth?: () => void }) {
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; right: number; width: number } | null>(
    null,
  );
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["header-notifications", user?.id ?? "anon"],
    enabled: Boolean(user?.id),
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, kind, title, body, link, is_read, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as NotificationRow[];
    },
  });

  const items = Array.isArray(data) ? data : [];
  const unread = items.filter((n) => !n?.is_read).length;

  // Live: new notifications land in the bell without a refresh.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-bell-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["header-notifications"] });
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Anchor the panel in the viewport (portal) so it is never clipped by the
  // fixed header, and never sits under the floating support controls.
  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vw = window.innerWidth;
    const isMobile = vw < 640;
    setPos({
      top: rect.bottom + 10,
      left: isMobile ? 12 : Math.max(12, rect.right - 336),
      right: isMobile ? 12 : Math.max(12, vw - rect.right),
      width: isMobile ? vw - 24 : 336,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: Event) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["header-notifications"] });
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    await queryClient.invalidateQueries({ queryKey: ["notification-badges"] });
    await queryClient.invalidateQueries({ queryKey: ["account-badges"] });
  };


  const markAllRead = async () => {
    if (!user?.id || unread === 0) return;
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true } as never)
        .eq("user_id", user.id)
        .eq("is_read", false);
      await invalidate();
    } catch (error) {
      console.error("Failed to mark notifications read", error);
    }
  };

  const openItem = async (item: NotificationRow) => {
    try {
      if (!item.is_read) {
        await supabase
          .from("notifications")
          .update({ is_read: true } as never)
          .eq("id", item.id);
        await invalidate();
      }
    } catch (error) {
      console.error("Failed to mark notification read", error);
    }
    setOpen(false);
    if (item.link) window.location.assign(item.link);
  };

  const panel =
    open && user && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            style={{
              position: "fixed",
              top: pos?.top ?? 72,
              left: pos?.left ?? 12,
              width: pos?.width ?? 336,
              maxHeight: `calc(100dvh - ${(pos?.top ?? 72) + 16}px)`,
            }}
            className="z-[120] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
                Notifications
              </span>
              <div className="flex items-center gap-3">
                {unread > 0 ? (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="text-[10px] tracking-[0.18em] text-gold uppercase"
                  >
                    Mark all read
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setOpen(false)}
                  className="grid size-7 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <ul className="flex-1 divide-y divide-border overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </li>
              ) : (
                items.map((n) => (
                  <li key={n.id} className={cn(!n.is_read && "bg-muted/40")}>
                    <button
                      type="button"
                      onClick={() => void openItem(n)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                    >
                      <KindIcon kind={n.kind} read={Boolean(n.is_read)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium break-words text-foreground">
                          {n.title ?? "Update"}
                        </span>
                        {n.body ? (
                          <span className="mt-1 block text-xs break-words text-muted-foreground">
                            {n.body}
                          </span>
                        ) : null}
                        <span className="mt-1.5 block text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                      {!n.is_read ? (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <a
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-border px-4 py-3 text-center text-[10px] tracking-[0.2em] text-muted-foreground uppercase hover:text-gold"
            >
              View all
            </a>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        aria-label={user ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => {
          if (!user) {
            onRequireAuth?.();
            return;
          }
          setOpen((v) => !v);
        }}
        className="relative grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-gold sm:size-10"
      >
        <Bell className="size-[18px]" />
        {unread > 0 ? (
          <span className="absolute top-0.5 right-0 grid size-4 place-items-center rounded-full bg-[image:var(--gradient-gold)] text-[9px] font-semibold text-primary-foreground sm:top-1 sm:right-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
