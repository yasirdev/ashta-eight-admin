import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
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

// Admin programme row (serializeProgrammeAdmin — the public shape plus the two internal
// fields staff need). No `create` / `delete`: R1 seeds a fixed four tiers and this screen
// is a copy editor, not CRUD.
type ProgrammeRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tierRank: number;
  priceMinor: number;
  currency: string;
  billingInterval: string;
  features: string[];
  isActive: boolean;
  stripePriceId: string | null;
};

type SearchParams = { page?: string };

const LIMIT = 25;

export default async function ProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const query = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  const res = await apiFetch(`/admin/programmes?${query.toString()}`);

  if (!res.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Programmes</h1>
        <p className="text-sm text-destructive">
          Failed to load programmes ({res.status}). Check the backend is running and try again.
        </p>
      </div>
    );
  }

  const data = (await res.json()) as {
    items: ProgrammeRow[];
    page: number;
    limit: number;
    total: number;
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  const pageHref = (p: number) => `/dashboard/programmes?page=${p}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Programmes</h1>
        <span className="text-sm text-muted-foreground">{data.total} tiers</span>
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground">
        The membership tiers and the feature bullets shown on their cards. Edit the name,
        description and feature list here — price, tier and Stripe are fixed and managed elsewhere.
      </p>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Features</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No programmes found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">{p.code}</span>
                  </TableCell>
                  <TableCell className="text-sm">Tier {p.tierRank}</TableCell>
                  <TableCell className="text-sm">
                    {formatMoney(p.priceMinor, p.currency)}
                    <span className="text-muted-foreground"> / {p.billingInterval}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.features.length === 0
                      ? "None yet"
                      : `${p.features.length} feature${p.features.length === 1 ? "" : "s"}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? "default" : "secondary"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/programmes/${p.id}/edit`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Edit
                    </Link>
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
