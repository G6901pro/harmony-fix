import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
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
import { LocationSelect } from "@/components/address/LocationSelect";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account/addresses")({
  component: AddressesPage,
});

type AddressForm = {
  id?: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  area: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

const blank: AddressForm = {
  label: "Home",
  recipient: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  area: "",
  postal_code: "",
  country: "Bangladesh",
  is_default: false,
};

function AddressesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AddressForm | null>(null);

  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (value: AddressForm) => {
      if (!user) return;
      const payload = { ...value, user_id: user.id };
      if (value.is_default) {
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      }
      const { error } = value.id
        ? await supabase.from("addresses").update(payload).eq("id", value.id)
        : await supabase.from("addresses").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Address saved");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Address removed");
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="Addresses"
        title="Saved addresses"
        subtitle="Delivery destinations kept ready for a one-tap checkout."
        action={
          <button type="button" className={goldButton} onClick={() => setForm({ ...blank })}>
            <Plus className="size-4" /> Add address
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
            <Labeled label="Label">
              <input
                className={fieldClass}
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                maxLength={40}
                required
              />
            </Labeled>
            <Labeled label="Recipient">
              <input
                className={fieldClass}
                value={form.recipient}
                onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                maxLength={100}
                required
              />
            </Labeled>
            <Labeled label="Phone">
              <input
                className={fieldClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                maxLength={30}
              />
            </Labeled>
            <Labeled label="Address line 1">
              <input
                className={fieldClass}
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                maxLength={160}
                required
              />
            </Labeled>
            <Labeled label="Address line 2">
              <input
                className={fieldClass}
                value={form.line2}
                onChange={(e) => setForm({ ...form, line2: e.target.value })}
                maxLength={160}
              />
            </Labeled>
            <LocationSelect
              value={{ division: form.state, district: form.city, area: form.area }}
              required={false}
              onChange={(next) =>
                setForm({
                  ...form,
                  state: next.division,
                  city: next.district,
                  area: next.area,
                })
              }
              renderField={(key, node) => (
                <Labeled
                  key={key}
                  label={
                    key === "division"
                      ? "Division"
                      : key === "district"
                        ? "District"
                        : "Area / Upazila / Thana"
                  }
                >
                  {node}
                </Labeled>
              )}
            />
            <Labeled label="Postal code">
              <input
                className={fieldClass}
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                maxLength={20}
              />
            </Labeled>
            <Labeled label="Country">
              <input
                className={fieldClass}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                maxLength={80}
                required
              />
            </Labeled>
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
                Save address
              </button>
              <button type="button" className={ghostButton} onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {addresses.length === 0 && !form ? (
        <Empty title="No saved addresses" hint="Add one to speed up checkout." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={cn(
                "rounded-lg border bg-surface p-5",
                address.is_default ? "border-gold/40" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                    {address.label}
                  </p>
                  <p className="mt-2 text-sm">{address.recipient}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                    <br />
                    {[
                      address.area,
                      address.city,
                      address.state,
                      address.postal_code,
                      address.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {address.phone ? (
                    <p className="mt-1 text-xs text-muted-foreground">{address.phone}</p>
                  ) : null}
                </div>
                {address.is_default ? (
                  <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.2em] text-gold uppercase">
                    <Star className="size-3 fill-gold" /> Default
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: address.id,
                      label: address.label,
                      recipient: address.recipient,
                      phone: address.phone ?? "",
                      line1: address.line1,
                      line2: address.line2 ?? "",
                      city: address.city,
                      state: address.state ?? "",
                      area: address.area ?? "",
                      postal_code: address.postal_code ?? "",
                      country: address.country,
                      is_default: address.is_default,
                    })
                  }
                  className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-gold"
                  aria-label="Edit address"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(address.id)}
                  className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-destructive"
                  aria-label="Delete address"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
