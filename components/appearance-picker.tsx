"use client";

import { Check } from "lucide-react";
import { THEMES, THEME_IDS } from "@/lib/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * Appearance picker — three curated tiles, exposed on the Settings page.
 *
 * Intentional constraints:
 *  - No "preview on hover" that mutates :root. The swatch on each tile IS
 *    the preview; mutating root on hover flashes the whole app, which
 *    undermines the quiet feel we're selling.
 *  - Not a radio input under the hood. `aria-pressed` + `role="group"`
 *    keeps it keyboard- and screen-reader-accessible without the visual
 *    baggage of a real radio control.
 *  - Until the `useTheme` hook hydrates, we render with no tile marked
 *    active — this avoids a brief server-vs-client mismatch flicker on
 *    the selected-state border. The pre-paint script still ensures the
 *    rest of the app is correctly themed during that moment.
 */
export function AppearancePicker() {
  const { theme, setTheme, hydrated } = useTheme();

  return (
    <div
      role="group"
      aria-label="Archive theme"
      className="grid gap-3 sm:grid-cols-3"
    >
      {THEME_IDS.map((id) => {
        const def = THEMES[id];
        const isActive = hydrated && theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            aria-pressed={isActive}
            aria-label={`Set theme to ${def.name}`}
            className={`group relative flex flex-col gap-3 border bg-[color:var(--background)] p-4 text-left transition ${
              isActive
                ? "border-[color:var(--ink)] shadow-[0_6px_18px_rgba(14,22,34,0.08)]"
                : "border-[color:var(--border-strong)] hover:border-[color:var(--ink-soft)]"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-serif text-[19px] leading-tight text-[color:var(--ink)]">
                {def.name}
              </p>
              {/* Reserve a consistent footprint so the name doesn't shift when
                  the check appears. Invisible placeholder when inactive. */}
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 shrink-0 items-center justify-center transition ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              >
                <Check className="h-4 w-4 text-[color:var(--ink)]" strokeWidth={2} />
              </span>
            </div>
            <p className="min-h-[2.5rem] text-[12.5px] leading-5 text-[color:var(--ink-soft)]">
              {def.description}
            </p>
            <div
              aria-hidden="true"
              className="flex h-5 w-full overflow-hidden border border-[color:var(--border)]"
            >
              {def.swatch.map((color) => (
                <div
                  key={color}
                  className="flex-1"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
