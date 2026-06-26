import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, unauthorized, badRequest, serverError, allowMethods } from '../../lib/helpers.js';


export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'PATCH', 'OPTIONS']);
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

  // PATCH — update status (pending | accepted | rejected)
  if (req.method === 'PATCH') {
    const { id, status } = req.body;
    if (!id || !['pending', 'accepted', 'rejected'].includes(status)) {
      return badRequest(res, 'Valid id and status required.');
    }

    try {
      const { error } = await supabase
        .from('registrations')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      return ok(res, { message: 'Status updated.' });
    } catch (err) {
      console.error('[admin/registrations PATCH]', err);
      return serverError(res);
    }
  }
}
