import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { sameOrigin } from "@/lib/cookies";

// POST /auth/2fa/setup (admin) → {otpauthUrl, secret}. Provisions an
// unconfirmed TOTP secret; not active until /enable.
export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Bad origin" } }, { status: 403 });
  }
  const r = await apiFetch("/auth/2fa/setup", { method: "POST", body: "{}" });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
