import { supabase } from '../../lib/supabase.js';
import { ok, unauthorized, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

function checkAdmin(req) {
  return (req.headers.authorization || '').replace('Bearer ', '') === process.env.ADMIN_SECRET;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
  if (block) return;
  if (!checkAdmin(req)) return unauthorized(res);

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (error) return serverError(res, error.message);
    return ok(res, { posts: data });
  }

  if (req.method === 'POST') {
    const { title, excerpt, content, cover_image, author_name, category, status } = req.body || {};
    if (!title?.trim()) return badRequest(res, 'Title is required.');
    if (!content?.trim()) return badRequest(res, 'Content is required.');

    const baseSlug = slugify(title);
    const slug = `${baseSlug}-${Date.now()}`;
    const published_at = status === 'published' ? new Date().toISOString() : null;

    const { data, error } = await supabase.from('blog_posts').insert({
      title: title.trim(), slug, excerpt: excerpt?.trim() || null,
      content: content.trim(), cover_image: cover_image || null,
      author_name: author_name?.trim() || 'ARC Team',
      category: category || 'General', status: status || 'draft', published_at,
    }).select().single();

    if (error) return serverError(res, error.message);
    return ok(res, { post: data });
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    if (updates.status === 'published') updates.published_at = new Date().toISOString();
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('blog_posts').update(updates).eq('id', id).select().single();
    if (error) return serverError(res, error.message);
    return ok(res, { post: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return badRequest(res, 'id is required.');
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) return serverError(res, error.message);
    return ok(res, { message: 'Post deleted.' });
  }
}
