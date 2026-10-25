"use client";

// Browser-side probe for instant feedback. The server re-probes with ffprobe and
// is authoritative (BACKEND.md §10.2); this never decides what gets published.

export type MediaProbe = {
  kind: "video" | "image";
  name: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  durationSec: number | null;
  // Average bitrate estimated from size and duration. null when unknown.
  bitrateKbps: number | null;
  objectUrl: string;
};

export class ProbeError extends Error {
  constructor(public code: "unsupported_type" | "unreadable" | "empty_file") {
    super(code);
  }
}

const VIDEO_TYPES = /^video\/(mp4|quicktime|webm|x-m4v)$/;
const IMAGE_TYPES = /^image\/(jpeg|png|webp|gif)$/;

export function probeMedia(file: File): Promise<MediaProbe> {
  if (file.size === 0) return Promise.reject(new ProbeError("empty_file"));
  if (VIDEO_TYPES.test(file.type)) return probeVideo(file);
  if (IMAGE_TYPES.test(file.type)) return probeImage(file);
  return Promise.reject(new ProbeError("unsupported_type"));
}

function probeVideo(file: File): Promise<MediaProbe> {
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => {
      // Browsers apply rotation metadata to videoWidth/videoHeight.
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      const probe: MediaProbe = {
        kind: "video",
        name: file.name,
        mime: file.type,
        bytes: file.size,
        width: video.videoWidth,
        height: video.videoHeight,
        durationSec: duration,
        bitrateKbps: duration && duration > 0 ? Math.round((file.size * 8) / duration / 1000) : null,
        objectUrl,
      };
      cleanup();
      if (!probe.width || !probe.height) reject(new ProbeError("unreadable"));
      else resolve(probe);
    };
    video.onerror = () => {
      cleanup();
      URL.revokeObjectURL(objectUrl);
      reject(new ProbeError("unreadable"));
    };
    video.src = objectUrl;
  });
}

function probeImage(file: File): Promise<MediaProbe> {
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        kind: "image",
        name: file.name,
        mime: file.type,
        bytes: file.size,
        width: img.naturalWidth,
        height: img.naturalHeight,
        durationSec: null,
        bitrateKbps: null,
        objectUrl,
      });
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new ProbeError("unreadable"));
    };
    img.src = objectUrl;
  });
}
