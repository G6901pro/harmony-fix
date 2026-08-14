import { Link } from "@tanstack/react-router";
import type { CatalogProduct } from "@/lib/catalog";
import { toHomeCard } from "@/lib/storefront-products";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { LuxButton } from "@/components/ui/LuxButton";

export function ProductGrid({
  id,
  eyebrow,
  title,
  description,
  products,
  actionLabel,
  actionTag,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  products: CatalogProduct[];
  actionLabel: string;
  /** Opens the shop already filtered to this slice of the catalogue. */
  actionTag?: "best-sellers" | "new-arrivals" | "featured" | "sale";
  className?: string;
}) {
  return (
    <section id={id} className={className}>
      <div className="mx-auto max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={
            <Link to="/shop" search={actionTag ? { tag: actionTag } : {}}>
              <LuxButton variant="outline">{actionLabel}</LuxButton>
            </Link>
          }
        />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => (
            <Reveal as="li" key={product.id} delay={index * 80} className="h-full">
              <ProductCard product={toHomeCard(product)} catalog={product} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
