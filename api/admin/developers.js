import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

const STATUSES = ['pending', 'approved', 'rejected'];

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'PATCH', 'DELETE', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  // ── List every application (pending first, newest first) ──
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('developers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return serverError(res, error.message);
    const rank = { pending: 0, approved: 1, rejected: 2 };
    const developers = (data || []).sort(
      (a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3)
    );
    return ok(res, { developers });
  }

  // ── Approve / reject (or edit a field) ──
  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    if (updates.status && !STATUSES.includes(updates.status)) {
      return badRequest(res, `status must be one of: ${STATUSES.join(', ')}`);
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('developers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return serverError(res, error.message);
    return ok(res, { developer: data });
  }

  // ── Delete an application ──
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    const { error } = await supabase.from('developers').delete().eq('id', id);
    if (error) return serverError(res, error.message);
    return ok(res, { message: 'Developer profile deleted.' });
  }
}
