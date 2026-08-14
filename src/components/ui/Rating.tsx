import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  count,
  className,
}: {
  value: number;
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              "size-3.5",
              index < Math.round(value)
                ? "fill-gold text-gold"
                : "text-muted-foreground/40",
            )}
          />
        ))}
      </span>
      <span className="sr-only">{value} out of 5 stars</span>
      {count !== undefined ? (
        <span className="text-xs text-muted-foreground">({count})</span>
      ) : null}
    </div>
  );
}
