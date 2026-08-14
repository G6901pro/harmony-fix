import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to live order changes and re-run the supplied loader whenever a
 * row in `orders` (or `order_items`) is inserted, updated or deleted.
 * The loader is kept in a ref so callers can pass an inline function.
 */
export function useOrdersRealtime(reload: () => void | Promise<void>, channelName = "admin-orders") {
  const handler = useRef(reload);
  handler.current = reload;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ping = () => {
      if (timer) clearTimeout(timer);
      // Debounce so a burst of row events triggers a single refresh.
      timer = setTimeout(() => void handler.current(), 250);
    };

    const channel = supabase
      .channel(`${channelName}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, ping)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [channelName]);
}
