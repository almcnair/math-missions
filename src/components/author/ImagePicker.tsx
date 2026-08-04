"use client";

// ImagePicker
// -----------
// Drag-and-drop / file-input image uploader for the Authoring Studio.
// Used by any slide editor that has an optional `image?: MissionImage`.
//
// Contract:
//   - value: current MissionImage or undefined
//   - onChange: called with new MissionImage (after upload) or undefined (on remove)
//   - missionId: scopes the upload directory and is required for the API call
//
// Visual contract: the upload zone is collapsed to a slim "add image" button
// until a file is dragging or already attached. With an image attached, the
// preview tile shows the thumbnail + alt + caption fields + remove.

import { useRef, useState, useCallback } from "react";
import type { MissionImage } from "@/lib/mission-schema";
import { actionDeleteImage } from "@/lib/author/actions";

interface ImagePickerProps {
  value: MissionImage | undefined;
  onChange: (next: MissionImage | undefined) => void;
  missionId: string;
  label?: string;
  hint?: string;
}

export function ImagePicker({
  value,
  onChange,
  missionId,
  label = "Image (optional)",
  hint,
}: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const form = new FormData();
        form.set("missionId", missionId);
        form.set("file", file);
        const res = await fetch("/api/author/upload", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? `Upload failed (${res.status})`);
        }
        // If we already had an image, delete it from disk before swapping.
        if (value?.src && value.src.startsWith("/mission-images/")) {
          actionDeleteImage(value.src).catch(() => {});
        }
        onChange({
          src: data.url,
          alt: value?.alt ?? "",
          caption: value?.caption,
          aspectRatio: value?.aspectRatio,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [missionId, onChange, value]
  );

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
    // Reset so picking the same file twice still fires onChange.
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  }

  function onRemove() {
    const prev = value?.src;
    onChange(undefined);
    if (prev && prev.startsWith("/mission-images/")) {
      actionDeleteImage(prev).catch(() => {});
    }
  }

  return (
    <div className="form-row">
      <label className="form-label">{label}</label>

      {value?.src ? (
        <div className="img-picker-attached">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="img-picker-thumb" src={value.src} alt={value.alt} />
          <div className="img-picker-fields">
            <input
              className="form-input"
              type="text"
              placeholder="Alt text (describe the image for screen readers)"
              value={value.alt}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
            />
            <input
              className="form-input"
              type="text"
              placeholder="Caption (optional, shown beneath the image)"
              value={value.caption ?? ""}
              onChange={(e) =>
                onChange({ ...value, caption: e.target.value || undefined })
              }
            />
            <div className="img-picker-actions">
              <button
                type="button"
                className="small-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Replace"}
              </button>
              <button
                type="button"
                className="small-btn small-btn-danger"
                onClick={onRemove}
                disabled={uploading}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`img-picker-dropzone${dragOver ? " is-drag" : ""}${uploading ? " is-loading" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <div className="img-picker-icon">⊕</div>
          <div className="img-picker-text">
            {uploading
              ? "Uploading…"
              : "Drop an image or click to choose"}
          </div>
          <div className="img-picker-sub">PNG · JPG · WEBP · GIF · SVG, up to 10 MB</div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        style={{ display: "none" }}
        onChange={onPickFile}
      />

      {error && <div className="img-picker-error">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
}
