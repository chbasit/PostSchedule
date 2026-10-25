"use client";

import { CircleCheck, CircleX, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlatformMark } from "@/components/platform-badge";
import { Button } from "@/components/ui/button";
import { worstStatus, type CheckStatus, type FixId, type PreflightCheck } from "@/lib/preflight/rules";
import { cn } from "@/lib/utils";
import type { PlatformDescriptor } from "@/providers/catalog";

const STATUS: Record<CheckStatus, { icon: LucideIcon; className: string }> = {
  pass: { icon: CircleCheck, className: "text-success" },
  warn: { icon: TriangleAlert, className: "text-warning" },
  block: { icon: CircleX, className: "text-danger" },
};

export function StatusIcon({ status, className }: { status: CheckStatus; className?: string }) {
  const { icon: Icon, className: tone } = STATUS[status];
  return <Icon className={cn("size-4 shrink-0", tone, className)} aria-hidden />;
}

export function SummaryChip({ status }: { status: CheckStatus }) {
  const t = useTranslations("preflight");
  const tone =
    status === "pass" ? "bg-success-bg text-success" : status === "warn" ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger";
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium dark:border dark:border-current/40", tone)}>
      <StatusIcon status={status} className="size-3.5 text-current" />
      {t(`summary.${status}`)}
    </span>
  );
}

type PlatformReportProps = {
  platform: PlatformDescriptor;
  checks: PreflightCheck[];
  // Shown after the platform name; defaults to the platform's video format.
  format?: string;
  onFix?: (fix: FixId) => void;
  onUndoFix?: (fix: FixId) => void;
  // Text-only posts have no file to send, so no "original file" note.
  hasMedia?: boolean;
};

// Icon, rule title, one-line explanation, optional fix button (FRONTEND.md §5 "Pre-flight item").
export function PlatformReport({ platform, checks, format, onFix, onUndoFix, hasMedia = true }: PlatformReportProps) {
  const t = useTranslations("preflight");
  const worst = worstStatus(checks);
  const issues = checks.filter((c) => c.status !== "pass");
  const passed = checks.filter((c) => c.status === "pass");
  const anyFixed = checks.some((c) => c.fixed);
  // With several files, list only what needs attention and sum up the rest.
  const several = checks.some((c) => c.subject);
  const shown = several ? [...issues, ...passed.filter((c) => c.fixed)] : [...issues, ...passed];
  const hidden = several ? passed.filter((c) => !c.fixed).length : 0;

  return (
    <section aria-labelledby={`pf-${platform.id}`} className="rounded-lg border bg-card">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <PlatformMark id={platform.id} />
        <div className="min-w-0 flex-1">
          <h3 id={`pf-${platform.id}`} className="truncate text-sm font-semibold">
            {platform.name} · {format ?? platform.video.format}
          </h3>
        </div>
        <SummaryChip status={worst} />
      </header>
      <ul className="divide-y">
        {shown.map((check) => (
          <li key={`${check.subject ?? ""}:${check.rule}`} className="flex items-start gap-3 px-4 py-3">
            <StatusIcon status={check.status} className="mt-0.5" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium">
                {check.subject ? `${check.subject} · ` : ""}
                {t(`rules.${check.rule}.title`)}
                <span className="sr-only">: {t(`summary.${check.status}`)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {check.fixed
                  ? t(`fixed.${check.fix!}`, { target: String(check.values.target ?? "") })
                  : t(`rules.${check.rule}.${check.status}`, check.values)}
              </p>
            </div>
            {check.fix && check.status !== "pass" && onFix ? (
              <Button size="sm" variant="secondary" onClick={() => onFix(check.fix!)}>
                {t(`fixes.${check.fix}`, { target: String(check.values.target ?? "") })}
              </Button>
            ) : null}
            {check.fixed && onUndoFix ? (
              <Button size="sm" variant="ghost" onClick={() => onUndoFix(check.fix!)}>
                {t("undoFix")}
              </Button>
            ) : null}
          </li>
        ))}
        {hidden > 0 ? (
          <li className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
            <StatusIcon status="pass" />
            {t("othersPassed", { count: hidden })}
          </li>
        ) : null}
      </ul>
      {worst === "pass" && !anyFixed && hasMedia ? (
        <p className="flex items-center gap-2 border-t px-4 py-3 text-sm text-success">
          <ShieldCheck className="size-4" aria-hidden />
          {t("sendOriginal")}
        </p>
      ) : null}
    </section>
  );
}
