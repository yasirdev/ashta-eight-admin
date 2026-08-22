import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { tierOptions, type Programme } from "@/lib/tier";
import { ContentForm, type ExistingContent } from "@/components/content-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// There's no GET /admin/content/:id, but the member GET /content/:id is RLS-gated
// by `content_select` = is_staff() OR (published…), so an admin (staff) sees ANY
// row incl. drafts, un-capped. It returns the member shape (no videoRef/s3Key) —
// fine: the edit form only replaces a ref on re-upload, otherwise the backend keeps
// the existing one. Avoids paging the whole admin list to find one item.
export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [res, programmesRes] = await Promise.all([
    apiFetch(`/content/${id}`),
    apiFetch("/programmes").catch(() => null),
  ]);

  if (res.status === 404) notFound();
  if (!res.ok) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-destructive">Failed to load content. Check the backend and try again.</p>
      </div>
    );
  }

  const content = (await res.json()).content as ExistingContent;
  const programmes: Programme[] = programmesRes?.ok
    ? ((await programmesRes.json()) as { items: Programme[] }).items
    : [];

  return (
    <div className="space-y-6">
      <BackLink />
      <h1 className="text-2xl font-semibold">Edit content</h1>
      <ContentForm mode="edit" tierOptions={tierOptions(programmes)} content={content} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/content" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}>
      ← Back to content
    </Link>
  );
}
