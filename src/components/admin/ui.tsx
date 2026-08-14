import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { adminField, adminLabel } from "./AdminPage";

/** Shared presentational primitives for every admin module. */

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-gold/50">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{label}</p>
        {icon ? <span className="text-gold">{icon}</span> : null}
      </div>
      <p className="mt-3 font-display text-2xl tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-surface ${className}`}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg tracking-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function DataTable({
  columns,
  children,
  loading,
  empty,
  minWidth = 760,
}: {
  columns: string[];
  children: ReactNode;
  loading?: boolean;
  empty?: boolean;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-border text-left text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            {columns.map((c) => (
              <th key={c} className="px-5 py-4 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-10 text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-gold" />
              </td>
            </tr>
          ) : empty ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-10 text-center text-muted-foreground"
              >
                Nothing to show yet.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b border-border/60 last:border-0">{children}</tr>;
}

export function Cell({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <td className={`px-5 py-4 align-middle ${className}`}>{children}</td>;
}

export function Pill({
  children,
  tone = "gold",
}: {
  children: ReactNode;
  tone?: "gold" | "muted" | "danger" | "success";
}) {
  const tones: Record<string, string> = {
    gold: "border-gold/25 text-gold",
    muted: "border-border text-muted-foreground",
    danger: "border-destructive/40 text-destructive",
    success: "border-emerald-500/40 text-emerald-400",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-[9px] tracking-[0.16em] uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={adminLabel}>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${adminField} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${adminField} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${adminField} ${props.className ?? ""}`} />;
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        checked ? "border-gold/60 bg-gold/30" : "border-border bg-secondary"
      }`}
    >
      <span
        className={`absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-all ${
          checked ? "left-6 bg-gold" : "left-1 bg-muted-foreground"
        }`}
      />
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div
        className={`glass max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-border p-6 ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="font-display text-xl tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase hover:text-gold"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-4 text-xs text-destructive">{message}</p>;
}
