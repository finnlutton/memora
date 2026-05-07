import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SiteFooter } from "@/components/site-footer";
import {
  isUnlimited,
  publicMembershipPlans,
  type MembershipPlan,
} from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing · Memora",
  description:
    "Plans for the Memora archive — Free, Plus, Max, and the Abroad Pass. Pick the size that fits how much you want to remember.",
  openGraph: {
    title: "Pricing · Memora",
    description:
      "Plans for the Memora archive — Free, Plus, Max, and the Abroad Pass.",
  },
};

function formatLimit(value: number | null) {
  if (isUnlimited(value)) return "Unlimited";
  return String(value);
}

function shareLine(plan: MembershipPlan) {
  if (isUnlimited(plan.activeShareLinks)) return "Unlimited shares";
  const period = plan.shareLimitPeriod === "monthly" ? "per month" : "total";
  return `${plan.activeShareLinks} private shares ${period}`;
}

function priceSuffix(plan: MembershipPlan): string | null {
  if (plan.id === "free") return null;
  if (plan.id === "abroad_pass") return "/ once";
  if (plan.id === "lifetime") return "/ 3 yrs";
  return "/ mo";
}

function planSummary(plan: MembershipPlan): string {
  if (plan.id === "plus") {
    return "Create more galleries, preserve more moments, and share beautiful memories with the people who matter.";
  }
  return plan.summary;
}

function ctaLabel(plan: MembershipPlan) {
  if (plan.id === "free") return "Start free";
  if (plan.id === "plus") return "Upgrade to Plus";
  if (plan.id === "lifetime") return "Get Max";
  if (plan.id === "abroad_pass") return "Get Abroad Pass";
  return `Start with ${plan.name}`;
}

const PRICING_PAGE_PLAN_ORDER = [
  "free",
  "plus",
  "lifetime",
  "abroad_pass",
] as const;

export default function PricingPage() {
  const plans = PRICING_PAGE_PLAN_ORDER
    .map((id) => publicMembershipPlans.find((p) => p.id === id))
    .filter((p): p is MembershipPlan => Boolean(p));

  return (
    <AppShell hideAboutLink>
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 md:px-6 md:pb-28 md:pt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
        >
          <span aria-hidden>←</span> Back to Memora
        </Link>

        <header className="mt-8 max-w-3xl md:mt-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">
            Plans
          </p>
          <h1 className="mt-4 font-serif text-[34px] leading-[1.06] text-[color:var(--ink)] md:text-[48px]">
            Pick the size that fits how much you want to remember.
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[color:var(--ink-soft)] md:text-base md:leading-7">
            All plans include the full Memora experience — written context,
            structured galleries, and private sharing. The only thing that
            changes is how much you can keep active at once. Change or cancel
            any time.
          </p>
        </header>

        <section
          aria-label="Plan options"
          className="mt-10 grid gap-4 md:mt-14 md:grid-cols-2 lg:grid-cols-4"
        >
          {plans.map((plan) => {
            const featured = !!plan.featured;
            const isAbroad = plan.id === "abroad_pass";
            const isMax = plan.id === "lifetime";
            return (
              <article
                key={plan.id}
                className={`relative flex h-full flex-col border p-6 transition md:p-7 ${
                  featured
                    ? "border-[color:var(--ink)] bg-[color:var(--paper)]"
                    : "border-[color:var(--border)] bg-[color:var(--paper)]"
                }`}
              >
                {featured ? (
                  <p className="absolute -top-2.5 left-6 bg-[color:var(--background)] px-2 text-[9.5px] uppercase tracking-[0.28em] text-[color:var(--ink)]">
                    Most chosen
                  </p>
                ) : null}
                {isAbroad ? (
                  <p className="absolute -top-2.5 left-6 bg-[color:var(--background)] px-2 text-[9.5px] uppercase tracking-[0.28em] text-[color:var(--ink-soft)]">
                    Semester
                  </p>
                ) : null}
                {isMax ? (
                  <p className="absolute -top-2.5 left-6 bg-[color:var(--background)] px-2 text-[9.5px] uppercase tracking-[0.28em] text-[color:var(--ink-soft)]">
                    3-year pass
                  </p>
                ) : null}

                <p className="text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  {plan.name}
                </p>

                <p className="mt-3 font-serif text-[28px] leading-none text-[color:var(--ink)] md:text-[32px]">
                  {plan.priceMonthlyLabel}
                  {priceSuffix(plan) ? (
                    <span className="ml-1 text-[12px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                      {priceSuffix(plan)}
                    </span>
                  ) : null}
                </p>

                <p className="mt-3 text-[13.5px] leading-6 text-[color:var(--ink-soft)]">
                  {planSummary(plan)}
                </p>

                <dl className="mt-6 space-y-2.5 text-[12.5px] leading-5 text-[color:var(--ink)]">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[color:var(--ink-soft)]">Galleries</dt>
                    <dd>{formatLimit(plan.galleryCount)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[color:var(--ink-soft)]">
                      Scenes per gallery
                    </dt>
                    <dd>{formatLimit(plan.subgalleriesPerGallery)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[color:var(--ink-soft)]">
                      Photos per scene
                    </dt>
                    <dd>{formatLimit(plan.photosPerSubgallery)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[color:var(--ink-soft)]">Sharing</dt>
                    <dd className="text-right">{shareLine(plan)}</dd>
                  </div>
                </dl>

                <div className="mt-auto pt-7">
                  <Link
                    href="/auth?mode=signup"
                    className={`inline-flex h-10 w-full items-center justify-center px-4 text-[11px] uppercase tracking-[0.2em] transition md:h-11 ${
                      featured
                        ? "bg-[color:var(--ink)] text-[color:var(--background)] hover:opacity-90"
                        : "border border-[color:var(--border-strong)] text-[color:var(--ink)] hover:bg-[color:var(--paper-strong)]"
                    }`}
                  >
                    {ctaLabel(plan)}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section
          aria-label="Cancellation policy"
          className="mt-14 max-w-2xl border-t border-[color:var(--border)] pt-8 text-[13px] leading-7 text-[color:var(--ink-soft)] md:mt-20"
        >
          <p>
            You can downgrade or cancel from your account at any time. Memora
            never deletes your archive when a plan ends — you keep view access
            to everything you&apos;ve already created. See the{" "}
            <Link
              href="/terms"
              className="text-[color:var(--ink)] underline decoration-[color:var(--ink-faint)] underline-offset-[3px] transition hover:decoration-[color:var(--ink-soft)]"
            >
              Terms
            </Link>{" "}
            for the full refund and cancellation policy.
          </p>
        </section>
      </main>
      <SiteFooter />
    </AppShell>
  );
}
