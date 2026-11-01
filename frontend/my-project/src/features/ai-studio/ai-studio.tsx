"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Download, ImagePlus, Lock, RotateCcw, Sparkles, SquarePen, Trash2, WandSparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Card, Skeleton } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ASPECT_SIZES,
  IMAGE_ASPECTS,
  IMAGE_QUALITIES,
  IMAGE_STYLES,
  MAX_IMAGES_PER_REQUEST,
  PROMPT_MAX,
  type ImageAspect,
  type ImageStyle,
} from "@/lib/ai/images";
import { api, isApiError, usingMockApi, type AiImage, type AiImageInput } from "@/lib/api/client";
import { can } from "@/lib/auth/permissions";
import { AI_COSTS, imageCost, type AiImageQuality } from "@/lib/billing/plans";
import { useMediaUrl } from "@/lib/media-url";
import { useIntentKey } from "@/lib/use-intent-key";
import { cn } from "@/lib/utils";
import { aiCreditsOptions, aiImagesOptions } from "@/features/session/query-options";
import { useAiCredits, useAiImages } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";
import { CreditsCard, CreditsPill } from "./credits";

// A post takes up to ten images (Instagram's carousel limit, the largest the composer allows).
export const MAX_SELECTED = 10;
const IDEAS = ["coffee", "launch", "team"] as const;
const ASPECT_KEY = { "1:1": "square", "4:5": "portrait", "9:16": "story", "16:9": "wide" } as const satisfies Record<ImageAspect, string>;
// Rows, newest first in reading order; tiles keep their own ratio and line up at the top.
const GRID = "grid grid-cols-2 items-start gap-3 md:grid-cols-3 2xl:grid-cols-4";

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  render,
  className,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  disabled?: boolean;
  render: (v: T, active: boolean) => ReactNode;
  className?: string;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">{label}</legend>
      <div className={cn("grid gap-2", className)}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              value === option ? "border-foreground bg-muted font-semibold" : "hover:bg-muted",
            )}
          >
            {render(option, value === option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// A small outline of the frame, so the ratios read at a glance.
function AspectGlyph({ aspect }: { aspect: ImageAspect }) {
  const { width, height } = ASPECT_SIZES[aspect];
  const scale = 18 / Math.max(width, height);
  return (
    <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center">
      <span className="rounded-[3px] border-2 border-current" style={{ width: width * scale, height: height * scale }} />
    </span>
  );
}

function ImageTile({
  image,
  selected,
  onToggle,
  onDelete,
  canEdit,
}: {
  image: AiImage;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const t = useTranslations("aiStudio.library");
  const url = useMediaUrl(image.media);
  const corner = "inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-opacity hover:bg-black/75";
  return (
    <li className={cn("group relative overflow-hidden rounded-xl bg-muted ring-offset-2 ring-offset-background", selected && "ring-2 ring-foreground")}>
      <button type="button" aria-pressed={selected} onClick={onToggle} className="block w-full" title={image.prompt}>
        <span className="sr-only">{t("select", { prompt: image.prompt })}</span>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- the workspace's own file, already sized
          <img src={url} alt="" width={image.media.width} height={image.media.height} className="block h-auto w-full" loading="lazy" />
        ) : (
          <span className="block w-full animate-pulse bg-muted" style={{ aspectRatio: `${image.media.width || 1} / ${image.media.height || 1}` }} />
        )}
      </button>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute start-2 top-2 inline-flex size-6 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-foreground bg-foreground text-background" : "border-white/90 bg-black/25 text-transparent",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      <div className="absolute end-2 top-2 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {url ? (
          <a href={url} download={image.media.name} target="_blank" rel="noreferrer" className={corner} aria-label={t("download")} title={t("download")}>
            <Download className="size-4" aria-hidden />
          </a>
        ) : null}
        {canEdit ? (
          <button type="button" onClick={onDelete} className={corner} aria-label={t("delete")} title={t("delete")}>
            <Trash2 className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent p-3 pt-8 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <p className="line-clamp-2 text-xs leading-snug" dir="auto">
          {image.prompt}
        </p>
        <p className="mt-1 text-[11px] font-medium text-white/80">
          {image.aspect} · {t(`quality.${image.quality}`)}
        </p>
      </div>
    </li>
  );
}

export function AiStudio() {
  const t = useTranslations("aiStudio");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspace, scope } = useWorkspace();
  const credits = useAiCredits();
  const images = useAiImages();
  const key = useIntentKey();
  const canEdit = can(workspace.role, "post.create");

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<ImageStyle>("photo");
  const [aspect, setAspect] = useState<ImageAspect>("1:1");
  const [quality, setQuality] = useState<AiImageQuality>("standard");
  const [count, setCount] = useState(2);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<AiImage | null>(null);

  // A changed request is a new intent, so it gets a new idempotency key (FRONTEND.md §10).
  const change =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      key.renew();
    };

  const cost = imageCost(quality, count);
  const remaining = credits.data?.remaining;
  const short = remaining !== undefined && remaining < cost;

  const generate = useMutation({
    mutationFn: (input: AiImageInput) => api.ai.images.generate(workspace.id, input, { idempotencyKey: key.get() }),
    onSuccess: (result) => {
      key.renew();
      queryClient.setQueryData(aiImagesOptions(workspace.id, scope).queryKey, (old) => [...result.images, ...(old ?? [])]);
      queryClient.setQueryData(aiCreditsOptions(workspace.id, scope).queryKey, result.credits);
      // New images start selected, so "Create post" is one click away.
      setSelected(result.images.map((i) => i.id).slice(0, MAX_SELECTED));
      toast.success(t("generated", { count: result.images.length }));
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: aiCreditsOptions(workspace.id, scope).queryKey }),
  });

  const remove = useMutation({
    mutationFn: (image: AiImage) => api.ai.images.remove(workspace.id, image.id),
    onSuccess: (_, image) => {
      queryClient.setQueryData(aiImagesOptions(workspace.id, scope).queryKey, (old) => old?.filter((i) => i.id !== image.id));
      setSelected((s) => s.filter((id) => id !== image.id));
      setDeleting(null);
      toast.success(t("library.deleted"));
    },
    onError: () => toast.error(t("library.deleteFailed")),
  });

  function submit() {
    if (generate.isPending || !prompt.trim() || short || !canEdit) return;
    generate.mutate({ prompt: prompt.trim(), style, aspect, quality, count });
  }

  function toggle(id: string) {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= MAX_SELECTED) {
        toast.error(t("selection.max", { max: MAX_SELECTED }));
        return s;
      }
      return [...s, id];
    });
  }

  const err = generate.error;
  const errorKey = isApiError(err)
    ? err.code === "plan_limit_reached"
      ? "credits"
      : err.code === "not_configured"
        ? "notConfigured"
        : err.code === "validation_failed"
          ? "invalid"
          : err.code === "rate_limited"
            ? "busy"
            : "generic"
    : "generic";

  const list = images.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24">
      <PageHeader icon={WandSparkles} tint="violet" title={t("title")} description={t("subtitle")} actions={<CreditsPill className="px-3 py-1 text-sm" />} />

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <CreditsCard />
          <Card className="p-4 sm:p-5">
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {!canEdit ? (
                <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
                  <Lock className="size-4 shrink-0" aria-hidden /> {t("viewerNote")}
                </p>
              ) : null}
              <Field
                label={t("form.prompt")}
                hint={t("form.promptHint")}
                labelAside={
                  prompt ? (
                    <button type="button" onClick={() => change(setPrompt)("")} className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground">
                      <X className="size-3.5" aria-hidden /> {t("form.clear")}
                    </button>
                  ) : null
                }
              >
                {(p) => (
                  <Textarea
                    {...p}
                    value={prompt}
                    onChange={(e) => change(setPrompt)(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder={t("form.placeholder")}
                    rows={4}
                    maxLength={PROMPT_MAX}
                    disabled={!canEdit}
                    className="min-h-28"
                    dir="auto"
                  />
                )}
              </Field>
              {!prompt && canEdit ? (
                <div className="-mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("form.try")}</span>
                  {IDEAS.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => change(setPrompt)(t(`ideas.${idea}`))}
                      className="rounded-full border border-tint-violet-line bg-tint-violet px-2.5 py-0.5 text-xs font-medium transition-colors hover:border-foreground/40"
                    >
                      {t(`ideaLabels.${idea}`)}
                    </button>
                  ))}
                </div>
              ) : null}

              <ChoiceGroup
                label={t("form.style")}
                value={style}
                options={IMAGE_STYLES}
                onChange={change(setStyle)}
                disabled={!canEdit}
                className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3"
                render={(s) => t(`styles.${s}`)}
              />

              <ChoiceGroup
                label={t("form.aspect")}
                value={aspect}
                options={IMAGE_ASPECTS}
                onChange={change(setAspect)}
                disabled={!canEdit}
                className="grid-cols-2"
                render={(a) => (
                  <>
                    <AspectGlyph aspect={a} />
                    <span className="min-w-0">
                      <span className="block">{a}</span>
                      <span className="block text-xs font-normal text-muted-foreground">{t(`aspects.${ASPECT_KEY[a]}`)}</span>
                    </span>
                  </>
                )}
              />

              <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("form.quality")}</p>
                  <Segmented
                    label={t("form.quality")}
                    size="sm"
                    value={quality}
                    onChange={change(setQuality)}
                    options={IMAGE_QUALITIES.map((q) => ({ value: q, label: t(`form.qualities.${q}`, { credits: AI_COSTS.image[q] }) }))}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("form.count")}</p>
                  <Segmented
                    label={t("form.count")}
                    size="sm"
                    value={String(count)}
                    onChange={(v) => change(setCount)(Number(v))}
                    options={Array.from({ length: MAX_IMAGES_PER_REQUEST }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                  />
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("form.cost")}</span>
                  <span className="tabular font-semibold">{t("form.credits", { count: cost })}</span>
                </p>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canEdit || !prompt.trim() || short}
                  loading={generate.isPending}
                  data-testid="ai-image-generate"
                >
                  <Sparkles aria-hidden /> {t("form.generate", { count })}
                </Button>
                {short ? (
                  <p className="text-xs text-tint-amber-fg">
                    {t("form.notEnough", { remaining: remaining ?? 0 })}{" "}
                    <Link href="/dashboard/settings/billing" className="font-semibold underline-offset-2 hover:underline">
                      {t("form.upgrade")}
                    </Link>
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">{t("form.disclaimer")}</p>
                {usingMockApi ? <p className="text-xs text-muted-foreground">{t("previewNote")}</p> : null}
              </div>
            </form>
          </Card>
        </aside>

        <section aria-labelledby="ai-library" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="ai-library" className="text-lg font-semibold">
              {t("library.title")}
              {images.isSuccess && list.length ? <span className="tabular ms-2 text-sm font-normal text-muted-foreground">{list.length}</span> : null}
            </h2>
            {list.length ? <p className="text-sm text-muted-foreground">{t("library.hint")}</p> : null}
          </div>

          {generate.isError && !generate.isPending ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-bg p-4 text-sm text-danger">
              <p>{t(`errors.${errorKey}`)}</p>
              {errorKey === "credits" ? (
                <Link href="/dashboard/settings/billing" className="font-semibold transition-opacity hover:opacity-75">
                  {t("form.upgrade")}
                </Link>
              ) : errorKey !== "notConfigured" ? (
                <Button size="sm" variant="secondary" onClick={submit}>
                  <RotateCcw aria-hidden /> {t("retry")}
                </Button>
              ) : null}
            </div>
          ) : null}

          {generate.isPending ? (
            <div role="status" aria-live="polite" className="space-y-3 rounded-xl border border-tint-violet-line bg-tint-violet p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-tint-violet-fg">
                <Sparkles className="size-4 animate-pulse" aria-hidden /> {t("generating", { count: generate.variables?.count ?? count })}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: generate.variables?.count ?? count }, (_, i) => {
                  const size = ASPECT_SIZES[generate.variables?.aspect ?? aspect];
                  return <Skeleton key={i} className="w-full rounded-lg bg-card/70" style={{ aspectRatio: `${size.width} / ${size.height}` }} />;
                })}
              </div>
            </div>
          ) : null}

          {images.isPending ? (
            <div className={GRID} aria-busy>
              {["aspect-square", "aspect-4/5", "aspect-square", "aspect-4/5", "aspect-square", "aspect-4/5"].map((c, i) => (
                <Skeleton key={i} className={cn("w-full rounded-xl", c)} />
              ))}
            </div>
          ) : images.isError ? (
            <ErrorState error={images.error} onRetry={() => images.refetch()} />
          ) : list.length === 0 && !generate.isPending ? (
            <EmptyState icon={ImagePlus} title={t("library.emptyTitle")} description={t("library.emptyBody")} />
          ) : (
            <ul className={GRID} aria-label={t("library.title")}>
              {list.map((image) => (
                <ImageTile
                  key={image.id}
                  image={image}
                  selected={selected.includes(image.id)}
                  onToggle={() => toggle(image.id)}
                  onDelete={() => setDeleting(image)}
                  canEdit={canEdit}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {selected.length > 0 ? (
        <div className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-4 lg:bottom-6 lg:ps-60">
          <div role="region" aria-label={t("selection.label")} className="flex animate-fade-up items-center gap-2 rounded-full bg-popover py-2 pe-2 ps-4 shadow-menu dark:ring-1 dark:ring-white/10">
            <span className="tabular text-sm font-medium">{t("selection.count", { count: selected.length })}</span>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              {t("selection.clear")}
            </Button>
            {canEdit ? (
              <Button size="sm" className="rounded-full" onClick={() => router.push(`/dashboard/create?ai=${selected.join(",")}`)} data-testid="ai-create-post">
                <SquarePen aria-hidden /> {t("selection.createPost")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader title={t("library.deleteTitle")} description={t("library.deleteBody")} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{t("library.cancel")}</Button>
            </DialogClose>
            <Button variant="destructive" loading={remove.isPending} onClick={() => deleting && !remove.isPending && remove.mutate(deleting)}>
              <Trash2 aria-hidden /> {t("library.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
