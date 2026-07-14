import { z } from 'zod';
import { supabase, insertFlexible, updateFlexible } from '../lib/supabase.js';
import { sendRegistrationEmail } from '../lib/email.js';
import { ok, created, badRequest, serverError, allowMethods, respond } from '../lib/helpers.js';
import {
  isSpamSubmission, looksLikeGibberish, checkVerification,
  getRequestIp, lookupGeo, VERIFICATION_ENABLED,
} from '../lib/antispam.js';

// Accepts both camelCase (firstName) and snake_case (first_name) from the frontend
const schema = z.object({
  first_name:  z.string().min(1).max(60).optional(),
  last_name:   z.string().min(1).max(60).optional(),
  firstName:   z.string().min(1).max(60).optional(),
  lastName:    z.string().min(1).max(60).optional(),
  email:   z.string().email(),
  phone:   z.string().max(20).optional(),
  course:  z.string().min(1),
  mode:    z.enum(['in-person', 'online', 'hybrid']).optional(),
  status:  z.string().optional(),
  note:    z.string().max(500).optional(),
  message: z.string().max(500).optional(),
  payment_ref: z.string().max(120).optional(),
}).refine(d => d.first_name || d.firstName, { message: 'first_name is required' })
  .refine(d => d.last_name  || d.lastName,  { message: 'last_name is required' });

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues[0].message);

  const d = parsed.data;
  const firstName = d.first_name || d.firstName;
  const lastName  = d.last_name  || d.lastName;
  const { email, phone, course, mode, status, note, message, payment_ref } = d;
  const lcEmail = email.toLowerCase();

  // Bot traps: honeypot/timing → pretend success but store nothing.
  if (isSpamSubmission(req.body)) {
    return created(res, { registration: { course, status: 'pending' } });
  }
  if (looksLikeGibberish(firstName) && looksLikeGibberish(lastName)) {
    return badRequest(res, 'Please enter your real first and last name.');
  }

  try {
    // Look for an existing active registration for this email + course.
    // Instead of rejecting (which used to leave paid learners stuck on
    // "pending_payment"), we update it so the status can progress:
    //   applied → pending_payment → paid / enrolled
    const { data: existing } = await supabase
      .from('registrations')
      .select('id, status')
      .eq('email', lcEmail)
      .eq('course', course)
      .maybeSingle();

    // Email verification: required for a first-time registration. An existing
    // (already-verified) registration or a payment_ref — the post-payment
    // re-submit — skips re-verification so the payment flow keeps working.
    if (VERIFICATION_ENABLED && !existing && !payment_ref && !checkVerification(lcEmail, 'registration', req.body)) {
      return respond(res, 403, { success: false, error: 'Please verify your email with the code we sent before registering.' });
    }

    const ip = getRequestIp(req);
    const geo = await lookupGeo(ip);

    if (existing) {
      const patch = { first_name: firstName, last_name: lastName };
      if (phone)       patch.phone = phone;
      if (status)      patch.status = status;
      if (payment_ref) patch.payment_ref = payment_ref;
      if (note || message) patch.message = note || message;

      const { data: updated, error } = await updateFlexible(
        'registrations', { id: existing.id }, patch, 'id, course, status, created_at');
      if (error) throw error;
      return ok(res, { registration: updated, updated: true });
    }

    const { data: registration, error } = await insertFlexible('registrations', {
      first_name: firstName,
      last_name:  lastName,
      email:  lcEmail,
      phone:  phone  || null,
      course,
      mode:   mode   || 'hybrid',
      message: note  || message || null,
      status: status || 'pending',
      payment_ref: payment_ref || null,
      ip: ip || '',
      geo_country: geo.country,
      geo_city: geo.city,
      geo_isp: geo.isp,
    }, 'id, course, status, created_at');

    if (error) throw error;
    sendRegistrationEmail({ to: email, firstName, course }).catch(console.error);
    return created(res, { registration });
  } catch (err) {
    console.error('[registrations POST]', err);
    return serverError(res);
  }
}
