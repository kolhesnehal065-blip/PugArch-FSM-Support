# Quick Reference Guide

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Add required values in .env
# GEMINI_API_KEY
# ADMIN_EMAILS
# ADMIN_PASSWORD

# 4. Start development server
npm run dev

# 5. Open browser
# http://localhost:3000
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm run dev
```

## Key Files to Customize

### 1. Add or Modify Support Issues

File:

```text
src/shared/issues.ts
```

Use this file to adjust support categories, issue titles, solutions, and issue metadata used by the chatbot flow.

### 2. Change Chatbot UI or Flow

File:

```text
src/components/ChatbotView.tsx
```

Common edits:

- Welcome message
- Language labels
- Chat prompts
- Voice and image controls
- Ticket collection flow
- Feedback messages

### 3. Change Admin Dashboard

File:

```text
src/components/AdminView.tsx
```

Common edits:

- Dashboard cards
- Ticket tables
- Staff management
- Analytics display
- SMTP diagnostics

### 4. Change Ticket Detail Page

File:

```text
src/components/TicketDetailsPage.tsx
```

Common edits:

- Ticket layout
- Assignment panel
- Attachment previews
- Resolution notes
- Status display

### 5. Change Backend API Logic

File:

```text
server.ts
```

Common edits:

- API endpoints
- Gemini prompts
- SMTP email templates
- Ticket creation behavior
- Voice and image processing

### 6. Change Database Logic

File:

```text
src/server/db.ts
```

Common edits:

- Database schema
- SQLite/PostgreSQL behavior
- Seed data
- Audit log entries

### 7. Change Shared Types

File:

```text
src/shared/types.ts
```

Use this file to update shared TypeScript models for users, tickets, staff, conversations, and audit logs.

## Environment Variables

```env
# Required
GEMINI_API_KEY=your_actual_gemini_api_key
ADMIN_EMAILS=admin@example.com
ADMIN_PASSWORD=your_secure_admin_password

# Recommended
APP_URL=http://localhost:3000

# Optional SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
SUPPORT_ALERT_EMAIL=support@example.com

# Optional Database
# Local development can omit DATABASE_URL or use:
DATABASE_URL=file:./dev.db

# Production should use remote PostgreSQL:
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

## Dependency Management

```bash
# Install packages
npm install

# Update packages
npm update

# Add new package
npm install package-name

# Remove package
npm uninstall package-name

# Check vulnerabilities
npm audit
npm audit fix
```

## Testing Commands

```bash
# TypeScript check
npm run lint

# Build frontend
npm run build

# Build backend server
npm run build:server

# Build everything
npm run build:all

# Run production server
npm start
```

## Common Issues and Fixes

| Issue | Fix |
| --- | --- |
| `GEMINI_API_KEY` not configured | Add key to `.env` and restart server |
| Admin login fails | Check `ADMIN_EMAILS` and `ADMIN_PASSWORD` |
| Email not sending | Check SMTP variables and use Gmail App Password if using Gmail |
| Voice not working | Use Chrome/Edge and allow microphone permissions |
| Image analysis fails | Check Gemini key, image size, and server logs |
| Build fails | Run `npm install`, then `npm run lint` and `npm run build` |
| Vercel database error | Use remote PostgreSQL, not localhost or SQLite |
| Port 3000 in use | Stop the existing process or set a different `PORT` |

## API Quick Reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health and database status |
| `POST` | `/api/admin/login` | Admin authentication |
| `POST` | `/api/chat/message` | AI-assisted chat response |
| `POST` | `/api/issues/:subCode` | Issue detail lookup |
| `POST` | `/api/ocr` | Screenshot/image analysis |
| `POST` | `/api/voice/transcribe` | Voice transcription |
| `GET` | `/api/tickets` | List tickets |
| `POST` | `/api/tickets` | Create ticket |
| `PUT` | `/api/tickets/:id` | Update ticket |
| `GET` | `/api/users` | List users |
| `GET` | `/api/staff` | List staff |
| `POST` | `/api/staff` | Create staff |
| `PUT` | `/api/staff/:id` | Update staff |
| `DELETE` | `/api/staff/:id` | Delete staff |
| `GET` | `/api/audit-logs` | List audit logs |
| `GET` | `/api/analytics` | Dashboard analytics |
| `POST` | `/api/email/test` | SMTP test email |

## Architecture Quick Reference

```text
User Input
  ->
ChatbotView.tsx
  ->
Text message / Category selection / Voice input / Image upload
  ->
Express API in server.ts
  ->
Gemini AI / Database / SMTP
  ->
Response or Ticket
  ->
Chatbot UI and Admin Dashboard
```

## Component Tree

```text
App
├── ChatbotView
│   ├── Header controls
│   ├── Language selector
│   ├── Chat messages
│   ├── Category and issue buttons
│   ├── Voice recording control
│   ├── Image attachment control
│   └── Ticket creation flow
│
├── LoginModal
│
└── AdminView
    ├── Dashboard
    ├── Tickets
    ├── TicketDetailsPage
    ├── Users
    ├── Staff
    ├── Analytics
    ├── Audit logs
    └── SMTP diagnostics
```

## Database Quick Reference

| Environment | Database |
| --- | --- |
| Local development | SQLite through `node:sqlite` |
| Production / Vercel | Remote PostgreSQL through `pg` |

Local:

```env
DATABASE_URL=file:./dev.db
```

Production:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

## Deployment Checklist

- [ ] Run `npm run lint`
- [ ] Run `npm run build:all`
- [ ] Push latest code to GitHub
- [ ] Add `GEMINI_API_KEY` to hosting provider
- [ ] Add `ADMIN_EMAILS`
- [ ] Add `ADMIN_PASSWORD`
- [ ] Add `APP_URL`
- [ ] Add remote PostgreSQL `DATABASE_URL`
- [ ] Add SMTP variables if email alerts are needed
- [ ] Deploy
- [ ] Test `/api/health`
- [ ] Test chatbot flow
- [ ] Test admin login
- [ ] Test ticket creation
- [ ] Test SMTP diagnostics if configured

## Vercel Deployment

```bash
# Optional: install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Recommended production variables:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
ADMIN_EMAILS=admin@example.com
ADMIN_PASSWORD=your_secure_admin_password
APP_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

## Local Device Testing

Windows:

```powershell
ipconfig
```

Find your IPv4 address and open this URL on another device connected to the same network:

```text
http://YOUR_IP:3000
```

## Security Checklist

- [ ] Never commit `.env`
- [ ] Keep Gemini API key server-side only
- [ ] Keep SMTP credentials server-side only
- [ ] Use a strong admin password
- [ ] Use remote PostgreSQL in production
- [ ] Do not use localhost database URLs on Vercel
- [ ] Check logs before sharing screenshots publicly
- [ ] Rotate credentials if accidentally exposed

## Code Style

- Use `PascalCase` for React components.
- Use `camelCase` for variables and functions.
- Keep TypeScript types in shared files when reused.
- Keep UI changes responsive on mobile and desktop.
- Add comments only for complex logic.
- Run `npm run lint` before committing.

## Performance Tips

- Keep image uploads reasonably small.
- Use production build before deployment.
- Watch Vite large chunk warnings during build.
- Avoid unnecessary frontend state duplication.
- Keep AI prompts focused and concise.
- Use PostgreSQL in production for durable persistence.

## Useful Links

- [React Docs](https://react.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Vite Docs](https://vite.dev/)
- [Express Docs](https://expressjs.com/)
- [Google AI Studio](https://aistudio.google.com/)
- [Vercel Docs](https://vercel.com/docs)
- [Nodemailer Docs](https://nodemailer.com/)

## Need Help?

- Read `README.md` for complete project documentation.
- Read `SETUP.md` for detailed setup and test steps.
- Read `DELIVERABLES.md` for delivered feature summary.
- Check browser console errors.
- Check server terminal logs.
- Test `/api/health`.

Happy coding!
