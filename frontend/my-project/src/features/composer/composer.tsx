"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CircleCheck,
  Eye,
  FileText,
  Film,
  Image as ImageIcon,
  Info,
  Plus,
  Smartphone,
  Sparkles,
  SquarePen,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Banner } from "@/components/banner";
import { PlatformMark } from "@/components/platform-badge";
import { EmptyState, ErrorState } from "@/components/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox, Switch } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useRouter } from "@/i18n/navigation";
import {
  api,
  isApiError,
  type MediaSummary,
  type Post,
  type PostInput,
  type SocialAccount,
  type TargetOptions,
  type UploadHandle,
} from "@/lib/api/client";
import { applyFixes, checkCaption, checkCount, checkMedia, checkTitle, worstStatus, type FixId, type PreflightCheck } from "@/lib/preflight/rules";
import { formatDateTime, formatTime, utcToZoned } from "@/lib/time";
import { useIntentKey } from "@/lib/use-intent-key";
import { cn } from "@/lib/utils";
import { getPlatform, type PlatformId, type PostType } from "@/providers/catalog";
import { AiPanel } from "@/features/ai/ai-panel";
import { AI_ENABLED } from "@/config/site";
import { AiImagePicker } from "@/features/ai-studio/ai-image-picker";
import { AiImageSoon, AiWriterComingSoon, SoonBadge } from "@/features/ai-studio/coming-soon";
import { PlatformReport, StatusIcon, SummaryChip } from "@/features/preflight/preflight-report";
import { useAccounts, useAiImages } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";
import { TagChip } from "@/features/tags/tag-chip";
import { TagPicker } from "@/features/tags/tag-picker";
import { useTagMap } from "@/features/tags/use-tags";
import { AccountBar } from "./account-bar";
import { CaptionEditor } from "./caption-editor";
import { MediaStrip, type MediaItem } from "./media-strip";
import { PostPreview } from "./post-preview";
import { effectiveOptions, PublishOptions } from "./publish-options";
import { useAutosave, type AutosaveStatus } from "./use-autosave";
import { resolveWhen, type WhenState } from "./when-panel";
import { WhenControl } from "./when-control";

type Draft = {
  type: PostType;
  accountIds: string[];
  main: string;
  overrides: Record<string, string>;
  // In the order shown in the caption box.
  media: MediaSummary[];
  // Per-account platform settings (YouTube title, visibility…), by account id.
  options: Record<string, TargetOptions>;
  fixes: Partial<Record<PlatformId, FixId[]>>;
  when: WhenState;
  tagIds: string[];
  aiGenerated: boolean;
};

type Panel = "preview" | "ai";

const TYPES: Array<{ key: PostType; icon: typeof FileText }> = [
  { key: "video", icon: Film },
  { key: "image", icon: ImageIcon },
  { key: "text", icon: FileText },
  { key: "story", icon: Smartphone },
];

const LAST_KEY = "composer:last";
// When no chosen platform says otherwise.
const DEFAULT_IMAGE_CAP = 10;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the server draft still protects the work.
  }
}

function defaultWhen(timezone: string): WhenState {
  // Tomorrow at 09:00 in the user's zone is a sensible first suggestion.
  const tomorrow = utcToZoned(new Date(Date.now() + 86_400_000), timezone).date;
  return { mode: "schedule", timezone, date: tomorrow, time: "09:00" };
}

function fromPost(post: Post, timezone: string): Draft {
  const zone = post.timezone ?? timezone;
  const when = post.scheduledAt ? { mode: "schedule" as const, timezone: zone, ...utcToZoned(new Date(post.scheduledAt), zone) } : defaultWhen(timezone);
  const live = post.targets.filter((t) => t.status !== "skipped");
  return {
    type: post.type,
    accountIds: live.map((t) => t.socialAccountId),
    main: post.mainCaption,
    overrides: Object.fromEntries(live.filter((t) => t.captionOverride).map((t) => [t.socialAccountId, t.captionOverride!])),
    media: post.media,
    options: Object.fromEntries(live.filter((t) => t.options).map((t) => [t.socialAccountId, t.options!])),
    fixes: {},
    when,
    tagIds: post.tagIds ?? [],
    aiGenerated: post.aiGenerated ?? false,
  };
}

// Drafts saved by an older build held one file (or none) and no options.
function restoreDraft(stored: Partial<Draft> & { media?: MediaSummary[] | MediaSummary | null }): Draft {
  const media = Array.isArray(stored.media) ? stored.media : stored.media ? [stored.media] : [];
  return { tagIds: [], aiGenerated: false, options: {}, ...stored, media } as Draft;
}

// Loads what the form needs, then mounts the form with its initial state.
export function Composer() {
  const t = useTranslations("composer");
  const { workspace, user, scope } = useWorkspace();
  const params = useSearchParams();
  const editId = params.get("edit");
  // The calendar's "+" on a day links here with ?date=YYYY-MM-DD.
  const dateParam = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "") ? params.get("date") : null;
  // An account page's "New post" links here with ?account=<id>.
  const accountParam = params.get("account");
  // AI Studio's "Create post" links here with ?ai=<image id>,<image id>.
  const aiParam = params.get("ai")?.split(",").filter(Boolean) ?? [];
  const accounts = useAccounts();
  const aiImages = useAiImages();
  const waitForAi = AI_ENABLED && aiParam.length > 0 && !editId && aiImages.isPending;
  const [formKey, setFormKey] = useState(0);
  const post = useQuery({
    queryKey: [...scope, "post", editId],
    queryFn: () => api.posts.get(workspace.id, editId!),
    enabled: !!editId,
  });

  if (accounts.isPending || (editId && post.isPending) || waitForAi) {
    return (
      <div className="mx-auto max-w-350 space-y-5" aria-busy>
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Skeleton className="h-112 rounded-xl" />
          <Skeleton className="h-112 rounded-xl" />
        </div>
      </div>
    );
  }
  if (accounts.isError) return <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />;
  if (editId && post.isError) return <ErrorState error={post.error} onRetry={() => post.refetch()} />;
  if (post.data && ["published", "publishing", "partial"].includes(post.data.status)) {
    return (
      <EmptyState
        icon={CircleCheck}
        title={t("cannotEditTitle")}
        description={t("cannotEditBody")}
        action={
          <Link href="/dashboard/posts" className={buttonVariants()}>
            {t("backToPosts")}
          </Link>
        }
      />
    );
  }

  const storageKey = `composer:${workspace.id}:${editId ?? "new"}`;
  const aiMedia = editId ? [] : (aiImages.data ?? []).filter((i) => aiParam.includes(i.id)).map((i) => i.media);
  // Images sent from AI Studio start a fresh post instead of reopening the last unsent one.
  const stored = aiMedia.length ? null : readJson<Partial<Draft>>(storageKey);
  const restored = stored ? restoreDraft(stored) : null;
  const last = readJson<{ type: PostType; accountIds: string[] }>(LAST_KEY);
  const usable = (ids: string[]) => ids.filter((id) => accounts.data.some((a) => a.id === id && a.status === "active"));
  const initial: Draft =
    restored ??
    (post.data
      ? fromPost(post.data, user.timezone)
      : {
          type: aiMedia.length ? "image" : (last?.type ?? "video"),
          accountIds: accountParam && usable([accountParam]).length ? [accountParam] : usable(last?.accountIds ?? []),
          main: "",
          overrides: {},
          media: aiMedia.slice(0, DEFAULT_IMAGE_CAP),
          options: {},
          fixes: {},
          when: dateParam ? { ...defaultWhen(user.timezone), date: dateParam } : defaultWhen(user.timezone),
          tagIds: [],
          // AI images carry the platforms' "made with AI" label unless the author turns it off.
          aiGenerated: aiMedia.length > 0,
        });

  return (
    <ComposerForm
      key={`${editId}-${dateParam}-${aiParam.join()}-${formKey}`}
      initial={initial}
      restored={!!restored}
      storageKey={storageKey}
      accounts={accounts.data}
      editPost={post.data ?? null}
      onReset={() => {
        writeJson(storageKey, null);
        setFormKey((k) => k + 1);
      }}
    />
  );
}

type FormProps = {
  initial: Draft;
  restored: boolean;
  storageKey: string;
  accounts: SocialAccount[];
  editPost: Post | null;
  onReset: () => void;
};

function SaveIndicator({ status, savedAt, onRetry }: { status: AutosaveStatus; savedAt: number | null; onRetry: () => void }) {
  const t = useTranslations("composer.autosave");
  const locale = useLocale();
  const { user } = useWorkspace();
  if (status === "saving") return <span className="text-sm text-muted-foreground">{t("saving")}</span>;
  if (status === "pending") return <span className="text-sm text-muted-foreground">{t("pending")}</span>;
  if (status === "conflict") return <span className="text-sm text-danger">{t("conflict")}</span>;
  if (status === "error")
    return (
      <span className="text-sm text-danger">
        {t("error")}{" "}
        <button type="button" className="font-semibold transition-opacity hover:opacity-75" onClick={onRetry}>
          {t("retry")}
        </button>
      </span>
    );
  if (status === "saved" && savedAt)
    return <span className="text-sm text-muted-foreground">{t("savedAt", { time: formatTime(new Date(savedAt), locale, user.timezone, !user.use24h) })}</span>;
  return null;
}

const kindOf = (file: File): "image" | "video" | null => (file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null);

function itemKind(item: MediaItem): "image" | "video" | null {
  return item.phase === "ready" ? item.media.kind : item.phase === "error" ? null : item.kind;
}

function ComposerForm({ initial, restored, storageKey, accounts, editPost, onReset }: FormProps) {
  const t = useTranslations("composer");
  const ta = useTranslations("ai");
  const tc = useTranslations("common");
  const tp = useTranslations("posts");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspace, user, scope } = useWorkspace();
  const tagMap = useTagMap();
  const aiLabelId = useId();
  const anotherId = useId();

  const [draft, setDraft] = useState<Draft>(initial);
  const [dirty, setDirty] = useState(false);
  const [items, setItems] = useState<MediaItem[]>(() => initial.media.map((media) => ({ key: media.id, phase: "ready" as const, media })));
  const [submitted, setSubmitted] = useState<Post | null>(null);
  const [panel, setPanel] = useState<Panel>("preview");
  const [createAnother, setCreateAnother] = useState(false);
  const [now] = useState(() => Date.now());
  const handles = useRef(new Map<string, UploadHandle>());
  const files = useRef(new Map<string, File>());
  const fileInput = useRef<HTMLInputElement>(null);
  const sideRef = useRef<HTMLElement>(null);

  // Server writes run one at a time: autosave and submit share this chain (TEST.md DBL-11).
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const serial = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.current.then(fn, fn);
    chain.current = next.catch(() => undefined);
    return next;
  }, []);
  const serverDraft = useRef<{ id: string; version: number } | null>(editPost ? { id: editPost.id, version: editPost.version } : null);
  const draftKey = useIntentKey();
  const submitKey = useIntentKey();

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }, []);

  const showPanel = (next: Panel) => {
    setPanel(next);
    // Below xl the panel sits under the editor; bring it into view.
    if (window.matchMedia("(max-width: 1279px)").matches) sideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selected = useMemo(() => accounts.filter((a) => draft.accountIds.includes(a.id)), [accounts, draft.accountIds]);
  const platforms = useMemo(() => [...new Set(selected.map((a) => a.provider))].map(getPlatform), [selected]);
  const readyMedia = useMemo(() => items.flatMap((it) => (it.phase === "ready" ? [it.media] : [])), [items]);
  const postMedia = useMemo(() => (draft.type === "text" ? [] : readyMedia), [draft.type, readyMedia]);
  const captionFor = useCallback((a: SocialAccount) => (draft.overrides[a.id]?.trim() ? draft.overrides[a.id] : draft.main), [draft.overrides, draft.main]);
  const imageCap = platforms.some((p) => p.maxImages > 0) ? Math.max(...platforms.map((p) => p.maxImages)) : DEFAULT_IMAGE_CAP;

  // Per platform: the first chosen account stands in for the preview and the checks.
  const reports = useMemo(
    () =>
      platforms.map((platform) => {
        const account = selected.find((a) => a.provider === platform.id)!;
        const caption = captionFor(account);
        const options = effectiveOptions(account, draft.options[account.id], caption);
        const several = postMedia.length > 1;
        const mediaChecks: PreflightCheck[] = postMedia.flatMap((m, i) =>
          checkMedia({ ...m, bitrateKbps: m.durationSec ? Math.round((m.bytes * 8) / m.durationSec / 1000) : null }, platform, {
            vertical: draft.type === "video" || draft.type === "story",
          }).map((c) => (several ? { ...c, subject: t(m.kind === "video" ? "media.videoN" : "media.photoN", { n: i + 1 }), mediaId: m.id } : { ...c, mediaId: m.id })),
        );
        const extra = [
          draft.type === "image" ? checkCount(postMedia.length, platform) : null,
          checkCaption(caption, platform),
          options?.title !== undefined ? checkTitle(options.title, platform) : null,
        ].filter((c): c is PreflightCheck => c !== null);
        return {
          platform,
          account,
          caption,
          options,
          checks: applyFixes([...mediaChecks, ...extra], draft.fixes[platform.id] ?? []),
        };
      }),
    [platforms, selected, captionFor, draft.options, draft.fixes, draft.type, postMedia, t],
  );

  // A badge on each thumbnail with a problem on any chosen platform.
  const issues = useMemo(() => {
    const out: Record<string, "warn" | "block"> = {};
    for (const r of reports)
      for (const c of r.checks) {
        if (!c.mediaId || c.status === "pass") continue;
        if (c.status === "block" || !out[c.mediaId]) out[c.mediaId] = c.status;
      }
    return out;
  }, [reports]);

  const whenResult = resolveWhen(draft.when, now);
  const preflightStatus = reports.length > 0 ? worstStatus(reports.flatMap((r) => r.checks)) : null;
  const blocking = preflightStatus === "block";
  const needsMedia = draft.type !== "text";
  const uploading = items.some((it) => it.phase === "uploading" || it.phase === "paused");
  const unsupported = platforms.filter((p) => !p.capabilities[draft.type]);
  const kindMismatch =
    (draft.type === "video" && (readyMedia.length > 1 || readyMedia.some((m) => m.kind !== "video"))) ||
    (draft.type === "image" && readyMedia.some((m) => m.kind !== "image")) ||
    (draft.type === "story" && readyMedia.length > 1);

  const problems: string[] = [];
  if (selected.length === 0) problems.push(t("problems.accounts"));
  if (unsupported.length > 0)
    problems.push(
      t("problems.unsupported", {
        platforms: new Intl.ListFormat(locale, { type: "conjunction" }).format(unsupported.map((p) => p.name)),
        type: t(`accounts.types.${draft.type}`),
      }),
    );
  if (needsMedia && readyMedia.length === 0 && !uploading) problems.push(t("problems.media"));
  if (kindMismatch) problems.push(t("problems.mediaKind", { type: t(`accounts.types.${draft.type}`) }));
  if (!needsMedia && !draft.main.trim()) problems.push(t("problems.caption"));
  if (blocking) problems.push(t("problems.blocking"));
  if (draft.when.mode === "schedule" && !whenResult.ok) problems.push(t("problems.time"));
  const problemText =
    problems.length === 0 ? "" : problems.length === 1 ? problems[0] : `${problems[0]} ${t("moreProblems", { count: problems.length - 1 })}`;

  const toInput = (intent: PostInput["intent"]): PostInput => ({
    type: draft.type,
    mainCaption: draft.main,
    accountIds: draft.accountIds,
    captionOverrides: draft.overrides,
    targetOptions: Object.fromEntries(
      selected.flatMap((a) => {
        const options = effectiveOptions(a, draft.options[a.id], captionFor(a));
        return options ? [[a.id, options]] : [];
      }),
    ),
    media: postMedia,
    intent,
    scheduledAt: intent === "schedule" && whenResult.ok ? whenResult.scheduledAt : null,
    timezone: draft.when.mode === "now" ? user.timezone : draft.when.timezone,
    tagIds: draft.tagIds,
    aiGenerated: draft.aiGenerated,
  });

  // Autosave: local copy always; a server draft only for new posts and existing drafts.
  const canServerDraft = !editPost || editPost.status === "draft";
  const autosave = useAutosave({
    value: draft,
    enabled: dirty && !submitted,
    isConflict: (e) => isApiError(e) && e.code === "conflict",
    save: (value) => {
      writeJson(storageKey, { ...value, media: readyMedia });
      if (!canServerDraft) return Promise.resolve();
      return serial(async () => {
        const input = toInput("draft");
        if (serverDraft.current) {
          const saved = await api.posts.update(workspace.id, serverDraft.current.id, input, serverDraft.current.version);
          serverDraft.current = { id: saved.id, version: saved.version };
        } else {
          const saved = await api.posts.create(workspace.id, input, { idempotencyKey: draftKey.get() });
          serverDraft.current = { id: saved.id, version: saved.version };
        }
      });
    },
  });

  const submit = useMutation({
    mutationFn: (intent: PostInput["intent"]) =>
      serial(async () => {
        const input = toInput(intent);
        return serverDraft.current
          ? api.posts.update(workspace.id, serverDraft.current.id, input, serverDraft.current.version)
          : api.posts.create(workspace.id, input, { idempotencyKey: submitKey.get() });
      }),
    onSuccess: (post, intent) => {
      writeJson(storageKey, null);
      writeJson(LAST_KEY, { type: draft.type, accountIds: draft.accountIds });
      queryClient.invalidateQueries({ queryKey: [...scope, "posts"] });
      if (intent === "draft") {
        serverDraft.current = { id: post.id, version: post.version };
        router.push("/dashboard/posts?tab=draft");
        return;
      }
      if (createAnother) {
        const tz = post.timezone ?? user.timezone;
        toast.success(
          post.status === "publishing" || !post.scheduledAt
            ? t("done.publishing")
            : t("done.toast", { when: formatDateTime(post.scheduledAt, locale, tz, { dateStyle: "medium", timeStyle: "short" }) }),
        );
        onReset();
        return;
      }
      setSubmitted(post);
    },
  });

  // Inserts AI text; the toast offers an undo because the old caption is replaced.
  function applyAiText(text: string, how: "replace" | "append") {
    const previous = { main: draft.main, aiGenerated: draft.aiGenerated };
    const next = how === "replace" || !previous.main.trim() ? text : `${previous.main.trimEnd()}\n\n${text}`;
    update({ main: next, aiGenerated: true });
    toast.success(ta("inserted"), { action: { label: tc("undo"), onClick: () => update(previous) } });
  }

  // ---- Media: several files, uploaded side by side ----
  function setItem(key: string, fn: (item: MediaItem) => MediaItem) {
    setItems((list) => list.map((it) => (it.key === key ? fn(it) : it)));
  }

  function startUpload(file: File, replaceKey?: string) {
    const kind = kindOf(file);
    if (!kind) return;
    const key = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);
    const item: MediaItem = { key, phase: "uploading", name: file.name, progress: 0, bytes: file.size, kind, localUrl };
    setItems((list) => (replaceKey ? list.map((it) => (it.key === replaceKey ? item : it)) : [...list, item]));
    files.current.set(key, file);
    const handle = api.media.upload(workspace.id, file, (progress) =>
      setItem(key, (it) => (it.phase === "uploading" || it.phase === "paused" ? { ...it, progress } : it)),
    );
    handles.current.set(key, handle);
    handle.promise
      .then((media) => {
        if (handles.current.get(key) !== handle) return;
        handles.current.delete(key);
        URL.revokeObjectURL(localUrl);
        setItem(key, () => ({ key, phase: "ready", media }));
        setDraft((d) => ({ ...d, media: [...d.media, media], fixes: {} }));
        setDirty(true);
      })
      .catch((e) => {
        if (handles.current.get(key) !== handle) return;
        handles.current.delete(key);
        URL.revokeObjectURL(localUrl);
        const cancelled = isApiError(e) && e.details.reason === "cancelled";
        if (cancelled) setItems((list) => list.filter((it) => it.key !== key));
        else setItem(key, () => ({ key, phase: "error", name: file.name, reason: isApiError(e) && e.code === "validation_failed" ? "unsupported" : "failed" }));
      });
  }

  // Dropped, pasted or picked files. The post type follows the first files when the box is
  // empty, so people never have to pick "video" or "image" before adding media.
  function addFiles(list: File[]) {
    for (const f of list.filter((f) => !kindOf(f))) toast.error(t("media.unsupported", { name: f.name }));
    const usable = list.filter((f) => kindOf(f));
    if (usable.length === 0) return;
    const live = items.filter((it) => it.phase !== "error");
    const liveKind = live.length ? itemKind(live[0]) : null;
    let type = draft.type;
    if (live.length === 0 && type !== "story") type = kindOf(usable[0]) === "video" ? "video" : "image";
    const wanted = type === "video" ? "video" : type === "image" ? "image" : (liveKind ?? kindOf(usable[0]));
    const fitting = usable.filter((f) => kindOf(f) === wanted);
    if (fitting.length < usable.length) toast.error(type === "image" ? t("media.photosOnly") : t("media.oneKind"));
    const room = Math.max(0, (type === "image" ? imageCap : 1) - live.length);
    const accepted = fitting.slice(0, room);
    if (fitting.length > accepted.length)
      toast.error(type === "image" ? t("media.tooMany", { max: imageCap }) : type === "story" ? t("media.oneStory") : t("media.oneVideo"));
    if (type !== draft.type) update({ type });
    accepted.forEach((f) => startUpload(f));
  }

  // Images from the AI library are already stored, so they join the post as ready media.
  function addAiMedia(list: MediaSummary[]) {
    const fresh = list.filter((m) => !items.some((it) => it.phase === "ready" && it.media.id === m.id));
    if (fresh.length === 0) return;
    const live = items.filter((it) => it.phase !== "error");
    const type = live.length === 0 && draft.type !== "story" ? "image" : draft.type;
    const accepted = fresh.slice(0, aiRoom);
    if (accepted.length < fresh.length) toast.error(type === "image" ? t("media.tooMany", { max: imageCap }) : t("media.oneStory"));
    if (accepted.length === 0) return;
    setItems((current) => [...current, ...accepted.map((media) => ({ key: media.id, phase: "ready" as const, media }))]);
    setDraft((d) => ({ ...d, type, media: [...d.media, ...accepted], fixes: {}, aiGenerated: true }));
    setDirty(true);
    toast.success(ta("imagesAdded", { count: accepted.length }));
  }

  function removeItem(key: string) {
    const item = items.find((it) => it.key === key);
    const handle = handles.current.get(key);
    handles.current.delete(key);
    files.current.delete(key);
    handle?.cancel();
    if (item && (item.phase === "uploading" || item.phase === "paused") && item.localUrl) URL.revokeObjectURL(item.localUrl);
    setItems((list) => list.filter((it) => it.key !== key));
    if (item?.phase === "ready") update({ media: draft.media.filter((m) => m.id !== item.media.id), fixes: {} });
  }

  // ---- Success state ----
  if (submitted) {
    const tz = submitted.timezone ?? user.timezone;
    return (
      <div className="mx-auto max-w-lg space-y-6 py-10 text-center" role="status">
        <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-tint-green text-tint-green-fg">
          <CircleCheck className="size-8" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{submitted.status === "publishing" ? t("done.publishing") : t("done.scheduled")}</h1>
          {submitted.scheduledAt && submitted.status !== "publishing" ? (
            <p className="text-muted-foreground">
              {t("done.when", {
                when: formatDateTime(submitted.scheduledAt, locale, tz, { dateStyle: "full", timeStyle: "short" }),
                zone: tz.replaceAll("_", " "),
              })}
            </p>
          ) : (
            <p className="text-muted-foreground">{t("done.live")}</p>
          )}
        </div>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/dashboard/posts/calendar" className={buttonVariants({ variant: "secondary" })}>
            <CalendarDays aria-hidden /> {t("done.calendar")}
          </Link>
          <Button onClick={onReset}>
            <Plus aria-hidden /> {t("done.another")}
          </Button>
        </div>
      </div>
    );
  }

  const intent = draft.when.mode === "now" ? "now" : draft.when.mode === "queue" ? "queue" : "schedule";
  const submitError = submit.isError
    ? isApiError(submit.error) && submit.error.code === "conflict"
      ? t("errors.conflict")
      : isApiError(submit.error) && submit.error.details.reason === "past"
        ? t("errors.past")
        : isApiError(submit.error) && submit.error.code === "validation_failed"
          ? t("errors.validation")
          : t("errors.generic")
    : null;
  const selectedTags = draft.tagIds.map((id) => tagMap.get(id)).filter((tag) => tag !== undefined);
  const savingDraft = submit.isPending && submit.variables === "draft";
  const live = items.filter((it) => it.phase !== "error").length;
  const canAdd = draft.type === "image" ? live < imageCap : live === 0;
  // AI images fit an image post, or an empty post of any type but a story's single slot.
  const liveImagesOnly = items.every((it) => it.phase === "error" || itemKind(it) === "image");
  const aiRoom = live === 0 ? (draft.type === "story" ? 1 : imageCap) : draft.type === "image" && liveImagesOnly ? imageCap - live : 0;
  const optionAccounts = selected.filter((a) => getPlatform(a.provider).publishOptions);

  return (
    // Fills the page panel (from lg up) so the action bar sits on its bottom edge even when
    // the form is short.
    <div className="mx-auto flex min-h-full max-w-350 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-tint-peach text-tint-peach-fg">
            <SquarePen className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{editPost ? t("editTitle") : t("title", { type: t(`types.${draft.type}`) })}</h1>
        </div>
        <SaveIndicator status={autosave.status} savedAt={autosave.savedAt} onRetry={() => void autosave.flush()} />
      </div>

      {restored ? (
        <Banner
          tone="info"
          dismissKey={`restored-${storageKey}`}
          action={
            <Button size="sm" variant="ghost" onClick={onReset}>
              {t("discardRestored")}
            </Button>
          }
        >
          {t("restored")}
        </Banner>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t("typeLabel")} className="flex flex-wrap gap-1.5">
          {TYPES.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={draft.type === key}
              onClick={() => update({ type: key })}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
                draft.type === key ? "border-foreground bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <Icon className="size-4" aria-hidden /> {t(`types.${key}`)}
            </button>
          ))}
        </div>
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <TagPicker value={draft.tagIds} onChange={(tagIds) => update({ tagIds })} />
        {selectedTags.map((tag) => (
          <TagChip key={tag.id} tag={tag} onRemove={() => update({ tagIds: draft.tagIds.filter((id) => id !== tag.id) })} />
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Editor */}
        <div className="min-w-0 space-y-4">
          <AccountBar accounts={accounts} type={draft.type} selected={draft.accountIds} onChange={(ids) => update({ accountIds: ids })} />

          <div className="rounded-xl border bg-card">
            <div className="p-4 sm:p-5">
              <CaptionEditor
                main={draft.main}
                overrides={draft.overrides}
                accounts={selected}
                onMainChange={(main) => update({ main })}
                onOverrideChange={(id, v) => update({ overrides: { ...draft.overrides, [id]: v } })}
                onBlur={() => void autosave.flush()}
                onFiles={addFiles}
                onAddMedia={() => fileInput.current?.click()}
                aiAction={AI_ENABLED ? <AiImagePicker room={aiRoom} onPick={addAiMedia} /> : <AiImageSoon />}
                media={
                  <MediaStrip
                    items={items}
                    issues={issues}
                    canAdd={canAdd && items.length > 0}
                    addLabel={t("media.addShort")}
                    onAdd={() => fileInput.current?.click()}
                    onRemove={removeItem}
                    onPause={(key) => {
                      handles.current.get(key)?.pause();
                      setItem(key, (it) => (it.phase === "uploading" ? { ...it, phase: "paused" } : it));
                    }}
                    onResume={(key) => {
                      handles.current.get(key)?.resume();
                      setItem(key, (it) => (it.phase === "paused" ? { ...it, phase: "uploading" } : it));
                    }}
                    onRetry={(key) => {
                      const file = files.current.get(key);
                      if (file) startUpload(file, key);
                    }}
                    onShowChecks={() => showPanel("preview")}
                  />
                }
              />
              <input
                ref={fileInput}
                type="file"
                multiple={draft.type === "image" || items.length === 0}
                accept={draft.type === "video" ? "video/*" : draft.type === "image" && items.length > 0 ? "image/*" : "image/*,video/*"}
                hidden
                tabIndex={-1}
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </div>
            {optionAccounts.map((a) => (
              <PublishOptions
                key={a.id}
                account={a}
                value={draft.options[a.id]}
                caption={captionFor(a)}
                onChange={(next) => update({ options: { ...draft.options, [a.id]: next } })}
              />
            ))}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t px-4 py-3 sm:px-5">
              <Button size="sm" variant="ghost" onClick={() => showPanel("ai")}>
                <Sparkles className="text-tint-violet-fg" aria-hidden /> {t("aiHelp")}
                {AI_ENABLED ? null : <SoonBadge />}
              </Button>
              {/* The hint wraps beside the switch rather than pushing it onto a line of its own. */}
              <div className="flex min-w-0 items-center gap-2.5 sm:ms-auto sm:max-w-sm">
                <Switch
                  checked={draft.aiGenerated}
                  onCheckedChange={(aiGenerated) => update({ aiGenerated })}
                  aria-labelledby={`${aiLabelId}-label`}
                  aria-describedby={`${aiLabelId}-hint`}
                />
                <span>
                  <span id={`${aiLabelId}-label`} className="block text-sm font-medium">
                    {t("aiLabel")}
                  </span>
                  <span id={`${aiLabelId}-hint`} className="block text-xs text-muted-foreground">
                    {t("aiLabelHint")}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel: preview and pre-flight, or the AI assistant */}
        <aside ref={sideRef} className="min-w-0 scroll-mt-20 rounded-xl border bg-card p-4 sm:p-5 xl:sticky xl:top-20" aria-label={t("panelLabel")}>
          <Tabs value={panel} onValueChange={(v) => setPanel(v as Panel)}>
            <TabsList aria-label={t("panelLabel")} className="mb-1">
              <TabsTrigger value="preview" data-testid="panel-preview">
                <Eye aria-hidden /> {t("panel.preview")}
              </TabsTrigger>
              <TabsTrigger value="ai" data-testid="panel-ai">
                <Sparkles aria-hidden /> {t("panel.ai")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="space-y-6">
              {reports.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl bg-muted px-6 py-12 text-center">
                  <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-full bg-card text-tint-blue-fg">
                    <Eye className="size-6" />
                  </span>
                  <p className="font-medium">{t("previewEmptyTitle")}</p>
                  <p className="text-sm text-muted-foreground">{t("previewEmpty")}</p>
                </div>
              ) : (
                <>
                  <Tabs defaultValue={reports[0].platform.id} key={reports.map((r) => r.platform.id).join()}>
                    <TabsList aria-label={t("preview")} className="max-w-full overflow-x-auto">
                      {reports.map((r) => (
                        <TabsTrigger key={r.platform.id} value={r.platform.id}>
                          <PlatformMark id={r.platform.id} size="sm" className="rounded-full" />
                          {r.platform.name}
                          <StatusIcon status={worstStatus(r.checks)} className="size-3.5" />
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {reports.map((r) => (
                      <TabsContent key={r.platform.id} value={r.platform.id} className="pt-2">
                        <PostPreview
                          platform={r.platform}
                          account={r.account}
                          type={draft.type}
                          caption={r.caption}
                          title={r.options?.title}
                          privacy={r.options?.privacy}
                          media={postMedia}
                          fill={(draft.fixes[r.platform.id] ?? []).includes("reframe")}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                  <section aria-labelledby="preflight-title" className="space-y-3">
                    <h2 id="preflight-title" className="text-sm font-semibold">
                      {t("preflight")}
                    </h2>
                    {reports.map((r) => (
                      <PlatformReport
                        key={r.platform.id}
                        platform={r.platform}
                        checks={r.checks}
                        format={draft.type === "video" ? undefined : tp(`types.${draft.type}`)}
                        hasMedia={postMedia.length > 0}
                        onFix={(fix) => update({ fixes: { ...draft.fixes, [r.platform.id]: [...(draft.fixes[r.platform.id] ?? []), fix] } })}
                        onUndoFix={(fix) =>
                          update({ fixes: { ...draft.fixes, [r.platform.id]: (draft.fixes[r.platform.id] ?? []).filter((f) => f !== fix) } })
                        }
                      />
                    ))}
                  </section>
                </>
              )}
            </TabsContent>
            {/* Stays mounted so a suggestion survives a look at the preview. */}
            <TabsContent value="ai" forceMount className="data-[state=inactive]:hidden">
              {AI_ENABLED ? <AiPanel platforms={platforms} currentCaption={draft.main} onInsert={applyAiText} /> : <AiWriterComingSoon />}
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      {submitError ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          {submitError}
        </p>
      ) : null}

      {/* Action bar: stays in reach while scrolling, above the phone navigation (MOB-04). */}
      <div data-action-bar className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-auto border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 lg:bottom-0 lg:-mb-8">
        {/* Phones: options, then what is missing, then timing and submit nearest the thumb. Wider: one
            row, with what is missing next to the button it holds back. */}
        <div className="mx-auto flex max-w-350 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2">
            <Checkbox id={anotherId} checked={createAnother} onCheckedChange={(v) => setCreateAnother(v === true)} />
            <label htmlFor={anotherId} className="cursor-pointer text-sm font-medium">
              {t("createAnother")}
            </label>
          </div>
          <span aria-hidden className="h-5 w-px bg-border" />
          <Button variant="ghost" loading={savingDraft} disabled={submit.isPending && !savingDraft} onClick={() => !submit.isPending && submit.mutate("draft")}>
            {t("saveDraft")}
          </Button>
          <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:basis-0 sm:flex-nowrap">
            {problemText ? (
              <p role="status" title={problemText} className="flex w-full min-w-0 items-center gap-1.5 text-sm text-muted-foreground sm:w-auto">
                <Info className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{problemText}</span>
              </p>
            ) : null}
            <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:shrink-0">
              {preflightStatus ? (
                <button type="button" onClick={() => showPanel("preview")} className="hidden shrink-0 rounded-full sm:block">
                  <SummaryChip status={preflightStatus} />
                  <span className="sr-only">{t("preflightOpen")}</span>
                </button>
              ) : null}
              <WhenControl
                value={draft.when}
                onChange={(when) => update({ when })}
                userTimeZone={user.timezone}
                result={whenResult}
                className="flex-1 sm:flex-none"
              />
              <Button
                className="shrink-0"
                disabled={problems.length > 0 || uploading || savingDraft}
                loading={submit.isPending && !savingDraft}
                onClick={() => !submit.isPending && submit.mutate(intent)}
                data-testid="schedule-post"
              >
                {submit.isPending && !savingDraft ? t("submitting") : t(`submit.${intent}`)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
