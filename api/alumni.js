import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { supabase, insertFlexible, updateFlexible } from '../lib/supabase.js';
import { ok, created, unauthorized, badRequest, serverError, allowMethods } from '../lib/helpers.js';

// Columns safe for the public alumni network (no email / user_id / status).
const PUBLIC_COLS =
  'id, name, cohort, course, role, company, bio, photo_url, linkedin_url, website_url, twitter_url, created_at';

function getUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { id: payload.sub || payload.id, email: payload.email };
  } catch {
    return null;
  }
}

const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);

function buildProfile(body, user) {
  return {
    user_id: user.id,
    name: clean(body.name, 120),
    email: clean(body.email || user.email, 254).toLowerCase(),
    cohort: clean(body.cohort, 60),
    course: clean(body.course, 160),
    role: clean(body.role, 120),
    company: clean(body.company, 160),
    bio: clean(body.bio, 2000),
    photo_url: clean(body.photo_url, 800000), // may be an uploaded data URL
    linkedin_url: clean(body.linkedin_url, 500),
    website_url: clean(body.website_url, 500),
    twitter_url: clean(body.twitter_url, 500),
    status: 'pending', // every submission goes through review
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'OPTIONS']);
  if (block) return;

  // ── Public network: approved alumni only ──
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('alumni')
      .select(PUBLIC_COLS)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) return ok(res, { alumni: [] });
    return ok(res, { alumni: data || [] });
  }

  // ── Submit an application (requires a signed-in ARC account) ──
  const user = getUser(req);
  if (!user?.id) return unauthorized(res);

  const profile = buildProfile(req.body || {}, user);
  if (!profile.name) return badRequest(res, 'Name is required.');
  if (!profile.email) return badRequest(res, 'Email is required.');
  if (!profile.course) return badRequest(res, 'Please tell us which programme you completed.');

  // One profile per account: re-submitting updates the existing row.
  const { data: existing } = await supabase
    .from('alumni')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await updateFlexible('alumni', { id: existing.id }, profile);
    if (error) return serverError(res, error.message);
    return ok(res, { application: data });
  }

  const { data, error } = await insertFlexible('alumni', {
    id: randomUUID(), ...profile, created_at: new Date().toISOString(),
  });
  if (error) {
    const m = `${error.message || ''}`.toLowerCase();
    if (error.code === 'PGRST205' || m.includes('schema cache') || m.includes('does not exist')) {
      return serverError(res, 'The alumni network is not set up yet. Please try again shortly.');
    }
    return serverError(res, error.message);
  }
  return created(res, { application: data });
}
