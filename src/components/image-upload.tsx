"use client";

import { useState } from "react";
import { presignUpload } from "@/app/dashboard/content/actions";
import { Label } from "@/components/ui/label";

// Upload an artwork image from the admin's machine to our media server: presigned
// PUT (category "image") → the browser PUTs the bytes → the returned objectKey is
// stored on the content/course as `thumbnailObjectKey`. The app then shows it as
// the card/cover image. Same dance as the audio/video upload, images only.
export function ImageUpload({
  label,
  currentUrl,
  onChange,
}: {
  label: string;
  currentUrl?: string | null; // existing artwork, for a preview on edit
  onChange: (objectKey: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const ct = file.type || "image/jpeg";
      const r = await presignUpload({ filename: file.name, contentType: ct, category: "image", sizeBytes: file.size });
      if (!r.ok) return setError(r.error);
      // Image presign bakes the content-type into the signature — header must match.
      const put = await fetch(r.data.uploadUrl, { method: "PUT", headers: { "content-type": ct }, body: file });
      if (!put.ok) return setError(`Upload to storage failed (${put.status}).`);
      setUploadedKey(r.data.objectKey);
      onChange(r.data.objectKey);
    } catch {
      setError("Upload failed — network or storage error.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {currentUrl && !uploadedKey && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="current artwork" className="h-24 w-auto rounded-md border object-cover" />
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
      />
      <p className="text-xs text-muted-foreground">
        {uploading
          ? "Uploading…"
          : uploadedKey
            ? `Uploaded new image: ${uploadedKey}`
            : currentUrl
              ? "Upload to replace the current image. JPG/PNG/WebP."
              : "JPG/PNG/WebP. Optional — shown as the card image in the app."}
      </p>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
