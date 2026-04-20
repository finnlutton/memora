"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";

export function UploadDropzone({
  label,
  hint,
  multiple = false,
  onFilesSelected,
  busy = false,
  disabled = false,
}: {
  label: string;
  hint: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void | Promise<void>;
  busy?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOver, setIsOver] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (disabled) return;
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    await onFilesSelected(files);
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
      className={`group relative flex items-center gap-4 border-y px-4 py-5 transition ${
        disabled
          ? "cursor-not-allowed opacity-60 border-[color:var(--border)]"
          : "cursor-pointer"
      } ${
        isOver
          ? "border-[color:var(--ink)]/40 bg-[color:var(--paper)]"
          : "border-[color:var(--border)]/70 bg-transparent hover:bg-[color:var(--paper)]/70 hover:border-[color:var(--border-strong)]/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        className="hidden"
        accept="image/*"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--ink-soft)]">
        {busy ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : multiple ? (
          <UploadCloud className="h-4 w-4" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-medium leading-5 text-[color:var(--ink)]">{label}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-[color:var(--ink-soft)]">{hint}</p>
      </div>
      <p className="hidden shrink-0 text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)] md:block">
        {isOver ? "Release to upload" : "Drop or click"}
      </p>
    </div>
  );
}
