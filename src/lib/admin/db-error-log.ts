/**
 * Client-side database / API error recorder.
 *
 * Installs one global `fetch` wrapper plus a `console.error` tap so every
 * failed database query, RPC call, storage read or broken API request is
 * captured with its status, endpoint and message. The buffer is intentionally
 * small and lives in `sessionStorage` so it survives a page navigation but
 * never grows without bound.
 */

export type DbErrorEntry = {
  id: string;
  at: string;
  source: "database" | "storage" | "auth" | "api" | "console";
  status: number | null;
  endpoint: string;
  message: string;
  detail?: string | null;
};

const STORAGE_KEY = "vv.admin.db-errors";
const MAX_ENTRIES = 100;

let buffer: DbErrorEntry[] = [];
let installed = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(0, MAX_ENTRIES)));
  } catch {
    /* storage full or unavailable — the in-memory buffer still works */
  }
}

function restore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) buffer = JSON.parse(raw) as DbErrorEntry[];
  } catch {
    buffer = [];
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function recordDbError(entry: Omit<DbErrorEntry, "id" | "at">) {
  buffer = [
    { ...entry, id: Math.random().toString(36).slice(2), at: new Date().toISOString() },
    ...buffer,
  ].slice(0, MAX_ENTRIES);
  persist();
  emit();
}

export function getDbErrors(): DbErrorEntry[] {
  return buffer;
}

export function clearDbErrors() {
  buffer = [];
  persist();
  emit();
}

export function subscribeDbErrors(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function classify(url: string): DbErrorEntry["source"] {
  if (url.includes("/rest/v1/") || url.includes("/rpc/")) return "database";
  if (url.includes("/storage/v1/")) return "storage";
  if (url.includes("/auth/v1/")) return "auth";
  return "api";
}

function shortEndpoint(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.pathname}${parsed.search}`.slice(0, 240);
  } catch {
    return url.slice(0, 240);
  }
}

/** Install the interceptors once, in the browser only. */
export function installDbErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  restore();

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    try {
      const response = await originalFetch(input as RequestInfo, init);
      if (!response.ok && /supabase|\/api\//.test(url)) {
        let detail: string | null = null;
        try {
          detail = (await response.clone().text()).slice(0, 500);
        } catch {
          detail = null;
        }
        recordDbError({
          source: classify(url),
          status: response.status,
          endpoint: shortEndpoint(url),
          message: `${response.status} ${response.statusText || "Request failed"}`,
          detail,
        });
      }
      return response;
    } catch (error) {
      recordDbError({
        source: classify(url),
        status: null,
        endpoint: shortEndpoint(url),
        message: error instanceof Error ? error.message : "Network request failed",
      });
      throw error;
    }
  };

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const text = args
      .map((a) =>
        a instanceof Error ? a.message : typeof a === "string" ? a : safeStringify(a),
      )
      .join(" ");
    if (/supabase|postgres|row-level security|column|relation|policy|rpc/i.test(text)) {
      recordDbError({
        source: "console",
        status: null,
        endpoint: "client",
        message: text.slice(0, 400),
      });
    }
    originalConsoleError(...args);
  };
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
