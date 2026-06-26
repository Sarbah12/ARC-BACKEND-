import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase.js';
import { ok, badRequest, unauthorized, serverError, allowMethods } from '../../lib/helpers.js';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.issues[0].message);
  }

  const { email, password } = parsed.data;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, password_hash, course_interest')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) return unauthorized(res, 'Invalid email or password.');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return unauthorized(res, 'Invalid email or password.');

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password_hash, ...safeUser } = user;

    return ok(res, { token, user: safeUser });
  } catch (err) {
    console.error('[signin]', err);
    return serverError(res);
  }
}
