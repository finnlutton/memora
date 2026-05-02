import type { ReactNode } from "react";
import { isThemeId, type ThemeId } from "@/lib/theme";
import { ShareThemeApply } from "./share-theme-apply";

/**
 * Forces the public share page to render in the creator's chosen theme,
 * regardless of the viewer's account theme stored in localStorage.
 *
 * This is a server component so the inline <script> goes out as raw HTML
 * (the same pattern app/layout.tsx uses for THEME_INIT_SCRIPT). That makes
 * the script execute synchronously during the browser's initial HTML
 * parse, before first paint — no flash of the wrong theme. Authoring this
 * component as "use client" instead would trigger React's
 * "Scripts inside React components are never executed when rendering on
 * the client" warning and skip execution on client navigations.
 *
 * For client-side transitions (App Router fetches a new RSC tree without
 * re-running the script), ShareThemeApply uses useLayoutEffect to set
 * data-theme on <html> from the React side. Both layers cover one half of
 * the navigation lifecycle.
 *
 * On unmount we deliberately do NOT restore the old theme — ThemeRouteSync
 * at the root will pick the correct theme for the next route.
 */
export function ShareThemeFrame({
  themeId,
  children,
}: {
  themeId: string | null | undefined;
  children: ReactNode;
}) {
  const theme: ThemeId = isThemeId(themeId) ? themeId : "harbor";
  // JSON.stringify guarantees the value is a properly-quoted string
  // literal, which keeps the script safe even if `theme` ever held an
  // unexpected value.
  const initScript = `document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: initScript }} />
      <ShareThemeApply theme={theme} />
      {children}
    </>
  );
}
