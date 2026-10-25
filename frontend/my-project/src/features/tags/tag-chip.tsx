"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { tints } from "@/components/tint";
import type { Tag } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useTagMap } from "./use-tags";

// The name is always written out; the colour only helps tags stand apart.
export function TagChip({ tag, onRemove, className }: { tag: Tag; onRemove?: () => void; className?: string }) {
  const t = useTranslations("tags");
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground",
        tints[tag.color].surface,
        tints[tag.color].line,
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", tints[tag.color].dot)} />
      <span className="truncate">{tag.name}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("remove", { name: tag.name })}
          className="-me-1 inline-flex size-5 items-center justify-center rounded-full hover:bg-foreground/10"
        >
          <X className="size-3" aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

export function TagList({ tagIds, max = 3, className }: { tagIds: string[]; max?: number; className?: string }) {
  const map = useTagMap();
  const tags = tagIds.map((id) => map.get(id)).filter((t): t is Tag => !!t);
  if (tags.length === 0) return null;
  return (
    <span className={cn("flex flex-wrap items-center gap-1", className)}>
      {tags.slice(0, max).map((tag) => (
        <TagChip key={tag.id} tag={tag} />
      ))}
      {tags.length > max ? <span className="text-xs font-semibold text-muted-foreground">+{tags.length - max}</span> : null}
    </span>
  );
}
