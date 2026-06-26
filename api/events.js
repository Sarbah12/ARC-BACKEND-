import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { ok, created, badRequest, serverError, allowMethods } from '../lib/helpers.js';

const rsvpSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
});

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'OPTIONS']);
  if (block) return;

  // GET /api/events — list upcoming/past events
  if (req.method === 'GET') {
    try {
      const { type } = req.query; // ?type=upcoming or ?type=past

      let query = supabase
        .from('events')
        .select('id, title, description, date, location, mode, capacity, image_url, status')
        .order('date', { ascending: false });

      if (type === 'upcoming') {
        query = query.gte('date', new Date().toISOString());
      } else if (type === 'past') {
        query = query.lt('date', new Date().toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return ok(res, { events: data });
    } catch (err) {
      console.error('[events GET]', err);
      return serverError(res);
    }
  }

  // POST /api/events — RSVP to an event
  if (req.method === 'POST') {
    const parsed = rsvpSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, parsed.error.issues[0].message);
    }

    const { eventId, name, email, phone } = parsed.data;

    try {
      // Check for duplicate RSVP
      const { data: existing } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', eventId)
        .eq('email', email.toLowerCase())
        .single();

      if (existing) {
        return ok(res, { message: 'You have already registered for this event.' });
      }

      const { error } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: eventId,
          name,
          email: email.toLowerCase(),
          phone: phone || null,
        });

      if (error) throw error;

      return created(res, { message: 'RSVP confirmed! See you there.' });
    } catch (err) {
      console.error('[events POST]', err);
      return serverError(res);
    }
  }
}
