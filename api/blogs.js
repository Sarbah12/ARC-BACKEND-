import { supabase } from '../lib/supabase.js';
import { ok, serverError, allowMethods } from '../lib/helpers.js';

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;

  const { slug } = req.query || {};

  if (slug) {
    const { data, error } = await supabase
      .from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').single();
    if (error) return serverError(res, error.message);
    return ok(res, { post: data });
  }

  const { data, error } = await supabase
    .from('blog_posts').select('id, title, slug, excerpt, cover_image, author_name, category, published_at')
    .eq('status', 'published').order('published_at', { ascending: false });

  if (error) return serverError(res, error.message);
  return ok(res, { posts: data });
}
