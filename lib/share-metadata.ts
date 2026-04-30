import { cache } from "react";
import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "gallery-images";
// Long-lived signed URL for OG images. Once an unfurl-bot fetches the
// preview it usually caches indefinitely, but giving it 30 days of headroom
// covers reposts, cache busts, and platforms that re-scrape periodically.
const OG_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

export type ShareMetaContext = {
  shareId: string;
  ownerUserId: string;
  senderName: string;
  revoked: boolean;
};

type ShareLookupRow = {
  id: string;
  owner_user_id: string;
  revoked_at: string | null;
};

type SenderProfileRow = {
  display_name: string | null;
  username: string | null;
  email: string | null;
};

export const getShareMetaContext = cache(
  async (token: string): Promise<ShareMetaContext | null> => {
    const admin = createSupabaseAdminClient();
    const { data: share } = await admin
      .from("shares")
      .select("id, owner_user_id, revoked_at")
      .eq("token", token)
      .maybeSingle<ShareLookupRow>();

    if (!share) return null;

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, username, email")
      .eq("id", share.owner_user_id)
      .maybeSingle<SenderProfileRow>();

    return {
      shareId: share.id,
      ownerUserId: share.owner_user_id,
      senderName: pickSenderName(profile),
      revoked: !!share.revoked_at,
    };
  },
);

function pickSenderName(profile: SenderProfileRow | null): string {
  const display = profile?.display_name?.trim();
  if (display) return display;
  const username = profile?.username?.trim();
  if (username) return username;
  const email = profile?.email?.trim();
  if (email && email.includes("@")) return email.split("@")[0];
  return "Someone";
}

function isLikelyStoragePath(path: string) {
  return (
    !path.startsWith("data:") &&
    !path.startsWith("blob:") &&
    !path.startsWith("/") &&
    !path.startsWith("http")
  );
}

export async function signCoverUrlForOg(
  coverImagePath: string | null,
): Promise<string | null> {
  if (!coverImagePath) return null;
  if (!isLikelyStoragePath(coverImagePath)) return coverImagePath;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(coverImagePath, OG_SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export type BuildShareMetadataInput = {
  title: string;
  description?: string | null;
  coverUrl?: string | null;
};

// Single source of truth so every share route renders the same shape of
// preview. We deliberately omit `siteName` and any "Memora" branding so the
// unfurl reads as a personal share, not a product promo.
export function buildShareMetadata({
  title,
  description,
  coverUrl,
}: BuildShareMetadataInput): Metadata {
  const cleanDescription = description?.trim() || "Tap to view the photos.";
  const images = coverUrl ? [coverUrl] : undefined;

  return {
    title,
    description: cleanDescription,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: cleanDescription,
      type: "website",
      images,
    },
    twitter: {
      card: coverUrl ? "summary_large_image" : "summary",
      title,
      description: cleanDescription,
      images,
    },
  };
}

export const INVALID_SHARE_METADATA: Metadata = {
  title: "Shared link unavailable",
  description: "This share link may be invalid or no longer active.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Shared link unavailable",
    description: "This share link may be invalid or no longer active.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Shared link unavailable",
    description: "This share link may be invalid or no longer active.",
  },
};
