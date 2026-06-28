import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'PATCH', 'DELETE', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  // GET — list all enquiries
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('enquiries').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return ok(res, { enquiries: data });
    } catch (err) {
      console.error('[admin/enquiries GET]', err);
      return serverError(res);
    }
  }

  // PATCH — mark as read (single id or markAll:true)
  if (req.method === 'PATCH') {
    const { id, markAll } = req.body || {};

    if (markAll) {
      try {
        const { error } = await supabase
          .from('enquiries').update({ read: true }).eq('read', false);
        if (error) throw error;
        return ok(res, { message: 'All marked as read.' });
      } catch (err) {
        console.error('[admin/enquiries PATCH markAll]', err);
        return serverError(res);
      }
    }

    if (!id) return badRequest(res, 'id is required.');
    try {
      const { error } = await supabase
        .from('enquiries').update({ read: true }).eq('id', id);
      if (error) throw error;
      return ok(res, { message: 'Marked as read.' });
    } catch (err) {
      console.error('[admin/enquiries PATCH]', err);
      return serverError(res);
    }
  }

  // DELETE — remove an enquiry
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    try {
      const { error } = await supabase.from('enquiries').delete().eq('id', id);
      if (error) throw error;
      return ok(res, { message: 'Enquiry deleted.' });
    } catch (err) {
      console.error('[admin/enquiries DELETE]', err);
      return serverError(res);
    }
  }
}
