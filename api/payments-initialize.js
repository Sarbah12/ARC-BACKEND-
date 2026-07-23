import { z } from 'zod';
import { allowMethods, badRequest, ok, respond, serverError } from '../lib/helpers.js';
import { isSpamSubmission } from '../lib/antispam.js';
import { initializePaystackPayment, paystackConfigured } from '../lib/paystack.js';

const schema = z.object({
  email: z.string().email(),
  amount: z.number().int().min(100),
  currency: z.string().min(3).max(8).optional(),
  reference: z.string().min(3).max(120),
  callback_url: z.string().url(),
  metadata: z.record(z.any()).optional(),
});

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  if (isSpamSubmission(req.body)) {
    return ok(res, { authorization_url: 'https://checkout.paystack.com/' });
  }

  if (!paystackConfigured()) {
    return respond(res, 503, { success: false, error: 'Payment is not configured on the server.' });
  }

  const parsed = schema.safeParse({
    ...req.body,
    amount: Number(req.body?.amount),
  });
  if (!parsed.success) return badRequest(res, parsed.error.issues[0].message);

  const { email, amount, currency, reference, callback_url, metadata } = parsed.data;
  const result = await initializePaystackPayment({
    email: email.toLowerCase(),
    amount,
    currency: (currency || 'GHS').toUpperCase(),
    reference,
    callback_url,
    metadata: metadata || {},
  });

  if (result.error) {
    return respond(res, 502, { success: false, error: result.error });
  }

  return ok(res, result);
}
