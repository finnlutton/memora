"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, PanelLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MemoraTour } from "@/components/memora-tour";
import { ClipboardIcon } from "@/components/icons/ClipboardIcon";
import { GlobeIcon } from "@/components/icons/GlobeIcon";
import { HelpIcon } from "@/components/icons/HelpIcon";
import { MyGalleriesIcon } from "@/components/icons/MyGalleriesIcon";
import { SettingsIcon } from "@/components/icons/SettingsIcon";
import { cn } from "@/lib/utils";
import memoraLogo from "../Logo/MemoraLogo.png";

type WorkspaceShellProps = {
  children: React.ReactNode;
  onSignOut: () => void;
  email?: string;
};

const SIDEBAR_STORAGE_KEY = "memora::workspace-sidebar-collapsed:v1";

const SIDEBAR_WIDTH_EXPANDED = 208;
const SIDEBAR_WIDTH_COLLAPSED = 56;
const MOBILE_CHROME_HEIGHT = 48;

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DURATION_MS = 320;

export function WorkspaceShell({ children, onSignOut, email: _email = "" }: WorkspaceShellProps) {
  const pathname = usePathname();
  const mobileStripRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  });

  // Mobile nav strip is overflow-x-auto; on every route change it remounts
  // with scrollLeft=0 — so tapping Help or Settings (off-screen right) snaps
  // the strip back to Galleries. Auto-scroll the active item into view so
  // the strip self-orients on each navigation.
  useEffect(() => {
    const strip = mobileStripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    const target =
      active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: "auto" });
  }, [pathname]);

  // Publish shell dimensions to :root so full-bleed pages (e.g. Memory Map)
  // can align to the sidebar/top-chrome without duplicating layout math.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const mdUp = window.matchMedia("(min-width: 768px)").matches;
      root.style.setProperty(
        "--workspace-sidebar-width",
        mdUp ? `${collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED}px` : "0px",
      );
      root.style.setProperty(
        "--workspace-chrome-top",
        mdUp ? "0px" : `${MOBILE_CHROME_HEIGHT}px`,
      );
    };
    apply();
    const mql = window.matchMedia("(min-width: 768px)");
    mql.addEventListener("change", apply);
    return () => {
      mql.removeEventListener("change", apply);
      root.style.removeProperty("--workspace-sidebar-width");
      root.style.removeProperty("--workspace-chrome-top");
    };
  }, [collapsed]);

  const navItems = useMemo(
    () => [
      {
        href: "/galleries",
        label: "Galleries",
        icon: MyGalleriesIcon,
        tourNav: "galleries",
      },
      {
        href: "/galleries/clipboard",
        label: "Clipboard",
        icon: ClipboardIcon,
        tourNav: "clipboard",
      },
      {
        href: "/galleries/map",
        label: "Memory Map",
        icon: GlobeIcon,
        tourNav: "map",
      },
    ],
    [],
  );

  // Help and Settings are utilities, not primary destinations. They
  // live in the bottom block above Sign out so discoverability stays
  // intact without making them visually compete with the real
  // destinations above.
  const utilityItems = [
    { href: "/galleries/help", label: "Help", icon: HelpIcon, tourNav: undefined },
    {
      href: "/galleries/settings",
      label: "Account Info",
      icon: SettingsIcon,
      tourNav: "settings" as const,
    },
  ];

  const isItemActive = (href: string) => {
    // /galleries is exact-match so it doesn't claim every nested route.
    if (href === "/galleries") return pathname === "/galleries";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const transitionStyle = { transition: `width ${DURATION_MS}ms ${EASE}` };
  const labelTransitionStyle = { transition: `opacity ${DURATION_MS}ms ${EASE}, max-width ${DURATION_MS}ms ${EASE}` };

  return (
    <div className="flex min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <aside
        style={transitionStyle}
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-[color:var(--border)] bg-[color:var(--chrome)] pt-7 pb-3 backdrop-blur-xl md:flex md:flex-col",
        )}
        data-collapsed={collapsed ? "true" : "false"}
        aria-expanded={!collapsed}
      >
        <div
          style={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
          className="flex h-full flex-col"
        >
          {/* Top row — logo + toggle. Fixed row height prevents layout jump. */}
          <div className="flex h-10 items-center px-2">
            <Link
              href="/galleries"
              className="block min-w-0 flex-1 overflow-hidden"
              aria-label="Memora dashboard"
            >
              <Image
                src={memoraLogo}
                alt="Memora"
                width={360}
                height={82}
                style={labelTransitionStyle}
                className={cn(
                  "h-auto object-contain object-left",
                  collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100",
                )}
              />
            </Link>
            <button
              type="button"
              onClick={() =>
                setCollapsed((current) => {
                  const next = !current;
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
                  }
                  return next;
                })
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[color:var(--ink-soft)] transition-colors hover:bg-[color:var(--hover-tint)] hover:text-[color:var(--ink)]"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
          </div>

          {/* Primary nav */}
          <nav className="mt-5 flex flex-col gap-0.5 px-2">
            {navItems.map((item) => {
              const active = isItemActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  data-tour-nav={item.tourNav}
                  className={cn(
                    "group relative flex h-10 items-center gap-3 rounded-md pr-2 text-[13px] transition-colors",
                    active
                      ? "text-[color:var(--ink)]"
                      : "text-[color:var(--ink-soft)] hover:bg-[color:var(--hover-tint)] hover:text-[color:var(--ink)]",
                  )}
                >
                  {/* Active accent bar — 2px ink rule on the left */}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[color:var(--ink)]"
                    />
                  ) : null}
                  {/* Consistent icon slot — same geometry at both states */}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span
                    style={labelTransitionStyle}
                    className={cn(
                      "min-w-0 truncate",
                      collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto px-2 pt-2">
            <div className="mb-2 h-px bg-[color:var(--border)]" aria-hidden="true" />
            {/* Utility rows — Help, then Settings. Same shape as the
                primary nav items so the active state is still legible
                when the user is on either page. */}
            {utilityItems.map((item) => {
              const active = isItemActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  data-tour-nav={item.tourNav}
                  className={cn(
                    "group relative mb-1 flex h-10 items-center gap-3 rounded-md pr-2 text-[13px] transition-colors",
                    active
                      ? "text-[color:var(--ink)]"
                      : "text-[color:var(--ink-soft)] hover:bg-[color:var(--hover-tint)] hover:text-[color:var(--ink)]",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[color:var(--ink)]"
                    />
                  ) : null}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span
                    style={labelTransitionStyle}
                    className={cn(
                      "min-w-0 truncate",
                      collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={onSignOut}
              title={collapsed ? "Sign out" : undefined}
              className="flex h-10 w-full items-center gap-3 rounded-md pr-2 text-left text-[13px] text-[color:var(--ink-soft)] transition-colors hover:bg-[rgba(200,130,130,0.1)] hover:text-[color:var(--error-text)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span
                style={labelTransitionStyle}
                className={cn(
                  "min-w-0 truncate",
                  collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100",
                )}
              >
                Sign out
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile chrome — consistent height, rounded-md, matches desktop language.
            mask-image fades the right edge so users can see the strip is
            scrollable; the strip auto-scrolls the active item into view on
            route change (see useEffect above). */}
        <div
          ref={mobileStripRef}
          style={{
            height: `${MOBILE_CHROME_HEIGHT}px`,
            maskImage:
              "linear-gradient(to right, #000 0, #000 92%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, #000 0, #000 92%, transparent 100%)",
          }}
          className="flex items-center gap-1.5 overflow-x-auto border-b border-[color:var(--border)] bg-[color:var(--chrome)] px-3 backdrop-blur-xl md:hidden"
        >
          {/* Primary destinations + utility links (Help, Settings)
              appended at the end so they tag along with the strip
              without claiming primary slots. Sign out lives at the
              tail so it's reachable without leaving the page — the
              desktop sidebar's bottom-block button has no analog on
              mobile otherwise. */}
          {[...navItems, ...utilityItems].map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-tour-nav={item.tourNav}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
                  active
                    ? "bg-[color:var(--active-tint)] text-[color:var(--ink)]"
                    : "text-[color:var(--ink-soft)] hover:bg-[color:var(--hover-tint)] hover:text-[color:var(--ink)]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--ink-soft)] transition-colors hover:bg-[rgba(200,130,130,0.1)] hover:text-[color:var(--error-text)]"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">Sign out</span>
          </button>
        </div>
        <main className="mx-auto w-full max-w-[1520px] px-4 py-6 md:px-10 md:py-10">{children}</main>
      </div>
      <MemoraTour />
    </div>
  );
}
