import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { QuickView } from "@/components/shop/QuickView";

type QuickViewContextValue = {
  open: (product: CatalogProduct) => void;
  close: () => void;
  product: CatalogProduct | null;
};

const QuickViewContext = createContext<QuickViewContextValue | null>(null);

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);

  const open = useCallback((next: CatalogProduct) => setProduct(next), []);
  const close = useCallback(() => setProduct(null), []);

  const value = useMemo(() => ({ open, close, product }), [open, close, product]);

  return (
    <QuickViewContext.Provider value={value}>
      {children}
      <QuickView product={product} onClose={close} onOpen={open} />
    </QuickViewContext.Provider>
  );
}

export function useQuickView() {
  const context = useContext(QuickViewContext);
  if (!context) {
    // Safe no-op outside the provider (e.g. isolated component tests).
    return { open: () => {}, close: () => {}, product: null } as QuickViewContextValue;
  }
  return context;
}
