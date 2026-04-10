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
    <div className="border border-[color:var(--border-strong)] bg-[rgba(243,248,253,0.96)] p-4 md:p-5">
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
        <Button type="button" variant="secondary" onClick={onDismiss}>
          Continue
        </Button>
      </div>
    </div>
  );
}
