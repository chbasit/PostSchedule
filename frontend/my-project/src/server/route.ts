import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import { connection, NextResponse, type NextRequest } from "next/server";
import { z, ZodError, type ZodType } from "zod";
import { siteUrl } from "./env";
import { ApiFailure, fail } from "./errors";

// Every route handler goes through route(): one error envelope, no caching, and mutating
// requests must come from our own pages (cookies are SameSite=Lax as well).

type Handler<P> = (req: NextRequest, params: P) => Promise<unknown>;

export function route<P = Record<string, string>>(fn: Handler<P>) {
  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<Response> => {
    // API answers depend on the caller, so they are never prerendered at build time.
    await connection();
    const requestId = crypto.randomUUID();
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      const result = await fn(req, await ctx.params);
      if (result instanceof Response) return result;
      if (result === undefined) return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      // Next.js signals some control flow by throwing; those are not our errors.
      unstable_rethrow(e);
      return errorResponse(e, requestId);
    }
  };
}

// Browsers say where a request comes from in Sec-Fetch-Site; older ones only send Origin. Behind
// a proxy the request's own URL is the app's internal address (Hostinger: https://0.0.0.0:3000),
// so Origin is compared with the public site URL as well.
function assertSameOrigin(req: NextRequest) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite) {
    if (fetchSite !== "same-origin") throw fail.forbidden("This request came from another site.");
    return;
  }
  const origin = req.headers.get("origin");
  // Browsers always send Origin on cross-site POSTs; no Origin means a non-browser client.
  if (origin && origin !== new URL(siteUrl()).origin && origin !== req.nextUrl.origin) {
    throw fail.forbidden("This request came from another site.");
  }
}

export function errorResponse(e: unknown, requestId: string): Response {
  const failure =
    e instanceof ApiFailure
      ? e
      : e instanceof ZodError
        ? fail.validation("Some fields are missing or invalid.", { issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) })
        : null;
  if (!failure) console.error(`[api] ${requestId}`, e);
  const f = failure ?? new ApiFailure(500, "internal", "Something went wrong on our side.");
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (f.retryAfterSec) headers["Retry-After"] = String(f.retryAfterSec);
  return NextResponse.json(
    { error: { code: f.code, message: f.message, request_id: requestId, details: f.details } },
    { status: f.status, headers },
  );
}

// Parses the JSON body with zod (CLAUDE.md rule 4).
export async function readBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw fail.validation("The request body must be JSON.");
  }
  return schema.parse(raw);
}

export const uuid = z.uuid();

// Database errors in the API's own words. Messages raised by our SQL functions map to codes.
export function fromDb(error: PostgrestError): ApiFailure {
  if (error.code === "P0001") {
    if (error.message.includes("version_conflict")) return fail.conflict("Someone else changed this post. Reload to see their version.");
    if (error.message.includes("account_limit_reached")) return fail.planLimit("Your plan's account limit is reached.");
    if (error.message.includes("seat_limit_reached")) return fail.planLimit("Your plan's seat limit is reached.");
    if (error.message.includes("not_found")) return fail.notFound();
  }
  if (error.code === "23505") return fail.conflict("That already exists.");
  if (error.code === "42501") return fail.notFound();
  if (error.code === "PGRST116") return fail.notFound();
  console.error("[db]", error.code, error.message);
  return new ApiFailure(500, "internal", "Something went wrong on our side.");
}

export function must<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw fromDb(result.error);
  if (result.data === null) throw fail.notFound();
  return result.data;
}

export function ok(result: { error: PostgrestError | null }) {
  if (result.error) throw fromDb(result.error);
}
