import { supabase } from '../lib/supabase.js';
import { ok, serverError, allowMethods } from '../lib/helpers.js';

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  if (error) return serverError(res, error.message);
  return ok(res, { courses: data || [] });
}
