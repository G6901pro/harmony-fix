import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ChevronDown, Headphones, MessageCircle, Phone, Sparkles, X } from "lucide-react";

import { BRAND } from "@/lib/site-data";
import { cn } from "@/lib/utils";
import { AiAssistantWidget } from "./AiAssistantWidget";

const MESSENGER_URL = "https://www.facebook.com/profile.php?id=61592407300071";
const WHATSAPP_URL = `https://wa.me/${BRAND.whatsapp}`;
const VISIBILITY_KEY = "vv:support-controls-visible";

/** Official WhatsApp glyph — Lucide has no brand mark for it. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.33 4.97L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.13h-.004a8.2 8.2 0 0 1-4.18-1.145l-.3-.178-3.11.816.83-3.037-.195-.312a8.17 8.17 0 0 1-1.25-4.364c0-4.53 3.69-8.22 8.23-8.22a8.17 8.17 0 0 1 5.81 2.41 8.16 8.16 0 0 1 2.41 5.82c0 4.54-3.69 8.21-8.24 8.21Z" />
    </svg>
  );
}

type ChannelProps = {
  href: string;
  label: string;
  meta: string;
  tone: "messenger" | "whatsapp";
  children: React.ReactNode;
};

function ChannelCard({ href, label, meta, tone, children }: ChannelProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-4 rounded-lg p-4 shadow-lg transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        tone === "messenger"
          ? "bg-gradient-messenger text-messenger-foreground"
          : "bg-gradient-whatsapp text-whatsapp-foreground",
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-background/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
        {children}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg leading-tight tracking-tight">{label}</span>
        <span className="block truncate text-xs opacity-85">{meta}</span>
      </span>
    </a>
  );
}

export function SupportWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCheckout = pathname.startsWith("/checkout");
  const [open, setOpen] = useState(false);
  const autoExpanded = useRef(false);
  // Visible by default; the choice is remembered on this device only.
  const [visible, setVisible] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(VISIBILITY_KEY) !== "hidden");
    } catch {
      /* storage unavailable — keep the default */
    }
    setHydrated(true);
  }, []);

  const setVisibility = (next: boolean) => {
    setVisible(next);
    if (!next) setOpen(false);
    try {
      window.localStorage.setItem(VISIBILITY_KEY, next ? "visible" : "hidden");
    } catch {
      /* ignore */
    }
  };

  // Checkout is the highest-intent moment: keep the drawer expanded there.
  useEffect(() => {
    if (isCheckout && !autoExpanded.current) {
      autoExpanded.current = true;
      if (visible) setOpen(true);
    }
    if (!isCheckout) autoExpanded.current = false;
  }, [isCheckout, visible]);

  if (hydrated && !visible) {
    return (
      <div
        className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          type="button"
          onClick={() => setVisibility(true)}
          aria-label="Show AI chat and support"
          className="grid size-11 place-items-center rounded-full border border-border/70 bg-surface/95 text-gold shadow-xl backdrop-blur-xl transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Sparkles className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:right-6 sm:bottom-6 sm:gap-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {open ? (
        <div className="animate-support-panel-in w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border/70 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-base tracking-tight">Live Support</p>
              <p className="text-xs text-muted-foreground">
                {BRAND.name} concierge replies in minutes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close support"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <ChannelCard
              href={MESSENGER_URL}
              label="Chat on Messenger"
              meta="Facebook Messenger — instant reply"
              tone="messenger"
            >
              <MessageCircle className="size-6" strokeWidth={2.25} />
            </ChannelCard>

            <ChannelCard
              href={WHATSAPP_URL}
              label="Chat on WhatsApp"
              meta={BRAND.whatsappDisplay}
              tone="whatsapp"
            >
              <WhatsAppGlyph className="size-6" />
            </ChannelCard>

            <ChannelCard
              href={`tel:${BRAND.phone}`}
              label="Call support"
              meta={BRAND.phone}
              tone="messenger"
            >
              <Phone className="size-6" strokeWidth={2.25} />
            </ChannelCard>
          </div>
        </div>
      ) : null}

      <AiAssistantWidget />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setVisibility(false)}
          aria-label="Hide AI chat and support"
          className="grid size-9 place-items-center rounded-full border border-border/70 bg-surface/95 text-muted-foreground shadow-lg backdrop-blur-xl transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ChevronDown className="size-4" />
        </button>
        <div className="relative">
        {!open ? (
          <span className="animate-support-ping pointer-events-none absolute inset-0 rounded-full bg-primary/40" />
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close live support" : "Open live support"}
          className={cn(
            "relative flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-xl",
            "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !open && "animate-support-bounce",
          )}
        >
          {open ? <X className="size-5" /> : <Headphones className="size-5" />}
          <span className="text-[0.7rem] font-semibold tracking-[0.22em] uppercase">Support</span>
        </button>
        </div>
      </div>
    </div>
  );
}
