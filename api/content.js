import { supabase } from '../lib/supabase.js';
import { ok, serverError, allowMethods } from '../lib/helpers.js';

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;

  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .order('key');

  if (error) return serverError(res, error.message);

  // Return as flat key→value map
  const content = {};
  (data || []).forEach(row => { content[row.key] = row.value; });
  return ok(res, { content });
}
