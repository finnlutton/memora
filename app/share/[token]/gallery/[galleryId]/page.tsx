import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "gallery-images";

type ShareRow = {
  id: string;
  message: string | null;
  revoked_at: string | null;
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

function isLikelyStoragePath(path: string) {
  return !path.startsWith("data:") && !path.startsWith("blob:") && !path.startsWith("/") && !path.startsWith("http");
}

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "";
  if (startDate && endDate && startDate !== endDate) return `${startDate} - ${endDate}`;
  return startDate ?? endDate ?? "";
}

function dateLabelForSubgallery(subgallery: SubgalleryRow) {
  return subgallery.date_label || formatDateRange(subgallery.start_date, subgallery.end_date);
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

export default async function PublicSharedGalleryPage({
  params,
}: {
  params: Promise<{ token: string; galleryId: string }>;
}) {
  const { token, galleryId } = await params;
  const admin = createSupabaseAdminClient();

  const { data: share } = await admin
    .from("shares")
    .select("id, message, revoked_at")
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

  const { data: gallery } = await admin
    .from("galleries")
    .select("id, title, description, cover_image_path, start_date, end_date")
    .eq("id", galleryId)
    .maybeSingle<GalleryRow>();

  if (!gallery) {
    return <InvalidShareState token={token} message="This gallery is no longer available." />;
  }

  const { data: subgalleries } = await admin
    .from("subgalleries")
    .select("id, title, description, cover_image_path, location, date_label, start_date, end_date")
    .eq("gallery_id", galleryId)
    .order("display_order", { ascending: true })
    .returns<SubgalleryRow[]>();

  const coverPaths = [
    gallery.cover_image_path ?? "",
    ...(subgalleries ?? []).map((subgallery) => subgallery.cover_image_path ?? ""),
  ].filter((path) => path && isLikelyStoragePath(path));

  const signedUrlByPath = new Map<string, string>();
  if (coverPaths.length) {
    const uniquePaths = Array.from(new Set(coverPaths));
    const { data } = await admin.storage.from(STORAGE_BUCKET).createSignedUrls(uniquePaths, 60 * 60);
    (data ?? []).forEach((entry, index) => {
      if (entry.signedUrl) signedUrlByPath.set(uniquePaths[index], entry.signedUrl);
    });
  }

  const galleryCover = isLikelyStoragePath(gallery.cover_image_path ?? "")
    ? signedUrlByPath.get(gallery.cover_image_path ?? "") ?? ""
    : (gallery.cover_image_path ?? "");

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--ink)] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-[rgba(30,46,72,0.1)] pb-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Memora</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[color:var(--ink-soft)]">
            <Link href={`/share/${token}`} className="underline underline-offset-4">All shared galleries</Link>
            <span>/</span>
            <span>{gallery.title}</span>
          </div>
          <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">{gallery.title}</h1>
          {share.message ? (
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[color:var(--ink-soft)]">{share.message}</p>
          ) : null}
        </div>

        {galleryCover ? (
          <div className="mb-8 overflow-hidden border border-[rgba(30,46,72,0.12)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={galleryCover} alt={gallery.title} className="h-80 w-full object-cover md:h-[24rem]" />
          </div>
        ) : null}

        {(subgalleries ?? []).length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(subgalleries ?? []).map((subgallery) => {
              const cover = isLikelyStoragePath(subgallery.cover_image_path ?? "")
                ? signedUrlByPath.get(subgallery.cover_image_path ?? "") ?? ""
                : (subgallery.cover_image_path ?? "");

              return (
                <Link
                  key={subgallery.id}
                  href={`/share/${token}/gallery/${gallery.id}/subgallery/${subgallery.id}`}
                  className="group overflow-hidden border border-[rgba(30,46,72,0.12)] bg-white/72 transition hover:shadow-[0_16px_38px_rgba(16,24,38,0.12)]"
                >
                  <div className="relative aspect-[5/3] bg-[rgba(18,32,48,0.08)]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={subgallery.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                    ) : null}
                  </div>
                  <div className="space-y-2 px-4 py-3.5">
                    <h2 className="font-serif text-xl leading-tight">{subgallery.title}</h2>
                    {(subgallery.location || dateLabelForSubgallery(subgallery)) ? (
                      <p className="text-xs text-[color:var(--ink-soft)]">
                        {[subgallery.location, dateLabelForSubgallery(subgallery)].filter(Boolean).join(" • ")}
                      </p>
                    ) : null}
                    {subgallery.description ? (
                      <p className="line-clamp-3 text-sm leading-6 text-[color:var(--ink-soft)]">{subgallery.description}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </section>
        ) : (
          <section className="border border-[rgba(30,46,72,0.12)] bg-white/72 px-6 py-8">
            <p className="font-serif text-2xl leading-tight">No subgalleries in this shared gallery yet.</p>
          </section>
        )}
      </div>
    </main>
  );
}

