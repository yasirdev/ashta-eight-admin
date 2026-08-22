import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { BillingFilters, type ProgrammeChoice } from "@/components/billing-filters";
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

// Cross-client money ledger. Row carries client identity via the 2026-07-16
// admin-billing extension (contracts §3).
type BillingRow = {
  id: string;
  amountMinor: number;
  currency: string;
  status: string;
  description: string | null;
  invoiceUrl: string | null;
  programmeId: string | null;
  occurredAt: string;
  user: { id: string; displayName: string | null; email: string } | null;
};

type SearchParams = { page?: string; from?: string; to?: string; programmeId?: string };

const LIMIT = 25;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const query = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (sp.from) query.set("from", sp.from);
  if (sp.to) query.set("to", sp.to);
  if (sp.programmeId) query.set("programmeId", sp.programmeId);

  // Ledger + programmes (for the filter dropdown and id→name mapping) in parallel.
  // Programmes are non-fatal — the ledger still renders, just with id fallbacks.
  const [res, programmesRes] = await Promise.all([
    apiFetch(`/admin/billing?${query.toString()}`),
    apiFetch("/programmes").catch(() => null),
  ]);

  if (!res.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-destructive">
          Failed to load billing ({res.status}). Check the backend is running and try again.
        </p>
      </div>
    );
  }

  const data = (await res.json()) as {
    items: BillingRow[];
    page: number;
    limit: number;
    total: number;
  };
  const programmes: ProgrammeChoice[] = programmesRes?.ok
    ? ((await programmesRes.json()) as { items: ProgrammeChoice[] }).items
    : [];
  const programmeName = new Map(programmes.map((p) => [p.id, p.name]));

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (sp.from) q.set("from", sp.from);
    if (sp.to) q.set("to", sp.to);
    if (sp.programmeId) q.set("programmeId", sp.programmeId);
    q.set("page", String(p));
    return `/dashboard/billing?${q.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <span className="text-sm text-muted-foreground">{data.total} records</span>
      </div>

      {/* `to` is an exclusive, date-only upper bound (backend uses `lt`): a charge
          timestamped on the `to` day itself is excluded. Fine at day granularity. */}
      <BillingFilters
        from={sp.from ?? ""}
        to={sp.to ?? ""}
        programmeId={sp.programmeId ?? ""}
        programmes={programmes}
      />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Programme</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No billing records match these filters.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{formatDate(b.occurredAt)}</TableCell>
                  <TableCell>
                    {b.user ? (
                      <Link href={`/dashboard/clients/${b.user.id}`} className="hover:underline">
                        <span className="font-medium">{b.user.displayName || b.user.email}</span>
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.programmeId ? programmeName.get(b.programmeId) ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.description ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(b.amountMinor, b.currency)}</TableCell>
                  <TableCell className="text-right">
                    {b.invoiceUrl ? (
                      <a
                        href={b.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline"
                      >
                        View
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
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
