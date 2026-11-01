import "server-only";
import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import type { Role } from "@/lib/auth/permissions";
import { can, type Action } from "@/lib/auth/permissions";
import { fail } from "./errors";
import { uuid } from "./route";
import { userClient } from "./supabase";

// Every route starts from these, never from raw cookies (BACKEND.md 6.3).

// The full user record, validated by Supabase Auth. Only for routes that need fields the
// token does not carry (email confirmation); everything else uses requireMember.
export async function requireUser(): Promise<{ db: SupabaseClient; user: AuthUser }> {
  const db = await userClient();
  // getUser() asks Auth to validate the token; getSession() alone would trust the cookie.
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw fail.unauthenticated();
  return { db, user: data.user };
}

export type Caller = { id: string; email: string | null };

// The workspace comes from the URL and is verified on every request (TEST.md AUTHZ-06).
// Not a member, or a role without the right, gets the same answer as "does not exist".
//
// Auth itself confirms the token on every request (getUser), so a session that was signed out,
// or ended by a password reset, stops working at once (TEST.md AUTH-10). Checking the token
// locally would accept it until it expires, up to an hour. For speed (BACKEND.md §20) the
// membership lookup runs at the same time; it carries the same token, and its answer is used
// only when Auth confirms the same person.
export async function requireMember(workspaceId: string, action?: Action) {
  if (!uuid.safeParse(workspaceId).success) throw fail.notFound();
  const db = await userClient();
  // Reads the cookie, refreshing the token first if it has expired.
  const { data: current } = await db.auth.getSession();
  const token = current.session?.access_token;
  const subject = current.session?.user.id;
  if (!token || !subject) throw fail.unauthenticated();

  const [auth, membership] = await Promise.all([
    db.auth.getUser(token),
    db.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", subject).maybeSingle(),
  ]);
  const verified = auth.data.user;
  if (auth.error || !verified || verified.id !== subject) throw fail.unauthenticated();

  const role = membership.data?.role as Role | undefined;
  if (!role) throw fail.notFound();
  if (action && !can(role, action)) throw fail.forbidden();
  const user: Caller = { id: subject, email: verified.email ?? null };
  return { db, user, role, workspaceId };
}
