"use client";

import { AtSign, CircleCheck, CircleDashed, CircleX, ExternalLink, Info, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { PlatformMark } from "@/components/platform-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkHandle, HANDLE_SPECS, suggestHandles, type HandlePlatform, type HandleRule } from "@/lib/tools/handles";
import { cn } from "@/lib/utils";
import { getPlatform } from "@/providers/catalog";
import { CopyButton, Panel } from "./tool-ui";

// One checker for each platform's username rules. Availability is the person's own check:
// the profile link opens the platform (no scraping, CLAUDE.md rule 11).
export function UsernameChecker({ platform }: { platform: HandlePlatform }) {
  const t = useTranslations("tools.username");
  const tc = useTranslations("tools.common");
  const [raw, setRaw] = useState("");
  const spec = HANDLE_SPECS[platform];
  const name = getPlatform(platform).name;
  const result = useMemo(() => checkHandle(raw, platform), [raw, platform]);
  const ideas = useMemo(() => suggestHandles(raw, platform), [raw, platform]);
  const empty = result.handle.length === 0;

  const ruleText = (rule: HandleRule) => (rule === "length" ? t("rules.length", { min: spec.min, max: spec.max }) : t(`rules.${rule}`));

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Panel>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="handle" className="text-sm font-medium">
            {t("label")}
          </label>
          <span className={cn("tabular text-sm font-medium", result.length > spec.max ? "text-danger" : "text-muted-foreground")}>
            {t("count", { count: result.length, max: spec.max })}
          </span>
        </div>
        <div className="relative mt-2">
          <AtSign className="pointer-events-none absolute inset-s-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="handle"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={t("placeholder")}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            dir="ltr"
            className="h-12 ps-11 text-base"
          />
        </div>

        <div role="status" className="mt-4">
          {empty ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : result.valid ? (
            <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success-bg p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm font-medium text-success">
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="break-all">{t("valid", { handle: result.handle, platform: name })}</span>
              </p>
              <a href={spec.profileUrl(result.handle)} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
                <ExternalLink aria-hidden /> {t("open")}
              </a>
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-bg p-4 text-sm font-medium text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="break-all">{t("invalid", { handle: result.handle, platform: name })}</span>
            </p>
          )}
          {!empty && result.valid ? <p className="mt-2 text-xs text-muted-foreground">{t("openHint", { platform: name })}</p> : null}
        </div>

        <h2 className="mt-6 flex items-center gap-2 text-sm font-semibold">
          <PlatformMark id={platform} size="sm" />
          {t("rulesTitle", { platform: name })}
        </h2>
        <ul className="mt-3 space-y-2.5">
          {result.results.map(({ rule, ok }) => {
            const Icon = empty ? CircleDashed : ok ? CircleCheck : CircleX;
            return (
              <li key={rule} className="flex items-start gap-2.5 text-sm">
                <Icon className={cn("mt-0.5 size-4 shrink-0", empty ? "text-muted-foreground" : ok ? "text-success" : "text-danger")} aria-hidden />
                <span>
                  {ruleText(rule)}
                  {empty ? null : <span className="sr-only">: {ok ? tc("passes") : tc("fails")}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-xs text-muted-foreground">
          {tc("rulesPending", { platform: name })}{" "}
          <a href={spec.source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground transition-opacity hover:opacity-75">
            {tc("rulesLink", { platform: name })}
          </a>
        </p>
      </Panel>

      <Panel title={t("ideas")}>
        {ideas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("ideasEmpty")}</p>
        ) : (
          <ul className="-mx-2 divide-y">
            {ideas.map((idea) => (
              <li key={idea} className="flex items-center gap-2 px-2 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-sm" dir="ltr">
                  @{idea}
                </span>
                <CopyButton text={idea} compact variant="ghost" label={`${tc("copy")} @${idea}`} />
                <a
                  href={spec.profileUrl(idea)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("openIdea", { handle: idea, platform: name })}
                  title={t("openIdea", { handle: idea, platform: name })}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                >
                  <ExternalLink aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          {t("availability", { platform: name })}
        </p>
      </Panel>
    </div>
  );
}
