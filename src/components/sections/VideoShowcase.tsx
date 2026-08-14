import { useState } from "react";
import { Play } from "lucide-react";
import poster from "@/assets/video-poster.jpg";
import { Reveal } from "@/components/ui/Reveal";
import { useLanguage } from "@/lib/language";

export function VideoShowcase() {
  const { t } = useLanguage();
  const [playing, setPlaying] = useState(false);

  return (
    <section
      id="showcase"
      className="mx-auto max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32"
    >
      <Reveal className="relative overflow-hidden rounded-lg border border-border">
        <div className="relative aspect-[16/9] w-full bg-surface">
          {playing ? (
            <iframe
              className="absolute inset-0 size-full"
              src="https://www.youtube.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0&modestbranding=1"
              title="Inside the Velocita Vault atelier"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <img
                src={poster}
                alt="The Velocita Vault showroom lit by spotlights"
                width={1920}
                height={1080}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
              <div
                className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.1_0.002_264/0.45),oklch(0.1_0.002_264/0.85))]"
                aria-hidden
              />
              <div className="absolute inset-0 grid place-items-center px-6">
                <div className="flex flex-col items-center gap-6 text-center">
                  <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    aria-label={t("showcase.play")}
                    className="group grid size-20 place-items-center rounded-full border border-gold/40 bg-[image:var(--gradient-gold)] text-primary-foreground shadow-[var(--shadow-gold)] transition-transform duration-500 hover:scale-110 sm:size-24"
                  >
                    <Play className="size-7 translate-x-0.5 fill-current" />
                  </button>
                  <div>
                    <p className="eyebrow">{t("showcase.eyebrow")}</p>
                    <h2 className="mt-3 font-display text-2xl tracking-tight text-balance sm:text-4xl">
                      {t("showcase.title")}
                    </h2>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Reveal>
    </section>
  );
}
