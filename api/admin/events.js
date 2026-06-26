import { supabase } from '../../lib/supabase.js';
import { ok, unauthorized, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

function checkAdmin(req) {
  return (req.headers.authorization || '').replace('Bearer ', '') === process.env.ADMIN_SECRET;
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
  if (block) return;
  if (!checkAdmin(req)) return unauthorized(res);

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('events').select('*, event_rsvps(count)').order('date', { ascending: false });
    if (error) return serverError(res, error.message);
    return ok(res, { events: data });
  }

  if (req.method === 'POST') {
    const { title, description, date, location, mode, capacity, image_url, status } = req.body || {};
    if (!title?.trim()) return badRequest(res, 'Title is required.');
    if (!date) return badRequest(res, 'Date is required.');

    const { data, error } = await supabase.from('events').insert({
      title: title.trim(), description: description?.trim() || null,
      date, location: location?.trim() || null,
      mode: mode || 'in-person', capacity: capacity ? parseInt(capacity) : null,
      image_url: image_url || null, status: status || 'upcoming',
    }).select().single();

    if (error) return serverError(res, error.message);
    return ok(res, { event: data });
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    if (updates.capacity) updates.capacity = parseInt(updates.capacity);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('events').update(updates).eq('id', id).select().single();
    if (error) return serverError(res, error.message);
    return ok(res, { event: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return serverError(res, error.message);
    return ok(res, { message: 'Event deleted.' });
  }
}
