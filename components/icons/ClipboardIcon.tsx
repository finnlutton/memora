import type { SVGProps } from "react";

/**
 * Clipboard nav icon.
 *
 * A small notepad outline with a tick of corner curl — reads as
 * "loose page" rather than the literal clipboard binder, matching
 * the soft journaling tone of the surface.
 */
export function ClipboardIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 4.5h10.5a1.5 1.5 0 0 1 1.5 1.5v3.75M5.25 4.5a1.5 1.5 0 0 0-1.5 1.5v13.5a1.5 1.5 0 0 0 1.5 1.5h6.75M5.25 4.5V3.75M17.25 9.75l3 3M14.25 18.75l3-3M14.25 18.75v.75A1.5 1.5 0 0 0 15.75 21h3.75a1.5 1.5 0 0 0 1.5-1.5v-3.75M14.25 18.75 17.25 9.75M8.25 8.25h6M8.25 11.25h4"
      />
    </svg>
  );
}
