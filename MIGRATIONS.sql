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

-- 3) Make the API pick up the changes immediately.
notify pgrst, 'reload schema';
