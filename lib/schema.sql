-- ============================================================
-- ARC Accra Resource Centre — Supabase schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Users
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  first_name      text not null,
  last_name       text not null,
  email           text not null unique,
  password_hash   text not null,
  course_interest text,
  role            text not null default 'student', -- student | admin
  created_at      timestamptz not null default now()
);

-- Course registrations
create table if not exists public.registrations (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text not null,
  email      text not null,
  phone      text,
  course     text not null,
  mode       text not null default 'hybrid',
  message    text,
  status     text not null default 'pending', -- pending | accepted | rejected
  created_at timestamptz not null default now()
);

-- Contact / enquiries
create table if not exists public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Events
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  date        timestamptz not null,
  location    text,
  mode        text not null default 'in-person', -- in-person | online | hybrid
  capacity    integer,
  image_url   text,
  status      text not null default 'upcoming', -- upcoming | past | cancelled
  created_at  timestamptz not null default now()
);

-- Event RSVPs
create table if not exists public.event_rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  name       text not null,
  email      text not null,
  phone      text,
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

-- ============================================================
-- Row Level Security — lock down tables
-- ============================================================
alter table public.users         enable row level security;
alter table public.registrations enable row level security;
alter table public.enquiries     enable row level security;
alter table public.events        enable row level security;
alter table public.event_rsvps   enable row level security;

-- Public can read events
create policy "events_public_read" on public.events
  for select using (true);

-- Service role bypasses RLS (used by our API via service key)
-- No additional policies needed — service role has full access
