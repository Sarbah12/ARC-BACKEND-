import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

// GET /api/admin/users/:id — full profile for the admin "View user" modal:
// the account, everything they registered for, and their recent activity.
export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  const id = req.params?.id;
  if (!id) return badRequest(res, 'id is required.');

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, avatar_url, google_id, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!user) return ok(res, { user: null, registrations: [], activities: [] });

    // Registrations are keyed by email; activities by user id (email as backup).
    const [regsRes, actsRes] = await Promise.all([
      supabase.from('registrations').select('*')
        .ilike('email', user.email)
        .order('created_at', { ascending: false }),
      supabase.from('activities').select('*')
        .or(`user_id.eq.${user.id},user_email.ilike.${user.email}`)
        .order('created_at', { ascending: false })
        .limit(25),
    ]);

    return ok(res, {
      user,
      registrations: regsRes.data || [],
      activities: actsRes.data || [],
    });
  } catch (err) {
    console.error('[admin/users/:id]', err);
    return serverError(res);
  }
}
