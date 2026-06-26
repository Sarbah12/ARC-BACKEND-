import { supabase } from '../../lib/supabase.js';
import { ok, unauthorized, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

function checkAdmin(req) {
  return (req.headers.authorization || '').replace('Bearer ', '') === process.env.ADMIN_SECRET;
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'OPTIONS']);
  if (block) return;
  if (!checkAdmin(req)) return unauthorized(res);

  // GET — all content
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('site_content').select('*').order('key');
    if (error) return serverError(res, error.message);
    const content = {};
    (data || []).forEach(r => { content[r.key] = r.value; });
    return ok(res, { content });
  }

  // POST — upsert one or many keys
  // Body: { updates: { "home.hero_title": "New title", ... } }
  if (req.method === 'POST') {
    const { updates } = req.body || {};
    if (!updates || typeof updates !== 'object') return badRequest(res, 'updates object required.');

    const rows = Object.entries(updates).map(([key, value]) => ({
      key, value, updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('site_content')
      .upsert(rows, { onConflict: 'key' });

    if (error) return serverError(res, error.message);
    return ok(res, { message: `${rows.length} field(s) saved.` });
  }
}
