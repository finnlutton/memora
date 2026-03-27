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
import type { Gallery, GalleryInput, Subgallery, SubgalleryInput } from "@/types/memora";

const LEGACY_STORAGE_KEY = "memora::galleries:v1";
const DEMO_STORAGE_KEY = "memora::demo-galleries:v1";
const USER_STORAGE_KEY = "memora::user-galleries:v1";
const LEGACY_ONBOARDING_KEY = "memora::onboarding:v1";

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
  signOut: () => void;
  syncOnboardingFromUser: (user: AuthUserLike) => void;
  completeCheckout: (planId: MembershipPlanId) => Promise<void>;
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

        queueMicrotask(() => {
          setDemoGalleryCollection(nextCollections.demo);
          setUserGalleryCollection(nextCollections.user);
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

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        setOnboarding(buildOnboardingStateFromUser(session?.user ?? null));
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
      createGallery(input) {
        const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
        if (
          onboarding.isAuthenticated &&
          selectedPlan &&
          galleries.length >= selectedPlan.galleryCount
        ) {
          throw new Error("Gallery limit reached for current membership plan.");
        }

        const timestamp = new Date().toISOString();
        const nextGallery: Gallery = {
          ...input,
          id: createId("gallery"),
          createdAt: timestamp,
          updatedAt: timestamp,
          subgalleries: [],
        };
        setActiveGalleries((current) => [nextGallery, ...current]);
        return nextGallery.id;
      },
      updateGallery(galleryId, input) {
        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? { ...gallery, ...input, updatedAt: new Date().toISOString() }
              : gallery,
          ),
        );
      },
      deleteGallery(galleryId) {
        setActiveGalleries((current) => current.filter((gallery) => gallery.id !== galleryId));
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
      updateSubgallery(galleryId, subgalleryId, input) {
        const timestamp = new Date().toISOString();
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
