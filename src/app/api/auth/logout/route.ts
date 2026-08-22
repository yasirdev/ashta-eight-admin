import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE_URL, ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/config";
import { clearSessionCookies, sameOrigin } from "@/lib/cookies";

// POST /auth/logout {refresh} (Bearer access) → revokes server-side, then we
// clear cookies regardless of backend result (best-effort revoke).
export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Bad origin" } }, { status: 403 });
  }
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  const refresh = jar.get(REFRESH_COOKIE)?.value;

  if (refresh) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(access ? { authorization: `Bearer ${access}` } : {}),
        },
        body: JSON.stringify({ refresh }),
      });
    } catch {
      // ignore — we still clear local cookies
    }
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
