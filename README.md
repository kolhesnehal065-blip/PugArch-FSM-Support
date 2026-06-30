# PugArch FSM Support Assistant

An AI-powered, mobile-first support chatbot for the **PugArch FSM** application. It helps field-service users report issues, receive AI-assisted guidance, upload screenshots, record voice messages, and escalate unresolved problems into trackable support tickets.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=fff)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=fff)
![Gemini](https://img.shields.io/badge/Gemini_AI-Enabled-4285F4?logo=google&logoColor=fff)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-4169E1?logo=postgresql&logoColor=fff)
![License](https://img.shields.io/badge/License-Proprietary-lightgrey)

## 🎯 Features

- **AI-Powered Issue Matching:** Uses Google Gemini to understand user messages and suggest relevant support responses.
- **Mobile-First Chatbot UI:** WhatsApp-style support experience optimized for mobile and desktop.
- **Smart Escalation:** Creates support tickets when users need human assistance.
- **Admin Dashboard:** Manage tickets, users, staff, audit logs, analytics, and ticket assignments.
- **Multilingual Support:** Supports English, Hindi, Marathi, and Odia in the chatbot flow.
- **Voice Support:** Records user voice messages and transcribes them with Gemini.
- **Image & Screenshot Support:** Upload screenshots for Vision AI analysis and attachment tracking.
- **Email Notifications:** Sends ticket alerts using SMTP and Nodemailer.
- **Database Integration:** Uses local SQLite in development and PostgreSQL in production.
- **Vercel Ready:** Includes deployment configuration for Vercel serverless hosting.

## 📋 Project Structure

```text
api/
  index.ts                    # Vercel serverless entry point

src/
  App.tsx                     # Main app view switcher
  main.tsx                    # React entry point
  index.css                   # Global styling

  components/
    ChatbotView.tsx           # Main chatbot interface
    AdminView.tsx             # Admin dashboard
    TicketDetailsPage.tsx     # Detailed ticket management screen
    LoginModal.tsx            # Admin login modal

  server/
    db.ts                     # Database service, schema, seed data, SQLite/Postgres support

  shared/
    issues.ts                 # Issue metadata used by support flow
    types.ts                  # Shared TypeScript models
    validation.ts             # Shared validation helpers

Configuration Files:
  package.json                # Scripts and dependencies
  tsconfig.json               # TypeScript configuration
  vite.config.ts              # Vite configuration
  vercel.json                 # Vercel deployment configuration
  .env.example                # Environment variables template
```

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 24.x recommended
- npm package manager
- Google Gemini API key from Google AI Studio
- Optional SMTP credentials for email notifications
- Optional PostgreSQL database for production deployment

### 2. Installation

```bash
git clone https://github.com/kolhesnehal065-blip/PugArch-FSM-Support.git
cd PugArch-FSM-Support
npm install
```

### 3. Environment Setup

Create a `.env` file from the example template:

```bash
cp .env.example .env
```

Add your required configuration:

```env
# Required: Gemini API Configuration
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Required: Admin Portal Login
ADMIN_EMAILS=admin@example.com
ADMIN_PASSWORD=your_secure_admin_password

# App URL used in email links
APP_URL=http://localhost:3000

# Optional: SMTP Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
SUPPORT_ALERT_EMAIL=support@example.com

# Optional: Database
# Local development can omit DATABASE_URL or use file:./dev.db
# Production should use a remote PostgreSQL URL
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

### 4. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Click **Get API Key**.
3. Create a new API key.
4. Add it to `.env` as `GEMINI_API_KEY`.

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

### 6. Build for Production

```bash
npm run build:all
npm start
```

## 📱 Testing the Chatbot

### Test 1: Category Selection Flow

1. Open the app.
2. Select a support category.
3. Choose an issue option.
4. Review the suggested solution.
5. Use feedback controls to confirm whether the solution helped.

### Test 2: Free Text Matching

1. Type a natural-language issue description.
2. Confirm that the bot understands the intent.
3. Review the AI-assisted support response.
4. Escalate if the issue is unresolved.

### Test 3: Voice Input

1. Click the microphone button.
2. Speak a support issue.
3. Confirm that the audio is transcribed.
4. Send the transcribed message through the chat flow.

### Test 4: Screenshot Analysis

1. Attach an app screenshot or image.
2. Send it in the chatbot.
3. Confirm that Vision AI analyzes the uploaded image.
4. Continue with the suggested support path or create a ticket.

### Test 5: Escalation

1. Mark a support response as not helpful.
2. Complete the guided support ticket form.
3. Submit the ticket.
4. Verify that the ticket appears in the admin dashboard.

### Test 6: Admin Dashboard

1. Open the admin portal.
2. Log in with `ADMIN_EMAILS` and `ADMIN_PASSWORD`.
3. Review ticket details, attachments, users, staff, analytics, and audit logs.
4. Assign or close tickets as needed.

## 🔑 API Endpoints

### `GET /api/health`

Returns application health and database status.

### `POST /api/admin/login`

Authenticates admin users.

Request:

```json
{
  "email": "admin@example.com",
  "password": "your_secure_admin_password"
}
```

### `POST /api/chat/message`

Classifies a user message and returns an AI-assisted support response.

Request:

```json
{
  "message": "my attendance is not syncing",
  "language": "en"
}
```

### `POST /api/issues/:subCode`

Returns support issue details for a selected issue code.

Request:

```json
{
  "language": "en"
}
```

### `POST /api/ocr`

Analyzes a screenshot or image with Gemini Vision AI.

Request:

```json
{
  "imageBase64": "data:image/png;base64,...",
  "language": "en"
}
```

### `POST /api/voice/transcribe`

Transcribes a recorded voice message.

Request:

```json
{
  "audioBase64": "data:audio/webm;base64,...",
  "language": "en"
}
```

### `GET /api/tickets`

Returns all support tickets for the admin dashboard.

### `POST /api/tickets`

Creates a new support ticket.

### `PUT /api/tickets/:id`

Updates ticket status, assignment, or resolution details.

### `GET /api/users`

Returns user records collected through ticket creation.

### `GET /api/staff`

Returns support staff records.

### `POST /api/staff`

Creates a support staff member.

### `PUT /api/staff/:id`

Updates a support staff member.

### `DELETE /api/staff/:id`

Deletes a support staff member.

### `GET /api/audit-logs`

Returns audit log history.

### `GET /api/analytics`

Returns dashboard analytics.

### `POST /api/email/test`

Sends a diagnostic SMTP test email.

## 🎨 UI/UX Design

### Design Approach

- **Mobile-first layout** for field-service users.
- **Chat bubble interface** for familiar support conversations.
- **Clean admin dashboard** for quick scanning and action.
- **Light theme** with strong contrast and clear state indicators.
- **Responsive controls** for mobile and desktop workflows.

### Key UI Elements

- Chat messages for user, bot, and staff conversations
- Language selector
- Support category buttons
- Image attachment preview
- Voice recording button
- Ticket status badges
- Admin analytics cards
- Ticket detail and assignment panels

## 🌐 Supported Languages

| Code | Language |
| --- | --- |
| `en` | English |
| `hi` | Hindi |
| `mr` | Marathi |
| `or` | Odia |

## 🧠 AI Integration

Gemini is used for:

- Semantic issue matching
- Chat response generation
- Screenshot/image analysis
- Voice transcription
- Multilingual translation support
- Graceful fallback when exact matching is unavailable

Primary package:

```text
@google/genai
```

## 🗄️ Database Integration

The application supports two database modes:

| Environment | Database |
| --- | --- |
| Local Development | SQLite using `node:sqlite` |
| Production / Vercel | Remote PostgreSQL using `pg` |

For production deployment, configure a remote PostgreSQL connection string:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

## 📧 Email Notifications

SMTP email notifications are powered by Nodemailer. When configured, the app can send support alerts for newly created tickets and diagnostic test emails from the admin dashboard.

Required SMTP variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SUPPORT_ALERT_EMAIL=support@example.com
```

For Gmail, use a Google App Password instead of your normal account password.

## 🔒 Security & Privacy

- API keys and SMTP credentials are stored in environment variables.
- Admin access is controlled with configured email and password values.
- The app does not require users to provide passwords, OTPs, Aadhaar, PAN, or other highly sensitive identity documents.
- User inputs are validated before ticket creation.
- Production database URLs must point to a remote PostgreSQL host.
- `.env` files should never be committed to GitHub.

## 🚀 Deployment

### Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Add all required environment variables in Vercel project settings.
4. Set `DATABASE_URL` to a remote PostgreSQL database.
5. Deploy.

Vercel uses `vercel.json` and the `api/index.ts` entry point for serverless API routing.

### Self-Hosted Deployment

Build the application:

```bash
npm run build:all
```

Start the production server:

```bash
npm start
```

## 📝 Configuration

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the React frontend |
| `npm run build:server` | Bundle the Express server |
| `npm run build:all` | Build frontend and backend together |
| `npm start` | Run production server |
| `npm run lint` | Run TypeScript checks |

### Gemini Model Usage

The server uses Gemini model fallbacks to keep AI features resilient when a model is unavailable or rate-limited.

### Voice and Image Support

- Voice messages are captured through browser media APIs.
- Audio is sent to the server as base64 data for transcription.
- Images are sent as base64 data for Vision AI analysis.
- Attached images are preserved in ticket conversations.

## 🐛 Troubleshooting

### Gemini API Not Working

- Verify `GEMINI_API_KEY` is set correctly.
- Check whether the key is active in Google AI Studio.
- Confirm the server has restarted after editing `.env`.

### Admin Login Not Working

- Verify `ADMIN_EMAILS` contains the login email.
- Verify `ADMIN_PASSWORD` is set.
- Check that there are no extra spaces in the environment values.

### Email Notifications Not Working

- Verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`.
- Use a Gmail App Password when using Gmail.
- Run the SMTP diagnostic from the admin dashboard.

### Voice Features Not Working

- Grant microphone permission in the browser.
- Use a modern browser with media recording support.
- Check the browser console and server logs for upload errors.

### Database Errors in Production

- Use a remote PostgreSQL database.
- Do not use `localhost` or `127.0.0.1` in Vercel.
- Add `?sslmode=require` if required by your database provider.

## 📊 Performance

- Mobile-first interface for fast support access.
- Vite production build for optimized frontend assets.
- Server-side AI calls with fallback handling.
- SQLite local mode for fast development setup.
- PostgreSQL production mode for scalable deployed persistence.

## 🚀 Future Enhancements

- Role-based admin permissions
- Real-time ticket notifications
- SLA tracking and priority labels
- Exportable analytics and audit reports
- Knowledge-base management panel
- More regional language options
- Dedicated customer notification workflow

## 🤝 Contributing

Contributions are welcome. Please follow these guidelines:

- Use TypeScript consistently.
- Keep UI changes responsive and mobile-friendly.
- Validate inputs on both client and server paths.
- Run `npm run lint` before submitting changes.
- Keep pull requests focused and easy to review.

## 📄 License

This project is proprietary software for PugArch FSM unless a separate license file is added.

## 📞 Support

For issues or questions:

- Review the troubleshooting section.
- Check server logs and browser console output.
- Verify required environment variables.
- Confirm Gemini, SMTP, and database credentials are active.

## 👩‍💻 Author

**Snehal Kolhe**  
*MERN Stack Developer*

GitHub: [kolhesnehal065-blip](https://github.com/kolhesnehal065-blip)

Built with: **React 19 • TypeScript • Vite • Express • Gemini API**
