import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, serverError, allowMethods } from '../../lib/helpers.js';

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) return serverError(res, error.message);
    return ok(res, { activities: data || [] });
  } catch (err) {
    console.error('[admin/activities]', err);
    return serverError(res);
  }
}
