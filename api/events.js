import { z } from 'zod';
import { supabase, insertFlexible } from '../lib/supabase.js';
import { ok, created, badRequest, serverError, allowMethods, respond } from '../lib/helpers.js';
import {
  isSpamSubmission, checkVerification, getRequestIp, lookupGeo, VERIFICATION_ENABLED,
} from '../lib/antispam.js';

const rsvpSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
});

function publicImageUrl(value) {
  if (!value) return null;
  const url = String(value).trim();
  if (/^https?:\/\//i.test(url)) return url;
  // Admin may store uploaded covers as data URLs — allow reasonably sized ones for display.
  if (/^data:image\//i.test(url) && url.length <= 120_000) return url;
  return null;
}

function publicEvent(row) {
  return { ...row, image_url: publicImageUrl(row.image_url) };
}

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'OPTIONS']);
  if (block) return;

  // GET /api/events — list upcoming/past events, or ?id= for a single event
  if (req.method === 'GET') {
    try {
      const { type, id } = req.query;

      if (id) {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, description, date, location, mode, capacity, image_url, status')
          .eq('id', id)
          .neq('status', 'cancelled')
          .single();
        if (error) return serverError(res, error.message);
        return ok(res, { event: data ? publicEvent(data) : null });
      }

      const now = new Date().toISOString();

      let query = supabase
        .from('events')
        .select('id, title, description, date, location, mode, capacity, image_url, status')
        .neq('status', 'cancelled')
        .order('date', { ascending: type === 'past' });

      if (type === 'upcoming') {
        query = query.eq('status', 'upcoming').gte('date', now);
      } else if (type === 'past') {
        query = query.lt('date', now);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ok(res, { events: (data || []).map(publicEvent) });
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
    const lcEmail = email.toLowerCase();

    // Bot traps → pretend success, store nothing.
    if (isSpamSubmission(req.body)) {
      return created(res, { message: 'RSVP confirmed! See you there.' });
    }
    // Email verification required (the event form sends a "registration" code).
    if (VERIFICATION_ENABLED && !checkVerification(lcEmail, 'registration', req.body)) {
      return respond(res, 403, { success: false, error: 'Please verify your email with the code we sent before registering.' });
    }

    try {
      // Check for duplicate RSVP
      const { data: existing } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', eventId)
        .eq('email', lcEmail)
        .single();

      if (existing) {
        return ok(res, { message: 'You have already registered for this event.' });
      }

      const ip = getRequestIp(req);
      const geo = await lookupGeo(ip);
      const { error } = await insertFlexible('event_rsvps', {
        event_id: eventId,
        name,
        email: lcEmail,
        phone: phone || null,
        ip: ip || '',
        geo_country: geo.country,
        geo_city: geo.city,
        geo_isp: geo.isp,
      }, 'id');

      if (error) throw error;

      return created(res, { message: 'RSVP confirmed! See you there.' });
    } catch (err) {
      console.error('[events POST]', err);
      return serverError(res);
    }
  }
}
