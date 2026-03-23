"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { demoGalleries } from "@/lib/demo-data";
import { getMembershipPlan } from "@/lib/plans";
import { createId } from "@/lib/utils";
import type { Gallery, GalleryInput, Subgallery, SubgalleryInput } from "@/types/memora";

const STORAGE_KEY = "memora::galleries:v1";
const ONBOARDING_KEY = "memora::onboarding:v1";

type OnboardingState = {
  isAuthenticated: boolean;
  selectedPlanId: "focus" | "regular" | "archive" | null;
  onboardingComplete: boolean;
  user: {
    email: string;
  } | null;
};

type MemoraStore = {
  galleries: Gallery[];
  hydrated: boolean;
  onboarding: OnboardingState;
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
  signIn: (email: string) => void;
  signOut: () => void;
  selectPlan: (planId: "focus" | "regular" | "archive") => void;
  completeCheckout: () => void;
  resetOnboarding: () => void;
  getNextOnboardingRoute: () => string;
};

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

function loadStoredGalleries() {
  if (typeof window === "undefined") {
    return demoGalleries;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return demoGalleries;
  }

  try {
    return JSON.parse(storedValue) as Gallery[];
  } catch {
    return demoGalleries;
  }
}

function loadStoredOnboarding() {
  if (typeof window === "undefined") {
    return defaultOnboardingState;
  }

  const storedValue = window.localStorage.getItem(ONBOARDING_KEY);
  if (!storedValue) {
    return defaultOnboardingState;
  }

  try {
    return JSON.parse(storedValue) as OnboardingState;
  } catch {
    return defaultOnboardingState;
  }
}

export function MemoraProvider({ children }: { children: React.ReactNode }) {
  const [galleries, setGalleries] = useState<Gallery[]>(loadStoredGalleries);
  const [onboarding, setOnboarding] = useState<OnboardingState>(loadStoredOnboarding);
  const [hydrated] = useState(true);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(galleries));
  }, [galleries, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboarding));
  }, [hydrated, onboarding]);

  const value = useMemo<MemoraStore>(() => {
    return {
      galleries,
      hydrated,
      onboarding,
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
      signIn(email) {
        setOnboarding((current) => ({
          ...current,
          isAuthenticated: true,
          user: { email },
        }));
      },
      signOut() {
        setOnboarding(defaultOnboardingState);
      },
      selectPlan(planId) {
        setOnboarding((current) => ({
          ...current,
          selectedPlanId: planId,
          onboardingComplete: false,
        }));
      },
      completeCheckout() {
        setOnboarding((current) => ({
          ...current,
          onboardingComplete: true,
        }));
      },
      resetOnboarding() {
        setOnboarding(defaultOnboardingState);
      },
      getNextOnboardingRoute() {
        if (!onboarding.isAuthenticated) {
          return "/auth";
        }
        if (!onboarding.selectedPlanId || !getMembershipPlan(onboarding.selectedPlanId)) {
          return "/pricing";
        }
        if (!onboarding.onboardingComplete) {
          return "/checkout";
        }
        return "/galleries/new";
      },
    };
  }, [galleries, hydrated, onboarding]);

  return <MemoraContext.Provider value={value}>{children}</MemoraContext.Provider>;
}

export function useMemoraStore() {
  const context = useContext(MemoraContext);
  if (!context) {
    throw new Error("useMemoraStore must be used within a MemoraProvider");
  }
  return context;
}
