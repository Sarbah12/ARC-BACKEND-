import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables');
}

// Service role client — full access, server-side only
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Name of a column PostgREST says is missing, e.g. "Could not find the 'ip' column".
function missingColumn(error) {
  const m = `${error?.message || ''}`.match(/'([^']+)' column/i);
  return m ? m[1] : null;
}

// Insert but, if the table rejects an unknown column (schema not migrated yet),
// drop that column and retry. Lets new fields like ip/geo_* be added to inserts
// before the migration is applied, without breaking writes.
export async function insertFlexible(table, row, selectCols = '*') {
  let payload = { ...row };
  for (let i = 0; i < 8; i++) {
    const res = await supabase.from(table).insert(payload).select(selectCols).single();
    if (!res.error) return res;
    const col = missingColumn(res.error);
    if (col && col in payload) { delete payload[col]; continue; }
    return res;
  }
  return supabase.from(table).insert(payload).select(selectCols).single();
}

// Update variant of insertFlexible.
export async function updateFlexible(table, match, patch, selectCols = '*') {
  let payload = { ...patch };
  for (let i = 0; i < 8; i++) {
    const res = await supabase.from(table).update(payload).match(match).select(selectCols).single();
    if (!res.error) return res;
    const col = missingColumn(res.error);
    if (col && col in payload) { delete payload[col]; continue; }
    return res;
  }
  return supabase.from(table).update(payload).match(match).select(selectCols).single();
}
