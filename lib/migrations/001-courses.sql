-- Run once in Supabase → SQL Editor if the courses table does not exist yet.
create table if not exists public.courses (
  id            text        primary key,
  title         text        not null default '',
  description   text        not null default '',
  mode          text        not null default 'in-person',
  pricing       text        not null default 'free',
  price         text        not null default '',
  currency      text        not null default 'GHS',
  level         text        not null default '',
  duration      text        not null default '',
  instructor    text        not null default '',
  category      text        not null default '',
  start_date    text        not null default '',
  image_url     text        not null default '',
  status        text        not null default 'published',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.courses enable row level security;
drop policy if exists "courses_public_read" on public.courses;
create policy "courses_public_read" on public.courses
  for select using (status = 'published');

notify pgrst, 'reload schema';
