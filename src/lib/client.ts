// Client-side POST to our own route handlers. Unwraps the contract error
// envelope { error: { code, message } } into a thrown Error.

// basePath is NOT applied to fetch() by Next — only to <Link>, router and
// next/image — so prefix our own relative paths here. Read from the SAME env
// var next.config.ts uses so config + client can't drift.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Prefix only relative paths ("/..."); absolute URLs (http://, presigned) pass through.
function withBasePath(url: string): string {
  return url.startsWith("/") ? `${BASE_PATH}${url}` : url;
}

export async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(withBasePath(url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Something went wrong. Please try again.");
  }
  return data as T;
}
