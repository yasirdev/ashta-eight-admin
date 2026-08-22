import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, disable2fa } from "./helpers";

// G-1 programme copy editor. Covers what only exists in a browser: that the page renders
// for a real authenticated admin session, and that a feature edit round-trips through
// PATCH /admin/programmes/:id and back out of GET /admin/programmes. Everything below the
// browser is covered by backend `npm run qa` — this is deliberately not a second API suite.
//
// Runs WITHOUT 2FA (the seed's shipped state) — auth.spec.ts owns the 2FA flow. The
// round-trip test appends then removes one feature, so it leaves the seed as it found it
// and re-runs stay idempotent.

test.beforeAll(async () => {
  await disable2fa();
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// The ordered feature inputs (programme-form.tsx labels them "Feature 1", "Feature 2", …).
const featureInputs = (page: import("@playwright/test").Page) =>
  page.getByRole("textbox", { name: /^Feature \d+$/ });

test.describe("programmes", () => {
  test("list renders the seeded tiers for an authenticated admin", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/programmes");
    await expect(page.getByRole("heading", { name: /programmes/i })).toBeVisible();
    // The seed ships a fixed four tiers; at least one Edit action must be present.
    await expect(page.getByRole("link", { name: /edit/i }).first()).toBeVisible();
  });

  test("a feature edit round-trips through the API", async ({ page }) => {
    const marker = `E2E feature ${Date.now()}`;
    await login(page);
    await page.goto("/dashboard/programmes");

    // Edit the first tier.
    await page.getByRole("link", { name: /edit/i }).first().click();
    await expect(page.getByRole("heading", { name: /edit programme/i })).toBeVisible();
    const before = await featureInputs(page).count();

    // Append a feature row, fill it with a unique marker, save.
    await page.getByRole("button", { name: /add feature/i }).click();
    await featureInputs(page).last().fill(marker);
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/programmes$/);

    // Re-open the same tier: the server must have persisted the marker as the last row.
    await page.getByRole("link", { name: /edit/i }).first().click();
    await expect(featureInputs(page)).toHaveCount(before + 1);
    await expect(featureInputs(page).last()).toHaveValue(marker);

    // Clean up: remove the marker row (it's the last one) and save.
    await page.getByRole("button", { name: /^Remove feature/ }).last().click();
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/programmes$/);

    // Confirm the cleanup stuck — back to the original count.
    await page.getByRole("link", { name: /edit/i }).first().click();
    await expect(featureInputs(page)).toHaveCount(before);
  });
});
