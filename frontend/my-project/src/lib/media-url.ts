"use client";

import { useEffect, useState } from "react";
import { usingMockApi } from "@/lib/api/client";
import { isLiveUrl, restoreUrl } from "@/lib/api/mock-media";

// The URL to show a media item with. Real API: the CDN URL as given. Preview mode: the
// blob URL if it was made in this page, otherwise the copy kept in IndexedDB.
export function useMediaUrl(media: { id: string; previewUrl: string | null } | null): string | null {
  const direct = media?.previewUrl && (!media.previewUrl.startsWith("blob:") || isLiveUrl(media.previewUrl)) ? media.previewUrl : null;
  const [restored, setRestored] = useState<{ id: string; url: string | null } | null>(null);
  const id = media?.id ?? null;

  useEffect(() => {
    if (!id || direct || !usingMockApi) return;
    let alive = true;
    void restoreUrl(id).then((url) => alive && setRestored({ id, url }));
    return () => {
      alive = false;
    };
  }, [id, direct]);

  return direct ?? (restored && restored.id === id ? restored.url : null);
}
