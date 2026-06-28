import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { created, badRequest, conflict, serverError, allowMethods } from '../lib/helpers.js';

// Accepts both camelCase (firstName) and snake_case (first_name) from the frontend
const schema = z.object({
  first_name: z.string().min(1).max(60).optional(),
  last_name:  z.string().min(1).max(60).optional(),
  firstName:  z.string().min(1).max(60).optional(),
  lastName:   z.string().min(1).max(60).optional(),
  email:   z.string().email(),
  phone:   z.string().max(20).optional(),
  course:  z.string().min(1),
  mode:    z.enum(['in-person', 'online', 'hybrid']).optional(),
  status:  z.string().optional(),
  note:    z.string().max(500).optional(),
  message: z.string().max(500).optional(),
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
  const { email, phone, course, mode, status, note, message } = d;

  try {
    const { data: existing } = await supabase
      .from('registrations').select('id')
      .eq('email', email.toLowerCase()).eq('course', course).single();

    if (existing) return conflict(res, 'You have already registered for this course.');

    const { data: registration, error } = await supabase
      .from('registrations')
      .insert({
        first_name: firstName,
        last_name:  lastName,
        email:  email.toLowerCase(),
        phone:  phone  || null,
        course,
        mode:   mode   || 'hybrid',
        message: note  || message || null,
        status: status || 'pending',
      })
      .select('id, course, status, created_at')
      .single();

    if (error) throw error;
    return created(res, { registration });
  } catch (err) {
    console.error('[registrations POST]', err);
    return serverError(res);
  }
}
