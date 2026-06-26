import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { sendRegistrationEmail } from '../lib/email.js';
import { created, badRequest, conflict, serverError, allowMethods } from '../lib/helpers.js';

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

  try {
    // Prevent duplicate registrations for the same course
    const { data: existing } = await supabase
      .from('registrations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('course', course)
      .single();

    if (existing) {
      return conflict(res, 'You have already registered for this course.');
    }

    const { data: registration, error } = await supabase
      .from('registrations')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        phone: phone || null,
        course,
        mode: mode || 'hybrid',
        message: message || null,
        status: 'pending',
      })
      .select('id, course, status, created_at')
      .single();

    if (error) throw error;

    sendRegistrationEmail({ to: email, firstName, course }).catch(console.error);

    return created(res, { registration });
  } catch (err) {
    console.error('[register]', err);
    return serverError(res);
  }
}
