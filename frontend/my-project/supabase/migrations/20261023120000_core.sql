-- Core schema: identity and workspaces, billing, social accounts, posts, tags and
-- notifications (BACKEND.md sections 4 to 6). Every tenant table has workspace_id, row-level
-- security and policies built on is_member(). Server-only tables have no client policies.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------------------
-- Identity and workspaces
-- ---------------------------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text not null check (char_length(display_name) between 1 and 80),
  persona       text check (persona in ('creator', 'startup', 'agency', 'other')),
  timezone      text not null default 'UTC',
  locale        text not null default 'en',
  use_24h       boolean not null default false,
  onboarded_at  timestamptz,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.workspaces (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (char_length(name) between 1 and 80),
  owner_id             uuid not null references auth.users(id),
  kind                 text not null default 'personal' check (kind in ('personal', 'agency', 'client')),
  parent_workspace_id  uuid references public.workspaces(id) on delete cascade,
  default_locale       text not null default 'en',
  default_timezone     text not null default 'UTC',
  settings             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);
create index workspaces_owner_idx on public.workspaces (owner_id);

create table public.workspace_members (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('owner', 'admin', 'editor', 'viewer', 'reviewer')),
  created_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email        text not null check (char_length(email) between 3 and 254),
  role         text not null check (role in ('admin', 'editor', 'viewer', 'reviewer')),
  -- SHA-256 of the emailed token; the token itself is never stored (BACKEND.md 6.5).
  token_hash   text not null unique,
  invited_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  revoked_at   timestamptz
);
create index invites_workspace_idx on public.invites (workspace_id);
create unique index invites_open_email_idx on public.invites (workspace_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------------------
-- Billing (written by the server only)
-- ---------------------------------------------------------------------------------------

create table public.subscriptions (
  workspace_id        uuid primary key references public.workspaces(id) on delete cascade,
  plan_key            text not null default 'free' check (plan_key in ('free', 'solo', 'pro', 'agency', 'scale')),
  interval            text check (interval in ('month', 'year')),
  status              text not null default 'active'
                        check (status in ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired')),
  -- Copied from src/lib/billing/plans.ts by the server; the database enforces them (5.5).
  account_limit       int not null default 3,
  member_limit        int not null default 1,
  ls_customer_id      text,
  ls_subscription_id  text unique,
  ls_variant_id       text,
  -- Lemon Squeezy's updated_at of the last event applied, to ignore older events (PAY-10).
  ls_updated_at       timestamptz,
  trial_ends_at       timestamptz,
  current_period_end  timestamptz,
  cancel_at           timestamptz,
  paused_until        timestamptz,
  updated_at          timestamptz not null default now()
);

create table public.webhook_events (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,
  -- Lemon Squeezy sends no delivery id, so this is the SHA-256 of the raw body.
  event_id      text not null,
  event_name    text,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text,
  unique (provider, event_id)
);

-- One open checkout per workspace and plan, reused within its lifetime (PAY-03).
create table public.checkout_sessions (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_key     text not null,
  interval     text not null check (interval in ('month', 'year')),
  checkout_id  text not null,
  url          text not null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index checkout_sessions_lookup_idx on public.checkout_sessions (workspace_id, plan_key, interval, expires_at desc);

create table public.idempotency_keys (
  workspace_id     uuid not null,
  route            text not null,
  key              text not null,
  request_hash     text not null,
  response_status  int,
  response_body    jsonb,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '48 hours',
  primary key (workspace_id, route, key)
);

create table public.audit_log (
  id            bigint generated always as identity primary key,
  workspace_id  uuid,
  actor_id      uuid,
  action        text not null,
  entity        text,
  entity_id     text,
  ip            inet,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_workspace_idx on public.audit_log (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------------------
-- Social accounts and media
-- ---------------------------------------------------------------------------------------

create table public.social_accounts (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  provider              text not null check (provider in ('instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'bluesky')),
  provider_account_id   text not null,
  display_name          text,
  handle                text,
  avatar_url            text,
  access_token_enc      text,
  refresh_token_enc     text,
  expires_at            timestamptz,
  scopes                text[] not null default '{}',
  status                text not null default 'active' check (status in ('active', 'needs_reconnect', 'revoked')),
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  unique (workspace_id, provider, provider_account_id),
  -- Lets link tables require that both sides belong to the same workspace.
  unique (id, workspace_id)
);
create index social_accounts_workspace_idx on public.social_accounts (workspace_id);

create table public.media_assets (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null references public.workspaces(id) on delete cascade,
  uploader_id            uuid references auth.users(id) on delete set null,
  storage_key            text not null unique,
  name                   text not null default '',
  kind                   text not null check (kind in ('image', 'video', 'audio', 'pdf')),
  mime                   text,
  bytes                  bigint,
  sha256                 text,
  width                  int,
  height                 int,
  duration_ms            int,
  bitrate                int,
  fps                    numeric,
  codec                  text,
  thumbnail_key          text,
  status                 text not null default 'uploading' check (status in ('uploading', 'processing', 'ready', 'failed')),
  derived_from_asset_id  uuid references public.media_assets(id) on delete set null,
  created_at             timestamptz not null default now(),
  unique (id, workspace_id)
);
create index media_assets_workspace_idx on public.media_assets (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------------------
-- Posts and tags
-- ---------------------------------------------------------------------------------------

create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  created_by     uuid references auth.users(id) on delete set null,
  type           text not null check (type in ('text', 'image', 'video', 'story')),
  status         text not null default 'draft'
                   check (status in ('draft', 'pending_approval', 'scheduled', 'publishing',
                                     'published', 'partial', 'failed', 'lapsed', 'paused')),
  main_caption   text not null default '',
  scheduled_at   timestamptz,
  timezone       text,
  source         text not null default 'ui' check (source in ('ui', 'api', 'mcp', 'bulk', 'csv')),
  ai_generated   boolean not null default false,
  version        int not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, workspace_id)
);
create index posts_workspace_status_idx on public.posts (workspace_id, status, scheduled_at);
create index posts_due_idx on public.posts (scheduled_at) where status = 'scheduled';

-- Link tables carry workspace_id and reference (id, workspace_id) on both sides, so a row
-- can never join a post to an account, tag or file from another workspace.
create table public.post_targets (
  id                 uuid primary key default gen_random_uuid(),
  post_id            uuid not null,
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  social_account_id  uuid not null,
  provider           text not null,
  caption_override   text,
  options            jsonb,
  status             text not null default 'pending'
                       check (status in ('pending', 'queued', 'publishing', 'published', 'failed', 'skipped', 'needs_check')),
  attempts           int not null default 0,
  next_retry_at      timestamptz,
  provider_post_id   text,
  provider_url       text,
  error_code         text,
  error_message      text,
  published_at       timestamptz,
  unique (post_id, social_account_id),
  foreign key (post_id, workspace_id) references public.posts (id, workspace_id) on delete cascade,
  foreign key (social_account_id, workspace_id) references public.social_accounts (id, workspace_id) on delete cascade
);
create index post_targets_post_idx on public.post_targets (post_id);
create index post_targets_status_idx on public.post_targets (status, next_retry_at) where status in ('pending', 'queued');

create table public.post_media (
  post_id         uuid not null,
  media_asset_id  uuid not null,
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  position        int not null,
  primary key (post_id, media_asset_id),
  foreign key (post_id, workspace_id) references public.posts (id, workspace_id) on delete cascade,
  foreign key (media_asset_id, workspace_id) references public.media_assets (id, workspace_id) on delete cascade
);

create table public.tags (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 40),
  color         text not null check (color in ('blue', 'violet', 'green', 'amber', 'rose', 'peach')),
  created_at    timestamptz not null default now(),
  unique (id, workspace_id)
);
create unique index tags_name_idx on public.tags (workspace_id, lower(name));

create table public.post_tags (
  post_id       uuid not null,
  tag_id        uuid not null,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  primary key (post_id, tag_id),
  foreign key (post_id, workspace_id) references public.posts (id, workspace_id) on delete cascade,
  foreign key (tag_id, workspace_id) references public.tags (id, workspace_id) on delete cascade
);
create index post_tags_tag_idx on public.post_tags (tag_id);

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('published', 'failed', 'needs_reconnect', 'approval_requested', 'invite')),
  post_id       uuid references public.posts(id) on delete cascade,
  account_id    uuid references public.social_accounts(id) on delete cascade,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (workspace_id, user_id, created_at desc);

-- ---------------------------------------------------------------------------------------
-- Membership helpers (BACKEND.md 5.1)
-- ---------------------------------------------------------------------------------------

create or replace function public.is_member(ws uuid, roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and (roles is null or m.role = any(roles))
  );
$$;

-- True when the signed-in user and another user share any workspace.
create or replace function public.shares_workspace(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid() and theirs.user_id = other
  );
$$;

revoke execute on function public.is_member(uuid, text[]) from public, anon;
revoke execute on function public.shares_workspace(uuid) from public, anon;
grant execute on function public.is_member(uuid, text[]) to authenticated;
grant execute on function public.shares_workspace(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.webhook_events enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.audit_log enable row level security;
alter table public.social_accounts enable row level security;
alter table public.media_assets enable row level security;
alter table public.posts enable row level security;
alter table public.post_targets enable row level security;
alter table public.post_media enable row level security;
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;
alter table public.notifications enable row level security;

-- Profiles: yours, and those of people in your workspaces. Only you change yours.
create policy "own or teammate read" on public.profiles
  for select using (id = auth.uid() or public.shares_workspace(id));
create policy "own update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members read" on public.workspaces
  for select using (public.is_member(id));
create policy "admins update" on public.workspaces
  for update using (public.is_member(id, array['owner', 'admin'])) with check (public.is_member(id, array['owner', 'admin']));
create policy "owner delete" on public.workspaces
  for delete using (public.is_member(id, array['owner']));

create policy "members read" on public.workspace_members
  for select using (public.is_member(workspace_id));
-- Admins remove members; nobody removes an owner this way.
create policy "admins remove" on public.workspace_members
  for delete using (public.is_member(workspace_id, array['owner', 'admin']) and role <> 'owner');

create policy "admins read" on public.invites
  for select using (public.is_member(workspace_id, array['owner', 'admin']));
create policy "admins invite" on public.invites
  for insert with check (public.is_member(workspace_id, array['owner', 'admin']) and invited_by = auth.uid());
create policy "admins revoke" on public.invites
  for update using (public.is_member(workspace_id, array['owner', 'admin'])) with check (public.is_member(workspace_id, array['owner', 'admin']));

create policy "members read" on public.subscriptions
  for select using (public.is_member(workspace_id));

-- webhook_events, checkout_sessions, idempotency_keys, audit_log: no client policies at all.

-- Social accounts: tokens are never readable by clients (BACKEND.md 5.4 rule 2). Members read
-- the safe columns; admins remove. Connecting goes through the server.
create policy "members read" on public.social_accounts
  for select using (public.is_member(workspace_id));
create policy "admins delete" on public.social_accounts
  for delete using (public.is_member(workspace_id, array['owner', 'admin']));

create view public.social_accounts_public
with (security_invoker = true) as
  select id, workspace_id, provider, provider_account_id, display_name, handle, avatar_url, status, created_at
  from public.social_accounts;

-- Files are registered by the server when it signs an upload, so clients only read them.
create policy "members read" on public.media_assets
  for select using (public.is_member(workspace_id));

-- Clients save drafts, schedule and send for approval. Publishing states are set by the
-- server's jobs only, and a post's author is always the person who created it.
create policy "members read" on public.posts
  for select using (public.is_member(workspace_id));
create policy "editors insert" on public.posts
  for insert with check (
    public.is_member(workspace_id, array['owner', 'admin', 'editor'])
    and created_by = auth.uid()
    and status in ('draft', 'pending_approval', 'scheduled')
  );
create policy "editors update" on public.posts
  for update using (public.is_member(workspace_id, array['owner', 'admin', 'editor']))
  with check (
    public.is_member(workspace_id, array['owner', 'admin', 'editor'])
    and status in ('draft', 'pending_approval', 'scheduled')
  );
-- Admins delete any post; editors only their own drafts (BACKEND.md 5.3).
create policy "delete posts" on public.posts
  for delete using (
    public.is_member(workspace_id, array['owner', 'admin'])
    or (public.is_member(workspace_id, array['editor']) and created_by = auth.uid() and status = 'draft')
  );

create policy "members read" on public.post_targets
  for select using (public.is_member(workspace_id));
-- A target written by a client is always waiting, with no result yet, for the account's own platform.
create policy "editors write" on public.post_targets
  for all using (public.is_member(workspace_id, array['owner', 'admin', 'editor']))
  with check (
    public.is_member(workspace_id, array['owner', 'admin', 'editor'])
    and status = 'pending'
    and error_code is null
    and error_message is null
    and provider = (select a.provider from public.social_accounts a where a.id = social_account_id)
  );

create policy "members read" on public.post_media
  for select using (public.is_member(workspace_id));
create policy "editors write" on public.post_media
  for all using (public.is_member(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.is_member(workspace_id, array['owner', 'admin', 'editor']));

create policy "members read" on public.tags
  for select using (public.is_member(workspace_id));
create policy "editors write" on public.tags
  for all using (public.is_member(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.is_member(workspace_id, array['owner', 'admin', 'editor']));

create policy "members read" on public.post_tags
  for select using (public.is_member(workspace_id));
create policy "editors write" on public.post_tags
  for all using (public.is_member(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.is_member(workspace_id, array['owner', 'admin', 'editor']));

create policy "own read" on public.notifications
  for select using (user_id = auth.uid() and public.is_member(workspace_id));
create policy "own mark read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------
-- What signed-in clients may touch, column by column
-- ---------------------------------------------------------------------------------------
-- Supabase's API is reachable with the public anon key, so these grants and the policies
-- above are the real boundary, not the app's routes. Everything starts closed; signed-out
-- callers get nothing. Server-only tables (webhook_events, checkout_sessions,
-- idempotency_keys, audit_log) get no grants at all. New tables start closed too, so the
-- migration that adds one grants what clients need.

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, persona, timezone, locale, use_24h, onboarded_at, avatar_url, updated_at)
  on public.profiles to authenticated;

grant select, delete on public.workspaces to authenticated;
grant update (name, default_locale, default_timezone, settings) on public.workspaces to authenticated;

grant select, delete on public.workspace_members to authenticated;

grant select on public.invites to authenticated;
grant insert (workspace_id, email, role, token_hash, invited_by) on public.invites to authenticated;
grant update (revoked_at) on public.invites to authenticated;

grant select on public.subscriptions to authenticated;

-- Tokens stay out: only these columns are readable.
grant select (id, workspace_id, provider, provider_account_id, display_name, handle, avatar_url, expires_at, scopes, status, metadata, created_at),
  delete on public.social_accounts to authenticated;
grant select on public.social_accounts_public to authenticated;

grant select on public.media_assets to authenticated;

grant select, delete on public.posts to authenticated;
grant insert (workspace_id, created_by, type, status, main_caption, scheduled_at, timezone, ai_generated)
  on public.posts to authenticated;
grant update (type, status, main_caption, scheduled_at, timezone, ai_generated, version, updated_at)
  on public.posts to authenticated;

grant select, delete on public.post_targets to authenticated;
grant insert (post_id, workspace_id, social_account_id, provider, caption_override, options, status)
  on public.post_targets to authenticated;
grant update (caption_override, options, status, error_code, error_message) on public.post_targets to authenticated;

grant select, insert, delete on public.post_media to authenticated;
grant select, insert, delete on public.post_tags to authenticated;

grant select, delete on public.tags to authenticated;
grant insert (workspace_id, name, color) on public.tags to authenticated;
grant update (name, color) on public.tags to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------------------
-- Signup: profile, workspace, owner membership and a trial, in one transaction (6.2)
-- ---------------------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws          uuid;
  full_name   text;
  first_name  text;
begin
  full_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                             nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                             split_part(new.email, '@', 1)), 80);
  first_name := split_part(full_name, ' ', 1);

  insert into public.profiles (id, email, display_name, locale, timezone)
  values (
    new.id,
    new.email,
    full_name,
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en'),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  );

  insert into public.workspaces (name, owner_id, kind, default_locale, default_timezone)
  values (left(first_name || '''s workspace', 80), new.id, 'personal',
          coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en'),
          coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC'))
  returning id into ws;

  insert into public.workspace_members (workspace_id, user_id, role) values (ws, new.id, 'owner');

  -- Free plan limits (src/lib/billing/plans.ts) with the 14-day trial (TRIAL_DAYS).
  insert into public.subscriptions (workspace_id, plan_key, status, trial_ends_at, account_limit, member_limit)
  values (ws, 'free', 'trialing', now() + interval '14 days', 3, 1);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile's copy of the email in step with Auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email, updated_at = now() where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------------------
-- Limits enforced in the database (5.5)
-- ---------------------------------------------------------------------------------------

create or replace function public.enforce_account_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int;
  cur int;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text, 0));
  select account_limit into lim from public.subscriptions where workspace_id = new.workspace_id;
  select count(*) into cur from public.social_accounts where workspace_id = new.workspace_id and status <> 'revoked';
  if lim is not null and cur >= lim then
    raise exception 'account_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger social_accounts_limit
  before insert on public.social_accounts
  for each row execute function public.enforce_account_limit();

-- Members plus open invites may not exceed the plan's seats.
create or replace function public.enforce_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int;
  cur int;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text, 1));
  select member_limit into lim from public.subscriptions where workspace_id = new.workspace_id;
  select (select count(*) from public.workspace_members where workspace_id = new.workspace_id)
       + (select count(*) from public.invites
          where workspace_id = new.workspace_id and accepted_at is null and revoked_at is null and expires_at > now())
    into cur;
  if lim is not null and cur >= lim then
    raise exception 'seat_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger invites_seat_limit
  before insert on public.invites
  for each row execute function public.enforce_seat_limit();

-- ---------------------------------------------------------------------------------------
-- Posts: saved in one transaction, with optimistic locking (4.2)
-- ---------------------------------------------------------------------------------------

-- Creates (p_post_id null) or updates a post with its targets, tags and media.
-- Runs as the caller, so row-level security applies to every write.
create or replace function public.save_post(
  p_workspace_id      uuid,
  p_post_id           uuid,
  p_expected_version  int,
  p_input             jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  pid         uuid := p_post_id;
  acc         record;
begin
  if not public.is_member(p_workspace_id, array['owner', 'admin', 'editor']) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if pid is null then
    insert into public.posts (workspace_id, created_by, type, status, main_caption, scheduled_at, timezone, ai_generated)
    values (
      p_workspace_id, auth.uid(), p_input ->> 'type', p_input ->> 'status', coalesce(p_input ->> 'mainCaption', ''),
      (p_input ->> 'scheduledAt')::timestamptz, p_input ->> 'timezone', coalesce((p_input ->> 'aiGenerated')::boolean, false)
    )
    returning id into pid;
  else
    update public.posts
    set type = p_input ->> 'type',
        status = p_input ->> 'status',
        main_caption = coalesce(p_input ->> 'mainCaption', ''),
        scheduled_at = (p_input ->> 'scheduledAt')::timestamptz,
        timezone = p_input ->> 'timezone',
        ai_generated = coalesce((p_input ->> 'aiGenerated')::boolean, false),
        version = version + 1,
        updated_at = now()
    where id = pid and workspace_id = p_workspace_id and version = p_expected_version;
    if not found then
      if exists (select 1 from public.posts where id = pid and workspace_id = p_workspace_id) then
        raise exception 'version_conflict' using errcode = 'P0001';
      end if;
      raise exception 'not_found' using errcode = 'P0001';
    end if;
  end if;

  -- Targets: keep each account's row id, replace the rest.
  delete from public.post_targets
  where post_id = pid
    and not (social_account_id::text = any (array(select jsonb_array_elements_text(p_input -> 'accountIds'))));

  for acc in
    select a.id, a.provider
    from public.social_accounts a
    where a.workspace_id = p_workspace_id
      and a.id::text = any (array(select jsonb_array_elements_text(p_input -> 'accountIds')))
  loop
    insert into public.post_targets (post_id, workspace_id, social_account_id, provider, caption_override, options, status)
    values (
      pid, p_workspace_id, acc.id, acc.provider,
      nullif(trim(p_input -> 'captionOverrides' ->> acc.id::text), ''),
      p_input -> 'targetOptions' -> acc.id::text,
      'pending'
    )
    on conflict (post_id, social_account_id) do update
      set caption_override = excluded.caption_override,
          options = excluded.options,
          status = 'pending',
          error_code = null,
          error_message = null;
  end loop;

  delete from public.post_tags where post_id = pid;
  insert into public.post_tags (post_id, tag_id, workspace_id)
  select pid, t.id, p_workspace_id
  from public.tags t
  where t.workspace_id = p_workspace_id
    and t.id::text = any (array(select jsonb_array_elements_text(p_input -> 'tagIds')));

  delete from public.post_media where post_id = pid;
  insert into public.post_media (post_id, media_asset_id, workspace_id, position)
  select pid, m.id, p_workspace_id, ord.n
  from jsonb_array_elements_text(p_input -> 'mediaIds') with ordinality as ord(media_id, n)
  join public.media_assets m on m.id::text = ord.media_id and m.workspace_id = p_workspace_id;

  return pid;
end;
$$;

revoke execute on function public.save_post(uuid, uuid, int, jsonb) from public, anon;
grant execute on function public.save_post(uuid, uuid, int, jsonb) to authenticated;
