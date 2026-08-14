import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function Unauthorized({
  title = "Unauthorized access",
  message = "This area is restricted to authorised Velocita Vault operators. Your account does not have the required permissions.",
  onSignOut,
}: {
  title?: string;
  message?: string;
  onSignOut?: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="glass mt-10 rounded-2xl border border-gold/20 p-10">
          <div className="mx-auto grid size-14 place-items-center rounded-full border border-gold/30 bg-secondary">
            <ShieldAlert className="size-6 text-gold" />
          </div>
          <p className="eyebrow mt-6">Error 403</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            This attempt has been recorded for security review.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-[10px] tracking-[0.24em] uppercase transition-colors hover:border-gold/60 hover:text-gold"
            >
              Return to store
            </Link>
            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center justify-center rounded-full bg-[image:var(--gradient-gold)] px-6 py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase transition-all hover:brightness-110"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
