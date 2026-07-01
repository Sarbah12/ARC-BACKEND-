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
  reset_token_hash    text,
  reset_token_expires timestamptz,
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
alter table public.users add column if not exists reset_token_hash    text;
alter table public.users add column if not exists reset_token_expires timestamptz;
create index if not exists users_reset_token_hash_idx on public.users (reset_token_hash);

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
  payment_ref text,
  created_at timestamptz not null default now()
);

alter table public.registrations add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.registrations add column if not exists payment_ref text;

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

-- Patch an existing projects table that predates these columns
alter table public.projects add column if not exists description text not null default '';
alter table public.projects add column if not exists image_url  text;
alter table public.projects add column if not exists tech_stack text[];
alter table public.projects add column if not exists github_url text;
alter table public.projects add column if not exists live_url   text;
alter table public.projects add column if not exists category   text not null default 'General';
alter table public.projects add column if not exists status     text not null default 'draft';
alter table public.projects add column if not exists featured   boolean not null default false;
alter table public.projects add column if not exists updated_at timestamptz not null default now();

alter table public.projects enable row level security;
drop policy if exists "projects_public_read" on public.projects;
create policy "projects_public_read" on public.projects
  for select using (status = 'published');

-- ── Events CRUD support (status update) ──────────────────────
alter table public.events add column if not exists updated_at timestamptz not null default now();

-- ── Site Content (CMS) ────────────────────────────────────────
create table if not exists public.site_content (
  id         uuid        primary key default gen_random_uuid(),
  key        text        not null unique,  -- e.g. "home.hero_title"
  value      text        not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
drop policy if exists "content_public_read" on public.site_content;
create policy "content_public_read" on public.site_content for select using (true);

-- Seed default content
insert into public.site_content (key, value) values
  ('general.site_name',        'ARC — Accra Resource Centre'),
  ('general.tagline',          'Free tech education for Africa''s next builders.'),
  ('general.email',            'admin@arcaccra.org'),
  ('general.phone',            '+233 55 289 3766'),
  ('general.address',          'Accra Resource Center, Accra, Ghana'),
  ('general.twitter',          ''),
  ('general.instagram',        ''),
  ('general.linkedin',         ''),
  ('home.hero_eyebrow',        'A Non-Profit Initiative'),
  ('home.hero_title_line1',    'Learn the Skills Shaping'),
  ('home.hero_title_line2',    'Africa''s Digital Future'),
  ('home.hero_subtitle',       'From Accra to the wider continent, ARC equips young Africans with free, practical tech skills — mobile development, graphic design, and AI — through hands-on, mentor-led learning.'),
  ('home.bento1_tag',          'Programming Hub'),
  ('home.bento1_title',        'We believe the next global tech architecture will be built in Accra.'),
  ('home.bento1_body',         'ARC is not just a school; it is a non-profit ecosystem designed to decouple opportunity from cost and build Africa''s digital sovereignty, one builder at a time.'),
  ('home.bento2_tag',          'Access'),
  ('home.bento2_title',        'Accessible Education for All'),
  ('home.bento2_body',         'We offer free foundational courses designed to make quality learning accessible to everyone.'),
  ('home.bento3_tag',          'Mentorship'),
  ('home.bento3_title',        'Learn from industry professionals'),
  ('home.bento3_body',         'Dedicated mentors bring current engineering, product, and AI experience into every learning path.'),
  ('about.hero_title',         'Real skills. Real people. Real impact.'),
  ('about.mission',            'To democratise access to world-class tech education across Africa — one builder at a time.'),
  ('about.vision',             'A continent where every young African has the skills and confidence to shape the digital economy.'),
  ('about.value1_title',       'Free Access'),
  ('about.value2_title',       'Hands-On Learning'),
  ('about.value3_title',       'Mentorship'),
  ('about.value4_title',       'Community'),
  ('about.value5_title',       'Real Projects'),
  ('about.value6_title',       'Career Readiness')
on conflict (key) do nothing;

-- Force PostgREST to reload its schema cache so newly created tables
-- (site_content, blog_posts, projects columns) are visible to the API immediately.
notify pgrst, 'reload schema';
