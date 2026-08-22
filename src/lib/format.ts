// Money is stored as integer minor units + ISO currency (contracts §0). Format
// pence → "£12.34" via Intl (handles each currency's minor-unit scale).
export function formatMoney(minor: number, currency = "GBP"): string {
  const fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency });
  return fmt.format(minor / 10 ** minorDigits(currency));
}

// Minor-unit exponent for a currency (GBP=2, JPY=0). Shared so display and any
// major→minor parsing can't drift apart on a money path.
export function minorDigits(currency = "GBP"): number {
  const fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency });
  return fmt.resolvedOptions().maximumFractionDigits ?? 2;
}

// ISO timestamp → "15 Jul 2026, 14:30" (viewer's local time). "—" for null.
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

// Seconds → "3:05" / "1:02:05". Returns "—" for null.
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return "—";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

// ISO timestamp → "15 Jul 2026". Returns "—" for null/empty.
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
