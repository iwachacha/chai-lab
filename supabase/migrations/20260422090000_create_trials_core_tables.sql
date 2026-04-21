create table public.trials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  research_line_id uuid not null references public.research_lines (id) on delete cascade,
  parent_trial_id uuid references public.trials (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  brewed_at timestamptz not null default now(),
  rating smallint not null check (rating between 1 and 5),
  brewing_time_minutes numeric(6, 2) check (
    brewing_time_minutes is null or brewing_time_minutes >= 0
  ),
  boil_count smallint check (boil_count is null or boil_count between 0 and 20),
  strainer text check (strainer is null or char_length(strainer) <= 80),
  note text not null check (char_length(btrim(note)) between 1 and 1000),
  next_idea text not null check (char_length(btrim(next_idea)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.trial_ingredients (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.trials (id) on delete cascade,
  category text not null check (
    category in ('tea', 'water', 'milk', 'sweetener', 'spice', 'other')
  ),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  amount numeric(8, 2) check (amount is null or amount >= 0),
  unit text check (unit is null or char_length(unit) <= 16),
  timing text check (timing is null or char_length(timing) <= 80),
  display_order integer not null default 0 check (display_order >= 0)
);

create index idx_trials_user_id
  on public.trials (user_id);

create index idx_trials_research_line_id
  on public.trials (research_line_id);

create index idx_trials_parent_trial_id
  on public.trials (parent_trial_id);

create index idx_trials_brewed_at
  on public.trials (brewed_at desc);

create index idx_trials_user_brewed_active
  on public.trials (user_id, brewed_at desc)
  where deleted_at is null;

create index idx_trial_ingredients_trial_id
  on public.trial_ingredients (trial_id);
