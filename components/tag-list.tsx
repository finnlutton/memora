export function TagList({ items }: { items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-[color:var(--border)] bg-[color:var(--paper)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
