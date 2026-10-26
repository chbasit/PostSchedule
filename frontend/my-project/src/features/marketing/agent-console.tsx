"use client";

import { Bot, Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// The tool calls an agent would make through the planned MCP server (BACKEND.md §7.5);
// the names are code, so they stay in English.
const STEPS = [
  { tool: "get_preflight", key: "preflight" },
  { tool: "create_draft", key: "drafts" },
  { tool: "schedule_post", key: "schedule" },
] as const;

// One console line, faded in after the ones before it.
function Line({ index, shown, className, children }: { index: number; shown: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn(shown ? "animate-fade-up" : "opacity-0", className)} style={{ animationDelay: `${index * 420}ms` }}>
      {children}
    </div>
  );
}

// A mock-up of an AI agent planning posts through the API (coming soon): the request,
// three tool calls with their results, and the reply. The lines appear one after another
// once the console is in view; with reduced motion they appear together.
export function AgentConsole({ className }: { className?: string }) {
  const t = useTranslations("marketing.home.ai.console");
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <figure ref={ref} className={cn("overflow-hidden rounded-3xl bg-card", className)}>
      <figcaption className="sr-only">{t("label")}</figcaption>
      <div aria-hidden>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="flex gap-1.5" dir="ltr">
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Bot className="size-4" />
            {t("title")}
          </span>
          <span className="ms-auto rounded-full bg-card-lavender px-2.5 py-0.5 text-xs font-semibold">{t("soon")}</span>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <Line index={0} shown={shown} className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-ee-md bg-foreground px-4 py-2.5 text-sm text-background">{t("prompt")}</p>
          </Line>
          <Line index={1} shown={shown}>
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-linear-to-br from-card-lavender to-card-aqua text-foreground">
                <Sparkles className="size-3.5" />
              </span>
              {t("agent")}
            </p>
          </Line>
          {STEPS.map((step, i) => (
            <Line key={step.key} index={2 + i} shown={shown}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-muted px-3 py-2.5">
                <code dir="ltr" className="font-mono text-xs font-semibold">
                  <span className="text-muted-foreground">› </span>
                  {step.tool}()
                </code>
                <span className="ms-auto inline-flex items-center gap-1.5 text-xs font-medium">
                  <Check className="size-3.5 text-success" strokeWidth={3} />
                  {t(`steps.${step.key}`)}
                </span>
              </div>
            </Line>
          ))}
          <Line index={5} shown={shown}>
            <p className="rounded-2xl rounded-ss-md bg-card-aqua px-4 py-2.5 text-sm">{t("reply")}</p>
          </Line>
        </div>
      </div>
    </figure>
  );
}
