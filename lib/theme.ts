/**
 * Memora theme system — three curated palettes, hue-only variation.
 *
 * Scope discipline:
 *  - Only three themes. This is not a theme engine; do not expose custom palettes.
 *  - Photographs, the globe atmosphere, the logo, and error/destructive states
 *    are intentionally NOT themed (see app/globals.css comment).
 *  - Setting is logged-in only; surfaced at /galleries/settings under Appearance.
 *
 * First-paint rule:
 *  - The inline script in app/layout.tsx reads THEME_STORAGE_KEY synchronously
 *    and writes data-theme on <html> BEFORE React hydrates, avoiding any flash
 *    of the default theme for Grove/Dusk users. Do not replace that script
 *    with a useEffect — it would reintroduce the flash.
 */

export const THEME_IDS = ["harbor", "grove", "dusk"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "harbor";

/** Versioned localStorage key — bump suffix if the palette shape ever changes. */
export const THEME_STORAGE_KEY = "memora::theme:v1";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  /**
   * Five-stop swatch for the Appearance picker tile preview.
   * Ordered: background → paper → paper-strong → accent → ink.
   * Hardcoded so the picker renders its preview WITHOUT mutating :root
   * (which would flash the whole app on hover).
   */
  swatch: [string, string, string, string, string];
};

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  harbor: {
    id: "harbor",
    name: "Harbor",
    description: "The default. A quiet mellow blue, like morning water.",
    swatch: ["#f5f8fc", "#eef3f8", "#dbe5f0", "#587090", "#0f1823"],
  },
  grove: {
    id: "grove",
    name: "Grove",
    description: "A soft sage. Reads like a gardener's journal.",
    swatch: ["#f4f7f1", "#edf1e8", "#dde4d3", "#6a7b5d", "#141a15"],
  },
  dusk: {
    id: "dusk",
    name: "Dusk",
    description: "A warm off-white — the last hour of sun.",
    swatch: ["#faf4f2", "#f4ebe8", "#e8d8d3", "#8a6a6f", "#1d1517"],
  },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export function readStoredTheme(): ThemeId | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : null;
  } catch {
    // localStorage can throw in private-mode Safari etc. — fall back to default.
    return null;
  }
}

export function writeStoredTheme(id: ThemeId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Ignore quota / availability issues — theme attribute still applied.
  }
}

export function applyThemeAttribute(id: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", id);
}

/**
 * Exact script body the root layout injects in <head> to set data-theme
 * before first paint. Kept in a string so the shape (keys, fallback) is
 * defined in ONE place and can't drift from the runtime constants above.
 *
 * Intentionally self-contained ES5 — runs before any bundle loads.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='harbor'&&t!=='grove'&&t!=='dusk'){t='${DEFAULT_THEME}';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;
