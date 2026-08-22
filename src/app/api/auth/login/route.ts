import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";
import { setSessionCookies, sameOrigin } from "@/lib/cookies";

// POST /auth/login {email,password} → {access,refresh,user} OR
// {twoFactorRequired,challengeId}. Tokens land in httpOnly cookies; the client
// only ever sees {user} or the 2FA challenge.
export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Bad origin" } }, { status: 403 });
  }
  const body = await req.json();
  const r = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json(data, { status: r.status });

  if (data.twoFactorRequired) {
    return NextResponse.json({ twoFactorRequired: true, challengeId: data.challengeId });
  }

  const res = NextResponse.json({ user: data.user });
  setSessionCookies(res, data.access, data.refresh);
  return res;
}
