import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";
import { setSessionCookies, sameOrigin } from "@/lib/cookies";

// POST /auth/2fa/verify {challengeId,code} → {access,refresh,user}.
export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Bad origin" } }, { status: 403 });
  }
  const body = await req.json();
  const r = await fetch(`${API_BASE_URL}/auth/2fa/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId: body.challengeId, code: body.code }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json(data, { status: r.status });

  const res = NextResponse.json({ user: data.user });
  setSessionCookies(res, data.access, data.refresh);
  return res;
}
