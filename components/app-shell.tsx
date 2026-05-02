"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { getMembershipPlan, membershipPlans } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StorageCleanupDialog } from "@/components/storage-cleanup-dialog";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { WorkspaceShell } from "@/components/workspace-shell";
import memoraLogo from "../Logo/MemoraLogo.png";

export function AppShell({
  children,
  accent = "default",
  hideAboutLink = false,
}: {
  children: React.ReactNode;
  accent?: "default" | "immersive";
  /**
   * Hide the public "About Us" nav link. Used on pages that already have
   * their own back-to-home affordance (e.g. /pricing) so the header stays
   * uncluttered.
   */
  hideAboutLink?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isHomePage = pathname === "/";
  const isProductRoute = pathname.startsWith("/galleries") || pathname.startsWith("/welcome");
  // While the URL is still /auth, force the logged-out header even after the
  // store flips to authenticated. Otherwise the legacy "My Dashboard" link and
  // Settings dropdown flash for one render between sign-in success and the
  // hard navigation to /galleries or /welcome.
  const isAuthRoute = pathname.startsWith("/auth");
  const { onboarding, getNextOnboardingRoute, signOut } = useMemoraStore();
  const showAuthenticatedNav = onboarding.isAuthenticated && !isAuthRoute;
  const createHref = onboarding.isAuthenticated
    ? onboarding.onboardingComplete
      ? "/galleries/new"
      : getNextOnboardingRoute()
    : "/auth?mode=signup";
  const homeHref = onboarding.isAuthenticated
    ? onboarding.onboardingComplete
      ? "/galleries"
      : getNextOnboardingRoute()
    : "/";
  const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
  const handleSignOut = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Memora: sign out failed", error);
    } finally {
      signOut();
      router.replace("/");
      router.refresh();
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          if (window.location.pathname !== "/") {
            window.location.replace("/");
          }
        }, 150);
      }
    }
  };

  useEffect(() => {
    if (!isProductRoute || onboarding.isAuthenticated) {
      return;
    }

    router.replace("/");
  }, [isProductRoute, onboarding.isAuthenticated, router]);

  if (isProductRoute && !onboarding.isAuthenticated) {
    return null;
  }

  if (isProductRoute && onboarding.isAuthenticated) {
    return (
      <WorkspaceShell
        onSignOut={() => {
          void handleSignOut();
        }}
        email={onboarding.user?.email ?? ""}
      >
        {children}
      </WorkspaceShell>
    );
  }

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-x-hidden",
        accent === "immersive" &&
          "bg-[radial-gradient(circle_at_top_left,rgba(217,228,240,0.68),transparent_30%),var(--background)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[14rem] bg-[linear-gradient(180deg,rgba(221,231,243,0.34),transparent)]" />
      {/*
        Header: flat, intentional, anchored to the max-w-7xl column.
        The logo is rendered at its intrinsic height — no scale transforms,
        no overflow bleed. At retina the 1040×240 PNG oversamples ~6–7×
        so it stays crisp.
      */}
      {!isHomePage && (
      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--chrome)] backdrop-blur-xl">
        <div className="flex h-14 w-full items-center justify-between gap-4 px-4 md:h-[72px] md:px-6">
          <Link
            href={homeHref}
            className="inline-flex h-full items-center overflow-visible"
            aria-label={onboarding.isAuthenticated ? "Memora dashboard" : "Memora home"}
          >
            {/*
              PNG has transparent whitespace around the mark, so we render the
              image larger than the header box and rely on object-contain to
              letterbox. The mark itself ends up visually sized ~header-tall.
            */}
            <Image
              src={memoraLogo}
              alt="Memora"
              priority
              sizes="320px"
              className="h-[140px] w-auto object-contain object-left md:h-[180px]"
            />
          </Link>
          <nav className="flex shrink-0 items-center gap-1 md:gap-3">
            {showAuthenticatedNav ? (
              <NavLink href="/galleries">My Dashboard</NavLink>
            ) : hideAboutLink ? null : isHomePage ? (
              <NavLink href="/#about-product">About Us</NavLink>
            ) : (
              <NavLink href="/">About Us</NavLink>
            )}
            {!showAuthenticatedNav ? (
              <Button
                asChild
                variant="primary"
                className="ml-2 h-9 px-4 text-[11px] tracking-[0.2em] md:ml-4"
              >
                <Link href={createHref}>Create</Link>
              </Button>
            ) : null}
            {showAuthenticatedNav ? (
              <SettingsDropdown
                email={onboarding.user?.email ?? ""}
                planLabel={selectedPlan?.name ?? "No plan selected"}
                galleryCount={selectedPlan?.galleryCount ?? 0}
                currentPlanId={onboarding.selectedPlanId}
                onSelectPlan={(planId) => {
                  router.push(`/galleries/settings/membership?plan=${planId}`);
                }}
                onSignOut={() => {
                  void handleSignOut();
                }}
              />
            ) : null}
          </nav>
        </div>
      </header>
      )}
      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6",
          isHomePage ? "py-0" : "py-5 md:py-6",
        )}
      >
        {children}
      </main>
      {/*
        The home page closes on a mood photograph inside app/page.tsx
        (see components/home-closer.tsx) rather than a contact form.
        ContactUsBox is kept below — currently unused on home — so it can
        be restored quickly without recovering from history.
      */}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ContactUsBox() {
  const [message, setMessage] = useState("");
  return (
    <div className="border-t border-[color:var(--border)] pt-6">
      <div className="border border-[color:var(--border)] bg-[rgba(245,248,252,0.96)] p-4 md:p-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
          Contact
        </p>
        <h3 className="mt-2 font-serif text-xl leading-tight text-[color:var(--ink)] md:text-2xl">
          Get in touch
        </h3>
        <p className="mt-2 text-xs leading-6 text-[color:var(--ink-soft)]">
          Questions or feedback? Drop a note below — we read everything.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a message..."
            className="min-w-0 flex-1 rounded border border-[color:var(--border)] bg-white px-3 py-2 text-xs text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
          />
          <Button type="button" className="shrink-0 px-3 py-2 text-[11px]">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-2.5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
    >
      {children}
    </Link>
  );
}

function SettingsDropdown({
  email,
  planLabel,
  galleryCount,
  currentPlanId,
  onSelectPlan,
  onSignOut,
}: {
  email: string;
  planLabel: string;
  galleryCount: number;
  currentPlanId: string | null;
  onSelectPlan: (planId: string) => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const capacityLabel = Number.isFinite(galleryCount)
    ? `${galleryCount} active galleries`
    : "Unlimited galleries";

  return (
    <div className="relative ml-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 border border-[color:var(--border)] bg-[color:var(--chrome)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink)] transition hover:border-[color:var(--border-strong)]"
      >
        Settings
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="fixed inset-x-3 top-[calc(56px+0.5rem)] z-40 max-h-[calc(100dvh-5rem)] overflow-y-auto border border-[color:var(--border)] bg-[color:var(--chrome-strong)] p-4 shadow-[0_16px_40px_rgba(10,20,35,0.08)] backdrop-blur md:absolute md:inset-auto md:right-0 md:top-[calc(100%+0.5rem)] md:max-h-none md:w-80 md:overflow-visible">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            My account
          </p>
          <p className="mt-2 text-sm text-[color:var(--ink)]">{email}</p>
          <div className="mt-4 border-t border-[color:var(--border)] pt-4 text-sm text-[color:var(--ink-soft)]">
            <div className="flex items-start justify-between gap-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                Membership
              </span>
              <span className="text-right text-[color:var(--ink)]">{planLabel}</span>
            </div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                Capacity
              </span>
              <span className="text-right text-[color:var(--ink)]">
                {currentPlanId ? capacityLabel : "Select a plan first"}
              </span>
            </div>
          </div>

          <div className="mt-5 border-t border-[color:var(--border)] pt-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Account actions
            </p>
            <button
              type="button"
              className="mt-3 w-full border border-[color:var(--border)] px-3 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)]"
            >
              Recover password
            </button>
            <StorageCleanupDialog
              onAfterAction={() => {
                setOpen(false);
              }}
            />
          </div>

          <div className="mt-5 border-t border-[color:var(--border)] pt-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Upgrade subscription
            </p>
            <div className="mt-3 space-y-2">
              {membershipPlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelectPlan(plan.id);
                  }}
                  className={`w-full border px-3 py-3 text-left transition ${
                    currentPlanId === plan.id
                      ? "border-[color:var(--border-strong)] bg-[color:var(--paper)]"
                      : "border-[color:var(--border)] bg-white hover:bg-[color:var(--paper)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink)]">
                        {plan.name}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                        {plan.galleryCount} active galleries
                      </p>
                    </div>
                    <span className="text-xs text-[color:var(--ink-soft)]">${plan.price}/yr</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="mt-6 w-full border border-[color:var(--error-border)] bg-[color:var(--error-bg)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--error-text)] transition hover:opacity-80"
          >
            Sign out
          </button>
          <DeleteAccountDialog
            onAfterDelete={() => {
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
