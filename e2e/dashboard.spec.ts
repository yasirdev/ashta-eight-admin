import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, disable2fa } from "./helpers";

// Covers what only exists in a browser: that every R1 page actually renders for a real
// session, that the nav works, and that no page 500s. Everything below the browser is
// already covered by backend `npm run qa` — this is deliberately not a second API suite.
//
// Runs WITHOUT 2FA (the seed's shipped state) — auth.spec.ts owns the 2FA flow, and
// re-enrolling per test would only make these slower without testing anything new.

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

test.describe("dashboard", () => {
  test("every R1 nav destination renders — no 500, no error boundary", async ({ page }) => {
    const failures: string[] = [];
    page.on("response", (r) => {
      // Document-level 5xx only: a data fetch degrading is a page's own business.
      if (r.status() >= 500 && r.request().resourceType() === "document") {
        failures.push(`${r.status()} ${r.url()}`);
      }
    });
    await login(page);

    // Every entry in the R1 nav (dashboard/layout.tsx NAV).
    for (const [href, heading] of [
      ["/dashboard", "Overview"],
      ["/dashboard/clients", "Clients"],
      ["/dashboard/billing", "Billing"],
      ["/dashboard/content", "Content"],
      ["/dashboard/programmes", "Programmes"],
      ["/dashboard/coaching", "Coaching"],
      ["/dashboard/leads", "Leads"],
      ["/dashboard/security", "Two-factor authentication"],
    ] as const) {
      await page.goto(href);
      await expect(page.getByRole("heading", { name: new RegExp(heading, "i") }).first()).toBeVisible();
    }
    expect(failures, `pages returned 5xx: ${failures.join(", ")}`).toHaveLength(0);
  });

  test("sidebar navigation works and marks the current section", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Clients" }).click();
    await expect(page).toHaveURL(/\/dashboard\/clients/);
    // aria-current is the accessible signal the active state is built on (nav-link.tsx).
    await expect(page.getByRole("link", { name: "Clients" })).toHaveAttribute("aria-current", "page");
    // /dashboard must match EXACTLY, or Overview would light up on every page.
    await expect(page.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current", "page");
  });

  test("overview renders headline tiles with real values", async ({ page }) => {
    await login(page);
    // The zero-state is the real state on a clean DB — it must read as a real zero, not a
    // blank tile or a crash.
    await expect(page.getByText("MRR")).toBeVisible();
    // "Active members" appears twice — the stat tile and the Programmes card's subtitle.
    // Assert the tile specifically rather than loosening to .first(), which would pass even
    // if the tile vanished.
    await expect(page.getByText("Active members", { exact: true })).toBeVisible();
    await expect(page.getByText(/£[\d,]+\.\d{2}/).first()).toBeVisible();
  });

  test("no page leaks a stack trace or an unhandled error into the DOM", async ({ page }) => {
    await login(page);
    for (const href of ["/dashboard", "/dashboard/clients", "/dashboard/billing", "/dashboard/content"]) {
      await page.goto(href);
      // innerText, NOT textContent: textContent includes <script> contents, and Next's
      // dev-mode RSC payload embeds "node_modules/next/dist/…" — which made this probe fire
      // on every healthy page. A user only ever sees rendered text.
      const body = await page.locator("body").innerText();
      expect(body, `${href} leaked a stack trace`).not.toMatch(/at \/|node_modules|\.ts:\d+:\d+/);
      expect(body, `${href} rendered the error boundary`).not.toMatch(/Something went wrong|Application error/i);
    }
  });
});
