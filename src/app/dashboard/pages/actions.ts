"use server";

import { apiFetch } from "@/lib/api";

// CR-008 info-page editor. Same Result shape as the content/programmes actions: a
// rejected fetch becomes a Result, never a throw, so the form's busy state can't strand.
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

export type PagePatch = { title: string; bodyHtml: string; isPublished: boolean };

// PUT /admin/pages/:slug — upsert. The backend sanitizes bodyHtml before storage.
export async function updatePage(
  slug: string,
  body: PagePatch,
): Promise<Result<{ page: { slug: string } }>> {
  return call(`/admin/pages/${slug}`, { method: "PUT", body: JSON.stringify(body) });
}
