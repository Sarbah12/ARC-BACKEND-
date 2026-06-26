import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase.js';
import { sendWelcomeEmail } from '../../lib/email.js';
import { ok, created, badRequest, conflict, serverError, allowMethods } from '../../lib/helpers.js';

const schema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  course: z.string().optional(),
});

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.issues[0].message);
  }

  const { firstName, lastName, email, password, course } = parsed.data;

  try {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) return conflict(res, 'An account with this email already exists.');

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        course_interest: course || null,
      })
      .select('id, first_name, last_name, email, course_interest, created_at')
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Fire-and-forget welcome email
    sendWelcomeEmail({ to: user.email, firstName: user.first_name, course }).catch(console.error);

    return created(res, { token, user });
  } catch (err) {
    console.error('[signup]', err);
    return serverError(res);
  }
}
