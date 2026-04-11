import Link from "next/link";
import { JourneyProgressLine } from "@/components/journey-progress-line";
import type { JourneyLineModel, JourneyStage, JourneyStats } from "@/lib/journey";

export function JourneyCard({
  href,
  stage,
  stats,
  lineModel,
  supportCopy,
  showStats = true,
}: {
  href: string;
  stage: JourneyStage;
  stats: JourneyStats;
  lineModel: JourneyLineModel;
  supportCopy: string;
  showStats?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,252,0.88))] px-5 py-6 transition hover:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(244,249,253,0.94))] md:px-7 md:py-7"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(210,224,239,0.24),transparent)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(215,227,239,0.16),transparent_70%)]" />
      <div className="relative space-y-8">
        <div className="space-y-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
            Your Journey
          </p>
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)] xl:items-end">
            <div className="space-y-4">
              <h2 className="max-w-[12ch] font-serif text-3xl leading-[0.95] text-[color:var(--ink)] md:text-[2.5rem]">
                {stage.name}
              </h2>
              <p className="max-w-[30rem] text-sm leading-7 text-[color:var(--ink-soft)] md:text-[0.95rem]">
                {supportCopy}
              </p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Open your archive path
              </p>
            </div>
            <div className="xl:min-h-[5rem]">
              <JourneyProgressLine model={lineModel} compact />
            </div>
          </div>
        </div>

        {showStats ? (
          <div className="grid gap-5 border-t border-[rgba(38,58,83,0.08)] pt-5 sm:grid-cols-3">
            <JourneyMetric label="Galleries" value={stats.galleryCount} note="Chapters preserved" />
            <JourneyMetric label="Scenes" value={stats.sceneCount} note="Moments given shape" />
            <JourneyMetric label="Moments" value={stats.momentCount} note="Images held in memory" />
          </div>
        ) : null}
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
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="font-serif text-[1.9rem] leading-none text-[color:var(--ink)] md:text-[2.2rem]">
        {value}
      </p>
      <p className="text-xs leading-6 text-[color:var(--ink-soft)]">{note}</p>
    </div>
  );
}
