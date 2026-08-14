import { useSyncExternalStore } from "react";

export type ShopState = {
  wishlist: string[];
  compare: string[];
  cart: { id: string; qty: number }[];
  recentlyViewed: string[];
  savedForLater: string[];
};

const STORAGE_KEY = "vv-shop-state-v1";

const empty: ShopState = {
  wishlist: [],
  compare: [],
  cart: [],
  recentlyViewed: [],
  savedForLater: [],
};

let state: ShopState = empty;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — keep in-memory state */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ShopState>;
      state = {
        ...empty,
        ...parsed,
        wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
        compare: Array.isArray(parsed.compare) ? parsed.compare : [],
        recentlyViewed: Array.isArray(parsed.recentlyViewed) ? parsed.recentlyViewed : [],
        savedForLater: Array.isArray(parsed.savedForLater) ? parsed.savedForLater : [],
        cart: sanitizeCart(parsed.cart),
      };
    }
  } catch {
    state = empty;
  }
  emit();
}

/** Coerce anything into a safe, whole, positive quantity. */
export function safeQty(value: unknown, fallback = 1): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  const floored = Math.floor(num);
  return floored > 0 ? floored : fallback;
}

/** Clamp a requested quantity into [1, max] where max is an optional stock cap. */
export function clampQty(requested: unknown, max?: unknown): number {
  const qty = safeQty(requested, 1);
  const cap = typeof max === "number" && Number.isFinite(max) ? Math.floor(max) : undefined;
  if (cap === undefined) return Math.min(qty, MAX_LINE_QTY);
  if (cap <= 0) return 0;
  return Math.min(qty, cap, MAX_LINE_QTY);
}

/** Absolute safety valve so a corrupted value can never explode the basket. */
export const MAX_LINE_QTY = 99;

/** Drop malformed lines and normalise quantities. Never throws. */
function sanitizeCart(cart: unknown): ShopState["cart"] {
  if (!Array.isArray(cart)) return [];
  const seen = new Map<string, number>();
  for (const raw of cart) {
    if (!raw || typeof raw !== "object") continue;
    const id = (raw as { id?: unknown }).id;
    if (typeof id !== "string" || !id) continue;
    const qty = clampQty((raw as { qty?: unknown }).qty, undefined);
    if (qty <= 0) continue;
    seen.set(id, Math.min((seen.get(id) ?? 0) + qty, MAX_LINE_QTY));
  }
  return [...seen.entries()].map(([id, qty]) => ({ id, qty }));
}

function setState(next: Partial<ShopState>) {
  try {
    const merged = { ...state, ...next };
    state = { ...merged, cart: sanitizeCart(merged.cart) };
    persist();
    emit();
  } catch (error) {
    console.error("[shop-store] state update failed", error);
  }
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return empty;
}

export function useShopState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const toggleIn = (list: string[], id: string, limit?: number) => {
  if (list.includes(id)) return list.filter((item) => item !== id);
  const next = [...list, id];
  return limit ? next.slice(-limit) : next;
};

export const shopActions = {
  toggleWishlist(id: string) {
    setState({ wishlist: toggleIn(state.wishlist, id) });
  },
  toggleCompare(id: string) {
    setState({ compare: toggleIn(state.compare, id, 4) });
  },
  toggleSaveForLater(id: string) {
    setState({ savedForLater: toggleIn(state.savedForLater, id) });
  },
  /**
   * Adds to the bag, never exceeding available stock.
   * Returns what actually happened so the UI can explain any clamping.
   */
  addToCart(id: string, qty: unknown = 1, stock?: unknown) {
    try {
      if (typeof id !== "string" || !id) return { added: 0, qty: 0, clamped: false, max: 0 };
      const cap =
        typeof stock === "number" && Number.isFinite(stock)
          ? Math.max(0, Math.floor(stock))
          : MAX_LINE_QTY;
      const existing = state.cart.find((item) => item.id === id);
      const current = safeQty(existing?.qty, 0);
      const requested = current + safeQty(qty, 1);
      const next = clampQty(requested, cap);
      if (next <= 0) return { added: 0, qty: current, clamped: true, max: cap };
      const cart = existing
        ? state.cart.map((item) => (item.id === id ? { ...item, qty: next } : item))
        : [...state.cart, { id, qty: next }];
      setState({ cart });
      return { added: next - current, qty: next, clamped: next < requested, max: cap };
    } catch (error) {
      console.error("[shop-store] addToCart failed", error);
      return { added: 0, qty: 0, clamped: false, max: 0 };
    }
  },
  removeFromCart(id: string) {
    try {
      setState({ cart: state.cart.filter((item) => item.id !== id) });
    } catch (error) {
      console.error("[shop-store] removeFromCart failed", error);
    }
  },
  /** Sets an exact quantity, clamped to stock. qty <= 0 removes the line. */
  setQty(id: string, qty: unknown, stock?: unknown) {
    try {
      if (typeof id !== "string" || !id) return { qty: 0, clamped: false, max: 0 };
      const cap =
        typeof stock === "number" && Number.isFinite(stock)
          ? Math.max(0, Math.floor(stock))
          : MAX_LINE_QTY;
      const requested = safeQty(qty, 0);
      if (requested <= 0 || cap <= 0) {
        setState({ cart: state.cart.filter((item) => item.id !== id) });
        return { qty: 0, clamped: cap <= 0, max: cap };
      }
      const next = clampQty(requested, cap);
      setState({
        cart: state.cart.map((item) => (item.id === id ? { ...item, qty: next } : item)),
      });
      return { qty: next, clamped: next < requested, max: cap };
    } catch (error) {
      console.error("[shop-store] setQty failed", error);
      return { qty: 0, clamped: false, max: 0 };
    }
  },
  clearCart() {
    setState({ cart: [] });
  },
  clearCompare() {
    setState({ compare: [] });
  },
  markViewed(id: string) {
    const next = [id, ...state.recentlyViewed.filter((item) => item !== id)].slice(0, 8);
    setState({ recentlyViewed: next });
  },
};
