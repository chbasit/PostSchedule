"use client";

import { API_URL, MOCK_API } from "@/config/site";
import { createHttpClient } from "./http";
import { mockClient } from "./mock";
import type { ApiClient } from "./types";

export const usingMockApi = MOCK_API;

export const api: ApiClient = usingMockApi ? mockClient : createHttpClient(API_URL);

export { ApiError, isApiError, errorCode } from "./errors";
export type * from "./types";
