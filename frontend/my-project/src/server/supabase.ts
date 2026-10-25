import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { serverEnv } from "./env";

// The signed-in person's client: their session comes from the auth cookies, so row-level
// security applies to every query. Token refreshes are written back as cookies.
export async function userClient(): Promise<SupabaseClient> {
  const env = serverEnv();
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) store.set(name, value, options);
      },
    },
  });
}

let admin: SupabaseClient | null = null;

// Bypasses row-level security. Only for webhooks, system tables and tasks that already
// checked membership, and always with an explicit workspace filter (BACKEND.md 5.4 rule 4).
export function adminClient(): SupabaseClient {
  const env = serverEnv();
  admin ??= createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
