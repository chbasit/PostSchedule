"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/controls";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { formatDateTime, zonedToUtc } from "@/lib/time";

export type WhenMode = "now" | "schedule" | "queue";

export type WhenState = { mode: WhenMode; timezone: string; date: string; time: string };

export type WhenResult =
  | { ok: true; scheduledAt: string | null; adjusted: boolean }
  | { ok: false; reason: "missing" | "past" | "invalid" };

export function resolveWhen(when: WhenState, now: number): WhenResult {
  if (when.mode !== "schedule") return { ok: true, scheduledAt: null, adjusted: false };
  if (!when.date || !when.time) return { ok: false, reason: "missing" };
  const r = zonedToUtc(when.date, when.time, when.timezone);
  if (!r.ok) return { ok: false, reason: "invalid" };
  if (r.utc.getTime() <= now) return { ok: false, reason: "past" };
  return { ok: true, scheduledAt: r.utc.toISOString(), adjusted: r.adjusted };
}

type Props = {
  value: WhenState;
  onChange: (v: WhenState) => void;
  userTimeZone: string;
  result: WhenResult;
};

// The user picks the timezone first, then the time (CLAUDE.md conventions).
export function WhenPanel({ value, onChange, userTimeZone, result }: Props) {
  const t = useTranslations("composer.when");
  const locale = useLocale();
  const groupId = useId();

  const error =
    !result.ok && value.mode === "schedule" && value.date && value.time ? t(`errors.${result.reason}`) : undefined;

  return (
    <section aria-labelledby={`${groupId}-title`} className="space-y-3">
      <h2 id={`${groupId}-title`} className="text-sm font-semibold">
        {t("title")}
      </h2>
      <RadioGroup value={value.mode} onValueChange={(mode) => onChange({ ...value, mode: mode as WhenMode })} aria-labelledby={`${groupId}-title`}>
        {(["now", "schedule", "queue"] as const).map((mode) => (
          <label key={mode} className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 has-data-[state=checked]:border-foreground has-data-[state=checked]:bg-sky/25">
            <RadioGroupItem value={mode} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">{t(`modes.${mode}.title`)}</span>
              <span className="block text-xs text-muted-foreground">{t(`modes.${mode}.body`)}</span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {value.mode !== "now" ? (
        <Field label={t("timezone")} hint={value.mode === "queue" ? t("queueHint") : undefined}>
          {(p) => <TimezoneSelect {...p} value={value.timezone} onChange={(timezone) => onChange({ ...value, timezone })} />}
        </Field>
      ) : null}

      {value.mode === "schedule" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("date")} error={error}>
            {(p) => <Input {...p} type="date" value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} />}
          </Field>
          <Field label={t("time")}>
            {(p) => <Input {...p} type="time" value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value })} />}
          </Field>
        </div>
      ) : null}

      {value.mode === "schedule" && result.ok && result.scheduledAt ? (
        <div className="space-y-1 rounded-lg bg-muted px-3 py-2.5 text-sm" aria-live="polite">
          <p>
            {t("summary", {
              when: formatDateTime(result.scheduledAt, locale, value.timezone, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
              zone: value.timezone.replaceAll("_", " "),
            })}
          </p>
          {userTimeZone !== value.timezone ? (
            <p className="text-muted-foreground">
              {t("yourTime", {
                when: formatDateTime(result.scheduledAt, locale, userTimeZone, { weekday: "short", hour: "numeric", minute: "2-digit" }),
              })}
            </p>
          ) : null}
          {result.adjusted ? <p className="text-warning">{t("dstGap")}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
