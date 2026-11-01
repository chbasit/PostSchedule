// End-to-end checks of the real backend over HTTP, the way the browser calls it: sign-up with
// codes, wrong-code lock, sign-in and sign-out, password reset, profile, tags, posts, workspace
// isolation and request hygiene (TEST.md AUTH-*, AUTHZ-*, DBL-*).
//
// Needs `npm run dev` in development mode, which hands codes back instead of emailing them.
// Uses two throwaway accounts (qa+<run>-a/b@agentiqsocial.com) on the database in .env.local
// and deletes them, with their workspaces, at the end.
//
// Usage: npm run check:api [base url, default http://localhost:3000]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const env = Object.fromEntries(
  readFileSync(join(import.meta.dirname, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ---- A browser-like client: keeps its cookies between calls ----

class Client {
  constructor(name) {
    this.name = name;
    this.jar = new Map();
  }
  copy(name) {
    const c = new Client(name);
    c.jar = new Map(this.jar);
    return c;
  }
  async call(method, path, body, headers = {}) {
    const init = { method, headers: { Accept: "application/json", ...headers }, redirect: "manual" };
    if (body !== undefined) {
      init.headers["Content-Type"] ??= "application/json";
      init.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    if (this.jar.size) init.headers.Cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(`${BASE}/api/v1${path}`, init);
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attrs] = line.split(";");
      const name = pair.slice(0, pair.indexOf("=")).trim();
      const value = pair.slice(pair.indexOf("=") + 1).trim();
      const gone = !value || attrs.some((a) => /^\s*max-age=0/i.test(a)) || attrs.some((a) => /^\s*expires=thu, 01 jan 1970/i.test(a));
      if (gone) this.jar.delete(name);
      else this.jar.set(name, value);
    }
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, json, retryAfter: res.headers.get("retry-after") };
  }
}

// ---- Reporting ----

let passed = 0;
const failures = [];
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function expect(res, status, extra) {
  if (res.status !== status) throw new Error(`expected HTTP ${status}, got ${res.status}: ${JSON.stringify(res.json)?.slice(0, 300)}`);
  if (extra) {
    const problem = extra(res.json);
    if (problem) throw new Error(`${problem}: ${JSON.stringify(res.json)?.slice(0, 300)}`);
  }
  return res.json;
}
const reason = (r) => r?.error?.details?.reason;
const section = (title) => console.log(`\n${title}`);

// ---- The run ----

const run = Date.now().toString(36);
const emailA = `qa+${run}-a@agentiqsocial.com`;
const emailB = `qa+${run}-b@agentiqsocial.com`;
const passA = `first-pass-${run}1`;
const passA2 = `second-pass-${run}2`;
const passB = `bee-pass-${run}3`;
const WRONG = "00000000";
const created = new Set();

const a = new Client("A");
const b = new Client("B");
const anon = new Client("signed out");
let wsA = null;
let wsB = null;
let firstCode = null;
let codeA = null;

async function signUp(client, email, password, name) {
  return client.call("POST", "/auth/sign-up", { displayName: name, email, password, locale: "en", timezone: "Asia/Karachi" });
}

try {
  await fetch(`${BASE}/api/v1/auth/session`).catch(() => {
    throw new Error(`No server at ${BASE}. Start it with npm run dev, then run this again.`);
  });

  section("Request hygiene");
  await check("a request from another site is refused (403)", async () => {
    expect(await anon.call("POST", "/auth/sign-in", { email: emailA, password: "x" }, { Origin: "https://evil.example" }), 403);
  });
  await check("a body that is not JSON is refused (422)", async () => {
    expect(await anon.call("POST", "/auth/sign-in", "not json"), 422);
  });
  await check("sign-up with missing fields is refused (422)", async () => {
    expect(await anon.call("POST", "/auth/sign-up", { email: emailA }), 422);
  });
  await check("sign-up with a weak password is refused (422)", async () => {
    expect(await signUp(anon, emailA, "short1", "QA A"), 422);
  });
  await check("a malformed workspace id is 'not found' (404)", async () => {
    expect(await anon.call("GET", "/workspaces/not-a-uuid/posts"), 404);
  });
  await check("workspace data needs a session (401)", async () => {
    expect(await anon.call("GET", `/workspaces/${crypto.randomUUID()}/posts`), 401);
  });
  await check("profile changes need a session (401), before the body is read", async () => {
    expect(await anon.call("PATCH", "/me", { timezone: "Not/AZone" }), 401);
  });

  section("Sign-up and email code");
  await check("sign-up answers with no session and, in development mode, the code", async () => {
    const r = expect(await signUp(a, emailA, passA, "QA Alpha"), 200, (j) =>
      j.workspaces.length !== 0 ? "should have no workspace yet" : j.user.emailVerified ? "should not be verified" : !/^\d{6,10}$/.test(j.dev?.code ?? "") ? "no development code: is the server in development mode (npm run dev)?" : null,
    );
    firstCode = r.dev.code;
  });
  if (!firstCode) throw new Error("Stopping: without development codes the remaining checks cannot run.");
  await check("signing in before the code is entered asks for the code (403 email_not_confirmed)", async () => {
    expect(await a.call("POST", "/auth/sign-in", { email: emailA, password: passA }), 403, (j) => (reason(j) !== "email_not_confirmed" ? "wrong reason" : null));
  });
  await check("5 wrong codes are refused (422 invalid_code)", async () => {
    for (let i = 0; i < 5; i++) expect(await a.call("POST", "/auth/verify-email", { email: emailA, code: WRONG }), 422, (j) => (reason(j) !== "invalid_code" ? "wrong reason" : null));
  });
  await check("then the address is locked, even for the right code (429 code_locked, Retry-After)", async () => {
    const r = await a.call("POST", "/auth/verify-email", { email: emailA, code: firstCode });
    expect(r, 429, (j) => (reason(j) !== "code_locked" ? "wrong reason" : null));
    if (!r.retryAfter) throw new Error("no Retry-After header");
  });
  await check("a new code lifts the lock", async () => {
    const r = expect(await a.call("POST", "/auth/resend-verification", { email: emailA }), 200, (j) => (!j.dev?.code ? "no code" : null));
    codeA = r.dev.code;
  });
  await check("the older code stops working once a newer one exists", async () => {
    if (firstCode === codeA) return;
    expect(await a.call("POST", "/auth/verify-email", { email: emailA, code: firstCode }), 422);
  });
  await check("a pasted code with spaces and dashes works, confirms the email and signs in", async () => {
    const spaced = `${codeA.slice(0, 4)} - ${codeA.slice(4)}`;
    const s = expect(await a.call("POST", "/auth/verify-email", { email: emailA.toUpperCase(), code: spaced }), 200, (j) =>
      !j.user.emailVerified ? "not verified" : j.workspaces.length !== 1 ? "expected one workspace" : j.workspaces[0].role !== "owner" ? "not owner" : null,
    );
    wsA = s.workspaces[0].id;
    created.add(s.user.id);
    if (s.workspaces[0].planKey !== "free" || s.workspaces[0].subscription.status !== "trialing") throw new Error("expected a Free plan on trial");
    if (s.user.displayName !== "QA Alpha" || s.user.timezone !== "Asia/Karachi") throw new Error("sign-up details were not kept");
  });
  await check("the same code cannot be used twice (422)", async () => {
    expect(await anon.call("POST", "/auth/verify-email", { email: emailA, code: codeA }), 422);
  });
  await check("the session survives the next request", async () => {
    expect(await a.call("GET", "/auth/session"), 200, (j) => (j.session?.user.email !== emailA ? "wrong or no session" : null));
  });
  await check("signing up again with a confirmed address gives the same neutral answer", async () => {
    expect(await signUp(anon, emailA, passA, "Someone"), 200, (j) => (j.workspaces.length ? "leaked a session" : j.dev?.note !== "account_exists" ? "expected note account_exists" : null));
  });
  await check("asking for a code for a confirmed address makes none", async () => {
    expect(await anon.call("POST", "/auth/resend-verification", { email: emailA }), 200, (j) => (j.dev?.code ? "should not make a code" : null));
  });

  section("Profile");
  await check("onboarding answers are saved", async () => {
    const at = new Date().toISOString();
    expect(await a.call("PATCH", "/me", { persona: "agency", onboardedAt: at }), 200, (j) => (j.persona !== "agency" || !j.onboardedAt ? "not saved" : null));
  });
  await check("an unknown time zone is refused (422)", async () => {
    expect(await a.call("PATCH", "/me", { timezone: "Mars/Olympus_Mons" }), 422);
  });

  section("Workspace: accounts, members, tags");
  await check("a new workspace has no social accounts", async () => {
    expect(await a.call("GET", `/workspaces/${wsA}/accounts`), 200, (j) => (j.length !== 0 ? "expected none" : null));
  });
  await check("the owner is the only member", async () => {
    expect(await a.call("GET", `/workspaces/${wsA}/members`), 200, (j) => (j.length !== 1 || j[0].role !== "owner" || j[0].email !== emailA ? "unexpected members" : null));
  });
  let tagId = null;
  await check("a tag is created", async () => {
    tagId = expect(await a.call("POST", `/workspaces/${wsA}/tags`, { name: "Launch", color: "green" }), 200).id;
  });
  await check("the same name in other letter case is a conflict (409)", async () => {
    expect(await a.call("POST", `/workspaces/${wsA}/tags`, { name: "LAUNCH", color: "blue" }), 409);
  });
  await check("an unknown colour is refused (422)", async () => {
    expect(await a.call("POST", `/workspaces/${wsA}/tags`, { name: "Promo", color: "purple" }), 422);
  });
  await check("a tag is renamed", async () => {
    expect(await a.call("PATCH", `/workspaces/${wsA}/tags/${tagId}`, { name: "Spring launch" }), 200, (j) => (j.name !== "Spring launch" ? "not renamed" : null));
  });
  await check("a double-clicked create with one Idempotency-Key makes one tag (DBL-01)", async () => {
    const key = crypto.randomUUID();
    const [one, two] = await Promise.all([
      a.call("POST", `/workspaces/${wsA}/tags`, { name: "Hiring", color: "blue" }, { "Idempotency-Key": key }),
      a.call("POST", `/workspaces/${wsA}/tags`, { name: "Hiring", color: "blue" }, { "Idempotency-Key": key }),
    ]);
    const ids = [one, two].filter((r) => r.status === 200).map((r) => r.json.id);
    if (!ids.length || new Set(ids).size !== 1) throw new Error(`expected one tag, got ${one.status}/${two.status}`);
    const again = await a.call("POST", `/workspaces/${wsA}/tags`, { name: "Hiring", color: "blue" }, { "Idempotency-Key": key });
    expect(again, 200, (j) => (j.id !== ids[0] ? "a repeat made a second tag" : null));
  });
  await check("reusing an Idempotency-Key for a different request is refused (422)", async () => {
    const key = crypto.randomUUID();
    expect(await a.call("POST", `/workspaces/${wsA}/tags`, { name: "Evergreen", color: "violet" }, { "Idempotency-Key": key }), 200);
    expect(await a.call("POST", `/workspaces/${wsA}/tags`, { name: "Other", color: "violet" }, { "Idempotency-Key": key }), 422, (j) => (j.error.code !== "idempotency_mismatch" ? "wrong code" : null));
  });
  await check("a tag is deleted, and deleting it again is not an error (DBL-21)", async () => {
    expect(await a.call("DELETE", `/workspaces/${wsA}/tags/${tagId}`), 204);
    expect(await a.call("DELETE", `/workspaces/${wsA}/tags/${tagId}`), 204);
  });
  await check("a free workspace has no room to invite (403 plan_limit_reached)", async () => {
    expect(await a.call("POST", `/workspaces/${wsA}/invites`, { email: emailB, role: "editor" }), 403, (j) => (j.error.code !== "plan_limit_reached" ? "wrong code" : null));
  });

  section("Workspace: posts");
  const draft = { type: "text", mainCaption: `QA caption ${run}`, accountIds: [], captionOverrides: {}, targetOptions: {}, media: [], intent: "draft", scheduledAt: null, timezone: "Asia/Karachi", tagIds: [], aiGenerated: false };
  let post = null;
  await check("a draft is saved (version 1)", async () => {
    post = expect(await a.call("POST", `/workspaces/${wsA}/posts`, draft), 200, (j) => (j.status !== "draft" || j.version !== 1 ? "unexpected draft" : null));
  });
  await check("an edit with the current version is saved (version 2)", async () => {
    expect(await a.call("PATCH", `/workspaces/${wsA}/posts/${post.id}`, { ...draft, mainCaption: "edited" }, { "If-Match": "1" }), 200, (j) => (j.version !== 2 ? "version did not move" : null));
  });
  await check("an edit from an old version is a conflict (409)", async () => {
    expect(await a.call("PATCH", `/workspaces/${wsA}/posts/${post.id}`, { ...draft, mainCaption: "stale" }, { "If-Match": "1" }), 409);
  });
  await check("an edit without a version is refused (422)", async () => {
    expect(await a.call("PATCH", `/workspaces/${wsA}/posts/${post.id}`, draft), 422);
  });
  await check("the list finds the post by text, and filters by status and date", async () => {
    const all = expect(await a.call("GET", `/workspaces/${wsA}/posts?q=edited`), 200);
    if (!all.some((p) => p.id === post.id)) throw new Error("search did not find it");
    const scheduled = expect(await a.call("GET", `/workspaces/${wsA}/posts?status=scheduled`), 200);
    if (scheduled.some((p) => p.id === post.id)) throw new Error("a draft showed as scheduled");
    const from = new Date(Date.now() - 3600_000).toISOString();
    const to = new Date(Date.now() + 3600_000).toISOString();
    const inRange = expect(await a.call("GET", `/workspaces/${wsA}/posts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`), 200);
    if (!inRange.some((p) => p.id === post.id)) throw new Error("date range missed it");
    const later = new Date(Date.now() + 86_400_000).toISOString();
    const outOfRange = expect(await a.call("GET", `/workspaces/${wsA}/posts?from=${encodeURIComponent(later)}`), 200);
    if (outOfRange.some((p) => p.id === post.id)) throw new Error("date range included it");
  });
  await check("search treats % and _ as plain characters", async () => {
    expect(await a.call("GET", `/workspaces/${wsA}/posts?q=${encodeURIComponent("%_%")}`), 200, (j) => (j.some((p) => p.id === post.id) ? "wildcards matched" : null));
  });
  await check("scheduling with no account is refused (422)", async () => {
    expect(await a.call("POST", `/workspaces/${wsA}/posts`, { ...draft, intent: "schedule", scheduledAt: new Date(Date.now() + 86_400_000).toISOString() }), 422);
  });
  await check("publishing now says it is not set up yet (503)", async () => {
    expect(await a.call("POST", `/workspaces/${wsA}/posts`, { ...draft, intent: "now" }), 503);
  });
  await check("an unknown post is 'not found' (404)", async () => {
    expect(await a.call("GET", `/workspaces/${wsA}/posts/${crypto.randomUUID()}`), 404);
    expect(await a.call("GET", `/workspaces/${wsA}/posts/abc`), 404);
  });
  await check("a post is deleted, twice without error, and is gone", async () => {
    expect(await a.call("DELETE", `/workspaces/${wsA}/posts/${post.id}`), 204);
    expect(await a.call("DELETE", `/workspaces/${wsA}/posts/${post.id}`), 204);
    expect(await a.call("GET", `/workspaces/${wsA}/posts/${post.id}`), 404);
  });
  await check("notifications start empty", async () => {
    expect(await a.call("GET", `/workspaces/${wsA}/notifications`), 200, (j) => (j.length ? "expected none" : null));
  });
  await check("features that are not switched on say so (503): AI, media uploads", async () => {
    expect(await a.call("GET", `/workspaces/${wsA}/ai/credits`), 503);
    expect(await a.call("POST", `/workspaces/${wsA}/media/uploads`, {}), 503);
  });

  section("Isolation between workspaces");
  await check("a second person signs up and confirms", async () => {
    const r = expect(await signUp(b, emailB, passB, "QA Bravo"), 200);
    const s = expect(await b.call("POST", "/auth/verify-email", { email: emailB, code: r.dev.code }), 200);
    wsB = s.workspaces[0].id;
    created.add(s.user.id);
    if (wsB === wsA) throw new Error("shared a workspace");
  });
  await check("they cannot read, write or list the other workspace (404, as if it did not exist)", async () => {
    expect(await b.call("GET", `/workspaces/${wsA}/posts`), 404);
    expect(await b.call("POST", `/workspaces/${wsA}/tags`, { name: "Intruder", color: "rose" }), 404);
    expect(await b.call("GET", `/workspaces/${wsA}/members`), 404);
    expect(await b.call("POST", `/workspaces/${wsA}/posts`, draft), 404);
  });
  await check("each session lists only its own workspace", async () => {
    expect(await a.call("GET", "/auth/session"), 200, (j) => (j.session.workspaces.length !== 1 || j.session.workspaces[0].id !== wsA ? "saw another workspace" : null));
  });

  section("Sign-out and sign-in");
  const beforeSignOut = a.copy("A, old cookies");
  await check("sign-out ends the session", async () => {
    expect(await a.call("POST", "/auth/sign-out", {}), 204);
    expect(await a.call("GET", "/auth/session"), 200, (j) => (j.session ? "still signed in" : null));
  });
  await check("the signed-out session's cookies no longer open the workspace (401, AUTH-10)", async () => {
    expect(await beforeSignOut.call("GET", `/workspaces/${wsA}/posts`), 401);
  });
  await check("a wrong password and an unknown address get the same answer (401, AUTH-05)", async () => {
    const wrong = expect(await a.call("POST", "/auth/sign-in", { email: emailA, password: "not-the-password-1" }), 401);
    const unknown = expect(await a.call("POST", "/auth/sign-in", { email: `qa+${run}-nobody@agentiqsocial.com`, password: "not-the-password-1" }), 401);
    if (wrong.error.message !== unknown.error.message) throw new Error("the messages differ");
  });
  await check("signing in works, with the address in any letter case", async () => {
    expect(await a.call("POST", "/auth/sign-in", { email: `  ${emailA.toUpperCase()} `, password: passA }), 200, (j) => (j.user.email !== emailA ? "wrong user" : null));
  });

  section("Password reset");
  await check("a reset for an unknown address gets the same answer (200), and makes no code", async () => {
    expect(await anon.call("POST", "/auth/password-reset", { email: `qa+${run}-nobody@agentiqsocial.com` }), 200, (j) => (j.dev?.code ? "made a code" : null));
  });
  let resetCode = null;
  await check("a reset code is made", async () => {
    resetCode = expect(await anon.call("POST", "/auth/password-reset", { email: emailA }), 200, (j) => (!j.dev?.code ? "no code" : null)).dev.code;
  });
  const resetter = new Client("resetting browser");
  const oldSession = a.copy("A, before reset");
  await check("a wrong reset code is refused (422 invalid_code)", async () => {
    expect(await resetter.call("POST", "/auth/password-update", { email: emailA, code: WRONG, password: passA2 }), 422, (j) => (reason(j) !== "invalid_code" ? "wrong reason" : null));
  });
  await check("the current password is refused as the new one (422 same_password)", async () => {
    expect(await resetter.call("POST", "/auth/password-update", { email: emailA, code: resetCode, password: passA }), 422, (j) => (reason(j) !== "same_password" ? "wrong reason" : null));
  });
  await check("trying another password then works without a second code", async () => {
    expect(await resetter.call("POST", "/auth/password-update", { email: emailA, code: WRONG, password: passA2 }), 204);
  });
  await check("the reset signs out every device (AUTH-06)", async () => {
    expect(await oldSession.call("GET", "/auth/session"), 200, (j) => (j.session ? "old session still alive" : null));
    expect(await oldSession.call("GET", `/workspaces/${wsA}/posts`), 401);
  });
  await check("the old password no longer works; the new one does", async () => {
    expect(await a.call("POST", "/auth/sign-in", { email: emailA, password: passA }), 401);
    expect(await a.call("POST", "/auth/sign-in", { email: emailA, password: passA2 }), 200);
  });
  await check("the other person's session was not touched", async () => {
    expect(await b.call("GET", "/auth/session"), 200, (j) => (j.session?.user.email !== emailB ? "B was signed out" : null));
  });
} catch (e) {
  failures.push(e.message);
  console.log(`\n  ✗ ${e.message}`);
} finally {
  section("Clean-up");
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) if (u.email?.startsWith(`qa+${run}-`)) created.add(u.id);
  for (const id of created) {
    const w = await admin.from("workspaces").delete().eq("owner_id", id);
    const d = await admin.auth.admin.deleteUser(id);
    console.log(`  ${w.error || d.error ? "✗" : "✓"} removed test account ${id}${w.error ? ` (workspace: ${w.error.message})` : ""}${d.error ? ` (user: ${d.error.message})` : ""}`);
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  process.exitCode = failures.length ? 1 : 0;
}
