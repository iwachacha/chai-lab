create or replace function public.is_own_active_trial(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.trials
    where id = target_id
      and user_id = auth.uid()
      and deleted_at is null
  );
$$;

revoke all on function public.is_own_active_trial(uuid) from public;
grant execute on function public.is_own_active_trial(uuid) to authenticated;

alter table public.trials enable row level security;
alter table public.trial_ingredients enable row level security;

revoke all on table public.trials from public;
revoke all on table public.trials from anon;
revoke all on table public.trials from authenticated;

revoke all on table public.trial_ingredients from public;
revoke all on table public.trial_ingredients from anon;
revoke all on table public.trial_ingredients from authenticated;

create policy trials_select_own_active
on public.trials
for select
to authenticated
using (
  user_id = auth.uid()
  and deleted_at is null
);

create policy trial_ingredients_select_own_active_trial
on public.trial_ingredients
for select
to authenticated
using (
  public.is_own_active_trial(trial_id)
);

grant select on table public.trials to authenticated;
grant select on table public.trial_ingredients to authenticated;
