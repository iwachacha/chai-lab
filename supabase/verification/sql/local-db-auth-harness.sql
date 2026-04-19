-- Local non-production auth/RLS harness
-- This file is not a migration.
-- Execute before applying slice migrations and verification probes.
-- Actor A / Actor B:
--   RESET ROLE;
--   SET ROLE authenticated;
--   SELECT set_config('request.jwt.claim.sub', '<actor-uuid>', false);
-- anon:
--   RESET ROLE;
--   SET ROLE anon;
--   SELECT set_config('request.jwt.claim.sub', '', false);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end
$$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text
);

create or replace function public.gen_random_uuid()
returns uuid
language sql
volatile
as $$
  with seed as (
    select md5(random()::text || clock_timestamp()::text) as h
  )
  select (
    substr(h, 1, 8) || '-' ||
    substr(h, 9, 4) || '-4' ||
    substr(h, 14, 3) || '-' ||
    substr('89ab', floor(random() * 4)::int + 1, 1) ||
    substr(h, 18, 3) || '-' ||
    substr(h, 21, 12)
  )::uuid
  from seed;
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

revoke all on function auth.uid() from public;
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'actor-a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'actor-b@example.test')
on conflict (id) do update
set email = excluded.email;
