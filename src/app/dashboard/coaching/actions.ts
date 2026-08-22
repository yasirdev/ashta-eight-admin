"use server";

import { apiFetch } from "@/lib/api";

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };

async function call<T = null>(path: string, init: RequestInit): Promise<Result<T>> {
  try {
    const res = await apiFetch(path, init);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return { ok: false, error: d?.error?.message ?? `Request failed (${res.status})` };
    }
    const data = (await res.json().catch(() => null)) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check it's running and try again." };
  }
}

// ── Coaching slots ─────────────────────────────────────────────────────────────
// startsAt/endsAt are ISO strings (the client converts datetime-local → ISO).
export async function createSlot(input: {
  startsAt: string;
  endsAt: string;
  capacity?: number;
}): Promise<Result> {
  return call("/admin/coaching/slots", { method: "POST", body: JSON.stringify(input) });
}

// PATCH — status change (open/full/closed) is the R1 availability control. Editing
// a slot's time is delete-then-recreate (kept the surface small; PATCH supports more).
export async function updateSlot(id: string, status: "open" | "full" | "closed"): Promise<Result> {
  return call(`/admin/coaching/slots/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
}

// 409 has_bookings when active bookings exist (surfaced verbatim).
export async function deleteSlot(id: string): Promise<Result> {
  return call(`/admin/coaching/slots/${id}`, { method: "DELETE" });
}

// ── Live-cohort sessions ───────────────────────────────────────────────────────
// POST generates a shared Zoom link (best-effort — session still creates if Zoom
// is unconfigured, just without a join URL).
export async function createSession(input: {
  batch: "batch_1" | "batch_2";
  title?: string;
  startsAt: string;
  endsAt?: string;
}): Promise<Result> {
  return call("/admin/live-cohort/sessions", { method: "POST", body: JSON.stringify(input) });
}

// Reschedule is delete-then-recreate in R1 (regenerates the Zoom link), so there's
// no session PATCH wrapper — add one if in-place edit is needed later.
export async function deleteSession(id: string): Promise<Result> {
  return call(`/admin/live-cohort/sessions/${id}`, { method: "DELETE" });
}
