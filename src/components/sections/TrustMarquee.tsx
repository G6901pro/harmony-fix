import { useLanguage, type TranslationKey } from "@/lib/language";

const ITEMS: TranslationKey[] = [
  "trust.safety",
  "trust.delivery",
  "trust.returns",
  "trust.cod",
  "trust.authentic",
  "trust.support",
];

export function TrustMarquee() {
  const { t } = useLanguage();
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden border-y border-border bg-background py-5">
      <ul className="flex w-max animate-marquee items-center gap-14 pr-14">
        {row.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex shrink-0 items-center gap-14 text-[10px] tracking-[0.3em] text-muted-foreground uppercase"
          >
            {t(item)}
            <span className="size-1 rounded-full bg-gold" aria-hidden />
          </li>
        ))}
      </ul>
    </div>
  );
}
