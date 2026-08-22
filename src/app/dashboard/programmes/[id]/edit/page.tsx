import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ProgrammeForm, type ExistingProgramme } from "@/components/programme-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// There's no GET /admin/programmes/:id, so the row is fetched from the paginated list
// and found by id — the seed is a fixed four tiers, so one page always holds them all.
// This keeps the read on the admin (inactive-inclusive) shape, which the public
// GET /programmes/:id would not return for a deactivated tier.
export default async function EditProgrammePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiFetch("/admin/programmes?limit=100");

  if (!res.ok) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-destructive">Failed to load programme. Check the backend and try again.</p>
      </div>
    );
  }

  const { items } = (await res.json()) as { items: ExistingProgramme[] };
  const programme = items.find((p) => p.id === id);
  if (!programme) notFound();

  return (
    <div className="space-y-6">
      <BackLink />
      <h1 className="text-2xl font-semibold">Edit programme</h1>
      <ProgrammeForm programme={programme} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/programmes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}>
      ← Back to programmes
    </Link>
  );
}
