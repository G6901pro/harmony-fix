/**
 * Saved delivery addresses.
 *
 * Persisted in the browser under `velocita_saved_addresses` so both guests and
 * signed-in customers get one-tap checkout. The first address ever saved
 * becomes the default.
 */

export type SavedAddress = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  email?: string | null;
  line1: string;
  postal_code: string;
  division: string;
  district: string;
  area: string;
  country: string;
  is_default: boolean;
  created_at: string;
};

export type SavedAddressInput = Omit<SavedAddress, "id" | "is_default" | "created_at"> &
  Partial<Pick<SavedAddress, "is_default">>;

const KEY = "velocita_saved_addresses";

function read(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as SavedAddress[]).filter((a) => a?.id) : [];
  } catch (err) {
    console.error("[addresses] could not read saved addresses", err);
    return [];
  }
}

function write(list: SavedAddress[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("velocita:addresses"));
  } catch (err) {
    console.error("[addresses] could not store saved addresses", err);
  }
}

/** Default address first, then newest. */
export function listSavedAddresses(): SavedAddress[] {
  return read().sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function getDefaultAddress(): SavedAddress | null {
  return listSavedAddresses()[0] ?? null;
}

const norm = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

/** Two addresses are the same when recipient, phone and street/area match. */
export function isSameAddress(a: SavedAddressInput, b: SavedAddress) {
  return (
    norm(a.recipient) === norm(b.recipient) &&
    norm(a.phone) === norm(b.phone) &&
    norm(a.line1) === norm(b.line1) &&
    norm(a.area) === norm(b.area) &&
    norm(a.district) === norm(b.district) &&
    norm(a.postal_code) === norm(b.postal_code)
  );
}

/**
 * Saves the address unless an identical one already exists.
 * The very first saved address is marked as default.
 */
export function saveAddress(input: SavedAddressInput): SavedAddress {
  const list = read();
  const existing = list.find((item) => isSameAddress(input, item));
  if (existing) return existing;

  const makeDefault = input.is_default ?? list.length === 0;
  const address: SavedAddress = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `addr-${Date.now()}`,
    label: input.label?.trim() || "Delivery address",
    recipient: input.recipient.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    line1: input.line1.trim(),
    postal_code: input.postal_code.trim(),
    division: input.division,
    district: input.district,
    area: input.area,
    country: input.country || "Bangladesh",
    is_default: makeDefault,
    created_at: new Date().toISOString(),
  };
  const next = makeDefault
    ? [...list.map((item) => ({ ...item, is_default: false })), address]
    : [...list, address];
  write(next);
  return address;
}

export function setDefaultAddress(id: string) {
  write(read().map((item) => ({ ...item, is_default: item.id === id })));
}

export function removeAddress(id: string) {
  const next = read().filter((item) => item.id !== id);
  // Never leave the list without a default.
  if (next.length && !next.some((item) => item.is_default)) next[0].is_default = true;
  write(next);
}

export function formatAddress(address: SavedAddress) {
  return [address.line1, address.area, address.district, address.division, address.postal_code, address.country]
    .filter(Boolean)
    .join(", ");
}
