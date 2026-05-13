create extension if not exists pgcrypto;

create table if not exists public.user_mistakes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mistakes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_user_mistakes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_user_mistakes_updated_at on public.user_mistakes;
create trigger set_user_mistakes_updated_at
before update on public.user_mistakes
for each row
execute function public.touch_user_mistakes_updated_at();

alter table public.user_mistakes enable row level security;

drop policy if exists "user_mistakes_select_own" on public.user_mistakes;
create policy "user_mistakes_select_own"
on public.user_mistakes
for select
using (auth.uid() = user_id);

drop policy if exists "user_mistakes_insert_own" on public.user_mistakes;
create policy "user_mistakes_insert_own"
on public.user_mistakes
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_mistakes_update_own" on public.user_mistakes;
create policy "user_mistakes_update_own"
on public.user_mistakes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_mistakes_delete_own" on public.user_mistakes;
create policy "user_mistakes_delete_own"
on public.user_mistakes
for delete
using (auth.uid() = user_id);
