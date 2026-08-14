import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import { LuxButton } from "@/components/ui/LuxButton";
import { BRAND } from "@/lib/site-data";
import { useLanguage } from "@/lib/language";

export function Hero() {
  const [offset, setOffset] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const scrollToCollections = () => {
    const target = document.getElementById("collections");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState(null, "", "#collections");
      }
    } else {
      void navigate({ to: "/", hash: "collections" });
    }
  };

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setOffset(window.scrollY * 0.18));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);


  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] items-center overflow-hidden"
      aria-label="Velocita Vault introduction"
    >
      <div
        className="absolute inset-0 -z-10 scale-110"
        style={{ transform: `translate3d(0, ${offset}px, 0) scale(1.1)` }}
      >
        <img
          src={heroImage}
          alt="Luxury black ride-on supercar with gold wheels under dramatic studio lighting"
          width={1920}
          height={1088}
          fetchPriority="high"
          decoding="async"
          className="size-full object-cover"
        />
        <div
          className="absolute inset-0 bg-[image:var(--gradient-veil)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.1_0.002_264/0.94)_0%,oklch(0.1_0.002_264/0.7)_38%,transparent_75%)]"
          aria-hidden
        />
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-5 pt-32 pb-24 lg:px-10">
        <div className="max-w-2xl">
          <p className="eyebrow flex items-center gap-3">
            <span className="hairline-gold inline-block h-px w-10" aria-hidden />
            {t("hero.eyebrow")}
          </p>

          <h1 className="mt-7 font-display text-[clamp(2.6rem,7vw,5.4rem)] leading-[0.96] tracking-tight text-balance">
            {t("hero.titleLine1")}
            <span className="block text-gold-gradient">{t("hero.titleLine2")}</span>
          </h1>

          <p className="mt-6 font-display text-lg tracking-[0.16em] text-gold-soft/90 uppercase sm:text-xl">
            {BRAND.tagline}
          </p>

          <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("hero.body")}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LuxButton size="lg" onClick={() => void navigate({ to: "/shop" })}>
              {t("hero.shopNow")}
              <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
            </LuxButton>
            <LuxButton size="lg" variant="outline" onClick={scrollToCollections}>
              {t("hero.exploreCollection")}
            </LuxButton>
          </div>

          <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-8">
            {[
              { k: "40+", v: t("hero.stat.partners") },
              { k: "26k", v: t("hero.stat.families") },
              { k: "4.9★", v: t("hero.stat.rating") },
            ].map((stat) => (
              <div key={stat.v}>
                <dt className="sr-only">{stat.v}</dt>
                <dd>
                  <span className="block font-display text-2xl text-gold sm:text-3xl">
                    {stat.k}
                  </span>
                  <span className="mt-1 block text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                    {stat.v}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToCollections}
        aria-label={t("hero.scroll")}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-muted-foreground transition-colors hover:text-gold md:block"
      >
        <ChevronDown className="size-6 animate-bounce" />
      </button>

    </section>
  );
}
