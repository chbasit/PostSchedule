"use client";

import { FileText, Film, Image as ImageIcon, Smartphone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PlatformMark } from "@/components/platform-badge";
import type { Post } from "@/lib/api/client";
import { formatDateTime } from "@/lib/time";
import { useWorkspace } from "@/features/session/workspace-context";

export const TYPE_ICON = { text: FileText, image: ImageIcon, video: Film, story: Smartphone } as const;

export function PlatformStack({ post, max = 4 }: { post: Post; max?: number }) {
  const t = useTranslations("posts");
  const live = post.targets.filter((tg) => tg.status !== "skipped");
  return (
    <span className="inline-flex items-center gap-1" aria-label={t("onPlatforms", { count: live.length })}>
      {live.slice(0, max).map((tg) => (
        <PlatformMark key={tg.id} id={tg.provider} size="sm" />
      ))}
      {live.length > max ? <span className="text-xs text-muted-foreground">+{live.length - max}</span> : null}
    </span>
  );
}

export function PostWhen({ post, style = "medium" }: { post: Post; style?: "medium" | "short" }) {
  const t = useTranslations("posts");
  const locale = useLocale();
  const { user } = useWorkspace();
  if (!post.scheduledAt) return <span className="text-muted-foreground">{t("noTime")}</span>;
  return (
    <time dateTime={post.scheduledAt} className="tabular">
      {formatDateTime(post.scheduledAt, locale, user.timezone, style === "short" ? { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: !user.use24h } : { dateStyle: "medium", timeStyle: "short", hour12: !user.use24h })}
    </time>
  );
}

export function CaptionExcerpt({ post }: { post: Post }) {
  const t = useTranslations("posts");
  return (
    <span className="line-clamp-2 break-words" dir="auto">
      {post.mainCaption || <span className="text-muted-foreground">{t("noCaption")}</span>}
    </span>
  );
}
