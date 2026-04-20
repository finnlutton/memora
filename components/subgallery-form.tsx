"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { LocationAutocompleteInput } from "@/components/location-autocomplete-input";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Button } from "@/components/ui/button";
import { filesToPhotos, readFileAsDataUrl } from "@/lib/file";
import { createId, nextImageUnoptimizedForSrc, reorderList } from "@/lib/utils";
import type { MemoryPhoto, Subgallery, SubgalleryInput } from "@/types/memora";

function fieldClassName() {
  return "w-full border-0 border-b border-[color:var(--border-strong)]/60 bg-transparent px-0 py-2.5 text-[15px] text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--ink)]";
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [coverImage, setCoverImage] = useState(initialValue?.coverImage ?? "/demo/mountain-window.svg");
  const [location, setLocation] = useState(initialValue?.location ?? "");
  const [locationLat, setLocationLat] = useState<number | null>(initialValue?.locationLat ?? null);
  const [locationLng, setLocationLng] = useState<number | null>(initialValue?.locationLng ?? null);
  const [dateLabel, setDateLabel] = useState(initialValue?.dateLabel ?? "");
  const [description, setDescription] = useState(initialValue?.description ?? "");
  const [photos, setPhotos] = useState<MemoryPhoto[]>(initialValue?.photos ?? []);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
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
        dateLabel,
        description,
        photos,
      });
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

      {/* Journal surface */}
      <div className="relative overflow-hidden border border-[color:var(--border)] bg-[color:var(--background)]/70 backdrop-blur-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="order-2 space-y-8 px-5 py-6 md:order-1 md:px-8 md:py-8 lg:border-r lg:border-[color:var(--border)]/70">
            <header>
              <Label>Journal entry</Label>
              <p className="mt-1.5 max-w-lg text-[13px] leading-6 text-[color:var(--ink-soft)]">
                One stop, one scene — the piece of the trip you'll want to reread.
              </p>
            </header>

            <div className="space-y-6">
              <label className="block space-y-1.5">
                <Label>Title</Label>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={`${fieldClassName()} font-serif text-[22px] leading-tight md:text-[26px]`}
                  placeholder="Zermatt"
                />
              </label>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <Label>Location</Label>
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
                </label>
                <label className="block space-y-1.5">
                  <Label>Date or timeframe</Label>
                  <input
                    value={dateLabel}
                    onChange={(event) => setDateLabel(event.target.value)}
                    className={fieldClassName()}
                    placeholder="Feb 11–13"
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <Label>Story</Label>
                <textarea
                  required
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${fieldClassName()} min-h-36 resize-none leading-7`}
                  placeholder="What made this stop, place, or moment worth remembering?"
                />
              </label>
            </div>
          </div>

          <aside className="order-1 flex flex-col gap-6 border-b border-[color:var(--border)]/70 bg-[color:var(--paper)]/40 px-5 py-6 md:order-2 md:px-8 md:py-8 lg:border-b-0">
            <header>
              <Label>Cover</Label>
              <p className="mt-1.5 text-[13px] leading-6 text-[color:var(--ink-soft)]">
                Upload a custom cover or pick one from the photos below.
              </p>
            </header>

            {coverImage ? (
              <div className="relative aspect-[20/9] overflow-hidden border border-[color:var(--border)]">
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
              <div className="flex aspect-[20/9] items-center justify-center border border-dashed border-[color:var(--border-strong)]/40 bg-[color:var(--background)]/40 text-[13px] text-[color:var(--ink-faint)]">
                No cover selected
              </div>
            )}

            <UploadDropzone
              label={coverImage ? "Replace cover image" : "Select a cover photo"}
              hint="Drop a hero image or click to browse."
              busy={isUploadingCover}
              onFilesSelected={async (files) => {
                setIsUploadingCover(true);
                const nextSrc = await readFileAsDataUrl(files[0]);
                setCoverImage(nextSrc);
                setIsUploadingCover(false);
              }}
            />
          </aside>
        </div>

        {/* Footer — unified save row */}
        <div className="flex flex-col gap-3 border-t border-[color:var(--border)]/70 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="text-[12px] leading-5 text-[color:var(--ink-soft)]">
            {photos.length === 0
              ? "Add at least one photo below before saving."
              : initialValue
                ? "Your changes will replace the current scene."
                : "You can reorder and caption photos after saving."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => router.back()}
              className="text-[13px] text-[color:var(--ink-soft)] underline-offset-4 transition hover:text-[color:var(--ink)] hover:underline disabled:opacity-40"
            >
              Cancel
            </button>
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
          <p className="border-t border-[color:var(--error-border)]/40 bg-[color:var(--error-bg)] px-5 py-2.5 text-[13px] text-[color:var(--error-text)] md:px-8">
            {submitError}
          </p>
        ) : null}
      </div>

      {/* Photo collection — separate surface, still quiet */}
      <section className="relative overflow-hidden border border-[color:var(--border)] bg-[color:var(--background)]/70 backdrop-blur-sm">
        <header className="flex flex-col gap-3 px-5 py-6 md:flex-row md:items-end md:justify-between md:px-8 md:py-7">
          <div>
            <Label>Photo collection</Label>
            <h3 className="mt-2 font-serif text-[26px] leading-tight text-[color:var(--ink)] md:text-[30px]">
              Add and order images
            </h3>
          </div>
          <p className="text-[12px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            {isPhotoLimitFinite
              ? `${photos.length} / ${photoLimit} photos`
              : `${photos.length} photos`}
          </p>
        </header>

        {reachedPhotoLimit ? (
          <p className="border-t border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] px-5 py-2.5 text-[13px] text-[color:var(--warning-text)] md:px-8">
            You&apos;ve reached the photo limit for this plan.{" "}
            <Link href="/galleries/settings/membership" className="text-[color:var(--ink)] underline underline-offset-2">
              Choose membership
            </Link>
            .
          </p>
        ) : null}

        <div className="border-t border-[color:var(--border)]/70">
          <UploadDropzone
            label="Upload memory photos"
            hint="Drop multiple images or click to browse. They'll appear below immediately."
            multiple
            busy={isUploadingPhotos}
            disabled={reachedPhotoLimit}
            onFilesSelected={async (files) => {
              if (reachedPhotoLimit) return;
              setIsUploadingPhotos(true);
              const tempSubgalleryId = initialValue?.id ?? createId("draft-subgallery");
              const allowedFiles =
                remainingPhotoSlots == null ? files : files.slice(0, remainingPhotoSlots);
              const uploaded = await filesToPhotos(allowedFiles, tempSubgalleryId, photos.length);
              setPhotos((current) => [...current, ...uploaded]);
              if (!coverImage && uploaded[0]) {
                setCoverImage(uploaded[0].src);
              }
              setIsUploadingPhotos(false);
            }}
          />
        </div>

        {photos.length > 0 ? (
          <div className="grid gap-px bg-[color:var(--border)]/50 md:grid-cols-2 xl:grid-cols-3">
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
                      <span className="absolute left-3 top-3 bg-[color:var(--ink)] px-2 py-[3px] text-[10px] uppercase tracking-[0.22em] text-white">
                        Cover
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 px-4 py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                        Photo {index + 1}
                      </span>
                      <div className="flex items-center gap-1 text-[color:var(--ink-faint)]">
                        <button
                          type="button"
                          aria-label="Move photo left"
                          disabled={index === 0}
                          onClick={() =>
                            setPhotos((current) => reorderList(current, index, Math.max(0, index - 1)))
                          }
                          className="p-1 transition hover:text-[color:var(--ink)] disabled:opacity-30"
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
                          className="p-1 transition hover:text-[color:var(--ink)] disabled:opacity-30"
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
                      className={`${fieldClassName()} min-h-20 resize-none text-[13.5px] leading-6`}
                      placeholder="Add a caption or detail worth remembering."
                    />
                    <div className="mt-auto flex items-center justify-between text-[12px]">
                      <button
                        type="button"
                        onClick={() => setCoverImage(photo.src)}
                        aria-pressed={isCover}
                        className={`inline-flex items-center gap-1.5 transition ${
                          isCover
                            ? "text-[color:var(--ink)]"
                            : "text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
                        }`}
                      >
                        <span
                          className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border transition ${
                            isCover
                              ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                              : "border-[color:var(--border-strong)]/60"
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
                        className="text-[color:var(--ink-faint)] underline-offset-4 transition hover:text-[color:var(--error-text)] hover:underline"
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
          <p className="border-t border-[color:var(--border)]/70 px-5 py-10 text-center text-[13px] text-[color:var(--ink-faint)] md:px-8">
            No photos yet — add images to start arranging the sequence.
          </p>
        )}
      </section>
    </form>
  );
}
