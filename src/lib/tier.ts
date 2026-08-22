// Content is gated by `required_tier_rank` (0 = free/all members; 1-4 = programme
// tiers, tier_rank unique per programme — contracts §D1). These map that rank to a
// human label using the live programme list, shared by the content list + forms.
export type Programme = { id: string; name: string; tierRank: number };

const FREE = "Free — all members";

export function tierLabel(rank: number, programmes: Programme[]): string {
  if (rank === 0) return FREE;
  return programmes.find((p) => p.tierRank === rank)?.name ?? `Tier ${rank}`;
}

export function tierOptions(programmes: Programme[]): { rank: number; label: string }[] {
  const tiers = [...programmes]
    .sort((a, b) => a.tierRank - b.tierRank)
    .map((p) => ({ rank: p.tierRank, label: `Tier ${p.tierRank} — ${p.name}` }));
  return [{ rank: 0, label: FREE }, ...tiers];
}
