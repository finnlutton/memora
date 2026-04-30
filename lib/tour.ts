/**
 * First-run guided product tour. Seven anchored steps that walk a new
 * user through Galleries → Clipboard → Memory Map → Settings, with an
 * animated cursor demonstrating the navigation between sections.
 *
 * Storage:
 *  - memora::tour-state:v2 holds { seen, lastIndex } as JSON. Bumped
 *    from v1 to invalidate the legacy boolean key from the old tour.
 *  - lastIndex lets a hard reload mid-tour resume on the same step
 *    instead of restarting (the tour itself is short, but the route
 *    push that follows nav clicks would otherwise feel jarring).
 *
 * Step shape:
 *  - route: where the tour navigates before showing this step.
 *  - navTo: optional `data-tour-nav` token of the sidebar/topbar nav
 *    item the animated cursor should drift to and "click" before this
 *    step's route push runs. Set on steps that change pages — the
 *    cursor is what makes the cross-page transitions feel intentional.
 *  - anchor: CSS selector of the page element to halo and caption.
 *    Optional. When absent the caption appears centered.
 *  - anchorSide: which side of the anchor the caption sits on.
 *  - title / body: editorial caption copy.
 */

export const TOUR_STORAGE_KEY = "memora::tour-state:v2";

export type TourSide = "top" | "bottom" | "left" | "right";

export type TourStep = {
  route: string;
  navTo?: "galleries" | "clipboard" | "map" | "settings";
  title: string;
  body: string;
  anchor?: string;
  anchorSide?: TourSide;
};

export const TOUR_STEPS: TourStep[] = [
  {
    route: "/galleries",
    title: "Welcome to your archive.",
    body: "This is where your galleries live — a private home for trips, seasons, and the chapters you want to keep. Let me show you around.",
    anchor: "[data-tour-id='galleries-title']",
    anchorSide: "bottom",
  },
  {
    route: "/galleries",
    title: "Begin a new gallery.",
    body: "Each gallery is one chapter — a trip, a season, a stretch of life. Press here whenever you're ready to start one.",
    anchor: "[data-tour-id='gallery-create']",
    anchorSide: "left",
  },
  {
    route: "/galleries",
    title: "Share with someone you love.",
    body: "Generate a private link in seconds. Pick the galleries, choose who they go to, and Memora delivers them safely.",
    anchor: "[data-tour-id='gallery-share']",
    anchorSide: "left",
  },
  {
    route: "/galleries/clipboard",
    navTo: "clipboard",
    title: "Catch the moments in between.",
    body: "Drop quick thoughts and photos here without organizing anything. Memora stamps each one with the date so you can find it again later.",
    anchor: "[data-tour-id='clipboard-prompt']",
    anchorSide: "right",
  },
  {
    route: "/galleries/map",
    navTo: "map",
    title: "Your travels, plotted.",
    body: "Every gallery with a location appears here. Drag to spin, scroll to zoom, tap a pin to revisit a place.",
    anchor: "[data-tour-id='globe']",
    anchorSide: "left",
  },
  {
    route: "/galleries/map",
    title: "Travel by year, or by season.",
    body: "Narrow the map to a single year or a custom date range — useful for revisiting one trip, one chapter, one summer.",
    anchor: "[data-tour-id='map-date-filter']",
    anchorSide: "bottom",
  },
  {
    route: "/galleries/settings",
    navTo: "settings",
    title: "Make Memora yours.",
    body: "Three quiet palettes — Harbor, Grove, and Dusk — to dress your archive. Membership and account settings live here too.",
    anchor: "[data-tour-id='settings-appearance']",
    anchorSide: "bottom",
  },
];

export type TourState = {
  seen: boolean;
  lastIndex: number;
};

const DEFAULT_STATE: TourState = { seen: false, lastIndex: 0 };

export function readTourState(): TourState {
  if (typeof window === "undefined") return { seen: true, lastIndex: 0 };
  try {
    const raw = window.localStorage.getItem(TOUR_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<TourState>;
    return {
      seen: Boolean(parsed.seen),
      lastIndex:
        typeof parsed.lastIndex === "number" &&
        parsed.lastIndex >= 0 &&
        parsed.lastIndex < TOUR_STEPS.length
          ? parsed.lastIndex
          : 0,
    };
  } catch {
    return { seen: true, lastIndex: 0 };
  }
}

function writeTourState(state: TourState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore — storage may be full or unavailable
  }
}

export function markTourSeen() {
  writeTourState({ seen: true, lastIndex: 0 });
}

export function setTourProgress(lastIndex: number) {
  writeTourState({ seen: false, lastIndex });
}

/**
 * Replay entry — clears the seen flag and resets to step 0. Caller is
 * responsible for any UI/route reset (e.g. push to /galleries).
 */
export function resetTourForReplay() {
  writeTourState({ seen: false, lastIndex: 0 });
  // Clean up legacy v1 keys so a future v2 read can't be polluted by
  // a stray "seen" boolean from the old tour.
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("memora::tour-seen:v1");
      window.localStorage.removeItem("memora::tour-progress:v1");
    } catch {
      // ignore
    }
  }
}

/** Used by the replay button so the tour mounts fresh on the same nav. */
export const TOUR_REPLAY_EVENT = "memora:tour:replay";

export function dispatchTourReplay() {
  if (typeof window === "undefined") return;
  resetTourForReplay();
  window.dispatchEvent(new CustomEvent(TOUR_REPLAY_EVENT));
}
