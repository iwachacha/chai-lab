create table public.research_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (title = btrim(title) and char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index idx_research_lines_user_id
  on public.research_lines (user_id);

create unique index idx_research_lines_active_title
  on public.research_lines (user_id, btrim(title))
  where archived_at is null;
