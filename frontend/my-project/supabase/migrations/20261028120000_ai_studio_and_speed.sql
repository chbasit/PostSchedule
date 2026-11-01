-- AI Studio and faster reads (DECISIONS.md 2026-10-28).
--
-- 1. Monthly AI credits per plan, charged through a ledger (ai_generations): credits are
--    reserved before a model is called and given back if the call fails.
-- 2. The workspace's library of generated images (ai_images), stored as ordinary media
--    assets so they attach to posts like uploads.
-- 3. Speed: indexes on the foreign keys that lacked one, and read policies that look up the
--    caller's workspaces once per query instead of once per row.

-- ---------------------------------------------------------------------------------------
-- Credits
-- ---------------------------------------------------------------------------------------

-- Copied from src/lib/billing/plans.ts (aiCredits) by the server, like the other limits.
-- Bonus credits come from top-up packs: they never expire and are spent after the month's.
alter table public.subscriptions
  add column ai_credit_limit  int not null default 25 check (ai_credit_limit >= 0),
  add column ai_bonus_credits int not null default 0 check (ai_bonus_credits >= 0);

update public.subscriptions
set ai_credit_limit = case plan_key
  when 'solo' then 300
  when 'pro' then 800
  when 'agency' then 2000
  when 'scale' then 4000
  else 25
end;

-- One row per AI call. `credits` were charged when the row was made; `bonus_credits` is the
-- part taken from the bonus pool. Failed calls do not count, and a call still pending after
-- 15 minutes (the server died mid-call) stops counting too.
create table public.ai_generations (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  created_by     uuid references auth.users(id) on delete set null,
  kind           text not null check (kind in ('caption', 'image')),
  status         text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  credits        int not null check (credits >= 0),
  bonus_credits  int not null default 0 check (bonus_credits >= 0 and bonus_credits <= credits),
  provider       text,
  model          text,
  -- The request's options and prompt, for support and abuse review. Never secrets.
  input          jsonb not null default '{}'::jsonb,
  error          text,
  created_at     timestamptz not null default now(),
  finished_at    timestamptz,
  unique (id, workspace_id)
);
create index ai_generations_usage_idx on public.ai_generations (workspace_id, created_at desc);
create index ai_generations_created_by_idx on public.ai_generations (created_by);

-- This month's (UTC) use of the plan's credits, and when it resets.
create or replace function public.ai_credit_status(p_workspace_id uuid)
returns table (credit_limit int, bonus int, used int, resets_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.ai_credit_limit,
    s.ai_bonus_credits,
    coalesce((
      select sum(g.credits - g.bonus_credits)
      from public.ai_generations g
      where g.workspace_id = p_workspace_id
        and g.created_at >= (date_trunc('month', now() at time zone 'utc') at time zone 'utc')
        and (g.status = 'succeeded' or (g.status = 'pending' and g.created_at > now() - interval '15 minutes'))
    ), 0)::int,
    (date_trunc('month', now() at time zone 'utc') + interval '1 month') at time zone 'utc'
  from public.subscriptions s
  where s.workspace_id = p_workspace_id;
$$;

-- Charges an AI call before it runs. The subscription row is locked, so two requests can
-- never both spend the last credits. Raises ai_credits_exhausted when there are too few.
create or replace function public.reserve_ai_credits(
  p_workspace_id uuid,
  p_user_id uuid,
  p_kind text,
  p_credits int,
  p_input jsonb
)
returns table (generation_id uuid, remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  lim         int;
  pool        int;
  spent       int;
  from_month  int;
  from_bonus  int;
  gid         uuid;
begin
  if p_credits < 0 then
    raise exception 'invalid_credits' using errcode = 'P0001';
  end if;
  select s.ai_credit_limit, s.ai_bonus_credits into lim, pool
  from public.subscriptions s
  where s.workspace_id = p_workspace_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  select st.used into spent from public.ai_credit_status(p_workspace_id) st;
  from_month := least(p_credits, greatest(lim - spent, 0));
  from_bonus := p_credits - from_month;
  if from_bonus > pool then
    raise exception 'ai_credits_exhausted' using errcode = 'P0001';
  end if;
  if from_bonus > 0 then
    update public.subscriptions set ai_bonus_credits = ai_bonus_credits - from_bonus where workspace_id = p_workspace_id;
  end if;

  insert into public.ai_generations (workspace_id, created_by, kind, credits, bonus_credits, input)
  values (p_workspace_id, p_user_id, p_kind, p_credits, from_bonus, coalesce(p_input, '{}'::jsonb))
  returning id into gid;

  generation_id := gid;
  remaining := greatest(lim - spent - from_month, 0) + pool - from_bonus;
  return next;
end;
$$;

-- Closes a call. A failure gives the credits back: the month's part by no longer counting,
-- the bonus part by returning it to the pool. Settling twice changes nothing.
create or replace function public.settle_ai_generation(
  p_generation_id uuid,
  p_workspace_id uuid,
  p_ok boolean,
  p_provider text,
  p_model text,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  refund int;
begin
  update public.ai_generations
  set status = case when p_ok then 'succeeded' else 'failed' end,
      provider = p_provider,
      model = p_model,
      error = left(p_error, 500),
      finished_at = now()
  where id = p_generation_id and workspace_id = p_workspace_id and status = 'pending'
  returning bonus_credits into refund;
  if found and not p_ok and refund > 0 then
    update public.subscriptions set ai_bonus_credits = ai_bonus_credits + refund where workspace_id = p_workspace_id;
  end if;
end;
$$;

-- Only the server (service role) charges and settles; it checks membership first.
revoke execute on function public.ai_credit_status(uuid) from public, anon, authenticated;
revoke execute on function public.reserve_ai_credits(uuid, uuid, text, int, jsonb) from public, anon, authenticated;
revoke execute on function public.settle_ai_generation(uuid, uuid, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.ai_credit_status(uuid) to service_role;
grant execute on function public.reserve_ai_credits(uuid, uuid, text, int, jsonb) to service_role;
grant execute on function public.settle_ai_generation(uuid, uuid, boolean, text, text, text) to service_role;

-- ---------------------------------------------------------------------------------------
-- Image library
-- ---------------------------------------------------------------------------------------

alter table public.media_assets
  add column source text not null default 'upload' check (source in ('upload', 'ai'));

create table public.ai_images (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  generation_id   uuid not null,
  media_asset_id  uuid not null,
  prompt          text not null check (char_length(prompt) between 1 and 1000),
  style           text not null,
  aspect          text not null check (aspect in ('1:1', '4:5', '9:16', '16:9')),
  quality         text not null check (quality in ('standard', 'hd')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (generation_id, workspace_id) references public.ai_generations (id, workspace_id) on delete cascade,
  foreign key (media_asset_id, workspace_id) references public.media_assets (id, workspace_id) on delete cascade
);
create index ai_images_workspace_idx on public.ai_images (workspace_id, created_at desc);
create index ai_images_generation_idx on public.ai_images (generation_id);
create index ai_images_media_idx on public.ai_images (media_asset_id);
create index ai_images_created_by_idx on public.ai_images (created_by);

alter table public.ai_generations enable row level security;
alter table public.ai_images enable row level security;

-- ---------------------------------------------------------------------------------------
-- Faster row-level security
-- ---------------------------------------------------------------------------------------
-- is_member(workspace_id) runs once per row, so a list of 1,000 posts with their targets,
-- media and tags made thousands of membership lookups. The caller's workspaces are now read
-- once per query: `(select …)` becomes an InitPlan that Postgres evaluates a single time.
-- Write policies keep is_member(), which also checks the role.

create or replace function public.my_workspace_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(m.workspace_id), '{}'::uuid[])
  from public.workspace_members m
  where m.user_id = auth.uid();
$$;

revoke execute on function public.my_workspace_ids() from public, anon;
grant execute on function public.my_workspace_ids() to authenticated;

drop policy "members read" on public.workspaces;
create policy "members read" on public.workspaces
  for select using (id = any ((select public.my_workspace_ids())::uuid[]));

drop policy "members read" on public.workspace_members;
create policy "members read" on public.workspace_members
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));

drop policy "members read" on public.subscriptions;
create policy "members read" on public.subscriptions
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));

drop policy "members read" on public.social_accounts;
create policy "members read" on public.social_accounts
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));

drop policy "members read" on public.media_assets;
create policy "members read" on public.media_assets
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));

drop policy "members read" on public.posts;
create policy "members read" on public.posts
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));

drop policy "members read" on public.post_targets;
create policy "members read" on public.post_targets
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));

drop policy "members read" on public.post_media;
create policy "members read" on public.post_media
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));

drop policy "members read" on public.tags;
create policy "members read" on public.tags
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));

drop policy "members read" on public.post_tags;
create policy "members read" on public.post_tags
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));

drop policy "own read" on public.notifications;
create policy "own read" on public.notifications
  for select using (user_id = (select auth.uid()) and workspace_id = any ((select public.my_workspace_ids())::uuid[]));

-- Members see their workspace's AI use and library; the server writes both.
create policy "members read" on public.ai_generations
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));
create policy "members read" on public.ai_images
  for select using (workspace_id = any ((select public.my_workspace_ids())::uuid[]));

grant select on public.ai_generations to authenticated;
grant select on public.ai_images to authenticated;

-- ---------------------------------------------------------------------------------------
-- Indexes on foreign keys that had none (BACKEND.md §20: every foreign key). Without them a
-- delete of a post or an account scans these tables.
-- ---------------------------------------------------------------------------------------

create index post_media_media_idx on public.post_media (media_asset_id);
create index post_targets_account_idx on public.post_targets (social_account_id);
create index notifications_post_idx on public.notifications (post_id) where post_id is not null;
create index notifications_account_idx on public.notifications (account_id) where account_id is not null;
create index media_assets_derived_idx on public.media_assets (derived_from_asset_id) where derived_from_asset_id is not null;
create index posts_created_by_idx on public.posts (created_by);
create index idempotency_keys_expires_idx on public.idempotency_keys (expires_at);
