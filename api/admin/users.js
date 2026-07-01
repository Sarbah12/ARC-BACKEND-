import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'PATCH', 'DELETE', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  // GET — list all users
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, course_interest, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ok(res, { users: data });
    } catch (err) {
      console.error('[admin/users GET]', err);
      return serverError(res);
    }
  }

  // PATCH — change role (student / staff / admin)
  if (req.method === 'PATCH') {
    const { id, role } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    if (!['student', 'staff', 'admin'].includes(role)) return badRequest(res, 'role must be "student", "staff", or "admin".');
    try {
      const { error } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return ok(res, { message: `Role updated to ${role}.` });
    } catch (err) {
      console.error('[admin/users PATCH]', err);
      return serverError(res);
    }
  }

  // DELETE — remove a user
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return ok(res, { message: 'User deleted.' });
    } catch (err) {
      console.error('[admin/users DELETE]', err);
      return serverError(res);
    }
  }
}
