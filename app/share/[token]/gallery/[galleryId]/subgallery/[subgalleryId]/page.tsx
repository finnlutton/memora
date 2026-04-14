import Link from "next/link";
import { PhotoGrid } from "@/components/photo-grid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  if (!startDate && !endDate) return "";
  if (startDate && endDate && startDate !== endDate) return `${startDate} - ${endDate}`;
  return startDate ?? endDate ?? "";
}

function InvalidShareState({ token, message }: { token: string; message: string }) {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-10 text-[color:var(--ink)]">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Memora</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">Share unavailable</h1>
        <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">{message}</p>
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
    return <InvalidShareState token={token} message="This share link may be invalid or has been revoked." />;
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

  const imagePaths = [
    subgallery.cover_image_path ?? "",
    ...(photoRows ?? []).map((photo) => photo.storage_path),
  ].filter((path) => path && isLikelyStoragePath(path));

  const signedUrlByPath = new Map<string, string>();
  if (imagePaths.length) {
    const uniquePaths = Array.from(new Set(imagePaths));
    const { data } = await admin.storage.from(STORAGE_BUCKET).createSignedUrls(uniquePaths, 60 * 60);
    (data ?? []).forEach((entry, index) => {
      if (entry.signedUrl) signedUrlByPath.set(uniquePaths[index], entry.signedUrl);
    });
  }

  const coverImage = isLikelyStoragePath(subgallery.cover_image_path ?? "")
    ? signedUrlByPath.get(subgallery.cover_image_path ?? "") ?? ""
    : (subgallery.cover_image_path ?? "");

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
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--ink)] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-[rgba(30,46,72,0.1)] pb-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Memora</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[color:var(--ink-soft)]">
            <Link href={`/share/${token}`} className="underline underline-offset-4">All shared galleries</Link>
            <span>/</span>
            <Link href={`/share/${token}/gallery/${gallery.id}`} className="underline underline-offset-4">{gallery.title}</Link>
            <span>/</span>
            <span>{subgallery.title}</span>
          </div>
          <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">{subgallery.title}</h1>
          {(subgallery.location || subgallery.date_label || formatDateRange(subgallery.start_date, subgallery.end_date)) ? (
            <p className="mt-3 text-sm text-[color:var(--ink-soft)]">
              {[subgallery.location, subgallery.date_label || formatDateRange(subgallery.start_date, subgallery.end_date)]
                .filter(Boolean)
                .join(" • ")}
            </p>
          ) : null}
          {subgallery.description ? (
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[color:var(--ink-soft)]">{subgallery.description}</p>
          ) : null}
        </div>

        {coverImage ? (
          <div className="mb-8 overflow-hidden border border-[rgba(30,46,72,0.12)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt={subgallery.title} className="h-80 w-full object-cover md:h-[24rem]" />
          </div>
        ) : null}

        <section>
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">Photos</p>
          {photos.length ? (
            <PhotoGrid photos={photos} />
          ) : (
            <div className="border border-[rgba(30,46,72,0.12)] bg-white/72 px-6 py-8">
              <p className="font-serif text-2xl leading-tight">No photos in this scene yet.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

