import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// CR-008 — the three info pages (privacy/terms/about). A fixed seeded set, so this is a
// copy editor, not CRUD: no create/delete, edit by slug.
type PageRow = {
  slug: string;
  title: string;
  bodyHtml: string;
  isPublished: boolean;
  updatedAt: string;
};

export default async function PagesPage() {
  const res = await apiFetch("/admin/pages");

  if (!res.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <p className="text-sm text-destructive">
          Failed to load pages ({res.status}). Check the backend is running and try again.
        </p>
      </div>
    );
  }

  const { items } = (await res.json()) as { items: PageRow[] };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pages</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Privacy Policy, Terms &amp; Conditions and About — shown in the mobile app. Unpublished
        pages are hidden in the app (they return 404 until you publish).
      </p>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No pages found — run the backend seed.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.slug}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.slug}</TableCell>
                  <TableCell>
                    <Badge variant={p.isPublished ? "default" : "secondary"}>
                      {p.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/pages/${p.slug}/edit`}
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
    </div>
  );
}
