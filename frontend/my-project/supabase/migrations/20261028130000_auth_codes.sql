-- Email codes (DECISIONS.md 2026-10-28): sign-up confirmation and password reset use a code
-- typed into our pages instead of a link. Supabase Auth checks each code and limits tries
-- per IP; this table adds a limit per address (TEST.md AUTH-04): after 5 wrong codes the
-- address is locked for 15 minutes, or until a new code is sent. Server only.

create table public.auth_code_attempts (
  purpose         text not null check (purpose in ('signup', 'recovery')),
  -- SHA-256 of the lower-cased address, so the table holds no email addresses.
  email_hash      text not null check (char_length(email_hash) = 64),
  failures        int not null default 0 check (failures >= 0),
  last_failed_at  timestamptz not null default now(),
  primary key (purpose, email_hash)
);

alter table public.auth_code_attempts enable row level security;
-- No policies and no grants: only the server (service role) reads or writes it.

create or replace function public.auth_code_locked(p_purpose text, p_email_hash text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.auth_code_attempts a
    where a.purpose = p_purpose
      and a.email_hash = p_email_hash
      and a.failures >= 5
      and a.last_failed_at > now() - interval '15 minutes'
  );
$$;

-- Counts a wrong code. A failure more than 15 minutes after the last one starts a new count.
create or replace function public.auth_code_failed(p_purpose text, p_email_hash text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
begin
  insert into public.auth_code_attempts as a (purpose, email_hash, failures, last_failed_at)
  values (p_purpose, p_email_hash, 1, now())
  on conflict (purpose, email_hash) do update
  set failures = case when a.last_failed_at > now() - interval '15 minutes' then a.failures + 1 else 1 end,
      last_failed_at = now()
  returning failures into total;
  -- Old rows are of no use; clear them while here.
  delete from public.auth_code_attempts where last_failed_at < now() - interval '1 day';
  return total;
end;
$$;

-- A correct code, or a newly sent one, starts the count again.
create or replace function public.auth_code_reset(p_purpose text, p_email_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.auth_code_attempts where purpose = p_purpose and email_hash = p_email_hash;
$$;

revoke execute on function public.auth_code_locked(text, text) from public, anon, authenticated;
revoke execute on function public.auth_code_failed(text, text) from public, anon, authenticated;
revoke execute on function public.auth_code_reset(text, text) from public, anon, authenticated;
grant execute on function public.auth_code_locked(text, text) to service_role;
grant execute on function public.auth_code_failed(text, text) to service_role;
grant execute on function public.auth_code_reset(text, text) to service_role;
