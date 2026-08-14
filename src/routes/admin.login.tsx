import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { useAdminSession } from "@/lib/admin/use-admin-session";
import { loadRememberedEmail, saveRememberedEmail } from "@/lib/admin/session";
import { requestAdminVerification } from "@/lib/admin/verification.functions";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Restricted area" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: AdminLoginPage,
});

const field =
  "w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

function AdminLoginPage() {
  const navigate = useNavigate();
  const { status } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const saved = loadRememberedEmail();
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  // Already a verified operator — go straight to the console.
  useEffect(() => {
    if (status === "authorized") navigate({ to: "/admin", replace: true });
  }, [status, navigate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const address = email.trim().toLowerCase();
    try {
      // Any session left behind by a previous operator (or by a customer using
      // the same browser) is cleared first. A stale refresh token here is what
      // made a second sign-in fail with an opaque "Load failed".
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* nothing to clear */
      }

      // Step 1 — credentials are checked on the server. No session is issued here.
      await requestAdminVerification({ data: { email: address, password } });

      // Step 2 — a single-use verification link is emailed to the operator.
      const { error: linkError } = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/admin/verify`,
        },
      });
      if (linkError) throw linkError;

      saveRememberedEmail(address, remember);
      setPassword("");
      setSentTo(address);
      toast.success("Verification link sent successfully.", {
        description: `Please check your email inbox at ${address}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
      toast.error("Verification link could not be sent.", { description: message });
    } finally {
      setBusy(false);
    }
  }

  async function onForgot() {
    if (!email.trim()) {
      setError("Enter your admin email first, then request a reset link.");
      return;
    }
    setError(null);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSent(true);
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-5 py-16">
      {/* Ambient gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gold/10 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 right-0 size-[30rem] rounded-full bg-gold/5 blur-[140px]"
      />

      <div className="relative w-full max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="glass mt-10 rounded-2xl border border-gold/20 p-8 shadow-2xl sm:p-10">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full border border-gold/30 bg-secondary">
              <Lock className="size-4 text-gold" />
            </div>
            <div>
              <p className="eyebrow">Restricted</p>
              <h1 className="mt-1 font-display text-2xl tracking-tight">Operator sign in</h1>
            </div>
          </div>

          {sentTo ? (
            <div className="mt-10 flex flex-col items-center py-6 text-center">
              <div className="grid size-16 place-items-center rounded-full border border-gold/40 bg-secondary">
                <MailCheck className="size-7 text-gold" />
              </div>
              <p className="mt-6 font-display text-xl tracking-tight">Verification required</p>
              <p
                role="status"
                className="mt-3 rounded-lg border border-gold/30 bg-secondary px-4 py-3 text-sm text-muted-foreground"
              >
                A verification link has been sent to {sentTo}. Please check your inbox and click
                the link to authorize entry into the Admin Control Room.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                The link expires shortly and can only be used once.
              </p>
              <button
                type="button"
                onClick={() => setSentTo(null)}
                className="mt-6 text-[10px] tracking-[0.24em] text-gold uppercase underline-offset-4 hover:underline"
              >
                Use a different account
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="admin-email" className="sr-only">
                  Admin email
                </label>
                <input
                  id="admin-email"
                  className={field}
                  type="email"
                  autoComplete="username"
                  placeholder="Admin email"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <label htmlFor="admin-password" className="sr-only">
                  Password
                </label>
                <input
                  id="admin-password"
                  className={`${field} pr-12`}
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  minLength={6}
                  maxLength={72}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground transition-colors hover:text-gold"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-3.5 accent-[#C8A250]"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => void onForgot()}
                  className="text-gold underline-offset-4 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive"
                >
                  {error}
                </p>
              ) : null}

              {resetSent ? (
                <p className="rounded-lg border border-gold/30 bg-secondary px-4 py-3 text-xs text-muted-foreground">
                  If that address is registered, a reset link is on its way.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-7 py-3.5 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase transition-all hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? "Sending link" : "Send verification link"}
              </button>
            </form>
          )}

          <p className="mt-8 flex items-center justify-center gap-2 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            <ShieldCheck className="size-3.5 text-gold" />
            Encrypted session · Email link verified
          </p>
        </div>
      </div>
    </main>
  );
}
