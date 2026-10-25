"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import { listTimeZones } from "@/lib/time";
import { cn } from "@/lib/utils";
import { control } from "./input";
import { menuItem } from "./menu-styles";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { selectTrigger } from "./select";

const nameOf = (zone: string) => zone.replaceAll("_", " ");

function offsetOf(zone: string, locale: string, at: Date): string {
  try {
    return (
      new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")
        ?.value ?? ""
    );
  } catch {
    return "";
  }
}

type Props = {
  value: string;
  onChange: (zone: string) => void;
  id?: string;
  className?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

// Every IANA zone with its current UTC offset, filtered as you type. Arrow keys move,
// Enter picks, Escape closes.
export function TimezoneSelect({ value, onChange, id, className, ...aria }: Props) {
  const t = useTranslations("common.timezone");
  const locale = useLocale();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [now] = useState(() => new Date());
  const zones = useMemo(() => listTimeZones(), []);
  // Offsets for the whole list are only worked out while it is open.
  const options = useMemo(
    () => (open ? zones.map((zone) => ({ zone, name: nameOf(zone), offset: offsetOf(zone, locale, now) })) : []),
    [open, zones, locale, now],
  );
  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.name.toLowerCase().includes(q) || o.offset.toLowerCase().includes(q)) : options;

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  function choose(zone: string) {
    onChange(zone);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setQuery("");
        if (next) setActive(Math.max(0, zones.indexOf(value)));
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" id={id} aria-haspopup="listbox" className={cn(selectTrigger, className)} {...aria}>
          <span className="min-w-0 flex-1 truncate">{nameOf(value)}</span>
          <span className="shrink-0 text-xs text-muted-foreground" dir="ltr">
            {offsetOf(value, locale, now)}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={visible.length > 0 ? `${listId}-${active}` : undefined}
            aria-label={t("search")}
            placeholder={t("search")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(visible.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (visible[active]) choose(visible[active].zone);
              }
            }}
            className={cn(control, "h-9 ps-8 text-sm")}
          />
        </div>
        <ul id={listId} role="listbox" aria-label={t("label")} className="mt-1.5 max-h-64 overflow-y-auto">
          {visible.map((o, i) => (
            <li
              key={o.zone}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.zone === value}
              onMouseMove={() => setActive(i)}
              onClick={() => choose(o.zone)}
              className={cn(menuItem, i === active && "bg-muted")}
            >
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              <span className="text-xs text-muted-foreground" dir="ltr">
                {o.offset}
              </span>
              {o.zone === value ? <Check aria-hidden /> : <span aria-hidden className="size-4" />}
            </li>
          ))}
        </ul>
        {visible.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p> : null}
      </PopoverContent>
    </Popover>
  );
}
