import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { LuxButton } from "@/components/ui/LuxButton";
import { useLanguage } from "@/lib/language";

export function Newsletter() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;
    setDone(true);
    setEmail("");
  };

  return (
    <section id="newsletter" className="px-5 pb-24 lg:px-10 lg:pb-32">
      <Reveal className="mx-auto max-w-[1400px]">
        <div className="relative overflow-hidden rounded-lg border border-border bg-surface px-6 py-16 text-center sm:px-12 lg:py-24">
          <div
            className="absolute inset-x-0 -top-40 mx-auto size-[520px] rounded-full bg-[radial-gradient(circle,oklch(0.82_0.12_88/0.18),transparent_65%)] blur-2xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl">
            <p className="eyebrow">{t("newsletter.eyebrow")}</p>
            <h2 className="mt-5 font-display text-3xl leading-[1.05] tracking-tight text-balance sm:text-4xl lg:text-5xl">
              {t("newsletter.title")}
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("newsletter.description")}
            </p>

            <form
              onSubmit={onSubmit}
              className="mx-auto mt-10 grid max-w-lg gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                {t("newsletter.emailLabel")}
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your@email.com"
                className="h-14 min-w-0 rounded-full border border-input bg-background px-6 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none"
              />
              <LuxButton type="submit" size="lg">
                {t("newsletter.subscribe")}
              </LuxButton>
            </form>

            <p
              aria-live="polite"
              className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"
            >
              {done ? (
                <>
                  <Check className="size-4 text-gold" /> {t("newsletter.done")}
                </>
              ) : (
                t("newsletter.privacy")
              )}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
