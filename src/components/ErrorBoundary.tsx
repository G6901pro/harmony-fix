import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

type Props = {
  children: ReactNode;
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Label used when reporting the error. */
  boundary?: string;
  /** Render nothing at all when the subtree crashes (for non-critical widgets). */
  silent?: boolean;
};

type State = { error: Error | null };

/**
 * Generic React error boundary. Catches unhandled exceptions (including
 * missing/undefined props) in any subtree so a single broken widget can never
 * take down the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", this.props.boundary ?? "unknown", error, info);
    try {
      reportLovableError(error, { boundary: this.props.boundary ?? "react_error_boundary" });
    } catch {
      /* reporting must never throw */
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.silent) return null;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-background px-6 py-16">
        <div className="max-w-md text-center">
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
            Something went wrong
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            This section didn&apos;t load
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            An unexpected error occurred. You can retry, or head back to the homepage.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-full bg-primary px-5 py-2.5 text-[10px] tracking-[0.2em] text-primary-foreground uppercase"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-full border border-border px-5 py-2.5 text-[10px] tracking-[0.2em] text-foreground uppercase"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
