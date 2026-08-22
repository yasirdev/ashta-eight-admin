"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProgramme } from "@/app/dashboard/programmes/actions";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Admin programme shape (serializeProgrammeAdmin). Only name/description/features are
// writable — the rest is shown read-only for context.
export type ExistingProgramme = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tierRank: number;
  priceMinor: number;
  currency: string;
  billingInterval: string;
  features: string[];
  isActive: boolean;
  stripePriceId: string | null;
};

// The DB `programmes_features_valid` CHECK caps the list at 8; the API schema mirrors it.
// Kept here so the client stops the admin before the round-trip, not only after it.
const MAX_FEATURES = 8;
const MAX_FEATURE_LEN = 120;

// A feature row carries a stable id so React keys survive reordering/removal — an index
// key would let React reuse the wrong input's DOM node (transient focus/caret quirks) when
// rows move. `value` is the copy; only `value` is sent to the API.
type FeatureRow = { id: number; value: string };

// Programme copy editor (G-1). Edits name, description and the ordered feature list; the
// commercial fields (price, tier, Stripe id, active state) are read-only context — this is
// a copy editor, not a tier manager (contracts §Admin/programmes).
export function ProgrammeForm({ programme }: { programme: ExistingProgramme }) {
  const router = useRouter();
  const [name, setName] = useState(programme.name);
  const [description, setDescription] = useState(programme.description ?? "");
  const [features, setFeatures] = useState<FeatureRow[]>(() =>
    programme.features.map((value, i) => ({ id: i, value })),
  );
  const nextId = useRef(programme.features.length);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setFeature(i: number, value: string) {
    setFeatures((prev) => prev.map((f, idx) => (idx === i ? { ...f, value } : f)));
  }
  function addFeature() {
    setFeatures((prev) => (prev.length >= MAX_FEATURES ? prev : [...prev, { id: nextId.current++, value: "" }]));
  }
  function removeFeature(i: number) {
    setFeatures((prev) => prev.filter((_, idx) => idx !== i));
  }
  // Swap with the neighbour — order is the whole point of the list (it's what the card
  // renders top-to-bottom), so reordering is a first-class edit, not a nicety.
  function move(i: number, dir: -1 | 1) {
    setFeatures((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Name is required.");
    // Client mirror of the DB CHECK: no blank rows. We reject rather than silently drop —
    // a dropped row makes the admin think they saved a feature they didn't.
    const trimmed = features.map((f) => f.value.trim());
    if (trimmed.some((f) => f.length === 0)) {
      return setError("Feature rows can't be blank — fill each row in or remove it.");
    }
    if (trimmed.some((f) => f.length > MAX_FEATURE_LEN)) {
      return setError(`Each feature must be ${MAX_FEATURE_LEN} characters or fewer.`);
    }
    if (trimmed.length > MAX_FEATURES) {
      return setError(`A card shows at most ${MAX_FEATURES} features.`);
    }

    setSaving(true);
    setError(null);
    // Whole-array replace: send the list in its current order. A blanked description
    // CLEARS (send null — the PATCH schema is nullable).
    const result = await updateProgramme(programme.id, {
      name: name.trim(),
      description: description.trim() || null,
      features: trimmed,
    });
    setSaving(false);
    if (result.ok) {
      // Just push: the list page is `cache: "no-store"` (lib/api.ts), so a soft nav
      // always refetches. An added `router.refresh()` here (as in content-form) races
      // the push in this Next 16 build and can strand you on the edit URL — verified in
      // e2e. The refetch we'd want from refresh() is already guaranteed by no-store.
      router.push("/dashboard/programmes");
    } else {
      // Surfaces the server's 4xx verbatim (e.g. the DB CHECK rejecting a value the
      // client mirror somehow missed) — never swallowed.
      setError(result.error);
    }
  }

  const atMax = features.length >= MAX_FEATURES;

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      {/* Read-only context — the commercial fields this screen must not write. */}
      <div className="grid gap-4 rounded-md border bg-muted/30 p-4 sm:grid-cols-2">
        <ReadOnly label="Tier" value={`Tier ${programme.tierRank}`} />
        <ReadOnly
          label="Price"
          value={`${formatMoney(programme.priceMinor, programme.currency)} / ${programme.billingInterval}`}
        />
        <ReadOnly label="Stripe price id" value={programme.stripePriceId ?? "—"} />
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <div>
            <Badge variant={programme.isActive ? "default" : "secondary"}>
              {programme.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Features (card bullets, in order)</Label>
          <span className="text-xs text-muted-foreground">
            {features.length} / {MAX_FEATURES}
          </span>
        </div>

        {features.length === 0 ? (
          <p className="text-sm text-muted-foreground">No features yet. Add the bullets shown on this tier&apos;s card.</p>
        ) : (
          <ul className="space-y-2">
            {features.map((f, i) => (
              <li key={f.id} className="flex items-center gap-2">
                <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}.</span>
                <Input
                  aria-label={`Feature ${i + 1}`}
                  value={f.value}
                  maxLength={MAX_FEATURE_LEN}
                  onChange={(e) => setFeature(i, e.target.value)}
                  placeholder="e.g. Bi-monthly small-group live classes"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Move feature ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Move feature ${i + 1} down`}
                  disabled={i === features.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  aria-label={`Remove feature ${i + 1}`}
                  onClick={() => removeFeature(i)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addFeature} disabled={atMax}>
          Add feature
        </Button>
        {atMax && <p className="text-xs text-muted-foreground">Maximum of {MAX_FEATURES} features reached.</p>}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard/programmes")}
          disabled={saving}
        >
          Cancel
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm break-all">{value}</p>
    </div>
  );
}
