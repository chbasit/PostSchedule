"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error" | "conflict";

type Options<T> = {
  value: T;
  enabled: boolean;
  delayMs?: number;
  save: (value: T) => Promise<void>;
  isConflict?: (error: unknown) => boolean;
};

/**
 * Debounced autosave (FRONTEND.md §10.3, TEST.md DBL-09 to DBL-12):
 * - waits ~1 s after the last change, and flushes on blur and when the tab is hidden;
 * - only one save runs at a time, so a slow first save cannot create two drafts and
 *   responses can never arrive out of order; changes made meanwhile are saved next.
 */
export function useAutosave<T>({ value, enabled, delayMs = 1000, save, isConflict }: Options<T>) {
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<"error" | "conflict" | null>(null);
  const [saved, setSaved] = useState<{ value: T; at: number } | null>(null);

  const latest = useRef(value);
  const saveRef = useRef(save);
  const conflictRef = useRef(isConflict);
  const inFlight = useRef(false);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    saveRef.current = save;
    conflictRef.current = isConflict;
  });

  const run = useCallback(async function runSave(): Promise<void> {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inFlight.current || !dirty.current) return;
    inFlight.current = true;
    dirty.current = false;
    const snapshot = latest.current;
    setSaving(true);
    try {
      await saveRef.current(snapshot);
      setSaved({ value: snapshot, at: Date.now() });
      setFailure(null);
    } catch (e) {
      setFailure(conflictRef.current?.(e) ? "conflict" : "error");
      dirty.current = true;
      return;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
    if (dirty.current) return runSave();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    latest.current = value;
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, enabled, delayMs, run]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void run();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      // Leaving the page (or the route being hidden) flushes pending work.
      void run();
    };
  }, [run]);

  const status: AutosaveStatus =
    failure ?? (saving ? "saving" : enabled && saved?.value !== value ? "pending" : saved ? "saved" : "idle");

  return { status, savedAt: saved?.at ?? null, flush: run };
}
