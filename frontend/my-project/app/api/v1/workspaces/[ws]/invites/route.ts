import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { INVITABLE_ROLES } from "@/lib/auth/permissions";
import { email } from "@/server/auth";
import { requireMember } from "@/server/guards";
import { idempotent } from "@/server/idempotency";
import { toInvite, type InviteRow } from "@/server/mappers";
import { must, readBody, route } from "@/server/route";

// Admins see open invites; others get an empty list from row-level security.
export const GET = route<{ ws: string }>(async (_req, { ws }) => {
  const { db } = await requireMember(ws);
  const rows = must(
    await db
      .from("invites")
      .select("id, email, role, created_at, expires_at")
      .eq("workspace_id", ws)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ) as InviteRow[];
  return rows.map(toInvite);
});

const body = z.object({ email, role: z.enum(INVITABLE_ROLES as [string, ...string[]]) });

// The token is random, emailed once, and stored only as a SHA-256 hash (BACKEND.md 6.5).
// The seat limit is enforced by the database; sending the email needs the email service.
export const POST = route<{ ws: string }>(async (req, { ws }) => {
  const { db, user } = await requireMember(ws, "member.manage");
  const input = await readBody(req, body);
  return idempotent(ws, "invite.create", req.headers.get("idempotency-key"), input, async () => {
    const token = randomBytes(32).toString("base64url");
    const row = must(
      await db
        .from("invites")
        .insert({
          workspace_id: ws,
          email: input.email,
          role: input.role,
          token_hash: createHash("sha256").update(token).digest("hex"),
          invited_by: user.id,
        })
        .select("id, email, role, created_at, expires_at")
        .single(),
    ) as InviteRow;
    return toInvite(row);
  });
});
