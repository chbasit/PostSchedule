"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Pill toggle for a few views or options (Monthly/Yearly, Month/Week/List): a bordered
// track with the chosen option filled in ink.
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex rounded-full border p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full text-sm font-medium transition-colors duration-200",
            size === "sm" ? "h-8 px-3.5" : "h-9 px-4",
            value === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
