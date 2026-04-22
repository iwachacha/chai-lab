-- clone_trial verification probes
-- This file is not a migration.
-- Prerequisites:
-- 1. Execute `supabase/verification/sql/local-db-auth-harness.sql`
-- 2. Apply research_lines, trials / trial_ingredients, and trial RPC migrations
--
-- Actor A user_id: 11111111-1111-1111-1111-111111111111
-- Actor B user_id: 22222222-2222-2222-2222-222222222222

drop table if exists pg_temp.clone_trial_verification_results;

create temp table clone_trial_verification_results (
  sort_order integer primary key,
  check_key text not null,
  passed boolean not null,
  expected text not null,
  observed text not null,
  sqlstate text,
  hint text
);

grant select, insert, update, delete on table clone_trial_verification_results to authenticated, anon;

drop table if exists pg_temp.clone_trial_saved_ids;

create temp table clone_trial_saved_ids (
  source_trial_id uuid,
  cloned_trial_id uuid,
  archived_trial_id uuid,
  archived_line_trial_id uuid
);

grant select, insert, update, delete on table clone_trial_saved_ids to authenticated, anon;

insert into clone_trial_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate,
  hint
)
select
  1,
  'tables_exist_with_rls',
  count(*) = 2 and bool_and(c.relrowsecurity),
  'public.trials and public.trial_ingredients exist with RLS enabled',
  coalesce(
    string_agg(
      format('%s relrowsecurity=%s', c.relname, c.relrowsecurity),
      '; '
      order by c.relname
    ),
    'tables not found'
  ),
  null,
  null
from pg_class as c
join pg_namespace as n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('trials', 'trial_ingredients');

with expected_policies as (
  select *
  from (values
    ('trials', 'trials_select_own_active'),
    ('trial_ingredients', 'trial_ingredients_select_own_active_trial')
  ) as item(tablename, policyname)
),
actual as (
  select
    expected_policies.tablename,
    expected_policies.policyname,
    pg_policies.roles = '{authenticated}'::name[] as authenticated_only,
    pg_policies.cmd
  from expected_policies
  left join pg_policies
    on pg_policies.schemaname = 'public'
   and pg_policies.tablename = expected_policies.tablename
   and pg_policies.policyname = expected_policies.policyname
)
insert into clone_trial_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate,
  hint
)
select
  2,
  'policy_matrix',
  bool_and(authenticated_only and cmd = 'SELECT'),
  'trials and trial_ingredients expose SELECT-only policies to authenticated',
  string_agg(
    format(
      '%s.%s cmd=%s authenticated_only=%s',
      tablename,
      policyname,
      coalesce(cmd, 'missing'),
      coalesce(authenticated_only::text, 'false')
    ),
    '; '
    order by tablename
  ),
  null,
  null
from actual;

with actual_grants as (
  select
    table_name,
    grantee,
    array_agg(privilege_type order by privilege_type)::text[] as privileges
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('trials', 'trial_ingredients')
    and grantee in ('anon', 'authenticated', 'public')
  group by table_name, grantee
),
aggregated as (
  select
    exists (
      select 1
      from actual_grants
      where grantee in ('anon', 'public')
    ) as has_anon_or_public_grants,
    bool_and(privileges = array['SELECT'])
      filter (where grantee = 'authenticated') as authenticated_select_only,
    coalesce(
      string_agg(
        table_name || ':' || grantee || ':' || array_to_string(privileges, ','),
        '; '
        order by table_name, grantee
      ),
      'no grants'
    ) as observed_grants
  from actual_grants
)
insert into clone_trial_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate,
  hint
)
select
  3,
  'grant_matrix',
  authenticated_select_only and not has_anon_or_public_grants,
  'authenticated has SELECT only on trials and trial_ingredients, anon/public have no table grants',
  observed_grants,
  null,
  null
from aggregated;

with function_grants as (
  select
    routine_name,
    grantee,
    privilege_type
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name in (
      'is_own_active_trial',
      'save_trial_with_ingredients',
      'soft_delete_trial',
      'clone_trial'
    )
    and grantee in ('authenticated', 'public', 'anon')
)
insert into clone_trial_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate,
  hint
)
select
  4,
  'function_grants',
  count(*) filter (where grantee = 'authenticated' and privilege_type = 'EXECUTE') = 4
    and count(*) filter (where grantee in ('public', 'anon')) = 0,
  'helper and trial RPC functions grant EXECUTE only to authenticated',
  coalesce(
    string_agg(
      routine_name || ':' || grantee || ':' || privilege_type,
      '; '
      order by routine_name, grantee
    ),
    'no grants'
  ),
  null,
  null
from function_grants;

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.research_lines (id, user_id, title, description)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-1111-1111-111111111111',
  'Clone source line',
  'Actor A active line'
);

insert into clone_trial_saved_ids (source_trial_id)
select public.save_trial_with_ingredients(
  jsonb_build_object(
    'id', null,
    'research_line_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'parent_trial_id', null,
    'title', 'Actor A source trial',
    'brewed_at', '2026-04-21T15:00:00Z',
    'rating', 4,
    'brewing_time_minutes', 6.5,
    'boil_count', 2,
    'strainer', '茶こし',
    'note', '香りがよい',
    'next_idea', 'ミルクを少し増やす',
    'ingredients', jsonb_build_array(
      jsonb_build_object(
        'category', 'tea',
        'name', 'アッサム',
        'amount', 8,
        'unit', 'g',
        'timing', null,
        'display_order', 0
      ),
      jsonb_build_object(
        'category', 'milk',
        'name', '牛乳',
        'amount', 120,
        'unit', 'ml',
        'timing', '後半',
        'display_order', 1
      )
    )
  )
);

update clone_trial_saved_ids
set cloned_trial_id = public.clone_trial(source_trial_id);

insert into clone_trial_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate,
  hint
)
select
  10,
  'owner_active_clone_success',
  cloned.cloned_trial_id is not null
    and cloned.cloned_trial_id <> cloned.source_trial_id
    and exists (
      select 1
      from public.trials as t
      where t.id = cloned.cloned_trial_id
        and t.parent_trial_id = cloned.source_trial_id
        and t.user_id = '11111111-1111-1111-1111-111111111111'
        and t.research_line_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
        and t.deleted_at is null
        and t.title = 'Actor A source trial'
        and t.brewed_at <> '2026-04-21T15:00:00Z'::timestamptz
    ),
  'owner can clone an active trial into a new active trial with parent_trial_id set',
  format(
    'source_trial_id=%s; cloned_trial_id=%s; visible_trials=%s',
    cloned.source_trial_id,
    cloned.cloned_trial_id,
    (select count(*) from public.trials)
  ),
  null,
  null
from clone_trial_saved_ids as cloned;

insert into clone_trial_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate,
  hint
)
select
  11,
  'ingredients_copied',
  (
    select count(*)
    from public.trial_ingredients
    where trial_id = cloned.cloned_trial_id
  ) = 2
  and exists (
    select 1
    from public.trial_ingredients
    where trial_id = cloned.cloned_trial_id
      and category = 'tea'
      and name = 'アッサム'
      and amount = 8
      and unit = 'g'
      and display_order = 0
  )
  and exists (
    select 1
    from public.trial_ingredients
    where trial_id = cloned.cloned_trial_id
      and category = 'milk'
      and name = '牛乳'
      and amount = 120
      and unit = 'ml'
      and timing = '後半'
      and display_order = 1
  ),
  'clone copies the source ingredient rows with the same field values and new ids',
  format(
    'cloned_ingredient_count=%s; cloned_names=%s',
    (
      select count(*)
      from public.trial_ingredients
      where trial_id = cloned.cloned_trial_id
    ),
    (
      select string_agg(name, ',' order by display_order)
      from public.trial_ingredients
      where trial_id = cloned.cloned_trial_id
    )
  ),
  null,
  null
from clone_trial_saved_ids as cloned;

insert into clone_trial_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate,
  hint
)
select
  12,
  'cloned_detail_and_list_visible',
  (
    select count(*)
    from public.trials
    where id in (cloned.source_trial_id, cloned.cloned_trial_id)
      and deleted_at is null
  ) = 2
  and (
    select count(*)
    from public.trials
    where id = cloned.cloned_trial_id
      and parent_trial_id = cloned.source_trial_id
  ) = 1
  and (
    select count(*)
    from public.trial_ingredients
    where trial_id = cloned.cloned_trial_id
  ) = 2,
  'clone result is visible through normal active-trial select and detail ingredients remain visible',
  format(
    'visible_clone_rows=%s; visible_clone_ingredients=%s',
    (
      select count(*)
      from public.trials
      where id = cloned.cloned_trial_id
    ),
    (
      select count(*)
      from public.trial_ingredients
      where trial_id = cloned.cloned_trial_id
    )
  ),
  null,
  null
from clone_trial_saved_ids as cloned;

do $$
declare
  actual_sqlstate text;
  actual_message text;
begin
  begin
    insert into public.trials (
      user_id,
      research_line_id,
      title,
      brewed_at,
      rating,
      note,
      next_idea
    )
    values (
      '11111111-1111-1111-1111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'direct trial insert',
      now(),
      3,
      'should fail',
      'should fail'
    );

    insert into clone_trial_verification_results
    values (
      20,
      'direct_trials_insert_rejected',
      false,
      'direct insert into trials fails with 42501',
      'insert succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into clone_trial_verification_results
    values (
      20,
      'direct_trials_insert_rejected',
      actual_sqlstate = '42501',
      'direct insert into trials fails with 42501',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      null
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
    update public.trials
    set title = 'direct trial update'
    where id = (select cloned_trial_id from clone_trial_saved_ids);

    insert into clone_trial_verification_results
    values (
      21,
      'direct_trials_update_rejected',
      false,
      'direct update on trials fails with 42501',
      'update succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into clone_trial_verification_results
    values (
      21,
      'direct_trials_update_rejected',
      actual_sqlstate = '42501',
      'direct update on trials fails with 42501',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      null
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
    delete from public.trial_ingredients
    where trial_id = (select cloned_trial_id from clone_trial_saved_ids);

    insert into clone_trial_verification_results
    values (
      22,
      'direct_trial_ingredients_delete_rejected',
      false,
      'direct delete from trial_ingredients fails with 42501',
      'delete succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into clone_trial_verification_results
    values (
      22,
      'direct_trial_ingredients_delete_rejected',
      actual_sqlstate = '42501',
      'direct delete from trial_ingredients fails with 42501',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      null
    );
  end;
end
$$;

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

insert into public.research_lines (id, user_id, title, description)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '22222222-2222-2222-2222-222222222222',
  'Actor B line',
  'Actor B line'
);

insert into clone_trial_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate,
  hint
)
select
  30,
  'actor_b_select_isolated',
  (select count(*) from public.trials) = 0
    and (select count(*) from public.trial_ingredients) = 0,
  'Actor B sees 0 Actor A trials and 0 Actor A ingredients',
  format(
    'visible_trials=%s; visible_ingredients=%s',
    (select count(*) from public.trials),
    (select count(*) from public.trial_ingredients)
  ),
  null,
  null;

do $$
declare
  actual_hint text;
  actual_sqlstate text;
  actual_message text;
begin
  begin
    perform public.clone_trial(
      (select source_trial_id from clone_trial_saved_ids)
    );

    insert into clone_trial_verification_results
    values (
      31,
      'actor_b_cross_owner_clone_rejected',
      false,
      'cross-owner clone fails with CHAI_TRIAL_NOT_FOUND',
      'rpc succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text,
      actual_hint = pg_exception_hint;

    insert into clone_trial_verification_results
    values (
      31,
      'actor_b_cross_owner_clone_rejected',
      actual_hint = 'CHAI_TRIAL_NOT_FOUND',
      'cross-owner clone fails with CHAI_TRIAL_NOT_FOUND',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      actual_hint
    );
  end;
end
$$;

do $$
declare
  actual_hint text;
  actual_sqlstate text;
  actual_message text;
begin
  begin
    perform public.clone_trial('99999999-9999-4999-8999-999999999999');

    insert into clone_trial_verification_results
    values (
      32,
      'missing_clone_rejected',
      false,
      'missing clone source fails with CHAI_TRIAL_NOT_FOUND',
      'rpc succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text,
      actual_hint = pg_exception_hint;

    insert into clone_trial_verification_results
    values (
      32,
      'missing_clone_rejected',
      actual_hint = 'CHAI_TRIAL_NOT_FOUND',
      'missing clone source fails with CHAI_TRIAL_NOT_FOUND',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      actual_hint
    );
  end;
end
$$;

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.research_lines (id, user_id, title, description, archived_at)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  '11111111-1111-1111-1111-111111111111',
  'Archived line source',
  'Actor A archived line',
  null
);

update clone_trial_saved_ids
set archived_line_trial_id = public.save_trial_with_ingredients(
  jsonb_build_object(
    'id', null,
    'research_line_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'parent_trial_id', null,
    'title', 'Trial on soon archived line',
    'brewed_at', '2026-04-23T15:00:00Z',
    'rating', 3,
    'note', 'line will archive',
    'next_idea', 'line will archive',
    'ingredients', jsonb_build_array(
      jsonb_build_object(
        'category', 'tea',
        'name', 'tea',
        'display_order', 0
      )
    )
  )
);

update public.research_lines
set archived_at = now(),
    updated_at = now()
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

do $$
declare
  actual_hint text;
  actual_sqlstate text;
  actual_message text;
begin
  begin
    perform public.clone_trial(
      (select archived_line_trial_id from clone_trial_saved_ids)
    );

    insert into clone_trial_verification_results
    values (
      33,
      'archived_line_clone_rejected',
      false,
      'source whose research line is archived fails with CHAI_TRIAL_NOT_FOUND',
      'rpc succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text,
      actual_hint = pg_exception_hint;

    insert into clone_trial_verification_results
    values (
      33,
      'archived_line_clone_rejected',
      actual_hint = 'CHAI_TRIAL_NOT_FOUND',
      'source whose research line is archived fails with CHAI_TRIAL_NOT_FOUND',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      actual_hint
    );
  end;
end
$$;

update clone_trial_saved_ids
set archived_trial_id = public.soft_delete_trial(source_trial_id);

do $$
declare
  actual_hint text;
  actual_sqlstate text;
  actual_message text;
begin
  begin
    perform public.clone_trial(
      (select archived_trial_id from clone_trial_saved_ids)
    );

    insert into clone_trial_verification_results
    values (
      34,
      'archived_source_clone_rejected',
      false,
      'soft-deleted source clone fails with CHAI_TRIAL_NOT_FOUND',
      'rpc succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text,
      actual_hint = pg_exception_hint;

    insert into clone_trial_verification_results
    values (
      34,
      'archived_source_clone_rejected',
      actual_hint = 'CHAI_TRIAL_NOT_FOUND',
      'soft-deleted source clone fails with CHAI_TRIAL_NOT_FOUND',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      actual_hint
    );
  end;
end
$$;

insert into clone_trial_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate,
  hint
)
select
  35,
  'archived_source_hidden_clone_remains_active',
  (
    select count(*)
    from public.trials
    where id = (select archived_trial_id from clone_trial_saved_ids)
  ) = 0
  and (
    select count(*)
    from public.trials
    where id = (select cloned_trial_id from clone_trial_saved_ids)
      and deleted_at is null
  ) = 1,
  'soft-deleted source is hidden from normal select while the cloned trial remains active',
  format(
    'visible_archived_source=%s; visible_clone=%s',
    (
      select count(*)
      from public.trials
      where id = (select archived_trial_id from clone_trial_saved_ids)
    ),
    (
      select count(*)
      from public.trials
      where id = (select cloned_trial_id from clone_trial_saved_ids)
    )
  ),
  null,
  null;

reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);

do $$
declare
  actual_sqlstate text;
  actual_message text;
begin
  begin
    perform public.clone_trial(
      (select cloned_trial_id from clone_trial_saved_ids)
    );

    insert into clone_trial_verification_results
    values (
      40,
      'anon_clone_rejected',
      false,
      'anon cannot execute clone_trial',
      'rpc succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into clone_trial_verification_results
    values (
      40,
      'anon_clone_rejected',
      actual_sqlstate = '42501',
      'anon cannot execute clone_trial',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      null
    );
  end;
end
$$;
