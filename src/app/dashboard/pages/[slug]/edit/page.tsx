import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PageForm, type ExistingPage } from "@/components/page-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await apiFetch(`/admin/pages/${slug}`);
  if (res.status === 404) notFound();

  if (!res.ok) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-destructive">Failed to load page. Check the backend and try again.</p>
      </div>
    );
  }

  const { page } = (await res.json()) as { page: ExistingPage };

  return (
    <div className="space-y-6">
      <BackLink />
      <h1 className="text-2xl font-semibold">Edit {page.title}</h1>
      <PageForm page={page} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/pages" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}>
      ← Back to pages
    </Link>
  );
}
