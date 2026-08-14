import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "grid gap-6",
        align === "center"
          ? "justify-items-center text-center"
          : "grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] md:items-end",
        className,
      )}
    >
      <div className={cn("min-w-0", align === "center" && "max-w-2xl")}>
        {eyebrow ? (
          <p className="eyebrow flex items-center gap-3">
            <span className="hairline-gold inline-block h-px w-8" aria-hidden />
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-4 font-display text-3xl leading-[1.05] tracking-tight text-balance sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Reveal>
  );
}
