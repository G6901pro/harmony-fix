import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "gold" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium uppercase tracking-[0.18em] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  gold: "bg-[image:var(--gradient-gold)] text-primary-foreground shadow-[var(--shadow-gold)] hover:brightness-110 hover:shadow-[0_0_70px_-10px_var(--gold)]",
  outline:
    "border border-border text-foreground hover:border-gold/60 hover:bg-surface-2/60",
  ghost: "text-muted-foreground hover:text-gold",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[10px]",
  md: "h-11 px-6 text-[11px]",
  lg: "h-14 px-9 text-xs",
};

type LuxButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function LuxButton({
  variant = "gold",
  size = "md",
  className,
  children,
  ...props
}: LuxButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-[oklch(1_0_0/0.28)] opacity-0 transition-opacity duration-300 group-hover:animate-[lux-sheen_0.9s_ease-out] group-hover:opacity-100"
      />
    </button>
  );
}
