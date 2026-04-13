"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { LocationAutocompleteInput } from "@/components/location-autocomplete-input";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Button } from "@/components/ui/button";
import { readFileAsDataUrl } from "@/lib/file";
import { nextImageUnoptimizedForSrc, splitCommaSeparated } from "@/lib/utils";
import type { Gallery, GalleryInput } from "@/types/memora";

function fieldClassName() {
  return "w-full rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)]";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [coverImage, setCoverImage] = useState(
    initialValue?.coverImage ?? defaultCoverImage ?? "",
  );
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [description, setDescription] = useState(initialValue?.description ?? "");
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
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/60 bg-white/74 p-6 shadow-[0_20px_70px_rgba(34,49,71,0.08)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Story framing
          </p>
          <div className="mt-4 grid gap-4">
            <label className="space-y-2">
              <span className="text-sm text-[color:var(--ink-soft)]">Title</span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={fieldClassName()}
                placeholder="Switzerland Trip 2026"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[color:var(--ink-soft)]">Overall description</span>
              <textarea
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`${fieldClassName()} min-h-40 resize-none`}
                placeholder="Describe the mood, shape, and story of this chapter."
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-[color:var(--ink-soft)]">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className={fieldClassName()}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-[color:var(--ink-soft)]">End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className={fieldClassName()}
                />
              </label>
            </div>
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
                placeholder="Granada, Spain"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[color:var(--ink-soft)]">People</span>
              <input
                value={people}
                onChange={(event) => setPeople(event.target.value)}
                className={fieldClassName()}
                placeholder="Maya, Elias"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[color:var(--ink-soft)]">Mood tags</span>
              <input
                value={moodTags}
                onChange={(event) => setMoodTags(event.target.value)}
                className={fieldClassName()}
                placeholder="Snow light, train days, quiet luxury"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[color:var(--ink-soft)]">Privacy</span>
              <select
                value={privacy}
                onChange={(event) => setPrivacy(event.target.value as Gallery["privacy"])}
                className={fieldClassName()}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </label>
          </div>
        </section>
        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/60 bg-white/74 p-6 shadow-[0_20px_70px_rgba(34,49,71,0.08)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Cover image
            </p>
            <div className="mt-4 space-y-4">
              <UploadDropzone
                label="Choose a gallery cover"
                hint="Drop a hero image here or click to browse. This sets the emotional tone for the whole collection."
                busy={isUploading}
                onFilesSelected={async (files) => {
                  setIsUploading(true);
                  const nextSrc = await readFileAsDataUrl(files[0]);
                  setCoverImage(nextSrc);
                  setIsUploading(false);
                }}
              />
              {coverImage ? (
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-white/60">
                  <Image
                    src={coverImage}
                    alt="Gallery cover preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 35vw"
                    unoptimized={nextImageUnoptimizedForSrc(coverImage)}
                  />
                </div>
              ) : null}
            </div>
          </section>
          <section className="rounded-[2rem] border border-white/60 bg-[color:var(--paper)] p-6">
            <h3 className="font-serif text-2xl text-[color:var(--ink)]">Keep it meaningful</h3>
            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
              A strong gallery reads like the opening page of a journal: broad enough to hold the whole trip, specific enough to remember how it felt.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting || isUploading || !coverImage}>
                <Save className="h-4 w-4" />
                {isSubmitting
                  ? initialValue
                    ? "Saving gallery..."
                    : "Creating gallery..."
                  : initialValue
                    ? "Save gallery"
                    : createLabel}
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
    </form>
  );
}
