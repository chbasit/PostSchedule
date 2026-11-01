import "server-only";
import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/config/site";
import type { Session } from "@/lib/api/types";
import type { Role } from "@/lib/auth/permissions";
import { toUser, toWorkspace, type ProfileRow, type WorkspaceRow } from "./mappers";
import { must } from "./route";

type SessionRows = { profile: ProfileRow; memberships: Array<{ role: Role; workspaces: WorkspaceRow | WorkspaceRow[] | null }> };

// The profile and the memberships, read side by side.
export async function loadSessionRows(db: SupabaseClient, userId: string): Promise<SessionRows> {
  const [profile, memberships] = await Promise.all([
    db.from("profiles").select("id, email, display_name, persona, timezone, locale, use_24h, onboarded_at").eq("id", userId).single<ProfileRow>(),
    db
      .from("workspace_members")
      .select(
        "role, workspaces(id, name, kind, subscriptions(plan_key, interval, status, account_limit, member_limit, trial_ends_at, current_period_end, cancel_at))",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);
  return { profile: must(profile), memberships: must(memberships) as unknown as SessionRows["memberships"] };
}

export function toSession({ profile, memberships }: SessionRows, auth: AuthUser): Session {
  const workspaces = memberships.flatMap((r) => {
    const ws = Array.isArray(r.workspaces) ? r.workspaces[0] : r.workspaces;
    return ws ? [toWorkspace(ws, r.role)] : [];
  });
  return { user: toUser(profile, auth), workspaces };
}

// The signed-in person and every workspace they belong to (the frontend's Session).
export async function loadSession(db: SupabaseClient, auth: AuthUser): Promise<Session> {
  return toSession(await loadSessionRows(db, auth.id), auth);
}

// A plain "signed in" flag the proxy reads to send signed-out visitors to the sign-in page.
// It carries no identity: every API call still checks the Supabase session itself.
export async function markSignedIn() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function markSignedOut() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}
