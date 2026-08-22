import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { ClientsFilters } from "@/components/clients-filters";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ClientSummary = {
  id: string;
  displayName: string | null;
  email: string;
  phone: string | null;
  tier: number;
  status: string;
  joinDate: string | null;
  lastActive: string | null;
  totalSpendMinor: number;
};

type SearchParams = { page?: string; search?: string; tier?: string; status?: string };

const LIMIT = 20;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  // Server-side pagination + filtering — pass params straight through to the API.
  const query = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (sp.search) query.set("search", sp.search);
  if (sp.tier) query.set("tier", sp.tier);
  if (sp.status) query.set("status", sp.status);

  const res = await apiFetch(`/admin/clients?${query.toString()}`);

  if (!res.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-sm text-destructive">
          Failed to load clients ({res.status}). Check the backend is running and try again.
        </p>
      </div>
    );
  }

  const data = (await res.json()) as {
    items: ClientSummary[];
    page: number;
    limit: number;
    total: number;
  };
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  // Preserve active filters across pagination links.
  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (sp.search) q.set("search", sp.search);
    if (sp.tier) q.set("tier", sp.tier);
    if (sp.status) q.set("status", sp.status);
    q.set("page", String(p));
    return `/dashboard/clients?${q.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <span className="text-sm text-muted-foreground">{data.total} total</span>
      </div>

      <ClientsFilters search={sp.search ?? ""} tier={sp.tier ?? ""} status={sp.status ?? ""} />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead className="text-right">Total spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No clients match these filters.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/dashboard/clients/${c.id}`} className="block hover:underline">
                      <span className="font-medium">{c.displayName || "—"}</span>
                      <span className="block text-xs text-muted-foreground">{c.email}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell>{c.status === "none" ? "—" : c.tier}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>{formatDate(c.joinDate)}</TableCell>
                  <TableCell>{formatDate(c.lastActive)}</TableCell>
                  <TableCell className="text-right">{formatMoney(c.totalSpendMinor)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Page {data.page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Previous
            </Link>
          ) : (
            <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
              Previous
            </span>
          )}
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Next
            </Link>
          ) : (
            <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
