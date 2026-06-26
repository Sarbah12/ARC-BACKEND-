import { supabase } from '../../lib/supabase.js';
import { ok, unauthorized, serverError, allowMethods } from '../../lib/helpers.js';

function checkAdmin(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  return token === process.env.ADMIN_SECRET;
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'PATCH', 'OPTIONS']);
  if (block) return;
  if (!checkAdmin(req)) return unauthorized(res);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ok(res, { enquiries: data });
    } catch (err) {
      console.error('[admin/enquiries GET]', err);
      return serverError(res);
    }
  }

  // PATCH — mark as read
  if (req.method === 'PATCH') {
    const { id } = req.body;
    if (!id) return ok(res, { message: 'No id provided.' });

    try {
      const { error } = await supabase
        .from('enquiries')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      return ok(res, { message: 'Marked as read.' });
    } catch (err) {
      console.error('[admin/enquiries PATCH]', err);
      return serverError(res);
    }
  }
}
