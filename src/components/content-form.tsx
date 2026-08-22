"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createContent,
  updateContent,
  presignUpload,
  videoUploadUrl,
} from "@/app/dashboard/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/image-upload";

export type TierOption = { rank: number; label: string };

export type ExistingContent = {
  id: string;
  type: "video" | "audio";
  pillar: "align" | "sculpt" | "evolve";
  title: string;
  description: string | null;
  requiredTierRank: number;
  durationSeconds: number | null;
  weekNumber: number | null;
  offlineDownloadable: boolean;
  videoRef: string | null;
  s3Key: string | null;
  thumbnailUrl?: string | null; // current artwork, for the image-upload preview
};

const PILLARS = ["align", "sculpt", "evolve"] as const;

// Create/edit a content item. Upload is the presigned-PUT dance: get a URL from
// the backend, PUT the file straight to storage from the browser, then save the
// returned ref on the content row. Storage 503s (S3/Mux unconfigured) surface here
// verbatim, so the path degrades cleanly until infra exists.
export function ContentForm({
  mode,
  tierOptions,
  content,
}: {
  mode: "create" | "edit";
  tierOptions: TierOption[];
  content?: ExistingContent;
}) {
  const router = useRouter();
  const [type, setType] = useState<"video" | "audio">(content?.type ?? "audio");
  const [pillar, setPillar] = useState<"align" | "sculpt" | "evolve">(content?.pillar ?? "align");
  const [title, setTitle] = useState(content?.title ?? "");
  const [description, setDescription] = useState(content?.description ?? "");
  const [tierRank, setTierRank] = useState(String(content?.requiredTierRank ?? 0));
  const [durationSeconds, setDurationSeconds] = useState(
    content?.durationSeconds != null ? String(content.durationSeconds) : "",
  );
  const [weekNumber, setWeekNumber] = useState(content?.weekNumber != null ? String(content.weekNumber) : "");
  const [offline, setOffline] = useState(content?.offlineDownloadable ?? false);
  const [videoRef, setVideoRef] = useState(content?.videoRef ?? "");
  const [s3Key, setS3Key] = useState(content?.s3Key ?? "");
  // A newly uploaded thumbnail key (null = keep the existing image).
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRef = type === "video" ? videoRef : s3Key;
  const busy = uploading || saving;

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    setFileName(file.name);
    try {
      if (type === "audio") {
        const ct = file.type || "application/octet-stream";
        const r = await presignUpload({ filename: file.name, contentType: ct, category: "audio", sizeBytes: file.size });
        if (!r.ok) return setError(r.error);
        // S3 bakes the content-type into the signature — the PUT header MUST match.
        const put = await fetch(r.data.uploadUrl, { method: "PUT", headers: { "content-type": ct }, body: file });
        if (!put.ok) return setError(`Upload to storage failed (${put.status}).`);
        setS3Key(r.data.objectKey);
      } else {
        const r = await videoUploadUrl(file.name);
        if (!r.ok) return setError(r.error);
        // Mux direct-upload URL is not content-type-bound like S3's, so don't force
        // the header. ponytail: verify PUT semantics against real Mux in hardening.
        const put = await fetch(r.data.uploadUrl, { method: "PUT", body: file });
        if (!put.ok) return setError(`Upload to Mux failed (${put.status}).`);
        setVideoRef(r.data.pendingRef);
      }
    } catch {
      setError("Upload failed — network or storage error.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Title is required.");
    if (mode === "create" && !currentRef) {
      return setError(`Upload ${type === "video" ? "a video" : "an audio file"} first.`);
    }
    setSaving(true);
    setError(null);
    // On edit a blanked optional field must CLEAR (send null — the PATCH schema is
    // nullable); on create the backend rejects null, so blanks are omitted instead.
    const blank = mode === "edit" ? null : undefined;
    const base = {
      pillar,
      title: title.trim(),
      description: description.trim() || blank,
      requiredTierRank: Number(tierRank),
      durationSeconds: durationSeconds ? Number(durationSeconds) : blank,
      weekNumber: weekNumber ? Number(weekNumber) : blank,
      // Video is stream-only (contract §4) — offline applies to audio alone.
      offlineDownloadable: type === "audio" ? offline : false,
      // Only send a thumbnail when a new one was uploaded; otherwise keep the existing.
      ...(thumbnailKey ? { thumbnailObjectKey: thumbnailKey } : {}),
    };

    const result =
      mode === "create"
        ? await createContent({ ...base, type, ...(type === "video" ? { videoRef } : { s3Key }) })
        : await updateContent(content!.id, {
            ...base,
            // Only send a ref when it was re-uploaded (changed from the original).
            ...(type === "video" && videoRef && videoRef !== content?.videoRef ? { videoRef } : {}),
            ...(type === "audio" && s3Key && s3Key !== content?.s3Key ? { s3Key } : {}),
          });

    setSaving(false);
    if (result.ok) {
      // Just push: the list page fetches with `cache: "no-store"` (lib/api.ts), so a soft
      // nav always refetches. A trailing `router.refresh()` races the push in this Next
      // build and can strand you on the edit URL — same fix the programmes form uses.
      router.push("/dashboard/content");
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          {mode === "edit" ? (
            <Input value={type} disabled />
          ) : (
            <Select value={type} onValueChange={(v) => setType((v as "video" | "audio") ?? "audio")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          )}
          {mode === "edit" && (
            <p className="text-xs text-muted-foreground">Type can&apos;t change after creation.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Pillar</Label>
          <Select value={pillar} onValueChange={(v) => setPillar((v as typeof pillar) ?? "align")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PILLARS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Required tier</Label>
          <Select value={tierRank} onValueChange={(v) => setTierRank(v ?? "0")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tierOptions.map((t) => (
                <SelectItem key={t.rank} value={String(t.rank)}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (seconds)</Label>
          <Input
            id="duration"
            inputMode="numeric"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="week">Week number</Label>
          <Input
            id="week"
            inputMode="numeric"
            value={weekNumber}
            onChange={(e) => setWeekNumber(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
      </div>

      {type === "audio" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} />
          Allow offline download (AES-256, audio only)
        </label>
      )}

      {/* Upload */}
      <div className="space-y-2 rounded-md border p-4">
        <Label>{type === "video" ? "Video file (streamed via Mux)" : "Audio file (stored in S3)"}</Label>
        <input
          type="file"
          // Audio list mirrors the backend presign whitelist (mpeg/mp4/aac/wav) so
          // the admin can't pick a file the presign will 400. Video: Mux is permissive.
          accept={type === "video" ? "video/*" : "audio/mpeg,audio/mp4,audio/aac,audio/wav,.mp3,.m4a,.aac,.wav"}
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {uploading
            ? `Uploading ${fileName}…`
            : currentRef
              ? `Uploaded: ${currentRef}${mode === "edit" ? " (upload again to replace)" : ""}`
              : mode === "edit"
                ? "Leave empty to keep the current file."
                : "Required. Uploads straight to storage; needs S3/Mux configured on the backend."}
        </p>
      </div>

      {/* Thumbnail image (artwork) — shown on the content card in the app. */}
      <div className="rounded-md border p-4">
        <ImageUpload
          label="Thumbnail image"
          currentUrl={content?.thumbnailUrl}
          onChange={setThumbnailKey}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {saving ? "Saving…" : mode === "create" ? "Create (as draft)" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/content")} disabled={busy}>
          Cancel
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}
