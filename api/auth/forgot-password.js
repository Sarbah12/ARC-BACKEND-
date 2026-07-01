import { z } from 'zod';
import { randomBytes, createHash } from 'node:crypto';
import { supabase } from '../../lib/supabase.js';
import { sendPasswordResetEmail } from '../../lib/email.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

const schema = z.object({
  email: z.string().email(),
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.issues[0].message);
  }

  const { email } = parsed.data;
  const genericMessage = 'If an account exists for that email, a reset link is on its way.';

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, email')
      .eq('email', email.toLowerCase())
      .single();

    // Always respond the same way whether or not the account exists,
    // so this endpoint can't be used to enumerate registered emails.
    if (!user) return ok(res, { message: genericMessage });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

    const { error } = await supabase
      .from('users')
      .update({ reset_token_hash: tokenHash, reset_token_expires: expiresAt })
      .eq('id', user.id);

    if (error) throw error;

    const resetUrl = `${process.env.APP_URL}/reset-password.html?token=${rawToken}`;
    sendPasswordResetEmail({ to: user.email, firstName: user.first_name, resetUrl }).catch(console.error);

    return ok(res, { message: genericMessage });
  } catch (err) {
    console.error('[forgot-password]', err);
    return serverError(res);
  }
}
