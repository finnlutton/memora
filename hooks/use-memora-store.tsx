"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { demoGalleries } from "@/lib/demo-data";
import {
  type AuthUserLike,
  buildMembershipMetadata,
  getNextAuthenticatedRoute,
  readMembershipStateFromUser,
} from "@/lib/onboarding";
import { getMembershipPlan, type MembershipPlanId } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createId } from "@/lib/utils";
import type { Gallery, GalleryInput, MemoryPhoto, Subgallery, SubgalleryInput } from "@/types/memora";

const LEGACY_STORAGE_KEY = "memora::galleries:v1";
const DEMO_STORAGE_KEY = "memora::demo-galleries:v1";
const USER_STORAGE_KEY = "memora::user-galleries:v1";
const LEGACY_ONBOARDING_KEY = "memora::onboarding:v1";
const STORAGE_BUCKET = "gallery-images";

type OnboardingState = {
  isAuthenticated: boolean;
  selectedPlanId: MembershipPlanId | null;
  onboardingComplete: boolean;
  user: {
    email: string;
  } | null;
};

type MemoraStore = {
  galleries: Gallery[];
  hydrated: boolean;
  storageQuotaExceeded: boolean;
  dismissStorageQuotaWarning: () => void;
  onboarding: OnboardingState;
  createGallery: (input: GalleryInput) => Promise<string>;
  updateGallery: (galleryId: string, input: GalleryInput) => Promise<void>;
  deleteGallery: (galleryId: string) => Promise<void>;
  createSubgallery: (galleryId: string, input: SubgalleryInput) => Promise<string>;
  updateSubgallery: (
    galleryId: string,
    subgalleryId: string,
    input: SubgalleryInput,
  ) => Promise<void>;
  deleteSubgallery: (galleryId: string, subgalleryId: string) => Promise<void>;
  getGallery: (galleryId: string) => Gallery | undefined;
  getSubgallery: (galleryId: string, subgalleryId: string) => Subgallery | undefined;
  resetDemo: () => void;
  signOut: () => void;
  syncOnboardingFromUser: (user: AuthUserLike) => void;
  completeCheckout: (planId: MembershipPlanId) => Promise<void>;
  resetOnboarding: () => void;
  getNextOnboardingRoute: () => string;
};

type GalleryRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  locations?: string[] | null;
  people?: string[] | null;
  mood_tags?: string[] | null;
  privacy?: "private" | "public" | null;
};

type SubgalleryRow = {
  id: string;
  gallery_id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  date_label?: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
};

type PhotoRow = {
  id: string;
  user_id: string;
  gallery_id: string | null;
  subgallery_id: string | null;
  storage_path: string;
  caption: string | null;
  display_order: number | null;
  taken_at: string | null;
  created_at: string;
};

function isLikelyStoragePath(path: string) {
  return !path.startsWith("data:") && !path.startsWith("blob:") && !path.startsWith("/") && !path.startsWith("http");
}

function parseDateLabelToRange(dateLabel: string): { startDate: string | null; endDate: string | null } {
  const value = dateLabel.trim();
  if (!value) return { startDate: null, endDate: null };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { startDate: value, endDate: value };
  }
  return { startDate: null, endDate: null };
}

function dateLabelFromRange(startDate: string | null, endDate: string | null, fallback?: string | null) {
  if (fallback?.trim()) return fallback;
  if (!startDate) return "";
  if (!endDate || endDate === startDate) return startDate;
  return `${startDate} - ${endDate}`;
}

async function sourceToBlob(source: string) {
  const response = await fetch(source);
  return response.blob();
}

async function uploadImageSourceIfNeeded(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
  source: string,
  folder: "galleries" | "subgalleries" | "photos",
  id: string,
) {
  if (!source) return source;
  if (isLikelyStoragePath(source) || source.startsWith("/") || source.startsWith("http")) {
    return source;
  }

  const blob = await sourceToBlob(source);
  const extension = blob.type.includes("png") ? "png" : "jpg";
  const storagePath = `${userId}/${folder}/${id}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return storagePath;
}

async function resolveImageUrls(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  paths: string[],
) {
  const map = new Map<string, string>();
  const storagePaths = paths.filter((path) => isLikelyStoragePath(path));
  const directPaths = paths.filter((path) => !isLikelyStoragePath(path));

  directPaths.forEach((path) => map.set(path, path));

  if (storagePaths.length === 0) return map;

  const uniqueStoragePaths = Array.from(new Set(storagePaths));
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(uniqueStoragePaths, 60 * 60);

  if (error) {
    uniqueStoragePaths.forEach((path) => map.set(path, path));
    return map;
  }

  data.forEach((entry, index) => {
    const originalPath = uniqueStoragePaths[index];
    map.set(originalPath, entry.signedUrl ?? originalPath);
  });

  return map;
}

async function loadUserGalleriesFromSupabase(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
) {
  const { data: galleriesData, error: galleriesError } = await supabase
    .from("galleries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (galleriesError) throw galleriesError;

  const galleryRows = (galleriesData ?? []) as GalleryRow[];
  if (galleryRows.length === 0) return [] as Gallery[];

  const galleryIds = galleryRows.map((gallery) => gallery.id);
  const { data: subgalleriesData, error: subgalleriesError } = await supabase
    .from("subgalleries")
    .select("*")
    .eq("user_id", userId)
    .in("gallery_id", galleryIds)
    .order("display_order", { ascending: true });
  if (subgalleriesError) throw subgalleriesError;

  const subgalleryRows = (subgalleriesData ?? []) as SubgalleryRow[];
  const subgalleryIds = subgalleryRows.map((subgallery) => subgallery.id);
  const { data: photosData, error: photosError } = subgalleryIds.length
    ? await supabase
        .from("photos")
        .select("*")
        .eq("user_id", userId)
        .in("subgallery_id", subgalleryIds)
        .order("display_order", { ascending: true })
    : { data: [] as PhotoRow[], error: null as unknown };
  if (photosError) throw photosError;

  const photoRows = (photosData ?? []) as PhotoRow[];

  const allPaths = [
    ...galleryRows.map((gallery) => gallery.cover_image_path ?? "").filter(Boolean),
    ...subgalleryRows.map((subgallery) => subgallery.cover_image_path ?? "").filter(Boolean),
    ...photoRows.map((photo) => photo.storage_path).filter(Boolean),
  ];
  const resolvedImageMap = await resolveImageUrls(supabase, allPaths);

  const photosBySubgallery = new Map<string, MemoryPhoto[]>();
  photoRows.forEach((photo) => {
    if (!photo.subgallery_id) return;
    const entry: MemoryPhoto = {
      id: photo.id,
      subgalleryId: photo.subgallery_id,
      src: resolvedImageMap.get(photo.storage_path) ?? photo.storage_path,
      caption: photo.caption ?? "",
      createdAt: photo.created_at,
      order: photo.display_order ?? 0,
    };
    const current = photosBySubgallery.get(photo.subgallery_id) ?? [];
    photosBySubgallery.set(photo.subgallery_id, [...current, entry]);
  });

  const subgalleriesByGallery = new Map<string, Subgallery[]>();
  subgalleryRows.forEach((subgallery) => {
    const entry: Subgallery = {
      id: subgallery.id,
      galleryId: subgallery.gallery_id,
      title: subgallery.title,
      coverImage: resolvedImageMap.get(subgallery.cover_image_path ?? "") ?? (subgallery.cover_image_path ?? ""),
      location: subgallery.location ?? "",
      dateLabel: dateLabelFromRange(subgallery.start_date, subgallery.end_date, subgallery.date_label),
      description: subgallery.description ?? "",
      photos: sortPhotos(photosBySubgallery.get(subgallery.id) ?? []),
      createdAt: subgallery.created_at,
      updatedAt: subgallery.updated_at,
    };
    const current = subgalleriesByGallery.get(subgallery.gallery_id) ?? [];
    subgalleriesByGallery.set(subgallery.gallery_id, [...current, entry]);
  });

  return galleryRows.map((gallery) => ({
    id: gallery.id,
    title: gallery.title,
    coverImage: resolvedImageMap.get(gallery.cover_image_path ?? "") ?? (gallery.cover_image_path ?? ""),
    description: gallery.description ?? "",
    startDate: gallery.start_date ?? "",
    endDate: gallery.end_date ?? "",
    locations: gallery.locations ?? (gallery.location ? [gallery.location] : []),
    people: gallery.people ?? [],
    moodTags: gallery.mood_tags ?? [],
    privacy: gallery.privacy ?? "private",
    createdAt: gallery.created_at,
    updatedAt: gallery.updated_at,
    subgalleries: subgalleriesByGallery.get(gallery.id) ?? [],
  }));
}

const MemoraContext = createContext<MemoraStore | null>(null);

const defaultOnboardingState: OnboardingState = {
  isAuthenticated: false,
  selectedPlanId: null,
  onboardingComplete: false,
  user: null,
};

function sortPhotos<T extends { order: number }>(photos: T[]) {
  return [...photos].sort((left, right) => left.order - right.order);
}

function splitLegacyGalleries(galleries: Gallery[]) {
  return {
    demo: galleries.filter((gallery) => demoGalleries.some((demoGallery) => demoGallery.id === gallery.id)),
    user: galleries.filter((gallery) => !demoGalleries.some((demoGallery) => demoGallery.id === gallery.id)),
  };
}

function loadStoredGalleryCollections() {
  if (typeof window === "undefined") {
    return {
      demo: demoGalleries,
      user: [] as Gallery[],
    };
  }

  const demoValue = window.localStorage.getItem(DEMO_STORAGE_KEY);
  const userValue = window.localStorage.getItem(USER_STORAGE_KEY);
  if (demoValue || userValue) {
    try {
      return {
        demo: demoValue ? (JSON.parse(demoValue) as Gallery[]) : demoGalleries,
        user: userValue ? (JSON.parse(userValue) as Gallery[]) : [],
      };
    } catch {
      return {
        demo: demoGalleries,
        user: [],
      };
    }
  }

  const storedValue = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!storedValue) {
    return {
      demo: demoGalleries,
      user: [],
    };
  }

  try {
    return splitLegacyGalleries(JSON.parse(storedValue) as Gallery[]);
  } catch {
    return {
      demo: demoGalleries,
      user: [],
    };
  }
}

function loadLegacyOnboarding() {
  if (typeof window === "undefined") {
    return defaultOnboardingState;
  }

  const storedValue = window.localStorage.getItem(LEGACY_ONBOARDING_KEY);
  if (!storedValue) {
    return defaultOnboardingState;
  }

  try {
    return JSON.parse(storedValue) as OnboardingState;
  } catch {
    return defaultOnboardingState;
  }
}

function buildOnboardingStateFromUser(user: AuthUserLike): OnboardingState {
  const membershipState = readMembershipStateFromUser(user);

  return {
    isAuthenticated: Boolean(user),
    selectedPlanId: membershipState.selectedPlanId,
    onboardingComplete: membershipState.onboardingComplete,
    user: user?.email ? { email: user.email } : null,
  };
}

export function MemoraProvider({ children }: { children: React.ReactNode }) {
  // Same initial state on server and client so SSR markup matches the first client render.
  // Rehydrate from localStorage only after mount (client-only).
  const [demoGalleryCollection, setDemoGalleryCollection] = useState<Gallery[]>(demoGalleries);
  const [userGalleryCollection, setUserGalleryCollection] = useState<Gallery[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingState>(defaultOnboardingState);
  const [hydrated, setHydrated] = useState(false);
  const [storageQuotaExceeded, setStorageQuotaExceeded] = useState(false);

  useEffect(() => {
    const nextCollections = loadStoredGalleryCollections();
    const legacyOnboarding = loadLegacyOnboarding();
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    const syncInitialState = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) {
          return;
        }

        const nextUser = data.user ?? null;
        let membershipState = readMembershipStateFromUser(nextUser);

        if (
          nextUser &&
          !membershipState.selectedPlanId &&
          legacyOnboarding.selectedPlanId &&
          getMembershipPlan(legacyOnboarding.selectedPlanId)
        ) {
          membershipState = {
            selectedPlanId: legacyOnboarding.selectedPlanId,
            onboardingComplete: legacyOnboarding.onboardingComplete,
          };

          try {
            await supabase.auth.updateUser({
              data: buildMembershipMetadata(membershipState),
            });
          } catch (error) {
            console.error("Memora: failed to migrate membership metadata", error);
          }
        }

        const persistedUserGalleries = nextUser
          ? await loadUserGalleriesFromSupabase(supabase, nextUser.id)
          : nextCollections.user;

        queueMicrotask(() => {
          setDemoGalleryCollection(nextCollections.demo);
          setUserGalleryCollection(persistedUserGalleries);
          setOnboarding(
            buildOnboardingStateFromUser(
              nextUser
                ? {
                    ...nextUser,
                    user_metadata: buildMembershipMetadata(membershipState),
                  }
                : null,
            ),
          );
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(LEGACY_ONBOARDING_KEY);
          }
          setHydrated(true);
        });
      } catch (error) {
        console.error("Memora: failed to load initial auth state", error);
        queueMicrotask(() => {
          setDemoGalleryCollection(nextCollections.demo);
          setUserGalleryCollection(nextCollections.user);
          setOnboarding(defaultOnboardingState);
          setHydrated(true);
        });
      }
    };

    void syncInitialState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoGalleryCollection));
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userGalleryCollection));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      queueMicrotask(() => setStorageQuotaExceeded(false));
    } catch (error) {
      const domErr = error instanceof DOMException ? error : null;
      const isQuota =
        domErr?.name === "QuotaExceededError" ||
        domErr?.code === 22 ||
        domErr?.code === 1014;
      if (isQuota) {
        queueMicrotask(() => setStorageQuotaExceeded(true));
      } else {
        console.error("Memora: failed to save galleries", error);
      }
    }
  }, [demoGalleryCollection, hydrated, userGalleryCollection]);

  useEffect(() => {
    if (!hydrated) return;

    const supabase = createSupabaseBrowserClient();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      const nextUserGalleries = user
        ? await loadUserGalleriesFromSupabase(supabase, user.id).catch((error) => {
            console.error("Memora: failed to load persisted galleries", error);
            return [] as Gallery[];
          })
        : [];

      queueMicrotask(() => {
        setOnboarding(buildOnboardingStateFromUser(user));
        setUserGalleryCollection(nextUserGalleries);
      });
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [hydrated]);

  const value = useMemo<MemoraStore>(() => {
    const galleries = onboarding.isAuthenticated ? userGalleryCollection : demoGalleryCollection;
    const setActiveGalleries = onboarding.isAuthenticated
      ? setUserGalleryCollection
      : setDemoGalleryCollection;

    return {
      galleries,
      hydrated,
      storageQuotaExceeded,
      dismissStorageQuotaWarning: () => setStorageQuotaExceeded(false),
      onboarding,
      async createGallery(input) {
        const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
        if (
          onboarding.isAuthenticated &&
          selectedPlan &&
          galleries.length >= selectedPlan.galleryCount
        ) {
          throw new Error("Gallery limit reached for current membership plan.");
        }

        const timestamp = new Date().toISOString();
        const nextGalleryId =
          onboarding.isAuthenticated && typeof crypto !== "undefined"
            ? crypto.randomUUID()
            : createId("gallery");
        let persistedCover = input.coverImage;

        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to create a gallery.");
          }

          persistedCover = await uploadImageSourceIfNeeded(
            supabase,
            userId,
            input.coverImage,
            "galleries",
            nextGalleryId,
          );

          const { error } = await supabase.from("galleries").insert({
            id: nextGalleryId,
            user_id: userId,
            title: input.title,
            description: input.description || null,
            cover_image_path: persistedCover || null,
            location: input.locations.join(", ") || null,
            start_date: input.startDate || null,
            end_date: input.endDate || null,
            locations: input.locations,
            people: input.people,
            mood_tags: input.moodTags,
            privacy: input.privacy,
          });
          if (error) throw error;
        }

        const nextGallery: Gallery = {
          ...input,
          id: nextGalleryId,
          coverImage: persistedCover,
          createdAt: timestamp,
          updatedAt: timestamp,
          subgalleries: [],
        };
        setActiveGalleries((current) => [nextGallery, ...current]);
        return nextGallery.id;
      },
      async updateGallery(galleryId, input) {
        let persistedCover = input.coverImage;
        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to update this gallery.");
          }

          persistedCover = await uploadImageSourceIfNeeded(
            supabase,
            userId,
            input.coverImage,
            "galleries",
            galleryId,
          );
          const { error } = await supabase
            .from("galleries")
            .update({
              title: input.title,
              description: input.description || null,
              cover_image_path: persistedCover || null,
              location: input.locations.join(", ") || null,
              start_date: input.startDate || null,
              end_date: input.endDate || null,
              locations: input.locations,
              people: input.people,
              mood_tags: input.moodTags,
              privacy: input.privacy,
              updated_at: new Date().toISOString(),
            })
            .eq("id", galleryId)
            .eq("user_id", userId);
          if (error) throw error;
        }

        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? { ...gallery, ...input, coverImage: persistedCover, updatedAt: new Date().toISOString() }
              : gallery,
          ),
        );
      },
      async deleteGallery(galleryId) {
        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to delete this gallery.");
          }
          const { error } = await supabase
            .from("galleries")
            .delete()
            .eq("id", galleryId)
            .eq("user_id", userId);
          if (error) throw error;
        }
        setActiveGalleries((current) => current.filter((gallery) => gallery.id !== galleryId));
      },
      async createSubgallery(galleryId, input) {
        const timestamp = new Date().toISOString();
        const subgalleryId =
          onboarding.isAuthenticated && typeof crypto !== "undefined"
            ? crypto.randomUUID()
            : createId("subgallery");
        let persistedCover = input.coverImage;
        let persistedPhotos = sortPhotos(
          input.photos.map((photo, index) => ({
            ...photo,
            subgalleryId,
            order: index,
          })),
        );

        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to create a subgallery.");
          }

          persistedCover = await uploadImageSourceIfNeeded(
            supabase,
            userId,
            input.coverImage,
            "subgalleries",
            subgalleryId,
          );

          persistedPhotos = await Promise.all(
            persistedPhotos.map(async (photo, index) => {
              const photoId = photo.id || (typeof crypto !== "undefined" ? crypto.randomUUID() : createId("photo"));
              const persistedSrc = await uploadImageSourceIfNeeded(
                supabase,
                userId,
                photo.src,
                "photos",
                photoId,
              );
              return {
                ...photo,
                id: photoId,
                src: persistedSrc,
                order: index,
              };
            }),
          );

          const range = parseDateLabelToRange(input.dateLabel);

          const { error: subgalleryError } = await supabase.from("subgalleries").insert({
            id: subgalleryId,
            gallery_id: galleryId,
            user_id: userId,
            title: input.title,
            description: input.description || null,
            cover_image_path: persistedCover || null,
            location: input.location || null,
            start_date: range.startDate,
            end_date: range.endDate,
            date_label: input.dateLabel || null,
            display_order: galleries
              .find((gallery) => gallery.id === galleryId)
              ?.subgalleries.length ?? 0,
          });
          if (subgalleryError) throw subgalleryError;

          if (persistedPhotos.length) {
            const { error: photosError } = await supabase.from("photos").insert(
              persistedPhotos.map((photo, index) => ({
                id: photo.id,
                user_id: userId,
                gallery_id: galleryId,
                subgallery_id: subgalleryId,
                storage_path: photo.src,
                caption: photo.caption || null,
                display_order: index,
                taken_at: null,
              })),
            );
            if (photosError) throw photosError;
          }
        }

        const nextSubgallery: Subgallery = {
          ...input,
          coverImage: persistedCover,
          photos: sortPhotos(
            persistedPhotos.map((photo) => ({
              ...photo,
              subgalleryId,
            })),
          ),
          id: subgalleryId,
          galleryId,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  updatedAt: timestamp,
                  subgalleries: [...gallery.subgalleries, nextSubgallery],
                }
              : gallery,
          ),
        );
        return nextSubgallery.id;
      },
      async updateSubgallery(galleryId, subgalleryId, input) {
        const timestamp = new Date().toISOString();
        let persistedCover = input.coverImage;
        let persistedPhotos = sortPhotos(
          input.photos.map((photo, index) => ({
            ...photo,
            subgalleryId,
            order: index,
          })),
        );

        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to update this subgallery.");
          }

          persistedCover = await uploadImageSourceIfNeeded(
            supabase,
            userId,
            input.coverImage,
            "subgalleries",
            subgalleryId,
          );
          persistedPhotos = await Promise.all(
            persistedPhotos.map(async (photo, index) => {
              const photoId = photo.id || (typeof crypto !== "undefined" ? crypto.randomUUID() : createId("photo"));
              const persistedSrc = await uploadImageSourceIfNeeded(
                supabase,
                userId,
                photo.src,
                "photos",
                photoId,
              );
              return {
                ...photo,
                id: photoId,
                src: persistedSrc,
                order: index,
              };
            }),
          );

          const range = parseDateLabelToRange(input.dateLabel);
          const { error: subgalleryError } = await supabase
            .from("subgalleries")
            .update({
              title: input.title,
              description: input.description || null,
              cover_image_path: persistedCover || null,
              location: input.location || null,
              start_date: range.startDate,
              end_date: range.endDate,
              date_label: input.dateLabel || null,
              updated_at: timestamp,
            })
            .eq("id", subgalleryId)
            .eq("gallery_id", galleryId)
            .eq("user_id", userId);
          if (subgalleryError) throw subgalleryError;

          const { error: deletePhotosError } = await supabase
            .from("photos")
            .delete()
            .eq("subgallery_id", subgalleryId)
            .eq("user_id", userId);
          if (deletePhotosError) throw deletePhotosError;

          if (persistedPhotos.length) {
            const { error: photosError } = await supabase.from("photos").insert(
              persistedPhotos.map((photo, index) => ({
                id: photo.id,
                user_id: userId,
                gallery_id: galleryId,
                subgallery_id: subgalleryId,
                storage_path: photo.src,
                caption: photo.caption || null,
                display_order: index,
                taken_at: null,
              })),
            );
            if (photosError) throw photosError;
          }
        }

        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  updatedAt: timestamp,
                  subgalleries: gallery.subgalleries.map((subgallery) =>
                    subgallery.id === subgalleryId
                      ? {
                          ...subgallery,
                          ...input,
                          coverImage: persistedCover,
                          photos: sortPhotos(
                            persistedPhotos.map((photo, index) => ({
                              ...photo,
                              subgalleryId,
                              order: index,
                            })),
                          ),
                          updatedAt: timestamp,
                        }
                      : subgallery,
                  ),
                }
              : gallery,
          ),
        );
      },
      async deleteSubgallery(galleryId, subgalleryId) {
        const timestamp = new Date().toISOString();
        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to delete this subgallery.");
          }
          const { error } = await supabase
            .from("subgalleries")
            .delete()
            .eq("id", subgalleryId)
            .eq("gallery_id", galleryId)
            .eq("user_id", userId);
          if (error) throw error;
        }
        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  updatedAt: timestamp,
                  subgalleries: gallery.subgalleries.filter(
                    (subgallery) => subgallery.id !== subgalleryId,
                  ),
                }
              : gallery,
          ),
        );
      },
      getGallery(galleryId) {
        return galleries.find((gallery) => gallery.id === galleryId);
      },
      getSubgallery(galleryId, subgalleryId) {
        const gallery = galleries.find((entry) => entry.id === galleryId);
        return gallery?.subgalleries.find((subgallery) => subgallery.id === subgalleryId);
      },
      resetDemo() {
        setStorageQuotaExceeded(false);
        setDemoGalleryCollection(demoGalleries);
      },
      signOut() {
        setOnboarding(defaultOnboardingState);
      },
      syncOnboardingFromUser(user) {
        setOnboarding(buildOnboardingStateFromUser(user));
      },
      async completeCheckout(planId) {
        const membershipState = {
          selectedPlanId: planId,
          onboardingComplete: true,
        } satisfies ReturnType<typeof readMembershipStateFromUser>;

        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.updateUser({
          data: buildMembershipMetadata(membershipState),
        });

        if (error) {
          throw error;
        }

        setOnboarding((current) => ({
          ...current,
          selectedPlanId: membershipState.selectedPlanId,
          onboardingComplete: membershipState.onboardingComplete,
        }));
      },
      resetOnboarding() {
        setOnboarding(defaultOnboardingState);
      },
      getNextOnboardingRoute() {
        if (!onboarding.isAuthenticated) {
          return "/auth";
        }
        return getNextAuthenticatedRoute({
          selectedPlanId: onboarding.selectedPlanId,
          onboardingComplete: onboarding.onboardingComplete,
        });
      },
    };
  }, [
    demoGalleryCollection,
    hydrated,
    onboarding,
    storageQuotaExceeded,
    userGalleryCollection,
  ]);

  return <MemoraContext.Provider value={value}>{children}</MemoraContext.Provider>;
}

export function useMemoraStore() {
  const context = useContext(MemoraContext);
  if (!context) {
    throw new Error("useMemoraStore must be used within a MemoraProvider");
  }
  return context;
}
