"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateFaq, deleteFaq } from "@/app/dashboard/faq/actions";
import { Button, buttonVariants } from "@/components/ui/button";

// Publish toggle + edit + delete per FAQ row. Mirrors ContentRowActions: useTransition
// holds the buttons through the RSC refetch; the backend re-checks (404/validation).
export function FaqRowActions({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = busy || pending;

  async function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.error);
    else startTransition(() => router.refresh());
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-2">
        <Button
          variant={published ? "outline" : "default"}
          size="sm"
          disabled={disabled}
          onClick={() => run(() => updateFaq(id, { isPublished: !published }))}
        >
          {published ? "Unpublish" : "Publish"}
        </Button>
        <Link href={`/dashboard/faq/${id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Edit
        </Link>
        <Button
          variant="destructive"
          size="sm"
          disabled={disabled}
          onClick={() => run(() => deleteFaq(id), "Delete this FAQ permanently? This can't be undone.")}
        >
          Delete
        </Button>
      </div>
      {error && <span className="text-right text-xs text-destructive">{error}</span>}
    </div>
  );
}
