-- Ejecuta esto en Supabase → SQL Editor (una sola vez)

create table if not exists public.programa_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  finance_entries jsonb not null default '[]'::jsonb,
  custom_courses jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.programa_user_data enable row level security;

create policy "Users read own data"
  on public.programa_user_data for select
  using (auth.uid() = user_id);

create policy "Users insert own data"
  on public.programa_user_data for insert
  with check (auth.uid() = user_id);

create policy "Users update own data"
  on public.programa_user_data for update
  using (auth.uid() = user_id);
