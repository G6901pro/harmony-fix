import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  MailCheck,
  Phone,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  AuthError,
  EmailNotVerifiedError,
  INTENT_COPY,
  PASSWORD_RULES,
  authApi,
  isValidEmail,
  isValidBdPhone,
  peekCode,
  useMockAuth,
  type MockUser,
} from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

type View =
  | "login"
  | "phone-disabled"
  | "signup"
  | "forgot-options"
  | "forgot-email"
  | "forgot-code";


const field =
  "w-full rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-gold/60 focus:outline-none";
const fieldError = "border-destructive/70 focus:border-destructive";
const goldBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-7 py-3.5 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase transition-all hover:brightness-110 disabled:opacity-60";
const ghostBtn =
  "glass inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[10px] tracking-[0.24em] uppercase transition-colors hover:text-gold";

function Inline({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      key={message}
      role="alert"
      className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-[11px] leading-relaxed font-medium text-destructive duration-500 animate-in fade-in slide-in-from-bottom-2"
    >
      {message}
    </p>
  );
}

function FieldNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[11px] font-medium text-destructive">{message}</p>;
}

/* Google sign-in is disabled for testing — the "G" mark and OAuth trigger were
   removed so no provider popup or redirect can occur. */


function DemoCodeNote({ email, code }: { email: string; code: string | null }) {
  return (
    <div className="space-y-1.5 rounded-xl border border-gold/25 bg-surface-2/40 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
      <p>
        Demo mode — no email is sent. Your code for{" "}
        <span className="font-medium break-all text-foreground">{email}</span> is:
      </p>
      <p className="font-mono text-base tracking-[0.35em] text-gold">{code ?? "------"}</p>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  invalid,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  invalid?: boolean;
  autoComplete?: string;
  id?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        className={cn(field, "pr-12", invalid && fieldError)}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        maxLength={72}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((v) => !v)}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-gold"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function AuthModal() {
  const { modalOpen, closeAuth, intent, completeAuth, setStatus } = useMockAuth();
  const [view, setView] = useState<View>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const reset = useCallback(() => {
    setView("login");
    setBusy(false);
    setError(null);
    setFieldErr({});
    setSuccess(null);
    setNotice(null);
    setEmail("");
    setPhone("");
    setIdentifier("");
    setFullName("");
    setPassword("");
    setConfirm("");
    setCode("");
    setNewPassword("");
    setDemoCode(null);
    
  }, []);


  useEffect(() => {
    if (modalOpen) {
      reset();
    }
  }, [modalOpen, reset]);

  // Scroll lock + Escape + focus trap
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAuth();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const timer = setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("input,button")
        ?.focus({ preventScroll: true });
    }, 80);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(timer);
      previous?.focus?.();
    };
  }, [modalOpen, closeAuth]);

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) })),
    [password],
  );
  const resetChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(newPassword) })),
    [newPassword],
  );

  function handleFailure(err: unknown) {
    if (err instanceof AuthError) {
      if (err.field) setFieldErr({ [err.field]: err.message });
      else setError(err.message);
      return;
    }
    setError("Something went wrong. Please try again.");
  }

  function clearErrors() {
    setError(null);
    setFieldErr({});
    setNotice(null);
  }

  // Contextual messages never survive a view change.
  useEffect(() => {
    setError(null);
    setFieldErr({});
    setNotice(null);
  }, [view]);


  async function run(task: () => Promise<void>) {
    clearErrors();
    setBusy(true);
    try {
      await task();
    } catch (err) {
      handleFailure(err);
    } finally {
      setBusy(false);
    }
  }

  function finish(user: MockUser, message: string) {
    setSuccess(message);
    setTimeout(() => completeAuth(user), 900);
  }

  // Google sign-in removed for testing — no OAuth handler remains.


  /* ----------------------------- handlers ---------------------------- */

  const onLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier || !password) {
      setError("Please complete all required fields.");
      return;
    }
    if (!isValidEmail(identifier) && !isValidBdPhone(identifier)) {
      setFieldErr({ identifier: "Enter a valid email address or phone number." });
      return;
    }
    setStatus("logging-in");
    void run(async () => {
      try {
        const user = await authApi.signInWithIdentifier(identifier, password);
        setEmail(user.email);
        finish(user, "Login successful.");
      } catch (err) {
        // Verification is disabled, so an "unconfirmed" account is treated as a
        // plain sign-in problem rather than routing to a verification screen.
        if (err instanceof EmailNotVerifiedError) {
          setError("Incorrect email or password.");
          return;
        }
        throw err;
      }
    });
  };

  const onSignUp = (event: React.FormEvent) => {
    event.preventDefault();
    clearErrors();
    const name = fullName.trim().replace(/\s+/g, " ");
    if (!name) {
      setFieldErr({ fullName: "Please enter your name." });
      return;
    }
    if (name.length < 2) {
      setFieldErr({ fullName: "Name must be at least 2 characters." });
      return;
    }
    if (!email.trim() || !phone.trim() || !password || !confirm) {
      setError("Please complete all required fields.");
      return;
    }
    if (!isValidEmail(email)) {
      setFieldErr({ email: "Invalid email address." });
      return;
    }
    if (!isValidBdPhone(phone)) {
      setFieldErr({ phone: "Enter a valid Bangladeshi phone number (01XXXXXXXXX)." });
      return;
    }
    if (passwordChecks.some((rule) => !rule.ok)) {
      setFieldErr({ password: "Password does not meet all requirements." });
      return;
    }
    if (password !== confirm) {
      setFieldErr({ confirm: "Passwords do not match." });
      return;
    }
    setStatus("signing-up");
    void run(async () => {
      // Phone numbers are unique per account — tell the customer plainly here
      // instead of letting the sign-up fail with a database error.
      const { data: free } = await supabase.rpc("phone_is_available", { p_phone: phone.trim() });
      if (free === false) {
        setFieldErr({ phone: "This phone number is already registered." });
        return;
      }
      // Email verification is permanently disabled: creating the account also
      // establishes the session, so the member is signed in immediately.
      const user = await authApi.signUp(name, email.trim(), password, phone.trim());
      finish(user, "Account created. You're signed in.");
    });


  };



  const onForgotEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setFieldErr({ email: "Invalid email address." });
      return;
    }
    setStatus("password-reset");
    void run(async () => {
      await authApi.requestPasswordReset(email);
      setSuccess("Password reset link sent. Check your inbox.");
      setTimeout(() => {
        setSuccess(null);
        setView("login");
      }, 1400);
    });
  };

  const onResetPassword = (event: React.FormEvent) => {
    event.preventDefault();
    if (!code || !newPassword) {
      setError("Please complete all required fields.");
      return;
    }
    if (resetChecks.some((rule) => !rule.ok)) {
      setFieldErr({ newPassword: "Password does not meet all requirements." });
      return;
    }
    void run(async () => {
      await authApi.resetPassword(email, code, newPassword);
      setSuccess("Password reset successfully.");
      setTimeout(() => {
        setSuccess(null);
        setPassword("");
        setView("login");
      }, 1100);
    });
  };

  if (!mounted) return null;

  const titles: Record<View, string> = {
    login: "Welcome back",
    "phone-disabled": "Phone verification",
    signup: "Create your account",
    "forgot-options": "Reset your password",
    "forgot-email": "Reset by email",
    "forgot-code": "Enter your code",
  };

  const backTo: Partial<Record<View, View>> = {
    "phone-disabled": "login",
    signup: "login",
    "forgot-options": "login",
    "forgot-email": "forgot-options",
    "forgot-code": "forgot-email",
  };


  const rules = view === "forgot-code" ? resetChecks : passwordChecks;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] transition-opacity duration-300",
        modalOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!modalOpen}
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={closeAuth}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Account access"
          className={cn(
            "glass relative my-auto w-full max-w-md rounded-t-3xl border border-gold/20 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:rounded-3xl",
            modalOpen ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-6 opacity-0 sm:scale-95",
          )}
        >
          <div className="flex items-center justify-between px-6 pt-5 sm:px-8">
            {backTo[view] ? (
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setView(backTo[view]!);
                }}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] text-muted-foreground uppercase transition-colors hover:text-gold"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
            ) : (
              <span className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Member access
              </span>
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={closeAuth}
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-gold"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-[82vh] overflow-y-auto px-6 pt-2 pb-8 sm:px-8">
            <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{titles[view]}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {view === "login" ? INTENT_COPY[intent] : null}
              {view === "signup" ? "Join Velocita Vault to save, track and reorder." : null}
              

              {view === "forgot-options" ? "Choose how you'd like to recover access." : null}
              {view === "forgot-email"
                ? "We'll send a 6-digit code to your email address."
                : null}
              {view === "forgot-code"
                ? `Enter the code we sent to ${email} and choose a new password.`
                : null}
              {view === "phone-disabled" ? "This method is temporarily unavailable." : null}
            </p>

            {success ? (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-gold/30 bg-secondary px-4 py-3 text-sm text-gold duration-500 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 className="size-4 shrink-0" />
                {success}
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              <Inline message={error} />
              {notice ? (
                <p className="flex gap-2.5 rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground duration-500 animate-in fade-in slide-in-from-bottom-2">
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-gold" />
                  {notice}
                </p>
              ) : null}

              {/* ------------------------------ LOGIN ----------------------------- */}
              {view === "login" ? (
                <>
                  <form onSubmit={onLogin} className="space-y-3" noValidate>
                    <div>
                      <input
                        className={cn(field, fieldErr.identifier && fieldError)}
                        type="text"
                        placeholder="Email address or Phone number"
                        autoComplete="username"
                        value={identifier}
                        maxLength={255}
                        onChange={(e) => setIdentifier(e.target.value)}
                      />
                      <FieldNote message={fieldErr.identifier} />
                    </div>

                    <div>
                      <PasswordInput
                        value={password}
                        onChange={setPassword}
                        placeholder="Password"
                        autoComplete="current-password"
                        invalid={!!fieldErr.password}
                      />
                      <FieldNote message={fieldErr.password} />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          clearErrors();
                          setView("forgot-options");
                        }}
                        className="text-[11px] text-muted-foreground underline-offset-4 transition-colors hover:text-gold hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <button type="submit" disabled={busy} className={goldBtn}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : null} Login
                    </button>
                  </form>



                  <p className="pt-1 text-center text-xs text-muted-foreground">
                    New to Velocita Vault?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        clearErrors();
                        setView("signup");
                      }}
                      className="text-gold underline-offset-4 hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </>
              ) : null}

              {/* -------------------------- PHONE DISABLED ------------------------- */}
              {view === "phone-disabled" ? (
                <>
                  <div className="flex gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-4 text-sm text-muted-foreground">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold" />
                    <p>
                      Phone verification is currently unavailable. Please use Email &amp;
                      Password.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearErrors();
                      setView("login");
                    }}
                    className={cn(goldBtn, "gap-2")}
                  >
                    <Mail className="size-4" /> Continue with Email &amp; Password
                  </button>

                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="w-full py-1 text-center text-xs text-muted-foreground transition-colors hover:text-gold"
                  >
                    Back
                  </button>
                </>
              ) : null}

              {/* ------------------------------ SIGN UP ---------------------------- */}
              {view === "signup" ? (
                <form onSubmit={onSignUp} className="space-y-3" noValidate>
                  <div>
                    <input
                      className={cn(field, fieldErr.fullName && fieldError)}
                      placeholder="Full name"
                      autoComplete="name"
                      value={fullName}
                      maxLength={100}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fieldErr.fullName)
                          setFieldErr((prev) => ({ ...prev, fullName: "" }));
                      }}
                    />
                    <FieldNote message={fieldErr.fullName} />
                  </div>
                  <div>
                    <input
                      className={cn(field, fieldErr.email && fieldError)}
                      type="email"
                      placeholder="Email address"
                      autoComplete="email"
                      value={email}
                      maxLength={255}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <FieldNote message={fieldErr.email} />
                  </div>
                  <div>
                    <input
                      className={cn(field, fieldErr.phone && fieldError)}
                      type="tel"
                      inputMode="tel"
                      placeholder="Phone number (01XXXXXXXXX)"
                      autoComplete="tel"
                      value={phone}
                      maxLength={20}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <FieldNote message={fieldErr.phone} />
                  </div>
                  <div>
                    <PasswordInput
                      value={password}
                      onChange={setPassword}
                      placeholder="Password"
                      autoComplete="new-password"
                      invalid={!!fieldErr.password}
                    />
                    <FieldNote message={fieldErr.password} />
                  </div>
                  <ul className="grid gap-1.5 rounded-xl border border-border bg-surface-2/40 px-4 py-3">
                    {rules.map((rule) => (
                      <li
                        key={rule.id}
                        className={cn(
                          "flex items-center gap-2 text-[11px] transition-colors duration-300",
                          rule.ok ? "text-gold" : "text-muted-foreground",
                        )}
                      >
                        <Check
                          className={cn(
                            "size-3.5 transition-opacity",
                            rule.ok ? "opacity-100" : "opacity-40",
                          )}
                        />
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <PasswordInput
                      value={confirm}
                      onChange={setConfirm}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      invalid={!!fieldErr.confirm || (!!confirm && confirm !== password)}
                    />
                    <FieldNote
                      message={
                        fieldErr.confirm ??
                        (confirm && confirm !== password ? "Passwords do not match." : undefined)
                      }
                    />
                  </div>
                  <button type="submit" disabled={busy} className={goldBtn}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Create account
                  </button>
                </form>
              ) : null}

              {/* Email verification (and its confirmation screen) permanently removed. */}




              {/* -------------------------- FORGOT OPTIONS ------------------------- */}
              {view === "forgot-options" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      clearErrors();
                      setView("forgot-email");
                    }}
                    className={cn(goldBtn, "gap-2")}
                  >
                    <Mail className="size-4" /> Reset with email code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearErrors();
                      setNotice(
                        "Phone verification is currently unavailable. Please reset with an email code instead.",
                      );
                    }}
                    className={cn(ghostBtn, "gap-2")}
                  >
                    <Phone className="size-3.5" /> Reset with Phone OTP
                  </button>
                </>
              ) : null}

              {/* --------------------------- FORGOT EMAIL -------------------------- */}
              {view === "forgot-email" ? (
                <form onSubmit={onForgotEmail} className="space-y-3" noValidate>
                  <div>
                    <input
                      className={cn(field, fieldErr.email && fieldError)}
                      type="email"
                      placeholder="Email address"
                      autoComplete="email"
                      value={email}
                      maxLength={255}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <FieldNote message={fieldErr.email} />
                  </div>
                  <button type="submit" disabled={busy} className={goldBtn}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Send reset code
                  </button>
                </form>
              ) : null}

              {/* ---------------------------- FORGOT CODE -------------------------- */}
              {view === "forgot-code" ? (
                <form onSubmit={onResetPassword} className="space-y-3" noValidate>
                  <DemoCodeNote email={email} code={demoCode ?? peekCode(email)} />
                  <div>
                    <input
                      className={cn(
                        field,
                        "text-center tracking-[0.6em]",
                        fieldErr.code && fieldError,
                      )}
                      inputMode="numeric"
                      placeholder="------"
                      value={code}
                      maxLength={6}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    />
                    <FieldNote message={fieldErr.code} />
                  </div>
                  <div>
                    <PasswordInput
                      value={newPassword}
                      onChange={setNewPassword}
                      placeholder="New password"
                      autoComplete="new-password"
                      invalid={!!fieldErr.newPassword}
                    />
                    <FieldNote message={fieldErr.newPassword} />
                  </div>
                  <ul className="grid gap-1.5 rounded-xl border border-border bg-surface-2/40 px-4 py-3">
                    {rules.map((rule) => (
                      <li
                        key={rule.id}
                        className={cn(
                          "flex items-center gap-2 text-[11px] transition-colors duration-300",
                          rule.ok ? "text-gold" : "text-muted-foreground",
                        )}
                      >
                        <Check
                          className={cn(
                            "size-3.5 transition-opacity",
                            rule.ok ? "opacity-100" : "opacity-40",
                          )}
                        />
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                  <button type="submit" disabled={busy} className={goldBtn}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Reset password
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
