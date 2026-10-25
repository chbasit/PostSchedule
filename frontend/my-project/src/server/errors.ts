import type { ApiErrorCode } from "@/lib/api/types";

// A failure the API reports with the shared error envelope (BACKEND.md 7.3).
export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public details: Record<string, unknown> = {},
    public retryAfterSec?: number,
  ) {
    super(message);
    this.name = "ApiFailure";
  }
}

export const fail = {
  unauthenticated: () => new ApiFailure(401, "unauthenticated", "Sign in to continue."),
  // Forbidden and not-found look the same to outsiders (TEST.md AUTHZ-03).
  notFound: () => new ApiFailure(404, "not_found", "Not found."),
  forbidden: (message = "You can't do that in this workspace.") => new ApiFailure(403, "forbidden", message),
  validation: (message: string, details: Record<string, unknown> = {}) => new ApiFailure(422, "validation_failed", message, details),
  conflict: (message: string, details: Record<string, unknown> = {}) => new ApiFailure(409, "conflict", message, details),
  planLimit: (message: string, details: Record<string, unknown> = {}) => new ApiFailure(403, "plan_limit_reached", message, details),
  rateLimited: (retryAfterSec = 60) => new ApiFailure(429, "rate_limited", "Too many requests. Try again in a moment.", {}, retryAfterSec),
  // A feature whose service (OAuth app, storage, job runner…) is not set up yet.
  notConfigured: (feature: string) =>
    new ApiFailure(503, "not_configured", `${feature} isn't set up on this server yet.`, { feature }),
};
