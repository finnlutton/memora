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
import memoraLogo from "../Logo/MemoraLogo.png";

export function AppShell({
  children,
  accent = "default",
}: {
  children: React.ReactNode;
  accent?: "default" | "immersive";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isHomePage = pathname === "/";
  const isProductRoute = pathname.startsWith("/galleries");
  const { onboarding, getNextOnboardingRoute, signOut } = useMemoraStore();
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

  useEffect(() => {
    if (!isProductRoute || onboarding.isAuthenticated) {
      return;
    }

    router.replace("/");
  }, [isProductRoute, onboarding.isAuthenticated, router]);

  if (isProductRoute && !onboarding.isAuthenticated) {
    return null;
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
      <header className="sticky top-0 z-30 overflow-visible border-b border-[color:var(--border)] bg-[rgba(250,252,255,0.96)] backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] w-full max-w-7xl items-center justify-between gap-3 overflow-visible px-4 py-1 md:h-[72px] md:gap-5 md:px-6 md:py-0">
          <Link
            href={homeHref}
            className="flex h-[60px] min-w-0 items-center overflow-visible md:h-[70px]"
            aria-label={onboarding.isAuthenticated ? "Memora dashboard" : "Memora home"}
          >
            <Image
              src={memoraLogo}
              alt="Memora"
              width={1040}
              height={240}
              priority
              sizes="(max-width: 640px) 72vw, (max-width: 1024px) 60vw, 520px"
              className="h-full w-auto max-w-[92vw] origin-left translate-y-[1px] object-contain object-left scale-[1.9] md:max-w-[48rem] md:scale-[2.2] md:translate-y-[1px]"
            />
          </Link>
          <nav className="flex shrink-0 items-center gap-0.5 md:gap-1">
            {onboarding.isAuthenticated ? (
              <NavLink href="/galleries">Dashboard</NavLink>
            ) : isHomePage ? (
              <NavLink href="/#about-product">About Us</NavLink>
            ) : (
              <NavLink href="/">About Us</NavLink>
            )}
            {!onboarding.isAuthenticated ? (
              <Button
                asChild
                variant="primary"
                className="ml-2 border border-[color:var(--accent-strong)]/20 px-3.5 py-2 text-[11px] tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:ml-3"
              >
                <Link href={createHref}>Create</Link>
              </Button>
            ) : null}
            {onboarding.isAuthenticated ? (
              <SettingsDropdown
                email={onboarding.user?.email ?? ""}
                planLabel={selectedPlan?.name ?? "Membership pending"}
                galleryCount={selectedPlan?.galleryCount ?? 0}
                currentPlanId={onboarding.selectedPlanId}
                onSelectPlan={(planId) => {
                  router.push(`/pricing?plan=${planId}`);
                }}
                onSignOut={() => {
                  const supabase = createSupabaseBrowserClient();
                  void supabase.auth.signOut().finally(() => {
                    signOut();
                    window.location.replace("/");
                  });
                }}
              />
            ) : null}
          </nav>
        </div>
      </header>
      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6",
          isHomePage ? "py-0" : "py-5 md:py-6",
        )}
      >
        {children}
      </main>
      {isHomePage && (
        <footer className="mx-auto mt-8 w-full max-w-7xl px-4 pb-6 md:px-6">
          <ContactUsBox />
        </footer>
      )}
    </div>
  );
}

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
          Questions or feedback? Reach us at{" "}
          <a
            href="mailto:hello@memora.app"
            className="text-[color:var(--ink)] underline decoration-[color:var(--ink-soft)] underline-offset-2 transition hover:decoration-[color:var(--accent-strong)]"
          >
            hello@memora.app
          </a>
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

  return (
    <div className="relative ml-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 border border-[color:var(--border)] bg-[rgba(255,255,255,0.86)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink)] transition hover:border-[color:var(--border-strong)]"
      >
        Settings
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-80 border border-[color:var(--border)] bg-[rgba(250,252,255,0.98)] p-4 shadow-[0_16px_40px_rgba(10,20,35,0.08)] backdrop-blur">
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
                {galleryCount} active galleries
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
            className="mt-6 w-full border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#9a4545] transition hover:bg-[#ffefef]"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
