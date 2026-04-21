"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  applyThemeAttribute,
  isThemeId,
  type ThemeId,
  writeStoredTheme,
} from "@/lib/theme";

/**
 * useTheme — reactive access to the current archive theme.
 *
 * Why useSyncExternalStore?
 *   The source of truth is the `data-theme` attribute on <html>, set BEFORE
 *   React hydrates by the inline script in app/layout.tsx. A useEffect-based
 *   read would mean "first client render says Harbor, then a second render
 *   flips to the real theme," creating a visual snap on the Appearance picker.
 *   useSyncExternalStore reads synchronously during render, with a stable
 *   SSR snapshot (DEFAULT_THEME) that React uses during hydration to avoid
 *   mismatch warnings.
 *
 *   A MutationObserver lets other code paths (e.g. a future server-synced
 *   preference loader) change `data-theme` and have the picker update.
 */

function subscribe(callback: () => void) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const current = document.documentElement.getAttribute("data-theme");
  return isThemeId(current) ? current : DEFAULT_THEME;
}

function getServerSnapshot(): ThemeId {
  return DEFAULT_THEME;
}

/** Idiomatic mount sentinel — false during SSR / hydration, true afterwards. */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useHasMounted();

  const setTheme = useCallback((next: ThemeId) => {
    applyThemeAttribute(next);
    writeStoredTheme(next);
    // The MutationObserver will pick up the attribute change and trigger
    // any subscribed consumers — no setState cascade needed here.
  }, []);

  return { theme, setTheme, hydrated };
}
