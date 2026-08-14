import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Velocita Vault" },
      { name: "description", content: "Set a new password for your Velocita Vault account." },
      { property: "og:title", content: "Reset password — Velocita Vault" },
      {
        property: "og:description",
        content: "Set a new password for your Velocita Vault account.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

const field =
  "w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/auth", replace: true }), 1200);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-16">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="glass mt-10 rounded-2xl border border-gold/20 p-8">
          <p className="eyebrow">Account security</p>
          <h1 className="mt-3 font-display text-2xl tracking-tight">Set a new password</h1>
          {done ? (
            <p className="mt-6 rounded-lg border border-gold/30 bg-secondary px-4 py-3 text-sm text-muted-foreground">
              Password updated. Redirecting to sign in…
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <input
                className={field}
                type="password"
                placeholder="New password"
                autoComplete="new-password"
                value={password}
                minLength={8}
                maxLength={72}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive"
                >
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-7 py-3.5 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase transition-all hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Update password
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
