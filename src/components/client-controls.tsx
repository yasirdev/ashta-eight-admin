"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  disableClient,
  enableClient,
  forceLogoutClient,
  deleteClient,
} from "@/app/dashboard/clients/[id]/actions";
import { Button } from "@/components/ui/button";

type Result = { ok: true } | { ok: false; error: string };

// Account-level admin controls for a client: enable/disable, force logout, and
// soft-delete. The backend enforces member-only + not-self (staff/own id → 404), so
// this is only shown for a member row. Deleted accounts show no controls (terminal).
export function ClientControls({
  clientId,
  status,
}: {
  clientId: string;
  status: "active" | "disabled" | "deleted" | string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const disabled = busy || pending;

  async function run(fn: () => Promise<Result>, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    const result = await fn();
    if (!result.ok) setError(result.error);
    else startTransition(() => router.refresh());
    setBusy(false);
  }

  if (status === "deleted") {
    return (
      <p className="text-sm text-muted-foreground">
        This account has been deleted. Login is blocked and its sessions are revoked.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "disabled" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              run(
                () => enableClient(clientId),
                "Enable this account?\n\nThe client will be able to log in again.",
              )
            }
          >
            Enable account
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              run(
                () => disableClient(clientId),
                "Disable this account?\n\nThe client is signed out everywhere and cannot log in until you enable it again. Their data is kept.",
              )
            }
          >
            Disable account
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() =>
            run(
              () => forceLogoutClient(clientId),
              "Force logout?\n\nThe client is signed out on all devices. They can log in again.",
            )
          }
        >
          Force logout
        </Button>

        <Button
          variant="destructive"
          size="sm"
          disabled={disabled}
          onClick={() =>
            run(
              () => deleteClient(clientId),
              "Delete this account?\n\nThis soft-deletes the client: they are signed out and can no longer log in. Their data is retained (not erased). This is not reversible from the panel.",
            )
          }
        >
          Delete account
        </Button>
      </div>
      {status === "disabled" && (
        <span className="text-xs text-amber-600">This account is currently disabled.</span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
