import { createHmac, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
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
