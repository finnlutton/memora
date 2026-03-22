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
    <div className="rounded-[2rem] border border-dashed border-[color:var(--border-strong)] bg-white/65 px-8 py-14 text-center shadow-[0_16px_40px_rgba(36,55,78,0.06)]">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--paper)] text-[color:var(--accent)]">
        <Archive className="h-5 w-5" />
      </div>
      <h3 className="font-serif text-2xl text-[color:var(--ink)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[color:var(--ink-soft)]">
        {description}
      </p>
      <Button asChild className="mt-6">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
