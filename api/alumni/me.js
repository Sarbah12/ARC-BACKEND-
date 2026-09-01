import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase.js';
import { ok, unauthorized, allowMethods } from '../../lib/helpers.js';

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

// The signed-in user's own alumni application (any status), so the join page
// can show "under review" / "approved" instead of the form again.
export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;

  const user = getUser(req);
  if (!user?.id) return unauthorized(res);

  const cols = 'id, name, cohort, course, status, created_at, updated_at';
  let { data, error } = await supabase
    .from('alumni').select(cols).eq('user_id', user.id).maybeSingle();

  // Fall back to email for rows created before user_id was recorded.
  if (!data && !error && user.email) {
    ({ data } = await supabase
      .from('alumni').select(cols).ilike('email', user.email).maybeSingle());
  }

  return ok(res, { application: data || null });
}
