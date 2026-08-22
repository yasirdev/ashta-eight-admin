// Edge-safe helpers that operate on a NextResponse (usable in middleware AND
// route handlers). No next/headers import here.
import type { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, COOKIE_MAX_AGE } from "./config";

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function setSessionCookies(res: NextResponse, access: string, refresh: string) {
  res.cookies.set(ACCESS_COOKIE, access, { ...base, maxAge: COOKIE_MAX_AGE });
  res.cookies.set(REFRESH_COOKIE, refresh, { ...base, maxAge: COOKIE_MAX_AGE });
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { ...base, maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...base, maxAge: 0 });
}

// Defense-in-depth CSRF guard for state-changing POST handlers (on top of
// sameSite=lax cookies). A cross-site browser POST always carries an Origin;
// reject when it's present and its host ≠ Host. Missing Origin (same-origin
// navigations, non-browser callers) is allowed.
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

// Cheap client-side expiry read to decide whether to refresh. We do NOT verify
// the signature — that's the backend's job; we only read `exp` to avoid a
// pointless /me round-trip on an already-expired token.
export function isJwtFresh(token: string, skewSeconds = 30): boolean {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof json.exp === "number" && json.exp * 1000 - Date.now() > skewSeconds * 1000;
  } catch {
    return false;
  }
}
