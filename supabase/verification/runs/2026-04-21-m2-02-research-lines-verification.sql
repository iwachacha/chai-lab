-- M2-02 research_lines verification probes
-- Structured for one-shot local execution against a scratch runtime.
-- Prerequisites:
-- 1. Execute `supabase/verification/sql/local-db-auth-harness.sql`
-- 2. Apply `supabase/migrations/20260420103000_create_research_lines_table.sql`
-- 3. Apply `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`
--
-- Actor A user_id: 11111111-1111-1111-1111-111111111111
-- Actor B user_id: 22222222-2222-2222-2222-222222222222

drop table if exists pg_temp.research_lines_verification_results;

create temp table research_lines_verification_results (
  sort_order integer primary key,
  check_key text not null,
  passed boolean not null,
  expected text not null,
  observed text not null,
  sqlstate text
);

grant select, insert, update, delete on table research_lines_verification_results to authenticated, anon;

insert into research_lines_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate
)
select
  1,
  'table_exists_with_rls',
  exists (
    select 1
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'research_lines'
      and c.relrowsecurity
  ),
  'public.research_lines exists and relrowsecurity = true',
  coalesce(
    (
      select format(
        'schema=%s table=%s relrowsecurity=%s',
        n.nspname,
        c.relname,
        c.relrowsecurity
      )
      from pg_class as c
      join pg_namespace as n
        on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'research_lines'
    ),
    'table not found'
  ),
  null;

with actual_policies as (
  select
    array_agg(policyname order by policyname)::text[] as policy_names,
    bool_and(roles = '{authenticated}'::name[]) as authenticated_only
  from pg_policies
  where schemaname = 'public'
    and tablename = 'research_lines'
)
insert into research_lines_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate
)
select
  2,
  'policy_matrix',
  coalesce(
    policy_names = array[
      'research_lines_insert_own',
      'research_lines_select_own',
      'research_lines_update_own'
    ]
    and authenticated_only,
    false
  ),
  'three research_lines owner policies scoped to authenticated',
  coalesce(
    format(
      'policy_names=%s; authenticated_only=%s',
      array_to_string(policy_names, ','),
      authenticated_only
    ),
    'no policies'
  ),
  null
from actual_policies;

with actual_grants as (
  select
    grantee,
    array_agg(privilege_type order by privilege_type)::text[] as privileges
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'research_lines'
    and grantee in ('anon', 'authenticated', 'public')
  group by grantee
),
aggregated as (
  select
    coalesce(
      (
        select privileges
        from actual_grants
        where grantee = 'authenticated'
      ),
      array[]::text[]
    ) as authenticated_privileges,
    exists (
      select 1
      from actual_grants
      where grantee in ('anon', 'public')
    ) as has_anon_or_public_grants,
    coalesce(
      (
        select string_agg(
          grantee || ':' || array_to_string(privileges, ','),
          '; '
          order by grantee
        )
        from actual_grants
      ),
      'no grants'
    ) as observed_grants
)
insert into research_lines_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate
)
select
  3,
  'grant_matrix',
  authenticated_privileges = array['INSERT', 'SELECT', 'UPDATE']
    and not has_anon_or_public_grants,
  'authenticated has INSERT/SELECT/UPDATE only, anon/public have no grants',
  observed_grants,
  null
from aggregated;

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

update public.research_lines
set description = 'actor A update',
    archived_at = '2026-04-21T00:00:00Z'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

insert into public.research_lines (id, user_id, title, description)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  '11111111-1111-1111-1111-111111111111',
  'Masala baseline',
  'duplicate title reused after archive'
);

insert into research_lines_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate
)
select
  10,
  'actor_a_success_path',
  exists (
    select 1
    from public.research_lines
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and description = 'actor A update'
      and archived_at = '2026-04-21T00:00:00Z'::timestamptz
  )
  and exists (
    select 1
    from public.research_lines
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
      and archived_at is null
  ),
  'Actor A can insert, select, update, archive, and reinsert the same title after archive',
  format(
    'visible_rows=%s; active_rows=%s',
    (select count(*) from public.research_lines),
    (select count(*) from public.research_lines where archived_at is null)
  ),
  null;

insert into research_lines_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate
)
select
  11,
  'archive_reuse_after_archive',
  (
    select count(*)
    from public.research_lines
    where title = 'Masala baseline'
  ) = 2
  and (
    select count(*)
    from public.research_lines
    where title = 'Masala baseline'
      and archived_at is null
  ) = 1,
  'archived row allows reuse of the same trimmed title while exactly one row stays active',
  format(
    'total_rows=%s; active_rows=%s',
    (
      select count(*)
      from public.research_lines
      where title = 'Masala baseline'
    ),
    (
      select count(*)
      from public.research_lines
      where title = 'Masala baseline'
        and archived_at is null
    )
  ),
  null;

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

insert into research_lines_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate
)
select
  20,
  'actor_b_select_isolated',
  count(*) = 0,
  'Actor B sees 0 rows owned by Actor A',
  format('visible_rows=%s', count(*)),
  null
from public.research_lines;

do $$
declare
  affected_rows integer;
begin
  update public.research_lines
  set description = 'actor B update attempt'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

  get diagnostics affected_rows = row_count;

  insert into research_lines_verification_results (
    sort_order,
    check_key,
    passed,
    expected,
    observed,
    sqlstate
  )
  values (
    21,
    'actor_b_update_isolated',
    affected_rows = 0,
    'Actor B update affects 0 rows',
    format('affected_rows=%s', affected_rows),
    null
  );
end
$$;

do $$
declare
  actual_sqlstate text;
  actual_message text;
begin
  begin
    insert into public.research_lines (id, user_id, title)
    values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      '11111111-1111-1111-1111-111111111111',
      'Cross owner insert should fail'
    );

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      22,
      'actor_b_cross_owner_insert_rejected',
      false,
      'Cross-owner insert fails with 42501',
      'insert succeeded unexpectedly',
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      22,
      'actor_b_cross_owner_insert_rejected',
      actual_sqlstate = '42501',
      'Cross-owner insert fails with 42501',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate
    );
  end;
end
$$;

reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);

do $$
declare
  actual_sqlstate text;
  actual_message text;
begin
  begin
    perform *
    from public.research_lines;

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      30,
      'anon_select_rejected',
      false,
      'anon select fails with 42501',
      'select succeeded unexpectedly',
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      30,
      'anon_select_rejected',
      actual_sqlstate = '42501',
      'anon select fails with 42501',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate
    );
  end;
end
$$;

do $$
declare
  actual_sqlstate text;
  actual_message text;
begin
  begin
    insert into public.research_lines (id, user_id, title)
    values (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      '11111111-1111-1111-1111-111111111111',
      'Anon insert should fail'
    );

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      31,
      'anon_insert_rejected',
      false,
      'anon insert fails with 42501',
      'insert succeeded unexpectedly',
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      31,
      'anon_insert_rejected',
      actual_sqlstate = '42501',
      'anon insert fails with 42501',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate
    );
  end;
end
$$;

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

do $$
declare
  actual_sqlstate text;
  actual_message text;
begin
  begin
    insert into public.research_lines (id, user_id, title)
    values (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
      '11111111-1111-1111-1111-111111111111',
      '  Needs trim  '
    );

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      40,
      'trim_boundary_rejected',
      false,
      'untrimmed title fails with 23514',
      'insert succeeded unexpectedly',
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      40,
      'trim_boundary_rejected',
      actual_sqlstate = '23514',
      'untrimmed title fails with 23514',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate
    );
  end;
end
$$;

do $$
declare
  actual_sqlstate text;
  actual_message text;
begin
  begin
    insert into public.research_lines (id, user_id, title)
    values (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
      '11111111-1111-1111-1111-111111111111',
      repeat('x', 81)
    );

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      41,
      'title_length_rejected',
      false,
      '81-char title fails with 23514',
      'insert succeeded unexpectedly',
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      41,
      'title_length_rejected',
      actual_sqlstate = '23514',
      '81-char title fails with 23514',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate
    );
  end;
end
$$;

insert into public.research_lines (id, user_id, title)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  '11111111-1111-1111-1111-111111111111',
  'Duplicate active title'
);

do $$
declare
  actual_sqlstate text;
  actual_message text;
begin
  begin
    insert into public.research_lines (id, user_id, title)
    values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
      '11111111-1111-1111-1111-111111111111',
      'Duplicate active title'
    );

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      42,
      'active_duplicate_rejected',
      false,
      'duplicate active title fails with 23505',
      'insert succeeded unexpectedly',
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      42,
      'active_duplicate_rejected',
      actual_sqlstate = '23505',
      'duplicate active title fails with 23505',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate
    );
  end;
end
$$;

do $$
declare
  actual_sqlstate text;
  actual_message text;
begin
  begin
    delete from public.research_lines
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      43,
      'physical_delete_rejected',
      false,
      'physical delete fails with 42501',
      'delete succeeded unexpectedly',
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into research_lines_verification_results (
      sort_order,
      check_key,
      passed,
      expected,
      observed,
      sqlstate
    )
    values (
      43,
      'physical_delete_rejected',
      actual_sqlstate = '42501',
      'physical delete fails with 42501',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate
    );
  end;
end
$$;

insert into research_lines_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate
)
values (
  90,
  'deleted_filter_not_applicable',
  true,
  'N/A because research_lines has no deleted_at and does not depend on active-trial filtering',
  'N/A recorded intentionally for this slice',
  null
);

insert into research_lines_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate
)
values (
  91,
  'direct_crud_not_applicable_except_delete',
  true,
  'N/A because owner direct insert/update are allowed; physical delete still must fail',
  'Owner insert/update covered by success path, physical delete covered separately',
  null
);
