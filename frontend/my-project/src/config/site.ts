// The product name and domain (DECISIONS.md 2026-10-28); change them here only.
export const PRODUCT_NAME = "AgentiqSocial";
export const PRODUCT_DOMAIN = "agentiqsocial.com";
// Support, privacy and deletion requests (the legal pages and platform app reviews list it).
export const SUPPORT_EMAIL = `support@${PRODUCT_DOMAIN}`;
// Who runs the product, as on the FBR registration (DECISIONS.md 2026-11-10). Only the terms and
// privacy policy name them; Meta's business verification looks for this name on the site.
export const OPERATOR_NAME = "Abdul Basit";
export const OPERATOR_PLACE = "Sahiwal, Pakistan";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Where the API lives. Empty: this app itself (app/api/v1, same origin), the normal case.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
// "true" swaps the backend for the in-browser sample data (scripts/clips recordings, demos
// without Supabase). Never for real use: nothing is saved on a server.
export const MOCK_API = process.env.NEXT_PUBLIC_MOCK_API === "true";

// Two modes, both on the real backend and database (DECISIONS.md 2026-11-01):
// - Development (`npm run dev`): sign-up and password-reset codes are shown on screen and
//   in the terminal instead of being emailed, so any address can be tried without an inbox.
// - Production (`npm run build` + `npm start`, and every deployment): codes are emailed
//   through Supabase's SMTP (Resend). A production build can never be in development mode.
// NEXT_PUBLIC_APP_MODE=production makes `npm run dev` send real emails too.
export const DEV_MODE = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_APP_MODE !== "production";
// "true" once the Google provider is set up in Supabase (client id and secret).
export const GOOGLE_AUTH = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";
// AI Studio and the AI writer. Off: every AI surface says "Coming soon" and the AI routes
// refuse requests; the code stays in place. "true" once an AI key is set (DECISIONS.md).
export const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === "true";

export const SESSION_COOKIE = "ps_session";
