import { useEffect, useState } from "react";
import logoAsset from "@/assets/velocita-logo.png";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/site-data";

const FADE_MS = 400;
const MIN_VISIBLE_MS = 300;
const MAX_VISIBLE_MS = 800;

/**
 * Premium branded loading screen: the official logo, perfectly static and
 * centered on matte black, with only an ambient gold glow animating.
 * Fades in, fades out, and never blocks the page once loading is done.
 */
export function BrandLoader({ active }: { active?: boolean }) {
  const controlled = active !== undefined;
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Uncontrolled (initial page load): hide as soon as the page is
  // interactive, bounded by a hard max so it can never loop forever.
  useEffect(() => {
    if (controlled) return;
    const start = performance.now();
    let minTimer: ReturnType<typeof setTimeout>;

    const finish = () => {
      const elapsed = performance.now() - start;
      minTimer = setTimeout(
        () => setDone(true),
        Math.max(0, MIN_VISIBLE_MS - elapsed),
      );
    };

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    const maxTimer = setTimeout(() => setDone(true), MAX_VISIBLE_MS);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      window.removeEventListener("load", finish);
    };
  }, [controlled]);

  const visible = controlled ? active : !done;

  // Unmount fully after the fade-out so it can never intercept clicks.
  useEffect(() => {
    if (visible) {
      setHidden(false);
      return;
    }
    const timer = setTimeout(() => setHidden(true), FADE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${BRAND.name}`}
      className={cn(
        "fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:animate-[lux-fade-in_320ms_ease-out]",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="relative grid place-items-center">
        {/* Soft circular ambient light — the only moving element */}
        <span
          aria-hidden
          className="pointer-events-none absolute h-[22rem] w-[22rem] rounded-full animate-lux-halo"
          style={{
            background:
              "radial-gradient(circle, oklch(0.82 0.12 88 / 0.28) 0%, oklch(0.82 0.12 88 / 0.08) 45%, transparent 70%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute h-40 w-40 rounded-full border border-[oklch(0.82_0.12_88_/_0.18)] animate-lux-ring sm:h-48 sm:w-48"
        />
        <img
          src={logoAsset}
          alt={`${BRAND.name} logo`}
          width={220}
          height={124}
          decoding="async"
          fetchPriority="high"
          className="relative h-24 w-auto object-contain animate-lux-glow sm:h-28"
        />
      </div>
    </div>
  );
}
