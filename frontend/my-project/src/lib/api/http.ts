"use client";

import { probeMedia } from "@/lib/preflight/probe";
import { ApiError, type ErrorEnvelope } from "./errors";
import type { ApiClient, MediaSummary, MutationOptions, UploadHandle } from "./types";

// REST client for the backend (BACKEND.md §7). Every route is workspace-scoped
// and the server re-checks membership on every request.

const TIMEOUT_MS = 20_000;
// Image models take 10–60 s; the route answers when the images are stored.
const AI_IMAGE_TIMEOUT_MS = 120_000;

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export function createHttpClient(baseUrl: string): ApiClient {
  async function request<T>(
    method: Method,
    path: string,
    body?: unknown,
    opts: MutationOptions & { ifMatch?: number; timeoutMs?: number } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
    if (opts.ifMatch !== undefined) headers["If-Match"] = String(opts.ifMatch);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/v1${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "include",
        cache: "no-store",
        signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_MS),
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "TimeoutError") {
        throw new ApiError("timeout", "The server took too long to answer.");
      }
      throw new ApiError("network", "We could not reach the server.");
    }

    if (res.status === 204) return undefined as T;

    // A captive portal or proxy can answer with HTML instead of JSON (TEST.md NET-09).
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const payload: unknown = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      const envelope = payload as ErrorEnvelope | null;
      const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
      throw new ApiError(
        envelope?.error?.code ?? (res.status === 401 ? "unauthenticated" : "internal"),
        envelope?.error?.message ?? "Something went wrong.",
        envelope?.error?.details ?? {},
        envelope?.error?.request_id,
        retryAfter,
      );
    }
    if (!isJson) throw new ApiError("network", "The server sent an unexpected response.");
    return payload as T;
  }

  const ws = (id: string) => `/workspaces/${encodeURIComponent(id)}`;

  function upload(workspaceId: string, file: File, onProgress: (f: number) => void): UploadHandle {
    // One signed PUT straight to storage (src/server/media/storage.ts); the server never handles
    // the bytes. The browser measures the file first, because the server cannot read videos.
    let xhr: XMLHttpRequest | null = null;
    const promise = (async () => {
      const probe = await probeMedia(file).catch(() => null);
      if (probe) URL.revokeObjectURL(probe.objectUrl);
      const init = await request<{ assetId: string; uploadUrl: string }>("POST", `${ws(workspaceId)}/media/uploads`, {
        name: file.name,
        bytes: file.size,
        mime: file.type,
        width: probe?.width ?? 0,
        height: probe?.height ?? 0,
        durationSec: probe?.durationSec ?? null,
      });
      await new Promise<void>((resolve, reject) => {
        xhr = new XMLHttpRequest();
        xhr.open("PUT", init.uploadUrl);
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
        xhr.onload = () => (xhr!.status < 300 ? resolve() : reject(new ApiError("network", "Upload failed.")));
        xhr.onerror = () => reject(new ApiError("network", "Upload failed."));
        xhr.onabort = () => reject(new ApiError("validation_failed", "Upload cancelled.", { reason: "cancelled" }));
        xhr.send(file);
      });
      return request<MediaSummary>("POST", `${ws(workspaceId)}/media/uploads/${init.assetId}/complete`, {});
    })();
    return {
      promise,
      pause: () => undefined,
      resume: () => undefined,
      cancel: () => (xhr as XMLHttpRequest | null)?.abort(),
    };
  }

  return {
    auth: {
      session: () =>
        request<{ session: import("./types").Session | null }>("GET", "/auth/session").then((r) => r.session),
      signIn: (input) => request("POST", "/auth/sign-in", input),
      // The new profile starts in the language and time zone the person signed up in.
      signUp: (input) =>
        request("POST", "/auth/sign-up", {
          ...input,
          locale: document.documentElement.lang || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      signOut: () => request("POST", "/auth/sign-out", {}),
      requestPasswordReset: (email) => request("POST", "/auth/password-reset", { email }),
      resetPassword: (input) => request("POST", "/auth/password-update", input),
      resendVerification: (email) => request("POST", "/auth/resend-verification", { email }),
      verifyEmail: (input) => request("POST", "/auth/verify-email", input),
    },
    me: {
      update: (patch) => request("PATCH", "/me", patch),
    },
    accounts: {
      list: (id) => request("GET", `${ws(id)}/accounts`),
      connect: (id, provider, opts, credentials) => request("POST", `${ws(id)}/accounts/connect`, { provider, ...credentials }, opts),
      reconnect: (id, accountId) => request("POST", `${ws(id)}/accounts/${accountId}/reconnect`, {}),
      remove: (id, accountId) => request("DELETE", `${ws(id)}/accounts/${accountId}`),
      insights: (id, accountId, { days, timezone }) =>
        request("GET", `${ws(id)}/accounts/${accountId}/insights?${new URLSearchParams({ days: String(days), tz: timezone })}`),
    },
    posts: {
      list: (id, filter = {}) => {
        const q = new URLSearchParams();
        for (const s of [filter.status].flat()) if (s) q.append("status", s);
        if (filter.from) q.set("from", filter.from);
        if (filter.to) q.set("to", filter.to);
        if (filter.q) q.set("q", filter.q);
        for (const t of filter.tagIds ?? []) q.append("tag", t);
        return request("GET", `${ws(id)}/posts?${q}`);
      },
      get: (id, postId) => request("GET", `${ws(id)}/posts/${postId}`),
      create: (id, input, opts) => request("POST", `${ws(id)}/posts`, input, opts),
      update: (id, postId, input, version) => request("PATCH", `${ws(id)}/posts/${postId}`, input, { ifMatch: version }),
      reschedule: (id, postId, scheduledAt, version) =>
        request("POST", `${ws(id)}/posts/${postId}/reschedule`, { scheduledAt }, { ifMatch: version }),
      retry: (id, postId, opts) => request("POST", `${ws(id)}/posts/${postId}/retry`, {}, opts),
      remove: (id, postId) => request("DELETE", `${ws(id)}/posts/${postId}`),
    },
    media: { upload },
    members: {
      list: (id) => request("GET", `${ws(id)}/members`),
      invites: (id) => request("GET", `${ws(id)}/invites`),
      invite: (id, input, opts) => request("POST", `${ws(id)}/invites`, input, opts),
      revokeInvite: (id, inviteId) => request("DELETE", `${ws(id)}/invites/${inviteId}`),
      remove: (id, userId) => request("DELETE", `${ws(id)}/members/${userId}`),
    },
    tags: {
      list: (id) => request("GET", `${ws(id)}/tags`),
      create: (id, input, opts) => request("POST", `${ws(id)}/tags`, input, opts),
      update: (id, tagId, patch) => request("PATCH", `${ws(id)}/tags/${tagId}`, patch),
      remove: (id, tagId) => request("DELETE", `${ws(id)}/tags/${tagId}`),
    },
    ai: {
      generate: (id, input) => request("POST", `${ws(id)}/ai/generate`, input),
      rewrite: (id, input) => request("POST", `${ws(id)}/ai/rewrite`, input),
      credits: (id) => request("GET", `${ws(id)}/ai/credits`),
      images: {
        list: (id) => request("GET", `${ws(id)}/ai/images`),
        generate: (id, input, opts) => request("POST", `${ws(id)}/ai/images`, input, { ...opts, timeoutMs: AI_IMAGE_TIMEOUT_MS }),
        remove: (id, imageId) => request("DELETE", `${ws(id)}/ai/images/${encodeURIComponent(imageId)}`),
      },
    },
    billing: {
      createCheckout: (id, plan, interval, opts) => request("POST", `${ws(id)}/billing/checkout`, { plan, interval }, opts),
      portal: (id) => request("POST", `${ws(id)}/billing/portal`, {}),
    },
    notifications: {
      list: (id) => request("GET", `${ws(id)}/notifications`),
      markAllRead: (id) => request("POST", `${ws(id)}/notifications/read-all`, {}),
    },
  };
}
