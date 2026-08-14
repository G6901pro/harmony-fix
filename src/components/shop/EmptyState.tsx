import { PackageOpen, SearchX, SlidersHorizontal } from "lucide-react";
import { LuxButton } from "@/components/ui/LuxButton";

const ICONS = {
  search: SearchX,
  filter: SlidersHorizontal,
  empty: PackageOpen,
};

export function EmptyState({
  variant = "empty",
  title,
  description,
  actionLabel,
  onAction,
}: {
  variant?: keyof typeof ICONS;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const Icon = ICONS[variant];
  return (
    <div className="lux-card flex flex-col items-center justify-center gap-5 px-8 py-24 text-center">
      <span className="animate-lux-halo grid size-20 place-items-center rounded-full border border-gold/30 bg-surface-2/60">
        <Icon className="size-8 text-gold" aria-hidden />
      </span>
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <LuxButton variant="outline" onClick={onAction}>
          {actionLabel}
        </LuxButton>
      ) : null}
    </div>
  );
}
