import { cn } from "@/lib/utils";

// Trend shape only — no axis, no labels. It rides next to a stat that already
// states the current value, so it answers "which way, how steadily", nothing more.
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(0, ...values);
  if (values.length < 2 || max === 0) return null;

  return (
    <div className={cn("flex h-8 items-end gap-px", className)} aria-hidden="true">
      {values.map((v, i) => (
        <div
          key={i}
          // The last bucket is the value the stat above is quoting — full ink;
          // history recedes so it reads as context, not competing data.
          style={{ height: `${Math.max((v / max) * 100, v > 0 ? 6 : 3)}%` }}
          className={cn(
            "w-full rounded-t-[1px]",
            i === values.length - 1 ? "bg-chart-1" : "bg-chart-1/30",
          )}
        />
      ))}
    </div>
  );
}
