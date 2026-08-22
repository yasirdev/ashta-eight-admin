"use server";

import { apiFetch } from "@/lib/api";

// Content ops need the response body back (objectKey, new content id), so unlike
// the clients actions this returns data, not just ok/error. Rejected fetch →
// Result, never a throw (a throw would strand the caller's busy state).
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

// POST /admin/uploads/presign — 5-min presigned S3 PUT. 503 when S3 unconfigured
// (surfaced to the admin verbatim), so the upload path degrades cleanly until infra.
export async function presignUpload(input: {
  filename: string;
  contentType: string;
  category: "audio" | "image" | "asset";
  sizeBytes: number;
}): Promise<Result<{ uploadUrl: string; objectKey: string; expiresAt: string }>> {
  return call("/admin/uploads/presign", { method: "POST", body: JSON.stringify(input) });
}

// POST /admin/uploads/video-upload-url — Mux direct-upload. 503 when Mux unconfigured.
export async function videoUploadUrl(
  filename: string,
): Promise<Result<{ uploadUrl: string; provider: string; pendingRef: string }>> {
  return call("/admin/uploads/video-upload-url", { method: "POST", body: JSON.stringify({ filename }) });
}

export type ContentInput = {
  type: "video" | "audio";
  pillar: "align" | "sculpt" | "evolve";
  title: string;
  // null clears the field on PATCH (backend edit schema is .nullable()); create
  // never sends null (the form omits blanks on create).
  description?: string | null;
  requiredTierRank: number;
  s3Key?: string;
  videoRef?: string;
  durationSeconds?: number | null;
  weekNumber?: number | null;
  offlineDownloadable?: boolean;
  // Artwork/thumbnail key issued by /admin/uploads/presign (category "image").
  thumbnailObjectKey?: string | null;
};

// POST /admin/content — the backend enforces the video↔videoRef / audio↔s3Key XOR.
export async function createContent(body: ContentInput): Promise<Result<{ content: { id: string } }>> {
  return call("/admin/content", { method: "POST", body: JSON.stringify(body) });
}

// PATCH /admin/content/:id — partial. `type` is immutable server-side (not sent).
export async function updateContent(
  id: string,
  body: Partial<Omit<ContentInput, "type">>,
): Promise<Result<{ content: { id: string } }>> {
  return call(`/admin/content/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

// POST /admin/content/:id/publish {publish} — sets/clears published_at.
export async function publishContent(id: string, publish: boolean): Promise<Result> {
  return call(`/admin/content/${id}/publish`, { method: "POST", body: JSON.stringify({ publish }) });
}

// DELETE /admin/content/:id.
export async function deleteContent(id: string): Promise<Result> {
  return call(`/admin/content/${id}`, { method: "DELETE" });
}
