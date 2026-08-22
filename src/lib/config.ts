// Shared, edge-safe constants (no next/headers import — safe in middleware).
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export const ACCESS_COOKIE = "ae_access";
export const REFRESH_COOKIE = "ae_refresh";

// Cookie lifetime (30d). The access JWT's own `exp` is the real short-lived
// control; middleware refreshes it. Cookie just needs to outlive the session.
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
