import { Link } from "@tanstack/react-router";
import { ageGroups } from "@/lib/site-data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { useLanguage } from "@/lib/language";

export function ShopByAge() {
  const { t } = useLanguage();
  return (
    <section id="shop-by-age" className="border-y border-border bg-surface/40">
      <div className="mx-auto max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32">
        <SectionHeading
          align="center"
          eyebrow={t("age.eyebrow")}
          title={t("age.title")}
          description={t("age.description")}
        />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ageGroups.map((group, index) => (
            <Reveal as="li" key={group.range} delay={index * 70}>
              <Link
                to="/shop"
                search={{ age: group.range }}
                className="lux-card group flex h-full flex-col items-center gap-3 px-6 py-10 text-center"
              >
                <span className="font-display text-4xl tracking-tight transition-colors duration-500 group-hover:text-gold-gradient">
                  {group.range}
                </span>
                <span className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">
                  {t("age.years")}
                </span>
                <span className="mt-3 text-sm text-foreground/90">{group.label}</span>
                <span className="text-xs text-muted-foreground">
                  {group.items} {t("age.pieces")}
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
