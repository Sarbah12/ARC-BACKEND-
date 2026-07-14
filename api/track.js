import { ok, allowMethods } from '../lib/helpers.js';
import { insertFlexible } from '../lib/supabase.js';
import { getRequestIp, lookupGeo } from '../lib/antispam.js';

const recentVisits = new Map(); // ip -> last logged ms
const VISIT_DEDUPE_MS = 10 * 60 * 1000;

function shouldLog(ip) {
  const now = Date.now();
  const last = recentVisits.get(ip);
  if (last && now - last < VISIT_DEDUPE_MS) return false;
  recentVisits.set(ip, now);
  if (recentVisits.size > 5000) {
    for (const [k, t] of recentVisits) if (now - t > VISIT_DEDUPE_MS) recentVisits.delete(k);
  }
  return true;
}

function clean(v = '', max = 300) {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// POST /api/track — silent visitor logging fired by a page-load beacon.
// Records request IP + coarse geo. Fire-and-forget: never errors the client,
// and no-ops if the visits table isn't present yet.
export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const ip = getRequestIp(req);
  if (shouldLog(ip)) {
    const geo = await lookupGeo(ip);
    try {
      await insertFlexible('visits', {
        ip: ip || '',
        geo_country: geo.country,
        geo_city: geo.city,
        geo_isp: geo.isp,
        path: clean(req.body?.path, 300),
        referrer: clean(req.body?.referrer, 300),
        user_agent: clean(req.headers['user-agent'], 400),
      }, 'id');
    } catch { /* table not migrated yet — ignore */ }
  }
  return ok(res, {});
}
