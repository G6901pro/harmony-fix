import { Instagram as InstagramIcon } from "lucide-react";
import { instagram } from "@/lib/site-data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { useLanguage } from "@/lib/language";

export function InstagramGallery() {
  const { t } = useLanguage();
  return (
    <section
      id="instagram"
      className="mx-auto max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32"
    >
      <SectionHeading
        align="center"
        eyebrow="@velocitavault"
        title={t("instagram.title")}
        description={t("instagram.description")}
      />
      <ul className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {instagram.map((image, index) => (
          <Reveal as="li" key={index} delay={index * 60}>
            <a
              href="#instagram"
              aria-label={`Open Instagram post ${index + 1}`}
              className="group relative block aspect-square overflow-hidden rounded-md border border-border"
            >
              <img
                src={image}
                alt={`Velocita Vault Instagram post ${index + 1}`}
                width={900}
                height={900}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
              />
              <span className="absolute inset-0 grid place-items-center bg-background/70 opacity-0 backdrop-blur-[2px] transition-opacity duration-500 group-hover:opacity-100">
                <InstagramIcon className="size-5 text-gold" />
              </span>
            </a>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
