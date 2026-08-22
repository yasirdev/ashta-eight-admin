import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { FaqForm, type ExistingFaq } from "@/components/faq-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// No GET /admin/faqs/:id — fetch the list and find by id (same approach as the
// programme edit page). The FAQ set is small, so one list read always holds it.
export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiFetch("/admin/faqs");

  if (!res.ok) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-destructive">Failed to load FAQ. Check the backend and try again.</p>
      </div>
    );
  }

  const { items } = (await res.json()) as { items: ExistingFaq[] };
  const faq = items.find((f) => f.id === id);
  if (!faq) notFound();

  return (
    <div className="space-y-6">
      <BackLink />
      <h1 className="text-2xl font-semibold">Edit FAQ</h1>
      <FaqForm faq={faq} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/faq" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}>
      ← Back to FAQ
    </Link>
  );
}
