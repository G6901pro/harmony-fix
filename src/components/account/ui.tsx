import type { ReactNode } from "react";

export function PageHead({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 p-12 text-center">
      <p className="font-display text-lg">{title}</p>
      {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export const fieldClass =
  "w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

export const goldButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-6 py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase transition-all hover:brightness-110 disabled:opacity-60";

export const ghostButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-colors hover:border-gold/60 hover:text-gold";

export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
