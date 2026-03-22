"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";

export function UploadDropzone({
  label,
  hint,
  multiple = false,
  onFilesSelected,
  busy = false,
}: {
  label: string;
  hint: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void | Promise<void>;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOver, setIsOver] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) {
      return;
    }
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
        await handleFiles(event.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`group cursor-pointer rounded-[1.75rem] border border-dashed px-5 py-6 transition ${
        isOver
          ? "border-[color:var(--accent)] bg-[color:var(--paper)]"
          : "border-[color:var(--border-strong)] bg-white/70 hover:border-[color:var(--accent)] hover:bg-[color:var(--paper)]"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[color:var(--accent)] shadow-[0_10px_24px_rgba(36,55,78,0.08)]">
          {busy ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : multiple ? (
            <UploadCloud className="h-5 w-5" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </div>
        <div>
          <p className="font-medium text-[color:var(--ink)]">{label}</p>
          <p className="text-sm leading-7 text-[color:var(--ink-soft)]">{hint}</p>
        </div>
      </div>
    </div>
  );
}
