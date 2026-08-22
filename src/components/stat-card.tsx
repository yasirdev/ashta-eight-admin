import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";

// Percentage change of the last bucket vs the one before it. Returns null where a
// change genuinely cannot be expressed — no history, or a zero baseline (any move
// off zero is an infinite %). A tile with no honest delta shows none; inventing a
// trend to fill the slot would be worse than an empty slot.
export function momDelta(values: number[]): number | null {
  if (values.length < 2) return null;
  const cur = values[values.length - 1];
  const prev = values[values.length - 2];
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  delta,
  deltaLabel,
  trend,
  // Some stats are point-in-time (MRR, active members): the aggregation exposes no
  // history for them, so they carry no delta and no sparkline. That is a data fact,
  // not an oversight — see ADMIN_PROGRESS_LOG.
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  deltaLabel?: string;
  trend?: number[];
}) {
  const dir = delta == null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const DeltaIcon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;

  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </div>

        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-semibold tabular-nums">{value}</p>
          {trend && <Sparkline values={trend} className="w-20 shrink-0" />}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {dir && (
            <span
              className={cn(
                "flex items-center gap-0.5 font-medium tabular-nums",
                // Direction is carried by the arrow as well as the colour — never
                // colour alone. Churn-neutral palette: this is trend, not status.
                dir === "up" ? "text-chart-2" : dir === "down" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <DeltaIcon className="size-3" aria-hidden="true" />
              {Math.abs(delta as number).toFixed(1)}%
            </span>
          )}
          {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
