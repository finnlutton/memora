import type { Metadata } from "next";
import Link from "next/link";
import { CollapsibleEntry } from "@/components/collapsible-entry";
import { PhotoGrid } from "@/components/photo-grid";
import { ShareThemeFrame } from "@/components/share/share-theme-frame";
import {
  buildShareMetadata,
  getShareMetaContext,
  INVALID_SHARE_METADATA,
  signCoverUrlForOg,
} from "@/lib/share-metadata";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatLocationForCard } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

const STORAGE_BUCKET = "gallery-images";

type ShareRow = {
  id: string;
  message: string | null;
  revoked_at: string | null;
  theme_id: string | null;
};

type ShareGalleryRow = { gallery_id: string };

type GalleryRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  start_date: string | null;
  end_date: string | null;
};

type SubgalleryRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  location: string | null;
  date_label: string | null;
  start_date: string | null;
  end_date: string | null;
};

type DirectPhotoRow = {
  id: string;
  storage_path: string;
  caption: string | null;
  display_order: number | null;
  created_at: string;
};

function isLikelyStoragePath(path: string) {
  return !path.startsWith("data:") && !path.startsWith("blob:") && !path.startsWith("/") && !path.startsWith("http");
}

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
  if (startDate && endDate && startDate !== endDate) return `${formatSingle(startDate)} - ${formatSingle(endDate)}`;
  return formatSingle(startDate ?? endDate ?? "");
}

function dateLabelForSubgallery(subgallery: SubgalleryRow) {
  return subgallery.date_label || formatDateRange(subgallery.start_date, subgallery.end_date);
}

function InvalidShareState({
  token,
  message,
  heading = "Share unavailable",
  themeId = null,
}: {
  token: string;
  message: string;
  heading?: string;
  themeId?: string | null;
}) {
  return (
    <ShareThemeFrame themeId={themeId}>
      <main className="min-h-screen bg-[color:var(--background)] px-4 py-8 text-[color:var(--ink)] md:px-5 md:py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Memora</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight md:mt-3 md:text-4xl">{heading}</h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)] md:mt-4 md:leading-7">{message}</p>
          <Link href={`/share/${token}`} className="mt-6 inline-block text-sm text-[color:var(--ink)] underline underline-offset-4">
            Back to shared galleries
          </Link>
        </div>
      </main>
    </ShareThemeFrame>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; galleryId: string }>;
}): Promise<Metadata> {
  const { token, galleryId } = await params;
  const ctx = await getShareMetaContext(token);
  if (!ctx || ctx.revoked) return INVALID_SHARE_METADATA;

  const admin = createSupabaseAdminClient();
  const { data: linkRow } = await admin
    .from("share_galleries")
    .select("gallery_id")
    .eq("share_id", ctx.shareId)
    .eq("gallery_id", galleryId)
    .maybeSingle<{ gallery_id: string }>();

  if (!linkRow) return INVALID_SHARE_METADATA;

  const { data: gallery } = await admin
    .from("galleries")
    .select("title, description, cover_image_path")
    .eq("id", galleryId)
    .maybeSingle<{
      title: string;
      description: string | null;
      cover_image_path: string | null;
    }>();

  if (!gallery) return INVALID_SHARE_METADATA;

  const coverUrl = await signCoverUrlForOg(gallery.cover_image_path);
  return buildShareMetadata({
    title: `${ctx.senderName} shared ${gallery.title} with you`,
    description: gallery.description,
    coverUrl,
  });
}

export default async function PublicSharedGalleryPage({
  params,
}: {
  params: Promise<{ token: string; galleryId: string }>;
}) {
  const { token, galleryId } = await params;
  const admin = createSupabaseAdminClient();

  const { data: share } = await admin
    .from("shares")
    .select("id, message, revoked_at, theme_id")
    .eq("token", token)
    .maybeSingle<ShareRow>();

  if (!share || share.revoked_at) {
    if (share?.revoked_at) {
      return (
        <InvalidShareState
          token={token}
          heading="This share link has been revoked"
          message="The sender has revoked this share link. Reach out to them if you'd like access again."
          themeId={share.theme_id}
        />
      );
    }
    return (
      <InvalidShareState
        token={token}
        message="This share link may be invalid or no longer active."
      />
    );
  }

  const { data: shareGalleryRows } = await admin
    .from("share_galleries")
    .select("gallery_id")
    .eq("share_id", share.id)
    .eq("gallery_id", galleryId)
    .returns<ShareGalleryRow[]>();

  if (!shareGalleryRows?.length) {
    return (
      <InvalidShareState
        token={token}
        message="This gallery is not available in the current share link."
        themeId={share.theme_id}
      />
    );
  }

  const { data: gallery } = await admin
    .from("galleries")
    .select("id, title, description, cover_image_path, start_date, end_date")
    .eq("id", galleryId)
    .maybeSingle<GalleryRow>();

  if (!gallery) {
    return (
      <InvalidShareState
        token={token}
        message="This gallery is no longer available."
        themeId={share.theme_id}
      />
    );
  }

  const [{ data: subgalleries }, { data: directPhotoRows }] = await Promise.all([
    admin
      .from("subgalleries")
      .select("id, title, description, cover_image_path, location, date_label, start_date, end_date")
      .eq("gallery_id", galleryId)
      .order("display_order", { ascending: true })
      .returns<SubgalleryRow[]>(),
    admin
      .from("photos")
      .select("id, storage_path, caption, display_order, created_at")
      .eq("gallery_id", galleryId)
      .is("subgallery_id", null)
      .order("display_order", { ascending: true })
      .returns<DirectPhotoRow[]>(),
  ]);

  // The gallery cover used to render as a hero banner here, but
  // recipients found it redundant with the cover that already shows
  // on the share landing page tile. We sign covers for subgallery
  // tiles plus paths for any direct gallery photos rendered below.
  const coverPaths = (subgalleries ?? [])
    .map((subgallery) => subgallery.cover_image_path ?? "")
    .filter((path) => path && isLikelyStoragePath(path));
  const directPhotoPaths = (directPhotoRows ?? [])
    .map((photo) => photo.storage_path)
    .filter((path) => path && isLikelyStoragePath(path));

  const signedUrlByPath = new Map<string, string>();
  const allPaths = [...coverPaths, ...directPhotoPaths];
  if (allPaths.length) {
    const uniquePaths = Array.from(new Set(allPaths));
    const { data } = await admin.storage.from(STORAGE_BUCKET).createSignedUrls(uniquePaths, 60 * 60);
    (data ?? []).forEach((entry, index) => {
      if (entry.signedUrl) signedUrlByPath.set(uniquePaths[index], entry.signedUrl);
    });
  }

  const directPhotos: MemoryPhoto[] = (directPhotoRows ?? []).map((photo, index) => {
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
  });

  const hasSubgalleries = (subgalleries ?? []).length > 0;
  const hasDirectPhotos = directPhotos.length > 0;

  return (
    <ShareThemeFrame themeId={share.theme_id}>
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--ink)] md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 border-b border-[color:var(--border)] pb-4 md:mb-8 md:pb-5">
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Memora</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
            <Link
              href={`/share/${token}`}
              className="inline-flex items-center gap-1 underline underline-offset-4"
              aria-label="All shared galleries"
            >
              <span aria-hidden className="md:hidden">←</span>
              <span className="hidden md:inline">All shared galleries</span>
            </Link>
            <span aria-hidden>/</span>
            <span className="min-w-0 truncate">{gallery.title}</span>
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight md:text-5xl">{gallery.title}</h1>
          {gallery.description ? (
            <CollapsibleEntry text={gallery.description} className="mt-4 md:mt-5" defaultOpen />
          ) : null}
        </div>

        {hasSubgalleries ? (
          <section className="grid gap-x-3 gap-y-7 sm:grid-cols-2 md:gap-x-8 md:gap-y-12">
            {(subgalleries ?? []).map((subgallery) => {
              const cover = isLikelyStoragePath(subgallery.cover_image_path ?? "")
                ? signedUrlByPath.get(subgallery.cover_image_path ?? "") ?? ""
                : (subgallery.cover_image_path ?? "");
              const formattedLocation = formatLocationForCard(subgallery.location);
              const dateText = dateLabelForSubgallery(subgallery);
              const metaParts = [formattedLocation, dateText].filter(Boolean) as string[];

              return (
                <Link
                  key={subgallery.id}
                  href={`/share/${token}/gallery/${gallery.id}/subgallery/${subgallery.id}`}
                  className="group block"
                >
                  <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-2 md:p-[14px]">
                    <div className="relative aspect-[5/3] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]" />
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
            <p className="mb-3 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Photos</p>
            <PhotoGrid photos={directPhotos} />
          </section>
        ) : null}

        {!hasSubgalleries && !hasDirectPhotos ? (
          <section className="border-y border-[color:var(--border)] px-6 py-10 text-center">
            <p className="font-serif text-2xl leading-tight">More to come.</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              The sender hasn&apos;t added any scenes or photos to this gallery yet. New content will appear here as soon as they do.
            </p>
            <Link
              href={`/share/${token}`}
              className="mt-4 inline-block text-sm text-[color:var(--ink)] underline underline-offset-4"
            >
              Back to all shared galleries
            </Link>
          </section>
        ) : null}
      </div>
    </main>
    </ShareThemeFrame>
  );
}

