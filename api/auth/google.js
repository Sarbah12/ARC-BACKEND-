import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase.js';
import { sendWelcomeEmail } from '../../lib/email.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const { credential } = req.body || {};
  if (!credential) return badRequest(res, 'Google credential required.');

  try {
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture, sub: google_id } = payload;

    // Find or create user
    let { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let user = existing;

    if (!user) {
      const { data: created, error } = await supabase
        .from('users')
        .insert({
          email,
          first_name: given_name || '',
          last_name:  family_name || '',
          avatar_url: picture || null,
          google_id,
          password_hash: null,
          role: 'student',
        })
        .select()
        .single();

      if (error) throw error;
      user = created;
      sendWelcomeEmail({ to: user.email, firstName: user.first_name, course: null }).catch(console.error);
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return ok(res, {
      token,
      user: {
        id:         user.id,
        first_name: user.first_name,
        last_name:  user.last_name,
        email:      user.email,
        role:       user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('[auth/google]', err);
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
      return badRequest(res, 'Invalid or expired Google token.');
    }
    return serverError(res);
  }
}
