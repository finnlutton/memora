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
    <div className="rounded-[8px] border border-[color:var(--border)] bg-white/70 px-6 py-12 text-center shadow-[0_8px_24px_rgba(36,55,78,0.07)]">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--paper-strong)] text-[color:var(--accent)]">
        <Archive className="h-5 w-5" />
      </div>
      <h3 className="font-serif text-xl text-[color:var(--ink)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[color:var(--ink-soft)]">
        {description}
      </p>
      <Button asChild className="mt-5">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
