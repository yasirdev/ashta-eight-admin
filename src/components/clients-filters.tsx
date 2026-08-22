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
const STATUSES = ["active", "past_due", "canceled", "expired", "paused", "incomplete"];
const TIERS = ["1", "2", "3", "4"];

// Filter bar for the roster. Commits to the URL query on Apply so the server
// component refetches with server-side search/filter/pagination (never client-
// side filtering — that would break pagination totals). Resets to page 1.
export function ClientsFilters({
  search: search0,
  tier: tier0,
  status: status0,
}: {
  search: string;
  tier: string;
  status: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(search0);
  const [tier, setTier] = useState(tier0 || ANY);
  const [status, setStatus] = useState(status0 || ANY);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (tier !== ANY) params.set("tier", tier);
    if (status !== ANY) params.set("status", status);
    router.push(`/dashboard/clients?${params.toString()}`);
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-48">
        <Input
          placeholder="Search name, email or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Select value={tier} onValueChange={(v) => setTier(v ?? ANY)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Tier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any tier</SelectItem>
          {TIERS.map((t) => (
            <SelectItem key={t} value={t}>
              Tier {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => setStatus(v ?? ANY)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any status</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit">Apply</Button>
    </form>
  );
}
