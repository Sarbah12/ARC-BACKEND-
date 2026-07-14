-- Anti-spam / origin tracking columns + visitor log.
-- Additive and idempotent; safe to run on the live database.

-- Request origin on public submissions (IP + coarse IP-based geolocation).
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS ip text NOT NULL DEFAULT '';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS geo_country text NOT NULL DEFAULT '';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS geo_city text NOT NULL DEFAULT '';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS geo_isp text NOT NULL DEFAULT '';

ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS ip text NOT NULL DEFAULT '';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS geo_country text NOT NULL DEFAULT '';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS geo_city text NOT NULL DEFAULT '';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS geo_isp text NOT NULL DEFAULT '';

ALTER TABLE public.event_rsvps ADD COLUMN IF NOT EXISTS ip text NOT NULL DEFAULT '';
ALTER TABLE public.event_rsvps ADD COLUMN IF NOT EXISTS geo_country text NOT NULL DEFAULT '';
ALTER TABLE public.event_rsvps ADD COLUMN IF NOT EXISTS geo_city text NOT NULL DEFAULT '';
ALTER TABLE public.event_rsvps ADD COLUMN IF NOT EXISTS geo_isp text NOT NULL DEFAULT '';

-- Silent visitor log (one row per visitor per ~10 min, written by /api/track).
CREATE TABLE IF NOT EXISTS public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL DEFAULT '',
  geo_country text NOT NULL DEFAULT '',
  geo_city text NOT NULL DEFAULT '',
  geo_isp text NOT NULL DEFAULT '',
  path text NOT NULL DEFAULT '',
  referrer text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS registrations_ip_idx ON public.registrations (ip);
CREATE INDEX IF NOT EXISTS enquiries_ip_idx ON public.enquiries (ip);
CREATE INDEX IF NOT EXISTS visits_ip_idx ON public.visits (ip);
CREATE INDEX IF NOT EXISTS visits_created_at_idx ON public.visits (created_at DESC);
