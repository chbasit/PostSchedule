// Timezone helpers. All timestamps are stored as UTC; the user picks a zone first,
// then a local date and time (CLAUDE.md conventions, TEST.md UNIT-05).

const FALLBACK_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Kathmandu",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function listTimeZones(): string[] {
  try {
    const zones = Intl.supportedValuesOf("timeZone");
    return zones.includes("UTC") ? zones : ["UTC", ...zones];
  } catch {
    return FALLBACK_ZONES;
  }
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

function partsInZone(instant: number, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const get = (type: string) =>
    Number(fmt.formatToParts(new Date(instant)).find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

// Offset of `timeZone` from UTC at a given instant, in minutes.
export function zoneOffsetMinutes(instant: number, timeZone: string): number {
  const p = partsInZone(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const truncated = Math.floor(instant / 60000) * 60000;
  return Math.round((asUtc - truncated) / 60000);
}

export type ZonedResult =
  | { ok: true; utc: Date; adjusted: false }
  // The local time does not exist (DST gap); we move forward to the next valid minute.
  | { ok: true; utc: Date; adjusted: true }
  | { ok: false };

/**
 * Converts a wall-clock date ("2026-10-28") and time ("09:00") in `timeZone` to UTC.
 * Rule for ambiguous times (DST overlap): the earlier instant is used.
 * Rule for missing times (DST gap): the time moves forward by the gap and `adjusted` is true.
 */
export function zonedToUtc(date: string, time: string, timeZone: string): ZonedResult {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dm || !tm) return { ok: false };

  const [y, mo, d] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const [h, mi] = [Number(tm[1]), Number(tm[2])];
  const naive = Date.UTC(y, mo - 1, d, h, mi);

  // Try both offsets around the wall time and keep the candidates that map back exactly.
  const offsets = new Set([
    zoneOffsetMinutes(naive - 864e5, timeZone),
    zoneOffsetMinutes(naive, timeZone),
    zoneOffsetMinutes(naive + 864e5, timeZone),
  ]);
  const matches = [...offsets]
    .map((off) => naive - off * 60000)
    .filter((instant) => {
      const p = partsInZone(instant, timeZone);
      return p.year === y && p.month === mo && p.day === d && p.hour === h && p.minute === mi;
    })
    .sort((a, b) => a - b);

  if (matches.length > 0) return { ok: true, utc: new Date(matches[0]), adjusted: false };

  // Gap: use the offset in effect before the transition, which lands after the gap.
  const before = zoneOffsetMinutes(naive - 864e5 / 2, timeZone);
  return { ok: true, utc: new Date(naive - before * 60000), adjusted: true };
}

// Wall-clock date and time of a UTC instant in a zone, as form values.
export function utcToZoned(instant: Date, timeZone: string): { date: string; time: string } {
  const p = partsInZone(instant.getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
}

export function formatDateTime(
  value: string | Date,
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(new Date(value));
}

export function formatTime(value: string | Date, locale: string, timeZone: string, hour12?: boolean) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12,
  }).format(new Date(value));
}

// "YYYY-MM-DD" key of an instant in a zone; used to bucket posts into calendar days.
export function dayKey(value: string | Date, timeZone: string): string {
  return utcToZoned(new Date(value), timeZone).date;
}

// Pure calendar arithmetic on "YYYY-MM-DD" keys, independent of the browser's zone.
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// The locale's first day of the week, 1 = Monday … 7 = Sunday.
export function weekStartDay(locale: string): number {
  try {
    const l = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    return l.getWeekInfo?.().firstDay ?? l.weekInfo?.firstDay ?? 1;
  } catch {
    return 1;
  }
}

// Day key of the first day of the week that contains `key`.
export function startOfWeek(key: string, locale: string): string {
  return addDays(key, -((weekdayOf(key) - weekStartDay(locale) + 7) % 7));
}

// 1 = Monday … 7 = Sunday.
export function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

// Formats a day key without any timezone shift (noon UTC never crosses a date line).
export function formatDayKey(key: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
}
