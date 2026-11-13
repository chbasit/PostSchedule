import { Check, Send } from "lucide-react";
import { PlatformMark } from "@/components/platform-badge";
import { PLATFORMS } from "@/providers/catalog";

// One post fanning out to every platform: the draft on one side, each account marked as
// posted on the other. A picture of the row's text, so it is one labelled image.
export function PublishVisual({ label }: { label: string }) {
  const rows = PLATFORMS.length;
  return (
    <div role="img" aria-label={label} className="mx-auto grid w-full max-w-[600px] grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1.15fr)] items-stretch sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1.15fr)]">
      {/* Outlined, as it sits straight on the page (founder's call, 2026-11-13). */}
      <div className="self-center rounded-2xl bg-card p-3 shadow-card ring-1 ring-border">
        {/* Square, so the tab panel stays low (founder's call, 2026-11-13). */}
        <div className="aspect-square rounded-xl bg-linear-to-br from-card-lavender via-card-pink to-card-yellow" />
        <div className="mt-3 space-y-1.5">
          <div className="h-2 w-4/5 rounded-full bg-muted" />
          <div className="h-2 w-3/5 rounded-full bg-muted" />
        </div>
        <div className="mt-3 flex justify-end">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Send className="size-4" />
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 100 ${rows * 10}`} preserveAspectRatio="none" className="h-full w-full text-foreground/25 rtl:-scale-x-100" fill="none">
        {PLATFORMS.map((p, i) => {
          const y = i * 10 + 5;
          const mid = rows * 5;
          return <path key={p.id} d={`M0 ${mid} C 50 ${mid}, 50 ${y}, 100 ${y}`} stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <ul className="flex flex-col justify-between gap-2">
        {PLATFORMS.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl bg-card p-1.5 pe-2.5 ring-1 ring-border sm:gap-2.5 sm:p-2 sm:pe-3">
            <PlatformMark id={p.id} className="rounded-lg" />
            <span className="h-2 flex-1 rounded-full bg-muted" />
            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
              <Check className="size-3" strokeWidth={3} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
