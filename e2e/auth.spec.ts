import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  createMember,
  deleteMember,
  disable2fa,
  enable2fa,
  totp,
} from "./helpers";

// The gap this closes: no browser had ever driven this app, and 2FA was the stated reason.
// It wasn't the reason — a TOTP code is computable — so these drive the REAL two-step login
// with 2FA ENROLLED, which is the production configuration (CLAUDE.md §6: admin 2FA).

test.describe("admin login", () => {
  test.afterAll(async () => {
    // Leave the admin as the seed ships it: no 2FA. Otherwise every later run — and any
    // human logging in — needs an authenticator for a secret only this file ever saw.
    await disable2fa();
  });

  test("rejects a wrong password without leaking whether the account exists", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill("definitely-wrong");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid|incorrect|unauthor/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("no session ⇒ /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("password + TOTP → dashboard (the flow nothing had ever driven)", async ({ page }) => {
    const secret = await enable2fa();

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Step 2 must appear — if 2FA were skippable for an enrolled admin, that is a hole.
    await expect(page.getByLabel(/6-digit code/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });

    await page.getByLabel(/6-digit code/i).fill(totp(secret));
    await page.getByRole("button", { name: /verify|sign in|continue/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  test("an enrolled admin cannot skip the code with a wrong one", async ({ page }) => {
    const secret = await enable2fa();
    void secret;

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByLabel(/6-digit code/i)).toBeVisible();

    await page.getByLabel(/6-digit code/i).fill("000000");
    await page.getByRole("button", { name: /verify|sign in|continue/i }).click();

    // Must stay out. 000000 is a valid-shaped code, so this proves verification, not format.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid|incorrect/i)).toBeVisible();
  });

  test("a logged-in MEMBER is bounced from the admin (role gate)", async ({ page }) => {
    // The gap carried from admin M1: a member authenticates with valid creds (the proxy's
    // freshness check passes them), so without the role gate they'd see the admin chrome
    // render. The backend 403s every /admin/* call regardless, so this is the cosmetic
    // layer — but it must hold, and it had never been tested because nothing checked role.
    const member = await createMember();
    try {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(member.email);
      await page.getByLabel(/password/i).fill(member.password);

      // WAIT for the login POST to actually establish the session before testing the gate.
      // Without this the test races: `toHaveURL(/login/)` would match trivially on the
      // page's initial /login URL — before the member session cookie exists — so it would
      // pass whether or not the gate exists (it'd really be re-testing "no session bounces").
      // Confirmed by mutation: only after this wait does removing the gate fail the test.
      const [loginRes] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/api/auth/login") && r.request().method() === "POST"),
        page.getByRole("button", { name: /sign in/i }).click(),
      ]);
      expect(loginRes.ok(), "member login itself should succeed — the gate is downstream").toBeTruthy();

      // Session now genuinely exists. Navigate to the admin as an authenticated MEMBER.
      // The server-side gate must redirect (full nav, so the layout runs) — not the
      // no-session path.
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: "Overview" })).toHaveCount(0);
    } finally {
      await deleteMember(member.email);
    }
  });

  test("sign out clears the session — back does not resurrect it", async ({ page }) => {
    const secret = await enable2fa();
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.getByLabel(/6-digit code/i).fill(totp(secret));
    await page.getByRole("button", { name: /verify|sign in|continue/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // The httpOnly cookie must be gone, not merely navigated away from.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
