create or replace function public.clone_trial(source_trial_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_source_trial_id alias for $1;
  actor_id uuid;
  cloned_trial_id uuid;
  source_trial record;
begin
  actor_id := auth.uid();

  if actor_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'trial auth required',
      hint = 'CHAI_TRIAL_AUTH_REQUIRED';
  end if;

  if target_source_trial_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'trial id validation failed',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;

  select t.*
  into source_trial
  from public.trials as t
  join public.research_lines as rl
    on rl.id = t.research_line_id
   and rl.user_id = t.user_id
   and rl.archived_at is null
  where t.id = target_source_trial_id
    and t.user_id = actor_id
    and t.deleted_at is null;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'trial not found',
      hint = 'CHAI_TRIAL_NOT_FOUND';
  end if;

  insert into public.trials (
    user_id,
    research_line_id,
    parent_trial_id,
    title,
    brewed_at,
    rating,
    brewing_time_minutes,
    boil_count,
    strainer,
    note,
    next_idea
  )
  values (
    actor_id,
    source_trial.research_line_id,
    source_trial.id,
    source_trial.title,
    now(),
    source_trial.rating,
    source_trial.brewing_time_minutes,
    source_trial.boil_count,
    source_trial.strainer,
    source_trial.note,
    source_trial.next_idea
  )
  returning id into cloned_trial_id;

  insert into public.trial_ingredients (
    trial_id,
    category,
    name,
    amount,
    unit,
    timing,
    display_order
  )
  select
    cloned_trial_id,
    category,
    name,
    amount,
    unit,
    timing,
    display_order
  from public.trial_ingredients
  where trial_id = source_trial.id
  order by display_order, id;

  return cloned_trial_id;
end;
$$;

revoke all on function public.clone_trial(uuid) from public;
grant execute on function public.clone_trial(uuid) to authenticated;
