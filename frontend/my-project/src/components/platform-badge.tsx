import { getPlatform, type PlatformId } from "@/providers/catalog";
import { cn } from "@/lib/utils";

// The platform's logo, white on its brand colour. Decorative: the name is always given as text.
export function PlatformMark({ id, size = "md", className }: { id: PlatformId; size?: "sm" | "md" | "lg"; className?: string }) {
  const platform = getPlatform(id);
  return (
    <span
      aria-hidden
      title={platform.name}
      className={cn(
        // The dark-theme border keeps near-black brand colours (TikTok) visible on dark surfaces.
        "inline-flex shrink-0 items-center justify-center rounded text-white dark:border dark:border-white/30",
        size === "sm" && "size-5",
        size === "md" && "size-7",
        size === "lg" && "size-10",
        className,
      )}
      style={{ background: platform.markBackground ?? platform.brandColor }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-[58%]">
        <path d={platform.logo} />
      </svg>
    </span>
  );
}

export function PlatformBadge({ id, label, className }: { id: PlatformId; label?: string; className?: string }) {
  const platform = getPlatform(id);
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 rounded-full bg-muted py-0.5 pe-2.5 ps-0.5 text-xs font-medium", className)}>
      <PlatformMark id={id} size="sm" className="rounded-full" />
      <span className="truncate">{label ?? platform.name}</span>
      {label ? <span className="sr-only">({platform.name})</span> : null}
    </span>
  );
}
