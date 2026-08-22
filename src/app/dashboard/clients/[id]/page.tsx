import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ClientEditForm } from "@/components/client-edit-form";
import { ClientControls } from "@/components/client-controls";
import {
  SubscriptionActions,
  ChangeProgramme,
  type ProgrammeOption,
} from "@/components/subscription-controls";
import { RefundButton } from "@/components/refund-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Client profile per contract GET /admin/clients/:id.
type ClientProfile = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    phone: string | null;
    role: string;
    emailVerifiedAt: string | null;
    createdAt: string;
    lastActiveAt: string | null;
    status?: string; // active | disabled | deleted (account controls)
    disabledAt?: string | null;
    deletedAt?: string | null;
  };
  subscriptions: Array<{
    id: string;
    status: string;
    programme?: { id: string; code: string; name: string; tierRank: number } | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    autoRenew: boolean;
    cohortBatch: string | null;
    createdAt: string;
  }>;
  billing: Array<{
    id: string;
    amountMinor: number;
    currency: string;
    status: string;
    description: string | null;
    invoiceUrl: string | null;
    occurredAt: string;
  }>;
  progressSummary: {
    contentCompleted: number;
    contentInProgress: number;
    entriesLogged: number;
    lastEntryDate: string | null;
  };
  notes: string | null;
};

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Programmes populate the change-programme picker. Genuinely non-fatal: a
  // rejected fetch (backend unreachable) must not take the profile down with it,
  // so it resolves to null rather than propagating through Promise.all.
  const [res, programmesRes] = await Promise.all([
    apiFetch(`/admin/clients/${id}`),
    apiFetch("/programmes").catch(() => null),
  ]);
  if (res.status === 404) notFound();
  if (!res.ok) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-destructive">
          Failed to load client ({res.status}). Check the backend is running and try again.
        </p>
      </div>
    );
  }
  const data = (await res.json()) as ClientProfile;
  const { user, subscriptions, billing, progressSummary } = data;

  const programmes: ProgrammeOption[] = programmesRes?.ok
    ? ((await programmesRes.json()) as { items: ProgrammeOption[] }).items
    : [];

  // The backend's change endpoint targets the most recent active sub. Profile
  // subscriptions arrive createdAt-desc, so find() picks the same one.
  const activeSub = subscriptions.find((s) => s.status === "active");

  return (
    <div className="space-y-6">
      <BackLink />

      <div>
        <h1 className="text-2xl font-semibold">
          {user.displayName || user.email}
          {user.status && user.status !== "active" && (
            <span className="ml-3 align-middle">
              <StatusBadge status={user.status} />
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user.email}
          {user.emailVerifiedAt ? " · verified" : " · unverified"} · joined {formatDate(user.createdAt)} · last
          active {formatDate(user.lastActiveAt)}
        </p>
      </div>

      {/* Progress summary tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile label="Content completed" value={progressSummary.contentCompleted} />
        <Tile label="In progress" value={progressSummary.contentInProgress} />
        <Tile label="Entries logged" value={progressSummary.entriesLogged} />
        <Tile label="Last entry" value={formatDate(progressSummary.lastEntryDate)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscriptions.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Programme</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Renews</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.programme?.name ?? "—"}</TableCell>
                          <TableCell>
                            <StatusBadge status={s.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(s.currentPeriodStart)} – {formatDate(s.currentPeriodEnd)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.cancelAtPeriodEnd ? "Cancels at period end" : s.autoRenew ? "Auto-renews" : "No"}
                          </TableCell>
                          <TableCell className="text-right">
                            <SubscriptionActions
                              clientId={user.id}
                              subscriptionId={s.id}
                              status={s.status}
                              cancelAtPeriodEnd={s.cancelAtPeriodEnd}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Upgrade/downgrade acts on the current active sub, not a row. */}
              <div className="mt-4 border-t pt-4">
                <div className="mb-2 text-sm font-medium">Change programme</div>
                <ChangeProgramme
                  clientId={user.id}
                  programmes={programmes}
                  currentProgrammeId={activeSub?.programme?.id ?? null}
                  hasActive={!!activeSub}
                />
              </div>
            </CardContent>
          </Card>

          {/* Billing history */}
          <Card>
            <CardHeader>
              <CardTitle>Billing history</CardTitle>
            </CardHeader>
            <CardContent>
              {billing.length === 0 ? (
                <p className="text-sm text-muted-foreground">No billing records.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Invoice</TableHead>
                        <TableHead className="text-right">Refund</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billing.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{formatDate(b.occurredAt)}</TableCell>
                          <TableCell>{b.description ?? "—"}</TableCell>
                          <TableCell>
                            <StatusBadge status={b.status} />
                          </TableCell>
                          <TableCell className="text-right">{formatMoney(b.amountMinor, b.currency)}</TableCell>
                          <TableCell className="text-right">
                            {b.invoiceUrl ? (
                              <a
                                href={b.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm underline"
                              >
                                View
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <RefundButton
                              billingId={b.id}
                              amountMinor={b.amountMinor}
                              currency={b.currency}
                              status={b.status}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Editable details: phone + admin-private notes */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Details &amp; notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientEditForm id={user.id} phone={user.phone} notes={data.notes} />
          </CardContent>
        </Card>

        {/* Account controls: enable/disable, force logout, delete */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Account controls</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientControls clientId={user.id} status={user.status ?? "active"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/clients" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}>
      ← Back to clients
    </Link>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
