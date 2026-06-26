import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase.js';
import { ok, unauthorized, badRequest, serverError, allowMethods } from '../lib/helpers.js';

function getUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

const USER_COLS = 'id, first_name, last_name, email, phone, course_interest, role, avatar_url, google_id, created_at';

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'PATCH', 'OPTIONS']);
  if (block) return;

  const user = getUser(req);
  if (!user) return unauthorized(res);

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const [profileRes, regsRes, rsvpsRes] = await Promise.all([
        supabase.from('users').select(USER_COLS).eq('id', user.id).single(),
        supabase.from('registrations').select('*').eq('email', user.email).order('created_at', { ascending: false }),
        supabase.from('event_rsvps').select('id, created_at, events(id, title, date, location)').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (profileRes.error) throw profileRes.error;

      return ok(res, {
        profile:       profileRes.data,
        registrations: regsRes.data   || [],
        rsvps:         rsvpsRes.data  || [],
      });
    } catch (err) {
      console.error('[me GET]', err.message);
      return serverError(res);
    }
  }

  // ── PATCH ──
  if (req.method === 'PATCH') {
    const body = req.body || {};

    // Password change
    if (body.new_password !== undefined) {
      if (!body.current_password) return badRequest(res, 'Current password is required.');

      const { data: existing, error: fetchErr } = await supabase
        .from('users').select('password_hash').eq('id', user.id).single();

      if (fetchErr) return serverError(res);
      if (!existing?.password_hash) return badRequest(res, 'Password change is not available for Google sign-in accounts.');

      const match = await bcrypt.compare(body.current_password, existing.password_hash);
      if (!match) return badRequest(res, 'Current password is incorrect.');
      if (body.new_password.length < 8) return badRequest(res, 'New password must be at least 8 characters.');

      const hash = await bcrypt.hash(body.new_password, 12);
      const { error } = await supabase.from('users').update({ password_hash: hash, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) return serverError(res);
      return ok(res, { message: 'Password updated successfully.' });
    }

    // Profile update
    const updates = { updated_at: new Date().toISOString() };
    if (body.first_name   !== undefined) updates.first_name      = body.first_name.trim();
    if (body.last_name    !== undefined) updates.last_name       = body.last_name.trim();
    if (body.phone        !== undefined) updates.phone           = body.phone.trim();
    if (body.course_interest !== undefined) updates.course_interest = body.course_interest;
    if (body.avatar_url !== undefined) {
      const url = String(body.avatar_url).trim();
      if (url && !/^https?:\/\//i.test(url)) return badRequest(res, 'Invalid avatar URL.');
      updates.avatar_url = url || null;
    }

    const fields = Object.keys(updates).filter(k => k !== 'updated_at');
    if (!fields.length) return badRequest(res, 'Nothing to update.');

    const { data: updated, error } = await supabase
      .from('users').update(updates).eq('id', user.id)
      .select(USER_COLS).single();

    if (error) return serverError(res);
    return ok(res, { user: updated });
  }
}
