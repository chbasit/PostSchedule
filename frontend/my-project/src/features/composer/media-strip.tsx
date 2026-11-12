"use client";

import { CircleX, Film, ImagePlus, Pause, Play, RotateCcw, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MediaSummary } from "@/lib/api/client";
import { useMediaUrl } from "@/lib/media-url";
import { aspectLabel, formatBytes, formatDuration, type CheckStatus } from "@/lib/preflight/rules";
import { MAX_UPLOAD_BYTES } from "@/lib/media";
import { cn } from "@/lib/utils";

export type MediaItem =
  | { key: string; phase: "uploading" | "paused"; name: string; progress: number; bytes: number; kind: "image" | "video"; localUrl: string | null }
  | { key: string; phase: "error"; name: string; reason: "unsupported" | "tooLarge" | "failed" }
  | { key: string; phase: "ready"; media: MediaSummary };

type Props = {
  items: MediaItem[];
  // Worst pre-flight result per media id, when it is not a pass.
  issues: Record<string, Exclude<CheckStatus, "pass">>;
  canAdd: boolean;
  addLabel: string;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onPause: (key: string) => void;
  onResume: (key: string) => void;
  onRetry: (key: string) => void;
  onShowChecks: () => void;
};

const tile = "group relative size-20 shrink-0 overflow-hidden rounded-lg border bg-muted sm:size-24";
const corner = "absolute z-10 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-opacity";

function Thumb({ media }: { media: MediaSummary }) {
  const url = useMediaUrl(media);
  if (!url) return <span className="flex size-full items-center justify-center text-muted-foreground">{media.kind === "video" ? <Film className="size-5" aria-hidden /> : <ImagePlus className="size-5" aria-hidden />}</span>;
  return media.kind === "video" ? (
    <video src={url} muted playsInline preload="metadata" className="size-full object-cover" aria-hidden />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- the user's own file
    <img src={url} alt="" className="size-full object-cover" />
  );
}

// Thumbnails inside the caption box, Buffer-style: each with its upload progress, a remove
// button, and a badge when pre-flight found something; then a tile to add more.
export function MediaStrip({ items, issues, canAdd, addLabel, onAdd, onRemove, onPause, onResume, onRetry, onShowChecks }: Props) {
  const t = useTranslations("composer.media");
  if (items.length === 0 && !canAdd) return null;
  const single = items.length === 1 && items[0].phase === "ready" ? items[0].media : null;
  const errors = items.filter((it) => it.phase === "error");

  return (
    <div className="space-y-2 px-3 pb-3">
      <ul className="flex flex-wrap gap-2" aria-label={t("title")}>
        {items.map((item) => (
          <li key={item.key} className={cn(tile, "animate-pop", item.phase === "error" && "border-danger/50 bg-danger-bg")}>
            {item.phase === "ready" ? (
              <>
                <Thumb media={item.media} />
                {item.media.kind === "video" ? (
                  <span className="tabular absolute bottom-1 end-1 z-10 inline-flex items-center gap-1 rounded bg-black/65 px-1 text-[10px] font-semibold text-white">
                    <Play className="size-2.5 fill-current" aria-hidden />
                    {item.media.durationSec !== null ? formatDuration(item.media.durationSec) : ""}
                  </span>
                ) : null}
                {issues[item.media.id] ? (
                  <button
                    type="button"
                    onClick={onShowChecks}
                    aria-label={t(issues[item.media.id] === "block" ? "issueBlock" : "issueWarn", { name: item.media.name })}
                    className={cn(corner, "start-1 top-1", issues[item.media.id] === "block" ? "bg-danger text-white" : "bg-warning-bg text-warning")}
                  >
                    {issues[item.media.id] === "block" ? <CircleX className="size-4" aria-hidden /> : <TriangleAlert className="size-3.5" aria-hidden />}
                  </button>
                ) : null}
                <span className="sr-only">{item.media.name}</span>
              </>
            ) : item.phase === "error" ? (
              <span className="flex size-full flex-col items-center justify-center gap-1 p-1 text-center text-danger">
                <CircleX className="size-5" aria-hidden />
                <span className="line-clamp-2 break-all text-[10px] font-medium" dir="auto">
                  {item.name}
                </span>
                {item.reason === "failed" ? (
                  <button type="button" onClick={() => onRetry(item.key)} className="inline-flex items-center gap-0.5 text-[10px] font-semibold underline-offset-2">
                    <RotateCcw className="size-3" aria-hidden /> {t("tryAgain")}
                  </button>
                ) : null}
              </span>
            ) : (
              <>
                {item.localUrl ? (
                  item.kind === "video" ? (
                    <video src={item.localUrl} muted playsInline preload="metadata" className="size-full object-cover opacity-50" aria-hidden />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- the user's own file
                    <img src={item.localUrl} alt="" className="size-full object-cover opacity-50" />
                  )
                ) : null}
                <span className="tabular absolute inset-0 flex items-center justify-center text-sm font-semibold text-ink" aria-live="polite">
                  {item.progress >= 1 ? t("checkingShort") : item.phase === "paused" ? t("paused") : `${Math.round(item.progress * 100)}%`}
                </span>
                <span aria-hidden className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/70">
                  <span className="block h-full rounded-full bg-gradient-to-r from-progress-from to-progress-to transition-[width] duration-300" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                </span>
                {item.progress < 1 ? (
                  <button
                    type="button"
                    onClick={() => (item.phase === "paused" ? onResume(item.key) : onPause(item.key))}
                    aria-label={item.phase === "paused" ? t("resumeName", { name: item.name }) : t("pauseName", { name: item.name })}
                    className={cn(corner, "start-1 top-1")}
                  >
                    {item.phase === "paused" ? <Play className="size-3 fill-current" aria-hidden /> : <Pause className="size-3 fill-current" aria-hidden />}
                  </button>
                ) : null}
              </>
            )}
            <button
              type="button"
              onClick={() => onRemove(item.key)}
              aria-label={t("removeName", { name: item.phase === "ready" ? item.media.name : item.name })}
              className={cn(corner, "end-1 top-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100")}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
        {canAdd ? (
          <li>
            <button
              type="button"
              onClick={onAdd}
              className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input/50 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-muted hover:text-foreground sm:size-24"
            >
              <ImagePlus className="size-5" aria-hidden />
              {addLabel}
            </button>
          </li>
        ) : null}
      </ul>
      {single ? (
        <p className="tabular truncate text-xs text-muted-foreground" title={single.name}>
          <span dir="auto">{single.name}</span> · {single.width}×{single.height} · {aspectLabel(single.width, single.height)} · {formatBytes(single.bytes)}
          {single.durationSec !== null ? ` · ${formatDuration(single.durationSec)}` : ""}
        </p>
      ) : null}
      {errors.map((item) =>
        item.phase === "error" ? (
          <p key={item.key} role="alert" className="text-xs text-danger">
            {t(item.reason, { name: item.name, max: Math.round(MAX_UPLOAD_BYTES / 1024 / 1024) })}
          </p>
        ) : null,
      )}
    </div>
  );
}
