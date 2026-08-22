"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refundBilling } from "@/app/dashboard/clients/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, minorDigits } from "@/lib/format";

// Refund a single charge. R1 model (backend): ONE refund per charge — any refund
// marks the original 'refunded', so a second attempt 409s. That makes getting the
// amount right first time matter, hence a real input rather than a bare confirm.
// Only offered on a positive, succeeded charge; the backend re-checks regardless.
export function RefundButton({
  billingId,
  amountMinor,
  currency,
  status,
}: {
  billingId: string;
  amountMinor: number;
  currency: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const digits = minorDigits(currency);
  const refundable = status === "succeeded" && amountMinor > 0;
  if (!refundable) return <span className="text-xs text-muted-foreground">—</span>;

  const disabled = busy || pending;

  function start() {
    setValue((amountMinor / 10 ** digits).toFixed(digits));
    setError(null);
    setOpen(true);
  }

  async function submit() {
    // Parse major → minor units. Math.round because 19.99 * 100 is 1998.9999… in
    // binary float; truncating would silently refund a penny short.
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    const minor = Math.round(parsed * 10 ** digits);
    if (minor > amountMinor) {
      setError(`Cannot exceed ${formatMoney(amountMinor, currency)}.`);
      return;
    }
    const isFull = minor === amountMinor;
    if (
      !window.confirm(
        `Refund ${formatMoney(minor, currency)}${isFull ? " (full)" : " (partial)"}?\n\nThis cannot be undone, and R1 allows only ONE refund per charge — the rest of this charge can never be refunded afterwards.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    // Omit amountMinor for a full refund — the backend's own "full" path.
    const result = await refundBilling(billingId, isFull ? undefined : minor);
    if (!result.ok) setError(result.error);
    else {
      setOpen(false);
      startTransition(() => router.refresh());
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={start} disabled={disabled}>
        Refund
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        <Input
          className="h-7 w-24 text-right"
          value={value}
          inputMode="decimal"
          aria-label="Refund amount"
          onChange={(e) => setValue(e.target.value)}
        />
        <Button size="sm" variant="destructive" onClick={submit} disabled={disabled}>
          {disabled ? "…" : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={disabled}>
          Cancel
        </Button>
      </div>
      {error && <span className="text-right text-xs text-destructive">{error}</span>}
    </div>
  );
}
