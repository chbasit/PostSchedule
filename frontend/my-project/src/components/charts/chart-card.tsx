"use client";

import { ChartColumn, Table } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Chart container: title, optional legend, and a table-view toggle so every value is
 * reachable without hovering (the accessible twin of the chart).
 */
export function ChartCard({
  title,
  subtitle,
  legend,
  controls,
  table,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  legend?: ReactNode;
  // e.g. a metric switcher; stays visible in the table view too.
  controls?: ReactNode;
  table: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations("charts");
  const id = useId();
  const [asTable, setAsTable] = useState(false);

  return (
    <figure aria-labelledby={`${id}-title`} className={cn("card-surface flex min-w-0 flex-col p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 id={`${id}-title`} className="font-semibold">
            {title}
          </h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Button variant="ghost" size="sm" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)} className="shrink-0">
          {asTable ? <ChartColumn aria-hidden /> : <Table aria-hidden />}
          {asTable ? t("showChart") : t("showTable")}
        </Button>
      </div>
      {controls ? <div className="mt-3">{controls}</div> : null}
      {legend && !asTable ? <div className="mt-3">{legend}</div> : null}
      <div className="mt-4 flex-1">{asTable ? table : children}</div>
    </figure>
  );
}

// Swatch + label. Text stays in text colours; the swatch carries the series colour.
export function Legend({ items }: { items: Array<{ label: string; swatch: string }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden className={cn("size-2.5 rounded-[2px]", item.swatch)} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function ChartTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr>
            {headers.map((h, i) => (
              <th key={h} scope="col" className={cn("px-3 py-2 font-medium", i === 0 ? "text-start" : "text-end")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i} className={cn("px-3 py-2", i === 0 ? "text-start" : "tabular text-end font-medium")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
