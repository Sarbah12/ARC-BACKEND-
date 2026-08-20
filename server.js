import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import signupHandler          from './api/auth/signup.js';
import signinHandler          from './api/auth/signin.js';
import googleHandler          from './api/auth/google.js';
import forgotPasswordHandler  from './api/auth/forgot-password.js';
import resetPasswordHandler   from './api/auth/reset-password.js';
import registerHandler      from './api/register.js';
import registrationsHandler from './api/registrations.js';
import verifyHandler        from './api/verify.js';
import trackHandler         from './api/track.js';
import contactHandler       from './api/contact.js';
import enquiriesHandler     from './api/enquiries.js';
import eventsHandler        from './api/events.js';
import meHandler            from './api/me.js';
import meAvatarHandler      from './api/me/avatar.js';
import meProgressHandler    from './api/me/progress.js';
import blogsHandler         from './api/blogs.js';
import contentHandler       from './api/content.js';
import projectsHandler      from './api/projects.js';
import developersHandler    from './api/developers.js';
import developersMeHandler  from './api/developers/me.js';
import coursesHandler       from './api/courses.js';
import paymentsInitializeHandler from './api/payments-initialize.js';

import adminStatsHandler    from './api/admin/stats.js';
import adminUsersHandler    from './api/admin/users.js';
import adminRegsHandler     from './api/admin/registrations.js';
import adminEnqHandler      from './api/admin/enquiries.js';
import adminBlogsHandler    from './api/admin/blogs.js';
import adminContentHandler  from './api/admin/content.js';
import adminUploadHandler   from './api/admin/upload.js';
import adminProjectsHandler from './api/admin/projects.js';
import adminEventsHandler   from './api/admin/events.js';
import adminCoursesHandler  from './api/admin/courses.js';
import adminDevelopersHandler from './api/admin/developers.js';
import adminUserDetailHandler from './api/admin/user-detail.js';
import adminActivitiesHandler from './api/admin/activities.js';
import adminEventRsvpsHandler from './api/admin/event-rsvps.js';

import staffRegsHandler     from './api/staff/registrations.js';
import staffEnqHandler      from './api/staff/enquiries.js';

const app = express();

// Render (and most hosts) sit behind a reverse proxy that sets X-Forwarded-For.
// Trusting it lets express-rate-limit read the real client IP instead of throwing
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR (which was causing 500s on write requests).
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // API-only; no HTML served from Express
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
// Always allow the live ARC frontend, plus any extra origins from ALLOWED_ORIGINS.
// (Defaulting these means the site keeps working even if the env var is unset.)
const ALLOWED_ORIGINS = [
  'https://www.arcaccra.org',
  'https://arcaccra.org',
  ...(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
];

// Always allow localhost in dev
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3456', 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://127.0.0.1:5501');
}

app.use(cors({
  origin(origin, cb) {
    // Allow server-to-server (no origin) and permitted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));

// ── Rate limiters ─────────────────────────────────────────────────────────────

// Auth endpoints: max 10 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Please try again in 15 minutes.' },
  skip: (req) => req.method === 'OPTIONS',
});

// Admin endpoints: max 60 requests per minute per IP
// The admin dashboard fans out many requests per screen (stats, charts,
// global search, auto-refresh), so 60/min was easy to hit and surfaced as
// "Too many requests" mid-task. These routes are already token-protected.
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests.' },
  skip: (req) => req.method === 'OPTIONS',
});

// Public API: max 120 requests per minute per IP
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please slow down.' },
  skip: (req) => req.method === 'OPTIONS',
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Auth (tight rate limit)
app.all('/api/auth/signup', authLimiter, signupHandler);
app.all('/api/auth/signin', authLimiter, signinHandler);
app.all('/api/auth/google', authLimiter, googleHandler);
app.all('/api/auth/forgot-password', authLimiter, forgotPasswordHandler);
app.all('/api/auth/reset-password',  authLimiter, resetPasswordHandler);

// Public (moderate rate limit)
app.all('/api/verify/request', publicLimiter, verifyHandler);
app.all('/api/track',          publicLimiter, trackHandler);
app.all('/api/register',       publicLimiter, registerHandler);
app.all('/api/registrations',  publicLimiter, registrationsHandler);
app.all('/api/contact',        publicLimiter, contactHandler);
app.all('/api/enquiries',      publicLimiter, enquiriesHandler);
app.all('/api/events',    publicLimiter, eventsHandler);
app.all('/api/blogs',     publicLimiter, blogsHandler);
app.all('/api/content',   publicLimiter, contentHandler);
app.all('/api/projects',  publicLimiter, projectsHandler);
app.all('/api/developers/me', publicLimiter, developersMeHandler);
app.all('/api/developers',    publicLimiter, developersHandler);
app.all('/api/courses',   publicLimiter, coursesHandler);
app.all('/api/payments/initialize', publicLimiter, paymentsInitializeHandler);
app.all('/api/me',        publicLimiter, meHandler);
app.all('/api/me/avatar', publicLimiter, meAvatarHandler);
app.all('/api/me/progress', publicLimiter, meProgressHandler);

// Admin (admin rate limit — auth enforced inside each handler via requireAdmin)
app.all('/api/admin/stats',         adminLimiter, adminStatsHandler);
app.all('/api/admin/users',         adminLimiter, adminUsersHandler);
app.all('/api/admin/users/:id',     adminLimiter, adminUserDetailHandler);
app.all('/api/admin/registrations', adminLimiter, adminRegsHandler);
app.all('/api/admin/enquiries',     adminLimiter, adminEnqHandler);
app.all('/api/admin/blogs',         adminLimiter, adminBlogsHandler);
app.all('/api/admin/projects',      adminLimiter, adminProjectsHandler);
app.all('/api/admin/events',        adminLimiter, adminEventsHandler);
app.all('/api/admin/courses',     adminLimiter, adminCoursesHandler);
app.all('/api/admin/developers',  adminLimiter, adminDevelopersHandler);
app.all('/api/admin/activities',  adminLimiter, adminActivitiesHandler);
app.all('/api/admin/event-rsvps', adminLimiter, adminEventRsvpsHandler);
app.all('/api/admin/content',       adminLimiter, adminContentHandler);
app.all('/api/admin/upload',        adminLimiter, adminUploadHandler);

// Staff (read-only) — auth enforced inside each handler via requireStaffOrAdmin
app.all('/api/staff/registrations', adminLimiter, staffRegsHandler);
app.all('/api/staff/enquiries',     adminLimiter, staffEnqHandler);

// Health check
app.get('/', (_req, res) => res.json({ status: 'ARC API is running' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Admin dashboard (static) — served from this same service at /admin
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, error: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Export the app for environments that import it (e.g. a serverless wrapper).
export default app;

// Start a real HTTP server for normal Node hosts (Render, Railway, local).
// Render injects PORT and requires binding to 0.0.0.0. We skip listening only
// on Vercel's serverless runtime, which invokes the exported app directly.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, '0.0.0.0', () => console.log(`ARC API running on port ${PORT}`));
}
