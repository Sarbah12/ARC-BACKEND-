import { z } from 'zod';
import { insertFlexible } from '../lib/supabase.js';
import { created, badRequest, serverError, allowMethods, respond } from '../lib/helpers.js';
import {
  isSpamSubmission, checkVerification, getRequestIp, lookupGeo, VERIFICATION_ENABLED,
} from '../lib/antispam.js';

const schema = z.object({
  name:    z.string().min(1).max(100),
  email:   z.string().email(),
  subject: z.string().max(150).optional(),
  message: z.string().min(1).max(2000),
});

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues[0].message);

  const { name, email, subject, message } = parsed.data;
  const lcEmail = email.toLowerCase();

  // Bot traps → pretend success, store nothing.
  if (isSpamSubmission(req.body)) {
    return created(res, { message: "Your message has been received. We'll be in touch shortly." });
  }
  if (VERIFICATION_ENABLED && !checkVerification(lcEmail, 'enquiry', req.body)) {
    return respond(res, 403, { success: false, error: 'Please verify your email with the code we sent before submitting.' });
  }

  try {
    const ip = getRequestIp(req);
    const geo = await lookupGeo(ip);
    const { error } = await insertFlexible('enquiries', {
      name,
      email:   lcEmail,
      subject: subject || null,
      message,
      ip: ip || '',
      geo_country: geo.country,
      geo_city: geo.city,
      geo_isp: geo.isp,
    }, 'id');

    if (error) throw error;
    return created(res, { message: "Your message has been received. We'll be in touch shortly." });
  } catch (err) {
    console.error('[enquiries POST]', err);
    return serverError(res);
  }
}
