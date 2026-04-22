-- Trials minimum slice verification probes
-- This file is not a migration.
-- Prerequisites:
-- 1. Execute `supabase/verification/sql/local-db-auth-harness.sql`
-- 2. Apply research_lines migrations
-- 3. Apply trials / trial_ingredients migrations and RPC migrations
--
-- Actor A user_id: 11111111-1111-1111-1111-111111111111
-- Actor B user_id: 22222222-2222-2222-2222-222222222222

drop table if exists pg_temp.trials_minimum_slice_verification_results;

create temp table trials_minimum_slice_verification_results (
  sort_order integer primary key,
  check_key text not null,
  passed boolean not null,
  expected text not null,
  observed text not null,
  sqlstate text,
  hint text
);

grant select, insert, update, delete on table trials_minimum_slice_verification_results to authenticated, anon;

drop table if exists pg_temp.trial_minimum_saved_ids;

create temp table trial_minimum_saved_ids (
  saved_trial_id uuid,
  edited_trial_id uuid,
  archived_trial_id uuid
);

grant select, insert, update, delete on table trial_minimum_saved_ids to authenticated, anon;

insert into trials_minimum_slice_verification_results (
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
insert into trials_minimum_slice_verification_results (
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
insert into trials_minimum_slice_verification_results (
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
      'soft_delete_trial'
    )
    and grantee in ('authenticated', 'public', 'anon')
)
insert into trials_minimum_slice_verification_results (
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
  count(*) filter (where grantee = 'authenticated' and privilege_type = 'EXECUTE') = 3
    and count(*) filter (where grantee in ('public', 'anon')) = 0,
  'helper and RPC functions grant EXECUTE only to authenticated',
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
  'Trials minimum line',
  'Actor A line'
);

insert into trial_minimum_saved_ids (saved_trial_id)
select public.save_trial_with_ingredients(
  jsonb_build_object(
    'id', null,
    'research_line_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'parent_trial_id', null,
    'title', 'Actor A trial',
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
      )
    )
  )
);

insert into trials_minimum_slice_verification_results (
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
  'actor_a_rpc_save_success',
  exists (
    select 1
    from public.trials
    where id = (select saved_trial_id from trial_minimum_saved_ids)
      and title = 'Actor A trial'
      and brewed_at = '2026-04-21T15:00:00Z'::timestamptz
  )
  and exists (
    select 1
    from public.trial_ingredients
    where trial_id = (select saved_trial_id from trial_minimum_saved_ids)
      and category = 'tea'
      and name = 'アッサム'
  ),
  'Actor A can save one trial with one ingredient through RPC',
  format(
    'visible_trials=%s; visible_ingredients=%s',
    (select count(*) from public.trials),
    (select count(*) from public.trial_ingredients)
  ),
  null,
  null;

update trial_minimum_saved_ids
set edited_trial_id = public.save_trial_with_ingredients(
    jsonb_build_object(
      'id', (select saved_trial_id from trial_minimum_saved_ids),
      'research_line_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'parent_trial_id', null,
      'title', 'Actor A trial edited',
      'brewed_at', '2026-04-22T15:00:00Z',
      'rating', 5,
      'brewing_time_minutes', 7.25,
      'boil_count', 3,
      'strainer', 'metal strainer',
      'note', 'edited note',
      'next_idea', 'edited next idea',
      'ingredients', jsonb_build_array(
        jsonb_build_object(
          'category', 'tea',
          'name', 'Darjeeling',
          'amount', 7,
          'unit', 'g',
          'timing', null,
          'display_order', 0
        )
      )
    )
  );

insert into trials_minimum_slice_verification_results (
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
  'actor_a_rpc_edit_success',
  (select edited_trial_id = saved_trial_id from trial_minimum_saved_ids)
    and exists (
      select 1
      from public.trials
      where id = (select edited_trial_id from trial_minimum_saved_ids)
        and title = 'Actor A trial edited'
        and brewed_at = '2026-04-22T15:00:00Z'::timestamptz
        and rating = 5
    )
    and (
      select count(*)
      from public.trial_ingredients
      where trial_id = (select edited_trial_id from trial_minimum_saved_ids)
    ) = 1
    and exists (
      select 1
      from public.trial_ingredients
      where trial_id = (select edited_trial_id from trial_minimum_saved_ids)
        and name = 'Darjeeling'
    )
    and not exists (
      select 1
      from public.trial_ingredients
      where trial_id = (select edited_trial_id from trial_minimum_saved_ids)
        and name = 'アッサム'
    ),
  'Actor A can edit the trial through RPC and the ingredient is replaced',
  format(
    'edited_trial_id=%s; visible_trials=%s; visible_ingredients=%s; title=%s; rating=%s; ingredient_names=%s',
    (select edited_trial_id from trial_minimum_saved_ids),
    (select count(*) from public.trials),
    (select count(*) from public.trial_ingredients),
    (
      select title
      from public.trials
      where id = (select edited_trial_id from trial_minimum_saved_ids)
    ),
    (
      select rating
      from public.trials
      where id = (select edited_trial_id from trial_minimum_saved_ids)
    ),
    (
      select string_agg(name, ',' order by display_order)
      from public.trial_ingredients
      where trial_id = (select edited_trial_id from trial_minimum_saved_ids)
    )
  ),
  null,
  null;

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

    insert into trials_minimum_slice_verification_results
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

    insert into trials_minimum_slice_verification_results
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
    delete from public.trial_ingredients
    where trial_id = (select saved_trial_id from trial_minimum_saved_ids);

    insert into trials_minimum_slice_verification_results
    values (
      21,
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

    insert into trials_minimum_slice_verification_results
    values (
      21,
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

do $$
declare
  actual_sqlstate text;
  actual_message text;
begin
  begin
    update public.trials
    set title = 'direct trial update'
    where id = (select saved_trial_id from trial_minimum_saved_ids);

    insert into trials_minimum_slice_verification_results
    values (
      22,
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

    insert into trials_minimum_slice_verification_results
    values (
      22,
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
    delete from public.trials
    where id = (select saved_trial_id from trial_minimum_saved_ids);

    insert into trials_minimum_slice_verification_results
    values (
      23,
      'direct_trials_delete_rejected',
      false,
      'direct delete from trials fails with 42501',
      'delete succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into trials_minimum_slice_verification_results
    values (
      23,
      'direct_trials_delete_rejected',
      actual_sqlstate = '42501',
      'direct delete from trials fails with 42501',
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
    insert into public.trials (
      id,
      user_id,
      research_line_id,
      title,
      brewed_at,
      rating,
      note,
      next_idea
    )
    values (
      (select saved_trial_id from trial_minimum_saved_ids),
      '11111111-1111-1111-1111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'direct trial upsert',
      now(),
      3,
      'should fail',
      'should fail'
    )
    on conflict (id) do update
    set title = excluded.title;

    insert into trials_minimum_slice_verification_results
    values (
      24,
      'direct_trials_upsert_rejected',
      false,
      'direct upsert into trials fails with 42501',
      'upsert succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into trials_minimum_slice_verification_results
    values (
      24,
      'direct_trials_upsert_rejected',
      actual_sqlstate = '42501',
      'direct upsert into trials fails with 42501',
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
    insert into public.trial_ingredients (
      trial_id,
      category,
      name,
      display_order
    )
    values (
      (select saved_trial_id from trial_minimum_saved_ids),
      'tea',
      'direct ingredient insert',
      99
    );

    insert into trials_minimum_slice_verification_results
    values (
      25,
      'direct_trial_ingredients_insert_rejected',
      false,
      'direct insert into trial_ingredients fails with 42501',
      'insert succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into trials_minimum_slice_verification_results
    values (
      25,
      'direct_trial_ingredients_insert_rejected',
      actual_sqlstate = '42501',
      'direct insert into trial_ingredients fails with 42501',
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
    update public.trial_ingredients
    set name = 'direct ingredient update'
    where trial_id = (select saved_trial_id from trial_minimum_saved_ids);

    insert into trials_minimum_slice_verification_results
    values (
      26,
      'direct_trial_ingredients_update_rejected',
      false,
      'direct update on trial_ingredients fails with 42501',
      'update succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into trials_minimum_slice_verification_results
    values (
      26,
      'direct_trial_ingredients_update_rejected',
      actual_sqlstate = '42501',
      'direct update on trial_ingredients fails with 42501',
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
    insert into public.trial_ingredients (
      id,
      trial_id,
      category,
      name,
      display_order
    )
    values (
      (
        select id
        from public.trial_ingredients
        where trial_id = (select saved_trial_id from trial_minimum_saved_ids)
        order by display_order
        limit 1
      ),
      (select saved_trial_id from trial_minimum_saved_ids),
      'tea',
      'direct ingredient upsert',
      0
    )
    on conflict (id) do update
    set name = excluded.name;

    insert into trials_minimum_slice_verification_results
    values (
      27,
      'direct_trial_ingredients_upsert_rejected',
      false,
      'direct upsert into trial_ingredients fails with 42501',
      'upsert succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into trials_minimum_slice_verification_results
    values (
      27,
      'direct_trial_ingredients_upsert_rejected',
      actual_sqlstate = '42501',
      'direct upsert into trial_ingredients fails with 42501',
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

insert into trials_minimum_slice_verification_results (
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
    perform public.save_trial_with_ingredients(
      jsonb_build_object(
        'research_line_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        'title', 'Actor B cross owner',
        'brewed_at', '2026-04-21T15:00:00Z',
        'rating', 3,
        'note', 'should fail',
        'next_idea', 'should fail',
        'ingredients', jsonb_build_array(
          jsonb_build_object(
            'category', 'tea',
            'name', 'tea',
            'display_order', 0
          )
        )
      )
    );

    insert into trials_minimum_slice_verification_results
    values (
      31,
      'actor_b_cross_owner_rpc_rejected',
      false,
      'cross-owner save RPC fails with CHAI_TRIAL_NOT_FOUND',
      'rpc succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text,
      actual_hint = pg_exception_hint;

    insert into trials_minimum_slice_verification_results
    values (
      31,
      'actor_b_cross_owner_rpc_rejected',
      actual_hint = 'CHAI_TRIAL_NOT_FOUND',
      'cross-owner save RPC fails with CHAI_TRIAL_NOT_FOUND',
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
    perform public.save_trial_with_ingredients(
      jsonb_build_object(
        'id', (select saved_trial_id from trial_minimum_saved_ids),
        'research_line_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
        'parent_trial_id', null,
        'title', 'Actor B cross owner edit',
        'brewed_at', '2026-04-22T15:00:00Z',
        'rating', 3,
        'note', 'should fail',
        'next_idea', 'should fail',
        'ingredients', jsonb_build_array(
          jsonb_build_object(
            'category', 'tea',
            'name', 'tea',
            'display_order', 0
          )
        )
      )
    );

    insert into trials_minimum_slice_verification_results
    values (
      32,
      'actor_b_cross_owner_edit_rejected',
      false,
      'cross-owner edit RPC fails with CHAI_TRIAL_NOT_FOUND',
      'rpc succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text,
      actual_hint = pg_exception_hint;

    insert into trials_minimum_slice_verification_results
    values (
      32,
      'actor_b_cross_owner_edit_rejected',
      actual_hint = 'CHAI_TRIAL_NOT_FOUND',
      'cross-owner edit RPC fails with CHAI_TRIAL_NOT_FOUND',
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
    perform public.soft_delete_trial(
      (select saved_trial_id from trial_minimum_saved_ids)
    );

    insert into trials_minimum_slice_verification_results
    values (
      33,
      'actor_b_cross_owner_soft_delete_rejected',
      false,
      'cross-owner soft delete RPC fails with CHAI_TRIAL_NOT_FOUND',
      'rpc succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text,
      actual_hint = pg_exception_hint;

    insert into trials_minimum_slice_verification_results
    values (
      33,
      'actor_b_cross_owner_soft_delete_rejected',
      actual_hint = 'CHAI_TRIAL_NOT_FOUND',
      'cross-owner soft delete RPC fails with CHAI_TRIAL_NOT_FOUND',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      actual_hint
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
    from public.trials;

    insert into trials_minimum_slice_verification_results
    values (
      40,
      'anon_trials_select_rejected',
      false,
      'anon select from trials fails with 42501',
      'select succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text;

    insert into trials_minimum_slice_verification_results
    values (
      40,
      'anon_trials_select_rejected',
      actual_sqlstate = '42501',
      'anon select from trials fails with 42501',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      null
    );
  end;
end
$$;

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

update trial_minimum_saved_ids
set archived_trial_id = public.soft_delete_trial(saved_trial_id);

insert into trials_minimum_slice_verification_results (
  sort_order,
  check_key,
  passed,
  expected,
  observed,
  sqlstate,
  hint
)
select
  50,
  'soft_delete_hides_trial',
  (select archived_trial_id = saved_trial_id from trial_minimum_saved_ids)
    and (select count(*) from public.trials where id = (select saved_trial_id from trial_minimum_saved_ids)) = 0
    and (
      select count(*)
      from public.trials
      where id = (select saved_trial_id from trial_minimum_saved_ids)
        and deleted_at is not null
    ) = 0,
  'soft_delete_trial returns the id and RLS hides the deleted trial from normal select',
  format(
    'archived_trial_id=%s; visible_trials=%s',
    (select archived_trial_id from trial_minimum_saved_ids),
    (select count(*) from public.trials where id = (select saved_trial_id from trial_minimum_saved_ids))
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
    perform public.soft_delete_trial(
      (select saved_trial_id from trial_minimum_saved_ids)
    );

    insert into trials_minimum_slice_verification_results
    values (
      51,
      'soft_delete_idempotency_rejected',
      false,
      'second soft delete fails with CHAI_TRIAL_CONFLICT',
      'rpc succeeded unexpectedly',
      null,
      null
    );
  exception when others then
    get stacked diagnostics
      actual_sqlstate = returned_sqlstate,
      actual_message = message_text,
      actual_hint = pg_exception_hint;

    insert into trials_minimum_slice_verification_results
    values (
      51,
      'soft_delete_idempotency_rejected',
      actual_hint = 'CHAI_TRIAL_CONFLICT',
      'second soft delete fails with CHAI_TRIAL_CONFLICT',
      actual_sqlstate || ': ' || actual_message,
      actual_sqlstate,
      actual_hint
    );
  end;
end
$$;
