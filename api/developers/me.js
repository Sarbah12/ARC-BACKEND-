import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase.js';
import { ok, unauthorized, serverError, allowMethods } from '../../lib/helpers.js';

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

// Returns the signed-in user's own developer application (any status), so the
// join page can show "under review" / "approved" instead of the form again.
export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;

  const user = getUser(req);
  if (!user?.id) return unauthorized(res);

  let { data, error } = await supabase
    .from('developers')
    .select('id, name, email, role, track, status, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  // Fall back to email for profiles created before user_id was recorded.
  if (!data && !error && user.email) {
    ({ data, error } = await supabase
      .from('developers')
      .select('id, name, email, role, track, status, created_at, updated_at')
      .ilike('email', user.email)
      .maybeSingle());
  }

  if (error) return serverError(res, error.message);
  return ok(res, { application: data || null });
}
