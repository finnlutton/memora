import Link from "next/link";
import { CollapsibleEntry } from "@/components/collapsible-entry";
import { PhotoGrid } from "@/components/photo-grid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatLocationForCard } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

const STORAGE_BUCKET = "gallery-images";

type ShareRow = {
  id: string;
  revoked_at: string | null;
};

type ShareGalleryRow = { gallery_id: string };

type GalleryRow = {
  id: string;
  title: string;
};

type SubgalleryRow = {
  id: string;
  gallery_id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  location: string | null;
  date_label: string | null;
  start_date: string | null;
  end_date: string | null;
};

type PhotoRow = {
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

function InvalidShareState({
  token,
  message,
  heading = "Share unavailable",
}: {
  token: string;
  message: string;
  heading?: string;
}) {
  return (
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
  );
}

export default async function PublicSharedSubgalleryPage({
  params,
}: {
  params: Promise<{ token: string; galleryId: string; subgalleryId: string }>;
}) {
  const { token, galleryId, subgalleryId } = await params;
  const admin = createSupabaseAdminClient();

  const { data: share } = await admin
    .from("shares")
    .select("id, revoked_at")
    .eq("token", token)
    .maybeSingle<ShareRow>();

  if (!share || share.revoked_at) {
    if (share?.revoked_at) {
      return (
        <InvalidShareState
          token={token}
          heading="This share link has been revoked"
          message="The sender has revoked this share link. Reach out to them if you'd like access again."
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
    return <InvalidShareState token={token} message="This gallery is not available in the current share link." />;
  }

  const [{ data: gallery }, { data: subgallery }] = await Promise.all([
    admin.from("galleries").select("id, title").eq("id", galleryId).maybeSingle<GalleryRow>(),
    admin
      .from("subgalleries")
      .select("id, gallery_id, title, description, cover_image_path, location, date_label, start_date, end_date")
      .eq("id", subgalleryId)
      .eq("gallery_id", galleryId)
      .maybeSingle<SubgalleryRow>(),
  ]);

  if (!gallery || !subgallery) {
    return <InvalidShareState token={token} message="This scene is not part of the shared content." />;
  }

  const { data: photoRows } = await admin
    .from("photos")
    .select("id, storage_path, caption, display_order, created_at")
    .eq("subgallery_id", subgalleryId)
    .order("display_order", { ascending: true })
    .returns<PhotoRow[]>();

  const imagePaths = (photoRows ?? []).map((photo) => photo.storage_path).filter((path) => path && isLikelyStoragePath(path));

  const signedUrlByPath = new Map<string, string>();
  if (imagePaths.length) {
    const uniquePaths = Array.from(new Set(imagePaths));
    const { data } = await admin.storage.from(STORAGE_BUCKET).createSignedUrls(uniquePaths, 60 * 60);
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

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--ink)] md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 border-b border-[color:var(--border)] pb-4 md:mb-8 md:pb-5">
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Memora</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
            {/*
              Mobile breadcrumb: collapse middle segments to a single
              "← Gallery title" so a long subgallery title doesn't push
              the row into a multi-line wrap. Full ladder returns at md+.
            */}
            <Link
              href={`/share/${token}/gallery/${gallery.id}`}
              className="inline-flex max-w-[12rem] items-center gap-1 underline underline-offset-4 md:hidden"
              aria-label={`Back to ${gallery.title}`}
            >
              <span aria-hidden>←</span>
              <span className="truncate">{gallery.title}</span>
            </Link>
            <Link
              href={`/share/${token}`}
              className="hidden underline underline-offset-4 md:inline"
            >
              All shared galleries
            </Link>
            <span aria-hidden className="hidden md:inline">/</span>
            <Link
              href={`/share/${token}/gallery/${gallery.id}`}
              className="hidden underline underline-offset-4 md:inline"
            >
              {gallery.title}
            </Link>
            <span aria-hidden className="hidden md:inline">/</span>
            <span className="hidden min-w-0 truncate md:inline">{subgallery.title}</span>
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight md:text-5xl">{subgallery.title}</h1>
          {(() => {
            const formattedLocation = formatLocationForCard(subgallery.location);
            const dateText = subgallery.date_label || formatDateRange(subgallery.start_date, subgallery.end_date);
            if (!formattedLocation && !dateText) return null;
            return (
              <p className="mt-2.5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)] md:mt-3">
                {[formattedLocation, dateText].filter(Boolean).join(" · ")}
              </p>
            );
          })()}
          {subgallery.description ? (
            <CollapsibleEntry text={subgallery.description} className="mt-4 md:mt-5" defaultOpen />
          ) : null}
        </div>

        <section>
          <p className="mb-3 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Photos</p>
          {photos.length ? (
            <PhotoGrid photos={photos} />
          ) : (
            <div className="border-y border-[color:var(--border)] px-6 py-10 text-center">
              <p className="font-serif text-2xl leading-tight">Photos still on the way.</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                The sender hasn&apos;t added photos to this scene yet. They&apos;ll appear here as soon as they do.
              </p>
              <Link
                href={`/share/${token}/gallery/${gallery.id}`}
                className="mt-4 inline-block text-sm text-[color:var(--ink)] underline underline-offset-4"
              >
                Back to {gallery.title}
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

