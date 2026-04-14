"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, GripHorizontal, Save, Sparkles } from "lucide-react";
import { LocationAutocompleteInput } from "@/components/location-autocomplete-input";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Button } from "@/components/ui/button";
import { filesToPhotos, readFileAsDataUrl } from "@/lib/file";
import { createId, nextImageUnoptimizedForSrc, reorderList } from "@/lib/utils";
import type { MemoryPhoto, Subgallery, SubgalleryInput } from "@/types/memora";

function fieldClassName() {
  return "w-full rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)]";
}

export function SubgalleryForm({
  galleryId,
  initialValue,
  onSubmit,
}: {
  galleryId: string;
  initialValue?: Subgallery;
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
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href={`/galleries/${galleryId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to gallery
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.5rem] border border-white/60 bg-white/74 p-4 shadow-[0_20px_70px_rgba(34,49,71,0.08)] backdrop-blur md:rounded-[2rem]">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Journal entry
          </p>
          <div className="mt-2 grid gap-2">
            <label className="space-y-2">
              <span className="text-sm text-[color:var(--ink-soft)]">Title</span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={fieldClassName()}
                placeholder="Zermatt"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-[color:var(--ink-soft)]">Location (optional)</span>
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
              <label className="space-y-2">
                <span className="text-sm text-[color:var(--ink-soft)]">Date or timeframe</span>
                <input
                  value={dateLabel}
                  onChange={(event) => setDateLabel(event.target.value)}
                  className={fieldClassName()}
                  placeholder="Feb 11-13"
                />
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-sm text-[color:var(--ink-soft)]">Story</span>
              <textarea
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`${fieldClassName()} min-h-[7.5rem] resize-none`}
                placeholder="What made this stop, place, or moment worth remembering?"
              />
            </label>
          </div>
        </section>
        <aside className="space-y-4 md:space-y-6">
          <section className="rounded-[1.5rem] border border-white/60 bg-white/74 p-4 shadow-[0_20px_70px_rgba(34,49,71,0.08)] backdrop-blur md:rounded-[2rem]">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Cover image
            </p>
            <div className="mt-2 space-y-2">
              <UploadDropzone
                label="Select a cover photo"
                hint="You can upload a custom cover or pick one from the uploaded photos below."
                busy={isUploadingCover}
                onFilesSelected={async (files) => {
                  setIsUploadingCover(true);
                  const nextSrc = await readFileAsDataUrl(files[0]);
                  setCoverImage(nextSrc);
                  setIsUploadingCover(false);
                }}
              />
              {coverImage ? (
                <div className="relative aspect-[20/9] overflow-hidden rounded-[1.5rem] border border-white/60">
                  <Image
                    src={coverImage}
                    alt="Subgallery cover preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 35vw"
                    unoptimized={nextImageUnoptimizedForSrc(coverImage)}
                  />
                </div>
              ) : null}
            </div>
          </section>
          <section className="rounded-[1.5rem] border border-white/60 bg-[color:var(--paper)] p-4 md:rounded-[2rem] md:p-6">
            <h3 className="font-serif text-2xl text-[color:var(--ink)]">Photo arrangement</h3>
            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
              Add the visual sequence for this memory, then lightly reorder it so the page reads in the right rhythm.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5 md:mt-6 md:gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || isUploadingCover || isUploadingPhotos || !coverImage || photos.length === 0}
              >
                <Save className="h-4 w-4" />
                {isSubmitting
                  ? initialValue
                    ? "Saving subgallery..."
                    : "Creating subgallery..."
                  : initialValue
                    ? "Save subgallery"
                    : "Create subgallery"}
              </Button>
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
            {submitError ? (
              <p className="mt-3 text-sm text-[#9a4545]">{submitError}</p>
            ) : null}
          </section>
        </aside>
      </div>
      <section className="rounded-[1.5rem] border border-white/60 bg-white/74 p-4 shadow-[0_20px_70px_rgba(34,49,71,0.08)] backdrop-blur md:rounded-[2rem] md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Photo collection
            </p>
            <h3 className="mt-2 font-serif text-3xl text-[color:var(--ink)]">Add and order images</h3>
          </div>
          <div className="text-sm text-[color:var(--ink-soft)]">{photos.length} photos in this subgallery</div>
        </div>
        <div className="mt-5">
          <UploadDropzone
            label="Upload memory photos"
            hint="Drop multiple images here or click to browse. They’ll appear below immediately."
            multiple
            busy={isUploadingPhotos}
            onFilesSelected={async (files) => {
              setIsUploadingPhotos(true);
              const tempSubgalleryId = initialValue?.id ?? createId("draft-subgallery");
              const uploaded = await filesToPhotos(files, tempSubgalleryId, photos.length);
              setPhotos((current) => [...current, ...uploaded]);
              if (!coverImage && uploaded[0]) {
                setCoverImage(uploaded[0].src);
              }
              setIsUploadingPhotos(false);
            }}
          />
        </div>
        <div className="mt-4 grid gap-3 md:mt-6 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-[1.5rem] border border-white/60 bg-white shadow-[0_14px_35px_rgba(34,49,71,0.08)]"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={photo.src}
                  alt={photo.caption || "Uploaded photo"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 50vw, 33vw"
                  unoptimized={nextImageUnoptimizedForSrc(photo.src)}
                />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                  <span className="inline-flex items-center gap-1.5">
                    <GripHorizontal className="h-3.5 w-3.5" />
                    Photo {index + 1}
                  </span>
                  {coverImage === photo.src ? (
                    <span className="rounded-full bg-[color:var(--paper)] px-2 py-1 text-[color:var(--accent-strong)]">
                      Cover
                    </span>
                  ) : null}
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
                  className={`${fieldClassName()} min-h-24 resize-none`}
                  placeholder="Add a caption or detail worth remembering."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setCoverImage(photo.src)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Use as cover
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={index === 0}
                    onClick={() =>
                      setPhotos((current) => reorderList(current, index, Math.max(0, index - 1)))
                    }
                  >
                    Move left
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={index === photos.length - 1}
                    onClick={() =>
                      setPhotos((current) =>
                        reorderList(current, index, Math.min(current.length - 1, index + 1)),
                      )
                    }
                  >
                    Move right
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[#8b4c4c] hover:bg-[#fff4f4]"
                    onClick={() =>
                      setPhotos((current) => current.filter((entry) => entry.id !== photo.id))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}
