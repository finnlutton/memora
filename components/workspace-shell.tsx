"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, Menu, PanelLeft, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
// Mobile gives the page the full viewport width — no permanent rail.
// Nav lives behind a small floating hamburger that opens a drawer
// overlay on tap.
const MOBILE_DRAWER_WIDTH = 232;

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DURATION_MS = 320;

export function WorkspaceShell({ children, onSignOut, email: _email = "" }: WorkspaceShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Auto-close the mobile drawer whenever the route changes — otherwise it
  // stays pinned over the new page after a nav tap.
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // While the drawer is open, lock body scroll so swipes don't drag the
  // page underneath.
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileDrawerOpen]);

  // The mobile tour choreography needs to demonstrate "tap the hamburger,
  // then tap a nav tab" for cross-page steps. We expose a window event
  // here so the tour component can ask us to open the drawer without
  // lifting state into a context. The matching pathname-change effect
  // above closes the drawer once routing completes.
  useEffect(() => {
    const handler = () => setMobileDrawerOpen(true);
    window.addEventListener("memora:tour:open-mobile-drawer", handler);
    return () =>
      window.removeEventListener("memora:tour:open-mobile-drawer", handler);
  }, []);

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
      root.style.setProperty("--workspace-chrome-top", "0px");
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
    { href: "/galleries/help", label: "Feedback", icon: HelpIcon, tourNav: undefined },
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
        {/* Mobile-only floating hamburger — opens the nav drawer overlay.
            Sits over the page so the content can use the full viewport
            width without a permanent rail eating into it. md:hidden so
            desktop is untouched. */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileDrawerOpen}
          data-tour-id="mobile-menu-trigger"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
          className="fixed left-3 z-30 flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--chrome)] text-[color:var(--ink-soft)] shadow-[0_2px_8px_rgba(10,20,35,0.06)] backdrop-blur transition-colors hover:bg-[color:var(--hover-tint)] hover:text-[color:var(--ink)] md:hidden"
        >
          <Menu className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </button>
        <main className="mx-auto w-full max-w-[1520px] px-5 pt-14 pb-8 md:px-10 md:py-10">{children}</main>
      </div>

      {/* Mobile drawer overlay — slides in from the left when the rail's
          menu toggle is tapped. Keeps the same nav items as the rail, just
          with labels visible. md:hidden so it never paints on desktop. */}
      {mobileDrawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside
            style={{ width: `${MOBILE_DRAWER_WIDTH}px` }}
            className="absolute inset-y-0 left-0 flex h-full flex-col border-r border-[color:var(--border)] bg-[color:var(--chrome)] pt-3 pb-3 shadow-[0_0_40px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          >
            <div className="flex h-10 items-center px-2">
              <Link
                href="/galleries"
                className="block min-w-0 flex-1 overflow-hidden"
                aria-label="Memora dashboard"
                onClick={() => setMobileDrawerOpen(false)}
              >
                <Image
                  src={memoraLogo}
                  alt="Memora"
                  width={360}
                  height={82}
                  className="h-auto max-w-[150px] object-contain object-left"
                />
              </Link>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[color:var(--ink-soft)] transition-colors hover:bg-[color:var(--hover-tint)] hover:text-[color:var(--ink)]"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </button>
            </div>
            <nav className="mt-5 flex flex-col gap-0.5 px-2">
              {navItems.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileDrawerOpen(false)}
                    data-tour-nav-mobile={item.tourNav}
                    className={cn(
                      "group relative flex h-10 items-center gap-3 rounded-md pr-2 text-[13px] transition-colors",
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
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto px-2 pt-2">
              <div className="mb-2 h-px bg-[color:var(--border)]" aria-hidden="true" />
              {utilityItems.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileDrawerOpen(false)}
                    data-tour-nav-mobile={item.tourNav}
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
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onSignOut();
                }}
                className="flex h-10 w-full items-center gap-3 rounded-md pr-2 text-left text-[13px] text-[color:var(--ink-soft)] transition-colors hover:bg-[rgba(200,130,130,0.1)] hover:text-[color:var(--error-text)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span className="min-w-0 truncate">Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      ) : null}
      <MemoraTour />
    </div>
  );
}
