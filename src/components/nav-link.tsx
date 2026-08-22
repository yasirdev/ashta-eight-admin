"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Client-only so the sidebar can mark the current section; the layout itself
// stays a server component (it awaits getUser). Kept to just this link.
export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  // /dashboard is only active exactly; the rest match their subtree, so
  // /dashboard/clients/<id> keeps Clients lit.
  const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-2 py-2 text-sm transition-colors duration-200",
        "focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:outline-none",
        active
          ? "bg-sidebar-accent text-sidebar-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {label}
    </Link>
  );
}
