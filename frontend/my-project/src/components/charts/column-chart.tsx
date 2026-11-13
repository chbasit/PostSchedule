"use client";

import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column = {
  key: string;
  value: number;
  // "accent" is the series the chart is about; "context" is de-emphasised data.
  tone: "accent" | "context";
  tick: ReactNode;
  // e.g. "Tue, 28 Oct" and "3 posts": shown in the tooltip and read by screen readers.
  label: string;
  valueText: string;
  showValue?: boolean;
  current?: boolean;
};

// Clean ticks: 0, half, top, where half is a round number (1, 1.5, 2, 2.5, 3, 4, 5, 6 or 8
// times a power of ten) so large counts read as 0 / 200 / 400 rather than 0 / 174 / 348.
function niceTop(max: number) {
  if (max <= 2) return 2;
  const half = max / 2;
  const magnitude = 10 ** Math.floor(Math.log10(half));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * magnitude).find((v) => v >= half) ?? 10 * magnitude;
  return Math.max(2, Math.ceil(step) * 2);
}

/**
 * Column chart per the dataviz mark specs: columns at most 24 px wide, 4 px rounded data
 * end and square at the baseline, solid hairline gridlines, sparing value labels, and a
 * tooltip on hover. The ChartCard's table view carries every value for keyboard users.
 */
export function ColumnChart({ columns, height = "h-44" }: { columns: Column[]; height?: string }) {
  const locale = useLocale();
  const compact = new Intl.NumberFormat(locale, { notation: "compact" });
  const top = niceTop(Math.max(0, ...columns.map((c) => c.value)));
  const ticks = [0, top / 2, top];
  const pct = (v: number) => (v / top) * 100;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
      <div aria-hidden className={cn("relative w-8 text-xs text-muted-foreground", height)}>
        {ticks.map((tick) => (
          <span key={tick} className="tabular absolute end-0 translate-y-1/2" style={{ bottom: `${pct(tick)}%` }}>
            {compact.format(tick)}
          </span>
        ))}
      </div>

      <div className={cn("relative", height)}>
        {ticks.map((tick) => (
          <div key={tick} aria-hidden className="absolute inset-x-0 border-t border-chart-grid" style={{ bottom: `${pct(tick)}%` }} />
        ))}
        <ul className="absolute inset-0 flex items-end gap-1">
          {columns.map((c) => {
            const p = pct(c.value);
            return (
              <li key={c.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                <span className="sr-only">
                  {c.label}: {c.valueText}
                </span>
                {c.value > 0 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "w-full max-w-7 rounded-t-md transition-[filter] group-hover:brightness-110",
                      c.tone === "accent" ? "bg-chart-1" : "bg-chart-context",
                    )}
                    style={{ height: `max(4px, ${p}%)` }}
                  />
                ) : null}
                {c.showValue && c.value > 0 ? (
                  <span
                    aria-hidden
                    className="tabular absolute text-xs font-semibold text-foreground group-hover:invisible"
                    style={{ bottom: `calc(${p}% + 4px)` }}
                  >
                    {c.value}
                  </span>
                ) : null}
                <span
                  aria-hidden
                  className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-center opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ bottom: `calc(${Math.min(p, 62)}% + 10px)` }}
                >
                  <span className="block text-sm font-semibold text-foreground">{c.valueText}</span>
                  <span className="block text-xs text-muted-foreground">{c.label}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div />
      <ul aria-hidden className="mt-2 flex gap-1">
        {columns.map((c) => (
          <li
            key={c.key}
            className={cn(
              "min-w-0 flex-1 text-center text-xs leading-tight",
              c.current ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            {c.tick}
            {c.current ? <span className="mx-auto mt-1 block h-1 w-4 rounded-full bg-mint" /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
