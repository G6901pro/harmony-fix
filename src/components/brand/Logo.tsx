import logoAsset from "@/assets/velocita-logo.png";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/site-data";

type LogoProps = {
  className?: string;
  markClassName?: string;
  withWordmark?: boolean;
  compact?: boolean;
};

/**
 * Official store brand mark (transparent PNG cut from the supplied artwork),
 * so it sits cleanly on any surface without a visible plate.
 */
export function Logo({
  className,
  markClassName,
  withWordmark = true,
  compact = false,
}: LogoProps) {
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <img
        src={logoAsset}
        alt={`${BRAND.name} logo`}
        width={90}
        height={90}
        loading="eager"
        decoding="async"
        className={cn(
          "h-9 w-auto shrink-0 object-contain",
          markClassName,
        )}
      />
      {withWordmark ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              "font-display tracking-[0.14em] whitespace-nowrap uppercase",
              compact ? "text-sm" : "text-base sm:text-lg",
            )}
          >
            Velocita
            <span className="text-gold-gradient"> Vault</span>
          </span>
          {!compact ? (
            <span className="mt-1 text-[9px] tracking-[0.28em] whitespace-nowrap text-muted-foreground uppercase">
              Luxury Toy Maison
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
