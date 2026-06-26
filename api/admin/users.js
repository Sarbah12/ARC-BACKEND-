import { supabase } from '../../lib/supabase.js';
import { ok, unauthorized, serverError, allowMethods } from '../../lib/helpers.js';

function checkAdmin(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  return token === process.env.ADMIN_SECRET;
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;
  if (!checkAdmin(req)) return unauthorized(res);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, course_interest, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return ok(res, { users: data });
  } catch (err) {
    console.error('[admin/users]', err);
    return serverError(res);
  }
}
