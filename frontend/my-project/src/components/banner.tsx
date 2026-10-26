"use client";

import { CircleX, Info, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "announcement" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  announcement: "bg-highlight text-highlight-foreground",
  warning: "bg-warning-bg text-warning border border-warning/30",
  danger: "bg-danger-bg text-danger border border-danger/30",
  info: "bg-info-bg text-info border border-info/30",
};

const icons = { warning: TriangleAlert, danger: CircleX, info: Info } as const;

const dismissed = new Set<string>();
const listeners = new Set<() => void>();

function isDismissed(key: string) {
  if (dismissed.has(key)) return true;
  try {
    return localStorage.getItem(`banner:${key}`) === "1";
  } catch {
    return false;
  }
}

function dismiss(key: string) {
  dismissed.add(key);
  try {
    localStorage.setItem(`banner:${key}`, "1");
  } catch {
    // Remembered for this page view only.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

type BannerProps = {
  tone: Tone;
  children: ReactNode;
  action?: ReactNode;
  // When set, the banner can be dismissed and stays dismissed in this browser.
  dismissKey?: string;
  className?: string;
};

export function Banner({ tone, children, action, dismissKey, className }: BannerProps) {
  const t = useTranslations("common");
  const hidden = useSyncExternalStore(
    subscribe,
    () => (dismissKey ? isDismissed(dismissKey) : false),
    () => false,
  );
  if (hidden) return null;
  const Icon = tone === "announcement" ? null : icons[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-center gap-3 text-sm", tone === "announcement" ? "px-4 py-2" : "rounded-lg px-4 py-3", tones[tone], className)}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      <div className={cn("min-w-0 flex-1", tone === "announcement" && "text-center")}>{children}</div>
      {action}
      {dismissKey ? (
        <button
          type="button"
          onClick={() => dismiss(dismissKey)}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded hover:bg-ink/10"
          aria-label={t("dismiss")}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
