import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, serverError, allowMethods } from '../../lib/helpers.js';

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('id, name, email, phone, created_at, event_id, events(id, title, date, status)')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) return serverError(res, error.message);
    return ok(res, { rsvps: data || [] });
  } catch (err) {
    console.error('[admin/event-rsvps]', err);
    return serverError(res);
  }
}
