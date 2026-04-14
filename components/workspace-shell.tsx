"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, FolderKanban, PanelLeft, Settings2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { GlobeIcon } from "@/components/icons/GlobeIcon";
import { cn } from "@/lib/utils";
import memoraLogo from "../Logo/MemoraLogo.png";

type WorkspaceShellProps = {
  children: React.ReactNode;
  onSignOut: () => void;
  email?: string;
};

const SIDEBAR_STORAGE_KEY = "memora::workspace-sidebar-collapsed:v1";

export function WorkspaceShell({ children, onSignOut, email = "" }: WorkspaceShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setCollapsed(value === "1");
  }, []);

  const navItems = useMemo(
    () => [
      { href: "/galleries", label: "My Galleries", icon: FolderKanban, iconClassName: "h-[18px] w-[18px]" },
      { href: "/galleries/map", label: "Memory Map", icon: GlobeIcon, iconClassName: "h-[20px] w-[20px]" },
    ],
    [],
  );

  return (
    <div className="flex min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-[rgba(28,46,72,0.08)] bg-[rgba(248,251,255,0.9)] px-3 py-4 backdrop-blur-xl transition-[width] duration-300 md:flex md:flex-col",
          collapsed ? "w-[78px]" : "w-[196px]",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <Link href="/galleries" className="block min-w-0">
            <Image
              src={memoraLogo}
              alt="Memora"
              width={360}
              height={82}
              className={cn(
                "h-auto object-contain object-left transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "w-[138px] opacity-100",
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[rgba(28,46,72,0.12)] bg-white/80 text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
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
                  "group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] text-[color:var(--ink-soft)] transition",
                  active ? "bg-[rgba(131,164,201,0.14)] text-[color:var(--ink)]" : "hover:bg-white/70",
                )}
              >
                <span className="inline-flex w-5 shrink-0 justify-center">
                  <Icon className={cn("shrink-0", item.iconClassName)} />
                </span>
                <span className={cn("truncate transition-opacity", collapsed ? "opacity-0" : "opacity-100")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => {
              if (collapsed) {
                setCollapsed(false);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, "0");
                }
                setSettingsOpen(true);
                return;
              }
              setSettingsOpen((current) => !current);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-[13px] text-[color:var(--ink-soft)] transition hover:bg-white/70",
              settingsOpen ? "bg-[rgba(131,164,201,0.14)] text-[color:var(--ink)]" : "",
            )}
          >
            <Settings2 className="h-[18px] w-[18px] shrink-0" />
            <span className={cn("truncate transition-opacity", collapsed ? "opacity-0" : "opacity-100")}>
              Settings
            </span>
            {!collapsed ? (
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 transition-transform",
                  settingsOpen ? "rotate-180" : "rotate-0",
                )}
              />
            ) : null}
          </button>

          {!collapsed && settingsOpen ? (
            <div className="ml-8 mt-1 space-y-1.5 border-l border-[rgba(28,46,72,0.1)] pl-3">
              <button
                type="button"
                onClick={() => setAccountOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[12px] text-[color:var(--ink-soft)] transition hover:bg-white/70"
              >
                <span>Account info</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", accountOpen ? "rotate-180" : "")} />
              </button>
              {accountOpen ? (
                <p className="rounded-lg bg-white/70 px-2 py-1.5 text-[12px] text-[color:var(--ink)]">
                  {email || "No email found"}
                </p>
              ) : null}

              <Link
                href="/pricing"
                className="block rounded-lg px-2 py-1.5 text-[12px] text-[color:var(--ink-soft)] transition hover:bg-white/70"
              >
                Upgrade membership
              </Link>

              <button
                type="button"
                onClick={onSignOut}
                className="block w-full rounded-lg px-2 py-1.5 text-left text-[12px] text-[#8f4848] transition hover:bg-[#fff1f1]"
              >
                Sign out
              </button>

              <DeleteAccountDialog
                triggerLabel="Delete account"
                triggerClassName="mt-0 w-full rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-[12px] tracking-normal text-[#8f4848] hover:bg-[#fff1f1]"
              />
            </div>
          ) : null}
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
            <button
              type="button"
              onClick={() => setMobileSettingsOpen((current) => !current)}
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] transition",
                mobileSettingsOpen
                  ? "bg-[rgba(131,164,201,0.2)] text-[color:var(--ink)]"
                  : "text-[color:var(--ink-soft)] hover:bg-white/80",
              )}
            >
              <Settings2 className="h-[16px] w-[16px] shrink-0" />
              <span>Settings</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", mobileSettingsOpen ? "rotate-180" : "")} />
            </button>
          </div>

          {mobileSettingsOpen ? (
            <div className="mt-2 space-y-1.5 border-t border-[rgba(28,46,72,0.08)] pt-2.5">
              <button
                type="button"
                onClick={() => setMobileAccountOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] text-[color:var(--ink-soft)] transition hover:bg-white/80"
              >
                <span>Account info</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", mobileAccountOpen ? "rotate-180" : "")} />
              </button>
              {mobileAccountOpen ? (
                <p className="rounded-lg bg-white/75 px-2.5 py-2 text-[12px] text-[color:var(--ink)]">
                  {email || "No email found"}
                </p>
              ) : null}
              <Link
                href="/pricing"
                className="block rounded-lg px-2.5 py-2 text-[12px] text-[color:var(--ink-soft)] transition hover:bg-white/80"
              >
                Upgrade membership
              </Link>
              <button
                type="button"
                onClick={onSignOut}
                className="block w-full rounded-lg px-2.5 py-2 text-left text-[12px] text-[#8f4848] transition hover:bg-[#fff1f1]"
              >
                Sign out
              </button>
              <DeleteAccountDialog
                triggerLabel="Delete account"
                triggerClassName="mt-0 w-full rounded-lg border-0 bg-transparent px-2.5 py-2 text-left text-[12px] tracking-normal text-[#8f4848] hover:bg-[#fff1f1]"
              />
            </div>
          ) : null}
        </div>
        <main className="mx-auto w-full max-w-[1220px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

