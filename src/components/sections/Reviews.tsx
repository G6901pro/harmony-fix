import { BadgeCheck, Quote } from "lucide-react";
import { reviews } from "@/lib/site-data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Rating } from "@/components/ui/Rating";
import { useLanguage } from "@/lib/language";

export function Reviews() {
  const { t } = useLanguage();
  return (
    <section id="reviews" className="border-y border-border bg-surface/40">
      <div className="mx-auto max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32">
        <SectionHeading
          eyebrow={t("reviews.eyebrow")}
          title={t("reviews.sectionTitle")}
          description={t("reviews.sectionDescription")}
          action={
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl text-gold">4.9</span>
              <div>
                <Rating value={5} />
                <p className="mt-1 text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                  {t("reviews.count")}
                </p>
              </div>
            </div>
          }
        />
        <ul className="mt-14 grid gap-5 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <Reveal as="li" key={review.name} delay={index * 90}>
              <figure className="lux-card flex h-full flex-col gap-6 p-8">
                <Quote className="size-7 text-gold/70" aria-hidden />
                <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">
                  “{review.text}”
                </blockquote>
                <Rating value={review.rating} />
                <figcaption className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{review.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {review.role}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-gold/30 px-3 py-1 text-[9px] tracking-[0.18em] text-gold uppercase">
                    <BadgeCheck className="size-3" />
                    Verified
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
