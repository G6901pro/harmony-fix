import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, Empty, goldButton } from "@/components/account/ui";
import { getProductBySlug, currency } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/account/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, product_slug, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed from wishlist");
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="Wishlist"
        title="Saved pieces"
        subtitle="Everything you've set aside, kept safe against your account."
      />

      {isLoading ? (
        <Empty title="Loading wishlist…" />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface/50 p-12 text-center">
          <p className="text-sm font-semibold tracking-[0.2em] text-foreground uppercase">
            Your wishlist is empty
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing selected — tap the heart on any product to keep it here.
          </p>
          <Link to="/shop" className={`${goldButton} mt-6`}>
            Shop now
          </Link>
        </div>


      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const product = getProductBySlug(item.product_slug);
            return (
              <div key={item.id} className="lux-card p-4">
                {product ? (
                  <Link to="/product/$slug" params={{ slug: product.slug }}>
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  </Link>
                ) : (
                  <div className="grid aspect-square w-full place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    Unavailable
                  </div>
                )}
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{product?.name ?? item.product_slug}</p>
                    {product ? (
                      <p className="mt-1 font-display text-gold">
                        {currency.format(product.price)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove from wishlist"
                    onClick={() => remove.mutate(item.id)}
                    className="grid size-9 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
