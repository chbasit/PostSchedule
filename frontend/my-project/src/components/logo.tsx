import { useId } from "react";
import { PRODUCT_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

// Placeholder mark until the brand is decided (FRONTEND.md §19): an ink tile with a check in
// the sky-to-mint of the app's accents.
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const gradient = useId();
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span aria-hidden className="relative inline-flex size-7 items-center justify-center rounded-lg bg-ink ring-1 ring-white/10">
        <svg viewBox="0 0 24 24" className="size-4" fill="none">
          <defs>
            <linearGradient id={gradient} x1="5" y1="17" x2="19" y2="7" gradientUnits="userSpaceOnUse">
              <stop offset="0" style={{ stopColor: "var(--brand-sky)" }} />
              <stop offset="1" style={{ stopColor: "var(--brand-mint)" }} />
            </linearGradient>
          </defs>
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke={`url(#${gradient})`} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {compact ? <span className="sr-only">{PRODUCT_NAME}</span> : <span>{PRODUCT_NAME}</span>}
    </span>
  );
}
