import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import signupHandler       from './api/auth/signup.js';
import signinHandler       from './api/auth/signin.js';
import googleHandler       from './api/auth/google.js';
import registerHandler     from './api/register.js';
import contactHandler      from './api/contact.js';
import eventsHandler       from './api/events.js';
import meHandler           from './api/me.js';

import adminStatsHandler   from './api/admin/stats.js';
import adminUsersHandler   from './api/admin/users.js';
import adminRegsHandler    from './api/admin/registrations.js';
import adminEnqHandler     from './api/admin/enquiries.js';
import adminBlogsHandler   from './api/admin/blogs.js';
import adminContentHandler from './api/admin/content.js';
import contentHandler      from './api/content.js';
import adminProjectsHandler from './api/admin/projects.js';
import adminEventsHandler  from './api/admin/events.js';

import blogsHandler        from './api/blogs.js';
import projectsHandler     from './api/projects.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Public
app.all('/api/auth/signup',  signupHandler);
app.all('/api/auth/signin',  signinHandler);
app.all('/api/auth/google',  googleHandler);
app.all('/api/register',     registerHandler);
app.all('/api/contact',      contactHandler);
app.all('/api/events',       eventsHandler);
app.all('/api/blogs',        blogsHandler);
app.all('/api/content',     contentHandler);
app.all('/api/projects',     projectsHandler);
app.all('/api/me',           meHandler);

// Admin
app.all('/api/admin/stats',         adminStatsHandler);
app.all('/api/admin/users',         adminUsersHandler);
app.all('/api/admin/registrations', adminRegsHandler);
app.all('/api/admin/enquiries',     adminEnqHandler);
app.all('/api/admin/blogs',         adminBlogsHandler);
app.all('/api/admin/projects',      adminProjectsHandler);
app.all('/api/admin/events',        adminEventsHandler);
app.all('/api/admin/content',      adminContentHandler);

app.get('/', (req, res) => res.json({ status: 'ARC API is running' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`ARC API running at http://localhost:${PORT}`));
