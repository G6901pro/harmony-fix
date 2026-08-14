import { createFileRoute } from "@tanstack/react-router";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { TrustMarquee } from "@/components/sections/TrustMarquee";
import { Collections } from "@/components/sections/Collections";
import { ProductGrid } from "@/components/sections/ProductGrid";
import { ShopByAge } from "@/components/sections/ShopByAge";
import { WhyChooseUs } from "@/components/sections/WhyChooseUs";
import { Reviews } from "@/components/sections/Reviews";
import { VideoShowcase } from "@/components/sections/VideoShowcase";
import { BrandStory } from "@/components/sections/BrandStory";
import { InstagramGallery } from "@/components/sections/InstagramGallery";
import { Newsletter } from "@/components/sections/Newsletter";
import { BRAND } from "@/lib/site-data";
import { useStorefrontProducts } from "@/lib/storefront-products";
import { useLanguage } from "@/lib/language";

const TITLE = "Velocita Vault — Luxury Toys, Ride-On Cars & Premium Gifts";
const DESCRIPTION =
  "Velocita Vault curates ultra-premium toys: ride-on and electric cars, RC machines, educational sets and heirloom gifts. Behind products, Building family.";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Store",
          name: BRAND.name,
          slogan: BRAND.tagline,
          description: DESCRIPTION,
          email: BRAND.email,
          telephone: BRAND.phone,
          address: { "@type": "PostalAddress", streetAddress: BRAND.address },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            reviewCount: "2481",
          },
        }),
      },
    ],
  }),
});

function Home() {
  const { t } = useLanguage();
  const { products } = useStorefrontProducts();
  const flagged = products.filter((p) => p.isBestSeller || p.isFeatured);
  const bestSellers = (flagged.length ? flagged : products).slice(0, 8);
  const fresh = [...products]
    .filter((p) => p.isNew || p.isFeatured)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const newArrivals = (fresh.length ? fresh : [...products].reverse())
    .slice(0, 8);
  return (
    <>
      <BrandLoader />
      <Header />
      <main>
        <Hero />
        <TrustMarquee />
        <Collections />
        <ProductGrid
          id="best-sellers"
          eyebrow={t("grid.bestSellers.eyebrow")}
          title={t("grid.bestSellers.title")}
          description={t("grid.bestSellers.description")}
          products={bestSellers}
          actionLabel={t("grid.bestSellers.action")}
          actionTag="best-sellers"
        />
        <ShopByAge />
        <ProductGrid
          id="new-arrivals"
          eyebrow={t("grid.newArrivals.eyebrow")}
          title={t("grid.newArrivals.title")}
          description={t("grid.newArrivals.description")}
          products={newArrivals}
          actionLabel={t("grid.newArrivals.action")}
          actionTag="new-arrivals"
        />

        <WhyChooseUs />
        <Reviews />
        <VideoShowcase />
        <BrandStory />
        <InstagramGallery />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
