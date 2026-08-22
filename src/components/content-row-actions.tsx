"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publishContent, deleteContent } from "@/app/dashboard/content/actions";
import { Button, buttonVariants } from "@/components/ui/button";

// Publish/unpublish toggle + edit link + delete, per content row. useTransition
// holds the buttons disabled through the RSC refetch so no click lands on stale
// state; the backend is the authority (404/validation re-checked there).
export function ContentRowActions({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
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
          onClick={() => run(() => publishContent(id, !published))}
        >
          {published ? "Unpublish" : "Publish"}
        </Button>
        <Link href={`/dashboard/content/${id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Edit
        </Link>
        <Button
          variant="destructive"
          size="sm"
          disabled={disabled}
          onClick={() =>
            run(
              () => deleteContent(id),
              "Delete this content permanently? Members lose access immediately on their next fetch. This can't be undone.",
            )
          }
        >
          Delete
        </Button>
      </div>
      {error && <span className="text-right text-xs text-destructive">{error}</span>}
    </div>
  );
}
