import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { sameOrigin } from "@/lib/cookies";

// POST /auth/2fa/enable {code} (admin) → {ok}. Activates the pending secret.
export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Bad origin" } }, { status: 403 });
  }
  const body = await req.json();
  const r = await apiFetch("/auth/2fa/enable", {
    method: "POST",
    body: JSON.stringify({ code: body.code }),
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
