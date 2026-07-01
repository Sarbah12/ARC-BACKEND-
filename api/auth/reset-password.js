import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { supabase } from '../../lib/supabase.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
});

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.issues[0].message);
  }

  const { token, password } = parsed.data;
  const tokenHash = createHash('sha256').update(token).digest('hex');

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_token_expires')
      .eq('reset_token_hash', tokenHash)
      .single();

    if (error || !user) return badRequest(res, 'This reset link is invalid or has already been used.');
    if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return badRequest(res, 'This reset link has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, reset_token_hash: null, reset_token_expires: null })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return ok(res, { message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error('[reset-password]', err);
    return serverError(res);
  }
}
