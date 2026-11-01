"use client";

import { Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import { DEV_MODE } from "@/config/site";
import type { DevDelivery } from "@/lib/api/client";
import { usingMockApi } from "@/lib/api/client";

// Development mode (and the in-browser sample data) send no email: the code the server made
// is kept for this tab and shown on the page that asks for it, already filled in.

type Purpose = "signup" | "recovery";
type Entry = NonNullable<DevDelivery["dev"]>;

const STORE = "dev-codes";
const listeners = new Set<() => void>();
let cache: Record<string, Entry> | null = null;

function read(): Record<string, Entry> {
  if (cache) return cache;
  try {
    cache = JSON.parse(sessionStorage.getItem(STORE) ?? "{}") as Record<string, Entry>;
  } catch {
    cache = {};
  }
  return cache;
}

const keyFor = (purpose: Purpose, email: string) => `${purpose}:${email.trim().toLowerCase()}`;

export function rememberDevCode(purpose: Purpose, email: string, dev: DevDelivery["dev"]) {
  if (!dev) return;
  cache = { ...read(), [keyFor(purpose, email)]: dev };
  try {
    sessionStorage.setItem(STORE, JSON.stringify(cache));
  } catch {
    // Blocked storage: the code still shows until the page reloads.
  }
  listeners.forEach((l) => l());
}

function useDevCode(purpose: Purpose, email: string): Entry | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (email ? (read()[keyFor(purpose, email)] ?? null) : null),
    () => null,
  );
}

// The note above the code field, and the code put into it.
export function DevCodeHint({ purpose, email, fill }: { purpose: Purpose; email: string; fill: (code: string) => void }) {
  const t = useTranslations("auth.dev");
  const entry = useDevCode(purpose, email);
  const code = entry?.code;

  useEffect(() => {
    if (code) fill(code);
  }, [code, fill]);

  if (!DEV_MODE && !usingMockApi) return null;
  const text = code ? t("code", { code }) : entry?.note ? t(entry.note) : t("noCode");
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed border-info/40 bg-info-bg px-3 py-2.5 text-sm text-info" role="status">
      <Wrench className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}
