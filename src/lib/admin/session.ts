/**
 * Admin session architecture (frontend only — no custom backend yet).
 *
 * The auth provider issues a JWT access token + refresh token pair and the SDK
 * refreshes it automatically. This module centralises the policy knobs that a
 * future dedicated admin backend (secure httpOnly cookies, 2FA, device binding)
 * will plug into, so no screen has to change later.
 */

export const ADMIN_SESSION_POLICY = {
  /** Idle time before the admin console force-logs-out. */
  idleTimeoutMs: 30 * 60 * 1000,
  /** Warn the operator this long before auto logout. */
  idleWarningMs: 2 * 60 * 1000,
  /** Refresh the access token this long before it expires. */
  refreshSkewMs: 60 * 1000,
  /**
   * When the admin backend lands, tokens move to httpOnly + Secure + SameSite=Strict
   * cookies. Until then the SDK keeps them in storage for the browser session only.
   */
  cookie: {
    name: "vv_admin_session",
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    path: "/admin",
  },
  /** Placeholder for the upcoming TOTP second factor. */
  twoFactor: {
    enabled: false,
    method: "totp" as "totp" | "email" | "sms",
    challengePath: "/admin/2fa",
  },
} as const;

const REMEMBER_KEY = "vv_admin_remember_email";

export function loadRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(REMEMBER_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveRememberedEmail(email: string, remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (remember && email) window.localStorage.setItem(REMEMBER_KEY, email);
    else window.localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* storage unavailable — remember-me silently degrades */
  }
}

/**
 * Calls `onIdle` after the configured idle window with no user interaction.
 * Returns a cleanup function.
 */
export function startIdleWatch(onIdle: () => void, onWarn?: () => void) {
  if (typeof window === "undefined") return () => {};
  let idleTimer: ReturnType<typeof setTimeout>;
  let warnTimer: ReturnType<typeof setTimeout>;

  const reset = () => {
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);
    if (onWarn) {
      warnTimer = setTimeout(
        onWarn,
        ADMIN_SESSION_POLICY.idleTimeoutMs - ADMIN_SESSION_POLICY.idleWarningMs,
      );
    }
    idleTimer = setTimeout(onIdle, ADMIN_SESSION_POLICY.idleTimeoutMs);
  };

  const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
  events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
  reset();

  return () => {
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);
    events.forEach((e) => window.removeEventListener(e, reset));
  };
}
