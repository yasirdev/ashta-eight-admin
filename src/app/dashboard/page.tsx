import { Banknote, TrendingUp, UserPlus, Users, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/bar-chart";
import { StatCard, momDelta } from "@/components/stat-card";

// Module 7 — the business dashboard. R1 is "headline metrics via SQL aggregation
// endpoints" (RELEASE_SCOPE:30). The charts, programme performance and pipeline
// counts are RELEASE_SCOPE:56 R2 surfaces, pulled into R1 on explicit human
// decisions (logged in ADMIN_PROGRESS_LOG). All five analytics endpoints are now
// consumed; nothing here needs a backend change. CSV export remains R2.

type Summary = {
  mrr: number;
  activeMembers: number;
  newMembers30d: number;
  totalRevenueMinor: number;
  activeSubsByProgramme: { programmeId: string; count: number }[];
};
type RevenuePoint = { period: string; revenueMinor: number };
type SubscriberPoint = { period: string; newSubs: number; churnedSubs: number };
type ProgrammeRow = { programmeId: string; name: string; activeMembers: number; revenueMinor: number };
type PipelineRow = { stage: string; count: number };

const monthLabel = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" });
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;

// Postgres date_trunc('month', ts) truncates in the DB SESSION's timezone, so a
// period returns as that zone's month start rendered in UTC: on a UTC+5 server
// February arrives as "2026-01-31T19:00:00Z", and reading getUTCMonth() off it
// lands a month early (bars drew Jan–Jun for Feb–Jul data). The skew is always
// under ±14h, so snapping to the NEAREST month boundary recovers the intended
// bucket in any server timezone — including UTC, where it is already exact.
// The backend's tz-dependent bucketing is flagged for Agent 1; this keeps the
// chart honest regardless of how the server is configured.
function periodKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "invalid";
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  const snapped = new Date(d.getTime() - start <= next - d.getTime() ? start : next);
  return monthKey(snapped);
}

// The aggregation GROUPs BY period, so a month with NO rows is absent from the
// series entirely — not zero. Plotting the returned points directly would place
// Nov next to Jan as if they were consecutive, silently hiding the gap and
// distorting every trend read off the axis. Build the full month grid and fill
// the holes with 0 so the time axis is continuous.
function monthGrid(months: number): Date[] {
  const now = new Date();
  return Array.from({ length: months }, (_, i) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1)),
  );
}

function onGrid<T>(grid: Date[], rows: T[], period: (r: T) => string, value: (r: T) => number) {
  const by = new Map<string, number>();
  for (const r of rows) {
    const k = periodKey(period(r));
    by.set(k, (by.get(k) ?? 0) + value(r));
  }
  return grid.map((d) => by.get(monthKey(d)) ?? 0);
}

// Non-fatal JSON read: guards the parse as well as the fetch, so a malformed 200
// on a secondary widget can never blank the page.
async function readJson<R, T>(res: Response | null, pick: (d: R) => T, fallback: T): Promise<T> {
  if (!res?.ok) return fallback;
  return res
    .json()
    .then((d: R) => pick(d))
    .catch(() => fallback);
}

export default async function OverviewPage() {
  const grid = monthGrid(12);
  const range = `interval=month&from=${encodeURIComponent(grid[0].toISOString())}`;

  // Only the summary is required — it is the R1 contract. Every widget beyond it
  // degrades on its own rather than taking the page down.
  const [summaryRes, revenueRes, subsRes, programmesRes, pipelineRes] = await Promise.all([
    apiFetch("/admin/analytics/summary"),
    apiFetch(`/admin/analytics/revenue?${range}`).catch(() => null),
    apiFetch(`/admin/analytics/subscribers?${range}`).catch(() => null),
    // Carries name + activeMembers + revenue for EVERY programme with no
    // is_active filter — unlike /programmes (active-only, contract §3:168), so a
    // retired programme with grandfathered subs still appears here.
    apiFetch("/admin/analytics/programmes").catch(() => null),
    apiFetch("/admin/analytics/pipeline").catch(() => null),
  ]);

  if (!summaryRes.ok) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-medium tracking-wide">Overview</h1>
        <p className="text-destructive text-sm">
          Failed to load dashboard ({summaryRes.status}). Check the backend is running and try again.
        </p>
      </div>
    );
  }

  const summary = (await summaryRes.json()) as Summary;
  const revenue = await readJson(revenueRes, (d: { series: RevenuePoint[] }) => d.series, [] as RevenuePoint[]);
  const subscribers = await readJson(subsRes, (d: { series: SubscriberPoint[] }) => d.series, [] as SubscriberPoint[]);
  const programmes = await readJson(programmesRes, (d: { items: ProgrammeRow[] }) => d.items, [] as ProgrammeRow[]);
  const pipeline = await readJson(pipelineRes, (d: { byStage: PipelineRow[] }) => d.byStage, [] as PipelineRow[]);

  const revenueSeries = onGrid(grid, revenue, (r) => r.period, (r) => r.revenueMinor);
  const newSeries = onGrid(grid, subscribers, (s) => s.period, (s) => s.newSubs);
  const churnSeries = onGrid(grid, subscribers, (s) => s.period, (s) => s.churnedSubs);

  const thisMonth = revenueSeries[revenueSeries.length - 1];
  const newThisMonth = newSeries[newSeries.length - 1];
  const prevLabel = `vs ${monthLabel(grid[grid.length - 2])}`;

  // Widest bar = the largest single programme, so the bars compare against the
  // leader rather than the total (a share-of-total bar would need every programme
  // present, which a failed fetch cannot guarantee).
  const topMembers = Math.max(1, ...programmes.map((p) => p.activeMembers));
  const leads = pipeline.reduce((n, s) => n + s.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-wide">Overview</h1>
        <p className="text-muted-foreground text-sm">
          Headline metrics, read live from the database on each load.
        </p>
      </div>

      {/* MRR and active members are point-in-time: the aggregation exposes no
          history for them, so they carry no delta or sparkline. The two that DO
          have a real 12-month series carry both. No invented trends. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="MRR"
          value={formatMoney(summary.mrr)}
          hint="monthly-equivalent, active subs"
        />
        <StatCard
          icon={Users}
          label="Active members"
          value={String(summary.activeMembers)}
          hint={`${summary.newMembers30d} registered in the last 30 days`}
        />
        <StatCard
          icon={Banknote}
          label="Revenue this month"
          value={formatMoney(thisMonth)}
          delta={momDelta(revenueSeries)}
          deltaLabel={prevLabel}
          trend={revenueSeries}
          hint={`· ${formatMoney(summary.totalRevenueMinor)} all-time`}
        />
        <StatCard
          icon={UserPlus}
          label="New subscriptions"
          value={String(newThisMonth)}
          delta={momDelta(newSeries)}
          deltaLabel={prevLabel}
          trend={newSeries}
          hint="this month"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <p className="text-muted-foreground text-xs">Succeeded charges, last 12 months</p>
          </CardHeader>
          <CardContent>
            <BarChart
              labels={grid.map(monthLabel)}
              series={[{ label: "Revenue", color: "chart-1", values: revenueSeries }]}
              formatValue={(n) => formatMoney(n)}
              emptyNote={
                revenueRes?.ok
                  ? "No revenue in the last 12 months."
                  : "Revenue unavailable — refresh to retry."
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programmes</CardTitle>
            <p className="text-muted-foreground text-xs">Active members and all-time revenue</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {programmes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {programmesRes?.ok ? "No programmes yet." : "Programmes unavailable — refresh to retry."}
              </p>
            ) : (
              programmes.map((p) => (
                <div key={p.programmeId} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="tabular-nums">{p.activeMembers}</span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-chart-1 h-full rounded-full"
                      style={{ width: `${(p.activeMembers / topMembers) * 100}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {formatMoney(p.revenueMinor)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Subscribers</CardTitle>
            <p className="text-muted-foreground text-xs">New vs churned per month, last 12 months</p>
          </CardHeader>
          <CardContent>
            <BarChart
              labels={grid.map(monthLabel)}
              series={[
                { label: "New", color: "chart-1", values: newSeries },
                { label: "Churned", color: "chart-2", values: churnSeries },
              ]}
              emptyNote={
                subsRes?.ok
                  ? "No subscription changes in the last 12 months."
                  : "Subscriber data unavailable — refresh to retry."
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coaching pipeline</CardTitle>
            <p className="text-muted-foreground text-xs">Leads by stage</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-muted-foreground size-4" aria-hidden="true" />
              <span className="text-3xl font-semibold tabular-nums">{leads}</span>
              <span className="text-muted-foreground text-sm">total</span>
            </div>
            {pipeline.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {pipelineRes?.ok ? "No leads yet." : "Pipeline unavailable — refresh to retry."}
              </p>
            ) : (
              <dl className="divide-y">
                {pipeline.map((s) => (
                  <div key={s.stage} className="flex items-center justify-between py-2 text-sm">
                    <dt className="capitalize">{s.stage.replace(/_/g, " ")}</dt>
                    <dd className="font-medium tabular-nums">{s.count}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
