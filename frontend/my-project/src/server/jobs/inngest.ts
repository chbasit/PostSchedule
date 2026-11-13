import "server-only";
import { Inngest } from "inngest";

// The job runner (DECISIONS.md 2026-11-13). In development it talks to the local Inngest dev
// server (`npm run dev:jobs`), which needs no keys; in production to Inngest Cloud, with
// INNGEST_SIGNING_KEY (Inngest's calls to us are signed and checked) and INNGEST_EVENT_KEY.
export const inngest = new Inngest({ id: "agentiqsocial", isDev: process.env.NODE_ENV !== "production" });
