import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Props = {
  // 0 to 1.
  value: number;
  // Accessible name, e.g. "Upload progress for clip.mp4".
  label: string;
  // "bar": a solid fill with a pin at its end over a tick track (stat cards).
  // "ticks": the ticks themselves fill in (uploads).
  variant?: "bar" | "ticks";
  valueText?: string;
  // Small label over the end of the track, e.g. "100%".
  endLabel?: string;
  className?: string;
};

// The fill grows from empty on mount and glides to new values (globals.css: .meter-*).
export function Meter({ value, label, variant = "bar", valueText, endLabel, className }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const at = { "--p": `${pct}%` } as CSSProperties;
  const bar = variant === "bar";

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={valueText}
      className={cn("relative", endLabel && "pt-5", className)}
    >
      {endLabel ? (
        <span aria-hidden className="absolute inset-e-0 top-0 text-xs font-medium text-muted-foreground">
          {endLabel}
        </span>
      ) : null}
      <div className={cn("relative", bar ? "h-4" : "h-2.5")}>
        <div aria-hidden className="meter-ticks absolute inset-0 animate-reveal-x bg-progress-track" />
        <div
          aria-hidden
          className={cn(
            "meter-fill absolute inset-0 bg-linear-to-r from-progress-from to-progress-to rtl:bg-linear-to-l",
            bar ? "[--r:999px]" : "meter-ticks",
          )}
          style={at}
        />
        {bar ? (
          <>
            {pct >= 16 ? (
              <span
                aria-hidden
                className="meter-pos absolute top-1/2 -translate-x-[calc(100%+6px)] -translate-y-1/2 rounded bg-white/80 px-1 text-xs font-semibold leading-4 text-ink rtl:translate-x-[calc(100%+6px)]"
                style={at}
              >
                {pct}%
              </span>
            ) : null}
            <span aria-hidden className="meter-pos absolute -inset-y-1.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground rtl:translate-x-1/2" style={at}>
              <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-foreground" />
            </span>
            {endLabel ? <span aria-hidden className="absolute -inset-y-1.5 inset-e-0 w-0.5 rounded-full bg-progress-track" /> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
