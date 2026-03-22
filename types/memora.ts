export type MemoryPhoto = {
  id: string;
  subgalleryId: string;
  src: string;
  caption: string;
  width?: number;
  height?: number;
  createdAt: string;
  order: number;
};

export type Subgallery = {
  id: string;
  galleryId: string;
  title: string;
  coverImage: string;
  location: string;
  dateLabel: string;
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
  people: string[];
  moodTags: string[];
  privacy: GalleryPrivacy;
  createdAt: string;
  updatedAt: string;
  subgalleries: Subgallery[];
};

export type GalleryInput = {
  title: string;
  coverImage: string;
  description: string;
  startDate: string;
  endDate: string;
  locations: string[];
  people: string[];
  moodTags: string[];
  privacy: GalleryPrivacy;
};

export type SubgalleryInput = {
  title: string;
  coverImage: string;
  location: string;
  dateLabel: string;
  description: string;
  photos: MemoryPhoto[];
};
