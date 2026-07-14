import { z } from 'zod';
import { ok, badRequest, serverError, allowMethods } from '../lib/helpers.js';
import { sendVerificationCode } from '../lib/email.js';
import { randomInt } from 'crypto';
import { isSpamSubmission, issueVerification, VERIFICATION_ENABLED } from '../lib/antispam.js';

const schema = z.object({
  email: z.string().email(),
  purpose: z.enum(['registration', 'enquiry']).optional(),
});

// POST /api/verify/request — email a one-time code and return a signed challenge.
// Response: { success, enabled, verification_expiry?, verification_sig? }
//   enabled:false  → verification is switched off; caller may submit directly.
export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues[0].message);

  const email = parsed.data.email.toLowerCase();
  const purpose = parsed.data.purpose === 'enquiry' ? 'enquiry' : 'registration';

  // Honeypot/timing still apply — pretend success without sending.
  if (isSpamSubmission(req.body)) return ok(res, { enabled: true });

  // No RESEND_API_KEY → verification unavailable; tell the client to submit directly.
  if (!VERIFICATION_ENABLED) return ok(res, { enabled: false });

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const sent = await sendVerificationCode({ to: email, code, purpose });
  if (!sent) return serverError(res, 'Could not send the verification email. Please try again shortly.');

  const { expiry, sig } = issueVerification(email, purpose, code);
  return ok(res, { enabled: true, verification_expiry: expiry, verification_sig: sig });
}
