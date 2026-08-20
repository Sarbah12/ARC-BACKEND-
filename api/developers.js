import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { ok, created, unauthorized, badRequest, serverError, allowMethods } from '../lib/helpers.js';

// Columns safe to expose on the public directory (no email / user_id / status).
const PUBLIC_COLS =
  'id, name, role, bio, track, tags, photo_url, github_url, linkedin_url, website_url, twitter_url, instagram_url, youtube_url, created_at';

function getUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Tokens sign the id as `sub` (email auth) or `id` (legacy Google).
    return { id: payload.sub || payload.id, email: payload.email };
  } catch {
    return null;
  }
}

const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);

// `tags` is a Postgres text[] — accept a comma-separated string or an array.
function toTags(value) {
  if (Array.isArray(value)) return value.map(t => clean(t, 40)).filter(Boolean).slice(0, 20);
  return clean(value, 400).split(',').map(t => t.trim()).filter(Boolean).slice(0, 20);
}

function buildProfile(body, user) {
  return {
    user_id: user.id,
    name: clean(body.name, 120),
    email: clean(body.email || user.email, 254).toLowerCase(),
    role: clean(body.role, 120),
    bio: clean(body.bio, 2000),
    track: clean(body.track, 60) || 'software',
    tags: toTags(body.tags),
    photo_url: clean(body.photo_url, 800000), // may be an uploaded data URL
    github_url: clean(body.github_url, 500),
    linkedin_url: clean(body.linkedin_url, 500),
    website_url: clean(body.website_url, 500),
    twitter_url: clean(body.twitter_url, 500),
    instagram_url: clean(body.instagram_url, 500),
    youtube_url: clean(body.youtube_url, 500),
    status: 'pending', // every submission goes back through review
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'OPTIONS']);
  if (block) return;

  // ── Public directory: approved profiles only ──
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('developers')
      .select(PUBLIC_COLS)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) return serverError(res, error.message);
    return ok(res, { developers: data || [] });
  }

  // ── Submit an application (requires a signed-in ARC account) ──
  const user = getUser(req);
  if (!user?.id) return unauthorized(res);

  const body = req.body || {};
  const profile = buildProfile(body, user);
  if (!profile.name) return badRequest(res, 'Name is required.');
  if (!profile.role) return badRequest(res, 'Role is required.');
  if (!profile.email) return badRequest(res, 'Email is required.');

  // One profile per account: re-submitting updates the existing row so a
  // rejected applicant can reapply without creating duplicates.
  const { data: existing } = await supabase
    .from('developers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('developers')
      .update(profile)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return serverError(res, error.message);
    return ok(res, { application: data });
  }

  const { data, error } = await supabase
    .from('developers')
    .insert({ id: randomUUID(), ...profile, created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) return serverError(res, error.message);
  return created(res, { application: data });
}
