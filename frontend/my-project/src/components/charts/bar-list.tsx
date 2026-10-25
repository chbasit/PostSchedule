"use client";

import type { ReactNode } from "react";

export type BarRow = { key: string; label: ReactNode; value: number; srLabel: string };

/**
 * Horizontal bars for one series over nominal categories: every bar takes slot 1 (no
 * value-ramp on names), grows from a hairline baseline, with the value at its tip.
 */
export function BarList({ rows }: { rows: BarRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-center gap-3">
          <span className="sr-only">{r.srLabel}</span>
          <span aria-hidden className="flex min-w-0 items-center gap-2 text-sm">
            {r.label}
          </span>
          <span aria-hidden className="flex min-w-0 items-center gap-2 border-s border-chart-grid ps-px">
            <span
              className="h-3 shrink-0 rounded-e-[4px] bg-chart-1"
              style={{ width: `calc((100% - 2.25rem) * ${r.value / max})`, minWidth: r.value > 0 ? 4 : 0 }}
            />
            <span className="tabular text-sm font-semibold text-foreground">{r.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
