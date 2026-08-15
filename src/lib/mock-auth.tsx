/**
 * Application authentication — a SINGLE source of truth.
 *
 * Every surface in the app (header, account panel, product pages, checkout)
 * reads session state from this provider, and this provider reads it from
 * Lovable Cloud auth. There is no second, local, or simulated session:
 * `supabase.auth` is the only authority, so a signed-in user is signed in
 * everywhere at the same instant.
 *
 * The hook is still called `useMockAuth` for historical reasons — the name is
 * kept so existing components keep working; the behaviour is fully real.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { siteUrl } from "@/lib/site-url";


export type MockUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
};

/** Fired after a profile change so every mounted surface re-reads the avatar. */
export const PROFILE_UPDATED_EVENT = "vv:profile-updated";

export function notifyProfileUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
  }
}

export type AuthStatus =
  | "logged-out"
  | "logging-in"
  | "logged-in"
  | "signing-up"
  | "verification-pending"
  | "verification-complete"
  | "password-reset";

/** Reason the auth modal was opened — drives the modal headline copy. */
export type AuthIntent =
  | "generic"
  | "account"
  | "buy-now"
  | "checkout"
  | "wishlist"
  | "review"
  | "track-order"
  | "order-history";

export const INTENT_COPY: Record<AuthIntent, string> = {
  generic: "Sign in to continue.",
  account: "Sign in to access your account.",
  "buy-now": "Sign in to complete your purchase.",
  checkout: "Sign in to continue to checkout.",
  wishlist: "Sign in to save pieces to your wishlist.",
  review: "Sign in to write a review.",
  "track-order": "Sign in to track your order.",
  "order-history": "Sign in to view your order history.",
};

/** Verification codes are never exposed client-side any more. */
export const DEMO_MODE = false;
export function peekCode(_email: string): string | null {
  return null;
}

export class AuthError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

export class EmailNotVerifiedError extends AuthError {
  constructor(public userEmail: string) {
    super(
      "Please verify your email before signing in. Check your inbox for the verification link.",
    );
  }
}

/* ------------------------------------------------------------------ */
/* Session mapping                                                     */
/* ------------------------------------------------------------------ */

export function toAppUser(user: User): MockUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (user.email ? user.email.split("@")[0] : "Member");
  return {
    id: user.id,
    fullName,
    email: user.email ?? "",
    phone: user.phone || (typeof meta.phone === "string" ? meta.phone : undefined),
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
    emailVerified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
  };
}

/** Public base URL for emailed links — env-driven, never hardcoded localhost. */
const origin = () => siteUrl();

/** Normalise a Bangladeshi phone number to +8801XXXXXXXXX, or null if invalid. */
export function normalizeBdPhone(value: string): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (/^8801[3-9]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^01[3-9]\d{8}$/.test(digits)) return `+88${digits}`;
  if (/^1[3-9]\d{8}$/.test(digits)) return `+880${digits}`;
  return null;
}

export const isValidBdPhone = (value: string) => normalizeBdPhone(value) !== null;

/* ------------------------------------------------------------------ */
/* Auth API — thin wrappers over Lovable Cloud auth                    */
/* ------------------------------------------------------------------ */

export const authApi = {
  async signInWithPassword(email: string, password: string): Promise<MockUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      const message = error.message.toLowerCase();
      // Email verification is permanently disabled. If the backend ever reports
      // an unconfirmed address for a legacy account, do not park the member on a
      // verification screen — let them straight in on their password.
      if (message.includes("not confirmed") || message.includes("not verified")) {
        const retry = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (retry.data.user) return toAppUser(retry.data.user);
        throw new AuthError("Incorrect email or password.", "password");
      }
      if (message.includes("invalid login credentials")) {
        throw new AuthError("Incorrect email or password.", "password");
      }
      throw new AuthError(error.message);
    }

    if (!data.user) throw new AuthError("Unable to sign in. Please try again.");
    return toAppUser(data.user);
  },

  /**
   * Sign in with either an email address or a Bangladeshi phone number.
   * A phone number is resolved to the account email first — no OTP involved.
   */
  async signInWithIdentifier(identifier: string, password: string): Promise<MockUser> {
    const value = identifier.trim();
    if (isValidEmail(value)) return authApi.signInWithPassword(value, password);

    const phone = normalizeBdPhone(value);
    if (!phone) {
      throw new AuthError("Enter a valid email address or Bangladeshi phone number.", "identifier");
    }
    const { data, error } = await supabase.rpc("login_email_for_phone", { p_phone: phone });
    if (error) throw new AuthError(error.message);
    if (!data) throw new AuthError("No account found for this phone number.", "identifier");
    return authApi.signInWithPassword(data as string, password);
  },

  /**
   * Registration is instant: no verification email is requested and no code is
   * ever asked for. The account is created and the browser session is
   * established in the same call, so the caller is signed in straight away.
   */
  async signUp(
    fullName: string,
    email: string,
    password: string,
    phone?: string,
  ): Promise<MockUser> {
    const normalizedPhone = phone ? normalizeBdPhone(phone) : null;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${origin()}/`,
        data: {
          full_name: fullName.trim(),
          ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        },
      },
    });
    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("already registered") || message.includes("already been registered")) {
        throw new AuthError("Email is already registered.", "email");
      }
      throw new AuthError(error.message);
    }
    if (!data.user) throw new AuthError("Unable to create your account. Please try again.");

    // Guarantee an authenticated session even if the sign-up response did not
    // carry one, so the user is never parked on a verification screen.
    if (!data.session) {
      return authApi.signInWithPassword(email, password);
    }
    return toAppUser(data.user);
  },

  async resendVerificationLink(_email: string): Promise<void> {
    // Email verification is permanently disabled — nothing to resend.
  },

  /**
   * Confirmation happens when the user opens the emailed link (possibly in
   * another tab). This re-reads the live session so the modal can continue as
   * soon as that has happened.
   */
  async verifyEmailLink(_email: string): Promise<MockUser> {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      throw new AuthError(
        "Open the verification link we emailed you, then return here to continue.",
      );
    }
    return toAppUser(user);
  },

  async requestPasswordReset(email: string): Promise<string> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin()}/reset-password`,
    });
    if (error) throw new AuthError(error.message, "email");
    return "";
  },

  /** Used by the /reset-password page once the recovery link is open. */
  async resetPassword(_email: string, _code: string, password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new AuthError(error.message, "newPassword");
  },

  /**
   * Google sign-in is intentionally disabled for testing: it throws instead of
   * starting any OAuth popup or redirect, and no UI calls it any more.
   */
  async signInWithGoogle(): Promise<MockUser> {
    throw new AuthError("Google sign-in is disabled. Please use email and password.");
  },


  phoneAuthEnabled: false as boolean,

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },
};

/** Updates the signed-in customer's profile row and auth metadata. */
export async function updateMockProfile(
  userId: string,
  patch: { fullName?: string; email?: string; phone?: string },
): Promise<MockUser> {
  if (patch.email && !isValidEmail(patch.email)) {
    throw new AuthError("Enter a valid email address.", "email");
  }

  const metadata: Record<string, string> = {};
  if (patch.fullName !== undefined) metadata.full_name = patch.fullName;
  if (patch.phone !== undefined) metadata.phone = patch.phone;

  const { data, error } = await supabase.auth.updateUser({
    ...(patch.email ? { email: patch.email } : {}),
    ...(Object.keys(metadata).length ? { data: metadata } : {}),
  });
  if (error) throw new AuthError(error.message);

  await supabase
    .from("profiles")
    .update({
      ...(patch.fullName !== undefined ? { full_name: patch.fullName } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
    })
    .eq("id", userId);

  if (!data.user) throw new AuthError("Account not found.");
  return toAppUser(data.user);
}

/* ------------------------------------------------------------------ */
/* Auth context                                                        */
/* ------------------------------------------------------------------ */

type PendingAction = (() => void) | null;

type MockAuthValue = {
  user: MockUser | null;
  session: Session | null;
  /** True until the initial session lookup finishes. */
  loading: boolean;
  status: AuthStatus;
  setStatus: (status: AuthStatus) => void;
  isLoggedIn: boolean;
  modalOpen: boolean;
  intent: AuthIntent;
  openAuth: (intent?: AuthIntent, onSuccess?: () => void) => void;
  closeAuth: () => void;
  /** Runs `action` when signed in, otherwise opens the modal and resumes after login. */
  requireAuth: (action: () => void, intent?: AuthIntent) => void;
  completeAuth: (user: MockUser) => void;
  updateProfile: (patch: { fullName?: string; email?: string; phone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const MockAuthContext = createContext<MockAuthValue | null>(null);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AuthStatus>("logged-out");
  const [modalOpen, setModalOpen] = useState(false);
  const [intent, setIntent] = useState<AuthIntent>("generic");
  const [pending, setPending] = useState<PendingAction>(null);

  // Mirrors the session for callbacks that must not close over stale state.
  const sessionRef = useRef<Session | null>(null);
  const pendingRef = useRef<PendingAction>(null);

  const apply = useCallback((next: Session | null) => {
    sessionRef.current = next;
    setSession(next);
    setStatus(next?.user ? "logged-in" : "logged-out");
    if (next?.user) {
      // Resume whatever the user was doing before the modal appeared.
      setModalOpen(false);
      const action = pendingRef.current;
      pendingRef.current = null;
      setPending(null);
      if (action) setTimeout(action, 120);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      apply(next);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      apply(data.session);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [apply]);

  // Avatar lives on the profiles row; keep a live copy so the drawer and header
  // update the instant the dashboard saves a new photo.
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setProfileAvatar(null);
      return;
    }
    let active = true;
    const loadAvatar = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (active) setProfileAvatar((data?.avatar_url as string | null) ?? null);
    };
    void loadAvatar();

    const onProfileUpdated = () => void loadAvatar();
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);

    const channel = supabase
      .channel(`profile-avatar-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const next = (payload.new as { avatar_url?: string | null } | null)?.avatar_url ?? null;
          if (active) setProfileAvatar(next);
        },
      )
      .subscribe();

    return () => {
      active = false;
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const user = useMemo(() => {
    if (!session?.user) return null;
    const base = toAppUser(session.user);
    return { ...base, avatarUrl: profileAvatar ?? base.avatarUrl ?? null };
  }, [session, profileAvatar]);

  const openAuth = useCallback((nextIntent: AuthIntent = "generic", onSuccess?: () => void) => {
    setIntent(nextIntent);
    pendingRef.current = onSuccess ?? null;
    setPending(() => onSuccess ?? null);
    setModalOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setModalOpen(false);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const requireAuth = useCallback(
    (action: () => void, nextIntent: AuthIntent = "generic") => {
      if (sessionRef.current?.user) {
        action();
        return;
      }
      openAuth(nextIntent, action);
    },
    [openAuth],
  );

  const completeAuth = useCallback(
    (_next: MockUser) => {
      // The session listener is authoritative; this only closes the modal and
      // resumes the pending action when the listener has already fired.
      setModalOpen(false);
      const action = pendingRef.current ?? pending;
      pendingRef.current = null;
      setPending(null);
      if (action) setTimeout(action, 120);
    },
    [pending],
  );

  const signOut = useCallback(async () => {
    await authApi.signOut();
    apply(null);
  }, [apply]);

  const updateProfile = useCallback(
    async (patch: { fullName?: string; email?: string; phone?: string }) => {
      const current = sessionRef.current?.user;
      if (!current) return;
      await updateMockProfile(current.id, patch);
      const { data } = await supabase.auth.getSession();
      apply(data.session);
    },
    [apply],
  );

  const value = useMemo<MockAuthValue>(
    () => ({
      user,
      session,
      loading,
      status,
      setStatus,
      isLoggedIn: !!user,
      modalOpen,
      intent,
      openAuth,
      closeAuth,
      requireAuth,
      completeAuth,
      updateProfile,
      signOut,
    }),
    [
      user,
      session,
      loading,
      status,
      modalOpen,
      intent,
      openAuth,
      closeAuth,
      requireAuth,
      completeAuth,
      updateProfile,
      signOut,
    ],
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useMockAuth() {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error("useMockAuth must be used inside MockAuthProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

export const PASSWORD_RULES = [
  { id: "len", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { id: "number", label: "One number", test: (v: string) => /\d/.test(v) },
  {
    id: "special",
    label: "One special character",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
] as const;

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
