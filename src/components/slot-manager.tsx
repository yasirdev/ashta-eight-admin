"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSlot, updateSlot, deleteSlot } from "@/app/dashboard/coaching/actions";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Slot = {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: "open" | "full" | "closed";
  bookedCount?: number;
};

const STATUSES = ["open", "full", "closed"] as const;

// datetime-local ("2026-07-20T14:30", local) → ISO UTC for the API. null if empty/invalid.
const toISO = (local: string): string | null => {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export function SlotManager({ slots }: { slots: Slot[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = toISO(start);
    const endsAt = toISO(end);
    if (!startsAt || !endsAt) return setError("Start and end are both required.");
    if (endsAt <= startsAt) return setError("End must be after start.");
    setBusy(true);
    setError(null);
    const r = await createSlot({ startsAt, endsAt, capacity: Math.max(1, Number(capacity) || 1) });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setStart("");
    setEnd("");
    setCapacity("1");
    startTransition(() => router.refresh());
  }

  async function run(id: string, fn: () => Promise<{ ok: true } | { ok: false; error: string }>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); // hold through the request so a row can't be double-submitted
    setRowError(null);
    const r = await fn();
    if (!r.ok) setRowError({ id, text: r.error });
    else startTransition(() => router.refresh());
    setBusy(false);
  }

  const disabled = busy || pending;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Coaching slots</h2>

      <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-md border p-4">
        <div className="space-y-1">
          <Label htmlFor="slot-start">Starts</Label>
          <Input
            id="slot-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-52"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="slot-end">Ends</Label>
          <Input
            id="slot-end"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-52"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="slot-cap">Capacity</Label>
          <Input
            id="slot-cap"
            inputMode="numeric"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-24"
          />
        </div>
        <Button type="submit" disabled={disabled}>
          {busy ? "Adding…" : "Add slot"}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </form>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Starts</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead>Booked / capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No coaching slots yet.
                </TableCell>
              </TableRow>
            ) : (
              slots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{formatDateTime(s.startsAt)}</TableCell>
                  <TableCell>{formatDateTime(s.endsAt)}</TableCell>
                  <TableCell>
                    {(s.bookedCount ?? 0)} / {s.capacity}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={s.status}
                      disabled={disabled}
                      onValueChange={(v) => v && run(s.id, () => updateSlot(s.id, v as Slot["status"]))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={disabled}
                        onClick={() =>
                          run(
                            s.id,
                            () => deleteSlot(s.id),
                            "Delete this slot? (Slots with active bookings can't be deleted — cancel those first.)",
                          )
                        }
                      >
                        Delete
                      </Button>
                      {rowError?.id === s.id && (
                        <span className="text-right text-xs text-destructive">{rowError.text}</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
