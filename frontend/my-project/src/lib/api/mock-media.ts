"use client";

// Preview mode only: uploaded files are kept in this browser's IndexedDB, so drafts and
// previews still show their media after a reload (a blob URL dies with the page). With the
// real API, media comes from the CDN and none of this runs.

const DB_NAME = "ps_mock_media";
const STORE = "files";

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opening;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// URLs made in this page, by media id. Anything else that starts with "blob:" is dead.
const live = new Map<string, string>();
const liveUrls = new Set<string>();

export function rememberUrl(mediaId: string, url: string) {
  live.set(mediaId, url);
  liveUrls.add(url);
}

export function isLiveUrl(url: string) {
  return liveUrls.has(url);
}

export async function keepFile(mediaId: string, file: Blob) {
  try {
    await run("readwrite", (s) => s.put(file, mediaId));
  } catch {
    // Quota or private mode: the preview works until the page reloads.
  }
}

export async function restoreUrl(mediaId: string): Promise<string | null> {
  const known = live.get(mediaId);
  if (known) return known;
  try {
    const blob = await run<Blob | undefined>("readonly", (s) => s.get(mediaId));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    rememberUrl(mediaId, url);
    return url;
  } catch {
    return null;
  }
}

export async function clearFiles() {
  try {
    await run("readwrite", (s) => s.clear());
  } catch {
    // ignore
  }
}
