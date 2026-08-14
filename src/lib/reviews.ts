import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DbReview = {
  id: string;
  user_id: string;
  product_slug: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string | null;
  admin_reply: string | null;
  status: "pending" | "approved" | "rejected" | "hidden";
  is_verified_purchase: boolean;
  created_at: string;
};

/** Order states that prove the buyer actually received the product. */
const DELIVERED_STATES = ["delivered"] as const;

/** Reviews visible on a product page (approved ones, plus the viewer's own). */
export function useProductReviews(slug: string) {
  return useQuery({
    queryKey: ["product-reviews", slug],
    queryFn: async (): Promise<DbReview[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          "id,user_id,product_slug,rating,title,body,author_name,admin_reply,status,is_verified_purchase,created_at",
        )
        .eq("product_slug", slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbReview[];
    },
  });
}

export type ReviewEligibility = {
  signedIn: boolean;
  verifiedBuyer: boolean;
  alreadyReviewed: boolean;
  canReview: boolean;
};

/** A shopper may review only a product they have received, and only once. */
export function useReviewEligibility(slug: string) {
  return useQuery({
    queryKey: ["review-eligibility", slug],
    queryFn: async (): Promise<ReviewEligibility> => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        return {
          signedIn: false,
          verifiedBuyer: false,
          alreadyReviewed: false,
          canReview: false,
        };
      }

      const [purchase, existing] = await Promise.all([
        supabase
          .from("order_items")
          .select("id, orders!inner(user_id,status)")
          .eq("product_slug", slug)
          .eq("orders.user_id", userId)
          .in("orders.status", [...DELIVERED_STATES])
          .limit(1),
        supabase
          .from("reviews")
          .select("id")
          .eq("product_slug", slug)
          .eq("user_id", userId)
          .limit(1),
      ]);

      if (purchase.error) throw purchase.error;
      if (existing.error) throw existing.error;

      const verifiedBuyer = (purchase.data ?? []).length > 0;
      const alreadyReviewed = (existing.data ?? []).length > 0;
      return {
        signedIn: true,
        verifiedBuyer,
        alreadyReviewed,
        canReview: verifiedBuyer && !alreadyReviewed,
      };
    },
  });
}

/** Shared insert: reviews publish immediately for a verified, delivered purchase. */
async function insertReview(input: { slug: string; rating: number; title: string; body: string }) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Please sign in to review this piece.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", userId)
    .maybeSingle();

  const { error } = await supabase.from("reviews").insert({
    user_id: userId,
    product_slug: input.slug,
    rating: input.rating,
    title: input.title.trim() || null,
    body: input.body.trim() || null,
    author_name: profile?.full_name || profile?.email || auth.user?.email || "Verified buyer",
    // Explicit so the insert satisfies the verified-buyer rules and publishes at once.
    status: "approved",
    is_approved: true,
    is_verified_purchase: true,
  });

  if (error) {
    if (error.code === "23505") throw new Error("You have already reviewed this product.");
    if (error.message?.toLowerCase().includes("suspended")) throw new Error(error.message);
    if (error.code === "42501")
      throw new Error("Only verified buyers of a delivered order can review this product.");
    throw new Error(error.message || "Could not post review");
  }
}

export function useSubmitReview(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; title: string; body: string }) =>
      insertReview({ ...input, slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-reviews", slug] });
      queryClient.invalidateQueries({ queryKey: ["review-eligibility", slug] });
      queryClient.invalidateQueries({ queryKey: ["reviewable-products"] });
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
  });
}

/** Same insert as useSubmitReview, but the product is chosen per submission. */
export function useSubmitReviewForProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { slug: string; rating: number; title: string; body: string }) =>
      insertReview(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-reviews", variables.slug] });
      queryClient.invalidateQueries({ queryKey: ["review-eligibility", variables.slug] });
      queryClient.invalidateQueries({ queryKey: ["reviewable-products"] });
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
  });
}



/** Products the signed-in shopper has received but not yet reviewed. */
export function useReviewableProducts() {
  return useQuery({
    queryKey: ["reviewable-products"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return [] as { slug: string; name: string; image: string | null }[];

      const [items, reviews] = await Promise.all([
        supabase
          .from("order_items")
          .select("product_slug,product_name,image_url, orders!inner(user_id,status)")
          .eq("orders.user_id", userId)
          .in("orders.status", [...DELIVERED_STATES]),
        supabase.from("reviews").select("product_slug").eq("user_id", userId),
      ]);
      if (items.error) throw items.error;
      if (reviews.error) throw reviews.error;

      const reviewed = new Set((reviews.data ?? []).map((r) => r.product_slug));
      const seen = new Map<string, { slug: string; name: string; image: string | null }>();
      for (const item of items.data ?? []) {
        if (reviewed.has(item.product_slug) || seen.has(item.product_slug)) continue;
        seen.set(item.product_slug, {
          slug: item.product_slug,
          name: item.product_name,
          image: item.image_url ?? null,
        });
      }
      return [...seen.values()];
    },
  });
}
