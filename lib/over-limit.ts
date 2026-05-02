import { getPlanLimit, isUnlimited, type MembershipPlan } from "@/lib/plans";
import type { Gallery } from "@/types/memora";

/**
 * Plan-downgrade reconciliation helpers.
 *
 * After Stripe cancels a subscription the webhook flips the user back to
 * `free`, but their pre-existing galleries/subgalleries/photos may now sit
 * above the free-tier caps. This module reads the live store + the active
 * plan and reports exactly which resources are over-limit so the UI can
 * surface a clear "remove N to continue" banner. All deletes work
 * unconditionally (no plan-limit checks on the delete path), so a user can
 * always trim back into compliance.
 */

export type GalleryCountOverLimit = {
  /** Total galleries the user owns. */
  current: number;
  /** Plan cap (finite when limit applies). */
  limit: number;
  /** How many galleries the user must remove to fall under the cap. */
  excess: number;
};

export type GallerySubgalleryOverLimit = {
  galleryId: string;
  galleryTitle: string;
  current: number;
  limit: number;
  excess: number;
};

export type SubgalleryPhotoOverLimit = {
  galleryId: string;
  galleryTitle: string;
  subgalleryId: string;
  subgalleryTitle: string;
  current: number;
  limit: number;
  excess: number;
};

export type DirectPhotoOverLimit = {
  galleryId: string;
  galleryTitle: string;
  current: number;
  limit: number;
  excess: number;
};

export type OverLimitReport = {
  galleries: GalleryCountOverLimit | null;
  subgalleriesPerGallery: GallerySubgalleryOverLimit[];
  photosPerSubgallery: SubgalleryPhotoOverLimit[];
  directPhotosPerGallery: DirectPhotoOverLimit[];
  /** True when any of the above is non-empty. */
  hasOverLimit: boolean;
};

const EMPTY_REPORT: OverLimitReport = {
  galleries: null,
  subgalleriesPerGallery: [],
  photosPerSubgallery: [],
  directPhotosPerGallery: [],
  hasOverLimit: false,
};

export function computeOverLimit(
  galleries: Gallery[],
  plan: MembershipPlan | null,
): OverLimitReport {
  if (!plan) return EMPTY_REPORT;

  const galleryLimitRaw = getPlanLimit(plan, "galleries");
  const subgalleryLimitRaw = getPlanLimit(plan, "subgalleries");
  const photoLimitRaw = getPlanLimit(plan, "photos");
  const directPhotoLimitRaw = getPlanLimit(plan, "directPhotos");

  const report: OverLimitReport = {
    galleries: null,
    subgalleriesPerGallery: [],
    photosPerSubgallery: [],
    directPhotosPerGallery: [],
    hasOverLimit: false,
  };

  if (!isUnlimited(galleryLimitRaw)) {
    const limit = galleryLimitRaw as number;
    if (galleries.length > limit) {
      report.galleries = {
        current: galleries.length,
        limit,
        excess: galleries.length - limit,
      };
    }
  }

  for (const gallery of galleries) {
    const title = gallery.title || "Untitled gallery";

    if (!isUnlimited(subgalleryLimitRaw)) {
      const limit = subgalleryLimitRaw as number;
      const current = gallery.subgalleries.length;
      if (current > limit) {
        report.subgalleriesPerGallery.push({
          galleryId: gallery.id,
          galleryTitle: title,
          current,
          limit,
          excess: current - limit,
        });
      }
    }

    if (!isUnlimited(directPhotoLimitRaw)) {
      const limit = directPhotoLimitRaw as number;
      const current = gallery.directPhotos.length;
      if (current > limit) {
        report.directPhotosPerGallery.push({
          galleryId: gallery.id,
          galleryTitle: title,
          current,
          limit,
          excess: current - limit,
        });
      }
    }

    if (!isUnlimited(photoLimitRaw)) {
      const limit = photoLimitRaw as number;
      for (const subgallery of gallery.subgalleries) {
        const current = subgallery.photos.length;
        if (current > limit) {
          report.photosPerSubgallery.push({
            galleryId: gallery.id,
            galleryTitle: title,
            subgalleryId: subgallery.id,
            subgalleryTitle: subgallery.title || "Untitled subgallery",
            current,
            limit,
            excess: current - limit,
          });
        }
      }
    }
  }

  report.hasOverLimit =
    report.galleries !== null ||
    report.subgalleriesPerGallery.length > 0 ||
    report.photosPerSubgallery.length > 0 ||
    report.directPhotosPerGallery.length > 0;

  return report;
}

export function pluralizeGalleries(n: number) {
  return n === 1 ? "1 gallery" : `${n} galleries`;
}

export function pluralizePhotos(n: number) {
  return n === 1 ? "1 photo" : `${n} photos`;
}

export function pluralizeSubgalleries(n: number) {
  return n === 1 ? "1 subgallery" : `${n} subgalleries`;
}
