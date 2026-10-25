"use client";

import { PlatformMark } from "@/components/platform-badge";
import { Select, SelectItem } from "@/components/ui/select";
import { PLATFORMS, type PlatformId } from "@/providers/catalog";

// Radix Select cannot use "" as an item value, so "all platforms" has its own key.
const ALL = "all";

// "All platforms" or a single platform, each shown with its mark. Borderless, for filter bars.
export function PlatformFilter({
  value,
  onChange,
  label,
  allLabel,
  className,
}: {
  value: PlatformId | "";
  onChange: (value: PlatformId | "") => void;
  label: string;
  allLabel: string;
  className?: string;
}) {
  return (
    <Select
      variant="ghost"
      value={value || ALL}
      onValueChange={(v) => onChange(v === ALL ? "" : (v as PlatformId))}
      aria-label={label}
      className={className}
      contentClassName="min-w-48"
    >
      <SelectItem value={ALL}>{allLabel}</SelectItem>
      {PLATFORMS.map((p) => (
        <SelectItem key={p.id} value={p.id}>
          <span className="inline-flex items-center gap-2">
            <PlatformMark id={p.id} size="sm" />
            {p.name}
          </span>
        </SelectItem>
      ))}
    </Select>
  );
}
