"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { demoGalleries } from "@/lib/demo-data";
import { createId } from "@/lib/utils";
import type { Gallery, GalleryInput, Subgallery, SubgalleryInput } from "@/types/memora";

const STORAGE_KEY = "memora::galleries:v1";

type MemoraStore = {
  galleries: Gallery[];
  hydrated: boolean;
  createGallery: (input: GalleryInput) => string;
  updateGallery: (galleryId: string, input: GalleryInput) => void;
  deleteGallery: (galleryId: string) => void;
  createSubgallery: (galleryId: string, input: SubgalleryInput) => string;
  updateSubgallery: (
    galleryId: string,
    subgalleryId: string,
    input: SubgalleryInput,
  ) => void;
  deleteSubgallery: (galleryId: string, subgalleryId: string) => void;
  getGallery: (galleryId: string) => Gallery | undefined;
  getSubgallery: (galleryId: string, subgalleryId: string) => Subgallery | undefined;
  resetDemo: () => void;
};

const MemoraContext = createContext<MemoraStore | null>(null);

function sortPhotos<T extends { order: number }>(photos: T[]) {
  return [...photos].sort((left, right) => left.order - right.order);
}

export function MemoraProvider({ children }: { children: React.ReactNode }) {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      setGalleries(demoGalleries);
      setHydrated(true);
      return;
    }

    try {
      setGalleries(JSON.parse(storedValue) as Gallery[]);
    } catch {
      setGalleries(demoGalleries);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(galleries));
  }, [galleries, hydrated]);

  const value = useMemo<MemoraStore>(() => {
    return {
      galleries,
      hydrated,
      createGallery(input) {
        const timestamp = new Date().toISOString();
        const nextGallery: Gallery = {
          ...input,
          id: createId("gallery"),
          createdAt: timestamp,
          updatedAt: timestamp,
          subgalleries: [],
        };
        setGalleries((current) => [nextGallery, ...current]);
        return nextGallery.id;
      },
      updateGallery(galleryId, input) {
        setGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? { ...gallery, ...input, updatedAt: new Date().toISOString() }
              : gallery,
          ),
        );
      },
      deleteGallery(galleryId) {
        setGalleries((current) => current.filter((gallery) => gallery.id !== galleryId));
      },
      createSubgallery(galleryId, input) {
        const timestamp = new Date().toISOString();
        const subgalleryId = createId("subgallery");
        const nextSubgallery: Subgallery = {
          ...input,
          photos: sortPhotos(
            input.photos.map((photo, index) => ({
              ...photo,
              subgalleryId,
              order: index,
            })),
          ),
          id: subgalleryId,
          galleryId,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        setGalleries((current) =>
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
      updateSubgallery(galleryId, subgalleryId, input) {
        const timestamp = new Date().toISOString();
        setGalleries((current) =>
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
                          photos: sortPhotos(
                            input.photos.map((photo, index) => ({
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
      deleteSubgallery(galleryId, subgalleryId) {
        const timestamp = new Date().toISOString();
        setGalleries((current) =>
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
        setGalleries(demoGalleries);
      },
    };
  }, [galleries, hydrated]);

  return <MemoraContext.Provider value={value}>{children}</MemoraContext.Provider>;
}

export function useMemoraStore() {
  const context = useContext(MemoraContext);
  if (!context) {
    throw new Error("useMemoraStore must be used within a MemoraProvider");
  }
  return context;
}
