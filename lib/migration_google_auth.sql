-- Run this in your Supabase SQL editor
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Allow null password_hash for social-login users
ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;
