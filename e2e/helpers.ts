import { generateSync } from "otplib";

// Shared E2E helpers. These talk to the BACKEND directly to arrange state (enrol/clear 2FA),
// then the specs drive the browser through the admin UI.

export const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export const ADMIN_EMAIL = "admin@ashta-eight.com";
export const ADMIN_PASSWORD = "ChangeMe!2026";

type LoginResult = { access?: string; twoFactorRequired?: boolean; challengeId?: string };

// Register a throwaway MEMBER (default role) so the admin role gate can be tested against a
// real, valid, non-staff session — not a synthetic token. Returns its credentials; the
// caller removes it. A member has valid creds, so the proxy's freshness check passes them
// through to the dashboard layout, which is exactly where the role gate must catch them.
export async function createMember(): Promise<{ email: string; password: string }> {
  const email = `e2e-member-${Date.now()}@example.com`;
  const password = "MemberPass!2026";
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`member register failed: ${res.status} ${await res.text()}`);
  return { email, password };
}

export async function deleteMember(email: string): Promise<void> {
  const { execSync } = await import("node:child_process");
  // Parameterless template kept simple; email is generated locally (no injection surface).
  execSync(
    `cd ../backend && set -a && . ./.env && set +a && psql "\${DATABASE_URL%%\\?*}" -q -c ` +
      `"DELETE FROM auth_identities WHERE user_id=(SELECT id FROM users WHERE email='${email}'); ` +
      `DELETE FROM refresh_tokens WHERE user_id=(SELECT id FROM users WHERE email='${email}'); ` +
      `DELETE FROM verification_tokens WHERE user_id=(SELECT id FROM users WHERE email='${email}'); ` +
      `DELETE FROM users WHERE email='${email}';"`,
    { shell: "/bin/zsh", stdio: "pipe" },
  );
}

export async function apiLogin(email = ADMIN_EMAIL, password = ADMIN_PASSWORD): Promise<LoginResult> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return (await res.json()) as LoginResult;
}

// The whole point: a TOTP code is a pure function of (secret, time). "2FA blocks headless
// e2e" was never true — the secret is returned by /auth/2fa/setup, and this is the same
// otplib the backend verifies with (`verifySync`), so a generated code is a real one.
export const totp = (secret: string): string => generateSync({ secret });

// Enrol 2FA on the admin and return the secret.
//
// Clears any existing enrolment FIRST — not defensiveness, necessity: once 2FA is enabled,
// password login correctly returns `{twoFactorRequired}` and NO access token, so /2fa/setup
// (which needs a bearer) becomes unreachable by password alone. That is the system behaving
// properly; it just means this helper cannot bootstrap from an already-enrolled account.
// Discovered by the second spec failing on exactly that.
export async function enable2fa(): Promise<string> {
  await disable2fa();
  const { access } = await apiLogin();
  if (!access) throw new Error("cannot enrol 2FA: password login did not return a token");
  const auth = { authorization: `Bearer ${access}`, "content-type": "application/json" };

  const setup = await fetch(`${API}/auth/2fa/setup`, { method: "POST", headers: auth });
  const { secret } = (await setup.json()) as { secret: string };
  if (!secret) throw new Error("2FA setup returned no secret");

  const enable = await fetch(`${API}/auth/2fa/enable`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ code: totp(secret) }),
  });
  if (!enable.ok) throw new Error(`2FA enable failed: ${enable.status} ${await enable.text()}`);
  return secret;
}

// Remove 2FA so the suite leaves the admin exactly as it found it (the seed ships without
// it). Uses the service DB path via the backend's own API where possible; falls back to a
// direct delete because there is no "disable 2FA" endpoint in R1 — which is itself worth
// knowing: an admin who loses their authenticator has no self-serve recovery.
export async function disable2fa(): Promise<void> {
  const { execSync } = await import("node:child_process");
  execSync(
    `cd ../backend && set -a && . ./.env && set +a && psql "\${DATABASE_URL%%\\?*}" -q -c ` +
      `"DELETE FROM two_factor_secrets WHERE user_id = (SELECT id FROM users WHERE email='${ADMIN_EMAIL}');"`,
    { shell: "/bin/zsh", stdio: "pipe" },
  );
}
