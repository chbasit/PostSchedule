"use client";

import { useCallback, useRef } from "react";

/**
 * One intent, one idempotency key (FRONTEND.md §10). Reuse the key for retries of
 * the same intent; renew it only after success or when the user changes the form.
 * The key is created lazily so nothing random runs during render.
 */
export function useIntentKey() {
  const ref = useRef<string | null>(null);

  const get = useCallback(() => {
    ref.current ??= crypto.randomUUID();
    return ref.current;
  }, []);

  const renew = useCallback(() => {
    ref.current = crypto.randomUUID();
  }, []);

  return { get, renew };
}
