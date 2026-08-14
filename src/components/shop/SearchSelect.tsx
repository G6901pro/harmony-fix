import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible combobox with an inline search bar. */
export function SearchSelect({
  label,
  value,
  options,
  placeholder,
  disabled,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : [...options];
  }, [options, query]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border bg-surface-2/60 px-4 py-3 text-left text-sm transition-colors",
          invalid ? "border-2 border-destructive" : "border-border focus:border-gold/60",
          disabled ? "cursor-not-allowed opacity-50" : "hover:border-gold/40",
          value ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="truncate">{value || placeholder || label}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open && !disabled ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label}`}
              className="w-full bg-transparent py-2.5 pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-muted-foreground">No matches found.</li>
            ) : null}
            {filtered.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-gold/10"
                >
                  <span className="truncate">{option}</span>
                  {option === value ? <Check className="size-3.5 text-gold" /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
