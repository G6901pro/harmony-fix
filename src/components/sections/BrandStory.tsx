import storyImage from "@/assets/story.jpg";
import { Reveal } from "@/components/ui/Reveal";
import { LuxButton } from "@/components/ui/LuxButton";
import { BRAND } from "@/lib/site-data";
import { useLanguage } from "@/lib/language";

export function BrandStory() {
  const { t } = useLanguage();
  return (
    <section id="story" className="border-y border-border bg-surface/40">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-5 py-24 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-32">
        <Reveal className="relative">
          <div className="overflow-hidden rounded-lg border border-border">
            <img
              src={storyImage}
              alt="A father and child playing with a premium remote control car at home"
              width={1440}
              height={1080}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105"
            />
          </div>
          <div className="glass absolute -right-2 -bottom-8 hidden max-w-[220px] rounded-lg p-6 sm:block lg:-right-10">
            <p className="font-display text-3xl text-gold">2019</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t("story.badge")}
            </p>
          </div>
        </Reveal>

        <Reveal delay={120} className="min-w-0">
          <p className="eyebrow flex items-center gap-3">
            <span className="hairline-gold inline-block h-px w-8" aria-hidden />
            {t("story.eyebrow")}
          </p>
          <h2 className="mt-5 font-display text-3xl leading-[1.05] tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {t("story.title")}
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Velocita Vault began with a simple frustration: the toys that thrilled
            children rarely survived them. So we started sourcing differently —
            working with automotive finishers, cabinet makers and safety engineers to
            build pieces that get handed down instead of thrown out.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Today the Vault serves parents, collectors and gift buyers across 30
            countries. The principle hasn't changed: obsess over the object, and the
            memory takes care of itself.
          </p>
          <p className="mt-8 font-display text-lg tracking-[0.16em] text-gold-soft/90 uppercase">
            {BRAND.tagline}
          </p>
          <div className="mt-10">
            <LuxButton variant="outline" size="lg">
              Discover the Maison
            </LuxButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
