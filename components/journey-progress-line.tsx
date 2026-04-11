import type { JourneyLineModel } from "@/lib/journey";

export function JourneyProgressLine({
  model,
  compact = false,
}: {
  model: JourneyLineModel;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <div className="relative px-2 pt-8">
        <div className="absolute left-2 right-2 top-[1.35rem] h-px bg-[rgba(38,58,83,0.14)]" />
        <div
          className="absolute left-2 top-[1.35rem] h-px bg-[linear-gradient(90deg,rgba(84,110,142,0.62),rgba(84,110,142,0.32))]"
          style={{ width: `calc(${model.currentPosition}% - 0.5rem)` }}
        />

        {model.points.map((point) => (
          <div
            key={point.stage.id}
            className="absolute top-[0.95rem] -translate-x-1/2"
            style={{ left: `calc(${point.position}% + 0rem)` }}
          >
            <div className="flex flex-col items-center">
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full border bg-[rgba(255,255,255,0.96)]",
                  point.isCurrent
                    ? "border-[color:var(--accent-strong)] shadow-[0_0_0_5px_rgba(88,112,144,0.12)]"
                    : point.isNext
                      ? "border-[rgba(88,112,144,0.65)] shadow-[0_0_0_3px_rgba(88,112,144,0.08)]"
                      : "border-[rgba(38,58,83,0.22)]",
                ].join(" ")}
              />
            </div>
          </div>
        ))}

        <div
          className="absolute top-[0.85rem] -translate-x-1/2"
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

      <div className="grid grid-cols-6 gap-2 px-1">
        {model.points.map((point) => (
          <p
            key={point.stage.id}
            className={[
              "text-center font-serif leading-tight",
              compact ? "text-[0.88rem]" : "text-[0.98rem]",
              point.isCurrent ? "text-[color:var(--ink)]" : "text-[color:var(--ink-soft)]",
            ].join(" ")}
          >
            {point.stage.name}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-1 border-t border-[rgba(38,58,83,0.08)] pt-4 sm:flex-row sm:items-center sm:justify-between">
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
