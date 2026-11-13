import { z } from "zod";
import type { ConnectResult } from "@/lib/api/types";
import { getPlatform, PLATFORMS, type PlatformId } from "@/providers/catalog";
import { encrypt } from "@/server/crypto";
import { tokenKeys } from "@/server/env";
import { ApiFailure, fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { toAccount, type AccountRow } from "@/server/mappers";
import { BlueskyError, login, profile } from "@/server/providers/bluesky";
import { must, readBody, route } from "@/server/route";
import { adminClient } from "@/server/supabase";
import { startConnect } from "@/server/tiktok";

// Bluesky connects with the handle and an app password, checked with Bluesky before anything
// is saved; the password is stored encrypted. TikTok goes through its own sign-in (OAuth,
// src/server/tiktok.ts); the other platforms come next (DECISIONS.md 2026-11-12, 2026-11-13).
const body = z.object({
  provider: z.enum(PLATFORMS.map((p) => p.id) as [string, ...string[]]),
  handle: z.string().trim().max(253).optional(),
  appPassword: z.string().trim().max(64).optional(),
});

const ACCOUNT = "id, workspace_id, provider, display_name, handle, status, created_at";

export const POST = route<{ ws: string }>(async (req, { ws }) => {
  await requireMember(ws, "account.connect");
  const input = await readBody(req, body);
  // TikTok: off to TikTok's sign-in page; the account is saved by its callback.
  if (input.provider === "tiktok") return startConnect(ws, null);
  if (input.provider !== "bluesky") throw fail.notConfigured(`Connecting ${getPlatform(input.provider as PlatformId).name}`);
  const handle = (input.handle ?? "").replace(/^@/, "");
  if (handle.length < 3 || !input.appPassword) throw fail.validation("Enter your Bluesky handle and an app password.", { reason: "bluesky_fields" });
  const ring = tokenKeys();

  let session;
  try {
    session = await login(handle, input.appPassword);
  } catch (e) {
    if (e instanceof BlueskyError && e.code === "auth") throw fail.validation("That handle and app password do not match.", { reason: "bluesky_login" });
    if (e instanceof BlueskyError && e.code === "rate_limited") throw fail.rateLimited(300);
    throw new ApiFailure(502, "provider_error", "Bluesky did not answer. Try again in a minute.");
  }
  const who = await profile(session.did);

  // Signing in again with the DID keeps working if the person changes their handle later.
  const fields = {
    display_name: who.displayName ?? session.handle,
    handle: session.handle,
    avatar_url: who.avatar,
    access_token_enc: encrypt(ring, input.appPassword),
    status: "active",
    metadata: { pds: session.pds },
  };
  const admin = adminClient();
  const existing = (await admin.from("social_accounts").select("id").eq("workspace_id", ws).eq("provider", "bluesky").eq("provider_account_id", session.did).maybeSingle()).data;
  const saved = existing
    ? await admin.from("social_accounts").update(fields).eq("workspace_id", ws).eq("id", existing.id).select(ACCOUNT).single<AccountRow>()
    : await admin.from("social_accounts").insert({ ...fields, workspace_id: ws, provider: "bluesky", provider_account_id: session.did }).select(ACCOUNT).single<AccountRow>();
  return { kind: "connected", account: toAccount(must(saved)) } satisfies ConnectResult;
});
