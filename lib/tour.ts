/**
 * First-run guided tour. Five-step walkthrough that fires once per user
 * (tracked in localStorage) covering Galleries → Clipboard → Memory Map →
 * Help → Settings. Existing users who never saw it get it on next login.
 *
 * The store is intentionally a single boolean key; we don't track partial
 * progress because the tour is short and any reload restarts it cleanly.
 */

export const TOUR_STORAGE_KEY = "memora::tour-seen:v1";
export const TOUR_PROGRESS_KEY = "memora::tour-progress:v1";

export type TourStep = {
  /** Route the tour navigates to before showing this step. */
  route: string;
  /** Big serif heading shown at the top of the popup. */
  title: string;
  /** Body copy. May contain a soft line break (\n). */
  body: string;
  /**
   * Optional CSS selector — when present the popup anchors next to that
   * element with a small connector. When absent the popup is centered.
   */
  anchor?: string;
  /** Side to place the popup relative to the anchor. */
  anchorSide?: "top" | "bottom" | "left" | "right";
};

export const TOUR_STEPS: TourStep[] = [
  {
    route: "/galleries",
    title: "Your gallery workspace",
    body: "This is where you create galleries, edit them, and share them with the people you love.",
  },
  {
    route: "/galleries/clipboard",
    title: "The clipboard",
    body: "A spot for moments and thoughts that don't need organization. Click anywhere to drop in a thought, a photo, or both. Memora stamps each one with the date and time so you can filter through them later.",
  },
  {
    route: "/galleries/map",
    title: "The memory map",
    body: "Your experiences plotted across the globe and across the years. Upload a gallery and watch it appear here.",
    anchor: "[data-tour-id='globe']",
    anchorSide: "left",
  },
  {
    route: "/galleries/map",
    title: "Filter by year or range",
    body: "Use this to narrow the map down to a single year or a custom date range — useful for revisiting a specific trip or season.",
    anchor: "[data-tour-id='map-date-filter']",
    anchorSide: "bottom",
  },
  {
    route: "/galleries/help",
    title: "Need a hand?",
    body: "Whatever issue comes up, email me directly here.",
  },
  {
    route: "/galleries/settings",
    title: "Settings & appearance",
    body: "Manage your account, switch between Harbor / Grove / Dusk palettes, and review your membership and storage in here.",
  },
];

export function readTourSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TOUR_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function writeTourSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
    window.localStorage.removeItem(TOUR_PROGRESS_KEY);
  } catch {
    // ignore
  }
}

export function readTourProgress(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(TOUR_PROGRESS_KEY);
    const n = raw == null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 && n < TOUR_STEPS.length ? n : 0;
  } catch {
    return 0;
  }
}

export function writeTourProgress(index: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOUR_PROGRESS_KEY, String(index));
  } catch {
    // ignore
  }
}
