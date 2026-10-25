"use client";

import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Forward,
  Globe,
  Heart,
  ImageOff,
  Link2,
  Lock,
  MessageCircle,
  Pause,
  Play,
  Repeat2,
  Send,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { PlatformMark } from "@/components/platform-badge";
import type { SocialAccount } from "@/lib/api/client";
import { useMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { PlatformDescriptor, PostType, PreviewAction, Privacy } from "@/providers/catalog";

export type PreviewMedia = {
  id: string;
  kind: "image" | "video";
  previewUrl: string | null;
  width: number;
  height: number;
};

type Props = {
  platform: PlatformDescriptor;
  account: SocialAccount;
  type: PostType;
  caption: string;
  // Platforms with a separate title (YouTube) show it instead of the caption.
  title?: string;
  privacy?: Privacy;
  media: PreviewMedia[];
  // The "make 9:16" fix is on: the video fills the frame instead of showing bars.
  fill: boolean;
};

// A likeness of the post on each platform, drawn from the platform's preview spec
// (providers/<platform>). Videos play, muted, with play and sound controls.
export function PostPreview(props: Props) {
  const { platform, type } = props;
  if (!platform.capabilities[type]) return <Unsupported platform={platform} type={type} />;
  if (type === "story") return <StoryPreview {...props} />;
  const vertical = (type === "video" && platform.preview.video === "vertical") || (type === "image" && platform.preview.image === "vertical");
  return vertical ? <VerticalPreview {...props} /> : <FeedPreview {...props} />;
}

// --- Shared pieces --------------------------------------------------------------------

function likeIcon(platform: PlatformDescriptor): LucideIcon {
  // Platforms with a thumbs-up "Like" (and YouTube's dislike) versus a heart.
  return platform.preview.actionLabels || platform.preview.rail.includes("dislike") ? ThumbsUp : Heart;
}

function actionIcon(action: PreviewAction, platform: PlatformDescriptor): LucideIcon {
  const icons: Record<PreviewAction, LucideIcon> = {
    like: likeIcon(platform),
    dislike: ThumbsDown,
    comment: MessageCircle,
    share: Forward,
    repost: Repeat2,
    send: Send,
    save: Bookmark,
  };
  return icons[action];
}

// Hashtags, mentions and links in the platform's link colour, the rest as written.
function RichText({ text, className }: { text: string; className?: string }) {
  // A tag or mention starts a word, so the "@" inside an email address is left alone.
  const parts = text.split(/((?<![\p{L}\p{N}_.])[#@][\p{L}\p{N}_]+(?:\.[\p{L}\p{N}_]+)*|https?:\/\/\S+)/u);
  return (
    <span className={cn("whitespace-pre-wrap break-words", className)} dir="auto">
      {parts.map((part, i) => (i % 2 === 1 ? <span key={i} className="font-medium text-info">{part}</span> : part))}
    </span>
  );
}

// Long text folds after a few lines, with "more", like the feeds do.
function Caption({ text, lead, dark }: { text: string; lead?: string; dark?: boolean }) {
  const t = useTranslations("composer.previewPane");
  const [open, setOpen] = useState(false);
  if (!text.trim()) return <p className={cn("text-sm", dark ? "text-white/70" : "text-muted-foreground")}>{t("captionPlaceholder")}</p>;
  const long = text.length > 160 || text.split("\n").length > 3;
  return (
    <div className="text-sm leading-snug">
      <p className={cn(!open && long && "line-clamp-3")}>
        {lead ? <span className="me-1 font-semibold">{lead}</span> : null}
        <RichText text={text} />
      </p>
      {long ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className={cn("mt-0.5 text-sm font-medium", dark ? "text-white/80" : "text-muted-foreground")}>
          {open ? t("less") : t("more")}
        </button>
      ) : null}
    </div>
  );
}

function time(sec: number) {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// A muted, looping video with its own controls; tapping the picture pauses or plays it.
function PreviewVideo({ src, fit }: { src: string; fit: "cover" | "contain" }) {
  const t = useTranslations("composer.previewPane");
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [clock, setClock] = useState({ at: 0, of: 0 });

  useEffect(() => {
    // Autoplay can be refused; the play button then stays visible.
    ref.current?.play().catch(() => undefined);
  }, [src]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };

  return (
    <div className="relative size-full">
      <video
        ref={ref}
        src={src}
        muted={muted}
        loop
        playsInline
        autoPlay
        preload="metadata"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setClock({ at: 0, of: e.currentTarget.duration })}
        onTimeUpdate={(e) => setClock({ at: e.currentTarget.currentTime, of: e.currentTarget.duration })}
        className={cn("size-full cursor-pointer bg-black", fit === "cover" ? "object-cover" : "object-contain")}
      />
      {!playing ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={t("play")}
          className="absolute left-1/2 top-1/2 inline-flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-transform hover:scale-105"
        >
          <Play className="ms-0.5 size-6 fill-current" aria-hidden />
        </button>
      ) : null}
      <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-2 text-white">
        <span className="tabular rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
          {time(clock.at)} / {time(clock.of)}
        </span>
        <span className="flex gap-1">
          <button type="button" onClick={toggle} aria-label={playing ? t("pause") : t("play")} className="inline-flex size-7 items-center justify-center rounded-full bg-black/45 backdrop-blur">
            {playing ? <Pause className="size-3.5 fill-current" aria-hidden /> : <Play className="size-3.5 fill-current" aria-hidden />}
          </button>
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? t("unmute") : t("mute")} className="inline-flex size-7 items-center justify-center rounded-full bg-black/45 backdrop-blur">
            {muted ? <VolumeX className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
          </button>
        </span>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-white/25">
        <div className="h-full bg-white" style={{ width: `${clock.of ? (clock.at / clock.of) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

// One file, or a note when it can't be shown yet.
function MediaFill({ item, fit, dark }: { item: PreviewMedia; fit: "cover" | "contain"; dark?: boolean }) {
  const t = useTranslations("composer.previewPane");
  const url = useMediaUrl(item);
  const [failed, setFailed] = useState<string | null>(null);
  if (!url || failed === url) {
    return (
      <div className={cn("flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-xs", dark ? "bg-neutral-900 text-white/70" : "bg-muted text-muted-foreground")}>
        <ImageOff className="size-5" aria-hidden />
        {url ? t("unavailable") : t("loading")}
      </div>
    );
  }
  if (item.kind === "video") return <PreviewVideo key={url} src={url} fit={fit} />;
  // eslint-disable-next-line @next/next/no-img-element -- local preview of the user's own file
  return <img src={url} alt="" onError={() => setFailed(url)} className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain", dark && "bg-black")} />;
}

// Several images swiped one at a time, with arrows, dots and a counter.
function Carousel({ items, render, dark }: { items: PreviewMedia[]; render: (item: PreviewMedia) => ReactNode; dark?: boolean }) {
  const t = useTranslations("composer.previewPane");
  const [index, setIndex] = useState(0);
  const i = Math.min(index, items.length - 1);
  if (items.length === 1) return <>{render(items[0])}</>;
  const nav = cn(
    "absolute z-10 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow transition-opacity disabled:opacity-0",
    // In the vertical player the action rail owns the middle of the end edge.
    dark ? "top-1/4" : "top-1/2",
  );
  return (
    <div className="relative size-full">
      <div key={items[i].id} className="size-full animate-fade-in">
        {render(items[i])}
      </div>
      <button type="button" disabled={i === 0} onClick={() => setIndex(i - 1)} aria-label={t("previous")} className={cn(nav, "start-2")}>
        <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden />
      </button>
      <button type="button" disabled={i === items.length - 1} onClick={() => setIndex(i + 1)} aria-label={t("next")} className={cn(nav, "end-2")}>
        <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
      </button>
      <span className="tabular absolute end-2 top-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
        {t("itemOf", { n: i + 1, total: items.length })}
      </span>
      <span aria-hidden className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1">
        {items.map((item, n) => (
          <span key={item.id} className={cn("size-1.5 rounded-full", n === i ? (dark ? "bg-white" : "bg-info") : dark ? "bg-white/45" : "bg-white/70")} />
        ))}
      </span>
    </div>
  );
}

function Unsupported({ platform, type }: { platform: PlatformDescriptor; type: PostType }) {
  const t = useTranslations("composer.previewPane");
  const tt = useTranslations("composer.accounts.types");
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-muted px-6 py-10 text-center">
      <PlatformMark id={platform.id} size="lg" className="rounded-xl" />
      <p className="font-medium">{t("unsupportedTitle", { platform: platform.name, type: tt(type) })}</p>
      <p className="text-sm text-muted-foreground">{t("unsupportedBody")}</p>
    </div>
  );
}

function PrivacyChip({ privacy, dark }: { privacy: Privacy; dark?: boolean }) {
  const t = useTranslations("composer.privacy");
  const Icon = privacy === "public" ? Globe : privacy === "unlisted" ? Link2 : Lock;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", dark ? "bg-black/50 text-white backdrop-blur" : "bg-muted")}>
      <Icon className="size-3" aria-hidden /> {t(privacy)}
    </span>
  );
}

// --- Vertical player: Shorts, Reels, TikTok -------------------------------------------

function VerticalPreview({ platform, account, type, caption, title, privacy, media, fill }: Props) {
  const t = useTranslations("composer.previewPane");
  const follow = platform.preview.follow;
  const text = title?.trim() || caption;
  return (
    <figure className="mx-auto w-full max-w-[280px]" aria-label={t("label", { platform: platform.name })}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] border-[5px] border-neutral-900 bg-black text-white shadow-lg">
        {media.length ? (
          <Carousel dark items={media} render={(item) => <MediaFill dark item={item} fit={fill || type === "image" ? "cover" : "contain"} />} />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-neutral-800 to-neutral-950 px-6 text-center text-xs text-white/70">
            <ImageOff className="size-6" aria-hidden />
            {t("noMedia")}
          </div>
        )}
        {/* Shade so the overlaid text stays readable on bright video. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        {privacy && privacy !== "public" ? (
          <span className="absolute start-2 top-11 z-10">
            <PrivacyChip dark privacy={privacy} />
          </span>
        ) : null}
        <ul className="absolute bottom-24 end-1.5 z-10 flex flex-col items-center gap-3.5">
          {platform.preview.rail.map((action) => {
            const Icon = actionIcon(action, platform);
            return (
              <li key={action} className="flex flex-col items-center gap-0.5 text-[10px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {t(`actions.${action}`)}
              </li>
            );
          })}
        </ul>
        <div className="absolute inset-x-0 bottom-0 z-10 space-y-1.5 p-3 pe-14">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar id={account.id} name={account.displayName} size="sm" className="size-7 ring-2 ring-white/80" />
            <span className="truncate text-xs font-semibold" dir="ltr">
              {account.handle.startsWith("@") ? account.handle : `@${account.handle}`}
            </span>
            {follow ? (
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">{t(follow)}</span>
            ) : null}
          </div>
          <p className="line-clamp-2 text-xs leading-snug text-white/95">
            {text.trim() ? <RichText text={text} /> : <span className="text-white/70">{t("captionPlaceholder")}</span>}
          </p>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">{t("approx", { platform: platform.name, format: platform.video.format })}</figcaption>
    </figure>
  );
}

// --- Story --------------------------------------------------------------------------

function StoryPreview({ platform, account, media, fill }: Props) {
  const t = useTranslations("composer.previewPane");
  return (
    <figure className="mx-auto w-full max-w-[280px]" aria-label={t("label", { platform: platform.name })}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] border-[5px] border-neutral-900 bg-black text-white shadow-lg">
        {media.length ? (
          <MediaFill dark item={media[0]} fit={fill || media[0].kind === "image" ? "cover" : "contain"} />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-neutral-800 to-neutral-950 px-6 text-center text-xs text-white/70">
            <ImageOff className="size-6" aria-hidden />
            {t("noMedia")}
          </div>
        )}
        {/* Top and bottom shade keep the name and the reply bar readable on bright media. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-black/60 to-transparent" />
        <div aria-hidden className="absolute inset-x-2 top-2 z-10 h-0.5 rounded-full bg-white/40">
          <div className="h-full w-1/3 rounded-full bg-white" />
        </div>
        <div className="absolute inset-x-2 top-12 z-10 flex items-center gap-2 text-xs font-semibold drop-shadow">
          <Avatar id={account.id} name={account.displayName} size="sm" className="size-7 ring-2 ring-white/80" />
          <span className="truncate">{account.displayName}</span>
          <span className="font-normal text-white/80">{t("justNow")}</span>
        </div>
        <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-3">
          <span className="flex-1 rounded-full border border-white/70 px-3 py-1.5 text-xs text-white/90">{t("sendMessage")}</span>
          <Heart className="size-5" aria-hidden />
          <Send className="size-5" aria-hidden />
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">{t("storyNoCaption")}</figcaption>
    </figure>
  );
}

// --- Feed card: Facebook, LinkedIn, Bluesky, Instagram photos ---------------------------

function FeedMedia({ platform, media, type }: { platform: PlatformDescriptor; media: PreviewMedia[]; type: PostType }) {
  const t = useTranslations("composer.previewPane");
  if (media.length === 0) {
    return type === "text" ? null : (
      <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-muted px-6 text-center text-xs text-muted-foreground">
        <ImageOff className="size-5" aria-hidden />
        {t("noMedia")}
      </div>
    );
  }
  // Feeds show media between 4:5 and 1.91:1.
  const ratio = Math.min(1.91, Math.max(0.8, media[0].width / media[0].height));
  if (media.length > 1 && platform.preview.gallery === "grid") {
    const shown = media.slice(0, 4);
    return (
      <div className={cn("grid gap-0.5 bg-border", shown.length > 1 && "grid-cols-2")}>
        {shown.map((item, i) => (
          <div key={item.id} className={cn("relative aspect-square overflow-hidden", shown.length === 3 && i === 0 && "row-span-2 aspect-auto")}>
            <MediaFill item={item} fit="cover" />
            {i === 3 && media.length > 4 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white">+{media.length - 4}</span>
            ) : null}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="relative bg-black" style={{ aspectRatio: ratio }}>
      <Carousel items={media} render={(item) => <MediaFill item={item} fit="cover" />} />
    </div>
  );
}

function FeedPreview({ platform, account, type, caption, title, privacy, media }: Props) {
  const t = useTranslations("composer.previewPane");
  const { textFirst, actionLabels, actions, follow } = platform.preview;
  const handle = account.handle.startsWith("@") ? account.handle : `@${account.handle}`;
  return (
    <figure className="mx-auto w-full max-w-[380px] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm" aria-label={t("label", { platform: platform.name })}>
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="relative">
          <Avatar id={account.id} name={account.displayName} size="sm" className="size-9" />
          <PlatformMark id={platform.id} size="sm" className="absolute -bottom-1 -end-1 size-4 rounded-full ring-2 ring-card" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">
            {account.displayName}
            {follow === "follow" && !textFirst ? <span className="ms-1.5 font-semibold text-info">· {t("follow")}</span> : null}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {textFirst && !actionLabels ? <span dir="ltr">{handle} ·</span> : null}
            {t("justNow")}
            {actionLabels ? (
              <>
                {" "}
                · <Globe className="size-3" aria-hidden />
              </>
            ) : null}
          </p>
        </div>
        {privacy && privacy !== "public" ? <PrivacyChip privacy={privacy} /> : null}
        <EllipsisVertical className="size-4 text-muted-foreground" aria-hidden />
      </header>
      {textFirst ? (
        <div className="px-3 pb-2.5">
          {title?.trim() ? <p className="mb-1 text-sm font-semibold">{title}</p> : null}
          <Caption text={caption} />
        </div>
      ) : null}
      <FeedMedia platform={platform} media={media} type={type} />
      <ul className={cn("flex items-center px-2 py-1.5", actionLabels ? "justify-around border-t" : "gap-1")}>
        {actions.map((action, i) => {
          const Icon = actionIcon(action, platform);
          return (
            <li
              key={action}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground",
                !actionLabels && action === "save" && i === actions.length - 1 && "ms-auto",
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
              {actionLabels ? t(`actions.${action}`) : <span className="sr-only">{t(`actions.${action}`)}</span>}
            </li>
          );
        })}
      </ul>
      {!textFirst ? (
        <div className="px-3 pb-3">
          <Caption text={caption} lead={account.handle.replace(/^@/, "")} />
        </div>
      ) : null}
    </figure>
  );
}
