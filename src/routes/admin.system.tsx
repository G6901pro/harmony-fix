import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, Database, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { ghostButton } from "@/components/admin/AdminPage";
import { StatCard } from "@/components/admin/ui";
import { useAdminSession } from "@/lib/admin/use-admin-session";
import { permanentAdminRole } from "@/lib/admin/super-admins";
import { Unauthorized } from "@/components/admin/Unauthorized";
import {
  clearDbErrors,
  getDbErrors,
  installDbErrorLogger,
  subscribeDbErrors,
  type DbErrorEntry,
} from "@/lib/admin/db-error-log";

export const Route = createFileRoute("/admin/system")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Database & Logs · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SystemRoute,
});

const INSPECTED = [
  { table: "orders", label: "Orders", columns: ["order_number", "status", "payment_status", "total"] },
  { table: "products", label: "Products", columns: ["title", "slug", "price", "stock_quantity"] },
  {
    table: "inventory_transactions",
    label: "Stock movements",
    columns: ["product_slug", "quantity_delta", "reason", "created_at"],
  },
  { table: "profiles", label: "User profiles", columns: ["full_name", "email", "phone"] },
] as const;

type TableSnapshot = {
  table: string;
  label: string;
  columns: readonly string[];
  count: number | null;
  rows: Record<string, unknown>[];
  error: string | null;
};

function SystemRoute() {
  const { email, role, roles, signOut } = useAdminSession();
  const allowed = Boolean(email && permanentAdminRole(email));

  return (
    <AdminGuard>
      <AdminShell role={role} roles={roles} email={email} onSignOut={() => void signOut()}>
        {allowed ? (
          <SystemMonitor />
        ) : (
          <Unauthorized
            title="Super Admin only"
            message="The Database & System Logs console is restricted to the owner account. No other role can open this page."
            onSignOut={() => void signOut()}
          />
        )}
      </AdminShell>
    </AdminGuard>
  );
}

function SystemMonitor() {
  const [health, setHealth] = useState<{
    state: "checking" | "healthy" | "error";
    latency: number | null;
    message: string | null;
  }>({ state: "checking", latency: null, message: null });
  const [snapshots, setSnapshots] = useState<TableSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const errors = useSyncExternalStore(
    subscribeDbErrors,
    getDbErrors,
    () => [] as DbErrorEntry[],
  );

  useEffect(() => {
    installDbErrorLogger();
  }, []);

  async function refresh() {
    setLoading(true);

    const started = performance.now();
    const probe = await supabase.from("site_settings").select("id").limit(1);
    setHealth({
      state: probe.error ? "error" : "healthy",
      latency: Math.round(performance.now() - started),
      message: probe.error?.message ?? null,
    });

    const results = await Promise.all(
      INSPECTED.map(async (spec): Promise<TableSnapshot> => {
        const [countRes, rowsRes] = await Promise.all([
          supabase.from(spec.table as never).select("id", { count: "exact", head: true }),
          supabase.from(spec.table as never).select("*").limit(5),
        ]);
        const err = countRes.error ?? rowsRes.error;
        return {
          table: spec.table,
          label: spec.label,
          columns: spec.columns,
          count: countRes.count ?? null,
          rows: (rowsRes.data ?? []) as Record<string, unknown>[],
          error: err?.message ?? null,
        };
      }),
    );
    setSnapshots(results);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missingFields = useMemo(
    () =>
      snapshots
        .flatMap((s) =>
          s.rows.length
            ? s.columns
                .filter((c) => !Object.prototype.hasOwnProperty.call(s.rows[0], c))
                .map((c) => `${s.table}.${c}`)
            : [],
        )
        .concat(snapshots.filter((s) => s.error).map((s) => `${s.table}: ${s.error}`)),
    [snapshots],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="eyebrow">Owner console</p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Database &amp; system logs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Live connection health, captured query failures and raw table counts for backend
            integrity checks.
          </p>
        </div>
        <button type="button" className={ghostButton} onClick={() => void refresh()}>
          <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div
          className={`rounded-xl border p-5 ${
            health.state === "healthy"
              ? "border-emerald-500/40 bg-emerald-500/5"
              : health.state === "error"
                ? "border-destructive/50 bg-destructive/5"
                : "border-border"
          }`}
        >
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Connection
          </p>
          <p className="mt-2 flex items-center gap-2 font-display text-2xl">
            <Database className="size-5" />
            {health.state === "checking"
              ? "Checking…"
              : health.state === "healthy"
                ? "Healthy"
                : "Error"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {health.message ?? `Round trip ${health.latency ?? "—"} ms`}
          </p>
        </div>
        <StatCard label="Captured errors" value={errors.length} />
        <StatCard
          label="Schema warnings"
          value={missingFields.length}
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      {missingFields.length ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
          <p className="text-sm">Missing table fields / query problems</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {missingFields.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">
            <Activity className="mr-2 inline size-4" /> Error logs
          </h2>
          <button type="button" className={ghostButton} onClick={clearDbErrors}>
            <Trash2 className="size-3.5" /> Clear
          </button>
        </div>
        {errors.length === 0 ? (
          <p className="rounded-lg border border-border p-5 text-sm text-muted-foreground">
            No failed database queries or API calls captured in this session.
          </p>
        ) : (
          <ul className="space-y-2">
            {errors.map((e) => (
              <li key={e.id} className="rounded-lg border border-destructive/30 bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2 text-[10px] tracking-[0.16em] uppercase">
                  <span className="rounded-full border border-border px-2 py-0.5">{e.source}</span>
                  {e.status ? (
                    <span className="text-destructive">HTTP {e.status}</span>
                  ) : null}
                  <span className="text-muted-foreground">
                    {new Date(e.at).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="mt-2 text-sm">{e.message}</p>
                <p className="mt-1 font-mono text-[11px] break-all text-muted-foreground">
                  {e.endpoint}
                </p>
                {e.detail ? (
                  <p className="mt-1 font-mono text-[11px] break-all text-muted-foreground">
                    {e.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl">Raw table inspector</h2>
        {snapshots.map((s) => (
          <div key={s.table} className="rounded-xl border border-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                {s.label}{" "}
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">{s.table}</span>
              </p>
              <p className="text-[10px] tracking-[0.2em] uppercase">
                <span className="text-gold">{s.count ?? "—"}</span> rows
              </p>
            </div>
            {s.error ? (
              <p className="mt-3 text-xs text-destructive">{s.error}</p>
            ) : s.rows.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Table is empty.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                    <tr>
                      {s.columns.map((c) => (
                        <th key={c} className="py-2 pr-4 font-normal">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {s.columns.map((c) => (
                          <td key={c} className="py-2 pr-4 align-top">
                            {formatCell(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value).slice(0, 60);
  return String(value).slice(0, 60);
}
