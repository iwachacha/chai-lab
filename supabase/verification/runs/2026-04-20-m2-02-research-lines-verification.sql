-- M2-02 research_lines verification probes
-- Prerequisites:
-- 1. Execute `supabase/verification/sql/local-db-auth-harness.sql`
-- 2. Apply `supabase/migrations/20260420103000_create_research_lines_table.sql`
-- 3. Apply `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`
--
-- Actor A user_id: 11111111-1111-1111-1111-111111111111
-- Actor B user_id: 22222222-2222-2222-2222-222222222222

select
  'M2-02' as slice_id,
  'research_lines' as target_unit,
  current_timestamp as executed_at;

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class as c
join pg_namespace as n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'research_lines';

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'research_lines'
order by indexname;

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'research_lines'
order by policyname;

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'research_lines'
  and grantee in ('anon', 'authenticated', 'public')
order by grantee, privilege_type;

begin;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.research_lines (id, user_id, title, description)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-1111-1111-111111111111',
  'Masala baseline',
  'actor A insert'
);

select
  current_user as actor_role,
  auth.uid() as actor_user_id;

select
  id,
  user_id,
  title,
  description,
  archived_at
from public.research_lines
order by title;

update public.research_lines
set description = 'actor A update',
    archived_at = '2026-04-20T10:00:00Z'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
returning id, title, description, archived_at;

insert into public.research_lines (id, user_id, title, description)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  '11111111-1111-1111-1111-111111111111',
  'Masala baseline',
  'duplicate title reused after archive'
)
returning id, title, archived_at;

select
  title,
  count(*) as total_rows,
  count(*) filter (where archived_at is null) as active_rows
from public.research_lines
group by title;
rollback;

begin;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.research_lines (id, user_id, title)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '11111111-1111-1111-1111-111111111111',
  'Actor A visible row'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

select
  count(*) as actor_b_visible_rows
from public.research_lines
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

update public.research_lines
set description = 'actor B update attempt'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
returning id;
rollback;

begin;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

insert into public.research_lines (id, user_id, title)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '11111111-1111-1111-1111-111111111111',
  'Cross owner insert should fail'
);
rollback;

begin;
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select * from public.research_lines;
rollback;

begin;
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);

insert into public.research_lines (id, user_id, title)
values (
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  '11111111-1111-1111-1111-111111111111',
  'Anon insert should fail'
);
rollback;

begin;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.research_lines (id, user_id, title)
values (
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  '11111111-1111-1111-1111-111111111111',
  '  Needs trim  '
);
rollback;

begin;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.research_lines (id, user_id, title)
values (
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
  '11111111-1111-1111-1111-111111111111',
  repeat('x', 81)
);
rollback;

begin;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.research_lines (id, user_id, title)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  '11111111-1111-1111-1111-111111111111',
  'Duplicate active title'
);

insert into public.research_lines (id, user_id, title)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
  '11111111-1111-1111-1111-111111111111',
  'Duplicate active title'
);
rollback;

begin;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.research_lines (id, user_id, title)
values (
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  '11111111-1111-1111-1111-111111111111',
  'Delete should fail'
);

delete from public.research_lines
where id = 'ffffffff-ffff-4fff-8fff-fffffffffff1';
rollback;
