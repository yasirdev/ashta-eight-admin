import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { tierOptions, type Programme } from "@/lib/tier";
import { ContentForm } from "@/components/content-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NewContentPage() {
  const res = await apiFetch("/programmes").catch(() => null);
  const programmes: Programme[] = res?.ok
    ? ((await res.json()) as { items: Programme[] }).items
    : [];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/content" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}>
        ← Back to content
      </Link>
      <h1 className="text-2xl font-semibold">New content</h1>
      <ContentForm mode="create" tierOptions={tierOptions(programmes)} />
    </div>
  );
}
