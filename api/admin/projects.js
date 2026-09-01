import { randomUUID } from 'node:crypto';
import { supabase, insertFlexible, updateFlexible } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, unauthorized, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) return serverError(res, error.message);
    return ok(res, { projects: data });
  }

  if (req.method === 'POST') {
    const { id, title, description, image_url, tech_stack, github_url, live_url, category, status, featured, stage } = req.body || {};
    if (!title?.trim()) return badRequest(res, 'Title is required.');

    const techArray = Array.isArray(tech_stack)
      ? tech_stack
      : (tech_stack || '').split(',').map(t => t.trim()).filter(Boolean);

    // `stage` marks ongoing vs completed work. insertFlexible drops it if the
    // column hasn't been added yet, so saving never fails on an older database.
    const { data, error } = await insertFlexible('projects', {
      id: validUuid(id) ? id : randomUUID(),
      title: title.trim(), description: description?.trim() || '',
      image_url: image_url || null, tech_stack: techArray,
      github_url: github_url || null, live_url: live_url || null,
      category: category || 'General', status: status || 'draft',
      featured: featured === true || featured === 'true',
      stage: stage === 'ongoing' ? 'ongoing' : 'completed',
    });

    if (error) return serverError(res, error.message);
    return ok(res, { project: data });
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    if (updates.tech_stack && !Array.isArray(updates.tech_stack)) {
      updates.tech_stack = updates.tech_stack.split(',').map(t => t.trim()).filter(Boolean);
    }
    updates.updated_at = new Date().toISOString();

    if (updates.stage) updates.stage = updates.stage === 'ongoing' ? 'ongoing' : 'completed';
    const { data, error } = await updateFlexible('projects', { id }, updates);
    if (error) return serverError(res, error.message);
    return ok(res, { project: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) return serverError(res, error.message);
    return ok(res, { message: 'Project deleted.' });
  }
}
