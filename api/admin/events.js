import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

function normalizeEventDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return new Date(`${raw}:00`).toISOString();
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function sanitizeImageUrl(value) {
  if (!value) return null;
  const url = String(value).trim();
  if (/^https?:\/\//i.test(url)) return url;
  // Keep cover images in admin storage but avoid multi-MB payloads breaking saves.
  if (url.startsWith('data:') && url.length > 120_000) return null;
  return url || null;
}

function deriveEventStatus(isoDate, requestedStatus) {
  const status = String(requestedStatus || 'upcoming').toLowerCase();
  if (status === 'cancelled') return 'cancelled';
  if (!isoDate) return status === 'past' ? 'past' : 'upcoming';
  const when = new Date(isoDate).getTime();
  if (Number.isNaN(when)) return 'upcoming';
  if (status === 'past') return 'past';
  return when >= Date.now() ? 'upcoming' : 'past';
}

function buildEventPayload(body = {}, { partial = false } = {}) {
  const payload = {};
  if (!partial || 'title' in body) payload.title = body.title?.trim() || '';
  if (!partial || 'description' in body) payload.description = body.description?.trim() || null;
  if (!partial || 'date' in body) payload.date = normalizeEventDate(body.date);
  if (!partial || 'location' in body) payload.location = body.location?.trim() || null;
  if (!partial || 'mode' in body) payload.mode = body.mode || 'in-person';
  if (!partial || 'capacity' in body) {
    const cap = body.capacity;
    payload.capacity = cap === '' || cap == null ? null : parseInt(cap, 10);
    if (Number.isNaN(payload.capacity)) payload.capacity = null;
  }
  if (!partial || 'image_url' in body) payload.image_url = sanitizeImageUrl(body.image_url);
  // Comma-separated labels shown as badges on the event ("workshop, free").
  if (!partial || 'tags' in body) {
    payload.tags = Array.isArray(body.tags)
      ? body.tags.map(t => String(t).trim()).filter(Boolean).join(', ')
      : String(body.tags ?? '').trim().slice(0, 300);
  }
  if (!partial || 'status' in body) {
    payload.status = deriveEventStatus(payload.date || body.date, body.status);
  }
  return payload;
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('events').select('*, event_rsvps(count)').order('date', { ascending: false });
    if (error) return serverError(res, error.message);
    return ok(res, { events: data });
  }

  if (req.method === 'POST') {
    const payload = buildEventPayload(req.body || {});
    if (!payload.title) return badRequest(res, 'Title is required.');
    if (!payload.date) return badRequest(res, 'Date is required.');

    const { data, error } = await supabase.from('events').insert({
      ...payload,
      updated_at: new Date().toISOString(),
    }).select().single();

    if (error) return serverError(res, error.message);
    return ok(res, { event: data });
  }

  if (req.method === 'PATCH') {
    const { id, event_rsvps, ...raw } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');

    const updates = buildEventPayload(raw, { partial: true });
    if ('date' in raw && !updates.date) return badRequest(res, 'Invalid date.');
    if ('date' in raw) {
      updates.status = deriveEventStatus(updates.date, raw.status || 'upcoming');
    } else if ('status' in raw && raw.status) {
      updates.status = String(raw.status).toLowerCase();
    }
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
