// Server-only backend client. Reads the httpOnly access cookie and attaches it
// as a Bearer header. Use from Server Components and route handlers. The proxy
// keeps the access token fresh before these run.
import { cookies } from "next/headers";
import { API_BASE_URL, ACCESS_COOKIE } from "./config";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(access ? { authorization: `Bearer ${access}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
}

// {user} per contract §3 /me. Returns null when unauthenticated/expired.
export async function getUser(): Promise<{ id: string; email: string; displayName: string | null; role: string } | null> {
  try {
    const res = await apiFetch("/me");
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}
