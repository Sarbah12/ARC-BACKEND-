import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { created, badRequest, serverError, allowMethods } from '../lib/helpers.js';

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

  try {
    const { error } = await supabase.from('enquiries').insert({
      name,
      email:   email.toLowerCase(),
      subject: subject || null,
      message,
    });

    if (error) throw error;
    return created(res, { message: "Your message has been received. We'll be in touch shortly." });
  } catch (err) {
    console.error('[enquiries POST]', err);
    return serverError(res);
  }
}
