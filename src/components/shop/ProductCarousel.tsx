import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { currency, type CatalogProduct } from "@/lib/catalog";
import { Rating } from "@/components/ui/Rating";

export function ProductCarousel({
  title,
  eyebrow,
  products,
}: {
  title: string;
  eyebrow?: string;
  products: CatalogProduct[];
}) {
  const trackRef = useRef<HTMLUListElement>(null);

  if (products.length === 0) return null;

  const scrollBy = (direction: 1 | -1) => {
    trackRef.current?.scrollBy({ left: direction * 340, behavior: "smooth" });
  };

  return (
    <section className="mt-20">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 className="mt-3 font-display text-2xl leading-tight sm:text-3xl">{title}</h2>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="glass grid size-10 place-items-center rounded-full transition-colors hover:text-gold"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="glass grid size-10 place-items-center rounded-full transition-colors hover:text-gold"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <ul
        ref={trackRef}
        className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <li key={product.id} className="w-[260px] shrink-0 snap-start sm:w-[300px]">
            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              className="lux-card group flex h-full flex-col"
            >
              <div className="aspect-square overflow-hidden bg-surface-2">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  width={600}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <p className="eyebrow truncate">{product.brand}</p>
                <h3 className="font-display text-base leading-snug">{product.name}</h3>
                <Rating value={product.rating} count={product.reviews} />
                <span className="mt-auto pt-2 text-sm text-gold">
                  {currency.format(product.price)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
