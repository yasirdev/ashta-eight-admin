import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL, ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/config";
import { setSessionCookies, clearSessionCookies, isJwtFresh } from "@/lib/cookies";

// Guards the authenticated area. Fresh access → pass. Expired but refreshable →
// POST /auth/refresh (rotates), set new cookies, continue. Otherwise → /login.
export async function proxy(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  if (access && isJwtFresh(access)) return NextResponse.next();

  if (refresh) {
    try {
      const r = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (r.ok) {
        const d = await r.json();
        // Forward the rotated access token on THIS request's Cookie header so the
        // downstream layout's cookies()/GET /me sees the fresh token (not the
        // expired one it arrived with), AND persist it on the response.
        req.cookies.set(ACCESS_COOKIE, d.access);
        req.cookies.set(REFRESH_COOKIE, d.refresh);
        const headers = new Headers(req.headers);
        headers.set("cookie", req.cookies.toString());
        const res = NextResponse.next({ request: { headers } });
        setSessionCookies(res, d.access, d.refresh);
        return res;
      }
    } catch {
      // fall through to redirect
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  const res = NextResponse.redirect(url);
  clearSessionCookies(res);
  return res;
}

export const config = { matcher: ["/dashboard/:path*"] };
