"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFaq, updateFaq } from "@/app/dashboard/faq/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";

export type ExistingFaq = {
  id: string;
  question: string;
  answerHtml: string;
  position: number;
  isPublished: boolean;
};

// CR-008 FAQ editor, reused for create + edit. Answer is HTML SOURCE + a sandboxed
// (no-scripts) live preview — same posture as the page editor. Backend sanitizes on save.
export function FaqForm({ faq }: { faq?: ExistingFaq }) {
  const router = useRouter();
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answerHtml, setAnswerHtml] = useState(faq?.answerHtml ?? "");
  const [position, setPosition] = useState(String(faq?.position ?? 0));
  const [isPublished, setIsPublished] = useState(faq?.isPublished ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return setError("Question is required.");
    const pos = Number(position);
    if (!Number.isInteger(pos) || pos < 0) return setError("Position must be a whole number ≥ 0.");

    setSaving(true);
    setError(null);
    const body = { question: question.trim(), answerHtml, position: pos, isPublished };
    const result = faq ? await updateFaq(faq.id, body) : await createFaq(body);
    setSaving(false);
    if (result.ok) router.push("/dashboard/faq");
    else setError(result.error);
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="question">Question</Label>
        <Input id="question" value={question} maxLength={500} onChange={(e) => setQuestion(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Answer</Label>
        <RichTextEditor value={answerHtml} onChange={setAnswerHtml} />
        <p className="text-xs text-muted-foreground">
          Format with the toolbar, or use <strong>HTML</strong> for the raw source. Disallowed tags are
          removed on save.
        </p>
      </div>

      <div className="flex items-end gap-6">
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            type="number"
            min={0}
            className="w-28"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Published
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : faq ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
