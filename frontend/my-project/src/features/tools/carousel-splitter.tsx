"use client";

import { Bookmark, ChevronLeft, ChevronRight, Download, Heart, MessageCircle, RotateCcw, Send, Share, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { coverRect, suggestSlides, tileDraws, type FitMode, type Layout, type Size } from "@/lib/tools/tiles";
import { cn } from "@/lib/utils";
import { getPlatform } from "@/providers/catalog";
import { canShareFiles, drawTile, isLowRes, renderTiles, saveBlob, saveZip, shareFiles, twoDigits, type LoadedImage } from "./image-files";
import { ImageDrop, Panel, RangeField, Stepper, useImage, usePan } from "./tool-ui";

// Slide sizes Instagram feeds take (VERIFY with the platform's current guidance).
const SHAPES: Record<"portrait" | "square", Size> = { portrait: { w: 1080, h: 1350 }, square: { w: 1080, h: 1080 } };
type Shape = keyof typeof SHAPES;

const MIN_SLIDES = 2;
// The most photos one carousel takes through Instagram's publishing API (providers/instagram).
const MAX_SLIDES = getPlatform("instagram").maxImages;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Draws the whole strip: every slide side by side, exactly as they will be cut.
function drawStrip(canvas: HTMLCanvasElement, image: LoadedImage, layout: Layout, mode: FitMode, focus: { x: number; y: number }, background: string) {
  const total = { w: layout.cols * layout.tile.w, h: layout.tile.h };
  const k = Math.min(1, 1600 / total.w);
  canvas.width = Math.round(total.w * k);
  canvas.height = Math.round(total.h * k);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const slide = document.createElement("canvas");
  slide.width = Math.round(layout.tile.w * k);
  slide.height = canvas.height;
  tileDraws(image.size, layout, mode, focus).forEach((draw, i) => {
    drawTile(slide, image, draw, layout.tile, background);
    ctx.drawImage(slide, Math.round(i * layout.tile.w * k), 0);
  });
}

export function CarouselSplitter() {
  const t = useTranslations("tools.carouselSplitter");
  const tc = useTranslations("tools.common");
  const locale = useLocale();
  const { state, open, reset, image } = useImage();
  const [slides, setSlides] = useState(3);
  const [shape, setShape] = useState<Shape>("portrait");
  const [mode, setMode] = useState<FitMode>("fill");
  const [focus, setFocus] = useState({ x: 0.5, y: 0.5 });
  const [background, setBackground] = useState("#ffffff");
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState<"zip" | "share" | "one" | null>(null);
  const [failed, setFailed] = useState(false);
  const stripRef = useRef<HTMLCanvasElement>(null);
  const slideRef = useRef<HTMLCanvasElement>(null);

  const tile = SHAPES[shape];
  const layout: Layout = { cols: slides, rows: 1, tile };
  const shown = Math.min(current, slides - 1);
  const fill = mode === "fill" ? "#ffffff" : background;

  // Which way the picture can move in "fill and crop": the axis that gets cropped.
  const crop = image ? coverRect(image.size, (slides * tile.w) / tile.h, focus) : null;
  const slackX = image && crop ? image.size.w - crop.w : 0;
  const slackY = image && crop ? image.size.h - crop.h : 0;
  const movable = mode === "fill" && (slackX > 0.5 || slackY > 0.5);

  useEffect(() => {
    if (!image) return;
    const size = SHAPES[shape];
    const strip: Layout = { cols: slides, rows: 1, tile: size };
    if (stripRef.current) drawStrip(stripRef.current, image, strip, mode, focus, fill);
    if (slideRef.current) {
      const canvas = slideRef.current;
      canvas.width = 540;
      canvas.height = Math.round((540 * size.h) / size.w);
      drawTile(canvas, image, tileDraws(image.size, strip, mode, focus)[shown], size, fill);
    }
  }, [image, slides, shape, mode, focus, fill, shown]);

  const pan = usePan((dx, dy, box) => {
    if (!image || !crop || !movable) return;
    setFocus((f) => ({
      x: slackX > 0.5 ? clamp01(f.x - (dx * (crop.w / box.width)) / slackX) : f.x,
      y: slackY > 0.5 ? clamp01(f.y - (dy * (crop.h / box.height)) / slackY) : f.y,
    }));
  });

  async function onFile(file: File) {
    const opened = await open(file);
    if (!opened) return;
    setSlides(suggestSlides(opened.size, SHAPES[shape], MIN_SLIDES, MAX_SLIDES));
    setFocus({ x: 0.5, y: 0.5 });
    setCurrent(0);
    setFailed(false);
  }

  if (!image) return <ImageDrop state={state} onFile={onFile} />;

  const names = Array.from({ length: slides }, (_, i) => `${image.base}-${twoDigits(i + 1)}.jpg`);
  const shareable = canShareFiles();

  async function run(kind: "zip" | "share" | "one") {
    if (!image || busy) return;
    setBusy(kind);
    setFailed(false);
    try {
      if (kind === "one") {
        const [file] = await renderTiles(image, layout, mode, focus, fill, [names[shown]], [shown]);
        saveBlob(file.blob, file.name);
      } else {
        const files = await renderTiles(image, layout, mode, focus, fill, names);
        if (kind === "zip") await saveZip(files, `${image.base}.zip`);
        else await shareFiles(files);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  const number = new Intl.NumberFormat(locale);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <Panel title={tc("previewTitle")} aside={<span className="text-sm text-muted-foreground">{tc("sizeLine", { count: slides, width: number.format(tile.w), height: number.format(tile.h) })}</span>}>
          <div
            {...(movable ? pan : {})}
            className={cn("relative select-none overflow-hidden rounded-xl border bg-muted", movable && "cursor-grab active:cursor-grabbing")}
            dir="ltr"
          >
            <canvas ref={stripRef} className="block h-auto w-full" aria-label={t("seams")} role="img" />
            {Array.from({ length: slides }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className={cn("absolute inset-y-0 border-white/90", i > 0 && "border-s-2 border-dashed shadow-[0_0_0_1px_rgb(17_18_20/0.15)]")}
                style={{ left: `${(i / slides) * 100}%`, width: `${100 / slides}%` }}
              >
                <span className="tabular absolute start-2 top-2 inline-flex size-6 items-center justify-center rounded-full bg-ink/80 text-xs font-semibold text-white">
                  {i + 1}
                </span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("seams")} {movable ? tc("dragHint") : null}
          </p>
          {isLowRes(image, layout, mode, focus) ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning dark:border dark:border-warning/40">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {tc("lowRes")}
            </p>
          ) : null}
        </Panel>

        <Panel title={t("swipe")}>
          <div className="mx-auto max-w-[360px] overflow-hidden rounded-2xl border bg-card shadow-card">
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <span aria-hidden className="size-8 rounded-full bg-sky" />
              <span className="text-sm font-semibold">yourbrand</span>
            </div>
            <div className="relative" dir="ltr">
              <canvas ref={slideRef} className="block h-auto w-full bg-muted" role="img" aria-label={t("slideOf", { n: shown + 1, count: slides })} />
              <span className="tabular absolute end-3 top-3 rounded-full bg-ink/75 px-2 py-0.5 text-xs font-semibold text-white">
                {shown + 1}/{slides}
              </span>
              {shown > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrent(shown - 1)}
                  aria-label={t("previous")}
                  className="absolute start-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-transform hover:scale-105"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
              ) : null}
              {shown < slides - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrent(shown + 1)}
                  aria-label={t("next")}
                  className="absolute end-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-transform hover:scale-105"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              ) : null}
            </div>
            <div aria-hidden className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5">
              <span className="flex gap-3">
                <Heart className="size-5" />
                <MessageCircle className="size-5" />
                <Send className="size-5" />
              </span>
              <span className="flex gap-1">
                {Array.from({ length: slides }, (_, i) => (
                  <span key={i} className={cn("size-1.5 rounded-full", i === shown ? "bg-chip-blue" : "bg-muted-foreground/40")} />
                ))}
              </span>
              <Bookmark className="size-5 justify-self-end" />
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" size="sm" loading={busy === "one"} onClick={() => run("one")}>
              <Download aria-hidden /> {tc("download")} · {t("slide", { n: shown + 1 })}
            </Button>
          </div>
        </Panel>
      </div>

      <Panel className="space-y-5 lg:sticky lg:top-24">
        <Stepper label={t("slides")} value={slides} min={MIN_SLIDES} max={MAX_SLIDES} onChange={(n) => setSlides(n)} />
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("shape")}</p>
          <Segmented
            size="sm"
            label={t("shape")}
            value={shape}
            onChange={setShape}
            options={[
              { value: "portrait", label: t("portrait") },
              { value: "square", label: t("square") },
            ]}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{tc("fit")}</p>
          <Segmented
            size="sm"
            label={tc("fit")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "fill", label: tc("fill") },
              { value: "fit", label: tc("whole") },
            ]}
          />
        </div>
        {mode === "fill" && slackX > 0.5 ? (
          <RangeField label={tc("horizontal")} value={Math.round(focus.x * 100)} min={0} max={100} onChange={(v) => setFocus((f) => ({ ...f, x: v / 100 }))} />
        ) : null}
        {mode === "fill" && slackY > 0.5 ? (
          <RangeField label={tc("vertical")} value={Math.round(focus.y * 100)} min={0} max={100} onChange={(v) => setFocus((f) => ({ ...f, y: v / 100 }))} />
        ) : null}
        {mode === "fit" ? (
          <label className="flex items-center justify-between gap-3 text-sm font-medium">
            {tc("background")}
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
            />
          </label>
        ) : null}

        <div className="space-y-2 border-t pt-5">
          <Button className="w-full" loading={busy === "zip"} onClick={() => run("zip")}>
            <Download aria-hidden /> {tc("downloadAll")}
          </Button>
          {shareable ? (
            <Button variant="secondary" className="w-full" loading={busy === "share"} onClick={() => run("share")}>
              <Share aria-hidden /> {tc("share")}
            </Button>
          ) : null}
          <Button variant="ghost" className="w-full" onClick={reset}>
            <RotateCcw aria-hidden /> {tc("another")}
          </Button>
          {failed ? (
            <p role="alert" className="text-sm text-danger">
              {tc("exportFailed")}
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
