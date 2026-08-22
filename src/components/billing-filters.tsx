"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ANY = "any";

export type ProgrammeChoice = { id: string; name: string };

// Date + programme filters for the global ledger. Same discipline as the roster:
// commit to the URL query so the server refetches (server-side filtering keeps the
// paginated total correct). Native date inputs — no picker dependency.
export function BillingFilters({
  from: from0,
  to: to0,
  programmeId: prog0,
  programmes,
}: {
  from: string;
  to: string;
  programmeId: string;
  programmes: ProgrammeChoice[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(from0);
  const [to, setTo] = useState(to0);
  const [programmeId, setProgrammeId] = useState(prog0 || ANY);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (programmeId !== ANY) params.set("programmeId", programmeId);
    router.push(`/dashboard/billing?${params.toString()}`);
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        From
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        To
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
      </label>
      <Select value={programmeId} onValueChange={(v) => setProgrammeId(v ?? ANY)}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Programme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any programme</SelectItem>
          {programmes.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit">Apply</Button>
    </form>
  );
}
