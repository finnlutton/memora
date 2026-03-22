import { CalendarRange, MapPin, Users } from "lucide-react";

export function MetadataRow({
  date,
  locations,
  people,
}: {
  date?: string;
  locations?: string[];
  people?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-[color:var(--ink-soft)]">
      {date ? <MetaPill icon={CalendarRange} label={date} /> : null}
      {locations?.length ? (
        <MetaPill icon={MapPin} label={locations.join(" • ")} />
      ) : null}
      {people?.length ? <MetaPill icon={Users} label={people.join(", ")} /> : null}
    </div>
  );
}

function MetaPill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-white/75 px-2 py-1">
      <Icon className="h-3 w-3 text-[color:var(--accent)]" />
      <span>{label}</span>
    </span>
  );
}
