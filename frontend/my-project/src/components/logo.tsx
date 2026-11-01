import { useId } from "react";
import { PRODUCT_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

// AgentiqSocial's mark until a brand designer draws the final one (FRONTEND.md §19): an ink
// tile with an AI spark in the sky-to-mint of the app's accents.
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
          <path d="M10 3.5c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" fill={`url(#${gradient})`} />
          <path d="M17.5 14c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3Z" fill={`url(#${gradient})`} />
        </svg>
      </span>
      {compact ? <span className="sr-only">{PRODUCT_NAME}</span> : <span>{PRODUCT_NAME}</span>}
    </span>
  );
}
