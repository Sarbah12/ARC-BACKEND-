import { supabase } from '../../lib/supabase.js';
import { requireStaffOrAdmin } from '../../lib/auth.js';
import { ok, serverError, allowMethods } from '../../lib/helpers.js';

// Read-only: staff can view registrations, but only admins (via the admin
// token) can change status or delete them.
export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;
  if (!(await requireStaffOrAdmin(req, res))) return;

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok(res, { registrations: data });
  } catch (err) {
    console.error('[staff/registrations GET]', err);
    return serverError(res);
  }
}
