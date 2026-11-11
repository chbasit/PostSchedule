-- The free trial is 7 days, not 14 (DECISIONS.md 2026-11-11). Same signup function as in
-- 20261023120000_core.sql with only the trial length changed; the trigger keeps pointing at it.
-- Trials that already started keep their end date.

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

  -- Free plan limits (src/lib/billing/plans.ts) with the 7-day trial (TRIAL_DAYS).
  insert into public.subscriptions (workspace_id, plan_key, status, trial_ends_at, account_limit, member_limit)
  values (ws, 'free', 'trialing', now() + interval '7 days', 3, 1);

  return new;
end;
$$;
