"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  pluralizeGalleries,
  pluralizePhotos,
  pluralizeSubgalleries,
  type OverLimitReport,
} from "@/lib/over-limit";

/**
 * Soft-lock banner shown when a user's archive is above the caps of their
 * current plan — typically because Stripe just downgraded them to free.
 *
 * The banner is informational, never blocking: every delete path bypasses
 * plan-limit checks, so the user can always trim back into compliance. New
 * uploads stay blocked by the existing pre-flight checks until the relevant
 * resource is back under cap.
 */

export function OverLimitBanner({
  report,
  planName,
  scope = "workspace",
  galleryId,
}: {
  report: OverLimitReport;
  planName: string;
  /**
   * "workspace" — render the full archive-wide summary (galleries page).
   * "gallery"   — only render items relevant to a single gallery
   *               (gallery detail page); pass that gallery's id.
   */
  scope?: "workspace" | "gallery";
  galleryId?: string;
}) {
  const messages = buildMessages(report, scope, galleryId);
  if (messages.length === 0) return null;

  return (
    <aside
      role="status"
      className="mb-4 border border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] px-4 py-3 text-[color:var(--warning-text)] md:mb-6 md:px-5 md:py-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <div className="space-y-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em]">
              Over your {planName} plan limit
            </p>
            <ul className="space-y-1 text-[13.5px] leading-6">
              {messages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
            <p className="pt-1 text-[12.5px] leading-5 text-[color:var(--warning-text)]/85">
              You can still delete to free up space — uploads are paused on the
              affected items until you&apos;re back under cap.
            </p>
          </div>
        </div>
        <Link
          href="/galleries/settings/membership?source=over-limit"
          className="inline-flex shrink-0 items-center justify-center self-start border border-current px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.16em] transition hover:bg-[color:var(--warning-text)] hover:text-[color:var(--warning-bg)] md:self-center"
        >
          Upgrade plan
        </Link>
      </div>
    </aside>
  );
}

function buildMessages(
  report: OverLimitReport,
  scope: "workspace" | "gallery",
  galleryId: string | undefined,
): string[] {
  const messages: string[] = [];

  if (scope === "workspace" && report.galleries) {
    messages.push(
      `Remove ${pluralizeGalleries(report.galleries.excess)} — you have ${report.galleries.current} of ${report.galleries.limit} allowed.`,
    );
  }

  const subEntries =
    scope === "gallery"
      ? report.subgalleriesPerGallery.filter((entry) => entry.galleryId === galleryId)
      : report.subgalleriesPerGallery;
  for (const entry of subEntries) {
    const where = scope === "workspace" ? ` in "${entry.galleryTitle}"` : "";
    messages.push(
      `Remove ${pluralizeSubgalleries(entry.excess)}${where} — ${entry.current} of ${entry.limit} allowed.`,
    );
  }

  const directEntries =
    scope === "gallery"
      ? report.directPhotosPerGallery.filter((entry) => entry.galleryId === galleryId)
      : report.directPhotosPerGallery;
  for (const entry of directEntries) {
    const where = scope === "workspace" ? ` in "${entry.galleryTitle}"` : "";
    messages.push(
      `Remove ${pluralizePhotos(entry.excess)}${where} — ${entry.current} of ${entry.limit} direct photos allowed.`,
    );
  }

  const subPhotoEntries =
    scope === "gallery"
      ? report.photosPerSubgallery.filter((entry) => entry.galleryId === galleryId)
      : report.photosPerSubgallery;
  for (const entry of subPhotoEntries) {
    const where =
      scope === "workspace"
        ? ` in "${entry.galleryTitle} → ${entry.subgalleryTitle}"`
        : ` in "${entry.subgalleryTitle}"`;
    messages.push(
      `Remove ${pluralizePhotos(entry.excess)}${where} — ${entry.current} of ${entry.limit} photos allowed.`,
    );
  }

  return messages;
}
