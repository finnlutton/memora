import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "gallery-images";

type ShareRow = {
  id: string;
  message: string | null;
  revoked_at: string | null;
  recipient_group_name: string | null;
  recipient_member_labels: string[] | null;
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

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createSupabaseAdminClient();

  const { data: share, error: shareError } = await admin
    .from("shares")
    .select(
      "id, message, revoked_at, recipient_group_name, recipient_member_labels",
    )
    .eq("token", token)
    .maybeSingle<ShareRow>();

  if (shareError || !share || share.revoked_at) {
    const isRevoked = !!share?.revoked_at;
    return (
      <main className="min-h-screen bg-[color:var(--background)] px-4 py-8 text-[color:var(--ink)] md:px-5 md:py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Memora</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight md:mt-3 md:text-4xl">
            {isRevoked ? "This share link has been revoked" : "This share link is unavailable"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)] md:mt-4 md:leading-7">
            {isRevoked
              ? "The sender has revoked this share link. Reach out to them if you'd like access again."
              : "The link may be invalid or no longer active. Ask the person who shared it to send you a new one."}
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
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--ink)] md:px-8 md:py-8">
      {/*
        Header eyebrow + title personalize the share when the sender
        chose a recipient group at create time. With group data:
          • eyebrow = the member names joined by ' · '
          • title   = 'Shared with <group name>'
        Without group data we fall back to the original
        'Memora' / 'Shared with you' wording so older share links
        keep rendering exactly as they did before.
      */}
      <div className="mx-auto max-w-6xl">
        {(() => {
          const memberLabels = (share.recipient_member_labels ?? []).filter(
            (label): label is string =>
              typeof label === "string" && label.trim().length > 0,
          );
          const eyebrowText = memberLabels.length
            ? memberLabels.join(" · ")
            : "Memora";
          const groupName = share.recipient_group_name?.trim() || null;
          const titleText = groupName
            ? `Shared with ${groupName}`
            : "Shared with you";
          return (
            <div className="mb-6 border-b border-[color:var(--border)] pb-4 md:mb-8 md:pb-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                {eyebrowText}
              </p>
              <h1 className="mt-2 font-serif text-3xl leading-tight md:mt-3 md:text-5xl">
                {titleText}
              </h1>
              {share.message ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--ink-soft)] md:mt-4 md:text-[15px] md:leading-7">
                  {share.message}
                </p>
              ) : null}
            </div>
          );
        })()}

        {galleryRows?.length ? (
          <section className="grid gap-5 md:grid-cols-2">
            {galleryRows.map((gallery) => {
              const coverPath = gallery.cover_image_path ?? "";
              const coverImage = isLikelyStoragePath(coverPath)
                ? signedUrlByPath.get(coverPath) ?? ""
                : coverPath;

              return (
                <Link
                  key={gallery.id}
                  href={`/share/${token}/gallery/${gallery.id}`}
                  className="group block"
                >
                  <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-2.5">
                    <div className="relative aspect-[16/10] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
                      {coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverImage} alt={gallery.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]" />
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <h2 className="font-serif text-2xl leading-[1.15] text-[color:var(--ink)]">{gallery.title}</h2>
                    {formatDateRange(gallery.start_date, gallery.end_date) ? (
                      <p className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                        {formatDateRange(gallery.start_date, gallery.end_date)}
                      </p>
                    ) : null}
                    {gallery.description ? (
                      <p className="line-clamp-3 text-sm leading-6 text-[color:var(--ink-soft)]">{gallery.description}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </section>
        ) : (
          <section className="border-y border-[color:var(--border)] px-6 py-10 text-center">
            <p className="font-serif text-2xl leading-tight">Nothing to see just yet.</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              The sender hasn&apos;t added any galleries to this share yet. Check back soon — anything they add will show up here automatically.
            </p>
          </section>
        )}
        <footer className="mt-10 border-t border-[color:var(--border)] pt-6 text-center md:mt-14 md:pt-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Memora</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Want to preserve your own memories?{" "}
            <Link href="/auth?mode=signup" className="text-[color:var(--ink)] underline underline-offset-4">
              Create a free archive →
            </Link>
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
            <Link href="/terms" className="transition hover:text-[color:var(--ink-soft)]">
              Terms
            </Link>
            <span aria-hidden className="mx-2 opacity-60">·</span>
            <Link href="/privacy" className="transition hover:text-[color:var(--ink-soft)]">
              Privacy
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

