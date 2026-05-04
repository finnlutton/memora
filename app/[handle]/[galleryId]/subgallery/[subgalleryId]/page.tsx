import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleEntry } from "@/components/collapsible-entry";
import { LegalLinks } from "@/components/legal-links";
import { PhotoGrid } from "@/components/photo-grid";
import { ShareThemeFrame } from "@/components/share/share-theme-frame";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  extractHandleFromSegment,
  isLikelyStoragePath,
  loadPublicGallery,
  type PublicPhotoRow,
  type PublicSubgalleryRow,
} from "@/lib/public-profile-fetch";
import { formatLocationForCard } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

const STORAGE_BUCKET = "gallery-images";

function formatDateRange(startDate: string | null, endDate: string | null) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formatSingle = (value: string) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return value;
    return formatter.format(date);
  };
  if (!startDate && !endDate) return "";
  if (startDate && endDate && startDate !== endDate) {
    return `${formatSingle(startDate)} - ${formatSingle(endDate)}`;
  }
  return formatSingle(startDate ?? endDate ?? "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; galleryId: string; subgalleryId: string }>;
}): Promise<Metadata> {
  const { handle: rawSegment, galleryId, subgalleryId } = await params;
  const handle = extractHandleFromSegment(rawSegment);
  if (!handle) return { title: "Memora" };

  const result = await loadPublicGallery(handle, galleryId);
  if (!result) return { title: "Memora" };

  const admin = createSupabaseAdminClient();
  const { data: subgallery } = await admin
    .from("subgalleries")
    .select("title, description")
    .eq("id", subgalleryId)
    .eq("gallery_id", galleryId)
    .maybeSingle<{ title: string; description: string | null }>();
  if (!subgallery) return { title: "Memora" };

  const displayName = result.profile.displayName ?? `@${result.profile.handle}`;
  return {
    title: `${subgallery.title} — ${displayName}`,
    description: subgallery.description ?? undefined,
  };
}

export const revalidate = 60;

export default async function PublicSubgalleryPage({
  params,
}: {
  params: Promise<{ handle: string; galleryId: string; subgalleryId: string }>;
}) {
  const { handle: rawSegment, galleryId, subgalleryId } = await params;
  const handle = extractHandleFromSegment(rawSegment);
  if (!handle) notFound();

  const result = await loadPublicGallery(handle, galleryId);
  if (!result) notFound();

  const { profile, gallery } = result;
  const admin = createSupabaseAdminClient();

  const { data: subgallery } = await admin
    .from("subgalleries")
    .select(
      "id, gallery_id, title, description, cover_image_path, location, date_label, start_date, end_date",
    )
    .eq("id", subgalleryId)
    .eq("gallery_id", galleryId)
    .maybeSingle<PublicSubgalleryRow>();

  if (!subgallery) notFound();

  const { data: photoRows } = await admin
    .from("photos")
    .select("id, storage_path, caption, display_order, created_at")
    .eq("subgallery_id", subgalleryId)
    .order("display_order", { ascending: true })
    .returns<PublicPhotoRow[]>();

  const imagePaths = (photoRows ?? [])
    .map((p) => p.storage_path)
    .filter((p) => p && isLikelyStoragePath(p));

  const signedUrlByPath = new Map<string, string>();
  if (imagePaths.length) {
    const uniquePaths = Array.from(new Set(imagePaths));
    const { data } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls(uniquePaths, 60 * 60);
    (data ?? []).forEach((entry, index) => {
      if (entry.signedUrl) signedUrlByPath.set(uniquePaths[index], entry.signedUrl);
    });
  }

  const photos: MemoryPhoto[] = (photoRows ?? []).map((photo, index) => {
    const src = isLikelyStoragePath(photo.storage_path)
      ? signedUrlByPath.get(photo.storage_path) ?? photo.storage_path
      : photo.storage_path;
    return {
      id: photo.id,
      subgalleryId,
      src,
      caption: photo.caption ?? "",
      createdAt: photo.created_at,
      order: photo.display_order ?? index,
    };
  });

  const formattedLocation = formatLocationForCard(subgallery.location);
  const dateText =
    subgallery.date_label ||
    formatDateRange(subgallery.start_date, subgallery.end_date);

  return (
    <ShareThemeFrame themeId={profile.themeId}>
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--ink)] md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 border-b border-[color:var(--border)] pb-4 md:mb-8 md:pb-5">
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Memora
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
            <Link
              href={`/@${profile.handle}/${gallery.id}`}
              className="inline-flex max-w-[12rem] items-center gap-1 underline underline-offset-4 md:hidden"
              aria-label={`Back to ${gallery.title}`}
            >
              <span aria-hidden>←</span>
              <span className="truncate">{gallery.title}</span>
            </Link>
            <Link
              href={`/@${profile.handle}`}
              className="hidden underline underline-offset-4 md:inline"
            >
              @{profile.handle}
            </Link>
            <span aria-hidden className="hidden md:inline">/</span>
            <Link
              href={`/@${profile.handle}/${gallery.id}`}
              className="hidden underline underline-offset-4 md:inline"
            >
              {gallery.title}
            </Link>
            <span aria-hidden className="hidden md:inline">/</span>
            <span className="hidden min-w-0 truncate md:inline">
              {subgallery.title}
            </span>
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight md:text-5xl">
            {subgallery.title}
          </h1>
          {formattedLocation || dateText ? (
            <p className="mt-2.5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)] md:mt-3">
              {[formattedLocation, dateText].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {subgallery.description ? (
            <CollapsibleEntry
              text={subgallery.description}
              className="mt-4 md:mt-5"
              defaultOpen
            />
          ) : null}
        </div>

        <section>
          <p className="mb-3 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Photos
          </p>
          {photos.length ? (
            <PhotoGrid photos={photos} />
          ) : (
            <div className="border-y border-[color:var(--border)] px-6 py-10 text-center">
              <p className="font-serif text-2xl leading-tight">
                Photos still on the way.
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                No photos in this scene yet.
              </p>
              <Link
                href={`/@${profile.handle}/${gallery.id}`}
                className="mt-4 inline-block text-sm text-[color:var(--ink)] underline underline-offset-4"
              >
                Back to {gallery.title}
              </Link>
            </div>
          )}
        </section>

        <footer className="mt-14 border-t border-[color:var(--border)] pt-6 text-center md:mt-20 md:pt-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Memora
          </p>
          <div className="mt-4">
            <LegalLinks />
          </div>
        </footer>
      </div>
    </main>
    </ShareThemeFrame>
  );
}
