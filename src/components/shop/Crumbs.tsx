import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function Crumbs({ trail }: { trail: { label: string; to?: string; params?: Record<string, string> }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        <li>
          <Link to="/" className="transition-colors hover:text-gold">
            Home
          </Link>
        </li>
        {trail.map((crumb, index) => (
          <li key={crumb.label} className="flex items-center gap-2">
            <ChevronRight className="size-3 text-muted-foreground/50" aria-hidden />
            {crumb.to && index < trail.length - 1 ? (
              <Link
                to={crumb.to as never}
                params={crumb.params as never}
                className="transition-colors hover:text-gold"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="max-w-[60vw] truncate text-foreground" aria-current="page">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
