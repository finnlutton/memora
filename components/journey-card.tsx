import Link from "next/link";
import { JourneyProgressLine } from "@/components/journey-progress-line";
import type { JourneyLineModel, JourneyStage, JourneyStats } from "@/lib/journey";

export function JourneyCard({
  href,
  stage,
  stats,
  lineModel,
  supportCopy,
}: {
  href: string;
  stage: JourneyStage;
  stats: JourneyStats;
  lineModel: JourneyLineModel;
  supportCopy: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,253,0.94))] p-5 transition hover:border-[color:var(--border-strong)] hover:bg-white md:p-6"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(210,224,239,0.24),transparent)]" />
      <div className="relative space-y-6">
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
            Your Journey
          </p>
          <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr] xl:items-end">
            <div className="space-y-3">
              <h2 className="max-w-[12ch] font-serif text-3xl leading-[0.98] text-[color:var(--ink)] md:text-[2.2rem]">
                {stage.name}
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[color:var(--ink-soft)]">
                {supportCopy}
              </p>
            </div>
            <div className="border-l border-[color:var(--border)] pl-5 xl:min-h-[4.25rem]">
              <JourneyProgressLine model={lineModel} compact />
            </div>
          </div>
        </div>

        <div className="grid gap-px border border-[color:var(--border)] bg-[color:var(--border)] sm:grid-cols-3">
          <JourneyMetric label="Galleries" value={stats.galleryCount} note="Chapters preserved" />
          <JourneyMetric label="Scenes" value={stats.sceneCount} note="Moments given shape" />
          <JourneyMetric label="Moments" value={stats.momentCount} note="Images held in memory" />
        </div>
      </div>
    </Link>
  );
}

function JourneyMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="bg-[rgba(255,255,255,0.95)] px-4 py-4 md:px-5 md:py-5">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-[1.9rem] leading-none text-[color:var(--ink)] md:text-[2.2rem]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-6 text-[color:var(--ink-soft)]">{note}</p>
    </div>
  );
}
