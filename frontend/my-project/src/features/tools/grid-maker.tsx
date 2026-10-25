"use client";

import { Download, RotateCcw, Share, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { coverRect, postingStep, suggestRows, tileDraws, type Layout, type Size } from "@/lib/tools/tiles";
import { cn } from "@/lib/utils";
import { canShareFiles, drawTile, isLowRes, renderTiles, saveBlob, saveZip, shareFiles, twoDigits } from "./image-files";
import { ImageDrop, Panel, RangeField, useImage, usePan } from "./tool-ui";

// Tile shapes for the profile grid. Instagram's grid shows posts as 3:4 rectangles
// (VERIFY: it has changed before); 4:5 and 1:1 cover older grids.
const SHAPES: Record<"tall" | "portrait" | "square", Size> = {
  tall: { w: 1080, h: 1440 },
  portrait: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
};
type Shape = keyof typeof SHAPES;

const COLS = 3;
const ROW_CHOICES = ["1", "2", "3", "4"] as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function GridMaker() {
  const t = useTranslations("tools.gridMaker");
  const tc = useTranslations("tools.common");
  const locale = useLocale();
  const { state, open, reset, image } = useImage();
  const [rows, setRows] = useState(3);
  const [shape, setShape] = useState<Shape>("tall");
  const [focus, setFocus] = useState({ x: 0.5, y: 0.5 });
  const [busy, setBusy] = useState<"zip" | "share" | number | null>(null);
  const [failed, setFailed] = useState(false);
  const tilesRef = useRef<HTMLDivElement>(null);

  const tile = SHAPES[shape];
  const layout: Layout = { cols: COLS, rows, tile };
  const total = COLS * rows;
  const crop = image ? coverRect(image.size, (COLS * tile.w) / (rows * tile.h), focus) : null;
  const slackX = image && crop ? image.size.w - crop.w : 0;
  const slackY = image && crop ? image.size.h - crop.h : 0;

  useEffect(() => {
    if (!image || !tilesRef.current) return;
    const size = SHAPES[shape];
    const draws = tileDraws(image.size, { cols: COLS, rows, tile: size }, "fill", focus);
    tilesRef.current.querySelectorAll("canvas").forEach((canvas, i) => {
      canvas.width = 360;
      canvas.height = Math.round((360 * size.h) / size.w);
      if (draws[i]) drawTile(canvas, image, draws[i], size, "#ffffff");
    });
  }, [image, rows, shape, focus]);

  const pan = usePan((dx, dy, box) => {
    if (!image || !crop) return;
    setFocus((f) => ({
      x: slackX > 0.5 ? clamp01(f.x - (dx * (crop.w / box.width)) / slackX) : f.x,
      y: slackY > 0.5 ? clamp01(f.y - (dy * (crop.h / box.height)) / slackY) : f.y,
    }));
  });

  async function onFile(file: File) {
    const opened = await open(file);
    if (!opened) return;
    setRows(suggestRows(opened.size, SHAPES[shape], COLS, 1, 4));
    setFocus({ x: 0.5, y: 0.5 });
    setFailed(false);
  }

  if (!image) return <ImageDrop state={state} onFile={onFile} />;

  // Files are named by posting step, so sorting them by name is the order to post them.
  const order = Array.from({ length: total }, (_, step) => total - 1 - step);
  const names = order.map((_, step) => `${image.base}-${twoDigits(step + 1)}.jpg`);
  const shareable = canShareFiles();

  async function run(kind: "zip" | "share" | number) {
    if (!image || busy !== null) return;
    setBusy(kind);
    setFailed(false);
    try {
      if (typeof kind === "number") {
        const step = postingStep(kind, total);
        const [file] = await renderTiles(image, layout, "fill", focus, "#ffffff", [names[step - 1]], [kind]);
        saveBlob(file.blob, file.name);
      } else {
        const files = await renderTiles(image, layout, "fill", focus, "#ffffff", names, order);
        if (kind === "zip") await saveZip(files, `${image.base}-grid.zip`);
        else await shareFiles(files);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  const number = new Intl.NumberFormat(locale);
  const movable = slackX > 0.5 || slackY > 0.5;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel
        title={tc("previewTitle")}
        aside={<span className="text-sm text-muted-foreground">{tc("sizeLine", { count: total, width: number.format(tile.w), height: number.format(tile.h) })}</span>}
      >
        <div className="mx-auto max-w-[520px]">
          <div
            ref={tilesRef}
            {...(movable ? pan : {})}
            dir="ltr"
            className={cn("grid select-none grid-cols-3 gap-0.5 overflow-hidden rounded-lg bg-border", movable && "cursor-grab active:cursor-grabbing")}
          >
            {Array.from({ length: total }, (_, i) => {
              const step = postingStep(i, total);
              return (
                <button
                  key={`${rows}-${shape}-${i}`}
                  type="button"
                  onClick={() => run(i)}
                  aria-label={`${tc("download")}: ${t("post", { n: step })}`}
                  className="group relative block bg-muted focus-visible:z-10"
                >
                  <canvas className="block h-auto w-full" />
                  <span className="tabular absolute start-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-ink/80 text-xs font-semibold text-white">
                    {busy === i ? "…" : step}
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center bg-ink/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <Download className="size-6" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{t("order")}:</span> {t("orderHint")} {movable ? tc("dragHint") : null}
        </p>
        {isLowRes(image, layout, "fill", focus) ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning dark:border dark:border-warning/40">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {tc("lowRes")}
          </p>
        ) : null}
      </Panel>

      <Panel className="space-y-5 lg:sticky lg:top-24">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("rows")}</p>
          <Segmented
            size="sm"
            label={t("rows")}
            value={String(rows) as (typeof ROW_CHOICES)[number]}
            onChange={(v) => setRows(Number(v))}
            options={ROW_CHOICES.map((r) => ({ value: r, label: r }))}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("shape")}</p>
          <Segmented
            size="sm"
            label={t("shape")}
            value={shape}
            onChange={setShape}
            className="flex-wrap"
            options={[
              { value: "tall", label: t("tall") },
              { value: "portrait", label: t("portrait") },
              { value: "square", label: t("square") },
            ]}
          />
          <p className="text-xs text-muted-foreground">{t("shapeHint")}</p>
        </div>
        {slackX > 0.5 ? (
          <RangeField label={tc("horizontal")} value={Math.round(focus.x * 100)} min={0} max={100} onChange={(v) => setFocus((f) => ({ ...f, x: v / 100 }))} />
        ) : null}
        {slackY > 0.5 ? (
          <RangeField label={tc("vertical")} value={Math.round(focus.y * 100)} min={0} max={100} onChange={(v) => setFocus((f) => ({ ...f, y: v / 100 }))} />
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
