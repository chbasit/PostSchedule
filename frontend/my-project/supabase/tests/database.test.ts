import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { beforeAll, describe, expect, it } from "vitest";

// The migrations on a real Postgres (PGlite, in-process, no Docker), with the parts of
// Supabase they rely on: the auth schema, auth.uid() and the API roles with Supabase's
// default grants. Clients can reach the database directly with the public anon key, so
// these tests attack it the way a signed-in user could, without going through our routes.

const SUPABASE = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}',
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const migrations = new URL("../migrations/", import.meta.url);

let db: PGlite;

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE);
  for (const file of readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(file, migrations), "utf8"));
  }
}, 60_000);

type User = { id: string; ws: string };

// Signs up through auth.users, as Supabase Auth does, so the sign-up trigger runs.
async function signUp(name: string, meta: Record<string, string> = { display_name: name }): Promise<User> {
  const id = randomUUID();
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`, [
    id,
    `${name.toLowerCase()}-${id.slice(0, 8)}@example.com`,
    JSON.stringify(meta),
  ]);
  const { rows } = await db.query<{ workspace_id: string }>(`select workspace_id from public.workspace_members where user_id = $1`, [id]);
  return { id, ws: rows[0].workspace_id };
}

// Runs one statement the way PostgREST does for a request: as `authenticated` with the
// user's id in the JWT claims, or as `anon` when signed out.
async function as<T = Record<string, unknown>>(user: User | null, query: string, params: unknown[] = []) {
  return db.transaction(async (tx: Transaction) => {
    if (user) await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user.id]);
    await tx.exec(`set local role ${user ? "authenticated" : "anon"}`);
    return tx.query<T>(query, params);
  });
}

// Server-side writes (service role / jobs) in these tests run as the table owner.
const server = <T = Record<string, unknown>>(query: string, params: unknown[] = []) => db.query<T>(query, params);

async function addMember(ws: string, user: User, role: string) {
  await server(`insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, $3)`, [ws, user.id, role]);
}

async function addAccount(ws: string, provider = "youtube") {
  const { rows } = await server<{ id: string }>(
    `insert into public.social_accounts (workspace_id, provider, provider_account_id, access_token_enc) values ($1, $2, $3, 'secret') returning id`,
    [ws, provider, randomUUID()],
  );
  return rows[0].id;
}

function postInput(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ type: "text", status: "draft", mainCaption: "Hello", accountIds: [], tagIds: [], mediaIds: [], ...overrides });
}

async function savePost(user: User, ws: string, input: string, postId: string | null = null, version: number | null = null) {
  const { rows } = await as<{ id: string }>(user, `select public.save_post($1, $2, $3, $4::jsonb) as id`, [ws, postId, version, input]);
  return rows[0].id;
}

describe("sign-up", () => {
  it("creates a profile, a personal workspace, owner membership and a 14-day Free trial", async () => {
    const alice = await signUp("Alice", { display_name: "Alice Martin", locale: "fr", timezone: "Europe/Paris" });
    const { rows } = await server<Record<string, unknown>>(
      `select p.display_name, p.locale, p.timezone, w.name, w.kind, m.role, s.plan_key, s.status, s.account_limit, s.member_limit,
              s.trial_ends_at between now() + interval '13 days 23 hours' and now() + interval '14 days 1 hour' as trial_14_days
       from public.profiles p
       join public.workspace_members m on m.user_id = p.id
       join public.workspaces w on w.id = m.workspace_id
       join public.subscriptions s on s.workspace_id = w.id
       where p.id = $1`,
      [alice.id],
    );
    expect(rows).toEqual([
      {
        display_name: "Alice Martin",
        locale: "fr",
        timezone: "Europe/Paris",
        name: "Alice's workspace",
        kind: "personal",
        role: "owner",
        plan_key: "free",
        status: "trialing",
        account_limit: 3,
        member_limit: 1,
        trial_14_days: true,
      },
    ]);
  });

  it("names the profile after the email when no name was given (Google sign-in without one)", async () => {
    const user = await signUp("Nameless", {});
    const { rows } = await server<{ display_name: string }>(`select display_name from public.profiles where id = $1`, [user.id]);
    expect(rows[0].display_name).toMatch(/^nameless-/);
  });
});

describe("tenant isolation", () => {
  it("shows people only their own workspaces, subscriptions and profiles", async () => {
    const alice = await signUp("Alice");
    const bob = await signUp("Bob");
    const workspaces = await as<{ id: string }>(alice, `select id from public.workspaces`);
    expect(workspaces.rows.map((r) => r.id)).toEqual([alice.ws]);
    const subs = await as<{ workspace_id: string }>(alice, `select workspace_id from public.subscriptions`);
    expect(subs.rows.map((r) => r.workspace_id)).toEqual([alice.ws]);
    const profiles = await as<{ id: string }>(alice, `select id from public.profiles where id in ($1, $2)`, [alice.id, bob.id]);
    expect(profiles.rows.map((r) => r.id)).toEqual([alice.id]);
  });

  it("shows a teammate's profile once they share a workspace", async () => {
    const alice = await signUp("Alice");
    const bob = await signUp("Bob");
    await addMember(alice.ws, bob, "editor");
    const profiles = await as<{ id: string }>(alice, `select id from public.profiles where id = $1`, [bob.id]);
    expect(profiles.rows).toHaveLength(1);
  });

  it("hides another workspace's posts, tags and notifications", async () => {
    const alice = await signUp("Alice");
    const bob = await signUp("Bob");
    const post = await savePost(bob, bob.ws, postInput({ mainCaption: "Bob's secret launch" }));
    await server(`insert into public.tags (workspace_id, name, color) values ($1, 'Launch', 'blue')`, [bob.ws]);
    await server(`insert into public.notifications (workspace_id, user_id, kind, post_id) values ($1, $2, 'published', $3)`, [bob.ws, bob.id, post]);

    expect((await as(alice, `select * from public.posts where workspace_id = $1`, [bob.ws])).rows).toEqual([]);
    expect((await as(alice, `select * from public.tags where workspace_id = $1`, [bob.ws])).rows).toEqual([]);
    expect((await as(alice, `select * from public.notifications where workspace_id = $1`, [bob.ws])).rows).toEqual([]);
  });

  it("refuses links between a post and another workspace's account, tag or file", async () => {
    const alice = await signUp("Alice");
    const bob = await signUp("Bob");
    const bobsPost = await savePost(bob, bob.ws, postInput());
    const account = await addAccount(alice.ws);
    const { rows: tags } = await server<{ id: string }>(`insert into public.tags (workspace_id, name, color) values ($1, 'Mine', 'green') returning id`, [alice.ws]);

    await expect(
      as(alice, `insert into public.post_targets (post_id, workspace_id, social_account_id, provider) values ($1, $2, $3, 'youtube')`, [bobsPost, alice.ws, account]),
    ).rejects.toThrow(/foreign key/);
    await expect(as(alice, `insert into public.post_tags (post_id, tag_id, workspace_id) values ($1, $2, $3)`, [bobsPost, tags[0].id, alice.ws])).rejects.toThrow(/foreign key/);
  });

  it("drops other workspaces' accounts and tags passed to save_post", async () => {
    const alice = await signUp("Alice");
    const bob = await signUp("Bob");
    const bobsAccount = await addAccount(bob.ws);
    const { rows: bobsTags } = await server<{ id: string }>(`insert into public.tags (workspace_id, name, color) values ($1, 'Theirs', 'rose') returning id`, [bob.ws]);
    const post = await savePost(alice, alice.ws, postInput({ accountIds: [bobsAccount], tagIds: [bobsTags[0].id] }));
    expect((await server(`select * from public.post_targets where post_id = $1`, [post])).rows).toEqual([]);
    expect((await server(`select * from public.post_tags where post_id = $1`, [post])).rows).toEqual([]);
  });

  it("gives signed-out callers nothing", async () => {
    await expect(as(null, `select * from public.posts`)).rejects.toThrow(/permission denied/);
    await expect(as(null, `select * from public.profiles`)).rejects.toThrow(/permission denied/);
  });

  it("keeps server-only tables away from clients", async () => {
    const alice = await signUp("Alice");
    await server(`insert into public.webhook_events (provider, event_id, payload) values ('lemonsqueezy', $1, '{}')`, [randomUUID()]);
    for (const table of ["webhook_events", "checkout_sessions", "idempotency_keys", "audit_log"]) {
      await expect(as(alice, `select * from public.${table}`)).rejects.toThrow(/permission denied/);
    }
  });
});

describe("roles", () => {
  it("lets viewers read posts but not save them", async () => {
    const owner = await signUp("Owner");
    const viewer = await signUp("Viewer");
    await addMember(owner.ws, viewer, "viewer");
    await savePost(owner, owner.ws, postInput());
    expect((await as(viewer, `select id from public.posts where workspace_id = $1`, [owner.ws])).rows).toHaveLength(1);
    await expect(savePost(viewer, owner.ws, postInput())).rejects.toThrow(/not_found/);
  });

  it("lets editors delete only their own drafts, and never change who wrote a post", async () => {
    const owner = await signUp("Owner");
    const editor = await signUp("Editor");
    await addMember(owner.ws, editor, "editor");
    const ownersPost = await savePost(owner, owner.ws, postInput());
    const editorsPost = await savePost(editor, owner.ws, postInput());

    await expect(as(editor, `update public.posts set created_by = $2 where id = $1`, [ownersPost, editor.id])).rejects.toThrow(/permission denied/);
    expect((await as(editor, `delete from public.posts where id = $1`, [ownersPost])).affectedRows).toBe(0);
    expect((await as(editor, `delete from public.posts where id = $1`, [editorsPost])).affectedRows).toBe(1);
    expect((await as(owner, `delete from public.posts where id = $1`, [ownersPost])).affectedRows).toBe(1);
  });

  it("never lets anyone remove the owner", async () => {
    const owner = await signUp("Owner");
    const admin = await signUp("Admin");
    await addMember(owner.ws, admin, "admin");
    const removed = await as(admin, `delete from public.workspace_members where workspace_id = $1 and user_id = $2`, [owner.ws, owner.id]);
    expect(removed.affectedRows).toBe(0);
  });
});

describe("save_post", () => {
  it("saves targets, tags and files in order, and bumps the version on each edit", async () => {
    const alice = await signUp("Alice");
    const youtube = await addAccount(alice.ws, "youtube");
    const bluesky = await addAccount(alice.ws, "bluesky");
    const { rows: tags } = await server<{ id: string }>(`insert into public.tags (workspace_id, name, color) values ($1, 'Launch', 'blue') returning id`, [alice.ws]);
    const files = [];
    for (const n of [1, 2]) {
      const { rows } = await server<{ id: string }>(
        `insert into public.media_assets (workspace_id, storage_key, kind, status) values ($1, $2, 'image', 'ready') returning id`,
        [alice.ws, `${alice.ws}/${n}.jpg`],
      );
      files.push(rows[0].id);
    }

    const id = await savePost(
      alice,
      alice.ws,
      postInput({
        type: "image",
        status: "scheduled",
        scheduledAt: "2030-01-01T09:00:00Z",
        accountIds: [youtube, bluesky],
        captionOverrides: { [bluesky]: "Short version" },
        targetOptions: { [youtube]: { title: "Launch", visibility: "unlisted" } },
        tagIds: [tags[0].id],
        mediaIds: [files[1], files[0]],
      }),
    );

    const targets = await server<{ provider: string; caption_override: string | null; options: unknown; status: string }>(
      `select provider, caption_override, options, status from public.post_targets where post_id = $1 order by provider`,
      [id],
    );
    expect(targets.rows).toEqual([
      { provider: "bluesky", caption_override: "Short version", options: null, status: "pending" },
      { provider: "youtube", caption_override: null, options: { title: "Launch", visibility: "unlisted" }, status: "pending" },
    ]);
    const media = await server<{ media_asset_id: string }>(`select media_asset_id from public.post_media where post_id = $1 order by position`, [id]);
    expect(media.rows.map((r) => r.media_asset_id)).toEqual([files[1], files[0]]);

    await savePost(alice, alice.ws, postInput({ accountIds: [youtube] }), id, 1);
    const after = await server<{ version: number; targets: number }>(
      `select version, (select count(*)::int from public.post_targets where post_id = $1) as targets from public.posts where id = $1`,
      [id],
    );
    expect(after.rows[0]).toEqual({ version: 2, targets: 1 });
  });

  it("refuses an edit made from an old version", async () => {
    const alice = await signUp("Alice");
    const id = await savePost(alice, alice.ws, postInput());
    await savePost(alice, alice.ws, postInput({ mainCaption: "First edit" }), id, 1);
    await expect(savePost(alice, alice.ws, postInput({ mainCaption: "Stale edit" }), id, 1)).rejects.toThrow(/version_conflict/);
  });

  it("refuses to mark a post as publishing or published from a client", async () => {
    const alice = await signUp("Alice");
    await expect(savePost(alice, alice.ws, postInput({ status: "published" }))).rejects.toThrow(/row-level security/);
    const account = await addAccount(alice.ws);
    const id = await savePost(alice, alice.ws, postInput({ accountIds: [account] }));
    await expect(as(alice, `update public.posts set status = 'publishing' where id = $1`, [id])).rejects.toThrow(/row-level security/);
    await expect(as(alice, `update public.post_targets set status = 'published' where post_id = $1`, [id])).rejects.toThrow(/row-level security/);
  });
});

describe("protected columns", () => {
  it("never shows account tokens to clients", async () => {
    const alice = await signUp("Alice");
    await addAccount(alice.ws);
    await expect(as(alice, `select access_token_enc from public.social_accounts`)).rejects.toThrow(/permission denied/);
    const visible = await as<{ provider: string }>(alice, `select provider from public.social_accounts_public`);
    expect(visible.rows).toEqual([{ provider: "youtube" }]);
  });

  it("lets people edit their profile, but not its email", async () => {
    const alice = await signUp("Alice");
    const updated = await as(alice, `update public.profiles set display_name = 'Alice B', locale = 'de', use_24h = true where id = $1`, [alice.id]);
    expect(updated.affectedRows).toBe(1);
    await expect(as(alice, `update public.profiles set email = 'ceo@bigcorp.example' where id = $1`, [alice.id])).rejects.toThrow(/permission denied/);
  });

  it("keeps ownership, plans, accepted invites and notification content out of clients' hands", async () => {
    const alice = await signUp("Alice");
    const bob = await signUp("Bob");
    await expect(as(alice, `update public.workspaces set owner_id = $2 where id = $1`, [alice.ws, bob.id])).rejects.toThrow(/permission denied/);
    await expect(as(alice, `update public.subscriptions set plan_key = 'scale' where workspace_id = $1`, [alice.ws])).rejects.toThrow(/permission denied/);
    await expect(
      as(alice, `insert into public.invites (workspace_id, email, role, token_hash, invited_by, accepted_at) values ($1, 'x@example.com', 'admin', $2, $3, now())`, [
        alice.ws,
        randomUUID(),
        alice.id,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(as(alice, `update public.notifications set kind = 'failed'`)).rejects.toThrow(/permission denied/);
    await expect(
      as(alice, `insert into public.media_assets (workspace_id, storage_key, kind) values ($1, 'someone-else/file.mp4', 'video')`, [alice.ws]),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("plan limits", () => {
  it("stops connecting accounts at the plan's limit", async () => {
    const alice = await signUp("Alice");
    for (let i = 0; i < 3; i++) await addAccount(alice.ws);
    await expect(addAccount(alice.ws)).rejects.toThrow(/account_limit_reached/);
  });

  it("counts open invites against the plan's seats", async () => {
    const alice = await signUp("Alice");
    const invite = (email: string) =>
      as(alice, `insert into public.invites (workspace_id, email, role, token_hash, invited_by) values ($1, $2, 'editor', $3, $4)`, [
        alice.ws,
        email,
        randomUUID(),
        alice.id,
      ]);
    // Free has one seat, taken by the owner.
    await expect(invite("one@example.com")).rejects.toThrow(/seat_limit_reached/);
    await server(`update public.subscriptions set member_limit = 3 where workspace_id = $1`, [alice.ws]);
    await invite("one@example.com");
    await invite("two@example.com");
    await expect(invite("three@example.com")).rejects.toThrow(/seat_limit_reached/);
  });
});

describe("AI credits and images", () => {
  const reserve = (ws: string, user: User, credits: number) =>
    server<{ generation_id: string; remaining: number }>(`select * from public.reserve_ai_credits($1, $2, 'image', $3, '{}'::jsonb)`, [ws, user.id, credits]).then(
      (r) => r.rows[0],
    );
  const settle = (ws: string, id: string, ok: boolean) => server(`select public.settle_ai_generation($1, $2, $3, 'openai', 'test', null)`, [id, ws, ok]);
  const status = (ws: string) =>
    server<{ credit_limit: number; bonus: number; used: number }>(`select credit_limit, bonus, used from public.ai_credit_status($1)`, [ws]).then((r) => r.rows[0]);

  it("AI-01 charges before the call, refuses past the month's credits, and refunds failures", async () => {
    const alice = await signUp("Alice");
    // Free: 25 credits a month (plans.ts).
    expect(await status(alice.ws)).toEqual({ credit_limit: 25, bonus: 0, used: 0 });
    const first = await reserve(alice.ws, alice, 20);
    expect(first.remaining).toBe(5);
    await settle(alice.ws, first.generation_id, true);
    await expect(reserve(alice.ws, alice, 10)).rejects.toThrow(/ai_credits_exhausted/);
    const second = await reserve(alice.ws, alice, 5);
    expect(second.remaining).toBe(0);
    await settle(alice.ws, second.generation_id, false);
    expect((await status(alice.ws)).used).toBe(20);
    // Settling twice changes nothing.
    await settle(alice.ws, second.generation_id, true);
    expect((await status(alice.ws)).used).toBe(20);
  });

  it("AI-02 spends bonus credits after the month's and returns them when a call fails", async () => {
    const alice = await signUp("Alice");
    await server(`update public.subscriptions set ai_bonus_credits = 30 where workspace_id = $1`, [alice.ws]);
    const call = await reserve(alice.ws, alice, 40);
    expect(call.remaining).toBe(15);
    expect(await status(alice.ws)).toEqual({ credit_limit: 25, bonus: 15, used: 25 });
    await settle(alice.ws, call.generation_id, false);
    expect(await status(alice.ws)).toEqual({ credit_limit: 25, bonus: 30, used: 0 });
  });

  it("AI-03 shows a workspace's AI library only to its members, and only the server writes it", async () => {
    const alice = await signUp("Alice");
    const bob = await signUp("Bob");
    const call = await reserve(alice.ws, alice, 5);
    const { rows: media } = await server<{ id: string }>(
      `insert into public.media_assets (workspace_id, storage_key, kind, status, source) values ($1, $2, 'image', 'ready', 'ai') returning id`,
      [alice.ws, `${alice.ws}/${call.generation_id}/1.jpg`],
    );
    await server(
      `insert into public.ai_images (workspace_id, generation_id, media_asset_id, prompt, style, aspect, quality) values ($1, $2, $3, 'A latte', 'photo', '1:1', 'standard')`,
      [alice.ws, call.generation_id, media[0].id],
    );
    expect((await as(alice, `select id from public.ai_images`)).rows).toHaveLength(1);
    expect((await as(alice, `select id from public.ai_generations`)).rows).toHaveLength(1);
    expect((await as(bob, `select id from public.ai_images`)).rows).toHaveLength(0);
    expect((await as(bob, `select id from public.ai_generations`)).rows).toHaveLength(0);
    await expect(as(alice, `delete from public.ai_images`)).rejects.toThrow(/permission denied/);
    await expect(
      as(alice, `insert into public.ai_generations (workspace_id, kind, credits) values ($1, 'image', 0)`, [alice.ws]),
    ).rejects.toThrow(/permission denied/);
    await expect(as(alice, `update public.subscriptions set ai_bonus_credits = 1000`)).rejects.toThrow(/permission denied/);
    await expect(as(null, `select * from public.ai_images`)).rejects.toThrow(/permission denied/);
  });

  it("AI-04 never lets clients charge, refund or read credits directly", async () => {
    const alice = await signUp("Alice");
    const call = await reserve(alice.ws, alice, 5);
    await expect(as(alice, `select * from public.reserve_ai_credits($1, $2, 'image', 0, '{}'::jsonb)`, [alice.ws, alice.id])).rejects.toThrow(/permission denied/);
    await expect(as(alice, `select public.settle_ai_generation($1, $2, false, null, null, null)`, [call.generation_id, alice.ws])).rejects.toThrow(/permission denied/);
    await expect(as(alice, `select * from public.ai_credit_status($1)`, [alice.ws])).rejects.toThrow(/permission denied/);
  });
});

describe("email code attempts", () => {
  const hash = () => randomUUID().replace(/-/g, "").padEnd(64, "0");
  const locked = (h: string, purpose = "signup") =>
    server<{ locked: boolean }>(`select public.auth_code_locked($1, $2) as locked`, [purpose, h]).then((r) => r.rows[0].locked);
  const failed = (h: string, purpose = "signup") =>
    server<{ n: number }>(`select public.auth_code_failed($1, $2) as n`, [purpose, h]).then((r) => r.rows[0].n);

  it("AUTH-04 locks an address after 5 wrong codes, per purpose, until a new code is sent", async () => {
    const h = hash();
    for (let i = 1; i <= 4; i++) expect(await failed(h)).toBe(i);
    expect(await locked(h)).toBe(false);
    expect(await failed(h)).toBe(5);
    expect(await locked(h)).toBe(true);
    // The reset code for the same address is counted separately.
    expect(await locked(h, "recovery")).toBe(false);
    await server(`select public.auth_code_reset('signup', $1)`, [h]);
    expect(await locked(h)).toBe(false);
  });

  it("AUTH-04 lets the lock lapse after 15 minutes and starts a new count", async () => {
    const h = hash();
    for (let i = 0; i < 5; i++) await failed(h);
    await server(`update public.auth_code_attempts set last_failed_at = now() - interval '16 minutes' where email_hash = $1`, [h]);
    expect(await locked(h)).toBe(false);
    expect(await failed(h)).toBe(1);
  });

  it("AUTH-04 keeps the attempt counts away from clients", async () => {
    const alice = await signUp("Alice");
    const h = hash();
    await failed(h);
    await expect(as(alice, `select * from public.auth_code_attempts`)).rejects.toThrow(/permission denied/);
    await expect(as(null, `select * from public.auth_code_attempts`)).rejects.toThrow(/permission denied/);
    for (const fn of [`auth_code_locked('signup', $1)`, `auth_code_failed('signup', $1)`, `auth_code_reset('signup', $1)`]) {
      await expect(as(alice, `select public.${fn}`, [h])).rejects.toThrow(/permission denied/);
    }
  });
});
