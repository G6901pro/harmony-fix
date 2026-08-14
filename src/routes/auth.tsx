import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Velocita Vault Member Account" },
      {
        name: "description",
        content:
          "Sign in to your Velocita Vault account to track orders, manage addresses and view invoices.",
      },
      { property: "og:title", content: "Sign in — Velocita Vault" },
      {
        property: "og:description",
        content: "Access your Velocita Vault member dashboard.",
      },
    ],
  }),
  component: AuthPage,
});

const field =
  "w-full rounded-md border border-input bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  /** Blocked or removed accounts are signed straight back out. */
  async function assertAccountActive() {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user?.id;
    if (!id) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_blocked, deleted_at")
      .eq("id", id)
      .maybeSingle();
    if (profile?.deleted_at) {
      await supabase.auth.signOut();
      throw new Error("This account has been removed. Please contact support.");
    }
    if (profile?.is_blocked) {
      await supabase.auth.signOut();
      throw new Error("Your account has been suspended. Please contact support.");
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        // Instant registration — no verification email, no code to enter.
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        await assertAccountActive();
        navigate({ to: "/account" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await assertAccountActive();
        navigate({ to: "/account" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // Google sign-in disabled for testing — email & password only.


  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-16">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Link to="/" aria-label="Velocita Vault home">
            <Logo />
          </Link>
        </div>

        <div className="lux-card mt-10 p-8">
          <p className="eyebrow">Member access</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track orders, keep a wishlist and download invoices.
          </p>

          {sent ? (
            <p className="mt-6 rounded-md border border-gold/30 bg-secondary p-4 text-sm text-muted-foreground">
              We've sent a confirmation link to <span className="text-gold">{email}</span>.
              Confirm it, then sign in.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              {mode === "signup" ? (
                <input
                  className={field}
                  placeholder="Full name"
                  value={fullName}
                  maxLength={100}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              ) : null}
              <input
                className={field}
                type="email"
                placeholder="Email address"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className={field}
                type="password"
                placeholder="Password"
                value={password}
                minLength={6}
                maxLength={72}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-7 py-3.5 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase transition-all hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>
          )}


          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "New to Velocita Vault?" : "Already a member?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setSent(false);
              }}
              className="text-gold underline-offset-4 hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
