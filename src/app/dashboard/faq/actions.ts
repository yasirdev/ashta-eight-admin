"use server";

import { apiFetch } from "@/lib/api";

// CR-008 Help-Center FAQ CRUD. Same Result shape as the other admin actions.
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

export type FaqInput = {
  question: string;
  answerHtml: string;
  position?: number;
  isPublished?: boolean;
};

// POST /admin/faqs — the backend sanitizes answerHtml before storage.
export async function createFaq(body: FaqInput): Promise<Result<{ faq: { id: string } }>> {
  return call("/admin/faqs", { method: "POST", body: JSON.stringify(body) });
}

// PATCH /admin/faqs/:id — partial update.
export async function updateFaq(
  id: string,
  body: Partial<FaqInput>,
): Promise<Result<{ faq: { id: string } }>> {
  return call(`/admin/faqs/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

// DELETE /admin/faqs/:id.
export async function deleteFaq(id: string): Promise<Result> {
  return call(`/admin/faqs/${id}`, { method: "DELETE" });
}
