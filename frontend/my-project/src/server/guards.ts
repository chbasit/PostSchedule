import "server-only";
import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import type { Role } from "@/lib/auth/permissions";
import { can, type Action } from "@/lib/auth/permissions";
import { fail } from "./errors";
import { uuid } from "./route";
import { userClient } from "./supabase";

// Every route starts from these, never from raw cookies (BACKEND.md 6.3).

export async function requireUser(): Promise<{ db: SupabaseClient; user: AuthUser }> {
  const db = await userClient();
  // getUser() asks Auth to validate the token; getSession() alone would trust the cookie.
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw fail.unauthenticated();
  return { db, user: data.user };
}

// The workspace comes from the URL and is verified on every request (TEST.md AUTHZ-06).
// Not a member, or a role without the right, gets the same answer as "does not exist".
export async function requireMember(workspaceId: string, action?: Action) {
  if (!uuid.safeParse(workspaceId).success) throw fail.notFound();
  const { db, user } = await requireUser();
  const { data } = await db.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  const role = data?.role as Role | undefined;
  if (!role) throw fail.notFound();
  if (action && !can(role, action)) throw fail.forbidden();
  return { db, user, role, workspaceId };
}
