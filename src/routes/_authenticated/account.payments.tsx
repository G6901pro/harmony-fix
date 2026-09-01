import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  PageHead,
  Panel,
  Empty,
  Labeled,
  fieldClass,
  goldButton,
  ghostButton,
} from "@/components/account/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account/payments")({
  component: PaymentsPage,
});

type MethodKind = "card" | "mobile" | "bank";

type MethodForm = {
  kind: MethodKind;
  label: string;
  brand: string;
  /** Card: last 4 of PAN. Mobile: last 4 of wallet number. Bank: last 4 of account. */
  last4: string;
  holder_name: string;
  exp_month: string;
  exp_year: string;
  is_default: boolean;
};

const blank: MethodForm = {
  kind: "card",
  label: "Personal card",
  brand: "Visa",
  last4: "",
  holder_name: "",
  exp_month: "",
  exp_year: "",
  is_default: false,
};

const KIND_PRESETS: Record<MethodKind, { label: string; brand: string }> = {
  card: { label: "Personal card", brand: "Visa" },
  mobile: { label: "bKash wallet", brand: "bKash" },
  bank: { label: "Bank transfer", brand: "" },
};

const MOBILE_PROVIDERS = ["bKash", "Nagad", "Rocket", "Upay"];
const CARD_BRANDS = ["Visa", "Mastercard", "American Express", "UnionPay"];


function PaymentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<typeof blank | null>(null);

  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (value: typeof blank) => {
      if (!user) return;
      if (value.is_default) {
        await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
      }
      const { error } = await supabase.from("payment_methods").insert({
        user_id: user.id,
        kind: value.kind,
        label: value.label,
        brand: value.brand,
        last4: value.last4.slice(-4),
        holder_name: value.holder_name,
        exp_month: value.exp_month ? Number(value.exp_month) : null,
        exp_year: value.exp_year ? Number(value.exp_year) : null,
        is_default: value.is_default,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment method saved");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment method removed");
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="Payments"
        title="Saved payment methods"
        subtitle="Only the last four digits are ever stored — never a full card number."
        action={
          <button type="button" className={goldButton} onClick={() => setForm({ ...blank })}>
            <Plus className="size-4" /> Add method
          </button>
        }
      />

      {form ? (
        <Panel>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
          >
            <Labeled label="Type">
              <select
                className={fieldClass}
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                <option value="card">Card</option>
                <option value="mobile">Mobile wallet</option>
                <option value="bank">Bank transfer</option>
              </select>
            </Labeled>
            <Labeled label="Label">
              <input
                className={fieldClass}
                value={form.label}
                maxLength={40}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
              />
            </Labeled>
            <Labeled label="Brand / Provider">
              <input
                className={fieldClass}
                value={form.brand}
                maxLength={40}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </Labeled>
            <Labeled label="Last 4 digits">
              <input
                className={fieldClass}
                value={form.last4}
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, "") })}
                required
              />
            </Labeled>
            <Labeled label="Holder name">
              <input
                className={fieldClass}
                value={form.holder_name}
                maxLength={100}
                onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
              />
            </Labeled>
            <div className="grid grid-cols-2 gap-4">
              <Labeled label="Exp month">
                <input
                  className={fieldClass}
                  value={form.exp_month}
                  inputMode="numeric"
                  maxLength={2}
                  onChange={(e) => setForm({ ...form, exp_month: e.target.value.replace(/\D/g, "") })}
                />
              </Labeled>
              <Labeled label="Exp year">
                <input
                  className={fieldClass}
                  value={form.exp_year}
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(e) => setForm({ ...form, exp_year: e.target.value.replace(/\D/g, "") })}
                />
              </Labeled>
            </div>
            <label className="flex items-center gap-3 self-end pb-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="size-4 accent-[oklch(0.82_0.12_88)]"
              />
              Set as default
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" className={goldButton} disabled={save.isPending}>
                Save method
              </button>
              <button type="button" className={ghostButton} onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {methods.length === 0 && !form ? (
        <Empty title="No saved payment methods" hint="Add one for faster checkout." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {methods.map((method) => (
            <div
              key={method.id}
              className={cn(
                "relative overflow-hidden rounded-lg border bg-surface p-6",
                method.is_default ? "border-gold/40" : "border-border",
              )}
            >
              <div className="flex items-start justify-between">
                <CreditCard className="size-6 text-gold" />
                {method.is_default ? (
                  <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.2em] text-gold uppercase">
                    <Star className="size-3 fill-gold" /> Default
                  </span>
                ) : null}
              </div>
              <p className="mt-6 font-display text-xl tracking-[0.2em]">•••• {method.last4}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {method.brand} · {method.label}
                {method.exp_month && method.exp_year
                  ? ` · ${String(method.exp_month).padStart(2, "0")}/${method.exp_year}`
                  : ""}
              </p>
              {method.holder_name ? (
                <p className="mt-1 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  {method.holder_name}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => remove.mutate(method.id)}
                aria-label="Remove payment method"
                className="mt-5 grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
