import { redirect } from "next/navigation";
import { getUser } from "@/lib/api";
import { LogoutButton } from "@/components/logout-button";
import { NavLink } from "@/components/nav-link";

// R1 nav. Module 3 (subscription controls) lives inside the client profile, so
// it has no top-level entry. R2 modules are shells (see /dashboard/*).
// Mirrors backend auth/middleware.ts requireAdmin. R1 ships `administrator` only; the R2
// staff roles are listed so this gate needs no change when they arrive.
const STAFF_ROLES = ["administrator", "coach", "content_manager", "pa"];

const NAV = [
  { href: "/dashboard", label: "Overview" }, // Module 7 — business dashboard
  { href: "/dashboard/clients", label: "Clients" }, // Module 2 (+ Module 3 within)
  { href: "/dashboard/billing", label: "Billing" }, // Module 4
  { href: "/dashboard/content", label: "Content" }, // Module 5
  { href: "/dashboard/programmes", label: "Programmes" }, // G-1 copy editor
  { href: "/dashboard/coaching", label: "Coaching" }, // Module 6
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/pages", label: "Pages" }, // CR-008 privacy/terms/about
  { href: "/dashboard/faq", label: "FAQ" }, // CR-008 Help Center
  { href: "/dashboard/security", label: "Security (2FA)" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy already refreshed the token; verify the session via GET /me and
  // fetch the user for the header. Defensive redirect if it somehow fails.
  const user = await getUser();
  if (!user) redirect("/login");

  // Role gate (carried from admin M1). The backend refuses every /admin/* call from a
  // non-staff session with 403, so this is not the security boundary — it stops a
  // logged-in MEMBER from seeing the admin chrome render at all (they authenticate with
  // valid member credentials, so the proxy's freshness check passes them through).
  // Mirrors the backend's requireAdmin staff set EXACTLY (auth/middleware.ts) so the two
  // never disagree; the R2 roles are already listed there and pass here for free.
  // login/page.tsx only redirects to /dashboard on a fresh submit, not on mount, so
  // bouncing a member to /login cannot loop.
  if (!STAFF_ROLES.includes(user.role)) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="mb-8 px-2">
          <div className="font-heading text-lg font-medium tracking-wide">Ashta Eight</div>
          {/* The brand's own tagline, set in gold — the one accent the mark carries. */}
          <div className="mt-0.5 text-[0.6875rem] tracking-[0.18em] text-sidebar-primary uppercase">
            Align · Sculpt · Evolve
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        <div className="mt-auto px-2 text-[0.6875rem] text-sidebar-foreground/40">
          Command Centre
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <span className="text-sm text-muted-foreground">
            {user.email} · {user.role}
          </span>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
