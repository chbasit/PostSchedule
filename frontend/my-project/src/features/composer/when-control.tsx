"use client";

import { CalendarClock, ChevronDown, Send, Timer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { WhenPanel, type WhenResult, type WhenState } from "./when-panel";

type Props = {
  value: WhenState;
  onChange: (v: WhenState) => void;
  userTimeZone: string;
  result: WhenResult;
  className?: string;
};

// The timing summary in the composer's action bar; the full controls open in a popover.
export function WhenControl({ value, onChange, userTimeZone, result, className }: Props) {
  const t = useTranslations("composer.when");
  const locale = useLocale();
  const invalid = value.mode === "schedule" && !result.ok;

  const summary =
    value.mode === "now"
      ? t("summaryNow")
      : value.mode === "queue"
        ? t("summaryQueue")
        : result.ok && result.scheduledAt
          ? formatDateTime(result.scheduledAt, locale, value.timezone, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
          : t("summaryPick");
  const Icon = value.mode === "now" ? Send : value.mode === "queue" ? Timer : CalendarClock;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          className={cn("min-w-0 max-w-full gap-2 px-3", invalid && "border-destructive text-destructive", className)}
          aria-label={t("change", { when: summary })}
          data-testid="when-control"
        >
          <Icon aria-hidden />
          <span className="flex-1 truncate text-start">{summary}</span>
          <ChevronDown className="text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-[min(22rem,calc(100vw-2rem))] p-4">
        <WhenPanel value={value} onChange={onChange} userTimeZone={userTimeZone} result={result} />
        <PopoverClose asChild>
          <Button className="mt-4 w-full" variant="secondary">
            {t("done")}
          </Button>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}
