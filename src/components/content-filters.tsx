"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ANY = "any";
const PILLARS = ["align", "sculpt", "evolve"];

// Content filters commit straight to the URL query on change (no Apply button —
// three small selects), so the server component refetches with server-side
// filtering. Resets to page 1 by omitting page.
export function ContentFilters({
  pillar,
  type,
  published,
}: {
  pillar: string;
  type: string;
  published: string;
}) {
  const router = useRouter();

  function commit(next: { pillar?: string; type?: string; published?: string }) {
    const merged = { pillar, type, published, ...next };
    const params = new URLSearchParams();
    if (merged.pillar && merged.pillar !== ANY) params.set("pillar", merged.pillar);
    if (merged.type && merged.type !== ANY) params.set("type", merged.type);
    if (merged.published && merged.published !== ANY) params.set("published", merged.published);
    router.push(`/dashboard/content?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select value={pillar || ANY} onValueChange={(v) => commit({ pillar: v ?? ANY })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Pillar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any pillar</SelectItem>
          {PILLARS.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={type || ANY} onValueChange={(v) => commit({ type: v ?? ANY })}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any type</SelectItem>
          <SelectItem value="audio">Audio</SelectItem>
          <SelectItem value="video">Video</SelectItem>
        </SelectContent>
      </Select>
      <Select value={published || ANY} onValueChange={(v) => commit({ published: v ?? ANY })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any status</SelectItem>
          <SelectItem value="true">Published</SelectItem>
          <SelectItem value="false">Draft</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
