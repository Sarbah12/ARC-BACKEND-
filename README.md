# ARC Backend

Serverless API for arcaccra.org — deployed on Vercel, database on Supabase.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open the SQL editor and run the contents of `lib/schema.sql`
3. Copy your project URL and keys from **Settings → API**

### 3. Configure environment variables
```bash
cp .env.example .env
```
Fill in:
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Settings → API (secret key)
- `SUPABASE_ANON_KEY` — from Supabase Settings → API (anon/public key)
- `JWT_SECRET` — any long random string (32+ chars)
- `RESEND_API_KEY` — from [resend.com](https://resend.com) (free tier)
- `EMAIL_FROM` — admin@arcaccra.org (must be verified in Resend)

### 4. Run locally
```bash
npm run dev
```
API available at `http://localhost:3000/api/...`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/signin` | Sign in |
| POST | `/api/register` | Register for a course |
| POST | `/api/contact` | Submit contact form |
| GET  | `/api/events` | List events (`?type=upcoming` or `?type=past`) |
| POST | `/api/events` | RSVP to an event |

## Deploy to Vercel
```bash
npx vercel
```
Add all env variables in the Vercel dashboard under **Settings → Environment Variables**.
