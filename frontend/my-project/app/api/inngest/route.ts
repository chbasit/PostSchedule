import { serve } from "inngest/next";
import { SITE_URL } from "@/config/site";
import { inngest } from "@/server/jobs/inngest";
import { functions } from "@/server/jobs/publish-jobs";

// Inngest calls this endpoint to run the jobs (DECISIONS.md 2026-11-13). In production every
// call is signed with INNGEST_SIGNING_KEY and the SDK rejects unsigned ones. Behind Hostinger's
// proxy the request's own address is internal, so the public one is given.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  serveOrigin: process.env.NODE_ENV === "production" ? SITE_URL : undefined,
});
