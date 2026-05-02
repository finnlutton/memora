"use client";

import { useLayoutEffect } from "react";
import { applyThemeAttribute, type ThemeId } from "@/lib/theme";

/**
 * Re-applies the share's theme to <html> on client-side navigations
 * between share routes. The inline <script> in ShareThemeFrame handles
 * the initial HTML parse; this hook handles every subsequent render.
 */
export function ShareThemeApply({ theme }: { theme: ThemeId }) {
  useLayoutEffect(() => {
    applyThemeAttribute(theme);
  }, [theme]);
  return null;
}
