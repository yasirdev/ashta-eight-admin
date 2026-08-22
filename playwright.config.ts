import { defineConfig } from "@playwright/test";

// Browser E2E for the Admin Command Centre.
//
// WHY THIS EXISTS: the admin had ZERO automated tests and no browser had ever driven it —
// carried since admin M2 as "2FA blocks headless e2e". That turned out to be an assumption,
// not a fact: TOTP codes are deterministic and computable from the secret (`/auth/2fa/setup`
// returns it), so 2FA is testable — see e2e/auth.spec.ts, which enrols 2FA and logs in
// THROUGH it. The real gap was that nobody had written the test.
//
// It drives the REAL Next.js app against the REAL backend and Postgres. Everything below the
// browser is already covered by backend `npm run qa`; this covers the part that only exists
// in a browser — hydration, the two-step 2FA form, redirects, and the session cookie.
export default defineConfig({
  testDir: "./e2e",
  // Serial: the specs share one admin account and mutate its 2FA enrolment.
  workers: 1,
  fullyParallel: false,
  // A failing E2E must be a real failure, not a flake someone learns to ignore.
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.ADMIN_BASE_URL ?? "http://localhost:3000",
    // Use the Chrome already installed on the machine instead of downloading a private
    // Chromium — CI can drop `channel` to get Playwright's own browser.
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  // NOT auto-started: these tests need the backend + Postgres too, and silently booting
  // half the stack hides which half is broken. `npm run test:e2e` documents the
  // prerequisites and fails loudly if they are absent.
});
