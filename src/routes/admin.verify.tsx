import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Loader2, MailWarning, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { confirmAdminVerification } from "@/lib/admin/verification.functions";

/** Landing page for the emailed admin verification link. */
export const Route = createFileRoute("/admin/verify")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verifying admin access" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: AdminVerifyPage,
});

type State = "checking" | "granted" | "denied" | "no-session";

function AdminVerifyPage() {

  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function authorise() {
      if (done.current) return;
      done.current = true;
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          if (!cancelled) setState("no-session");
          done.current = false;
          return;
        }
        const result = await confirmAdminVerification();
        if (cancelled) return;
        if (result.ok) {
          setState("granted");
          // A full document load guarantees the console mounts with the fresh
          // grant already resolvable, so entry is seamless every time.
          setTimeout(() => window.location.replace("/admin"), 900);
        } else {
          setState("denied");
          setMessage("This account is not on the authorised operator list.");
          await supabase.auth.signOut();
        }

      } catch (err) {
        if (cancelled) return;
        done.current = false;
        setState("denied");
        setMessage(err instanceof Error ? err.message : "Verification could not be completed.");
      }
    }

    // The link may still be exchanging its token when the page mounts.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void authorise();
    });

    const timer = setTimeout(() => void authorise(), 900);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-16">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="glass mt-10 rounded-2xl border border-gold/20 p-10">
          {state === "checking" ? (
            <>
              <Loader2 className="mx-auto size-7 animate-spin text-gold" />
              <h1 className="mt-6 font-display text-2xl tracking-tight">Verifying your link</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Authorising entry into the Admin Control Room…
              </p>
            </>
          ) : null}

          {state === "granted" ? (
            <>
              <div className="mx-auto grid size-14 place-items-center rounded-full border border-gold/40 bg-[image:var(--gradient-gold)]">
                <Check className="size-6 text-primary-foreground" />
              </div>
              <h1 className="mt-6 font-display text-2xl tracking-tight">Access authorised</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Opening the Admin Control Room…
              </p>
              <a
                href="/admin"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-[image:var(--gradient-gold)] px-6 py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase"
              >
                Enter the control room
              </a>

            </>
          ) : null}

          {state === "no-session" ? (
            <>
              <div className="mx-auto grid size-14 place-items-center rounded-full border border-gold/30 bg-secondary">
                <MailWarning className="size-6 text-gold" />
              </div>
              <h1 className="mt-6 font-display text-2xl tracking-tight">Link expired</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This verification link is no longer valid. Sign in again to receive a fresh one.
              </p>
              <Link
                to="/admin/login"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-[image:var(--gradient-gold)] px-6 py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase"
              >
                Back to sign in
              </Link>
            </>
          ) : null}

          {state === "denied" ? (
            <>
              <div className="mx-auto grid size-14 place-items-center rounded-full border border-destructive/40 bg-secondary">
                <ShieldCheck className="size-6 text-destructive" />
              </div>
              <p className="eyebrow mt-6">Error 403</p>
              <h1 className="mt-3 font-display text-2xl tracking-tight">Not authorised</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {message ?? "This account cannot enter the Admin Control Room."}
              </p>
              <Link
                to="/"
                className="mt-8 inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-[10px] tracking-[0.24em] uppercase transition-colors hover:border-gold/60 hover:text-gold"
              >
                Return to store
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
