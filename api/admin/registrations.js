import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

const VALID_STATUSES = ['pending', 'pending_payment', 'applied', 'accepted', 'rejected', 'enrolled'];

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'PATCH', 'DELETE', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  // GET — list all registrations
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ok(res, { registrations: data });
    } catch (err) {
      console.error('[admin/registrations GET]', err);
      return serverError(res);
    }
  }

  // PATCH — update status
  if (req.method === 'PATCH') {
    const { id, status } = req.body || {};
    if (!id || !VALID_STATUSES.includes(status)) {
      return badRequest(res, `Valid id and status required. Valid statuses: ${VALID_STATUSES.join(', ')}`);
    }
    try {
      const { error } = await supabase
        .from('registrations').update({ status }).eq('id', id);
      if (error) throw error;
      return ok(res, { message: 'Status updated.' });
    } catch (err) {
      console.error('[admin/registrations PATCH]', err);
      return serverError(res);
    }
  }

  // DELETE — remove a registration
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    try {
      const { error } = await supabase.from('registrations').delete().eq('id', id);
      if (error) throw error;
      return ok(res, { message: 'Registration deleted.' });
    } catch (err) {
      console.error('[admin/registrations DELETE]', err);
      return serverError(res);
    }
  }
}
