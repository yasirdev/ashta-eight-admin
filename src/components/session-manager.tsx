"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSession, deleteSession } from "@/app/dashboard/coaching/actions";
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

export type Session = {
  id: string;
  batch: "batch_1" | "batch_2";
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  zoomJoinUrl: string | null;
};

// Batch schedule is fixed (CLAUDE.md §6): batch_1 Mon/Wed/Fri, batch_2 Tue/Thu/Sat.
const BATCH_LABEL: Record<Session["batch"], string> = {
  batch_1: "Batch 1 (Mon/Wed/Fri)",
  batch_2: "Batch 2 (Tue/Thu/Sat)",
};

const toISO = (local: string): string | null => {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export function SessionManager({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [batch, setBatch] = useState<Session["batch"]>("batch_1");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = toISO(start);
    if (!startsAt) return setError("Start is required.");
    const endsAt = toISO(end);
    if (end && !endsAt) return setError("End time is invalid.");
    if (endsAt && endsAt <= startsAt) return setError("End must be after start.");
    setBusy(true);
    setError(null);
    const r = await createSession({
      batch,
      title: title.trim() || undefined,
      startsAt,
      ...(endsAt ? { endsAt } : {}),
    });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setTitle("");
    setStart("");
    setEnd("");
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this live-cohort session? Members lose the Zoom link immediately.")) return;
    setBusy(true); // hold through the request so Delete can't be double-submitted
    setRowError(null);
    const r = await deleteSession(id);
    if (!r.ok) setRowError({ id, text: r.error });
    else startTransition(() => router.refresh());
    setBusy(false);
  }

  const disabled = busy || pending;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Live-cohort sessions</h2>

      <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-md border p-4">
        <div className="space-y-1">
          <Label>Batch</Label>
          <Select value={batch} onValueChange={(v) => setBatch((v as Session["batch"]) ?? "batch_1")}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="batch_1">{BATCH_LABEL.batch_1}</SelectItem>
              <SelectItem value="batch_2">{BATCH_LABEL.batch_2}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="sess-title">Title (optional)</Label>
          <Input id="sess-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-52" maxLength={200} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sess-start">Starts</Label>
          <Input
            id="sess-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-52"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sess-end">Ends (optional)</Label>
          <Input
            id="sess-end"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-52"
          />
        </div>
        <Button type="submit" disabled={disabled}>
          {busy ? "Creating…" : "Add session"}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </form>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead>Zoom</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No sessions yet.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{BATCH_LABEL[s.batch]}</TableCell>
                  <TableCell>{s.title ?? "—"}</TableCell>
                  <TableCell>{formatDateTime(s.startsAt)}</TableCell>
                  <TableCell>{formatDateTime(s.endsAt)}</TableCell>
                  <TableCell>
                    {s.zoomJoinUrl ? (
                      <a href={s.zoomJoinUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                        Join
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">no link</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <Button variant="destructive" size="sm" disabled={disabled} onClick={() => remove(s.id)}>
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
