import type { JourneyLineModel } from "@/lib/journey";

export function JourneyProgressLine({
  model,
  compact = false,
}: {
  model: JourneyLineModel;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <div className="relative px-2 pt-7">
        <div className="absolute left-2 right-2 top-[1.1rem] h-px bg-[rgba(38,58,83,0.16)]" />
        <div
          className="absolute left-2 top-[1.1rem] h-px bg-[rgba(75,104,137,0.48)]"
          style={{ width: `calc(${model.currentPosition}% - 0.5rem)` }}
        />

        {model.points.map((point) => (
          <div
            key={point.stage.id}
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `calc(${point.position}% + 0rem)` }}
          >
            <div className="flex flex-col items-center">
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full border bg-white",
                  point.isCurrent
                    ? "border-[color:var(--accent-strong)] shadow-[0_0_0_5px_rgba(88,112,144,0.12)]"
                    : point.isNext
                      ? "border-[rgba(88,112,144,0.65)] shadow-[0_0_0_3px_rgba(88,112,144,0.08)]"
                      : "border-[rgba(38,58,83,0.22)]",
                ].join(" ")}
              />
              <span
                className={[
                  "mt-4 max-w-[5rem] text-center font-serif leading-tight",
                  compact ? "text-[0.95rem]" : "text-[1.05rem]",
                  point.isCurrent ? "text-[color:var(--ink)]" : "text-[color:var(--ink-soft)]",
                ].join(" ")}
              >
                {point.stage.name}
              </span>
            </div>
          </div>
        ))}

        <div
          className="absolute top-[0.7rem] -translate-x-1/2"
          style={{ left: `calc(${model.currentPosition}% + 0rem)` }}
        >
          <div className="flex flex-col items-center">
            <span className="h-4 w-4 rounded-full border border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)] shadow-[0_0_0_6px_rgba(88,112,144,0.12)]" />
            <span className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Now
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-[color:var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={compact ? "text-sm leading-7 text-[color:var(--ink)]" : "text-base text-[color:var(--ink)]"}>
          {model.progressLabel}
        </p>
        {model.nextStage ? (
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Next: {model.nextStage.name}
          </p>
        ) : (
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Archive still unfolding
          </p>
        )}
      </div>
    </div>
  );
}
