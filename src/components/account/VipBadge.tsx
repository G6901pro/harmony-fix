import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small gold VIP chip used on profiles and review authors. */
export function VipBadge({
  label = "VIP",
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      title={`${label} member`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/10 text-[9px] font-semibold tracking-[0.2em] text-gold uppercase",
        compact ? "px-2 py-0.5" : "px-3 py-1",
        className,
      )}
    >
      <Crown className={compact ? "size-3" : "size-3.5"} />
      {label}
    </span>
  );
}
