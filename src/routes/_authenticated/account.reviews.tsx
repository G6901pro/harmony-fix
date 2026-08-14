import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Clock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PageHead,
  Panel,
  Empty,
  fieldClass,
  goldButton,
  ghostButton,
} from "@/components/account/ui";
import { formatDateTime, reviewWindow } from "@/lib/account-data";
import { getProductBySlug } from "@/lib/catalog";
import { Rating } from "@/components/ui/Rating";
import { useReviewableProducts, useSubmitReviewForProduct } from "@/lib/reviews";

export const Route = createFileRoute("/_authenticated/account/reviews")({
  component: ReviewsPage,
});

function ReviewsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ id: string; title: string; body: string; rating: number } | null>(
    null,
  );
  const [draft, setDraft] = useState<{ slug: string; title: string; body: string; rating: number } | null>(
    null,
  );

  const { data: pending = [], isLoading: pendingLoading } = useReviewableProducts();
  const submit = useSubmitReviewForProduct();


  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["my-reviews"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", session.user?.id ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (value: { id: string; title: string; body: string; rating: number }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ title: value.title, body: value.body, rating: value.rating })
        .eq("id", value.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review updated");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
    onError: () => toast.error("The 24-hour editing window has closed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review deleted");
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
    onError: () => toast.error("The 24-hour deletion window has closed"),
  });

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="My reviews"
        title="Reviews you've written"
        subtitle="Reviews publish instantly and can be edited or deleted only within 24 hours of posting."
      />

      <section className="space-y-4">
        <h2 className="text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
          Waiting for your review
        </h2>
        {pendingLoading ? (
          <Empty title="Loading delivered products…" />
        ) : pending.length === 0 ? (
          <Empty
            title="Nothing waiting"
            hint="Delivered products you haven't reviewed yet appear here."
          />
        ) : (
          <div className="space-y-4">
            {pending.map((item) => {
              const isDrafting = draft?.slug === item.slug;
              return (
                <Panel key={item.slug}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          className="size-16 rounded-[12px] border border-border object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="font-display text-lg">{item.name}</p>
                        <span className="mt-1 inline-flex items-center gap-1.5 text-[9px] tracking-[0.2em] text-gold uppercase">
                          <BadgeCheck className="size-3" /> Verified purchase
                        </span>
                      </div>
                    </div>
                    {!isDrafting ? (
                      <button
                        type="button"
                        className={goldButton}
                        onClick={() => setDraft({ slug: item.slug, title: "", body: "", rating: 5 })}
                      >
                        Write a review
                      </button>
                    ) : null}
                  </div>

                  {isDrafting && draft ? (
                    <form
                      className="mt-5 space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submit.mutate(draft, {
                          onSuccess: () => {
                            setDraft(null);
                            toast.success("Review published — thank you!");
                          },
                          onError: (error) =>
                            toast.error(
                              error instanceof Error ? error.message : "Could not post review",
                            ),
                        });
                      }}
                    >
                      <select
                        className={fieldClass}
                        value={draft.rating}
                        onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} star{n > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                      <input
                        className={fieldClass}
                        value={draft.title}
                        maxLength={120}
                        placeholder="Title"
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      />
                      <textarea
                        className={`${fieldClass} min-h-28`}
                        value={draft.body}
                        maxLength={1000}
                        required
                        placeholder="Tell other shoppers what you think"
                        onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                      />
                      <div className="flex gap-3">
                        <button type="submit" disabled={submit.isPending} className={goldButton}>
                          {submit.isPending ? "Publishing…" : "Publish review"}
                        </button>
                        <button type="button" className={ghostButton} onClick={() => setDraft(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                </Panel>
              );
            })}
          </div>
        )}
      </section>

      <h2 className="text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
        Reviews you've submitted
      </h2>

      {isLoading ? (
        <Empty title="Loading reviews…" />
      ) : reviews.length === 0 ? (
        <Empty title="No reviews yet" hint="Share your impressions after your first delivery." />
      ) : (

        <div className="space-y-4">
          {reviews.map((review) => {
            const window = reviewWindow(review.created_at);
            const product = getProductBySlug(review.product_slug);
            const isEditing = editing?.id === review.id;
            return (
              <Panel key={review.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    {product ? (
                      <Link
                        to="/product/$slug"
                        params={{ slug: product.slug }}
                        className="font-display text-lg hover:text-gold"
                      >
                        {product.name}
                      </Link>
                    ) : (
                      <p className="font-display text-lg">{review.product_slug}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <Rating value={review.rating} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(review.created_at)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] tracking-[0.2em] uppercase ${
                      window.editable ? "border-gold/50 text-gold" : "border-border text-muted-foreground"
                    }`}
                  >
                    <Clock className="size-3" /> {window.label}
                  </span>
                </div>

                {isEditing ? (
                  <form
                    className="mt-5 space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      update.mutate(editing);
                    }}
                  >
                    <select
                      className={fieldClass}
                      value={editing.rating}
                      onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} star{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      className={fieldClass}
                      value={editing.title}
                      maxLength={120}
                      onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                      placeholder="Title"
                    />
                    <textarea
                      className={`${fieldClass} min-h-28`}
                      value={editing.body}
                      maxLength={1000}
                      onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                    />
                    <div className="flex gap-3">
                      <button type="submit" className={goldButton}>
                        Save review
                      </button>
                      <button type="button" className={ghostButton} onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {review.title ? <p className="mt-4 text-sm">{review.title}</p> : null}
                    <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        disabled={!window.editable}
                        onClick={() =>
                          setEditing({
                            id: review.id,
                            title: review.title ?? "",
                            body: review.body ?? "",
                            rating: review.rating,
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[10px] tracking-[0.2em] uppercase hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        disabled={!window.editable}
                        onClick={() => remove.mutate(review.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[10px] tracking-[0.2em] uppercase hover:border-destructive/60 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
