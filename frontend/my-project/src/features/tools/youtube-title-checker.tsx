"use client";

import { EllipsisVertical, Eraser, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkTitle, cleanSpaces, titleLength, TITLE_LIMIT, type TitleCheck } from "@/lib/tools/title";
import { cn } from "@/lib/utils";
import { SummaryChip, StatusIcon } from "@/features/preflight/preflight-report";
import { useElementWidth, visibleChars } from "./measure";
import { CopyButton, Panel } from "./tool-ui";

// Title type in YouTube's two most common places, approximated (the real layout follows
// the screen size): phone home feed and computer search results, two lines each.
const FONT = "Roboto, Arial, sans-serif";
const PHONE = { css: `500 14px/20px ${FONT}`, canvas: `500 14px ${FONT}`, lines: 2 };
const DESKTOP = { css: `400 18px/26px ${FONT}`, canvas: `400 18px ${FONT}`, lines: 2 };

function worst(checks: TitleCheck[]): TitleCheck["status"] {
  return checks.some((c) => c.status === "block") ? "block" : checks.some((c) => c.status === "warn") ? "warn" : "pass";
}

export function YouTubeTitleChecker() {
  const t = useTranslations("tools.youtubeTitle");
  const [title, setTitle] = useState("");
  const [phoneRef, phoneWidth] = useElementWidth<HTMLParagraphElement>();
  const [deskRef, deskWidth] = useElementWidth<HTMLParagraphElement>();

  const length = titleLength(title);
  const checks = checkTitle(title);
  const empty = title.trim().length === 0;
  const phoneShows = useMemo(() => (title && phoneWidth ? visibleChars(title, phoneWidth, PHONE.canvas, PHONE.lines) : null), [title, phoneWidth]);
  const deskShows = useMemo(() => (title && deskWidth ? visibleChars(title, deskWidth, DESKTOP.canvas, DESKTOP.lines) : null), [title, deskWidth]);

  function message(check: TitleCheck): string {
    const values = { limit: TITLE_LIMIT, over: Math.max(0, length - TITLE_LIMIT) };
    switch (check.id) {
      case "length":
        return check.status === "pass" ? t("checks.length.pass", values) : t("checks.length.block", values);
      case "angleBrackets":
        return check.status === "pass" ? t("checks.angleBrackets.pass") : t("checks.angleBrackets.block");
      case "caps":
        return check.status === "pass" ? t("checks.caps.pass") : t("checks.caps.warn");
      case "punctuation":
        return check.status === "pass" ? t("checks.punctuation.pass") : t("checks.punctuation.warn");
      case "spaces":
        return check.status === "pass" ? t("checks.spaces.pass") : t("checks.spaces.warn");
    }
  }

  const shownNote = (shows: number | null) =>
    shows === null || empty ? null : shows >= length ? t("fits") : t("visible", { count: shows });

  const chars = [...title];
  const display = empty ? t("placeholder") : title;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <Panel>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="yt-title" className="text-sm font-medium">
              {t("label")}
            </label>
            <span className={cn("tabular text-sm font-medium", length > TITLE_LIMIT ? "text-danger" : "text-muted-foreground")}>
              {t("count", { count: length, limit: TITLE_LIMIT })}
            </span>
          </div>
          <Input
            id="yt-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("placeholder")}
            autoComplete="off"
            dir="auto"
            className="mt-2 h-12 text-base"
          />
          {/* What a phone shows, and what it cuts. */}
          {!empty && phoneShows !== null && phoneShows < length ? (
            <p className="mt-3 break-words text-sm" dir="auto">
              <span className="font-medium">{chars.slice(0, phoneShows).join("")}</span>
              <span className="text-muted-foreground line-through decoration-danger/60">{chars.slice(phoneShows).join("")}</span>
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton text={title} variant="primary" />
            {checks.find((c) => c.id === "spaces")?.status === "warn" ? (
              <Button variant="secondary" onClick={() => setTitle(cleanSpaces(title))}>
                <Eraser aria-hidden /> {t("fixSpaces")}
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel title={t("mobile")}>
          <div className="mx-auto max-w-[400px] overflow-hidden rounded-2xl border bg-card shadow-card">
            <div aria-hidden className="relative flex aspect-video items-center justify-center bg-muted">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-ink/80 text-white">
                <Play className="size-6" />
              </span>
              <span className="tabular absolute bottom-2 end-2 rounded bg-ink/85 px-1.5 py-0.5 text-xs font-medium text-white">10:24</span>
            </div>
            <div className="flex gap-3 p-3">
              <span aria-hidden className="size-9 shrink-0 rounded-full bg-sky" />
              <div className="min-w-0 flex-1">
                <p ref={phoneRef} dir="auto" className={cn("line-clamp-2 break-words", empty && "text-muted-foreground")} style={{ font: PHONE.css }}>
                  {display}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("channel")} · {t("meta")}
                </p>
              </div>
              <EllipsisVertical aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            </div>
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground">{shownNote(phoneShows)}</p>
        </Panel>

        <Panel title={t("desktop")}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div aria-hidden className="relative flex aspect-video w-full shrink-0 items-center justify-center rounded-xl bg-muted sm:w-56">
              <Play className="size-6 text-muted-foreground" />
              <span className="tabular absolute bottom-2 end-2 rounded bg-ink/85 px-1.5 py-0.5 text-xs font-medium text-white">10:24</span>
            </div>
            <div className="min-w-0 flex-1">
              <p ref={deskRef} dir="auto" className={cn("line-clamp-2 break-words", empty && "text-muted-foreground")} style={{ font: DESKTOP.css }}>
                {display}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">{t("meta")}</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span aria-hidden className="size-6 rounded-full bg-sky" />
                {t("channel")}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{shownNote(deskShows)}</p>
        </Panel>
        <p className="text-xs text-muted-foreground">{t("approx")}</p>
      </div>

      <Panel title={t("checksTitle")} aside={empty ? null : <SummaryChip status={worst(checks)} />} className="lg:sticky lg:top-24">
        {empty ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {checks.map((check) => (
              <li key={check.id} className="flex items-start gap-2.5 text-sm">
                <StatusIcon status={check.status} className="mt-0.5" />
                <span>{message(check)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
