"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { LocationAutocompleteInput } from "@/components/location-autocomplete-input";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { readFileAsDataUrl } from "@/lib/file";
import { nextImageUnoptimizedForSrc, splitCommaSeparated } from "@/lib/utils";
import type { Gallery, GalleryInput } from "@/types/memora";

/**
 * Bottom-rule field: editorial, but with a strong, clickable rule and a clear
 * hover state so users see the field is interactive.
 */
function fieldClassName() {
  return "w-full border-0 border-b-[1.5px] border-[color:var(--border-strong)] bg-transparent px-0 py-3 text-[15px] text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] hover:border-[color:var(--ink-soft)] focus:border-[color:var(--ink)]";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [coverImage, setCoverImage] = useState(
    initialValue?.coverImage ?? defaultCoverImage ?? "",
  );
  // Draft scope: `<userId or anon>:gallery:<galleryId or new>`. Drafts
  // are sessionStorage-only and text-only — see `useFormDraft`. They
  // persist across tab-returns and remounts but are wiped on
  // successful submit and on tab close.
  const draftScope = `${onboarding.user?.id ?? "anon"}:gallery:${
    initialValue?.id ?? "new"
  }`;
  const [title, setTitle, clearTitleDraft] = useFormDraft({
    scope: draftScope,
    field: "title",
    initialValue: initialValue?.title ?? "",
  });
  const [description, setDescription, clearDescriptionDraft] = useFormDraft({
    scope: draftScope,
    field: "description",
    initialValue: initialValue?.description ?? "",
  });
  const [startDate, setStartDate] = useState(initialValue?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValue?.endDate ?? "");
  const [location, setLocation] = useState(initialValue?.locations[0] ?? "");
  const [locationLat, setLocationLat] = useState<number | null>(initialValue?.locationLat ?? null);
  const [locationLng, setLocationLng] = useState<number | null>(initialValue?.locationLng ?? null);
  const [people, setPeople] = useState(initialValue?.people.join(", ") ?? "");
  const [moodTags, setMoodTags] = useState(initialValue?.moodTags.join(", ") ?? "");
  const [privacy, setPrivacy] = useState<Gallery["privacy"]>(initialValue?.privacy ?? "private");
  const [isUploading, setIsUploading] = useState(false);

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
        moodTags: splitCommaSeparated(moodTags),
        privacy,
      });
      // Successful save — drop the saved draft so a future visit to
      // this form starts clean instead of pre-filling stale text.
      clearTitleDraft();
      clearDescriptionDraft();
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

              <div className="space-y-2">
                <Label>Mood</Label>
                <input
                  value={moodTags}
                  onChange={(event) => setMoodTags(event.target.value)}
                  className={fieldClassName()}
                  placeholder="Snow light, train days, quiet luxury"
                />
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex gap-2 pt-1">
                  {(["private", "public"] as const).map((option) => {
                    const active = privacy === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPrivacy(option)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-2 border px-3.5 py-2 text-[13px] font-medium tracking-[0.01em] transition ${
                          active
                            ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                            : "border-[color:var(--border-strong)] bg-[color:var(--background)] text-[color:var(--ink-soft)] hover:border-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            active ? "bg-white" : "bg-[color:var(--border-strong)]"
                          }`}
                        />
                        <span className="capitalize">{option}</span>
                      </button>
                    );
                  })}
                </div>
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
              onFilesSelected={async (files) => {
                setIsUploading(true);
                const nextSrc = await readFileAsDataUrl(files[0]);
                setCoverImage(nextSrc);
                setIsUploading(false);
              }}
            />
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
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => router.back()}
              className="text-[14px] font-medium text-[color:var(--ink-soft)] underline-offset-4 transition hover:text-[color:var(--ink)] hover:underline disabled:opacity-40"
            >
              Cancel
            </button>
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
