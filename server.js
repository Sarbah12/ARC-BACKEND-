import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import signupHandler        from './api/auth/signup.js';
import signinHandler        from './api/auth/signin.js';
import googleHandler        from './api/auth/google.js';
import registerHandler      from './api/register.js';
import contactHandler       from './api/contact.js';
import eventsHandler        from './api/events.js';
import meHandler            from './api/me.js';
import blogsHandler         from './api/blogs.js';
import contentHandler       from './api/content.js';
import projectsHandler      from './api/projects.js';

import adminStatsHandler    from './api/admin/stats.js';
import adminUsersHandler    from './api/admin/users.js';
import adminRegsHandler     from './api/admin/registrations.js';
import adminEnqHandler      from './api/admin/enquiries.js';
import adminBlogsHandler    from './api/admin/blogs.js';
import adminContentHandler  from './api/admin/content.js';
import adminProjectsHandler from './api/admin/projects.js';
import adminEventsHandler   from './api/admin/events.js';

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // API-only; no HTML served from Express
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Always allow localhost in dev
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3456', 'http://localhost:5500', 'http://127.0.0.1:5500');
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
app.use(express.json({ limit: '50kb' }));

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
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
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

// Public (moderate rate limit)
app.all('/api/register',  publicLimiter, registerHandler);
app.all('/api/contact',   publicLimiter, contactHandler);
app.all('/api/events',    publicLimiter, eventsHandler);
app.all('/api/blogs',     publicLimiter, blogsHandler);
app.all('/api/content',   publicLimiter, contentHandler);
app.all('/api/projects',  publicLimiter, projectsHandler);
app.all('/api/me',        publicLimiter, meHandler);

// Admin (admin rate limit — auth enforced inside each handler via requireAdmin)
app.all('/api/admin/stats',         adminLimiter, adminStatsHandler);
app.all('/api/admin/users',         adminLimiter, adminUsersHandler);
app.all('/api/admin/registrations', adminLimiter, adminRegsHandler);
app.all('/api/admin/enquiries',     adminLimiter, adminEnqHandler);
app.all('/api/admin/blogs',         adminLimiter, adminBlogsHandler);
app.all('/api/admin/projects',      adminLimiter, adminProjectsHandler);
app.all('/api/admin/events',        adminLimiter, adminEventsHandler);
app.all('/api/admin/content',       adminLimiter, adminContentHandler);

// Health check
app.get('/', (_req, res) => res.json({ status: 'ok' }));

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, error: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`ARC API running at http://localhost:${PORT}`));
