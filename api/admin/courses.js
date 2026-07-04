import { randomUUID } from 'node:crypto';
import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

function courseId(body = {}) {
  const id = String(body.id || '').trim();
  if (id) return id;
  return `course_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return serverError(res, error.message);
    return ok(res, { courses: data || [] });
  }

  if (req.method === 'POST') {
    const {
      title, description, mode, pricing, price, currency,
      level, duration, instructor, category, start_date, image_url, status,
    } = req.body || {};
    if (!title?.trim()) return badRequest(res, 'Course name is required.');
    if ((pricing || 'free') === 'paid' && !String(price || '').trim()) {
      return badRequest(res, 'Enter a price, or set the course to Free.');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase.from('courses').insert({
      id: courseId(req.body),
      title: title.trim(),
      description: description?.trim() || '',
      mode: mode || 'in-person',
      pricing: pricing || 'free',
      price: (pricing || 'free') === 'paid' ? String(price || '').trim() : '',
      currency: currency?.trim() || 'GHS',
      level: level?.trim() || '',
      duration: duration?.trim() || '',
      instructor: instructor?.trim() || '',
      category: category?.trim() || '',
      start_date: start_date || '',
      image_url: image_url || '',
      status: status || 'published',
      created_at: now,
      updated_at: now,
    }).select().single();

    if (error) return serverError(res, error.message);
    return ok(res, { course: data });
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return serverError(res, error.message);
    return ok(res, { course: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) return serverError(res, error.message);
    return ok(res, { message: 'Course deleted.' });
  }
}
