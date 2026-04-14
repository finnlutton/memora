"use client";

import Image from "next/image";
import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { GlobeIcon } from "@/components/icons/GlobeIcon";
import { HelpIcon } from "@/components/icons/HelpIcon";
import { MyGalleriesIcon } from "@/components/icons/MyGalleriesIcon";
import { SettingsIcon } from "@/components/icons/SettingsIcon";
import { cn } from "@/lib/utils";
import memoraLogo from "../Logo/MemoraLogo.png";

type WorkspaceShellProps = {
  children: React.ReactNode;
  email?: string;
};

const SIDEBAR_STORAGE_KEY = "memora::workspace-sidebar-collapsed:v1";

export function WorkspaceShell({ children, email = "" }: WorkspaceShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  });

  const navItems = useMemo(
    () => [
      { href: "/galleries", label: "My Galleries", icon: MyGalleriesIcon, iconClassName: "h-[18px] w-[18px]" },
      { href: "/galleries/map", label: "Memory Map", icon: GlobeIcon, iconClassName: "h-[20px] w-[20px]" },
      { href: "/galleries/help", label: "Help", icon: HelpIcon, iconClassName: "h-[18px] w-[18px]" },
      { href: "/galleries/settings", label: "Settings", icon: SettingsIcon, iconClassName: "h-[18px] w-[18px]" },
    ],
    [],
  );

  return (
    <div className="flex min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-[rgba(28,46,72,0.08)] bg-[rgba(248,251,255,0.9)] py-4 backdrop-blur-xl transition-[width,padding] duration-300 md:flex md:flex-col",
          collapsed ? "w-[39px] px-1" : "w-[167px] px-3",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-1",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          <Link href="/galleries" className="block min-w-0">
            <Image
              src={memoraLogo}
              alt="Memora"
              width={360}
              height={82}
              className={cn(
                "h-auto object-contain object-left transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "w-[145px] opacity-100",
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
            className="inline-flex h-8 w-8 items-center justify-center text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-7 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const active =
              item.href === "/galleries"
                ? pathname === "/galleries"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 text-[13px] text-[color:var(--ink-soft)] transition",
                  collapsed
                    ? "mx-auto w-8 justify-center rounded-lg px-0 py-2"
                    : "rounded-xl px-2.5 py-2.5",
                  active ? "bg-[rgba(131,164,201,0.14)] text-[color:var(--ink)]" : "hover:bg-white/70",
                )}
              >
                <span className={cn("inline-flex shrink-0 justify-center", collapsed ? "w-auto" : "w-5")}>
                  <Icon className={cn("shrink-0", item.iconClassName)} />
                </span>
                {!collapsed ? <span className="truncate transition-opacity opacity-100">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-[rgba(28,46,72,0.08)] pt-4">
          {!collapsed ? (
            <p className="truncate px-2 text-[11px] text-[color:var(--ink-faint)]">
              {email || "Signed in"}
            </p>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="border-b border-[rgba(28,46,72,0.08)] bg-[rgba(248,251,255,0.9)] px-4 py-2.5 backdrop-blur-xl md:hidden">
          <div className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const active =
                item.href === "/galleries"
                  ? pathname === "/galleries"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] transition",
                    active
                      ? "bg-[rgba(131,164,201,0.2)] text-[color:var(--ink)]"
                      : "text-[color:var(--ink-soft)] hover:bg-white/80",
                  )}
                >
                  <Icon className={cn("shrink-0", item.iconClassName)} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <main className="mx-auto w-full max-w-[1220px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

