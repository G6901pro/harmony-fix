import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { LuxButton } from "@/components/ui/LuxButton";
import { useLanguage } from "@/lib/language";
import { useTaxonomy } from "@/lib/taxonomy";

export function Collections() {
  const { t } = useLanguage();
  const { collections, categories, fallbackCollections } = useTaxonomy();

  /**
   * Tiles come from the admin-managed collections first, then admin-managed
   * categories, and only fall back to the seeded artwork when neither exists.
   */
  const tiles = collections.length
    ? collections.map((entry, index) => ({
        key: entry.id,
        name: entry.name,
        image: entry.image ?? fallbackCollections[index % fallbackCollections.length]!.image,
        search: { category: entry.name },
      }))
    : categories.length
      ? categories.map((entry, index) => ({
          key: entry.id,
          name: entry.name,
          image: entry.image ?? fallbackCollections[index % fallbackCollections.length]!.image,
          search: { category: entry.name },
        }))
      : fallbackCollections.map((entry) => ({
          key: entry.name,
          name: entry.name,
          image: entry.image,
          search: { category: entry.name },
        }));

  return (
    <section id="collections" className="mx-auto max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32">
      <SectionHeading
        eyebrow={t("collections.eyebrow")}
        title={
          <>
            {t("collections.title1")}
            <br className="hidden sm:block" /> {t("collections.title2")}
          </>
        }
        description={t("collections.description")}
        action={
          <Link to="/shop">
            <LuxButton variant="outline">{t("collections.viewAll")}</LuxButton>
          </Link>
        }
      />

      <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile, index) => (
          <Reveal
            as="li"
            key={tile.key}
            delay={index * 80}
            className={index === 0 ? "lg:col-span-2 lg:row-span-1" : undefined}
          >
            <Link
              to="/shop"
              search={tile.search}
              className="lux-card group block h-full"
              aria-label={`${tile.name} collection`}
            >
              <div
                className={
                  index === 0
                    ? "relative aspect-[16/10] overflow-hidden lg:aspect-[16/8]"
                    : "relative aspect-[4/3] overflow-hidden"
                }
              >
                <img
                  src={tile.image}
                  alt={tile.name}
                  width={900}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                />
                <div
                  className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,oklch(0.1_0.002_264/0.92)_100%)]"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 p-6">
                  <div className="min-w-0">
                    <p className="eyebrow">{t("collections.pieces")}</p>
                    <h3 className="mt-2 truncate font-display text-xl tracking-tight sm:text-2xl">
                      {tile.name}
                    </h3>
                  </div>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-gold transition-all duration-500 group-hover:border-gold group-hover:bg-gold group-hover:text-primary-foreground">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
