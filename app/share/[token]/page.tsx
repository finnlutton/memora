import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShareThemeFrame } from "@/components/share/share-theme-frame";
import {
  buildShareMetadata,
  formatShareDate,
  getShareMetaContext,
  INVALID_SHARE_METADATA,
  signCoverUrlForOg,
} from "@/lib/share-metadata";
import { imageProxyUrlForPath } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ShareRow = {
  id: string;
  message: string | null;
  revoked_at: string | null;
  recipient_group_name: string | null;
  recipient_member_labels: string[] | null;
  theme_id: string | null;
  created_at: string;
};

type ShareGalleryRow = {
  gallery_id: string;
};

type GalleryRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  cover_image_focal_x: number | null;
  cover_image_focal_y: number | null;
  start_date: string | null;
  end_date: string | null;
  locations: string[] | null;
};

function dayCount(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const days = Math.round((end - start) / 86_400_000) + 1;
  return days > 0 ? days : null;
}

function primaryLocation(locations: string[] | null | undefined) {
  if (!locations) return null;
  const cleaned = locations.map((l) => l?.trim()).filter((l): l is string => !!l);
  return cleaned[0] ?? null;
}

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const ctx = await getShareMetaContext(token);
  if (!ctx || ctx.revoked) return INVALID_SHARE_METADATA;

  const admin = createSupabaseAdminClient();
  const { data: linkedRows } = await admin
    .from("share_galleries")
    .select("gallery_id")
    .eq("share_id", ctx.shareId)
    .returns<{ gallery_id: string }[]>();

  const galleryIds = (linkedRows ?? []).map((row) => row.gallery_id);
  const { data: galleryRows } = galleryIds.length
    ? await admin
        .from("galleries")
        .select("title, description, cover_image_path, updated_at")
        .in("id", galleryIds)
        .order("updated_at", { ascending: false })
        .returns<
          {
            title: string;
            description: string | null;
            cover_image_path: string | null;
            updated_at: string;
          }[]
        >()
    : { data: [] as Array<{ title: string; description: string | null; cover_image_path: string | null; updated_at: string }> };

  const galleries = galleryRows ?? [];
  const headline = galleries[0];

  let title: string;
  if (galleries.length === 0) {
    title = `${ctx.senderName} shared photos with you`;
  } else if (galleries.length === 1) {
    title = `${ctx.senderName} shared ${headline.title} with you`;
  } else {
    title = `${ctx.senderName} shared ${galleries.length} galleries with you`;
  }

  const coverUrl = await signCoverUrlForOg(headline?.cover_image_path ?? null);
  const description =
    galleries.length === 1 ? headline.description ?? null : null;

  return buildShareMetadata({ title, description, coverUrl });
}

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createSupabaseAdminClient();

  // Sender context only needs the token, so it can run in parallel with
  // the share row fetch. The result is cached via React `cache()` so
  // generateMetadata + the page handler share a single round trip.
  const [{ data: share, error: shareError }, senderCtx] = await Promise.all([
    admin
      .from("shares")
      .select(
        "id, message, revoked_at, recipient_group_name, recipient_member_labels, theme_id, created_at",
      )
      .eq("token", token)
      .maybeSingle<ShareRow>(),
    getShareMetaContext(token),
  ]);

  if (shareError || !share || share.revoked_at) {
    const isRevoked = !!share?.revoked_at;
    return (
      <ShareThemeFrame themeId={share?.theme_id ?? null}>
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
      </ShareThemeFrame>
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
        .select("id, title, description, cover_image_path, cover_image_focal_x, cover_image_focal_y, start_date, end_date, locations")
        .in("id", galleryIds)
        .order("updated_at", { ascending: false })
        .returns<GalleryRow[]>()
    : { data: [] as GalleryRow[], error: null };

  if (galleryError) {
    throw new Error(galleryError.message);
  }

  // Single-gallery shares skip the landing grid (which would just be one
  // tile) and drop the recipient straight into the gallery view. The gallery
  // page detects this and inlines the sender's message above its own title.
  if (galleryRows && galleryRows.length === 1) {
    redirect(`/share/${token}/gallery/${galleryRows[0].id}`);
  }

  const senderName = senderCtx?.senderName ?? "Someone";
  const sharedDate = formatShareDate(share.created_at);
  const sharedDateCaps = sharedDate ? sharedDate.toUpperCase() : "";

  const memberLabels = (share.recipient_member_labels ?? []).filter(
    (label): label is string =>
      typeof label === "string" && label.trim().length > 0,
  );
  const recipientsLine = memberLabels.length ? memberLabels.join(" · ") : null;
  const groupName = share.recipient_group_name?.trim() || null;
  const titleText = groupName ? `Shared with ${groupName}` : "Shared with you";
  const titleWords = titleText.split(" ");
  const titleLeading = titleWords.slice(0, 2).join(" ");
  const titleRest = titleWords.slice(2).join(" ");

  const galleries = galleryRows ?? [];
  const featured = galleries[0] ?? null;
  const rest = galleries.slice(1);
  const galleryCountLabel = `${rest.length} ${rest.length === 1 ? "GALLERY" : "GALLERIES"}`;

  return (
    <ShareThemeFrame themeId={share.theme_id}>
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-5 text-[color:var(--ink)] md:px-8 md:py-7">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        {/* Top bar: brand · date */}
        <div className="flex items-baseline justify-between border-b-[0.5px] border-[color:var(--ink)] pb-3 md:pb-4">
          <p className="font-serif italic text-base text-[color:var(--ink)] md:text-lg">Memora</p>
          {sharedDateCaps ? (
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink)] md:text-[11px]">
              {sharedDateCaps}
            </p>
          ) : null}
        </div>

        {/* Masthead: title left, message right */}
        <div className="grid grid-cols-1 gap-6 py-7 md:grid-cols-[1.6fr_1fr] md:gap-10 md:py-10">
          <div>
            {(recipientsLine || senderName) ? (
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-soft)] md:text-[11px]">
                {recipientsLine ? `${recipientsLine} — ` : ""}
                FROM {senderName.toUpperCase()}
              </p>
            ) : null}
            <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight text-[color:var(--ink)] md:mt-5 md:text-6xl">
              {titleLeading}
              {titleRest ? <> <span className="italic">{titleRest}</span></> : null}
              <span className="text-[color:var(--ink-faint)]">.</span>
            </h1>
          </div>
          {share.message ? (
            <div className="md:border-l-[0.5px] md:border-[color:var(--ink)] md:pl-8">
              <p className="font-serif text-[15px] leading-7 text-[color:var(--ink)] md:text-base md:leading-[1.7]">
                {share.message}
              </p>
            </div>
          ) : null}
        </div>

        {/* Featured hero */}
        {featured ? (() => {
          const coverPath = featured.cover_image_path ?? "";
          const coverImage = isLikelyStoragePath(coverPath)
            ? imageProxyUrlForPath(coverPath)
            : coverPath;
          const loc = primaryLocation(featured.locations);
          const range = formatDateRange(featured.start_date, featured.end_date);
          const days = dayCount(featured.start_date, featured.end_date);
          return (
            <Link
              href={`/share/${token}/gallery/${featured.id}`}
              className="group relative mt-3 block overflow-hidden rounded-md md:mt-10"
            >
              <div className="relative aspect-[16/9] w-full bg-[color:var(--paper-strong)] md:aspect-[21/10]">
                {coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImage}
                    alt={featured.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.015]"
                    style={{
                      objectPosition: `${featured.cover_image_focal_x ?? 50}% ${featured.cover_image_focal_y ?? 50}%`,
                    }}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                ) : null}
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/15" />
                <span className="absolute left-4 top-4 hidden rounded-sm bg-white/90 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-black md:left-5 md:top-5 md:inline-block">
                  Featured
                </span>
                <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3 text-white md:inset-x-6 md:bottom-6">
                  <div className="min-w-0">
                    {loc ? (
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/85 md:text-[11px]">
                        {loc.toUpperCase()}
                      </p>
                    ) : null}
                    <h2 className="mt-1.5 font-serif text-3xl leading-tight md:mt-2 md:text-5xl">
                      {featured.title}
                    </h2>
                  </div>
                  {(range || days) ? (
                    <div className="text-right">
                      {range ? (
                        <p className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-white/85 md:text-[11px]">
                          {range}
                        </p>
                      ) : null}
                      {days ? (
                        <p className="mt-1 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-white/75 md:text-[11px]">
                          {days} {days === 1 ? "DAY" : "DAYS"}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })() : null}

        {/* Rest of the adventures */}
        {rest.length ? (
          <section className="mt-10 md:mt-14">
            <div className="flex items-baseline justify-between border-b-[0.5px] border-[color:var(--border-strong)] pb-3">
              <h3 className="font-serif text-xl text-[color:var(--ink)] md:text-2xl">
                Also featured:
              </h3>
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink)] md:text-[11px]">
                {galleryCountLabel}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 md:mt-8 md:grid-cols-6 md:gap-x-8 md:gap-y-10">
              {rest.map((gallery, index) => {
                const coverPath = gallery.cover_image_path ?? "";
                const coverImage = isLikelyStoragePath(coverPath)
                  ? imageProxyUrlForPath(coverPath)
                  : coverPath;
                const loc = primaryLocation(gallery.locations);
                const range = formatDateRange(gallery.start_date, gallery.end_date);
                // First two of remainder render as larger 2-col cards;
                // anything after fills a tighter 3-col row beneath them.
                const isLarge = index < 2;
                const colSpan = isLarge ? "md:col-span-3" : "md:col-span-2";
                const aspect = isLarge ? "aspect-[5/4]" : "aspect-[3/2]";
                const titleSize = isLarge ? "md:text-2xl" : "md:text-xl";

                return (
                  <Link
                    key={gallery.id}
                    href={`/share/${token}/gallery/${gallery.id}`}
                    className={`group block ${colSpan}`}
                  >
                    <div className={`relative ${aspect} w-full overflow-hidden rounded-sm bg-[color:var(--paper-strong)]`}>
                      {coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverImage}
                          alt={gallery.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                          style={{
                            objectPosition: `${gallery.cover_image_focal_x ?? 50}% ${gallery.cover_image_focal_y ?? 50}%`,
                          }}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>
                    <h4 className={`mt-2 font-serif text-base leading-[1.2] text-[color:var(--ink)] md:mt-3 md:text-xl md:leading-[1.15] ${titleSize}`}>
                      {gallery.title}
                    </h4>
                    {(loc || range) ? (
                      <p className="mt-1 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)] md:mt-1.5 md:text-[10.5px] md:tracking-[0.16em]">
                        {loc ? loc.toUpperCase() : null}
                        {loc && range ? " · " : null}
                        {range ? range.toUpperCase() : null}
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {!galleries.length ? (
          <section className="mt-10 border-y border-[color:var(--border)] px-6 py-10 text-center">
            <p className="font-serif text-2xl leading-tight">Nothing to see just yet.</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              The sender hasn&apos;t added any galleries to this share yet. Check back soon — anything they add will show up here automatically.
            </p>
          </section>
        ) : null}
        <footer className="mt-16 border-t border-[color:var(--border)] pt-6 text-center md:mt-20 md:pt-8">
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
    </ShareThemeFrame>
  );
}

