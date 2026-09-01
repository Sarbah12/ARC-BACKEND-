-- ============================================================
-- ARC — pending database migrations
--
-- Run once in Supabase → SQL Editor → New query → Run.
-- Project ref must be: zwkdswzhfivybeppoerz
-- Everything here is additive and idempotent (safe to re-run).
-- ============================================================

-- 1) Event tags — lets the admin event form store tags again.
alter table events add column if not exists tags text not null default '';

-- 2) Course progress — powers "mark lesson complete" and the progress
--    bars on the learner dashboard.
create table if not exists course_progress (
  id           text primary key,
  user_id      text not null,
  user_email   text not null default '',
  course       text not null,
  lesson_id    text not null,
  completed_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists course_progress_user_course_lesson_unique
  on course_progress (user_id, course, lesson_id);

create index if not exists course_progress_user_idx
  on course_progress (user_id);

-- 3) Project stage — lets the admin mark a project as ongoing or completed,
--    so the Projects page can show "Ongoing" and "Past" separately.
alter table projects add column if not exists stage text not null default 'completed';

-- 4) Annual reports — admin-managed reports for 2024 and future years.
create table if not exists reports (
  id          text primary key,
  year        integer not null,
  title       text not null default '',
  summary     text not null default '',
  file_url    text not null default '',   -- link to the report (PDF or page)
  cover_image text not null default '',
  status      text not null default 'published',  -- published | draft
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reports_year_idx on reports (year desc);

-- 5) Alumni network — applications submitted from the site and reviewed
--    in the admin panel, mirroring the developer directory.
create table if not exists alumni (
  id           text primary key,
  user_id      text not null default '',
  name         text not null default '',
  email        text not null default '',
  cohort       text not null default '',   -- e.g. "Cohort 2" or "2025"
  course       text not null default '',   -- programme completed
  role         text not null default '',
  company      text not null default '',
  bio          text not null default '',
  photo_url    text not null default '',
  linkedin_url text not null default '',
  website_url  text not null default '',
  twitter_url  text not null default '',
  status       text not null default 'pending',  -- pending | approved | rejected
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists alumni_status_idx on alumni (status);
create index if not exists alumni_user_idx   on alumni (user_id);

-- 6) Make the API pick up the changes immediately.
notify pgrst, 'reload schema';
