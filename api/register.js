import { z } from 'zod';
import { supabase, insertFlexible } from '../lib/supabase.js';
import { sendRegistrationEmail, sendRegistrationNotification } from '../lib/email.js';
import { created, badRequest, conflict, serverError, allowMethods, respond } from '../lib/helpers.js';
import {
  isSpamSubmission, looksLikeGibberish, checkVerification,
  getRequestIp, lookupGeo, VERIFICATION_ENABLED,
} from '../lib/antispam.js';

const schema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional(),
  course: z.string().min(1),
  mode: z.enum(['in-person', 'online', 'hybrid']).optional(),
  message: z.string().max(500).optional(),
});

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.issues[0].message);
  }

  const { firstName, lastName, email, phone, course, mode, message } = parsed.data;
  const lcEmail = email.toLowerCase();

  // Bot traps → pretend success, store nothing.
  if (isSpamSubmission(req.body)) {
    return created(res, { registration: { course, status: 'pending' } });
  }
  if (looksLikeGibberish(firstName) && looksLikeGibberish(lastName)) {
    return badRequest(res, 'Please enter your real first and last name.');
  }
  if (VERIFICATION_ENABLED && !checkVerification(lcEmail, 'registration', req.body)) {
    return respond(res, 403, { success: false, error: 'Please verify your email with the code we sent before registering.' });
  }

  try {
    // Prevent duplicate registrations for the same course
    const { data: existing } = await supabase
      .from('registrations')
      .select('id')
      .eq('email', lcEmail)
      .eq('course', course)
      .single();

    if (existing) {
      return conflict(res, 'You have already registered for this course.');
    }

    const ip = getRequestIp(req);
    const geo = await lookupGeo(ip);

    const { data: registration, error } = await insertFlexible('registrations', {
      first_name: firstName,
      last_name: lastName,
      email: lcEmail,
      phone: phone || null,
      course,
      mode: mode || 'hybrid',
      message: message || null,
      status: 'pending',
      ip: ip || '',
      geo_country: geo.country,
      geo_city: geo.city,
      geo_isp: geo.isp,
    }, 'id, course, status, created_at');

    if (error) throw error;

    sendRegistrationEmail({ to: email, firstName, course }).catch(console.error);
    sendRegistrationNotification({
      firstName, lastName, email: lcEmail, phone, course,
      mode: mode || 'hybrid', status: registration?.status || 'pending', note: message,
    }).catch(console.error);

    return created(res, { registration });
  } catch (err) {
    console.error('[register]', err);
    return serverError(res);
  }
}
