"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Check,
  Copy,
  CornerDownLeft,
  FaceSlightlySmiling,
  ListPlus,
  Minus,
  PenLine,
  Plus,
  Repeat2,
  RotateCcw,
  Ruler,
  Sparkles,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { api, isApiError, usingMockApi, type AiResult, type AiRewriteAction } from "@/lib/api/client";
import { captionLength } from "@/lib/preflight/rules";
import { cn } from "@/lib/utils";
import type { PlatformDescriptor } from "@/providers/catalog";
import { aiCreditsOptions } from "@/features/session/query-options";
import { useWorkspace } from "@/features/session/workspace-context";

const INTRO_KEY = "ai-intro-seen";
const flagListeners = new Set<() => void>();

function readFlag() {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

function useIntroSeen(): [boolean, () => void] {
  const seen = useSyncExternalStore(
    (l) => {
      flagListeners.add(l);
      return () => flagListeners.delete(l);
    },
    readFlag,
    () => false,
  );
  const markSeen = () => {
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Shown again next visit; harmless.
    }
    flagListeners.forEach((l) => l());
  };
  return [seen, markSeen];
}

const ACTIONS: Array<{ key: AiRewriteAction; icon: LucideIcon }> = [
  { key: "rephrase", icon: Repeat2 },
  { key: "shorten", icon: Minus },
  { key: "expand", icon: Plus },
  { key: "casual", icon: FaceSlightlySmiling },
  { key: "formal", icon: Briefcase },
];

function RefineActions({ onAction, disabled }: { onAction: (a: AiRewriteAction) => void; disabled: boolean }) {
  const t = useTranslations("ai.actions");
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map(({ key, icon: Icon }) => (
        <Button key={key} size="sm" variant="secondary" disabled={disabled} onClick={() => onAction(key)} className="border-tint-violet-line">
          <Icon className="text-tint-violet-fg" aria-hidden /> {t(key)}
        </Button>
      ))}
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const t = useTranslations("ai");
  const points: Array<{ key: "draft" | "polish" | "fit"; icon: LucideIcon }> = [
    { key: "draft", icon: PenLine },
    { key: "polish", icon: WandSparkles },
    { key: "fit", icon: Ruler },
  ];
  return (
    <div className="space-y-4 rounded-xl border border-tint-violet-line bg-tint-violet p-5">
      <span aria-hidden className="inline-flex size-11 items-center justify-center rounded-full bg-card text-tint-violet-fg">
        <Sparkles className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-semibold">{t("introTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("introBody")}</p>
      </div>
      <ul className="space-y-2.5">
        {points.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-center gap-3 text-sm">
            <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-tint-violet-fg">
              <Icon className="size-4" />
            </span>
            {t(`introPoints.${key}`)}
          </li>
        ))}
      </ul>
      <Button className="w-full" onClick={onStart}>
        {t("start")}
      </Button>
    </div>
  );
}

type LastRequest = { kind: "generate"; prompt: string } | { kind: "rewrite"; text: string; action: AiRewriteAction };

type Props = {
  platforms: PlatformDescriptor[];
  currentCaption: string;
  onInsert: (text: string, how: "replace" | "append") => void;
};

/**
 * Writing help inside the composer. It calls the API's /ai routes; in preview mode a sample
 * writer stands in, and the panel says so.
 */
export function AiPanel({ platforms, currentCaption, onInsert }: Props) {
  const t = useTranslations("ai");
  const locale = useLocale();
  const { workspace, scope } = useWorkspace();
  const queryClient = useQueryClient();
  const [introSeen, markIntroSeen] = useIntroSeen();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<AiResult | null>(null);
  const [last, setLast] = useState<LastRequest | null>(null);
  const [copied, setCopied] = useState(false);

  // The strictest limit among the chosen platforms; a sensible default before any are picked.
  const maxLength = platforms.length > 0 ? Math.min(...platforms.map((p) => p.captionLimit)) : 2200;

  const run = useMutation({
    mutationFn: (req: LastRequest) =>
      req.kind === "generate"
        ? api.ai.generate(workspace.id, { prompt: req.prompt, platforms: platforms.map((p) => p.id), maxLength, locale })
        : api.ai.rewrite(workspace.id, { text: req.text, action: req.action, maxLength, locale }),
    onSuccess: (r) => {
      setResult(r);
      setCopied(false);
    },
    // The sidebar and AI Studio show the same balance.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: aiCreditsOptions(workspace.id, scope).queryKey }),
  });

  const send = (req: LastRequest) => {
    if (run.isPending) return;
    setLast(req);
    run.mutate(req);
  };

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  const creditsError = isApiError(run.error) && run.error.code === "plan_limit_reached";

  // The tab that holds this panel already names it, so there is no heading here.
  return (
    <div className="space-y-4">
      {!introSeen ? (
        <Intro onStart={markIntroSeen} />
      ) : (
        <>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) send({ kind: "generate", prompt: prompt.trim() });
            }}
          >
            <Field
              label={t("promptLabel")}
              hint={t("tip")}
              labelAside={
                prompt ? (
                  <button type="button" onClick={() => setPrompt("")} className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground">
                    <X className="size-3.5" aria-hidden /> {t("clearPrompt")}
                  </button>
                ) : null
              }
            >
              {(p) => (
                <Textarea
                  {...p}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && prompt.trim()) {
                      e.preventDefault();
                      send({ kind: "generate", prompt: prompt.trim() });
                    }
                  }}
                  placeholder={t("placeholder")}
                  rows={4}
                  maxLength={600}
                  className="min-h-24"
                  dir="auto"
                />
              )}
            </Field>
            <Button type="submit" className="w-full" disabled={!prompt.trim()} loading={run.isPending && last?.kind === "generate"} data-testid="ai-generate">
              <Sparkles aria-hidden /> {result ? t("generateAgain") : t("generate")}
            </Button>
          </form>

          {!result && !run.isPending && currentCaption.trim() ? (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">{t("improveTitle")}</p>
              <RefineActions disabled={run.isPending} onAction={(action) => send({ kind: "rewrite", text: currentCaption, action })} />
            </div>
          ) : null}

          {run.isPending ? (
            <div role="status" aria-live="polite" className="space-y-2.5 rounded-xl border border-tint-violet-line bg-tint-violet p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-tint-violet-fg">
                <Sparkles className="size-4 animate-pulse" aria-hidden /> {t("writing")}
              </p>
              <Skeleton className="h-3 w-full bg-card/70" />
              <Skeleton className="h-3 w-11/12 bg-card/70" />
              <Skeleton className="h-3 w-3/5 bg-card/70" />
            </div>
          ) : null}

          {run.isError && !run.isPending ? (
            <div role="alert" className="space-y-2 rounded-xl border border-danger/30 bg-danger-bg p-4 text-sm text-danger">
              <p>{creditsError ? t("errors.credits") : t("errors.generic")}</p>
              {creditsError ? (
                <Link href="/dashboard/settings/billing" className="font-semibold transition-opacity hover:opacity-75">
                  {t("errors.creditsAction")}
                </Link>
              ) : last ? (
                <Button size="sm" variant="secondary" onClick={() => send(last)}>
                  <RotateCcw aria-hidden /> {t("retry")}
                </Button>
              ) : null}
            </div>
          ) : null}

          {result && !run.isPending ? (
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl border border-tint-violet-line bg-tint-violet p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-tint-violet-fg">{t("result")}</p>
                <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed" dir="auto">
                  {result.text}
                </p>
                <p className={cn("text-xs", captionLength(result.text) > maxLength ? "font-semibold text-danger" : "text-muted-foreground")}>
                  {t("fitsLimit", { count: captionLength(result.text), max: maxLength })}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => onInsert(result.text, "replace")} data-testid="ai-insert">
                    <CornerDownLeft className="rtl:-scale-x-100" aria-hidden /> {t("insert")}
                  </Button>
                  {currentCaption.trim() ? (
                    <Button size="sm" variant="secondary" onClick={() => onInsert(result.text, "append")}>
                      <ListPlus aria-hidden /> {t("append")}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => last && send(last)}>
                    <RotateCcw aria-hidden /> {t("retry")}
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={copied ? t("copied") : t("copy")} onClick={copy}>
                    {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("refineTitle")}</p>
                <RefineActions disabled={run.isPending} onAction={(action) => send({ kind: "rewrite", text: result.text, action })} />
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
            {result?.creditsRemaining != null ? (
              <p className="inline-flex items-center gap-1.5 rounded-full border border-tint-violet-line bg-tint-violet px-2.5 py-0.5 font-medium text-foreground">
                <Sparkles className="size-3 text-tint-violet-fg" aria-hidden />
                {t("credits", { count: result.creditsRemaining })}
              </p>
            ) : null}
            <p>{t("disclaimer")}</p>
            {usingMockApi ? <p>{t("previewNote")}</p> : null}
          </div>
        </>
      )}
    </div>
  );
}
