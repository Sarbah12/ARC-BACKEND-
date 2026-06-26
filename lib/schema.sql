-- ============================================================
-- ARC Accra Resource Centre — Complete Supabase schema v2
-- Run this FULL FILE in your Supabase SQL editor
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
create table if not exists public.users (
  id              uuid        primary key default gen_random_uuid(),
  first_name      text        not null default '',
  last_name       text        not null default '',
  email           text        not null unique,
  password_hash   text,                          -- null for social login
  google_id       text        unique,
  avatar_url      text,
  phone           text,
  course_interest text,
  role            text        not null default 'student',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Patch existing table if it already exists
alter table public.users alter column password_hash drop not null;
alter table public.users alter column first_name   set default '';
alter table public.users alter column last_name    set default '';
alter table public.users add column if not exists google_id   text unique;
alter table public.users add column if not exists avatar_url  text;
alter table public.users add column if not exists phone       text;
alter table public.users add column if not exists updated_at  timestamptz not null default now();

-- ── Course Registrations ──────────────────────────────────────
create table if not exists public.registrations (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references public.users(id) on delete set null,
  first_name text        not null,
  last_name  text        not null,
  email      text        not null,
  phone      text,
  course     text        not null,
  mode       text        not null default 'hybrid',
  message    text,
  status     text        not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.registrations add column if not exists user_id uuid references public.users(id) on delete set null;

-- ── Enquiries ─────────────────────────────────────────────────
create table if not exists public.enquiries (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null,
  subject    text,
  message    text        not null,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ── Events ────────────────────────────────────────────────────
create table if not exists public.events (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  date        timestamptz not null,
  location    text,
  mode        text        not null default 'in-person',
  capacity    integer,
  image_url   text,
  status      text        not null default 'upcoming',
  created_at  timestamptz not null default now()
);

-- ── Event RSVPs ───────────────────────────────────────────────
create table if not exists public.event_rsvps (
  id         uuid        primary key default gen_random_uuid(),
  event_id   uuid        not null references public.events(id) on delete cascade,
  user_id    uuid        references public.users(id) on delete set null,
  name       text        not null,
  email      text        not null,
  phone      text,
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

alter table public.event_rsvps add column if not exists user_id uuid references public.users(id) on delete set null;

-- ── Row Level Security ────────────────────────────────────────
alter table public.users         enable row level security;
alter table public.registrations enable row level security;
alter table public.enquiries     enable row level security;
alter table public.events        enable row level security;
alter table public.event_rsvps   enable row level security;

-- Drop old policies before recreating (avoid duplicate errors)
drop policy if exists "events_public_read"   on public.events;
drop policy if exists "users_service_all"    on public.users;
drop policy if exists "regs_service_all"     on public.registrations;
drop policy if exists "enquiries_service_all" on public.enquiries;
drop policy if exists "rsvps_service_all"    on public.event_rsvps;

-- Public can read events
create policy "events_public_read" on public.events
  for select using (true);

-- Service role (our API) bypasses RLS automatically — no extra policies needed.
-- The service role key in our .env gives full access to all tables.

-- ── Blog Posts ────────────────────────────────────────────────
create table if not exists public.blog_posts (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  slug          text        not null unique,
  excerpt       text,
  content       text        not null default '',
  cover_image   text,
  author_name   text        not null default 'ARC Team',
  category      text        not null default 'General',
  status        text        not null default 'draft',  -- draft | published
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.blog_posts enable row level security;
drop policy if exists "blogs_public_read" on public.blog_posts;
create policy "blogs_public_read" on public.blog_posts
  for select using (status = 'published');

-- ── Projects ──────────────────────────────────────────────────
create table if not exists public.projects (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  description   text        not null default '',
  image_url     text,
  tech_stack    text[],
  github_url    text,
  live_url      text,
  category      text        not null default 'General',
  status        text        not null default 'draft',  -- draft | published
  featured      boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.projects enable row level security;
drop policy if exists "projects_public_read" on public.projects;
create policy "projects_public_read" on public.projects
  for select using (status = 'published');

-- ── Events CRUD support (status update) ──────────────────────
alter table public.events add column if not exists updated_at timestamptz not null default now();
