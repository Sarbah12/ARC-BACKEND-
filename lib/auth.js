import { createHmac, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { supabase } from './supabase.js';
import { unauthorized } from './helpers.js';

export function verifyJwt(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const payload = verifyJwt(token);
  if (!payload) return unauthorized(res);
  req.user = payload;
  if (next) next();
  return payload;
}

// Gate for staff-facing (read-only) endpoints. Unlike the JWT payload's `role`
// claim (only set at login time for Google sign-in, and never for email/
// password sign-in), this always reads the user's *current* role from the
// database, so a role change takes effect immediately without re-login.
export async function requireStaffOrAdmin(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const payload = verifyJwt(token);
  const userId = payload?.sub || payload?.id;
  if (!userId) { unauthorized(res); return null; }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (error || !user || !['staff', 'admin'].includes(user.role)) {
    unauthorized(res, 'Staff access required.');
    return null;
  }
  return user;
}

export function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_TOKEN;
  if (!secret) return unauthorized(res, 'Admin not configured');

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return unauthorized(res);

  try {
    const a = Buffer.from(token);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return unauthorized(res);
  } catch {
    return unauthorized(res);
  }

  if (next) next();
  return true;
}
