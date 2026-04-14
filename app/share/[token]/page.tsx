import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "gallery-images";

type ShareRow = {
  id: string;
  message: string | null;
  revoked_at: string | null;
};

type ShareGalleryRow = {
  gallery_id: string;
};

type GalleryRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
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

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createSupabaseAdminClient();

  const { data: share, error: shareError } = await admin
    .from("shares")
    .select("id, message, revoked_at")
    .eq("token", token)
    .maybeSingle<ShareRow>();

  if (shareError || !share || share.revoked_at) {
    return (
      <main className="min-h-screen bg-[color:var(--background)] px-5 py-10 text-[color:var(--ink)]">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Memora</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">This share link is unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">
            The link may be invalid, revoked, or no longer active.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-[color:var(--ink)] underline underline-offset-4">
            Return to Memora
          </Link>
        </div>
      </main>
    );
  }

  const { data: linkedRows, error: linkedError } = await admin
    .from("share_galleries")
    .select("gallery_id")
    .eq("share_id", share.id)
    .returns<ShareGalleryRow[]>();

  if (linkedError) {
    throw new Error(linkedError.message);
  }

  const galleryIds = (linkedRows ?? []).map((entry) => entry.gallery_id);
  const { data: galleryRows, error: galleryError } = galleryIds.length
    ? await admin
        .from("galleries")
        .select("id, title, description, cover_image_path, start_date, end_date")
        .in("id", galleryIds)
        .order("updated_at", { ascending: false })
        .returns<GalleryRow[]>()
    : { data: [] as GalleryRow[], error: null };

  if (galleryError) {
    throw new Error(galleryError.message);
  }

  const coverPaths = (galleryRows ?? [])
    .map((gallery) => gallery.cover_image_path ?? "")
    .filter((path) => path && isLikelyStoragePath(path));

  const signedUrlByPath = new Map<string, string>();
  if (coverPaths.length) {
    const uniquePaths = Array.from(new Set(coverPaths));
    const { data: signedData } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls(uniquePaths, 60 * 60);

    (signedData ?? []).forEach((entry, index) => {
      if (entry.signedUrl) {
        signedUrlByPath.set(uniquePaths[index], entry.signedUrl);
      }
    });
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--ink)] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-[rgba(30,46,72,0.1)] pb-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Memora</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">Shared Galleries</h1>
          {share.message ? (
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[color:var(--ink-soft)]">{share.message}</p>
          ) : null}
        </div>

        {galleryRows?.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {galleryRows.map((gallery) => {
              const coverPath = gallery.cover_image_path ?? "";
              const coverImage = isLikelyStoragePath(coverPath)
                ? signedUrlByPath.get(coverPath) ?? ""
                : coverPath;

              return (
                <article key={gallery.id} className="overflow-hidden border border-[rgba(30,46,72,0.12)] bg-white/72">
                  <div className="relative aspect-[5/3] bg-[rgba(18,32,48,0.08)]">
                    {coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverImage} alt={gallery.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="space-y-2 px-4 py-3.5">
                    <h2 className="font-serif text-xl leading-tight">{gallery.title}</h2>
                    {formatDateRange(gallery.start_date, gallery.end_date) ? (
                      <p className="text-xs text-[color:var(--ink-soft)]">
                        {formatDateRange(gallery.start_date, gallery.end_date)}
                      </p>
                    ) : null}
                    {gallery.description ? (
                      <p className="line-clamp-3 text-sm leading-6 text-[color:var(--ink-soft)]">{gallery.description}</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="border border-[rgba(30,46,72,0.12)] bg-white/72 px-6 py-8">
            <p className="font-serif text-2xl leading-tight">No galleries available in this share yet.</p>
          </section>
        )}
      </div>
    </main>
  );
}

