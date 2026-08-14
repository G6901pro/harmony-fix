import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import "../styles.css";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BrandLoader } from "../components/brand/BrandLoader";
import { Toaster } from "../components/ui/sonner";
import { QuickViewProvider } from "../lib/quick-view";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { MockAuthProvider } from "@/lib/mock-auth";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/language";


import { AuthModal } from "../components/auth/AuthModal";
import { SupportWidget } from "../components/support/SupportWidget";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Velocita Vault — Luxury Toys & Premium Gifts" },
      {
        name: "description",
        content:
          "Ultra-premium luxury toys, ride-on cars and heirloom gifts. Behind products, Building family.",
      },
      { name: "author", content: "Velocita Vault" },
      { name: "theme-color", content: "#0B0B0B" },
      { property: "og:site_name", content: "Velocita Vault" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500;6..96,600&family=Inter+Tight:wght@300;400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isNavigating = useRouterState({
    select: (state) => state.status === "pending",
  });
  // Only surface the loader when a transition genuinely needs time.
  // Instant (already-loaded) routes never flash it.
  const [showTransitionLoader, setShowTransitionLoader] = useState(false);

  // Capture failed database queries / API calls for the owner's logs console.
  useEffect(() => {
    void import("../lib/admin/db-error-log").then((m) => m.installDbErrorLogger());
  }, []);



  useEffect(() => {
    if (!isNavigating) {
      setShowTransitionLoader(false);
      return;
    }
    const timer = setTimeout(() => setShowTransitionLoader(true), 250);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Branded loader for slow route transitions only */}
      {showTransitionLoader ? <BrandLoader active /> : null}
      <LanguageProvider>
        <AuthProvider>
          <MockAuthProvider>
            <QuickViewProvider>
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <ErrorBoundary boundary="root_outlet">
                <Outlet />
              </ErrorBoundary>
            </QuickViewProvider>
            <ErrorBoundary boundary="auth_modal" silent>
              <AuthModal />
            </ErrorBoundary>
          </MockAuthProvider>
        </AuthProvider>

        <ErrorBoundary boundary="support_widget" silent>
          <SupportWidget />
        </ErrorBoundary>
      </LanguageProvider>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );


}

