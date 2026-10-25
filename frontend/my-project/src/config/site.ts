// Working name. The product name is an open decision (FRONTEND.md §19); change it here only.
export const PRODUCT_NAME = "PostSchedule";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Mock API is used until NEXT_PUBLIC_API_URL points at the backend.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
// "true" once the Google provider is set up in Supabase (client id and secret).
export const GOOGLE_AUTH = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";

export const SESSION_COOKIE = "ps_session";
