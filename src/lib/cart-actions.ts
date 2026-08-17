import { toast } from "sonner";
import { shopActions } from "@/lib/shop-store";

type BaggableProduct = {
  id?: string | null;
  name?: string | null;
  stock?: number | null;
};

/**
 * Single safe entry point for "add to bag" across the storefront.
 * Clamps to available stock, explains any clamping, and never throws.
 */
export function addProductToBag(
  product: BaggableProduct | null | undefined,
  qty: unknown = 1,
  options?: { silent?: boolean; description?: string },
): boolean {
  const name = product?.name || "Item";
  try {
    if (!product?.id) {
      toast.error("This product is unavailable");
      return false;
    }
    const parsed = Number(product.stock);
    // Only an explicitly tracked quantity of 0 means sold out. Missing/unknown
    // inventory must never be defaulted to 0 — that caused false "sold out".
    const tracked = product.stock !== null && product.stock !== undefined && Number.isFinite(parsed);
    const stock = tracked ? Math.max(0, Math.floor(parsed)) : 99;
    if (tracked && stock <= 0) {
      toast.error(`${name} is sold out`);
      return false;
    }
    const result = shopActions.addToCart(product.id, qty, stock);
    if (result.added <= 0) {
      toast.error(`You already have all ${stock} available in your bag`);
      return false;
    }
    if (!options?.silent) {
      toast.success(`${result.added} × ${name} added to bag`, {
        description: result.clamped ? `Limited to ${stock} in stock` : options?.description,
      });
    }
    return true;
  } catch (error) {
    console.error("[cart] add to bag failed", error);
    toast.error("Could not add to bag. Please try again.");
    return false;
  }
}