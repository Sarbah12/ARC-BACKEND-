// ============================================================
// antispam.js — shared spam defenses for public write endpoints
//   • honeypot + minimum-fill-time check
//   • gibberish-name detector
//   • stateless HMAC email-verification codes
//   • request IP + coarse IP-based geolocation
// ============================================================
import { createHmac, timingSafeEqual } from 'crypto';

const MIN_FORM_FILL_MS = 3000;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const VERIFICATION_ENABLED = !!process.env.RESEND_API_KEY;

function hmacSecret() {
  // Reuse the app's JWT secret; fall back so dev without a secret still works.
  return process.env.JWT_SECRET || 'arc-local-dev-secret';
}

function cleanText(value = '', max = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// ── Honeypot + timing ─────────────────────────────────────────
// Bots fill the hidden "website" field and submit within a second or two of
// page load; humans do neither. form_ts is the page-load epoch (ms) the
// frontend sends.
export function isSpamSubmission(body = {}) {
  if (cleanText(body.website || '', 200)) return true;
  const ts = Number(body.form_ts || 0);
  if (ts > 0) {
    const elapsed = Date.now() - ts;
    if (elapsed >= 0 && elapsed < MIN_FORM_FILL_MS) return true;
  }
  return false;
}

// ── Gibberish name detector ───────────────────────────────────
// Flags random-keyboard strings like "nWOexOuUswcQvmgrogJDG": many mid-word
// case flips, almost no vowels, or long consonant runs. Tuned so real names
// (McDonald, Krzysztof, OKONKWO, Owusu-Ansah) pass.
export function looksLikeGibberish(name = '') {
  const word = String(name).replace(/[^a-zA-Z]/g, '');
  if (word.length < 8) return false;
  let caseFlips = 0;
  for (let i = 1; i < word.length; i++) {
    if ((word[i] === word[i].toUpperCase()) !== (word[i - 1] === word[i - 1].toUpperCase())) caseFlips++;
  }
  if (caseFlips >= 4) return true;
  const lower = word.toLowerCase();
  const vowels = (lower.match(/[aeiouy]/g) || []).length;
  if (vowels / word.length < 0.2) return true;
  let run = 0;
  for (const ch of lower) {
    run = /[aeiouy]/.test(ch) ? 0 : run + 1;
    if (run >= 6) return true;
  }
  return false;
}

// ── Email verification (stateless HMAC OTP) ───────────────────
// The code is emailed and never stored. We sign (email, purpose, expiry, code)
// with the app secret and hand the browser {expiry, sig}. The final submit
// sends {code, expiry, sig}; we recompute the signature and accept only if it
// matches and hasn't expired. The code only reaches the real inbox owner, so a
// bot using a victim's address can never complete verification.
function verificationSig(email, purpose, expiry, code) {
  return createHmac('sha256', hmacSecret())
    .update(`verify:${email}:${purpose}:${expiry}:${code}`)
    .digest('base64url');
}

export function issueVerification(email, purpose, code) {
  const expiry = Date.now() + CODE_TTL_MS;
  return { expiry, sig: verificationSig(email, purpose, expiry, code) };
}

export function checkVerification(email, purpose, body = {}) {
  const code = cleanText(body.verification_code || '', 6);
  const expiry = Number(body.verification_expiry || 0);
  const sig = String(body.verification_sig || '');
  if (!/^\d{6}$/.test(code) || !expiry || !sig) return false;
  if (Date.now() > expiry) return false;
  const expected = verificationSig(email, purpose, expiry, code);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Request IP + coarse geolocation ───────────────────────────
export function getRequestIp(req) {
  // Express is configured with trust proxy, so req.ip is the real client IP.
  const raw = req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0] || '';
  return String(raw).replace(/^::ffff:/, '').trim();
}

function isPrivateIp(ip = '') {
  return !ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('10.') ||
    ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

const geoCache = new Map(); // ip -> { country, city, isp }

// Free, no-key IP geolocation (ip-api.com, ~45 req/min). Best-effort: any
// failure yields empty geo fields.
export async function lookupGeo(ip) {
  const empty = { country: '', city: '', isp: '' };
  if (isPrivateIp(ip)) return empty;
  if (geoCache.has(ip)) return geoCache.get(ip);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,isp`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    const geo = data.status === 'success'
      ? { country: cleanText(data.country, 80), city: cleanText(data.city, 80), isp: cleanText(data.isp, 120) }
      : empty;
    geoCache.set(ip, geo);
    return geo;
  } catch {
    geoCache.set(ip, empty);
    return empty;
  }
}
