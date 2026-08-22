"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  pauseSubscription,
  cancelSubscription,
  changeProgramme,
} from "@/app/dashboard/clients/[id]/actions";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Result = { ok: true } | { ok: false; error: string };

export type ProgrammeOption = {
  id: string;
  name: string;
  tierRank: number;
  priceMinor: number;
  currency: string;
};

// The backend's own state rules (admin/routes.ts): pause requires 'active';
// cancel allows active/past_due/paused. Mirrored here so the UI doesn't offer an
// action that can only 409 — the backend stays the authority either way.
const CANCELABLE = ["active", "past_due", "paused"];

// Per-subscription row actions.
export function SubscriptionActions({
  clientId,
  subscriptionId,
  status,
  cancelAtPeriodEnd,
}: {
  clientId: string;
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canPause = status === "active";
  const canCancel = CANCELABLE.includes(status) && !cancelAtPeriodEnd;
  // `pending` holds through the RSC refetch, so the buttons can't be clicked
  // again against stale rows (a second Pause would 409 an action that worked).
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

  if (!canPause && !canCancel) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-2">
        {canPause && (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              run(
                () => pauseSubscription(clientId, subscriptionId),
                "Pause this subscription?\n\nBilling stops and the member loses tier access straight away.\n\nR1 has NO admin resume — bringing them back needs a new checkout. Cancel instead if you want them to keep access to the end of the period.",
              )
            }
          >
            Pause
          </Button>
        )}
        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            disabled={disabled}
            onClick={() =>
              run(
                () => cancelSubscription(clientId, subscriptionId),
                "Cancel this subscription at period end?\n\nThe member keeps access until the current period ends, then it lapses. Billing will not renew.",
              )
            }
          >
            Cancel
          </Button>
        )}
      </div>
      {error && <span className="text-right text-xs text-destructive">{error}</span>}
    </div>
  );
}

// Client-level upgrade/downgrade. Targets whichever subscription the backend
// considers current (most recent active) — hidden entirely when there is none.
export function ChangeProgramme({
  clientId,
  programmes,
  currentProgrammeId,
  hasActive,
}: {
  clientId: string;
  programmes: ProgrammeOption[];
  currentProgrammeId: string | null;
  hasActive: boolean;
}) {
  const router = useRouter();
  const [programmeId, setProgrammeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!hasActive) {
    return (
      <p className="text-sm text-muted-foreground">
        No active subscription — a programme change needs one. The member must check out first.
      </p>
    );
  }

  const options = programmes.filter((p) => p.id !== currentProgrammeId);

  // An empty picker is ambiguous — it usually means /programmes failed, which
  // would otherwise look like "there's nothing to move them to".
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No other programmes available. If this looks wrong, the programme list failed to load —
        refresh the page.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!programmeId) return;
    const target = options.find((p) => p.id === programmeId);
    if (
      !window.confirm(
        `Move this client to ${target?.name}?\n\nStripe re-prices the subscription with proration, and their tier access changes immediately.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const result = await changeProgramme(clientId, programmeId);
    if (result.ok) {
      setMsg({ ok: true, text: "Programme changed." });
      setProgrammeId("");
      startTransition(() => router.refresh());
    } else {
      setMsg({ ok: false, text: result.error });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-3">
      <Select value={programmeId} onValueChange={(v) => setProgrammeId(v ?? "")}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Move to programme…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name} · {formatMoney(p.priceMinor, p.currency)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={busy || pending || !programmeId}>
        {busy || pending ? "Changing…" : "Change"}
      </Button>
      {msg && (
        <span className={`text-sm ${msg.ok ? "text-green-600" : "text-destructive"}`}>
          {msg.text}
        </span>
      )}
    </form>
  );
}
