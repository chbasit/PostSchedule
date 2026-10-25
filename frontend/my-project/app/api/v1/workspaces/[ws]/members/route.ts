import type { Role } from "@/lib/auth/permissions";
import { requireMember } from "@/server/guards";
import { toMember } from "@/server/mappers";
import { must, route } from "@/server/route";

export const GET = route<{ ws: string }>(async (_req, { ws }) => {
  const { db } = await requireMember(ws);
  const members = must(
    await db.from("workspace_members").select("user_id, role, created_at").eq("workspace_id", ws).order("created_at", { ascending: true }),
  ) as Array<{ user_id: string; role: Role; created_at: string }>;
  const profiles = must(
    await db
      .from("profiles")
      .select("id, display_name, email")
      .in(
        "id",
        members.map((m) => m.user_id),
      ),
  ) as Array<{ id: string; display_name: string; email: string }>;
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return members.map((m) => toMember(m, byId.get(m.user_id)));
});
