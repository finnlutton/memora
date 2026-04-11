import { Button } from "@/components/ui/button";

export function JourneyCelebration({
  title,
  supportingText,
  onDismiss,
}: {
  title: string;
  supportingText: string;
  onDismiss: () => void;
}) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(245,249,253,0.96),rgba(255,255,255,0.84))] px-5 py-5 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(88,112,144,0.42),transparent)]" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Milestone reached
          </p>
          <h2 className="font-serif text-2xl leading-tight text-[color:var(--ink)]">{title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)]">
            {supportingText}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={onDismiss} className="self-start px-0 text-[color:var(--ink)] hover:bg-transparent">
          Continue
        </Button>
      </div>
    </div>
  );
}
