import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import signupHandler  from './api/auth/signup.js';
import signinHandler  from './api/auth/signin.js';
import registerHandler from './api/register.js';
import contactHandler  from './api/contact.js';
import eventsHandler   from './api/events.js';

const app = express();

app.use(cors());
app.use(express.json());

app.all('/api/auth/signup', signupHandler);
app.all('/api/auth/signin', signinHandler);
app.all('/api/register',    registerHandler);
app.all('/api/contact',     contactHandler);
app.all('/api/events',      eventsHandler);

app.get('/', (req, res) => res.json({ status: 'ARC API is running' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`ARC API running at http://localhost:${PORT}`));
