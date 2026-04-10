"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { JourneyProgressLine } from "@/components/journey-progress-line";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import {
  getJourneyLineModel,
  getJourneyStage,
  getJourneyStats,
  getJourneySupportCopy,
  getNextJourneyMilestone,
  getResolvedJourneyMilestones,
} from "@/lib/journey";

export default function JourneyPage() {
  const { galleries } = useMemoraStore();

  const journey = useMemo(() => {
    const stats = getJourneyStats(galleries);
    const stage = getJourneyStage(stats.galleryCount);
    const line = getJourneyLineModel(stats.galleryCount);
    const supportCopy = getJourneySupportCopy(stats);
    const nextMilestone = getNextJourneyMilestone(stats);
    const milestones = getResolvedJourneyMilestones(stats);
    return { stats, stage, line, supportCopy, nextMilestone, milestones };
  }, [galleries]);

  const reachedMilestones = journey.milestones.filter((milestone) => milestone.achieved);
  const upcomingMilestones = journey.milestones.filter((milestone) => !milestone.achieved);

  return (
    <AppShell>
      <section className="space-y-8 py-2">
        <Button asChild variant="ghost">
          <Link href="/galleries">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <section className="relative overflow-hidden border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,248,253,0.92))] px-6 py-7 md:px-8 md:py-9">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(210,224,239,0.34),transparent)]" />
          <div className="relative space-y-8">
            <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
              <div className="space-y-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
                  Your Journey
                </p>
                <div className="space-y-4">
                  <h1 className="max-w-[11ch] font-serif text-[3rem] leading-[0.95] text-[color:var(--ink)] md:text-[4.4rem]">
                    {journey.stage.name}
                  </h1>
                  <p className="max-w-2xl text-sm leading-8 text-[color:var(--ink-soft)] md:text-[15px]">
                    {journey.stage.description}
                  </p>
                </div>
              </div>

              <div className="space-y-4 xl:pl-8">
                <div className="border-l border-[color:var(--border-strong)] pl-5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                    Archive note
                  </p>
                  <p className="mt-3 max-w-md font-serif text-2xl leading-tight text-[color:var(--ink)]">
                    {journey.supportCopy}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[color:var(--border)] pt-6">
              <JourneyProgressLine model={journey.line} />
            </div>
          </div>
        </section>

        <section className="grid gap-px border border-[color:var(--border)] bg-[color:var(--border)] lg:grid-cols-3">
          <JourneyStatPanel label="Galleries" value={journey.stats.galleryCount} note="Chapters preserved" />
          <JourneyStatPanel label="Scenes" value={journey.stats.sceneCount} note="Moments given shape" />
          <JourneyStatPanel label="Moments" value={journey.stats.momentCount} note="Images held in memory" />
        </section>

        <section className="grid gap-7 xl:grid-cols-[1.04fr_0.96fr]">
          <div className="space-y-5">
            <div className="pb-3">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Milestones ahead
              </p>
            </div>
            <div className="space-y-4">
              {upcomingMilestones.map((milestone, index) => (
                <div key={milestone.id} className="grid gap-4 md:grid-cols-[32px_1fr]">
                  <div className="hidden md:flex md:justify-center">
                    <div className="flex w-full flex-col items-center">
                      <span className="h-3 w-3 rounded-full border border-[color:var(--border-strong)] bg-white" />
                      {index !== upcomingMilestones.length - 1 ? (
                        <span className="mt-2 h-full min-h-16 w-px bg-[color:var(--border)]" />
                      ) : null}
                    </div>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.7)] px-5 py-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-serif text-[1.9rem] leading-tight text-[color:var(--ink)]">
                          {milestone.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">
                          {milestone.supportingText}
                        </p>
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                        {Math.min(milestone.progressValue, milestone.threshold)} / {milestone.threshold}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="pb-3">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Milestones reached
              </p>
            </div>
            <div className="grid gap-4">
              {reachedMilestones.length ? (
                reachedMilestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="bg-[linear-gradient(180deg,rgba(249,252,255,0.96),rgba(244,248,252,0.94))] px-5 py-5"
                  >
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                      Reached
                    </p>
                    <h3 className="mt-3 font-serif text-[1.9rem] leading-tight text-[color:var(--ink)]">
                      {milestone.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">
                      {milestone.supportingText}
                    </p>
                  </div>
                ))
              ) : (
                <div className="bg-[rgba(255,255,255,0.9)] px-5 py-5">
                  <p className="font-serif text-2xl leading-tight text-[color:var(--ink)]">
                    The first milestone is waiting.
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
                    Once your archive begins to take form, meaningful thresholds will gather here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function JourneyStatPanel({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="bg-[rgba(255,255,255,0.97)] px-5 py-6 md:px-6 md:py-7">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-[3rem] leading-none text-[color:var(--ink)] md:text-[3.6rem]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">{note}</p>
    </div>
  );
}
