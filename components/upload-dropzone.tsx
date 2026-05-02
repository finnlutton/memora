"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
]);

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

const HEIC_EXTS = new Set(["heic", "heif"]);

function validateImageFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name} is ${formatBytes(file.size)} — files must be under ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  const type = (file.type || "").toLowerCase();
  if (type) {
    if (!type.startsWith("image/") || !ALLOWED_IMAGE_MIME_TYPES.has(type)) {
      return `${file.name} isn't a supported image format.`;
    }
    return null;
  }
  // Some browsers (notably iOS Safari) leave .heic files with empty MIME —
  // accept by extension as a last resort.
  if (HEIC_EXTS.has(fileExt(file.name))) return null;
  return `${file.name} isn't a supported image format.`;
}

export function UploadDropzone({
  label,
  hint,
  multiple = false,
  onFilesSelected,
  onError,
  busy = false,
  disabled = false,
}: {
  label: string;
  hint: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void | Promise<void>;
  onError?: (message: string) => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOver, setIsOver] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (disabled) return;
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    const accepted: File[] = [];
    const rejections: string[] = [];
    for (const file of files) {
      const reason = validateImageFile(file);
      if (reason) rejections.push(reason);
      else accepted.push(file);
    }

    if (rejections.length) {
      onError?.(rejections.join(" "));
    } else {
      onError?.("");
    }

    if (!accepted.length) {
      // Reset native input so picking the same rejected file again still fires onChange.
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    await onFilesSelected(accepted);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setIsOver(false);
        if (disabled) return;
        await handleFiles(event.dataTransfer.files);
      }}
      onClick={() => {
        if (disabled) return;
        inputRef.current?.click();
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={label}
      className={`group relative flex items-center gap-4 border px-4 py-5 transition ${
        disabled
          ? "cursor-not-allowed border-[color:var(--border-strong)] opacity-60"
          : "cursor-pointer"
      } ${
        isOver
          ? "border-[color:var(--ink)] bg-[color:var(--paper-strong)]"
          : "border-[color:var(--border-strong)] bg-[color:var(--background)] hover:border-[color:var(--ink-soft)] hover:bg-[color:var(--paper)]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,.heic,.heif"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--paper)] text-[color:var(--ink)]">
        {busy ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : multiple ? (
          <UploadCloud className="h-4 w-4" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-semibold leading-5 text-[color:var(--ink)]">{label}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-[color:var(--ink-soft)]">{hint}</p>
      </div>
      <p className="hidden shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)] md:block">
        {isOver ? "Release to upload" : `Max ${formatBytes(MAX_UPLOAD_BYTES)}`}
      </p>
    </div>
  );
}
