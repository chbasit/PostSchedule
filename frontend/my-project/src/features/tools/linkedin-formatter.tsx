"use client";

import {
  Bold,
  Code,
  Globe,
  Info,
  Italic,
  List,
  ListOrdered,
  MessageCircle,
  RemoveFormatting,
  Repeat2,
  Send,
  Strikethrough,
  ThumbsUp,
  Underline,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/input";
import { clearFormatting, countUnits, toggleList, toggleMark, toggleStyle } from "@/lib/tools/styled-text";
import { cn } from "@/lib/utils";
import { getPlatform } from "@/providers/catalog";
import { useElementWidth, wrapLines } from "./measure";
import { CopyButton, Panel } from "./tool-ui";

const LIMIT = getPlatform("linkedin").captionLimit;

// LinkedIn's feed text: the system UI font at 14 px on 20 px lines, folded after three lines.
const POST_FONT = "14px system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FOLD_LINES = 3;
// Until the preview is measured: the feed's text width on a computer and on a phone.
const TEXT_WIDTH = { desktop: 520, mobile: 328 } as const;

type ActionKey = "bold" | "italic" | "boldItalic" | "mono" | "underline" | "strike" | "bullets" | "numbers" | "clear";

const ACTIONS: Array<Array<{ key: ActionKey; icon: LucideIcon | null; shortcut?: string }>> = [
  [
    { key: "bold", icon: Bold, shortcut: "b" },
    { key: "italic", icon: Italic, shortcut: "i" },
    { key: "boldItalic", icon: null },
    { key: "mono", icon: Code },
    { key: "underline", icon: Underline, shortcut: "u" },
    { key: "strike", icon: Strikethrough },
  ],
  [
    { key: "bullets", icon: List },
    { key: "numbers", icon: ListOrdered },
  ],
  [{ key: "clear", icon: RemoveFormatting }],
];

export function LinkedInFormatter() {
  const t = useTranslations("tools.linkedinFormatter");
  const tc = useTranslations("tools.common");
  const [text, setText] = useState("");
  const [needsSelection, setNeedsSelection] = useState(false);
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const [expanded, setExpanded] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  // Where the selection goes once the new text is on screen.
  const reselect = useRef<[number, number] | null>(null);

  useLayoutEffect(() => {
    const range = reselect.current;
    if (!range || !area.current) return;
    reselect.current = null;
    area.current.focus();
    area.current.setSelectionRange(range[0], range[1]);
  }, [text]);

  function apply(key: ActionKey) {
    const el = area.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    if (key === "bullets" || key === "numbers") {
      const r = toggleList(text, start, end, key === "bullets" ? "bullet" : "number");
      reselect.current = [r.start, r.end];
      setText(r.text);
      setNeedsSelection(false);
      return;
    }
    if (start === end) {
      setNeedsSelection(true);
      el.focus();
      return;
    }
    const part = text.slice(start, end);
    const next =
      key === "clear" ? clearFormatting(part) : key === "underline" || key === "strike" ? toggleMark(part, key) : toggleStyle(part, key);
    reselect.current = [start, start + next.length];
    setText(text.slice(0, start) + next + text.slice(end));
    setNeedsSelection(false);
  }

  // Ctrl or Cmd with B, I or U, like any editor.
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const action = ACTIONS.flat().find((a) => a.shortcut === e.key.toLowerCase());
    if (!action) return;
    e.preventDefault();
    apply(action.key);
  }

  const [bodyRef, bodyWidth] = useElementWidth<HTMLDivElement>();
  const used = countUnits(text);
  const folds = useMemo(() => wrapLines(text, bodyWidth || TEXT_WIDTH[view], POST_FONT).length > FOLD_LINES, [text, view, bodyWidth]);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel title={t("editor")}>
        <div role="toolbar" aria-label={t("toolbar")} className="mb-3 flex flex-wrap items-center gap-1 rounded-xl border bg-muted/50 p-1">
          {ACTIONS.map((group, g) => (
            <div key={g} className={cn("flex items-center gap-0.5", g > 0 && "border-s ps-1")}>
              {group.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  title={t(key)}
                  aria-label={t(key)}
                  // Keep the text selected while the toolbar is pressed.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => apply(key)}
                  className="inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-card hover:shadow-sm [&_svg]:size-4"
                >
                  {Icon ? <Icon aria-hidden /> : <span aria-hidden className="text-sm font-bold italic">BI</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <label htmlFor="li-post" className="sr-only">
          {t("editor")}
        </label>
        <Textarea
          id="li-post"
          ref={area}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setNeedsSelection(false);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("placeholder")}
          aria-describedby="li-count li-note"
          className="min-h-72 resize-y text-[15px]"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p role="status" className={cn("text-sm", needsSelection ? "text-warning" : "sr-only")}>
            {needsSelection ? t("selectFirst") : ""}
          </p>
          <p id="li-count" className={cn("tabular ms-auto font-medium", used > LIMIT ? "text-danger" : "text-muted-foreground")}>
            <span className="sr-only">{t("countLabel")}: </span>
            {t("count", { count: used, limit: LIMIT })}
          </p>
        </div>
        {used > LIMIT ? (
          <p role="alert" className="mt-1 text-sm text-danger">
            {t("over", { count: used - LIMIT })}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CopyButton text={text} variant="primary" />
        </div>
        <div id="li-note" className="mt-5 space-y-2 text-xs text-muted-foreground">
          <p>{t("countNote")}</p>
          <p className="flex items-start gap-1.5">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            {t("a11yNote")}
          </p>
        </div>
      </Panel>

      <Panel
        title={tc("previewTitle")}
        aside={
          <Segmented
            size="sm"
            label={tc("previewTitle")}
            value={view}
            onChange={(v) => {
              setView(v);
              setExpanded(false);
            }}
            options={[
              { value: "desktop", label: t("desktop") },
              { value: "mobile", label: t("mobile") },
            ]}
          />
        }
      >
        <div className={cn("mx-auto overflow-hidden rounded-xl border bg-card shadow-card transition-[max-width] duration-300", view === "desktop" ? "max-w-[552px]" : "max-w-[360px]")}>
          <div className="flex items-start gap-2.5 p-4 pb-2">
            <span aria-hidden className="size-12 shrink-0 rounded-full bg-sky" />
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-semibold">{t("you")}</p>
              <p className="truncate text-xs text-muted-foreground">{t("headline")}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                {t("now")} · <Globe className="size-3" aria-hidden />
              </p>
            </div>
          </div>
          <div ref={bodyRef} className="px-4 pb-3" dir="auto">
            {text ? (
              <>
                <p
                  className={cn("whitespace-pre-wrap break-words text-sm leading-5", folds && !expanded && "line-clamp-3")}
                  style={{ fontFamily: POST_FONT.replace(/^14px /, "") }}
                >
                  {text}
                </p>
                {folds && !expanded ? (
                  <button type="button" onClick={() => setExpanded(true)} className="mt-0.5 text-sm font-semibold text-muted-foreground hover:underline">
                    {t("seeMore")}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("previewEmpty")}</p>
            )}
          </div>
          <div aria-hidden className="flex justify-around border-t px-2 py-2 text-muted-foreground">
            <ThumbsUp className="size-5" />
            <MessageCircle className="size-5" />
            <Repeat2 className="size-5" />
            <Send className="size-5" />
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t("foldHint")}</p>
      </Panel>
    </div>
  );
}
