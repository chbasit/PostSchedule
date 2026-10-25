import "server-only";
import { createHash } from "node:crypto";
import { ApiFailure } from "./errors";
import { adminClient } from "./supabase";

// One request per Idempotency-Key (BACKEND.md 7.2): the first runs, repeats get its answer,
// a repeat with a different body is refused, and a repeat while the first still runs waits.
export async function idempotent<T>(workspaceId: string, route: string, key: string | null, body: unknown, run: () => Promise<T>): Promise<T> {
  if (!key) return run();
  if (key.length > 200) throw new ApiFailure(422, "validation_failed", "The Idempotency-Key is too long.");
  const hash = createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
  const db = adminClient();
  const claim = await db.from("idempotency_keys").insert({ workspace_id: workspaceId, route, key, request_hash: hash });

  if (claim.error) {
    if (claim.error.code !== "23505") throw claim.error;
    for (let attempt = 0; attempt < 10; attempt++) {
      const { data } = await db
        .from("idempotency_keys")
        .select("request_hash, response_status, response_body")
        .eq("workspace_id", workspaceId)
        .eq("route", route)
        .eq("key", key)
        .maybeSingle();
      if (!data) break;
      if (data.request_hash !== hash) throw new ApiFailure(422, "idempotency_mismatch", "This key was already used for a different request.");
      if (data.response_status !== null) return data.response_body as T;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new ApiFailure(409, "conflict", "The same request is still running. Try again in a moment.", {}, 2);
  }

  try {
    const result = await run();
    await db
      .from("idempotency_keys")
      .update({ response_status: 200, response_body: result as unknown as object })
      .eq("workspace_id", workspaceId)
      .eq("route", route)
      .eq("key", key);
    return result;
  } catch (e) {
    // A failed attempt frees the key, so a retry with it can run again.
    await db.from("idempotency_keys").delete().eq("workspace_id", workspaceId).eq("route", route).eq("key", key);
    throw e;
  }
}
