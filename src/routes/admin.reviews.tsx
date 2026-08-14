import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, dangerButton, ghostButton, goldButton } from "@/components/admin/AdminPage";
import {
  Cell,
  DataTable,
  ErrorText,
  Field,
  Modal,
  Pill,
  Row,
  Select,
  StatCard,
  TextArea,
} from "@/components/admin/ui";
import { dateTime, logActivity, useTable, type ReviewRow } from "@/lib/admin/db";

export const Route = createFileRoute("/admin/reviews")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reviews · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="reviews"
      eyebrow="Community"
      title="Review moderation"
      description="Approve, hide, reply to and remove customer reviews across the catalogue."
    >
      <ReviewsModule />
    </AdminPage>
  ),
});

function ReviewsModule() {
  const { rows, loading, error, setError, reload } = useTable<ReviewRow>("reviews");
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<ReviewRow | null>(null);
  const [reply, setReply] = useState("");

  const visible = useMemo(
    () => rows.filter((r) => (filter === "all" ? true : r.status === filter)),
    [rows, filter],
  );

  const average = rows.length
    ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1)
    : "—";

  async function setStatus(review: ReviewRow, status: ReviewRow["status"]) {
    const { error: err } = await supabase.from("reviews").update({ status }).eq("id", review.id);
    if (err) return setError(err.message);
    void logActivity(`review.${status}`, "reviews", review.id);
    void reload();
  }

  async function saveReply() {
    if (!active) return;
    const { error: err } = await supabase
      .from("reviews")
      .update({ admin_reply: reply || null, replied_at: reply ? new Date().toISOString() : null })
      .eq("id", active.id);
    if (err) return setError(err.message);
    void logActivity("review.reply", "reviews", active.id);
    setActive(null);
    setReply("");
    void reload();
  }

  async function remove(review: ReviewRow) {
    if (!window.confirm("Delete this review permanently?")) return;
    const { error: err } = await supabase.from("reviews").delete().eq("id", review.id);
    if (err) return setError(err.message);
    void logActivity("review.delete", "reviews", review.id);
    void reload();
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total reviews" value={rows.length} />
        <StatCard
          label="Awaiting moderation"
          value={rows.filter((r) => r.status === "pending").length}
        />
        <StatCard label="Average rating" value={average} icon={<Star className="size-4" />} />
      </div>

      <div className="mt-6 max-w-xs">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter reviews">
          <option value="all">All reviews</option>
          <option value="pending">Awaiting approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="hidden">Hidden</option>
        </Select>
      </div>

      <ErrorText message={error} />

      <div className="mt-6">
        <DataTable
          columns={["Review", "Product", "Rating", "Posted", "Status", "Actions"]}
          loading={loading}
          empty={visible.length === 0}
          minWidth={980}
        >
          {visible.map((r) => (
            <Row key={r.id}>
              <Cell>
                <p className="font-medium text-foreground">{r.title ?? "Untitled"}</p>
                <p className="max-w-md truncate text-xs text-muted-foreground">{r.body ?? "—"}</p>
                <p className="mt-1 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  {r.author_name ?? "Anonymous"}
                  {r.admin_reply ? " · replied" : ""}
                </p>
              </Cell>
              <Cell className="text-xs text-muted-foreground">/{r.product_slug}</Cell>
              <Cell className="text-gold">{"★".repeat(r.rating)}</Cell>
              <Cell className="text-xs text-muted-foreground">{dateTime(r.created_at)}</Cell>
              <Cell>
                <Pill
                  tone={
                    r.status === "approved"
                      ? "success"
                      : r.status === "rejected"
                        ? "danger"
                        : "muted"
                  }
                >
                  {r.status === "approved"
                    ? "Live"
                    : r.status === "rejected"
                      ? "Rejected"
                      : r.status === "hidden"
                        ? "Hidden"
                        : "Pending"}
                </Pill>
                {r.is_verified_purchase ? (
                  <span className="mt-1 block text-[10px] tracking-[0.16em] text-gold uppercase">
                    Verified purchase
                  </span>
                ) : null}
              </Cell>
              <Cell>
                <div className="flex flex-wrap justify-end gap-2">
                  {r.status !== "approved" ? (
                    <button
                      type="button"
                      className={ghostButton}
                      onClick={() => void setStatus(r, "approved")}
                    >
                      Approve
                    </button>
                  ) : null}
                  {r.status !== "rejected" ? (
                    <button
                      type="button"
                      className={ghostButton}
                      onClick={() => void setStatus(r, "rejected")}
                    >
                      Reject
                    </button>
                  ) : null}
                  {r.status !== "hidden" ? (
                    <button
                      type="button"
                      className={ghostButton}
                      onClick={() => void setStatus(r, "hidden")}
                    >
                      Hide
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={ghostButton}
                    onClick={() => {
                      setActive(r);
                      setReply(r.admin_reply ?? "");
                    }}
                  >
                    Reply
                  </button>
                  <button type="button" className={dangerButton} onClick={() => void remove(r)}>
                    Delete
                  </button>
                </div>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>

      <Modal open={!!active} onClose={() => setActive(null)} title="Reply to review">
        {active ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
              {active.body ?? "—"}
            </p>
            <Field label="Public reply from Velocita Vault">
              <TextArea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-3">
              <button type="button" className={ghostButton} onClick={() => setActive(null)}>
                Cancel
              </button>
              <button type="button" className={goldButton} onClick={() => void saveReply()}>
                Save reply
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
