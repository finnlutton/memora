/**
 * Future-facing backend/domain types for Memora.
 * Used for backend design and API contracts.
 * The current frontend uses types/memora.ts; this file defines the target domain model.
 */

export type Privacy = "private" | "public";

export type DomainUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  authProvider: string;
  planTier: string;
  activeGalleryLimit: number;
  activeGalleryCount: number;
  creditsBalance: number;
  subscriptionStatus: string;
};

export type DomainGallery = {
  id: string;
  userId: string;
  title: string;
  description: string;
  coverImageUrl: string;
  startDate: string;
  endDate: string;
  locations: string[];
  people: string[];
  moodTags: string[];
  privacy: Privacy;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  shareStatus: string;
};

export type DomainScene = {
  id: string;
  galleryId: string;
  title: string;
  location: string;
  dateLabel: string;
  description: string;
  coverImageUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DomainPhoto = {
  id: string;
  sceneId: string;
  imageUrl: string;
  caption?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
