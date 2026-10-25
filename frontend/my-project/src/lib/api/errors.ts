import type { ApiErrorCode } from "./types";

// Mirrors the backend error envelope (BACKEND.md §7.3).
export type ErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
    request_id?: string;
    details?: Record<string, unknown>;
  };
};

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public details: Record<string, unknown> = {},
    public requestId?: string,
    public retryAfterSec?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function errorCode(error: unknown): ApiErrorCode {
  return isApiError(error) ? error.code : "internal";
}
