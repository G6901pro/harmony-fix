import { Phone, Facebook, Instagram, Youtube, Music2, Mail, MessageCircle, MapPin } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { BRAND, SOCIAL_LINKS, PAYMENT_METHODS } from "@/lib/site-data";
import { useLanguage, type TranslationKey } from "@/lib/language";

const LINKS: { title: TranslationKey; items: TranslationKey[] }[] = [
  {
    title: "footer.categories",
    items: [
      "footer.cat.rideOn",
      "footer.cat.electric",
      "footer.cat.rc",
      "footer.cat.educational",
      "footer.cat.gifts",
    ],
  },
  {
    title: "footer.quickLinks",
    items: [
      "footer.link.story",
      "footer.link.craft",
      "footer.link.new",
      "footer.link.best",
      "footer.link.gift",
    ],
  },
  {
    title: "footer.customerSupport",
    items: [
      "footer.support.shipping",
      "footer.support.returns",
      "footer.support.warranty",
      "footer.support.safety",
      "footer.support.contact",
    ],
  },
];

const SOCIAL_ICONS: Record<string, typeof Facebook> = {
  Facebook,
  Instagram,
  YouTube: Youtube,
  TikTok: Music2,
};

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto max-w-[1400px] px-5 py-20 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_2fr]">
          <div className="min-w-0">
            <Logo />
            <p className="mt-6 font-display text-base tracking-[0.16em] text-gold-soft/90 uppercase">
              {BRAND.tagline}
            </p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("footer.blurb")}
            </p>

            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-gold" />
                <a href={`mailto:${BRAND.email}`} className="transition-colors hover:text-gold">
                  {BRAND.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <MessageCircle className="size-4 shrink-0 text-gold" />
                <a
                  href={`https://wa.me/${BRAND.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gold"
                >
                  WhatsApp {BRAND.whatsappDisplay}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-gold" />
                <a href={`tel:${BRAND.phone}`} className="transition-colors hover:text-gold">
                  Call {BRAND.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="size-4 shrink-0 text-gold" />
                {BRAND.address}
              </li>
            </ul>

            <ul className="mt-8 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => {
                const Icon = SOCIAL_ICONS[social.label] ?? Instagram;
                return (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${BRAND.name} on ${social.label}`}
                      className="group relative grid size-11 place-items-center overflow-hidden rounded-full border border-border text-muted-foreground transition-all duration-500 hover:-translate-y-1 hover:border-gold/60 hover:text-gold hover:shadow-[0_10px_30px_-12px_var(--color-gold)]"
                    >
                      <span className="absolute inset-0 scale-0 rounded-full bg-gold/10 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100" />
                      <Icon className="relative size-4 transition-transform duration-500 group-hover:scale-110" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {LINKS.map((column) => (
              <nav key={column.title} aria-label={t(column.title)} className="min-w-0">
                <h3 className="eyebrow">{t(column.title)}</h3>
                <ul className="mt-5 space-y-3">
                  {column.items.map((item) => (
                    <li key={item}>
                      <a
                        href="#top"
                        className="text-sm text-muted-foreground transition-colors hover:text-gold"
                      >
                        {t(item)}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-16 border-t border-border pt-10">
          <h3 className="eyebrow">{t("footer.payments")}</h3>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PAYMENT_METHODS.map((method) => (
              <li key={method.id}>
                <div
                  className="group relative flex items-center gap-4 overflow-hidden rounded-lg border border-border bg-surface-2 px-4 py-3.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_16px_40px_-24px_var(--color-gold)]"
                  data-payment-method={method.id}
                >
                  <span
                    className="absolute inset-y-0 left-0 w-[3px] scale-y-0 transition-transform duration-500 group-hover:scale-y-100"
                    style={{ backgroundColor: method.accent }}
                    aria-hidden
                  />
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-background font-display text-sm"
                    style={{ color: method.accent }}
                    aria-hidden
                  >
                    {method.id === "cod" ? "৳" : method.label.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground transition-colors group-hover:text-gold">
                      {method.label}
                    </span>
                    <span className="block text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                      {method.note}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {BRAND.name}. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
