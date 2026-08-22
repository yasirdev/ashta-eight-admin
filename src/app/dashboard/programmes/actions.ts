"use server";

import { apiFetch } from "@/lib/api";

// Programme copy editor (G-1). Mirrors the content actions' Result shape: a rejected
// fetch becomes a Result, never a throw, so the form's busy state can't strand.
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

// The exact — and only — write surface (contracts §Admin/programmes). `tierRank`,
// price, `stripePriceId` and `isActive` are deliberately absent: this is a copy editor,
// not a tier manager. `features` is REPLACE-WHOLE-ARRAY — sending it replaces the list
// in order; omitting it leaves it untouched.
export type ProgrammePatch = {
  name?: string;
  // null clears the field (backend PATCH schema is .nullable()).
  description?: string | null;
  features?: string[];
};

// PATCH /admin/programmes/:id — the DB `programmes_features_valid` CHECK (≤8 / no
// null / no blank) is the floor; a blank row that slips past the client comes back as a
// 4xx which call() surfaces verbatim rather than swallowing.
export async function updateProgramme(
  id: string,
  body: ProgrammePatch,
): Promise<Result<{ programme: { id: string } }>> {
  return call(`/admin/programmes/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}
