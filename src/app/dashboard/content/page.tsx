import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import { tierLabel, type Programme } from "@/lib/tier";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ContentFilters } from "@/components/content-filters";
import { ContentRowActions } from "@/components/content-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Admin content row (serializeContentAdmin — incl. drafts + internal refs).
type ContentRow = {
  id: string;
  type: "video" | "audio";
  pillar: string;
  title: string;
  requiredTierRank: number;
  durationSeconds: number | null;
  offlineDownloadable: boolean;
  weekNumber: number | null;
  publishedAt: string | null;
};

type SearchParams = { page?: string; pillar?: string; type?: string; published?: string };

const LIMIT = 25;

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const query = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (sp.pillar) query.set("pillar", sp.pillar);
  if (sp.type) query.set("type", sp.type);
  if (sp.published) query.set("published", sp.published);

  const [res, programmesRes] = await Promise.all([
    apiFetch(`/admin/content?${query.toString()}`),
    apiFetch("/programmes").catch(() => null),
  ]);

  if (!res.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Content</h1>
        <p className="text-sm text-destructive">
          Failed to load content ({res.status}). Check the backend is running and try again.
        </p>
      </div>
    );
  }

  const data = (await res.json()) as {
    items: ContentRow[];
    page: number;
    limit: number;
    total: number;
  };
  const programmes: Programme[] = programmesRes?.ok
    ? ((await programmesRes.json()) as { items: Programme[] }).items
    : [];

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (sp.pillar) q.set("pillar", sp.pillar);
    if (sp.type) q.set("type", sp.type);
    if (sp.published) q.set("published", sp.published);
    q.set("page", String(p));
    return `/dashboard/content?${q.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Content</h1>
        <Link href="/dashboard/content/new" className={buttonVariants({ size: "sm" })}>
          New content
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4">
        <ContentFilters pillar={sp.pillar ?? ""} type={sp.type ?? ""} published={sp.published ?? ""} />
        <span className="text-sm text-muted-foreground">{data.total} items</span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Pillar</TableHead>
              <TableHead>Required tier</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No content matches these filters.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="font-medium">{c.title}</span>
                    {c.weekNumber != null && (
                      <span className="block text-xs text-muted-foreground">Week {c.weekNumber}</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{c.type}</TableCell>
                  <TableCell className="capitalize">{c.pillar}</TableCell>
                  <TableCell className="text-sm">{tierLabel(c.requiredTierRank, programmes)}</TableCell>
                  <TableCell className="text-sm">{formatDuration(c.durationSeconds)}</TableCell>
                  <TableCell>
                    <Badge variant={c.publishedAt ? "default" : "secondary"}>
                      {c.publishedAt ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ContentRowActions id={c.id} published={!!c.publishedAt} />
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
