alter table public.research_lines enable row level security;

revoke all on table public.research_lines from public;
revoke all on table public.research_lines from anon;
revoke all on table public.research_lines from authenticated;

create policy research_lines_select_own
on public.research_lines
for select
to authenticated
using (user_id = auth.uid());

create policy research_lines_insert_own
on public.research_lines
for insert
to authenticated
with check (user_id = auth.uid());

create policy research_lines_update_own
on public.research_lines
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update on table public.research_lines to authenticated;
