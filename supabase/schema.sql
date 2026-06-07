-- Nysa — Supabase schema + Row Level Security
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
--
-- It mirrors the local WatermelonDB tables (entries / links / goals / tags)
-- with a `user_id` column and RLS so each user only ever sees their own rows.
-- Timestamps are epoch milliseconds (bigint) to match the client.

-- ---------- entries ----------
create table if not exists public.entries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  pole_id text not null,
  type text not null,
  title text not null default '',
  payload jsonb not null default '{}'::jsonb,
  occurred_at bigint not null default 0,
  created_at bigint not null default 0,
  updated_at bigint not null default 0,
  deleted_at bigint
);

-- ---------- links ----------
create table if not exists public.links (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  from_id text not null,
  to_id text not null,
  relation text not null,
  created_at bigint not null default 0,
  updated_at bigint not null default 0,
  deleted_at bigint
);

-- ---------- goals ----------
create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  pole_id text not null,
  title text not null default '',
  target_type text not null,
  metric text not null,
  target_value double precision,
  current_value double precision not null default 0,
  unit text,
  deadline bigint,
  is_template boolean not null default false,
  created_at bigint not null default 0,
  updated_at bigint not null default 0,
  deleted_at bigint
);

-- ---------- tags ----------
create table if not exists public.tags (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  color text,
  created_at bigint not null default 0,
  updated_at bigint not null default 0,
  deleted_at bigint
);

-- Indexes that help sync (pull rows changed since last sync).
create index if not exists entries_user_updated on public.entries (user_id, updated_at);
create index if not exists links_user_updated on public.links (user_id, updated_at);
create index if not exists goals_user_updated on public.goals (user_id, updated_at);
create index if not exists tags_user_updated on public.tags (user_id, updated_at);

-- ---------- Row Level Security ----------
-- Each user can only read/write rows where user_id = their auth uid.
do $$
declare t text;
begin
  foreach t in array array['entries','links','goals','tags'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "own rows select" on public.%I;', t);
    execute format('drop policy if exists "own rows modify" on public.%I;', t);
    execute format(
      'create policy "own rows select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format(
      'create policy "own rows modify" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;
