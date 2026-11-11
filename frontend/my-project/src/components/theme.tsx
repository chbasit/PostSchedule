"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

// Light unless the person picked dark, or picked "Match system" on a dark system
// (DECISIONS.md 2026-11-11). Runs in <head> before first paint so there is no flash
// (FRONTEND.md §2.7).
export const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

const listeners = new Set<() => void>();

function read(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "system" ? value : "light";
  } catch {
    return "light";
  }
}

function isDark(pref: ThemePreference): boolean {
  return pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
}

function apply(pref: ThemePreference) {
  document.documentElement.classList.toggle("dark", isDark(pref));
}

export function setTheme(pref: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
  apply(pref);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (read() !== "system") return;
    apply("system");
    listener();
  };
  media.addEventListener("change", onSystem);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystem);
  };
}

export function useTheme(): ThemePreference {
  return useSyncExternalStore(subscribe, read, () => "light");
}

// The theme on screen now, whatever the preference.
function useDarkOnScreen(): boolean {
  return useSyncExternalStore(subscribe, () => isDark(read()), () => false);
}

// One button: the moon switches to dark, the sun back to light. "Match system" stays in the
// app's user menu and preferences.
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("theme");
  const dark = useDarkOnScreen();
  const Icon = dark ? Sun : Moon;
  return (
    <Button variant="ghost" size="icon" aria-label={dark ? t("toLight") : t("toDark")} className={className} onClick={() => setTheme(dark ? "light" : "dark")}>
      <Icon aria-hidden />
    </Button>
  );
}
