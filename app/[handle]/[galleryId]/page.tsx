import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleEntry } from "@/components/collapsible-entry";
import { LegalLinks } from "@/components/legal-links";
import { PhotoGrid } from "@/components/photo-grid";
import { ShareThemeFrame } from "@/components/share/share-theme-frame";
import { IMAGE_SIGNED_URL_TTL_SECONDS } from "@/lib/storage";
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

function dateLabelForSubgallery(subgallery: PublicSubgalleryRow) {
  return (
    subgallery.date_label ||
    formatDateRange(subgallery.start_date, subgallery.end_date)
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; galleryId: string }>;
}): Promise<Metadata> {
  const { handle: rawSegment, galleryId } = await params;
  const handle = extractHandleFromSegment(rawSegment);
  if (!handle) return { title: "Memora" };

  const result = await loadPublicGallery(handle, galleryId);
  if (!result) return { title: "Memora" };

  const displayName = result.profile.displayName ?? `@${result.profile.handle}`;
  return {
    title: `${result.gallery.title} — ${displayName}`,
    description: result.gallery.description ?? undefined,
  };
}

export const revalidate = 60;

export default async function PublicGalleryPage({
  params,
}: {
  params: Promise<{ handle: string; galleryId: string }>;
}) {
  const { handle: rawSegment, galleryId } = await params;
  const handle = extractHandleFromSegment(rawSegment);
  if (!handle) notFound();

  const result = await loadPublicGallery(handle, galleryId);
  if (!result) notFound();

  const { profile, gallery } = result;
  const admin = createSupabaseAdminClient();

  const [{ data: subgalleries }, { data: directPhotoRows }] = await Promise.all([
    admin
      .from("subgalleries")
      .select(
        "id, gallery_id, title, description, cover_image_path, location, date_label, start_date, end_date",
      )
      .eq("gallery_id", galleryId)
      .order("display_order", { ascending: true })
      .returns<PublicSubgalleryRow[]>(),
    admin
      .from("photos")
      .select("id, storage_path, caption, display_order, created_at")
      .eq("gallery_id", galleryId)
      .is("subgallery_id", null)
      .order("display_order", { ascending: true })
      .returns<PublicPhotoRow[]>(),
  ]);

  // Sign every cover + direct photo path in one batch.
  const subCoverPaths = (subgalleries ?? [])
    .map((s) => s.cover_image_path ?? "")
    .filter((p) => p && isLikelyStoragePath(p));
  const directPhotoPaths = (directPhotoRows ?? [])
    .map((p) => p.storage_path)
    .filter((p) => p && isLikelyStoragePath(p));
  const allPaths = [...subCoverPaths, ...directPhotoPaths];

  const signedUrlByPath = new Map<string, string>();
  if (allPaths.length) {
    const uniquePaths = Array.from(new Set(allPaths));
    const { data } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls(uniquePaths, IMAGE_SIGNED_URL_TTL_SECONDS);
    (data ?? []).forEach((entry, index) => {
      if (entry.signedUrl) signedUrlByPath.set(uniquePaths[index], entry.signedUrl);
    });
  }

  const directPhotos: MemoryPhoto[] = (directPhotoRows ?? []).map(
    (photo, index) => {
      const src = isLikelyStoragePath(photo.storage_path)
        ? signedUrlByPath.get(photo.storage_path) ?? photo.storage_path
        : photo.storage_path;
      return {
        id: photo.id,
        galleryId,
        subgalleryId: null,
        src,
        caption: photo.caption ?? "",
        createdAt: photo.created_at,
        order: photo.display_order ?? index,
      };
    },
  );

  const hasSubgalleries = (subgalleries ?? []).length > 0;
  const hasDirectPhotos = directPhotos.length > 0;
  const displayName = profile.displayName?.trim() || `@${profile.handle}`;

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
              href={`/@${profile.handle}`}
              className="inline-flex items-center gap-1 underline underline-offset-4"
              aria-label={`Back to @${profile.handle}`}
            >
              <span aria-hidden className="md:hidden">←</span>
              <span className="hidden md:inline">@{profile.handle}</span>
              <span className="md:hidden">{displayName}</span>
            </Link>
            <span aria-hidden className="hidden md:inline">/</span>
            <span className="hidden min-w-0 truncate md:inline">
              {gallery.title}
            </span>
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight md:text-5xl">
            {gallery.title}
          </h1>
          {(() => {
            const formattedLocation = formatLocationForCard(
              gallery.location ?? gallery.locations?.[0] ?? null,
            );
            const dateText = formatDateRange(gallery.start_date, gallery.end_date);
            if (!formattedLocation && !dateText) return null;
            return (
              <p className="mt-2 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] md:mt-3 md:text-[11px]">
                {[formattedLocation, dateText].filter(Boolean).join(" · ")}
              </p>
            );
          })()}
          {gallery.description ? (
            <CollapsibleEntry
              text={gallery.description}
              className="mt-4 md:mt-5"
              defaultOpen
            />
          ) : null}
        </div>

        {hasSubgalleries ? (
          <section className="grid gap-x-3 gap-y-7 sm:grid-cols-2 md:gap-x-8 md:gap-y-12">
            {(subgalleries ?? []).map((subgallery) => {
              const cover = isLikelyStoragePath(subgallery.cover_image_path ?? "")
                ? signedUrlByPath.get(subgallery.cover_image_path ?? "") ?? ""
                : subgallery.cover_image_path ?? "";
              const formattedLocation = formatLocationForCard(subgallery.location);
              const dateText = dateLabelForSubgallery(subgallery);
              const metaParts = [formattedLocation, dateText].filter(
                Boolean,
              ) as string[];
              return (
                <Link
                  key={subgallery.id}
                  href={`/@${profile.handle}/${gallery.id}/subgallery/${subgallery.id}`}
                  className="group block"
                >
                  <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-2 md:p-[14px]">
                    <div className="relative aspect-[5/3] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <h2 className="font-serif text-[22px] leading-[1.15] text-[color:var(--ink)] md:text-[28px]">
                      {subgallery.title}
                    </h2>
                    {metaParts.length ? (
                      <p className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                        {metaParts.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </section>
        ) : null}

        {hasDirectPhotos ? (
          <section className={hasSubgalleries ? "mt-10 md:mt-14" : ""}>
            <p className="mb-3 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Photos
            </p>
            <PhotoGrid photos={directPhotos} />
          </section>
        ) : null}

        {!hasSubgalleries && !hasDirectPhotos ? (
          <section className="border-y border-[color:var(--border)] px-6 py-10 text-center">
            <p className="font-serif text-2xl leading-tight">More to come.</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              {displayName} hasn&apos;t added scenes or photos to this gallery yet.
            </p>
            <Link
              href={`/@${profile.handle}`}
              className="mt-4 inline-block text-sm text-[color:var(--ink)] underline underline-offset-4"
            >
              Back to {displayName}
            </Link>
          </section>
        ) : null}

        <footer className="mt-14 border-t border-[color:var(--border)] pt-6 text-center md:mt-20 md:pt-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Memora
          </p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Want a page like this for your own memories?{" "}
            <Link
              href="/auth?mode=signup"
              className="text-[color:var(--ink)] underline underline-offset-4"
            >
              Create a free archive →
            </Link>
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
