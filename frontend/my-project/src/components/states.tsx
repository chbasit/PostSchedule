"use client";

import { CircleX, RefreshCw, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { errorCode } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

// Never a blank area: what this is, plus one next action (FRONTEND.md §9).
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex animate-fade-up flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center", className)}>
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-sky/45 text-ink dark:text-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

// What happened, why, what to do, plus Retry. No raw codes without a sentence.
export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const t = useTranslations("errors");
  const code = errorCode(error);
  const known = ["network", "timeout", "unauthenticated", "not_found", "rate_limited", "not_configured"] as const;
  const key = (known as readonly string[]).includes(code) ? (code as (typeof known)[number]) : "generic";
  return (
    <div role="alert" className={cn("flex animate-fade-up flex-col items-center gap-3 rounded-xl border px-6 py-10 text-center", className)}>
      <CircleX className="size-8 text-danger" aria-hidden />
      <div className="max-w-md space-y-1">
        <p className="font-medium">{t(`${key}.title`)}</p>
        <p className="text-sm text-muted-foreground">{t(`${key}.body`)}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw aria-hidden /> {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}
