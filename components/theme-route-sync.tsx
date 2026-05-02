"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_THEME,
  applyThemeAttribute,
  isThemeId,
  pathUsesSavedTheme,
  readStoredTheme,
} from "@/lib/theme";

const SHARE_PATH_PREFIX = "/share";

function isSharePath(pathname: string): boolean {
  return pathname === SHARE_PATH_PREFIX || pathname.startsWith(`${SHARE_PATH_PREFIX}/`);
}

/**
 * Keeps the html `data-theme` attribute in sync with the current route on
 * client-side navigations. The inline init script in <head> handles the
 * very first paint, but App Router transitions don't re-run that script —
 * so without this component, navigating from /galleries (Dusk) to / (which
 * should be Harbor) would leave the marketing page in the user's saved
 * theme.
 *
 * Share routes are intentionally skipped: ShareThemeFrame inside the share
 * page applies the creator's chosen theme via useLayoutEffect, and it runs
 * before this hook in render order (children fire first), so we leave its
 * decision in place.
 */
export function ThemeRouteSync() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!pathname) return;
    if (isSharePath(pathname)) return;
    if (pathUsesSavedTheme(pathname)) {
      const stored = readStoredTheme();
      applyThemeAttribute(isThemeId(stored) ? stored : DEFAULT_THEME);
      return;
    }
    applyThemeAttribute(DEFAULT_THEME);
  }, [pathname]);

  return null;
}
