"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePage } from "@/app/dashboard/pages/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";

export type ExistingPage = {
  slug: string;
  title: string;
  bodyHtml: string;
  isPublished: boolean;
  updatedAt: string;
};

// CR-008 info-page editor. HTML SOURCE textarea + a live preview rendered in a
// `sandbox`ed iframe with NO allow-scripts — so even un-sanitized markup the admin is
// mid-typing can never run script in this browser session. The backend sanitizes again
// on save (src/pages/sanitize.ts), so what ships is always the allow-listed subset.
// A plain textarea (not a WYSIWYG dep) is deliberate: legal copy is pasted as HTML and
// the preview is the feedback loop. Swap in a rich-text editor later with no API change.
export function PageForm({ page }: { page: ExistingPage }) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [bodyHtml, setBodyHtml] = useState(page.bodyHtml);
  const [isPublished, setIsPublished] = useState(page.isPublished);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Title is required.");
    setSaving(true);
    setError(null);
    const result = await updatePage(page.slug, { title: title.trim(), bodyHtml, isPublished });
    setSaving(false);
    if (result.ok) router.push("/dashboard/pages");
    else setError(result.error);
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Body</Label>
        <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
        <p className="text-xs text-muted-foreground">
          Format with the toolbar — no HTML knowledge needed. Use <strong>HTML</strong> to edit the
          source directly. Scripts and disallowed tags are removed automatically on save.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        Published (visible in the app)
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
