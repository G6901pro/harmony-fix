import { useEffect, useState } from "react";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { LocationSelect, emptyLocation, type BdLocation } from "@/components/address/LocationSelect";
import {
  formatAddress,
  listSavedAddresses,
  removeAddress,
  saveAddress,
  setDefaultAddress,
  type SavedAddress,
} from "@/lib/saved-addresses";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-[14px] border border-border bg-surface-2/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/60";
const goldBtn =
  "flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-gold)] py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase disabled:opacity-60";
const ghostBtn =
  "flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-[10px] font-semibold tracking-[0.24em] text-muted-foreground uppercase transition-colors hover:border-gold/50 hover:text-gold";

/** Live list of saved addresses, kept in sync across components. */
export function useSavedAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    const sync = () => setAddresses(listSavedAddresses());
    sync();
    window.addEventListener("velocita:addresses", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("velocita:addresses", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return addresses;
}

type FormState = {
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  postal_code: string;
  location: BdLocation;
};

const blank: FormState = {
  label: "Home",
  recipient: "",
  phone: "",
  line1: "",
  postal_code: "",
  location: emptyLocation,
};

export function AddressForm({
  onSaved,
  onCancel,
  makeDefault,
}: {
  onSaved?: (address: SavedAddress) => void;
  onCancel?: () => void;
  makeDefault?: boolean;
}) {
  const [form, setForm] = useState<FormState>(blank);

  return (
    <form
      className="space-y-3 rounded-[18px] border border-gold/25 bg-gold/5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const saved = saveAddress({
          label: form.label,
          recipient: form.recipient,
          phone: form.phone,
          line1: form.line1,
          postal_code: form.postal_code,
          division: form.location.division,
          district: form.location.district,
          area: form.location.area,
          country: "Bangladesh",
          is_default: makeDefault,
        });
        setForm(blank);
        onSaved?.(saved);
      }}
    >
      <input
        className={field}
        placeholder="Label (Home, Office)"
        value={form.label}
        maxLength={40}
        onChange={(e) => setForm({ ...form, label: e.target.value })}
      />
      <input
        className={field}
        placeholder="Full name *"
        value={form.recipient}
        required
        maxLength={100}
        onChange={(e) => setForm({ ...form, recipient: e.target.value })}
      />
      <input
        className={field}
        placeholder="Phone number *"
        inputMode="tel"
        value={form.phone}
        required
        maxLength={30}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <LocationSelect
        value={form.location}
        onChange={(location) => setForm({ ...form, location })}
        renderField={(key, node) => <div key={key}>{node}</div>}
      />
      <textarea
        className={cn(field, "min-h-20")}
        placeholder="Full address * (House / Road / Area)"
        value={form.line1}
        required
        onChange={(e) => setForm({ ...form, line1: e.target.value })}
      />
      <input
        className={field}
        placeholder="Postal code"
        inputMode="numeric"
        value={form.postal_code}
        maxLength={20}
        onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
      />
      <button type="submit" className={goldBtn}>
        Save address
      </button>
      {onCancel ? (
        <button type="button" className={ghostBtn} onClick={onCancel}>
          Cancel
        </button>
      ) : null}
    </form>
  );
}

export function AddressCard({
  address,
  children,
}: {
  address: SavedAddress;
  children?: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "rounded-[18px] border bg-surface-2/50 p-4",
        address.is_default ? "border-gold/45" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
          {address.label}
        </p>
        {address.is_default ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-2.5 py-1 text-[9px] tracking-[0.2em] text-gold uppercase">
            <Star className="size-3 fill-gold" aria-hidden /> Default
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-foreground">{address.recipient}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{formatAddress(address)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{address.phone}</p>
      {children}
    </li>
  );
}

/** Full manager used inside the My Account drawer. */
export function SavedAddressList() {
  const addresses = useSavedAddresses();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !adding ? (
        <div className="rounded-[18px] border border-border bg-surface-2/50 px-4 py-10 text-center">
          <MapPin className="mx-auto size-5 text-gold" aria-hidden />
          <p className="mt-3 text-xs tracking-[0.2em] text-foreground uppercase">
            No saved addresses
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Add one to speed up your next checkout.
          </p>
        </div>
      ) : null}

      {addresses.length ? (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address}>
              <div className="mt-4 flex items-center gap-2">
                {address.is_default ? null : (
                  <button
                    type="button"
                    onClick={() => setDefaultAddress(address.id)}
                    className="rounded-full border border-border px-3 py-2 text-[9px] font-semibold tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:border-gold/50 hover:text-gold"
                  >
                    Set as default
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Remove address"
                  onClick={() => removeAddress(address.id)}
                  className="ml-auto grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </AddressCard>
          ))}
        </ul>
      ) : null}

      {adding ? (
        <AddressForm onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />
      ) : (
        <button type="button" className={goldBtn} onClick={() => setAdding(true)}>
          <Plus className="size-3.5" aria-hidden /> Add new address
        </button>
      )}
    </div>
  );
}
