# PugArch FSM Support

WhatsApp-style support chatbot with Gemini AI, screenshot OCR, voice transcription, multilingual replies, and an admin dashboard for ticket management.

## Features

- AI-powered chatbot with issue classification
- Screenshot OCR and voice message transcription
- Support ticket creation and email notifications
- Admin dashboard with analytics, staff management, and audit logs

## Prerequisites

- Node.js 20 or later
- A [Google Gemini API key](https://aistudio.google.com/apikey)

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your values:

   ```bash
   cp .env.example .env
   ```

   Required variables:

   | Variable | Description |
   |----------|-------------|
   | `GEMINI_API_KEY` | Google Gemini API key |
   | `ADMIN_EMAILS` | Comma-separated admin login emails |
   | `ADMIN_PASSWORD` | Admin dashboard password |

   Optional variables for email notifications: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SUPPORT_ALERT_EMAIL`, `APP_URL`.

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Production (self-hosted)

```bash
npm run build:all
npm start
```

This builds the React frontend and bundles the Express server into `dist/server.cjs`.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Vercel reads `vercel.json` automatically — no extra build settings needed.
4. Add these environment variables in the Vercel project settings:

   | Variable | Required | Notes |
   |----------|----------|-------|
   | `GEMINI_API_KEY` | Yes | Gemini API key |
   | `ADMIN_EMAILS` | Yes | e.g. `admin@example.com` |
   | `ADMIN_PASSWORD` | Yes | Strong password for admin login |
   | `APP_URL` | Yes | Your Vercel URL, e.g. `https://your-app.vercel.app` |
   | `DATABASE_URL` | Yes | Persistent Postgres database URL. Required for ticket history/status updates on Vercel |
   | `SMTP_*` / `SUPPORT_ALERT_EMAIL` | No | Enable email alerts. For Gmail, use a Google App Password, not your normal account password |

5. Deploy.

### Vercel notes

- The frontend is served as static files from `dist/`.
- API routes are handled by the Express server as a serverless function.
- SQLite uses `/tmp` on Vercel only as a fallback and is **ephemeral** (resets on cold starts). For production ticket history, set `DATABASE_URL` to a Postgres URL such as Vercel Postgres, Neon, Supabase, or Railway.
- SMTP variables must be named `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`. The server also accepts the common typo `SMPT_*` as a temporary alias and logs a warning.

## Deploy to GitHub

This repo is ready to push. Do **not** commit `.env` — it is listed in `.gitignore`.

```bash
git init
git add .
git commit -m "Initial commit: PugArch FSM Support"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pugarch-fsm-support.git
git push -u origin main
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build frontend for Vercel / static hosting |
| `npm run build:all` | Build frontend + bundle server for self-hosting |
| `npm start` | Run production server locally |
| `npm run lint` | TypeScript type check |

## Security

- Never commit `.env` or API keys.
- Set strong `ADMIN_PASSWORD` values in production.
- Configure SMTP credentials only in environment variables, never in source code.
