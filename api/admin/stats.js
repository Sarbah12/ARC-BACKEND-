import { supabase } from '../../lib/supabase.js';
import { ok, unauthorized, serverError, allowMethods } from '../../lib/helpers.js';

function checkAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  return token === process.env.ADMIN_SECRET;
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'OPTIONS']);
  if (block) return;
  if (!checkAdmin(req)) return unauthorized(res);

  try {
    const [users, registrations, enquiries, events] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('registrations').select('id', { count: 'exact', head: true }),
      supabase.from('enquiries').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }),
    ]);

    const [unread, pending] = await Promise.all([
      supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('read', false),
      supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    return ok(res, {
      stats: {
        users: users.count || 0,
        registrations: registrations.count || 0,
        enquiries: enquiries.count || 0,
        events: events.count || 0,
        unreadEnquiries: unread.count || 0,
        pendingRegistrations: pending.count || 0,
      }
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    return serverError(res);
  }
}
