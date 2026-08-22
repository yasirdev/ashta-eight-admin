import { cn } from "@/lib/utils";

// Dependency-free bar chart: flex columns + percentage heights, no client JS.
// Deliberately not a charting library — R1 needs magnitude-over-time, which CSS
// does in a few lines. If tooltips/axes/zoom are ever needed, that is the point
// to reach for recharts, not before.
// ponytail: no hover tooltip (would force a client component); every bar carries
// a visible axis label + the series is direct-labelled, so identity is never
// colour-alone and the dataviz "no tooltip" relief is satisfied by labels.

export type Series = {
  label: string;
  // chart-1 / chart-2: the validated brand steps (see globals.css).
  color: "chart-1" | "chart-2";
  values: number[];
};

const FILL: Record<Series["color"], string> = {
  "chart-1": "bg-chart-1",
  "chart-2": "bg-chart-2",
};

// Round a max up to a clean gridline value so the axis reads in human numbers
// instead of the raw peak. The step ladder is deliberately fine-grained: with a
// coarse one (1/2/5/10) a £1,250 peak snaps to £2,000 and a third of the plot is
// dead space, which flattens every bar for no informational gain.
function niceMax(n: number): number {
  if (n <= 0) return 0;
  const mag = 10 ** Math.floor(Math.log10(n));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => n <= s * mag) ?? 10;
  return step * mag;
}

export function BarChart({
  labels,
  series,
  formatValue = (n) => String(n),
  emptyNote = "No data for this period yet.",
  height = "h-48",
  className,
}: {
  labels: string[];
  series: Series[];
  formatValue?: (n: number) => string;
  emptyNote?: string;
  height?: string;
  className?: string;
}) {
  // A zero max would divide by zero; an all-zero range is legitimately "no data".
  const peak = Math.max(0, ...series.flatMap((s) => s.values));
  if (labels.length === 0 || peak === 0) {
    return <p className="text-muted-foreground text-sm">{emptyNote}</p>;
  }
  // Bars scale against the rounded axis top, not the raw peak — otherwise the
  // tallest bar always touches the ceiling and the gridlines would lie.
  const max = niceMax(peak);
  // Top, mid, baseline — but drop any tick whose LABEL repeats one already shown.
  // On a small integer range (max 1) the mid tick rounds back to the top's label,
  // printing "1, 1, 0" against three gridlines that claim different values.
  const seenTicks = new Set<string>();
  const ticks = [1, 0.5, 0].filter((t) => {
    const label = formatValue(Math.round(max * t));
    if (seenTicks.has(label)) return false;
    seenTicks.add(label);
    return true;
  });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Legend only for >= 2 series — with one, the card title already names it. */}
      {series.length > 1 && (
        <div className="flex flex-wrap gap-4">
          {series.map((s) => (
            <span key={s.label} className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span className={cn("size-2 rounded-full", FILL[s.color])} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {/* Y axis: recessive ink, aligned to the gridlines it names. */}
        <div className={cn("relative w-12 shrink-0", height)}>
          {ticks.map((t) => (
            <span
              key={t}
              style={{ bottom: `${t * 100}%` }}
              className="text-muted-foreground absolute right-0 translate-y-1/2 text-[0.625rem] tabular-nums"
            >
              {formatValue(Math.round(max * t))}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* Gridlines sit behind the marks and never overlap a label. */}
          <div className={cn("absolute inset-0", height)} aria-hidden="true">
            {ticks.map((t) => (
              <div
                key={t}
                style={{ bottom: `${t * 100}%` }}
                className={cn("absolute w-full border-t", t === 0 ? "border-border" : "border-border/50")}
              />
            ))}
          </div>

          <div
            className={cn("relative flex items-end gap-1", height)}
            role="img"
            aria-label={ariaLabel(labels, series, formatValue)}
          >
            {labels.map((label, i) => (
              <div key={label} className="flex h-full flex-1 flex-col justify-end">
                {/* 2px gap between adjacent fills per the mark spec */}
                <div className="flex h-full items-end justify-center gap-0.5">
                  {series.map((s) => {
                    const v = s.values[i] ?? 0;
                    return (
                      <div
                        key={s.label}
                        // A 0-value column still needs a visible baseline tick, else
                        // "zero" and "missing" look identical.
                        style={{ height: `${Math.max((v / max) * 100, v > 0 ? 2 : 0)}%` }}
                        className={cn(
                          "min-h-[2px] w-full rounded-t-[4px] transition-opacity hover:opacity-80",
                          FILL[s.color],
                        )}
                        title={`${s.label} — ${label}: ${formatValue(v)}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Axis labels sit outside the plot so they never overlap the marks. */}
          <div className="mt-2 flex gap-1">
            {labels.map((label) => (
              <div key={label} className="text-muted-foreground flex-1 text-center text-[0.6875rem]">
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// The table-view/alt-text obligation: a screen reader gets the numbers, not "img".
function ariaLabel(labels: string[], series: Series[], fmt: (n: number) => string) {
  return series
    .map((s) => `${s.label}: ${labels.map((l, i) => `${l} ${fmt(s.values[i] ?? 0)}`).join(", ")}`)
    .join(". ");
}
