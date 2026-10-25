import { PRODUCT_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

// Placeholder mark until the brand is decided (FRONTEND.md §19).
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span aria-hidden className="relative inline-flex size-7 items-center justify-center rounded bg-ink text-lime">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {compact ? <span className="sr-only">{PRODUCT_NAME}</span> : <span>{PRODUCT_NAME}</span>}
    </span>
  );
}
