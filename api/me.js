import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase.js';
import { ok, unauthorized, badRequest, serverError, allowMethods } from '../lib/helpers.js';

function getUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'PATCH', 'OPTIONS']);
  if (block) return;

  const user = getUser(req);
  if (!user) return unauthorized(res);

  // GET — fetch full profile + registrations + rsvps
  if (req.method === 'GET') {
    try {
      const [{ data: profile }, { data: registrations }, { data: rsvps }] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name, email, course_interest, role, avatar_url, created_at').eq('id', user.id).single(),
        supabase.from('registrations').select('*').eq('email', user.email).order('created_at', { ascending: false }),
        supabase.from('event_rsvps').select('*, events(title, date, location)').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      return ok(res, { profile, registrations: registrations || [], rsvps: rsvps || [] });
    } catch (err) {
      console.error('[me GET]', err);
      return serverError(res);
    }
  }

  // PATCH — update profile or change password
  if (req.method === 'PATCH') {
    const { first_name, last_name, course_interest, current_password, new_password } = req.body || {};

    try {
      // Password change flow
      if (new_password) {
        if (!current_password) return badRequest(res, 'Current password required.');
        const { data: existing } = await supabase.from('users').select('password_hash').eq('id', user.id).single();
        if (!existing?.password_hash) return badRequest(res, 'Password change not available for social login accounts.');
        const match = await bcrypt.compare(current_password, existing.password_hash);
        if (!match) return badRequest(res, 'Current password is incorrect.');
        if (new_password.length < 8) return badRequest(res, 'New password must be at least 8 characters.');
        const hash = await bcrypt.hash(new_password, 12);
        await supabase.from('users').update({ password_hash: hash }).eq('id', user.id);
        return ok(res, { message: 'Password updated.' });
      }

      // Profile update
      const updates = {};
      if (first_name !== undefined) updates.first_name = first_name.trim();
      if (last_name  !== undefined) updates.last_name  = last_name.trim();
      if (course_interest !== undefined) updates.course_interest = course_interest;
      if (req.body.avatar_url !== undefined) updates.avatar_url = req.body.avatar_url;

      if (!Object.keys(updates).length) return badRequest(res, 'Nothing to update.');

      const { data: updated, error } = await supabase
        .from('users').update(updates).eq('id', user.id)
        .select('id, first_name, last_name, email, course_interest, role, avatar_url').single();

      if (error) throw error;
      return ok(res, { user: updated });
    } catch (err) {
      console.error('[me PATCH]', err);
      return serverError(res);
    }
  }
}
