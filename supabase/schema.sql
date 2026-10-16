-- "Best Matcha Today" leaderboard.
-- Run once in the Supabase SQL editor, then set VITE_SUPABASE_URL and
-- VITE_SUPABASE_ANON_KEY in Vercel.

create table if not exists public.entries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  day date not null default ((now() at time zone 'utc')::date),
  nickname text not null check (char_length(nickname) between 1 and 16),
  score numeric(3, 1) not null check (score between 0 and 10),
  recipe text not null check (char_length(recipe) between 10 and 8000)
);

create index if not exists entries_day_score on public.entries (day, score desc);

alter table public.entries enable row level security;

drop policy if exists "anyone can read" on public.entries;
create policy "anyone can read" on public.entries
  for select to anon using (true);

-- Inserts only for today's board; nobody can update or delete.
drop policy if exists "anyone can post today" on public.entries;
create policy "anyone can post today" on public.entries
  for insert to anon with check (day = (now() at time zone 'utc')::date);
