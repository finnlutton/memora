"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { LocationAutocompleteInput } from "@/components/location-autocomplete-input";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { useGalleryDraftWriter } from "@/hooks/use-gallery-draft";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { readFileAsDataUrl } from "@/lib/file";
import { nextImageUnoptimizedForSrc, splitCommaSeparated } from "@/lib/utils";
import type { Gallery, GalleryInput } from "@/types/memora";

/**
 * Bottom-rule field: editorial, but with a strong, clickable rule and a clear
 * hover state so users see the field is interactive.
 */
function fieldClassName() {
  // text-base on mobile is 16px — anything smaller triggers iOS Safari's
  // auto-zoom on focus, which jolts the viewport every time the user taps
  // a field. Desktop keeps the editorial 15px rhythm.
  return "w-full border-0 border-b-[1.5px] border-[color:var(--border-strong)] bg-transparent px-0 py-3 text-base text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] hover:border-[color:var(--ink-soft)] focus:border-[color:var(--ink)] md:text-[15px]";
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]"
    >
      {children}
    </label>
  );
}

export function GalleryForm({
  initialValue,
  onSubmit,
  createLabel = "Create gallery",
  backHref = "/galleries",
  backLabel = "Back to galleries",
  defaultCoverImage = "",
}: {
  initialValue?: Gallery;
  onSubmit: (value: GalleryInput) => Promise<void> | void;
  createLabel?: string;
  backHref?: string;
  backLabel?: string;
  defaultCoverImage?: string;
}) {
  const router = useRouter();
  const { onboarding } = useMemoraStore();
  const isNewGallery = !initialValue;
  // Draft persistence applies to NEW galleries only. Edits to an
  // existing gallery should never resurrect or write to the in-progress
  // draft slot — that slot belongs to the next "create new gallery"
  // attempt, not to revisions of saved work.
  const { initialDraft, save: saveDraft, clear: clearDraft } = useGalleryDraftWriter(
    onboarding.user?.id ?? null,
    isNewGallery,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [coverImage, setCoverImage] = useState(
    initialValue?.coverImage ?? defaultCoverImage ?? "",
  );
  const [title, setTitle] = useState(
    initialValue?.title ?? (isNewGallery ? initialDraft.title : ""),
  );
  const [description, setDescription] = useState(
    initialValue?.description ?? (isNewGallery ? initialDraft.description : ""),
  );
  const [startDate, setStartDate] = useState(
    initialValue?.startDate ?? (isNewGallery ? initialDraft.startDate : ""),
  );
  const [endDate, setEndDate] = useState(
    initialValue?.endDate ?? (isNewGallery ? initialDraft.endDate : ""),
  );
  const [location, setLocation] = useState(
    initialValue?.locations[0] ?? (isNewGallery ? initialDraft.location : ""),
  );
  const [locationLat, setLocationLat] = useState<number | null>(
    initialValue?.locationLat ?? (isNewGallery ? initialDraft.locationLat : null),
  );
  const [locationLng, setLocationLng] = useState<number | null>(
    initialValue?.locationLng ?? (isNewGallery ? initialDraft.locationLng : null),
  );
  // People is intentionally NOT persisted to the draft — list of
  // names is fast to retype and we'd rather keep the draft surface
  // small. See `hooks/use-gallery-draft.ts`.
  const [people, setPeople] = useState(initialValue?.people.join(", ") ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [coverError, setCoverError] = useState("");

  // Mirror every persisted field into localStorage. Debounced inside
  // the hook; non-fatal on quota errors.
  useEffect(() => {
    if (!isNewGallery) return;
    saveDraft({
      title,
      description,
      startDate,
      endDate,
      location,
      locationLat,
      locationLng,
      updatedAt: "",
    });
  }, [
    isNewGallery,
    saveDraft,
    title,
    description,
    startDate,
    endDate,
    location,
    locationLat,
    locationLng,
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        coverImage,
        description,
        startDate,
        endDate,
        location: location.trim(),
        locationLat,
        locationLng,
        people: splitCommaSeparated(people),
        // Mood and visibility were removed from the form. Mood now
        // submits as an empty array; visibility defaults to private
        // (the only meaningful state today — there is no live public
        // gallery surface).
        moodTags: [],
        privacy: "private",
      });
      // Successful save — clear the in-progress draft so the next
      // "Create gallery" visit starts clean.
      clearDraft();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save gallery.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

      {/* Unified writing surface — one opaque paper page, strong edge */}
      <div className="relative overflow-hidden border border-[color:var(--border-strong)]/70 bg-[color:var(--background)] shadow-[0_6px_24px_rgba(14,22,34,0.06)]">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Writing column */}
          <div className="order-2 space-y-8 px-5 py-6 md:order-1 md:px-8 md:py-8 lg:border-r lg:border-[color:var(--border-strong)]/50">
            <header>
              <Label>Story framing</Label>
              <p className="mt-2 max-w-lg text-[14px] leading-6 text-[color:var(--ink-soft)]">
                A gallery reads like the opening page of a journal — broad enough to hold the whole chapter, specific enough to remember how it felt.
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
                  placeholder="Switzerland, 2026"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  required
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${fieldClassName()} min-h-36 resize-none leading-7`}
                  placeholder="Describe the mood, shape, and story of this chapter."
                />
              </div>

              <div className="grid gap-7 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <DateField
                    value={startDate}
                    onChange={setStartDate}
                    ariaLabel="Start date"
                    placeholder="Choose a date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
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
                <Label>Location</Label>
                <LocationAutocompleteInput
                  value={{ label: location, lat: locationLat, lng: locationLng }}
                  onChange={(next) => {
                    setLocation(next.label);
                    setLocationLat(next.lat);
                    setLocationLng(next.lng);
                  }}
                  className={fieldClassName()}
                  placeholder="Granada, Spain"
                />
              </div>

              <div className="space-y-2">
                <Label>People</Label>
                <input
                  value={people}
                  onChange={(event) => setPeople(event.target.value)}
                  className={fieldClassName()}
                  placeholder="Maya, Elias"
                />
                <span className="text-[12px] leading-5 text-[color:var(--ink-soft)]">
                  Separate names with commas.
                </span>
              </div>

            </div>
          </div>

          {/* Cover column */}
          <aside className="order-1 flex flex-col gap-5 border-b border-[color:var(--border-strong)]/50 bg-[color:var(--paper)] px-5 py-6 md:order-2 md:px-8 md:py-8 lg:border-b-0">
            <header>
              <Label>Cover</Label>
              <p className="mt-2 text-[14px] leading-6 text-[color:var(--ink-soft)]">
                One image sets the emotional tone for the whole collection.
              </p>
            </header>

            {coverImage ? (
              <div className="relative aspect-[4/3] overflow-hidden border border-[color:var(--border-strong)]/70">
                <Image
                  src={coverImage}
                  alt="Gallery cover preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 35vw"
                  unoptimized={nextImageUnoptimizedForSrc(coverImage)}
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center border border-dashed border-[color:var(--border-strong)] bg-[color:var(--background)] text-[13px] font-medium text-[color:var(--ink-soft)]">
                No cover selected
              </div>
            )}

            <UploadDropzone
              label={coverImage ? "Replace cover image" : "Choose a cover image"}
              hint="Drop a hero image or click to browse."
              busy={isUploading}
              onError={(message) => setCoverError(message)}
              onFilesSelected={async (files) => {
                setIsUploading(true);
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
                  setIsUploading(false);
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

        {/* Footer: save row */}
        <div className="flex flex-col gap-3 border-t border-[color:var(--border-strong)]/50 bg-[color:var(--paper)]/50 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="text-[13px] leading-5 text-[color:var(--ink-soft)]">
            {initialValue
              ? "Saved changes appear across every shared view."
              : "You can revise any field after the gallery is created."}
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
            <Button type="submit" disabled={isSubmitting || isUploading || !coverImage}>
              <Save className="h-4 w-4" />
              {isSubmitting
                ? initialValue
                  ? "Saving..."
                  : "Creating..."
                : initialValue
                  ? "Save gallery"
                  : createLabel}
            </Button>
          </div>
        </div>
        {submitError ? (
          <p className="border-t border-[color:var(--error-border)] bg-[color:var(--error-bg)] px-5 py-2.5 text-[13px] font-medium text-[color:var(--error-text)] md:px-8">
            {submitError}
          </p>
        ) : null}
      </div>
    </form>
  );
}
