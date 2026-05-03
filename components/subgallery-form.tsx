"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { LocationAutocompleteInput } from "@/components/location-autocomplete-input";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { filesToPhotos, readFileAsDataUrl } from "@/lib/file";
import { createId, nextImageUnoptimizedForSrc, reorderList } from "@/lib/utils";
import type { MemoryPhoto, Subgallery, SubgalleryInput } from "@/types/memora";

function fieldClassName() {
  // text-base on mobile is 16px — anything smaller triggers iOS Safari's
  // auto-zoom on focus. Desktop keeps the editorial 15px rhythm.
  return "w-full border-0 border-b-[1.5px] border-[color:var(--border-strong)] bg-transparent px-0 py-3 text-base text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] hover:border-[color:var(--ink-soft)] focus:border-[color:var(--ink)] md:text-[15px]";
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
      {children}
    </span>
  );
}

export function SubgalleryForm({
  galleryId,
  initialValue,
  photoLimit = null,
  onSubmit,
}: {
  galleryId: string;
  initialValue?: Subgallery;
  photoLimit?: number | null;
  onSubmit: (value: SubgalleryInput) => Promise<void> | void;
}) {
  const router = useRouter();
  const { onboarding } = useMemoraStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Text-only drafts so a tab return / remount doesn't cost the user
  // their typing. Cover image and the photo array are NOT drafted —
  // those are exactly the kinds of large blobs we promised to keep
  // out of any client-side persistence layer.
  const draftScope = `${onboarding.user?.id ?? "anon"}:subgallery:${galleryId}:${
    initialValue?.id ?? "new"
  }`;
  const [title, setTitle, clearTitleDraft] = useFormDraft({
    scope: draftScope,
    field: "title",
    initialValue: initialValue?.title ?? "",
  });
  const [coverImage, setCoverImage] = useState(initialValue?.coverImage ?? "/demo/mountain-window.svg");
  const [location, setLocation] = useState(initialValue?.location ?? "");
  const [locationLat, setLocationLat] = useState<number | null>(initialValue?.locationLat ?? null);
  const [locationLng, setLocationLng] = useState<number | null>(initialValue?.locationLng ?? null);
  const [startDate, setStartDate] = useState(initialValue?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValue?.endDate ?? "");
  const [description, setDescription, clearDescriptionDraft] = useFormDraft({
    scope: draftScope,
    field: "description",
    initialValue: initialValue?.description ?? "",
  });
  const [photos, setPhotos] = useState<MemoryPhoto[]>(initialValue?.photos ?? []);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [photosError, setPhotosError] = useState("");
  const isPhotoLimitFinite = photoLimit != null && Number.isFinite(photoLimit);
  const reachedPhotoLimit = isPhotoLimitFinite && photos.length >= (photoLimit ?? 0);
  const remainingPhotoSlots = isPhotoLimitFinite ? Math.max(0, (photoLimit ?? 0) - photos.length) : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        coverImage,
        location,
        locationLat,
        locationLng,
        startDate,
        endDate,
        description,
        photos,
      });
      clearTitleDraft();
      clearDescriptionDraft();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save subgallery.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href={`/galleries/${galleryId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to gallery
          </Link>
        </Button>
      </div>

      {/* Journal surface — opaque, stronger edge */}
      <div className="relative overflow-hidden border border-[color:var(--border-strong)]/70 bg-[color:var(--background)] shadow-[0_6px_24px_rgba(14,22,34,0.06)]">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="order-2 space-y-8 px-5 py-6 md:order-1 md:px-8 md:py-8 lg:border-r lg:border-[color:var(--border-strong)]/50">
            <header>
              <Label>Journal entry</Label>
              <p className="mt-2 max-w-lg text-[14px] leading-6 text-[color:var(--ink-soft)]">
                One stop, one scene — the piece of the trip you&apos;ll want to reread.
              </p>
            </header>

            <div className="space-y-7">
              <div className="space-y-2">
                <Label>Title</Label>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={`${fieldClassName()} font-serif text-[24px] leading-tight md:text-[28px]`}
                  placeholder="Zermatt"
                />
              </div>

              <div className="space-y-2">
                <Label>Location (optional)</Label>
                <LocationAutocompleteInput
                  value={{ label: location, lat: locationLat, lng: locationLng }}
                  onChange={(next) => {
                    setLocation(next.label);
                    setLocationLat(next.lat);
                    setLocationLng(next.lng);
                  }}
                  className={fieldClassName()}
                  placeholder="Zermatt, Switzerland"
                />
              </div>

              <div className="grid gap-7 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start date (optional)</Label>
                  <DateField
                    value={startDate}
                    onChange={setStartDate}
                    ariaLabel="Start date"
                    placeholder="Choose a date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date (optional)</Label>
                  <DateField
                    value={endDate}
                    onChange={setEndDate}
                    ariaLabel="End date"
                    placeholder="Choose a date"
                    min={startDate || undefined}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Story</Label>
                <textarea
                  required
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${fieldClassName()} min-h-36 resize-none leading-7`}
                  placeholder="What made this stop, place, or moment worth remembering?"
                />
              </div>
            </div>
          </div>

          <aside className="order-1 flex flex-col gap-5 border-b border-[color:var(--border-strong)]/50 bg-[color:var(--paper)] px-5 py-6 md:order-2 md:px-8 md:py-8 lg:border-b-0">
            <header>
              <Label>Cover</Label>
              <p className="mt-2 text-[14px] leading-6 text-[color:var(--ink-soft)]">
                Upload a custom cover or pick one from the photos below.
              </p>
            </header>

            {coverImage ? (
              <div className="relative aspect-[20/9] overflow-hidden border border-[color:var(--border-strong)]/70">
                <Image
                  src={coverImage}
                  alt="Subgallery cover preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 35vw"
                  unoptimized={nextImageUnoptimizedForSrc(coverImage)}
                />
              </div>
            ) : (
              <div className="flex aspect-[20/9] items-center justify-center border border-dashed border-[color:var(--border-strong)] bg-[color:var(--background)] text-[13px] font-medium text-[color:var(--ink-soft)]">
                No cover selected
              </div>
            )}

            <UploadDropzone
              label={coverImage ? "Replace cover image" : "Select a cover photo"}
              hint="Drop a hero image or click to browse."
              busy={isUploadingCover}
              onError={(message) => setCoverError(message)}
              onFilesSelected={async (files) => {
                setIsUploadingCover(true);
                try {
                  const nextSrc = await readFileAsDataUrl(files[0]);
                  setCoverImage(nextSrc);
                  setCoverError("");
                } catch (error) {
                  setCoverError(
                    error instanceof Error
                      ? error.message
                      : "We couldn't process this image.",
                  );
                } finally {
                  setIsUploadingCover(false);
                }
              }}
            />
            {coverError ? (
              <p className="text-[12px] leading-5 text-[color:var(--error-text)]">
                {coverError}
              </p>
            ) : null}
          </aside>
        </div>

        <div className="flex flex-col gap-3 border-t border-[color:var(--border-strong)]/50 bg-[color:var(--paper)]/50 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="text-[13px] leading-5 text-[color:var(--ink-soft)]">
            {photos.length === 0
              ? "Add at least one photo below before saving."
              : initialValue
                ? "Your changes will replace the current scene."
                : "You can reorder and caption photos after saving."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploadingCover || isUploadingPhotos || !coverImage || photos.length === 0}
            >
              <Save className="h-4 w-4" />
              {isSubmitting
                ? initialValue
                  ? "Saving..."
                  : "Creating..."
                : initialValue
                  ? "Save subgallery"
                  : "Create subgallery"}
            </Button>
          </div>
        </div>
        {submitError ? (
          <p className="border-t border-[color:var(--error-border)] bg-[color:var(--error-bg)] px-5 py-2.5 text-[13px] font-medium text-[color:var(--error-text)] md:px-8">
            {submitError}
          </p>
        ) : null}
      </div>

      {/* Photo collection */}
      <section className="relative overflow-hidden border border-[color:var(--border-strong)]/70 bg-[color:var(--background)] shadow-[0_6px_24px_rgba(14,22,34,0.06)]">
        <header className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-end md:justify-between md:gap-3 md:px-8 md:py-7">
          <div>
            <Label>Photo collection</Label>
            <h3 className="mt-2 font-serif text-[28px] leading-tight text-[color:var(--ink)] md:text-[32px]">
              Add and order images
            </h3>
          </div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
            {isPhotoLimitFinite
              ? `${photos.length} / ${photoLimit} photos`
              : `${photos.length} photos`}
          </p>
        </header>

        {reachedPhotoLimit ? (
          <p className="border-t border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] px-5 py-2.5 text-[13px] font-medium text-[color:var(--warning-text)] md:px-8">
            You&apos;ve reached the photo limit for this plan.{" "}
            <Link href="/galleries/settings/membership" className="text-[color:var(--ink)] underline underline-offset-2">
              Choose membership
            </Link>
            .
          </p>
        ) : null}

        <div className="border-t border-[color:var(--border-strong)]/50">
          <UploadDropzone
            label="Upload memory photos"
            hint="Drop multiple images or click to browse. They'll appear below immediately."
            multiple
            busy={isUploadingPhotos}
            disabled={reachedPhotoLimit}
            onError={(message) => setPhotosError(message)}
            onFilesSelected={async (files) => {
              if (reachedPhotoLimit) return;
              setIsUploadingPhotos(true);
              try {
                const tempSubgalleryId = initialValue?.id ?? createId("draft-subgallery");
                const allowedFiles =
                  remainingPhotoSlots == null ? files : files.slice(0, remainingPhotoSlots);
                const uploaded = await filesToPhotos(allowedFiles, tempSubgalleryId, photos.length);
                setPhotos((current) => [...current, ...uploaded]);
                if (!coverImage && uploaded[0]) {
                  setCoverImage(uploaded[0].src);
                }
                setPhotosError("");
              } catch (error) {
                setPhotosError(
                  error instanceof Error
                    ? error.message
                    : "We couldn't process one or more of those images.",
                );
              } finally {
                setIsUploadingPhotos(false);
              }
            }}
          />
          {photosError ? (
            <p className="border-t border-[color:var(--border-strong)]/50 px-5 py-2.5 text-[13px] font-medium text-[color:var(--error-text)] md:px-8">
              {photosError}
            </p>
          ) : null}
        </div>

        {photos.length > 0 ? (
          <div className="grid gap-px bg-[color:var(--border-strong)]/40 md:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo, index) => {
              const isCover = coverImage === photo.src;
              return (
                <article
                  key={photo.id}
                  className="relative flex flex-col bg-[color:var(--background)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={photo.src}
                      alt={photo.caption || "Uploaded photo"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1280px) 50vw, 33vw"
                      unoptimized={nextImageUnoptimizedForSrc(photo.src)}
                    />
                    {isCover ? (
                      <span className="absolute left-3 top-3 bg-[color:var(--ink)] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
                        Cover
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 px-3 py-3 md:gap-3 md:px-4 md:py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                        Photo {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Move photo left"
                          disabled={index === 0}
                          onClick={() =>
                            setPhotos((current) => reorderList(current, index, Math.max(0, index - 1)))
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-[color:var(--border-strong)]/70 text-[color:var(--ink-soft)] transition hover:border-[color:var(--ink-soft)] hover:text-[color:var(--ink)] disabled:cursor-not-allowed disabled:opacity-30 md:h-7 md:w-7"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move photo right"
                          disabled={index === photos.length - 1}
                          onClick={() =>
                            setPhotos((current) =>
                              reorderList(current, index, Math.min(current.length - 1, index + 1)),
                            )
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-[color:var(--border-strong)]/70 text-[color:var(--ink-soft)] transition hover:border-[color:var(--ink-soft)] hover:text-[color:var(--ink)] disabled:cursor-not-allowed disabled:opacity-30 md:h-7 md:w-7"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={photo.caption}
                      onChange={(event) =>
                        setPhotos((current) =>
                          current.map((entry) =>
                            entry.id === photo.id ? { ...entry, caption: event.target.value } : entry,
                          ),
                        )
                      }
                      className={`${fieldClassName()} min-h-14 resize-none leading-6 md:min-h-20 md:text-[13.5px]`}
                      placeholder="Add a caption or detail worth remembering."
                    />
                    <div className="mt-auto flex items-center justify-between text-[13px]">
                      <button
                        type="button"
                        onClick={() => setCoverImage(photo.src)}
                        aria-pressed={isCover}
                        className={`inline-flex items-center gap-2 font-medium transition ${
                          isCover
                            ? "text-[color:var(--ink)]"
                            : "text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border transition ${
                            isCover
                              ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                              : "border-[color:var(--border-strong)]"
                          }`}
                        >
                          {isCover ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                        </span>
                        {isCover ? "Cover" : "Set as cover"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPhotos((current) => current.filter((entry) => entry.id !== photo.id))
                        }
                        className="font-medium text-[color:var(--ink-soft)] underline-offset-4 transition hover:text-[color:var(--error-text)] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="border-t border-[color:var(--border-strong)]/50 px-5 py-10 text-center text-[14px] text-[color:var(--ink-soft)] md:px-8">
            No photos yet — add images to start arranging the sequence.
          </p>
        )}
      </section>
    </form>
  );
}
