"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MAX_UPLOAD_BYTES } from "@/components/upload-dropzone";
import type { ClipboardLayout } from "@/hooks/use-clipboard-items";

/**
 * Add-memory dialog.
 *
 * Two-step flow inside one Radix Dialog:
 *   1. Pick a format — text, photo, or text + photo.
 *   2. Fill the format-specific fields and save.
 *
 * Intentionally minimal: no title, no tags, no date — those are out
 * of scope for the MVP. Validation enforces "at least one of
 * (content, photo) is present" so the card always has substance.
 */

type Step = "choose" | "compose";

export function AddMemoryDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSubmit: (input: {
    layoutType: ClipboardLayout;
    content?: string | null;
    file?: File | null;
  }) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [layout, setLayout] = useState<ClipboardLayout>("text");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset every time the dialog opens.
  useEffect(() => {
    if (open) {
      setStep("choose");
      setLayout("text");
      setContent("");
      setFile(null);
      setPreviewUrl(null);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // Manage the object URL for the file preview.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleChoose = (next: ClipboardLayout) => {
    setLayout(next);
    setStep("compose");
  };

  const handleSubmit = async () => {
    setError(null);
    if (layout === "text" && !content.trim()) {
      setError("Add a few words first.");
      return;
    }
    if ((layout === "photo" || layout === "text_photo") && !file) {
      setError("Add a photo first.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        layoutType: layout,
        content: layout === "photo" ? null : content.trim(),
        file: layout === "text" ? null : file,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Memora clipboard: add failed", err);
      setError(
        err instanceof Error ? err.message : "Could not save. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(14,22,34,0.32)] backdrop-blur-[2px] data-[state=open]:animate-[memora-fade_180ms_ease]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 border border-[color:var(--border-strong)] bg-[color:var(--background)] p-5 shadow-[0_24px_60px_-20px_rgba(14,22,34,0.32)] md:p-6"
          onOpenAutoFocus={(e) => {
            // Don't autofocus the close button — let the textarea capture
            // attention when it mounts in the compose step instead.
            if (step === "choose") return;
            e.preventDefault();
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[color:var(--ink-soft)]">
                Clipboard
              </p>
              <Dialog.Title className="mt-1.5 font-serif text-[22px] leading-tight text-[color:var(--ink)]">
                {step === "choose" ? "Drop a memory" : "Write it down"}
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                Save a quick text or photo memory to your private clipboard.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="rounded-sm p-1.5 text-[color:var(--ink-faint)] transition hover:text-[color:var(--ink)]"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </Dialog.Close>
          </div>

          {step === "choose" ? (
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <ChoiceButton
                label="Text"
                hint="Just a thought"
                onClick={() => handleChoose("text")}
              />
              <ChoiceButton
                label="Photo"
                hint="Just an image"
                onClick={() => handleChoose("photo")}
              />
              <ChoiceButton
                label="Text + photo"
                hint="A note with one image"
                onClick={() => handleChoose("text_photo")}
              />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {layout !== "photo" ? (
                <textarea
                  autoFocus
                  rows={layout === "text" ? 6 : 4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What do you want to remember?"
                  className="w-full resize-none border border-[color:var(--border-strong)] bg-white px-3 py-2.5 font-serif text-base leading-7 text-[color:var(--ink)] outline-none transition focus:border-[color:var(--ink-soft)] md:text-[15px]"
                />
              ) : null}

              {layout !== "text" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,.heic,.heif"
                    className="hidden"
                    onChange={(e) => {
                      const next = e.target.files?.[0] ?? null;
                      if (next && next.size > MAX_UPLOAD_BYTES) {
                        const mb = (MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
                        setError(`That image is too large — keep it under ${mb} MB.`);
                        e.target.value = "";
                        return;
                      }
                      setError(null);
                      setFile(next);
                    }}
                  />
                  {previewUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Selected"
                        className="aspect-[4/3] w-full border border-[color:var(--border)] object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[color:var(--ink)] shadow-[0_3px_8px_rgba(14,22,34,0.18)] transition hover:bg-white"
                        aria-label="Remove photo"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center gap-3 border border-dashed border-[color:var(--border-strong)] bg-white px-3.5 py-4 text-left transition hover:border-[color:var(--ink-soft)] hover:bg-[color:var(--paper)]"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--paper)] text-[color:var(--ink)]">
                        <ImagePlus className="h-4 w-4" strokeWidth={1.6} />
                      </span>
                      <span>
                        <span className="block text-[13.5px] font-semibold text-[color:var(--ink)]">
                          Add a photo
                        </span>
                        <span className="block text-[12px] text-[color:var(--ink-soft)]">
                          One image — JPG, PNG, or HEIC
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              ) : null}

              {error ? (
                <p className="text-[12.5px] leading-5 text-[#9a4545]">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep("choose")}
                  disabled={submitting}
                  className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)] disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="inline-flex items-center justify-center bg-[color:var(--ink)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[color:var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ChoiceButton({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-1.5 border border-[color:var(--border-strong)] bg-white px-3.5 py-4 text-left transition hover:border-[color:var(--ink)] hover:bg-[color:var(--paper)]"
    >
      <span className="text-[13px] font-semibold text-[color:var(--ink)]">
        {label}
      </span>
      <span className="text-[11.5px] leading-4 text-[color:var(--ink-soft)]">
        {hint}
      </span>
    </button>
  );
}
