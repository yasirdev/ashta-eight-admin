"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClient } from "@/app/dashboard/clients/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Edit phone + admin-private notes. Saves via the server action, then refreshes
// the RSC to show the persisted values.
export function ClientEditForm({
  id,
  phone: phone0,
  notes: notes0,
}: {
  id: string;
  phone: string | null;
  notes: string | null;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(phone0 ?? "");
  const [notes, setNotes] = useState(notes0 ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const result = await updateClient(id, { phone, notes });
    setSaving(false);
    if (result.ok) {
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: result.error });
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Private notes (admin-only)</Label>
        <Textarea
          id="notes"
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes about this client…"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {msg && (
          <span className={`text-sm ${msg.ok ? "text-green-600" : "text-destructive"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
