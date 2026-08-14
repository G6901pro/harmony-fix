import { useEffect } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export function DefaultRouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_default_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">Error</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">This page didn&apos;t load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while rendering this route.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-[10px] tracking-[0.2em] text-primary-foreground uppercase"
          >
            Try again
          </button>
          <Link
            to="/"
            className="rounded-full border border-border px-5 py-2.5 text-[10px] tracking-[0.2em] text-foreground uppercase"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DefaultRouteNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-semibold text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-[10px] tracking-[0.2em] text-primary-foreground uppercase"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
