"use client";

import { Check, ImagePlus, Sparkles, WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import type { AiImage, MediaSummary } from "@/lib/api/client";
import { useMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { useAiImages } from "@/features/session/queries";
import { CreditsPill } from "./credits";

function PickTile({ image, selected, onToggle }: { image: AiImage; selected: boolean; onToggle: () => void }) {
  const t = useTranslations("aiStudio.library");
  const url = useMediaUrl(image.media);
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        title={image.prompt}
        className={cn("relative block aspect-square w-full overflow-hidden rounded-lg bg-muted ring-offset-2 ring-offset-popover", selected && "ring-2 ring-foreground")}
      >
        <span className="sr-only">{t("select", { prompt: image.prompt })}</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- the workspace's own file */}
        {url ? <img src={url} alt="" className="size-full object-cover" loading="lazy" /> : null}
        <span
          aria-hidden
          className={cn(
            "absolute start-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full border-2",
            selected ? "border-foreground bg-foreground text-background" : "border-white/90 bg-black/25 text-transparent",
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
        <span className="absolute bottom-1 end-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">{image.aspect}</span>
      </button>
    </li>
  );
}

/**
 * Adds images from the workspace's AI library to the post. Generating happens in AI Studio;
 * the composer's draft is saved, so going there and back loses nothing.
 */
export function AiImagePicker({ room, onPick }: { room: number; onPick: (media: MediaSummary[]) => void }) {
  const t = useTranslations("aiStudio.picker");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const images = useAiImages();
  const list = images.data ?? [];

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= room ? s : [...s, id]));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSelected([]);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={room <= 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-tint-violet-fg transition-colors hover:bg-tint-violet disabled:cursor-not-allowed disabled:text-muted-foreground"
          data-testid="ai-image-picker"
        >
          <WandSparkles className="size-4" aria-hidden /> {t("open")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader title={t("title")} description={t("body", { max: room })} />
        <div className="mb-3 flex items-center justify-between gap-2">
          <CreditsPill />
          <Link href="/dashboard/ai-studio" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Sparkles aria-hidden /> {t("generateNew")}
          </Link>
        </div>
        {images.isPending ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : images.isError ? (
          <ErrorState error={images.error} onRetry={() => images.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={ImagePlus}
            title={t("emptyTitle")}
            description={t("emptyBody")}
            action={
              <Link href="/dashboard/ai-studio" className={buttonVariants({ size: "sm" })}>
                <WandSparkles aria-hidden /> {t("openStudio")}
              </Link>
            }
          />
        ) : (
          <ul className="grid max-h-[50dvh] grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4" aria-label={t("title")}>
            {list.map((image) => (
              <PickTile key={image.id} image={image} selected={selected.includes(image.id)} onToggle={() => toggle(image.id)} />
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              onPick(list.filter((i) => selected.includes(i.id)).map((i) => i.media));
              setOpen(false);
              setSelected([]);
            }}
          >
            {t("add", { count: selected.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
