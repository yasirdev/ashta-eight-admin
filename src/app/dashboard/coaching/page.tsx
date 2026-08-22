import { apiFetch } from "@/lib/api";
import { SlotManager, type Slot } from "@/components/slot-manager";
import { SessionManager, type Session } from "@/components/session-manager";

// Availability management is forward-looking: default to upcoming (startsAt ≥ now),
// soonest first (backend orders asc), so past slots/sessions don't bury the list.
export default async function CoachingPage() {
  // Upcoming only, at the contract's max page size. ponytail: single page, no
  // pager — covers R1 admin-created volume; add pagination if a calendar exceeds 100.
  const from = new Date().toISOString();
  const q = `from=${encodeURIComponent(from)}&limit=100`;
  const [slotsRes, sessionsRes] = await Promise.all([
    apiFetch(`/admin/coaching/slots?${q}`),
    apiFetch(`/admin/live-cohort/sessions?${q}`),
  ]);

  if (!slotsRes.ok || !sessionsRes.ok) {
    const status = !slotsRes.ok ? slotsRes.status : sessionsRes.status;
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Coaching</h1>
        <p className="text-sm text-destructive">
          Failed to load coaching data ({status}). Check the backend is running and try again.
        </p>
      </div>
    );
  }

  const slots = ((await slotsRes.json()) as { items: Slot[] }).items;
  const sessions = ((await sessionsRes.json()) as { items: Session[] }).items;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Coaching</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming 1:1 slots and live-cohort sessions. Changes reflect on the member booking screen on
          their next refresh.
        </p>
      </div>
      <SlotManager slots={slots} />
      <SessionManager sessions={sessions} />
    </div>
  );
}
