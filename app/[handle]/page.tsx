import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalLinks } from "@/components/legal-links";
import { ShareThemeFrame } from "@/components/share/share-theme-frame";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  extractHandleFromSegment,
  isLikelyStoragePath,
  loadProfileForHandle,
  type PublicGalleryRow,
} from "@/lib/public-profile-fetch";
import { formatDateRangeCompact, formatLocationForCard } from "@/lib/utils";

const STORAGE_BUCKET = "gallery-images";

async function loadPublicGalleries(userId: string): Promise<PublicGalleryRow[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("galleries")
    .select(
      "id, title, description, cover_image_path, start_date, end_date, location, locations, updated_at",
    )
    .eq("user_id", userId)
    .eq("is_on_public_profile", true)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .returns<PublicGalleryRow[]>();
  return data ?? [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle: rawSegment } = await params;
  const handle = extractHandleFromSegment(rawSegment);
  if (!handle) return { title: "Memora" };

  const profile = await loadProfileForHandle(handle);
  if (!profile || !profile.enabled) {
    return { title: "Memora" };
  }

  const displayName = profile.displayName ?? `@${handle}`;
  const description = profile.bio ?? `${displayName} on Memora.`;
  return {
    title: `${displayName} — Memora`,
    description,
    openGraph: {
      title: displayName,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: displayName,
      description,
    },
  };
}

export const revalidate = 60;

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: rawSegment } = await params;
  const handle = extractHandleFromSegment(rawSegment);
  if (!handle) notFound();

  const profile = await loadProfileForHandle(handle);
  if (!profile) notFound();

  if (!profile.enabled) {
    return (
      <ShareThemeFrame themeId={profile.themeId}>
        <PublicShell>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Memora
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight md:text-4xl">
            This Memora page is not public.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-[color:var(--ink-soft)]">
            The owner hasn&apos;t turned this page on. If they shared this link
            with you, ask them to enable their public Memora page in Settings.
          </p>
          <PublicFooter />
        </PublicShell>
      </ShareThemeFrame>
    );
  }

  const galleries = await loadPublicGalleries(profile.id);

  // Sign cover URLs in one batch — same approach as /share/[token].
  const coverPaths = galleries
    .map((gallery) => gallery.cover_image_path ?? "")
    .filter((path) => path && isLikelyStoragePath(path));
  const signedUrlByPath = new Map<string, string>();
  if (coverPaths.length) {
    const uniquePaths = Array.from(new Set(coverPaths));
    const { data: signedData } = await createSupabaseAdminClient()
      .storage.from(STORAGE_BUCKET)
      .createSignedUrls(uniquePaths, 60 * 60);
    (signedData ?? []).forEach((entry, index) => {
      if (entry.signedUrl) signedUrlByPath.set(uniquePaths[index], entry.signedUrl);
    });
  }

  const displayName = profile.displayName?.trim() || `@${profile.handle}`;

  return (
    <ShareThemeFrame themeId={profile.themeId}>
      <PublicShell>
        <header className="text-center">
        <p className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
          @{profile.handle}
        </p>
        {/* Mobile keeps the new mt-3 breathing room but pulls the
            title weight back to text-3xl so it doesn't dominate the
            narrow viewport. */}
        <h1 className="mt-3 font-serif text-3xl leading-[1.15] md:mt-3 md:text-5xl md:leading-tight">
          {displayName}
        </h1>
        {profile.bio ? (
          // Tighter mobile cap so the bio is centered with whitespace
          // either side, not edge-to-edge — reads as a deliberate
          // caption block instead of a wall of text.
          <p className="mx-auto mt-4 max-w-[18rem] whitespace-pre-line text-[14px] leading-6 text-[color:var(--ink-soft)] md:mt-4 md:max-w-md md:text-[15px] md:leading-7">
            {profile.bio}
          </p>
        ) : null}
      </header>

      <div className="mt-8 h-px w-full bg-[color:var(--border)] md:mt-12" />

      {galleries.length === 0 ? (
        <section className="mt-10 text-center md:mt-14">
          <p className="font-serif text-2xl leading-tight text-[color:var(--ink)]">
            No galleries yet.
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
            {displayName} hasn&apos;t added any galleries to this page. Check back soon.
          </p>
        </section>
      ) : (
        <section className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 md:mt-10 md:gap-x-8 md:gap-y-12">
          {galleries.map((gallery) => {
            const coverPath = gallery.cover_image_path ?? "";
            const cover = isLikelyStoragePath(coverPath)
              ? signedUrlByPath.get(coverPath) ?? ""
              : coverPath;
            const primaryLocation = formatLocationForCard(
              gallery.location ?? gallery.locations?.[0] ?? null,
            );
            const dateRange = formatDateRangeCompact(
              gallery.start_date ?? undefined,
              gallery.end_date ?? undefined,
            );
            const metaParts = [primaryLocation, dateRange].filter(Boolean) as string[];
            return (
              <Link
                key={gallery.id}
                href={`/@${profile.handle}/${gallery.id}`}
                className="group block"
              >
                <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-1 md:p-[14px]">
                  <div className="relative aspect-[4/3] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)] md:aspect-[16/9]">
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
                <div className="mt-2 space-y-1.5 md:mt-3 md:space-y-2">
                  {/* Title sized to let the photo hold visual primacy
                      on the narrow tile. Up to text-[28px] at md+. */}
                  <h2 className="font-serif text-[14px] leading-[1.2] text-[color:var(--ink)] md:text-[28px] md:leading-[1.15]">
                    {gallery.title}
                  </h2>
                  {/* On mobile the location + date stack on their own
                      lines (the joined " · " line wrapped awkwardly on
                      narrow tiles); on md+ they collapse back to the
                      single mid-dot caption. */}
                  {metaParts.length ? (
                    <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase leading-[1.5] tracking-[0.14em] text-[color:var(--ink-faint)] md:text-[10.5px] md:tracking-[0.16em]">
                      <span className="block md:inline">{metaParts[0]}</span>
                      {metaParts[1] ? (
                        <>
                          <span aria-hidden className="hidden md:inline">
                            {" · "}
                          </span>
                          <span className="block md:inline">{metaParts[1]}</span>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  {/* Description hidden on mobile — at 2 cols, 2-line
                      clamps of varying length make adjacent rows uneven
                      and crowd the photos. Returns at md+. */}
                  {gallery.description ? (
                    <p className="hidden line-clamp-2 text-[13.5px] leading-6 text-[color:var(--ink-soft)] md:block">
                      {gallery.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </section>
      )}

        <PublicFooter />
      </PublicShell>
    </ShareThemeFrame>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    // Extra top air on mobile so the identity block doesn't feel
    // pinned to the status bar. Desktop padding unchanged.
    <main className="min-h-screen bg-[color:var(--background)] px-4 pb-16 pt-14 text-[color:var(--ink)] md:px-8 md:pt-16">
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </main>
  );
}

function PublicFooter() {
  return (
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
  );
}
