import { useLanguage, type Language } from "@/lib/language";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "ENG" },
  { value: "bn", label: "BAN" },
];

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-border p-0.5",
        className,
      )}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={language === option.value}
          onClick={() => setLanguage(option.value)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[9px] tracking-[0.18em] uppercase transition-colors",
            language === option.value
              ? "bg-[image:var(--gradient-gold)] text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
