import { supabase } from '../lib/supabase.js';
import { ok, serverError, allowMethods } from '../lib/helpers.js';

// Public list of published annual reports, newest year first.
export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;

  const { data, error } = await supabase
    .from('reports')
    .select('id, year, title, summary, file_url, cover_image, created_at')
    .neq('status', 'draft')
    .order('year', { ascending: false });

  // A missing reports table shouldn't break the page — return an empty list.
  if (error) return ok(res, { reports: [] });
  return ok(res, { reports: data || [] });
}
