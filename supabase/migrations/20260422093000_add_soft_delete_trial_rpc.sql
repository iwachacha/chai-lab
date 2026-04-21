create or replace function public.soft_delete_trial(trial_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_trial_id alias for $1;
  actor_id uuid;
  archived_trial_id uuid;
begin
  actor_id := auth.uid();

  if actor_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'trial auth required',
      hint = 'CHAI_TRIAL_AUTH_REQUIRED';
  end if;

  if target_trial_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'trial id validation failed',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;

  update public.trials
  set deleted_at = now(),
      updated_at = now()
  where id = target_trial_id
    and user_id = actor_id
    and deleted_at is null
  returning id into archived_trial_id;

  if archived_trial_id is null then
    if exists (
      select 1
      from public.trials
      where id = target_trial_id
        and user_id = actor_id
        and deleted_at is not null
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'trial already archived',
        hint = 'CHAI_TRIAL_CONFLICT';
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'trial not found',
      hint = 'CHAI_TRIAL_NOT_FOUND';
  end if;

  return archived_trial_id;
end;
$$;

revoke all on function public.soft_delete_trial(uuid) from public;
grant execute on function public.soft_delete_trial(uuid) to authenticated;
