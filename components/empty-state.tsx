import Link from "next/link";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-[color:var(--border-strong)] bg-white/65 px-5 py-8 text-center shadow-[0_12px_30px_rgba(36,55,78,0.06)]">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--paper)] text-[color:var(--accent)]">
        <Archive className="h-4 w-4" />
      </div>
      <h3 className="font-serif text-lg text-[color:var(--ink)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[color:var(--ink-soft)]">
        {description}
      </p>
      <Button asChild className="mt-4">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
