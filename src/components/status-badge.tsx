import { Badge } from "@/components/ui/badge";

// Subscription status → badge variant. Statuses per contract: active, past_due,
// canceled, expired, paused, incomplete, plus "none" (no subscription).
const VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  paused: "secondary",
  past_due: "destructive",
  incomplete: "destructive",
  canceled: "outline",
  expired: "outline",
  none: "outline",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? "outline"}>{status.replace("_", " ")}</Badge>;
}
