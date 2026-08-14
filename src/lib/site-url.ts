/**
 * Single source of truth for the public base URL used in emailed links
 * (magic links, verification links, password resets).
 *
 * Order of preference:
 *   1. VITE_SITE_URL / VITE_PUBLIC_SITE_URL — set this to the production domain
 *      so emailed links never point at a developer machine.
 *   2. The origin the page is actually served from (correct in preview + prod).
 *   3. http://localhost:8080 — local development fallback only.
 */
const LOCAL_FALLBACK = "http://localhost:8080";

function fromEnv(): string | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const value = env.VITE_SITE_URL || env.VITE_PUBLIC_SITE_URL || env.VITE_FRONTEND_URL;
  return value ? value.trim().replace(/\/+$/, "") : null;
}

export function siteUrl(): string {
  const configured = fromEnv();
  if (configured) return configured;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return LOCAL_FALLBACK;
}

/** Absolute URL for an in-app path, safe to embed in an email. */
export function siteUrlFor(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
