/**
 * A photo that lives in either:
 *   • a subgallery (subgalleryId is set, galleryId optional/derived), or
 *   • directly on a gallery as a "scene" (subgalleryId is null, galleryId set).
 *
 * The new optional location fields are per-photo so each direct gallery
 * photo can carry its own pin without polluting the parent gallery's
 * top-level location array.
 */
export type MemoryPhoto = {
  id: string;
  galleryId?: string | null;
  subgalleryId: string | null;
  src: string;
  caption: string;
  location?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  width?: number;
  height?: number;
  createdAt: string;
  order: number;
};

/**
 * A free-form date header that orders alongside direct gallery photos.
 * Users type the label themselves ("Friday", "Apr 18", "Day 2", …).
 * Dividers and direct photos share a single ordering namespace per
 * gallery — `order` is meaningful across both lists so they can be
 * interleaved deterministically on render.
 */
export type GalleryDivider = {
  id: string;
  galleryId: string;
  label: string;
  order: number;
  createdAt: string;
};

export type Subgallery = {
  id: string;
  galleryId: string;
  title: string;
  coverImage: string;
  location: string;
  locationLat?: number | null;
  locationLng?: number | null;
  /**
   * `dateLabel` is the legacy free-form display string. New writes
   * prefer the precise `startDate` / `endDate` pair below; the store
   * keeps `dateLabel` populated (derived from the range) for any
   * surface that still reads it directly.
   */
  dateLabel: string;
  startDate?: string;
  endDate?: string;
  description: string;
  photos: MemoryPhoto[];
  createdAt: string;
  updatedAt: string;
};

export type GalleryPrivacy = "private" | "public";

export type Gallery = {
  id: string;
  title: string;
  coverImage: string;
  description: string;
  startDate: string;
  endDate: string;
  locations: string[];
  locationLat?: number | null;
  locationLng?: number | null;
  people: string[];
  moodTags: string[];
  privacy: GalleryPrivacy;
  createdAt: string;
  updatedAt: string;
  subgalleries: Subgallery[];
  /** Photos uploaded directly to the gallery (no subgallery wrapper). */
  directPhotos: MemoryPhoto[];
  /** Free-form date headers ordered alongside `directPhotos`. */
  dividers: GalleryDivider[];
};

export type GalleryInput = {
  title: string;
  coverImage: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  people: string[];
  moodTags: string[];
  privacy: GalleryPrivacy;
};

export type SubgalleryInput = {
  title: string;
  coverImage: string;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  /**
   * Subgalleries now collect dates the same way galleries do — an
   * optional precise start and end pair. `dateLabel` is retained as
   * an optional fallback so any legacy caller (or future re-import
   * path) can still post a free-form string; the store prefers
   * `startDate` / `endDate` when either is non-empty.
   */
  startDate: string;
  endDate: string;
  dateLabel?: string;
  description: string;
  photos: MemoryPhoto[];
};
