import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FaqRowActions } from "@/components/faq-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// CR-008 — Help-Center FAQ entries. Flat ordered list (by `position`).
type FaqRow = {
  id: string;
  question: string;
  answerHtml: string;
  position: number;
  isPublished: boolean;
};

export default async function FaqPage() {
  const res = await apiFetch("/admin/faqs");

  if (!res.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">FAQ</h1>
        <p className="text-sm text-destructive">
          Failed to load FAQs ({res.status}). Check the backend is running and try again.
        </p>
      </div>
    );
  }

  const { items } = (await res.json()) as { items: FaqRow[] };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">FAQ</h1>
        <Link href="/dashboard/faq/new" className={buttonVariants({ size: "sm" })}>
          New FAQ
        </Link>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Help-Center questions shown in the mobile app, ordered by the position field. Unpublished
        entries are hidden in the app.
      </p>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No FAQs yet. Add the first one.
                </TableCell>
              </TableRow>
            ) : (
              items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm text-muted-foreground">{f.position}</TableCell>
                  <TableCell className="font-medium">{f.question}</TableCell>
                  <TableCell>
                    <Badge variant={f.isPublished ? "default" : "secondary"}>
                      {f.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <FaqRowActions id={f.id} published={f.isPublished} />
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
