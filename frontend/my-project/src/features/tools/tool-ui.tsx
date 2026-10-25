"use client";

import { Check, Copy, ImagePlus, Lock, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Dropzone } from "@/features/preflight/dropzone";
import { ImageOpenError, openImage, type LoadedImage } from "./image-files";

// Small pieces the free tools share.

export function Panel({ title, children, className, aside }: { title?: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={cn("card-surface p-5 sm:p-6", className)}>
      {title || aside ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="font-semibold">{title}</h2> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

// Copies text and says so for two seconds (and to screen readers). `compact` is icon-only,
// for lists; the label then names what is copied.
export function CopyButton({
  text,
  label,
  variant = "secondary",
  compact = false,
  className,
}: {
  text: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("tools.common");
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state !== "copied") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={compact ? "icon-sm" : "md"}
        onClick={copy}
        disabled={!text}
        className={className}
        aria-label={compact ? (label ?? t("copy")) : undefined}
        title={compact ? (label ?? t("copy")) : undefined}
      >
        {state === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
        {compact ? null : state === "copied" ? t("copied") : (label ?? t("copy"))}
      </Button>
      <span role="status" className="sr-only">
        {state === "copied" ? t("copied") : state === "failed" ? t("copyFailed") : ""}
      </span>
      {state === "failed" ? <p className="text-sm text-danger">{t("copyFailed")}</p> : null}
    </>
  );
}

// A labelled slider with its value written out.
export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  display?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-2", disabled && "opacity-50")}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {display ? <span className="tabular text-sm text-muted-foreground">{display}</span> : null}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-coral disabled:cursor-not-allowed"
      />
    </div>
  );
}

// Minus / value / plus, for small counts such as slides or rows.
export function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={id} className="text-sm font-medium">
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="inline-flex items-center rounded-full border p-1">
        <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={`${label} −`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus aria-hidden />
        </Button>
        <output aria-live="polite" className="tabular w-9 text-center text-sm font-semibold">
          {value}
        </output>
        <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={`${label} +`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus aria-hidden />
        </Button>
      </div>
    </div>
  );
}

type ImageState = { phase: "idle" } | { phase: "opening"; name: string } | { phase: "error"; code: ImageOpenError["code"] } | { phase: "ready"; image: LoadedImage };

// Picks and opens one image; keeps the object URL alive until the next one or unmount.
export function useImage() {
  const [state, setState] = useState<ImageState>({ phase: "idle" });
  const current = useRef<LoadedImage | null>(null);
  useEffect(() => {
    const opened = current;
    return () => {
      if (opened.current) URL.revokeObjectURL(opened.current.url);
    };
  }, []);

  async function open(file: File): Promise<LoadedImage | null> {
    setState({ phase: "opening", name: file.name });
    try {
      const image = await openImage(file);
      if (current.current) URL.revokeObjectURL(current.current.url);
      current.current = image;
      setState({ phase: "ready", image });
      return image;
    } catch (e) {
      setState({ phase: "error", code: e instanceof ImageOpenError ? e.code : "unreadable" });
      return null;
    }
  }

  function reset() {
    if (current.current) URL.revokeObjectURL(current.current.url);
    current.current = null;
    setState({ phase: "idle" });
  }

  return { state, open, reset, image: state.phase === "ready" ? state.image : null };
}

// Dragging on a preview moves the picture; the handler gets the movement in CSS pixels and
// the preview's box, and works out the new focus itself. The pointer is only captured once
// it has moved a few pixels, so a plain click still reaches buttons inside the preview.
// Touch is left to scroll the page; the position sliders do the job there.
export function usePan(onPan: (dx: number, dy: number, box: DOMRect) => void) {
  const last = useRef<{ x: number; y: number; moving: boolean } | null>(null);
  return {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.pointerType === "touch" || e.button !== 0) return;
      last.current = { x: e.clientX, y: e.clientY, moving: false };
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const from = last.current;
      if (!from) return;
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      if (!from.moving) {
        if (Math.abs(dx) + Math.abs(dy) < 4) return;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      last.current = { x: e.clientX, y: e.clientY, moving: true };
      onPan(dx, dy, e.currentTarget.getBoundingClientRect());
    },
    onPointerUp() {
      last.current = null;
    },
    onPointerCancel() {
      last.current = null;
    },
  };
}

// The empty state of an image tool: drop area, opening spinner, error and privacy note.
export function ImageDrop({ state, onFile }: { state: ImageState; onFile: (file: File) => void }) {
  const t = useTranslations("tools.common");
  return (
    <div className="card-surface space-y-3 p-3 sm:p-4">
      {state.phase === "opening" ? (
        <div role="status" className="flex animate-fade-in flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-progress-from bg-highlight/50 py-16 text-center">
          <Spinner className="size-6" />
          <p className="font-medium">{t("opening", { name: state.name })}</p>
        </div>
      ) : (
        <Dropzone accept="image/*" onFile={onFile} hint={t("imageHint")} />
      )}
      {state.phase === "error" ? (
        <p role="alert" className="flex items-start gap-2 px-1 text-sm text-danger">
          <ImagePlus className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t(`imageErrors.${state.code}`)}
        </p>
      ) : null}
      <p className="flex items-center justify-center gap-2 pb-1 text-sm text-muted-foreground">
        <Lock className="size-4" aria-hidden /> {t("privacy")}
      </p>
    </div>
  );
}
