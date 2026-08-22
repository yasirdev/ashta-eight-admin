"use server";

import { apiFetch } from "@/lib/api";

type Result = { ok: true } | { ok: false; error: string };

// Admin API write + the standard {error:{code,message}} envelope (contracts §3)
// unwrapped to a flat message. Callers render it; the backend is the authority on
// what's allowed (requireAdmin + RLS), so a 403/409 here is surfaced, not guessed at.
// A rejected fetch (backend unreachable) must come back as a Result, not a throw:
// a throw here rejects the caller's `await`, so its `setBusy(false)` never runs and
// the buttons latch disabled with no message — and an event-handler rejection never
// reaches error.tsx. Guarded once here, so all four actions are covered.
async function send(path: string, method: "POST" | "PATCH", body: unknown): Promise<Result> {
  try {
    const res = await apiFetch(path, { method, body: JSON.stringify(body) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data?.error?.message ?? `Request failed (${res.status})` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check it's running and try again." };
  }
}

// PATCH /admin/clients/:id {phone?, notes?}. Admin-only (enforced server-side).
export async function updateClient(
  id: string,
  input: { phone?: string; notes?: string },
): Promise<Result> {
  return send(`/admin/clients/${id}`, "PATCH", input);
}

// POST /admin/clients/:id/subscription/pause {subscriptionId} — 409 unless active.
export async function pauseSubscription(id: string, subscriptionId: string): Promise<Result> {
  return send(`/admin/clients/${id}/subscription/pause`, "POST", { subscriptionId });
}

// POST /admin/clients/:id/subscription/cancel {subscriptionId} — cancels at period
// end; 409 unless active/past_due/paused.
export async function cancelSubscription(id: string, subscriptionId: string): Promise<Result> {
  return send(`/admin/clients/${id}/subscription/cancel`, "POST", { subscriptionId });
}

// POST /admin/billing/:id/refund {amountMinor?} — full refund when amountMinor is
// omitted. R1 allows ONE refund per charge (any refund marks the original
// 'refunded'), so a second attempt 409s — the backend is the guard, not this.
export async function refundBilling(billingId: string, amountMinor?: number): Promise<Result> {
  return send(`/admin/billing/${billingId}/refund`, "POST", amountMinor ? { amountMinor } : {});
}

// POST /admin/clients/:id/subscription/change {programmeId} — upgrade/downgrade the
// client's current active sub; 409 if they have none. The backend picks the target
// sub (most recent active), so this is a client-level action, not a per-row one.
export async function changeProgramme(id: string, programmeId: string): Promise<Result> {
  return send(`/admin/clients/${id}/subscription/change`, "POST", { programmeId });
}

// ── Account controls (member-only, enforced server-side) ──────────────────────
// POST /admin/clients/:id/disable — block login (reversible) + revoke sessions.
export async function disableClient(id: string): Promise<Result> {
  return send(`/admin/clients/${id}/disable`, "POST", {});
}
// POST /admin/clients/:id/enable — lift the block.
export async function enableClient(id: string): Promise<Result> {
  return send(`/admin/clients/${id}/enable`, "POST", {});
}
// POST /admin/clients/:id/logout — force logout (revoke all sessions); login still allowed.
export async function forceLogoutClient(id: string): Promise<Result> {
  return send(`/admin/clients/${id}/logout`, "POST", {});
}
// POST /admin/clients/:id/delete — soft-delete (mark deleted + revoke sessions); login blocked.
export async function deleteClient(id: string): Promise<Result> {
  return send(`/admin/clients/${id}/delete`, "POST", {});
}
