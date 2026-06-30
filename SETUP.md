# Complete Setup Guide - PugArch FSM Support Assistant

This guide provides step-by-step instructions to set up, configure, run, test, and troubleshoot the **PugArch FSM Support Assistant**.

## Phase 1: Initial Setup

Estimated time: **5-10 minutes**

### Step 1.1: Install Node.js

Install Node.js if it is not already available.

Recommended version:

```text
Node.js 24.x
```

Verify installation:

```bash
node --version
npm --version
```

### Step 1.2: Open the Project Directory

```bash
cd PugArch-FSM-Support
```

If you are already inside the repository folder, continue to the next step.

### Step 1.3: Install Dependencies

```bash
npm install
```

This installs the main project dependencies:

- React 19
- TypeScript
- Vite
- Express
- Google Gemini SDK
- Nodemailer
- PostgreSQL driver
- Recharts
- Lucide React
- Tailwind CSS tooling

### Step 1.4: Verify Installation

Run TypeScript checks:

```bash
npm run lint
```

Run the frontend build:

```bash
npm run build
```

Run the server build:

```bash
npm run build:server
```

If all commands succeed, continue to the configuration phase.

## Phase 2: Environment Configuration

Estimated time: **5 minutes**

### Step 2.1: Create Environment File

Copy the example file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### Step 2.2: Add Required Variables

Open `.env` and set the required values:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
ADMIN_EMAILS=admin@example.com
ADMIN_PASSWORD=your_secure_admin_password
APP_URL=http://localhost:3000
```

### Step 2.3: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Click **Get API Key**.
3. Create a new API key.
4. Copy the key.
5. Paste it into `.env` as `GEMINI_API_KEY`.

Important:

- Never share the API key publicly.
- Never commit `.env` to GitHub.
- Restart the dev server after changing environment variables.

### Step 2.4: Configure Admin Login

Set the admin login values:

```env
ADMIN_EMAILS=admin@example.com
ADMIN_PASSWORD=your_secure_admin_password
```

Multiple admin emails can be added with commas:

```env
ADMIN_EMAILS=admin@example.com,manager@example.com
```

### Step 2.5: Optional SMTP Configuration

SMTP is required only if you want email notifications.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
SUPPORT_ALERT_EMAIL=support@example.com
```

For Gmail:

1. Enable 2-step verification.
2. Generate a Google App Password.
3. Use the app password as `SMTP_PASS`.

### Step 2.6: Optional Database Configuration

For local development, you can omit `DATABASE_URL`. The app can use local SQLite.

Optional local SQLite value:

```env
DATABASE_URL=file:./dev.db
```

For production or Vercel, use a remote PostgreSQL database:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

Do not use `localhost` or `127.0.0.1` for production database URLs.

## Phase 3: Running the Project

Estimated time: **2 minutes**

### Step 3.1: Start Development Server

```bash
npm run dev
```

The application should be available at:

```text
http://localhost:3000
```

### Step 3.2: Open the App

Open your browser and visit:

```text
http://localhost:3000
```

You should see the chatbot interface.

### Step 3.3: Open Admin Portal

Use the admin portal button in the app or open:

```text
http://localhost:3000/admin
```

Log in using:

- Email from `ADMIN_EMAILS`
- Password from `ADMIN_PASSWORD`

## Phase 4: Testing the Chatbot

Estimated time: **15-20 minutes**

### Test Suite 1: Basic Chat Flow

#### Test 1.1: Welcome Screen

Goal: Verify that the chatbot loads correctly.

Steps:

1. Open `http://localhost:3000`.
2. Confirm the welcome message is visible.
3. Confirm support category buttons are displayed.
4. Confirm the input field is available.
5. Confirm language and admin controls are visible.

Expected result:

- Chatbot loads without errors.
- Buttons and input controls are responsive.
- No console errors appear in the browser.

#### Test 1.2: Category Selection

Goal: Verify category-based support navigation.

Steps:

1. Select any support category.
2. Confirm the chatbot responds with related issue options.
3. Select an issue option.
4. Confirm the support response appears.

Expected result:

- Category and issue selection works.
- The bot displays a useful response.
- Feedback controls appear after a response.

#### Test 1.3: Helpful Feedback

Goal: Verify the positive feedback flow.

Steps:

1. Go through a support response.
2. Click **Yes** when asked if it was helpful.
3. Confirm the chatbot acknowledges the successful resolution.

Expected result:

- The flow ends cleanly.
- The user can continue or start a new chat.

### Test Suite 2: Free Text Issue Matching

#### Test 2.1: Simple Message

Goal: Verify that natural-language input is processed.

Steps:

1. Type a short support problem in the input box.
2. Send the message.
3. Wait for the AI response.

Expected result:

- The server calls the chat API.
- The bot responds with guidance or an escalation option.
- The app does not freeze during AI processing.

#### Test 2.2: Complex Message

Goal: Verify handling of longer user descriptions.

Steps:

1. Type a detailed issue description.
2. Include context such as device behavior, page name, or error text.
3. Send the message.

Expected result:

- The AI attempts to understand the message.
- A support response or escalation path is shown.

#### Test 2.3: Unmatched Message

Goal: Verify graceful fallback.

Steps:

1. Send a message unrelated to app support.
2. Wait for the chatbot response.

Expected result:

- The app does not crash.
- The bot explains that it could not find an exact solution.
- Ticket creation or support escalation is available.

### Test Suite 3: Ticket Escalation

#### Test 3.1: Unhelpful Feedback

Goal: Verify escalation starts when the user needs human support.

Steps:

1. Get any support response.
2. Click **No** when asked if the response helped.
3. Confirm that the ticket collection flow starts.

Expected result:

- The chatbot asks for user and issue details.
- Required fields are collected step by step.

#### Test 3.2: Form Validation

Goal: Verify required user details are validated.

Steps:

1. Start the ticket creation flow.
2. Try submitting incomplete or very short values.
3. Correct the values.
4. Continue through the form.

Expected result:

- Invalid values are rejected.
- Clear validation messages are displayed.
- Valid values allow the flow to continue.

#### Test 3.3: Ticket Creation

Goal: Verify ticket submission works.

Steps:

1. Complete the full ticket creation flow.
2. Submit the ticket.
3. Confirm the success message.
4. Open the admin dashboard.
5. Confirm the ticket appears.

Expected result:

- Ticket is created successfully.
- Ticket contains conversation and user details.
- Ticket is visible in the admin dashboard.

## Phase 5: Multilingual Testing

Estimated time: **10 minutes**

### Test 5.1: Language Selector

Goal: Verify the language menu works.

Steps:

1. Open the chatbot.
2. Click the language selector.
3. Select a supported language.

Supported languages:

| Code | Language |
| --- | --- |
| `en` | English |
| `hi` | Hindi |
| `mr` | Marathi |
| `or` | Odia |

Expected result:

- The selected language is applied to the chatbot UI.
- Messages and prompts update where localized strings exist.

### Test 5.2: Hindi Flow

Goal: Verify non-English support flow.

Steps:

1. Select Hindi.
2. Go through category selection.
3. Send a text issue.
4. Create a support ticket if needed.

Expected result:

- Chatbot prompts appear in Hindi where supported.
- Ticket stores the selected language.
- The flow remains usable end to end.

### Test 5.3: Language Switching

Goal: Verify switching language during a session.

Steps:

1. Start in English.
2. Switch to another supported language.
3. Continue the chat.

Expected result:

- New prompts follow the selected language.
- Existing conversation remains visible.
- The app does not reset unexpectedly unless the user starts a new chat.

## Phase 6: Voice and Image Testing

Estimated time: **10-15 minutes**

### Test 6.1: Voice Input

Goal: Verify audio recording and transcription.

Steps:

1. Allow microphone permission in the browser.
2. Click the microphone button.
3. Speak a support issue clearly.
4. Stop recording.
5. Wait for transcription.

Expected result:

- Audio is recorded.
- The transcription endpoint returns text.
- The transcribed message can be sent through the chatbot.

Browser notes:

- Chrome and Edge usually provide the best support.
- Safari support may vary.
- Firefox may have limited media recording behavior depending on version and settings.

### Test 6.2: Image Upload

Goal: Verify screenshot upload and analysis.

Steps:

1. Click the image attachment button.
2. Upload a screenshot or image.
3. Confirm the preview appears.
4. Send the image.
5. Wait for Vision AI analysis.

Expected result:

- Image preview is shown before sending.
- The image message appears in chat.
- The OCR/Vision endpoint responds.
- The app provides next steps or escalation.

### Test 6.3: Admin Attachment Preview

Goal: Verify uploaded images are available to admins.

Steps:

1. Create a ticket with an image attachment.
2. Log in to the admin dashboard.
3. Open the ticket details page.
4. Click the attachment preview.

Expected result:

- Image preview opens correctly.
- Admin can inspect or download the attachment.

## Phase 7: Admin Dashboard Testing

Estimated time: **15 minutes**

### Test 7.1: Admin Login

Goal: Verify admin authentication.

Steps:

1. Open `/admin`.
2. Enter an email from `ADMIN_EMAILS`.
3. Enter `ADMIN_PASSWORD`.
4. Submit the form.

Expected result:

- Valid credentials open the dashboard.
- Invalid credentials show an error.

### Test 7.2: Ticket Management

Goal: Verify ticket operations.

Steps:

1. Open the tickets view.
2. Select a ticket.
3. Review user details and conversation.
4. Assign a staff member.
5. Update ticket status or resolution notes.

Expected result:

- Ticket details display correctly.
- Assignment changes are saved.
- Status updates are reflected in the UI.

### Test 7.3: Staff Management

Goal: Verify support staff operations.

Steps:

1. Open the staff section.
2. Add a staff member.
3. Update staff details.
4. Change active/inactive status.
5. Delete a test staff member if needed.

Expected result:

- Staff CRUD operations work.
- Changes appear immediately after refresh.

### Test 7.4: Analytics and Audit Logs

Goal: Verify dashboard reporting.

Steps:

1. Open analytics.
2. Review ticket counts and dashboard cards.
3. Open audit logs.
4. Confirm recent actions are listed.

Expected result:

- Analytics load correctly.
- Audit logs reflect key admin/database actions.

## Phase 8: Email Notification Testing

Estimated time: **10 minutes**

### Test 8.1: SMTP Diagnostic

Goal: Verify SMTP configuration.

Steps:

1. Configure SMTP values in `.env`.
2. Restart the dev server.
3. Log in to the admin dashboard.
4. Run the SMTP test email action.

Expected result:

- Test email is sent successfully.
- Any SMTP error is shown with useful details.

### Test 8.2: Ticket Alert Email

Goal: Verify new-ticket email notification.

Steps:

1. Set `SUPPORT_ALERT_EMAIL`.
2. Create a support ticket from the chatbot.
3. Check the recipient inbox.

Expected result:

- Admin/support recipient receives a ticket alert.
- The alert includes ticket context and app link.

## Phase 9: Database Testing

Estimated time: **10 minutes**

### Test 9.1: Local SQLite

Goal: Verify local persistence.

Steps:

1. Leave `DATABASE_URL` empty or set it to `file:./dev.db`.
2. Start the app with `npm run dev`.
3. Create a ticket.
4. Restart the server.
5. Confirm ticket data is still available.

Expected result:

- SQLite database initializes locally.
- Tickets persist between restarts.

### Test 9.2: PostgreSQL

Goal: Verify production database configuration.

Steps:

1. Create a remote PostgreSQL database.
2. Set `DATABASE_URL`.
3. Use `?sslmode=require` if your provider requires SSL.
4. Restart the app.
5. Open `/api/health`.

Expected result:

- Health endpoint reports a working database.
- No localhost database warning appears in production.

## Phase 10: Responsive Design Testing

Estimated time: **10 minutes**

### Test 10.1: Mobile View

Goal: Verify mobile-first layout.

Steps:

1. Open browser DevTools.
2. Select a small mobile viewport.
3. Test chatbot controls, input, category buttons, and ticket form.

Expected result:

- No horizontal scrolling.
- Text remains readable.
- Buttons are easy to tap.
- Input stays accessible.

### Test 10.2: Tablet View

Goal: Verify medium viewport layout.

Steps:

1. Select a tablet viewport.
2. Test chatbot and admin dashboard.

Expected result:

- Layout remains balanced.
- Cards and tables stay readable.
- Navigation is usable.

### Test 10.3: Desktop View

Goal: Verify full dashboard layout.

Steps:

1. Open a desktop viewport.
2. Test admin navigation, tables, charts, ticket details, and image previews.

Expected result:

- Dashboard uses space efficiently.
- Text does not overlap.
- Ticket details and modals display properly.

## Phase 11: Production Build and Deployment

Estimated time: **10-20 minutes**

### Step 11.1: Run Production Build

```bash
npm run build:all
```

Expected result:

- Frontend builds into `dist/`.
- Server bundles into `dist/server.cjs`.

### Step 11.2: Run Production Server Locally

```bash
npm start
```

Open:

```text
http://localhost:3000
```

### Step 11.3: Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Add environment variables in Vercel Project Settings.
4. Set `DATABASE_URL` to a remote PostgreSQL URL.
5. Deploy.

Required Vercel variables:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
ADMIN_EMAILS=admin@example.com
ADMIN_PASSWORD=your_secure_admin_password
APP_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

Optional Vercel variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
SUPPORT_ALERT_EMAIL=support@example.com
```

## Advanced Testing

### API Response Validation

Open DevTools -> Network tab and test:

- `/api/chat/message`
- `/api/ocr`
- `/api/voice/transcribe`
- `/api/tickets`
- `/api/admin/login`
- `/api/analytics`
- `/api/email/test`

Verify:

- Status codes are correct.
- JSON responses are valid.
- Errors are user-friendly.
- No secrets appear in browser responses.

### Performance Monitoring

Open DevTools -> Performance tab and test:

- Initial page load
- Chat response
- Image upload
- Admin dashboard load
- Ticket detail navigation

Target behavior:

| Metric | Target |
| --- | --- |
| Initial page load | Under 3 seconds on normal broadband |
| Chat UI interaction | Immediate |
| AI response | Usually 2-5 seconds depending on Gemini |
| Image analysis | Usually 3-8 seconds depending on file size |
| Admin dashboard load | Under 3 seconds with normal ticket volume |

## Troubleshooting Common Issues

### Issue: `GEMINI_API_KEY` Not Configured

Solution:

1. Confirm `.env` exists.
2. Confirm `GEMINI_API_KEY` has a real value.
3. Restart the dev server.
4. Check server logs.

### Issue: Admin Login Not Working

Solution:

1. Confirm `ADMIN_EMAILS` contains the email you are using.
2. Confirm `ADMIN_PASSWORD` is set.
3. Remove extra spaces around values.
4. Restart the server after `.env` changes.

### Issue: Email Notifications Not Working

Solution:

1. Verify SMTP values.
2. Use a Gmail App Password if using Gmail.
3. Confirm `SUPPORT_ALERT_EMAIL` is set.
4. Run the SMTP diagnostic from the admin dashboard.
5. Check server logs for SMTP errors.

### Issue: Voice Input Not Working

Solution:

1. Use Chrome or Edge for best support.
2. Allow microphone permission.
3. Make sure another app is not using the microphone.
4. Check browser console for media recording errors.

### Issue: Image Analysis Not Working

Solution:

1. Verify `GEMINI_API_KEY`.
2. Upload a smaller image.
3. Confirm the image is a supported browser image format.
4. Check server logs for Gemini errors or rate limits.

### Issue: Database Error on Vercel

Solution:

1. Use a remote PostgreSQL database.
2. Do not use SQLite in Vercel production.
3. Do not use `localhost` or `127.0.0.1`.
4. Add `?sslmode=require` if required by the provider.

### Issue: Build Fails

Solution:

```bash
npm install
npm run lint
npm run build
npm run build:server
```

If dependency issues continue:

```bash
npm cache verify
npm install
```

## Setup Completion Checklist

Use this checklist before deployment:

- [ ] Node.js and npm installed
- [ ] Dependencies installed with `npm install`
- [ ] `.env` created from `.env.example`
- [ ] `GEMINI_API_KEY` configured
- [ ] `ADMIN_EMAILS` configured
- [ ] `ADMIN_PASSWORD` configured
- [ ] Local app starts with `npm run dev`
- [ ] Chatbot loads successfully
- [ ] Admin login works
- [ ] Ticket creation works
- [ ] Voice input tested
- [ ] Image upload tested
- [ ] SMTP tested if email alerts are required
- [ ] PostgreSQL configured for production
- [ ] `npm run lint` passes
- [ ] `npm run build:all` passes
- [ ] Environment variables added to hosting provider

## Next Steps

After setup:

1. Customize support content in `src/shared/issues.ts`.
2. Configure production SMTP credentials.
3. Configure a remote PostgreSQL database.
4. Deploy to Vercel or a Node hosting provider.
5. Test complete user and admin flows in production.
6. Monitor support ticket quality and update issue guidance as needed.

## Support

For help:

- Review `README.md`.
- Review `DELIVERABLES.md`.
- Check browser console errors.
- Check server logs.
- Verify all environment variables.
- Test `/api/health`.

Good luck with your setup!
