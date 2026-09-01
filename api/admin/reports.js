import { randomUUID } from 'node:crypto';
import { supabase, insertFlexible, updateFlexible } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

// True when the table hasn't been created yet (migration not run).
function tableMissing(error) {
  const m = `${error?.message || ''}`.toLowerCase();
  return error?.code === 'PGRST205' || m.includes('schema cache') || m.includes('does not exist');
}

// Annual reports (2024 onwards). Each row is one year's report: a title, a
// short summary, an optional cover image, and the report file/link itself.
export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('year', { ascending: false });
    if (error) {
      if (tableMissing(error)) return ok(res, { reports: [], setupRequired: true });
      return serverError(res, error.message);
    }
    return ok(res, { reports: data || [] });
  }

  if (req.method === 'POST') {
    const { year, title, summary, file_url, cover_image, status } = req.body || {};
    const yr = parseInt(year, 10);
    if (!yr || yr < 2000 || yr > 2100) return badRequest(res, 'Enter a valid year (e.g. 2024).');
    if (!String(title || '').trim()) return badRequest(res, 'Title is required.');

    const now = new Date().toISOString();
    const { data, error } = await insertFlexible('reports', {
      id: randomUUID(),
      year: yr,
      title: String(title).trim(),
      summary: String(summary || '').trim(),
      file_url: String(file_url || '').trim(),
      cover_image: String(cover_image || '').trim(),
      status: status === 'draft' ? 'draft' : 'published',
      created_at: now,
      updated_at: now,
    });
    if (error) {
      if (tableMissing(error)) return serverError(res, 'Reports are not set up yet — please run the database migration.');
      return serverError(res, error.message);
    }
    return ok(res, { report: data });
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    if (updates.year !== undefined) {
      const yr = parseInt(updates.year, 10);
      if (!yr || yr < 2000 || yr > 2100) return badRequest(res, 'Enter a valid year (e.g. 2024).');
      updates.year = yr;
    }
    updates.updated_at = new Date().toISOString();
    const { data, error } = await updateFlexible('reports', { id }, updates);
    if (error) return serverError(res, error.message);
    return ok(res, { report: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) return serverError(res, error.message);
    return ok(res, { message: 'Report deleted.' });
  }
}
