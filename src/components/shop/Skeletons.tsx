export function ProductSkeleton({ view = "grid" }: { view?: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="lux-card grid animate-pulse grid-cols-1 gap-0 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="aspect-[4/3] bg-surface-2" />
        <div className="space-y-4 p-8">
          <div className="h-3 w-24 rounded-full bg-surface-2" />
          <div className="h-5 w-2/3 rounded-full bg-surface-2" />
          <div className="h-3 w-full rounded-full bg-surface-2" />
          <div className="h-3 w-1/2 rounded-full bg-surface-2" />
          <div className="h-9 w-40 rounded-full bg-surface-2" />
        </div>
      </div>
    );
  }
  return (
    <div className="lux-card animate-pulse">
      <div className="aspect-square bg-surface-2" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-20 rounded-full bg-surface-2" />
        <div className="h-5 w-3/4 rounded-full bg-surface-2" />
        <div className="h-3 w-full rounded-full bg-surface-2" />
        <div className="h-4 w-24 rounded-full bg-surface-2" />
      </div>
    </div>
  );
}

export function SkeletonGrid({
  count = 8,
  view = "grid",
  columns = 4,
}: {
  count?: number;
  view?: "grid" | "list";
  columns?: number;
}) {
  const cols =
    view === "list"
      ? "grid-cols-1"
      : columns === 2
        ? "sm:grid-cols-2"
        : columns === 3
          ? "sm:grid-cols-2 lg:grid-cols-3"
          : "sm:grid-cols-2 xl:grid-cols-4";
  return (
    <div className={`grid gap-5 ${cols}`} aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <ProductSkeleton key={index} view={view} />
      ))}
    </div>
  );
}
