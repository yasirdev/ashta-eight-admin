// Client-side POST to our own route handlers. Unwraps the contract error
// envelope { error: { code, message } } into a thrown Error.
export async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
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
