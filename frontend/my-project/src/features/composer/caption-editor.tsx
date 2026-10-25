"use client";

import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SocialAccount } from "@/lib/api/client";
import { captionLength } from "@/lib/preflight/rules";
import { cn } from "@/lib/utils";
import { getPlatform } from "@/providers/catalog";
import { PlatformMark } from "@/components/platform-badge";

type Props = {
  main: string;
  overrides: Record<string, string>;
  accounts: SocialAccount[];
  onMainChange: (v: string) => void;
  onOverrideChange: (accountId: string, v: string) => void;
  onBlur: () => void;
  // Media lives inside the caption box, under the text (the strip of thumbnails).
  media: ReactNode;
  // Files dropped on or pasted into the box.
  onFiles: (files: File[]) => void;
  onAddMedia: () => void;
};

function Counter({ text, limit, label }: { text: string; limit: number; label: string }) {
  const n = captionLength(text);
  const over = n > limit;
  return (
    <span className={cn("tabular", over ? "font-medium text-danger" : "text-muted-foreground")}>
      {n} / {limit} {label}
    </span>
  );
}

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

// One main caption, plus tabs to override per account. Text, media and counters share one
// box: drop files anywhere on it, or paste an image into the text.
export function CaptionEditor({ main, overrides, accounts, onMainChange, onOverrideChange, onBlur, media, onFiles, onAddMedia }: Props) {
  const t = useTranslations("composer.caption");
  const tm = useTranslations("composer.media");
  const [over, setOver] = useState(false);
  // dragenter/dragleave also fire for children; count them to avoid flicker.
  const depth = useRef(0);

  const box = (textarea: ReactNode, counters: ReactNode) => (
    <div
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => hasFiles(e) && e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "relative rounded-lg border border-input bg-background transition-colors hover:border-foreground/60 has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:outline has-[textarea:focus-visible]:outline-1 has-[textarea:focus-visible]:-outline-offset-2 has-[textarea:focus-visible]:outline-ring",
      )}
    >
      {textarea}
      {media}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-2 py-1.5 text-xs">
        <button
          type="button"
          onClick={onAddMedia}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ImagePlus className="size-4" aria-hidden /> {tm("add")}
        </button>
        <span className="hidden text-muted-foreground sm:inline">{tm("dropHint")}</span>
        <span className="ms-auto flex flex-wrap justify-end gap-x-3 gap-y-1">{counters}</span>
      </div>
      {over ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex animate-fade-in flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-progress-from bg-highlight/90 text-sm font-semibold text-highlight-foreground backdrop-blur-[1px]">
          <ImagePlus className="size-6 animate-float" aria-hidden />
          {tm("dropHere")}
        </div>
      ) : null}
    </div>
  );

  const textareaClass = "block min-h-36 w-full resize-y bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground";
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length) {
      e.preventDefault();
      onFiles(files);
    }
  };

  return (
    <section aria-labelledby="caption-title" className="space-y-2">
      <h2 id="caption-title" className="sr-only">
        {t("title")}
      </h2>
      <Tabs defaultValue="main">
        {accounts.length > 0 ? (
          <TabsList aria-label={t("tabsLabel")}>
            <TabsTrigger value="main">{t("main")}</TabsTrigger>
            {accounts.map((a) => (
              <TabsTrigger key={a.id} value={a.id}>
                <PlatformMark id={a.provider} size="sm" className="rounded-full" />
                {getPlatform(a.provider).name}
                {overrides[a.id]?.trim() ? <span className="size-1.5 rounded-full bg-coral" aria-label={t("customised")} /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : null}
        <TabsContent value="main">
          {box(
            <textarea
              value={main}
              onChange={(e) => onMainChange(e.target.value)}
              onBlur={onBlur}
              onPaste={onPaste}
              placeholder={t("placeholder")}
              aria-label={t("main")}
              dir="auto"
              rows={6}
              className={textareaClass}
              data-testid="caption-main"
            />,
            [...new Set(accounts.map((a) => a.provider))].map((p) => (
              <Counter key={p} text={main} limit={getPlatform(p).captionLimit} label={getPlatform(p).name} />
            )),
          )}
        </TabsContent>
        {accounts.map((a) => (
          <TabsContent key={a.id} value={a.id} className="space-y-1.5">
            {box(
              <textarea
                value={overrides[a.id] ?? ""}
                onChange={(e) => onOverrideChange(a.id, e.target.value)}
                onBlur={onBlur}
                onPaste={onPaste}
                placeholder={main || t("overridePlaceholder")}
                aria-label={t("overrideLabel", { platform: getPlatform(a.provider).name, handle: a.handle })}
                dir="auto"
                rows={6}
                className={textareaClass}
              />,
              <Counter text={overrides[a.id]?.trim() ? overrides[a.id] : main} limit={getPlatform(a.provider).captionLimit} label="" />,
            )}
            <p className="text-xs text-muted-foreground">{overrides[a.id]?.trim() ? t("usingOverride") : t("usingMain")}</p>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
