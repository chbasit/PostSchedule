"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  onFile: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  hint?: ReactNode;
  compact?: boolean;
};

// One large button: click (or Enter) opens the file picker, or the camera roll on phones;
// dropping a file works too. While a file is dragged over it, the zone tints and the
// icon lifts.
export function Dropzone({ onFile, accept = "video/*,image/*", disabled, hint, compact }: Props) {
  const t = useTranslations("upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  // dragenter/dragleave also fire for the zone's children; count them to avoid flicker.
  const depth = useRef(0);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current += 1;
          if (!disabled) setOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setOver(false);
          const file = e.dataTransfer.files[0];
          if (file && !disabled) onFile(file);
        }}
        className={cn(
          "group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 text-center transition-[background-color,border-color,transform] duration-200",
          compact ? "py-7" : "py-12",
          over ? "scale-[1.01] border-progress-from bg-sky/25" : "border-input/50 hover:border-foreground/40 hover:bg-muted/60",
          disabled && "bg-muted",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-xl border bg-card transition-[translate,background-color,border-color] duration-300",
            over ? "-translate-y-1 border-transparent bg-sky text-ink" : "group-hover:-translate-y-0.5",
          )}
        >
          <Upload className={cn("size-5", over && "animate-float")} />
        </span>
        <span className="space-y-1">
          <span className="block font-semibold">{over ? t("release") : t("drop")}</span>
          <span className="block text-sm text-muted-foreground">
            {t.rich("orBrowse", { browse: (chunks) => <span className="rounded bg-sky/45 px-1 font-semibold text-foreground">{chunks}</span> })}
          </span>
          {hint ? <span className="block pt-1 text-xs text-muted-foreground">{hint}</span> : null}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
