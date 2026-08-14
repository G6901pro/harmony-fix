import {
  Gem,
  ShieldCheck,
  Truck,
  Banknote,
  RotateCcw,
  Headphones,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { useLanguage, type TranslationKey } from "@/lib/language";

const FEATURES: { icon: typeof Gem; title: TranslationKey; text: TranslationKey }[] = [
  { icon: Gem, title: "why.premium.title", text: "why.premium.text" },
  { icon: ShieldCheck, title: "why.checked.title", text: "why.checked.text" },
  { icon: Truck, title: "why.delivery.title", text: "why.delivery.text" },
  { icon: Banknote, title: "why.cod.title", text: "why.cod.text" },
  { icon: RotateCcw, title: "why.returns.title", text: "why.returns.text" },
  { icon: Headphones, title: "why.support.title", text: "why.support.text" },
];

export function WhyChooseUs() {
  const { t } = useLanguage();
  return (
    <section
      id="why-us"
      className="mx-auto max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32"
    >
      <SectionHeading
        align="center"
        eyebrow={t("why.eyebrow")}
        title={t("why.title")}
      />
      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <Reveal as="li" key={feature.title} delay={index * 70}>
            <div className="lux-card group flex h-full flex-col gap-5 p-8">
              <span className="grid size-14 place-items-center rounded-full border border-border bg-surface-2 text-gold transition-all duration-700 group-hover:border-gold/50 group-hover:shadow-[var(--shadow-gold)]">
                <feature.icon className="size-5" />
              </span>
              <h3 className="font-display text-xl tracking-tight">{t(feature.title)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(feature.text)}
              </p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
