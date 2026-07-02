import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import { dbService } from "./src/server/db.js";
import { ISSUES } from "./src/shared/issues.js";
import type { ChatMessage, Ticket, SupportStaff } from "./src/shared/types.js";
import { validateContactNumber, validateEmailAddress } from "./src/shared/validation.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

const asyncHandler =
  (handler: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

// Set up JSON body parser with increased limit for base64 images and audio
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ── Gemini AI client (Lazy-Initialized) ──────────────────────────────────────
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "MY_GEMINI_API_KEY";
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("Warning: GEMINI_API_KEY is not configured or is a placeholder. AI operations might fail.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ── Gemini Content Generation Wrapper with Retry and Fallback ──────────────────
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<any> {
  let attempt = 0;
  let delay = initialDelayMs;
  let lastError: any = null;

  const modelsToTry = [
    params.model || "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-pro",
    "gemini-3.5-flash"
  ];

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelToUse = modelsToTry[i];
    const isLastModel = i === modelsToTry.length - 1;
    attempt = 0;
    delay = initialDelayMs;

    while (attempt < maxRetries) {
      try {
        console.log(`[GenAI] Calling model ${modelToUse} (Attempt ${attempt + 1}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelToUse,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        attempt++;
        const errorMessage = error?.message || (typeof error === "string" ? error : JSON.stringify(error));
        
        const isQuotaExceeded = 
          errorMessage.includes("429") || 
          errorMessage.includes("ResourceExhausted") || 
          errorMessage.includes("quota") ||
          errorMessage.includes("Quota");

        const isTransient = 
          errorMessage.includes("503") || 
          errorMessage.includes("UNAVAILABLE") || 
          errorMessage.includes("high demand") || 
          errorMessage.includes("temporary");

        if (isLastModel && attempt === maxRetries) {
          console.error(`[GenAI] Error with ${modelToUse} on attempt ${attempt} (LAST FALLBACK EXHAUSTED):`, errorMessage);
        } else {
          console.log(`[GenAI] Handled info/warning with ${modelToUse} on attempt ${attempt} (will fallback/retry):`, errorMessage);
        }

        if (isQuotaExceeded) {
          console.log(`[GenAI] Quota/Rate limit exceeded for ${modelToUse}. Switching to next model immediately...`);
          break; // Break retry loop to try next model
        } else if (isTransient && attempt < maxRetries) {
          console.log(`[GenAI] Transient error detected. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          // If not transient or we ran out of retries, break to try the next model fallback
          break;
        }
      }
    }
  }

  // If we exhausted all fallbacks and retries, throw the last encountered error
  throw lastError;
}

// ── SMTP Mail Sender (Lazy-Initialized) ──────────────────────────────────────
let mailTransporter: nodemailer.Transporter | null = null;
let mailTransporterVerified = false;

type EmailSendResult = {
  ok: boolean;
  attemptId: string;
  to: string;
  subject: string;
  stage: "validation" | "configuration" | "connection" | "sendMail";
  messageId?: string;
  response?: string;
  accepted?: string[];
  rejected?: string[];
  envelope?: unknown;
  error?: unknown;
};

function isValidEmailAddress(email: string | undefined | null): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function getSmtpConfig() {
  const host = getEnvValue("SMTP_HOST", ["SMPT_HOST"]) || "smtp.gmail.com";
  const port = Number.parseInt(getEnvValue("SMTP_PORT", ["SMPT_PORT"]) || "587", 10);
  const user = getEnvValue("SMTP_USER", ["SMPT_USER"]);
  const pass = getEnvValue("SMTP_PASS", ["SMPT_PASS"]).replace(/\s+/g, "");

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    user,
    pass,
    secure: Number.isFinite(port) ? port === 465 : false,
  };
}

function logSmtpConfig(config: ReturnType<typeof getSmtpConfig>) {
  console.log(
    `[SMTP] host=${config.host} port=${config.port} secure=${config.secure} user=${config.user || "(missing)"} pass=${config.pass ? "(configured)" : "(missing)"}`
  );
}

function formatSmtpError(error: any) {
  return {
    name: error?.name,
    message: error?.message || String(error),
    code: error?.code,
    command: error?.command,
    response: error?.response,
    responseCode: error?.responseCode,
    rejected: error?.rejected,
    rejectedErrors: error?.rejectedErrors?.map((rejectedError: any) => ({
      recipient: rejectedError?.recipient,
      response: rejectedError?.response,
      responseCode: rejectedError?.responseCode,
      command: rejectedError?.command,
      code: rejectedError?.code,
      message: rejectedError?.message,
    })),
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function shouldVerifySmtpConnection(): boolean {
  const configured = getEnvValue("SMTP_VERIFY");
  if (configured) {
    return configured.toLowerCase() === "true";
  }

  return !process.env.VERCEL;
}

async function getMailTransporter(attemptId = "SMTP"): Promise<nodemailer.Transporter> {
  if (!mailTransporter) {
    const config = getSmtpConfig();
    logSmtpConfig(config);

    if (config.user && config.pass) {
      try {
        console.log(`[SMTP:${attemptId}] Initializing transporter.`);
        mailTransporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: { user: config.user, pass: config.pass },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
          tls: {
            rejectUnauthorized: false
          }
        });
        mailTransporter.on("error", (error) => {
          console.error(`[SMTP:${attemptId}] Transporter runtime error:`, formatSmtpError(error));
        });
      } catch (err) {
        console.error(`[SMTP:${attemptId}] Failed to initialize transporter:`, formatSmtpError(err));
        throw err;
      }
    } else {
      const error = new Error("Missing SMTP_USER or SMTP_PASS in environment.");
      console.error(`[SMTP:${attemptId}] ${error.message}`);
      throw error;
    }
  }

  if (mailTransporter && !mailTransporterVerified && shouldVerifySmtpConnection()) {
    try {
      console.log(`[SMTP:${attemptId}] Verifying SMTP connection/authentication.`);
      await withTimeout(mailTransporter.verify(), 5000, "SMTP verify");
      mailTransporterVerified = true;
      console.log(`[SMTP:${attemptId}] Transporter verified successfully.`);
    } catch (error) {
      mailTransporter = null;
      mailTransporterVerified = false;
      console.error(`[SMTP:${attemptId}] Transporter verification failed:`, formatSmtpError(error));
      throw error;
    }
  }

  if (mailTransporter && !shouldVerifySmtpConnection()) {
    mailTransporterVerified = true;
  }

  return mailTransporter;
}

function logEmailDispatchSummary(results: EmailSendResult[], context: string) {
  const failed = results.filter((result) => !result.ok);
  const succeeded = results.filter((result) => result.ok);
  console.log(
    `[SMTP:${context}] Dispatch summary: ${succeeded.length} succeeded, ${failed.length} failed.`
  );
  if (failed.length > 0) {
    console.error(
      `[SMTP:${context}] Failed email attempts:`,
      failed.map((result) => ({
        attemptId: result.attemptId,
        to: result.to,
        subject: result.subject,
        stage: result.stage,
        error: result.error,
      }))
    );
  }
}

function summarizeEmailDispatch(results: EmailSendResult[]) {
  return {
    attempted: results.length,
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results: results.map((result) => ({
      ok: result.ok,
      attemptId: result.attemptId,
      to: result.to,
      subject: result.subject,
      stage: result.stage,
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected,
      error: result.error,
    })),
  };
}

function queueEmailDispatch(emailJobs: Promise<EmailSendResult>[], context: string) {
  if (emailJobs.length === 0) {
    return;
  }

  Promise.all(emailJobs)
    .then((results) => logEmailDispatchSummary(results, context))
    .catch((error) => {
      console.error(`[SMTP:${context}] Unexpected background email dispatch failure:`, formatSmtpError(error));
    });
}

// Helper to send emails with explicit SMTP stage/result logging.
async function sendEmailSafe(to: string, subject: string, htmlContent: string, context = "general"): Promise<EmailSendResult> {
  const attemptId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[SMTP:${attemptId}] Send attempt started. context=${context} to=${to} subject="${subject}"`);

  if (!isValidEmailAddress(to)) {
    const result: EmailSendResult = {
      ok: false,
      attemptId,
      to,
      subject,
      stage: "validation",
      error: "Invalid recipient email address.",
    };
    console.error(`[SMTP:${attemptId}] Invalid recipient email address.`, result);
    return result;
  }

  try {
    const transporter = await getMailTransporter(attemptId);
    const sender = getEnvValue("SMTP_FROM", ["MAIL_FROM"]) || getEnvValue("SMTP_USER", ["SMPT_USER"]);
    if (!sender) {
      throw new Error("SMTP_USER is not configured.");
    }
    console.log(`[SMTP:${attemptId}] sendMail started. from=${sender} to=${to}`);
    const result = await withTimeout(
      transporter.sendMail({
        from: `"PugArch FSM Support" <${sender}>`,
        to,
        subject,
        html: htmlContent,
      }),
      8000,
      `SMTP send to ${to}`
    );

    const sendResult: EmailSendResult = {
      ok: Array.isArray(result.accepted) ? result.accepted.length > 0 : true,
      attemptId,
      to,
      subject,
      stage: "sendMail",
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected,
      envelope: result.envelope,
    };

    console.log(`[SMTP:${attemptId}] sendMail completed.`, sendResult);
    if (!sendResult.ok || (sendResult.rejected && sendResult.rejected.length > 0)) {
      console.error(`[SMTP:${attemptId}] SMTP server rejected one or more recipients.`, sendResult);
    }

    return sendResult;
  } catch (error) {
    const formattedError = formatSmtpError(error);
    const result: EmailSendResult = {
      ok: false,
      attemptId,
      to,
      subject,
      stage: mailTransporterVerified ? "sendMail" : "connection",
      error: formattedError,
    };
    console.error(`[SMTP:${attemptId}] Email send failed.`, result);
    return result;
  }
}

// ── Dynamic Translation using Gemini ─────────────────────────────────────────
async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!targetLanguage || targetLanguage === "en" || targetLanguage === "english") {
    return text;
  }
  const langMap: Record<string, string> = {
    hi: "Hindi",
    mr: "Marathi",
    or: "Odia",
  };
  const targetLangName = langMap[targetLanguage] || targetLanguage;
  try {
    const ai = getGeminiClient();
    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: `Translate the following FSM support system instructions or solution text into fluent, grammatically correct, and natural ${targetLangName}. 
Preserve all formatting, markdown bold markers (**), numbered bullet points, and spacing exactly.
Do not append any explanations, greetings, or notes. Return only the translated text.

Text:
${text}`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error(`Translation error to ${targetLangName}, falling back to English:`, error);
    return text;
  }
}

// ── Local Fallback Keyword Classification Engine ─────────────────────────────
function fallbackClassify(message: string): { matchedCode: string; confidence: number; reasoning: string } {
  const text = message.toLowerCase();

  // A1: User not found during signup
  if (
    (text.includes("user") || text.includes("account") || text.includes("signup") || text.includes("sign up") || text.includes("register")) &&
    (text.includes("not found") || text.includes("created") || text.includes("exist") || text.includes("error") || text.includes("fail"))
  ) {
    return { matchedCode: "A1", confidence: 0.85, reasoning: "Matched keywords relating to signup and unregistered accounts." };
  }

  // A2: Unable to login
  if (
    text.includes("login") || 
    text.includes("log in") || 
    text.includes("sign in") || 
    text.includes("signin") || 
    text.includes("credential") || 
    text.includes("password")
  ) {
    return { matchedCode: "A2", confidence: 0.85, reasoning: "Matched keywords relating to login and credential issues." };
  }

  // B1: Out of geofence message
  if (
    text.includes("out of geofence") || 
    (text.includes("geofence") && (text.includes("accuracy") || text.includes("outside") || text.includes("accuracy limit")))
  ) {
    return { matchedCode: "B1", confidence: 0.85, reasoning: "Matched keywords relating to geofence boundaries and GPS accuracy." };
  }

  // B2: Site or geofence not visible
  if (
    text.includes("site") && 
    (text.includes("not visible") || text.includes("pending") || text.includes("assignment") || text.includes("assign") || text.includes("not showing"))
  ) {
    return { matchedCode: "B2", confidence: 0.85, reasoning: "Matched keywords relating to pending site or geofence assignment." };
  }

  // B3: Geofence missing from map
  if (
    (text.includes("geofence") && (text.includes("missing") || text.includes("not found") || text.includes("not on map"))) ||
    text.includes("kml") ||
    text.includes("boundary")
  ) {
    return { matchedCode: "B3", confidence: 0.85, reasoning: "Matched keywords relating to missing geofences or KML boundary files." };
  }

  // B4: Location not fetching
  if (
    text.includes("location") && 
    (text.includes("not fetching") || text.includes("permission") || text.includes("gps") || text.includes("disabled") || text.includes("turn on"))
  ) {
    return { matchedCode: "B4", confidence: 0.85, reasoning: "Matched keywords relating to disabled GPS or denied location permissions." };
  }

  // C1: Face recognition failed
  if (
    text.includes("face") || 
    text.includes("selfie") || 
    text.includes("facial") || 
    text.includes("camera") || 
    text.includes("recogni")
  ) {
    return { matchedCode: "C1", confidence: 0.85, reasoning: "Matched keywords relating to face recognition, selfie upload, or camera permissions." };
  }

  // C2: Attendance not syncing
  if (
    text.includes("attendance") && 
    (text.includes("sync") || text.includes("upload") || text.includes("offline") || text.includes("not updating"))
  ) {
    return { matchedCode: "C2", confidence: 0.85, reasoning: "Matched keywords relating to attendance records and offline synchronization." };
  }

  // C3: Live tracking not updating
  if (
    text.includes("tracking") && 
    (text.includes("live") || text.includes("update") || text.includes("not updating") || text.includes("map status"))
  ) {
    return { matchedCode: "C3", confidence: 0.8, reasoning: "Matched keywords relating to real-time tracking updates." };
  }

  // C4: Tracking showing wrong route
  if (
    text.includes("route") || 
    (text.includes("tracking") && (text.includes("wrong") || text.includes("incorrect") || text.includes("misplaced")))
  ) {
    return { matchedCode: "C4", confidence: 0.85, reasoning: "Matched keywords relating to wrong routing or incorrect travel tracks." };
  }

  // C5: Patrolling status not updating
  if (
    text.includes("patrol") || 
    text.includes("patrolling") || 
    text.includes("checkpoint") || 
    text.includes("guard status")
  ) {
    return { matchedCode: "C5", confidence: 0.85, reasoning: "Matched keywords relating to patrolling activities and status reporting." };
  }

  // D1: Application crashing frequently
  if (
    text.includes("crash") || 
    text.includes("crashing") || 
    text.includes("close") || 
    text.includes("stopping") || 
    text.includes("force close")
  ) {
    return { matchedCode: "D1", confidence: 0.85, reasoning: "Matched keywords relating to app crashes or unstable device behavior." };
  }

  // D2: Slow app performance
  if (
    text.includes("slow") || 
    text.includes("lag") || 
    text.includes("sluggish") || 
    text.includes("performance") || 
    text.includes("ram") || 
    text.includes("freeze")
  ) {
    return { matchedCode: "D2", confidence: 0.85, reasoning: "Matched keywords relating to application lag and system slowdown." };
  }

  // D3: App not installing
  if (
    text.includes("install") || 
    text.includes("download") || 
    text.includes("storage") || 
    text.includes("play store") || 
    text.includes("package")
  ) {
    return { matchedCode: "D3", confidence: 0.85, reasoning: "Matched keywords relating to app installation or Google Play download issues." };
  }

  // E1: Data loss after logout
  if (
    text.includes("loss") || 
    text.includes("lost") || 
    text.includes("logout") || 
    text.includes("log out") || 
    text.includes("deleted")
  ) {
    return { matchedCode: "E1", confidence: 0.85, reasoning: "Matched keywords relating to unsynced data loss upon logging out." };
  }

  return { matchedCode: "NONE", confidence: 0, reasoning: "No reliable keyword mapping found." };
}

// ── API Routes ───────────────────────────────────────────────────────────────

// API Health Check
app.get("/api/health", asyncHandler(async (req, res) => {
  await dbService.testConnection();
  const { path: _path, ...database } = dbService.getInfo();
  res.json({ status: "ok", time: new Date().toISOString(), database });
}));

function normalizeEnvValue(value: string | undefined): string {
  return (value || "").trim().replace(/^['"]|['"]$/g, "");
}

function getEnvValue(name: string, aliases: string[] = []): string {
  const value = normalizeEnvValue(process.env[name]);
  if (value) {
    return value;
  }

  for (const alias of aliases) {
    const aliasValue = normalizeEnvValue(process.env[alias]);
    if (aliasValue) {
      console.warn(`[Config] Using ${alias} as an alias for ${name}. Rename it to ${name} in production settings when convenient.`);
      return aliasValue;
    }
  }

  return "";
}

function getAppUrl(): string {
  const configuredUrl = getEnvValue("APP_URL");
  if (configuredUrl) {
    return configuredUrl;
  }

  const vercelUrl = getEnvValue("VERCEL_URL");
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//i, "")}`;
  }

  return "http://localhost:3000";
}

function cleanString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeConversation(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((message): ChatMessage => {
    const sender = message?.sender === "bot" || message?.sender === "staff" ? message.sender : "user";
    return {
      sender,
      message: cleanString(message?.message, ""),
      timestamp: cleanString(message?.timestamp, new Date().toISOString()),
      ...(message?.type ? { type: message.type } : {}),
      ...(message?.mediaUrl ? { mediaUrl: message.mediaUrl } : {}),
    };
  });
}

function isUniqueConstraintError(error: any): boolean {
  return error?.code === "SQLITE_CONSTRAINT_UNIQUE" || error?.code === "23505";
}

function getAdminEmails(): string[] {
  return normalizeEnvValue(process.env.ADMIN_EMAILS)
    .split(",")
    .map((email) => normalizeEnvValue(email).toLowerCase())
    .filter(Boolean);
}

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body ?? {};
  const adminEmails = getAdminEmails();
  const adminPassword = normalizeEnvValue(process.env.ADMIN_PASSWORD);

  if (!adminEmails.length || !adminPassword) {
    return res.status(503).json({ error: "Admin authentication is not configured on the server." });
  }

  const normalizedEmail = normalizeEnvValue(String(email || "")).toLowerCase();
  const normalizedPassword = normalizeEnvValue(String(password || ""));
  if (adminEmails.includes(normalizedEmail) && normalizedPassword === adminPassword) {
    return res.json({ success: true });
  }

  return res.status(401).json({ error: "Invalid administrative credentials." });
});

// 1. NLP Semantic Classification Endpoint
app.post("/api/chat/message", async (req, res) => {
  const { message, language } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const userLang = language || "en";

  try {
    const ai = getGeminiClient();
    // Prompt Gemini to match the message against the 15 FSM issues
    const issuesPrompt = Object.values(ISSUES)
      .map((iss) => `Code: ${iss.code}, Category: ${iss.category}, Title: ${iss.title}, Solution: ${iss.solution}`)
      .join("\n");

    const systemPrompt = `You are the classification engine for PugArch FSM Support Portal. 
Your task is to analyze the user's message reporting an issue with our field force mobile application and determine if it maps to any of our 15 known issues.

Here is our problem database:
${issuesPrompt}

Analyze the user's message: "${message}"

You must respond with a JSON object containing:
- "matchedCode": The exact issue code (e.g., "A1", "B2", etc.) if there is a match with high confidence (>= 0.65). If there is no good match, return "NONE".
- "confidence": A number between 0 and 1 indicating how confident you are.
- "reasoning": A brief 1-sentence explanation of why you matched this code.

Important:
- Return ONLY the raw JSON.
- Do NOT wrap it in markdown codeblocks (e.g. do not use \`\`\`json).
- Be objective and strict with classifications.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "{}";
    let classification = { matchedCode: "NONE", confidence: 0, reasoning: "" };
    try {
      classification = JSON.parse(resultText.trim());
    } catch (e) {
      console.error("Failed to parse Gemini classification JSON, text was:", resultText);
    }

    // If classification succeeded and matched, fetch preconfigured solution
    if (classification.matchedCode !== "NONE" && classification.confidence >= 0.65) {
      const issue = ISSUES[classification.matchedCode];
      if (issue) {
        // Dynamically translate the solution if not English
        const translatedSolution = await translateText(issue.solution, userLang);
        const translatedTitle = await translateText(issue.title, userLang);

        return res.json({
          matchedIssueCode: issue.code,
          issueTitle: translatedTitle,
          solution: translatedSolution,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
        });
      }
    }

    // Fallback: No match found
    return res.json({
      matchedIssueCode: "NONE",
      confidence: classification.confidence,
      reasoning: classification.reasoning,
    });
  } catch (error) {
    console.warn("[GenAI] Semantic classification failed or rate-limited. Falling back to keyword engine:", error);
    
    // Gracefully handle Gemini errors/quotas using local keyword matching!
    const fallbackResult = fallbackClassify(message);
    if (fallbackResult.matchedCode !== "NONE") {
      const issue = ISSUES[fallbackResult.matchedCode];
      if (issue) {
        // Since Gemini is offline, we provide the English solution immediately
        return res.json({
          matchedIssueCode: issue.code,
          issueTitle: issue.title,
          solution: issue.solution,
          confidence: fallbackResult.confidence,
          reasoning: fallbackResult.reasoning + " (Offline Keyword Engine)",
        });
      }
    }

    // Unmatched offline fallback
    return res.json({
      matchedIssueCode: "NONE",
      confidence: 0,
      reasoning: "Offline Keyword Engine matched no standard FSM issues.",
    });
  }
});

// 1b. Specific Sub-issue Solution and Translation Endpoint
app.post("/api/issues/:subCode", async (req, res) => {
  const { subCode } = req.params;
  const { language } = req.body;
  const userLang = language || "en";

  const issue = ISSUES[subCode];
  if (!issue) {
    return res.status(404).json({ error: "Issue not found" });
  }

  try {
    // Translate elements dynamically if needed
    const translatedSolution = await translateText(issue.solution, userLang);
    const translatedTitle = await translateText(issue.title, userLang);

    return res.json({
      matchedIssueCode: issue.code,
      issueTitle: translatedTitle,
      solution: translatedSolution,
    });
  } catch (error) {
    console.error(`Error processing issue ${subCode} translation, serving fallback:`, error);
    return res.json({
      matchedIssueCode: issue.code,
      issueTitle: issue.title,
      solution: issue.solution,
    });
  }
});

// 2. OCR Screening / Vision AI Endpoint
app.post("/api/ocr", async (req, res) => {
  const { imageBase64, language } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required" });
  }

  // Strip the prefix if present (e.g. "data:image/png;base64,")
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const userLang = language || "en";

  try {
    const ai = getGeminiClient();

    const issuesPrompt = Object.values(ISSUES)
      .map((iss) => `Code: ${iss.code}, Title: ${iss.title}, Solution: ${iss.solution}`)
      .join("\n");

    const promptText = `Analyze this FSM app screenshot. Perform OCR (optical character recognition) on any error messages, logs, buttons, or page titles.
Then determine if the issue shown in the image matches one of our 15 preconfigured FSM issues:
${issuesPrompt}

Return a JSON object containing:
- "errorDetected": Description of what error or screen text you detected in the image.
- "matchedCode": The code of the matched issue (A1-E1) if it matches, otherwise "NONE".
- "reasoning": A brief sentence explaining why you matched this code.

Return ONLY the raw JSON. No markdown wrappers.`;

    const imagePart = {
      inlineData: {
        mimeType: "image/png",
        data: base64Data,
      },
    };

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: [imagePart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    let ocrResult = { errorDetected: "", matchedCode: "NONE", reasoning: "" };
    try {
      ocrResult = JSON.parse(resultText.trim());
    } catch (e) {
      console.error("Failed to parse OCR response JSON:", resultText);
    }

    if (ocrResult.matchedCode !== "NONE") {
      const issue = ISSUES[ocrResult.matchedCode];
      if (issue) {
        // Translate elements dynamically if needed
        const translatedSolution = await translateText(issue.solution, userLang);
        const translatedTitle = await translateText(issue.title, userLang);

        return res.json({
          errorDetected: ocrResult.errorDetected,
          matchedIssueCode: issue.code,
          issueTitle: translatedTitle,
          solution: translatedSolution,
          reasoning: ocrResult.reasoning,
        });
      }
    }

    // Unmatched fallback
    return res.json({
      errorDetected: ocrResult.errorDetected || "General unrecognized app issue",
      matchedIssueCode: "NONE",
      reasoning: ocrResult.reasoning || "Could not match any predefined error.",
    });
  } catch (error) {
    console.warn("[GenAI] OCR Analysis failed or rate-limited. Falling back gracefully:", error);
    // Return a friendly offline classification instead of 500 so the client never crashes
    return res.json({
      errorDetected: "Vision services are temporarily busy (Quota Limit).",
      matchedIssueCode: "NONE",
      reasoning: "Vision analysis is offline. Please type your error details in the chat and our assistant will help you.",
    });
  }
});

// 3. Audio Voice Transcribe Endpoint (Speech-To-Text)
app.post("/api/voice/transcribe", async (req, res) => {
  const { audioBase64, language } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ error: "audioBase64 is required" });
  }

  const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
  const userLang = language || "en";

  try {
    const ai = getGeminiClient();

    const promptText = `Transcribe this voice message. The speaker is reporting a mobile app technical issue in English, Hindi, Marathi, or Odia.
Provide the high-accuracy transcription in the language they spoke.
Also detect the spoken language.

Return a JSON object containing:
- "transcription": The plain text transcription.
- "detectedLanguage": "en" | "hi" | "mr" | "or" based on speech.

Return ONLY the raw JSON. No markdown wrappers.`;

    const audioPart = {
      inlineData: {
        mimeType: "audio/webm", // WebM is common for MediaRecorder
        data: base64Data,
      },
    };

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: [audioPart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    let speechResult = { transcription: "", detectedLanguage: "en" };
    try {
      speechResult = JSON.parse(resultText.trim());
    } catch (e) {
      console.error("Failed to parse speech JSON:", resultText);
    }

    return res.json(speechResult);
  } catch (error) {
    console.warn("[GenAI] Voice transcription failed or rate-limited. Returning empty graceful fallback:", error);
    return res.json({
      transcription: "",
      error: "Speech services are temporarily busy. Please try typing your issue instead.",
      detectedLanguage: userLang
    });
  }
});

// 4. Ticket Management Routes
app.post("/api/chatbot-interactions", asyncHandler(async (req, res) => {
  const {
    eventKey,
    eventType,
    category,
    issueCode,
    issueTitle,
    userId,
    sessionId,
    language,
    ticketCreated,
    ticketId,
    createdAt,
  } = req.body ?? {};

  const normalizedEventKey = cleanString(eventKey);
  const normalizedEventType = cleanString(eventType);
  const normalizedCategory = cleanString(category);
  const normalizedIssueTitle = cleanString(issueTitle);
  const normalizedSessionId = cleanString(sessionId);
  const normalizedLanguage = cleanString(language, "en");
  const normalizedIssueCode = issueCode === null || issueCode === undefined ? null : cleanString(issueCode);
  const allowedEventTypes = new Set(["category_selected", "subcategory_selected", "solution_provided"]);

  if (!normalizedEventKey || !normalizedEventType || !normalizedCategory || !normalizedIssueTitle || !normalizedSessionId) {
    return res.status(400).json({ error: "eventKey, eventType, category, issueTitle, and sessionId are required." });
  }

  if (!allowedEventTypes.has(normalizedEventType)) {
    return res.status(400).json({ error: "Unsupported chatbot interaction event type." });
  }

  const interaction = await dbService.recordChatbotInteraction({
    eventKey: normalizedEventKey,
    eventType: normalizedEventType as any,
    category: normalizedCategory,
    issueCode: normalizedIssueCode,
    issueTitle: normalizedIssueTitle,
    userId: userId ? cleanString(userId) : null,
    sessionId: normalizedSessionId,
    language: normalizedLanguage,
    ticketCreated: Boolean(ticketCreated),
    ticketId: ticketId ? cleanString(ticketId) : null,
    createdAt: createdAt ? cleanString(createdAt) : undefined,
  });

  if (!interaction) {
    return res.status(200).json({ ok: true, deduped: true });
  }

  res.status(201).json(interaction);
}));

app.get("/api/tickets", asyncHandler(async (req, res) => {
  const tickets = await dbService.getTickets();
  res.json(tickets);
}));

app.post("/api/tickets", async (req, res) => {
  const {
    name,
    phone,
    email,
    designation,
    companyName,
    issueCode,
    issueTitle,
    conversation,
    language,
    sessionId,
  } = req.body;

  const userName = cleanString(name);
  const userPhone = cleanString(phone);
  const userEmail = cleanString(email);
  const normalizedIssueCode = cleanString(issueCode, "NONE");
  const normalizedIssueTitle = cleanString(issueTitle, "Unresolved technical issue");

  if (!userName || !userPhone || !normalizedIssueTitle) {
    return res.status(400).json({ error: "Full name, contact number, and issue title are required." });
  }

  const emailError = validateEmailAddress(userEmail);
  const phoneError = validateContactNumber(userPhone);
  if (emailError || phoneError) {
    return res.status(400).json({ error: emailError || phoneError });
  }

  try {
    // 1. Ensure user profile exists (prevents duplicates, links using userId)
    const user = await dbService.addUser({
      name: userName,
      email: userEmail,
      phone: userPhone,
      designation: cleanString(designation, "Field Worker"),
      companyName: cleanString(companyName, "PugArch Client"),
    });

    // 2. Create ticket
    const ticket = await dbService.addTicket({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      category: normalizedIssueCode !== "NONE" ? (ISSUES[normalizedIssueCode]?.category || "General Support") : "General Escalation",
      issueCode: normalizedIssueCode,
      issueTitle: normalizedIssueTitle,
      conversation: normalizeConversation(conversation),
      status: "pending",
      assignedStaffId: null,
      assignedStaffName: null,
      resolutionNotes: null,
      language: cleanString(language, "en"),
    });

    const normalizedSessionId = cleanString(sessionId);
    if (normalizedSessionId) {
      await dbService.markChatbotInteractionsAsTicketed(normalizedSessionId, ticket.id);
    }

    // ── HTML Email Generation & Alerting ─────────────────────────────────────
    const conversationHTML = ticket.conversation
      .map(
        (msg) => `
      <div style="margin-bottom: 12px; padding: 10px; border-radius: 6px; background-color: ${
        msg.sender === "user" ? "#E3F2FD" : msg.sender === "bot" ? "#F5F5F5" : "#E8F5E9"
      };">
        <strong>${msg.sender === "user" ? "End User" : msg.sender === "bot" ? "Chatbot" : "Support Staff"}:</strong>
        <p style="margin: 4px 0 0 0; font-family: sans-serif; font-size: 14px;">${cleanString(msg.message).replace(/\n/g, "<br/>")}</p>
        <span style="font-size: 11px; color: #757575;">${new Date(msg.timestamp).toLocaleString()}</span>
      </div>
    `
      )
      .join("");

    // A. Send Admin Alert Email
    const adminEmailSubject = `🚨 [URGENT SUPPORT ALERT] New Ticket ${ticket.id} Created`;
    const adminEmailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #D32F2F; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">New Ticket Raised</h2>
          <span style="font-size: 14px;">Ticket ID: <strong>${ticket.id}</strong></span>
        </div>
        <div style="padding: 20px; background-color: #FAFAFA;">
          <h3 style="border-bottom: 2px solid #D32F2F; padding-bottom: 6px; margin-top: 0; color: #D32F2F;">User Information</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 4px 0; font-weight: bold; width: 120px;">Name:</td><td>${ticket.userName}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Contact No:</td><td>${ticket.userPhone}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Email:</td><td>${ticket.userEmail}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Designation:</td><td>${user.designation}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Company Name:</td><td>${user.companyName}</td></tr>
          </table>

          <h3 style="border-bottom: 2px solid #D32F2F; padding-bottom: 6px; margin-top: 24px; color: #D32F2F;">Issue details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 4px 0; font-weight: bold; width: 120px;">Category:</td><td>${ticket.category}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Problem Code:</td><td><code>${ticket.issueCode}</code></td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Summary:</td><td><strong>${ticket.issueTitle}</strong></td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Timestamp:</td><td>${new Date(ticket.createdAt).toLocaleString()}</td></tr>
          </table>

          <h3 style="border-bottom: 2px solid #D32F2F; padding-bottom: 6px; margin-top: 24px; color: #D32F2F;">Complete Chat Conversation</h3>
          <div style="max-height: 400px; overflow-y: auto; background-color: white; border: 1px solid #E0E0E0; border-radius: 6px; padding: 15px;">
            ${conversationHTML || "<p style='color: #757575;'>No chat history available.</p>"}
          </div>

          <div style="margin-top: 30px; text-align: center;">
            <a href="${getAppUrl()}" style="background-color: #D32F2F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">Open Admin Dashboard</a>
          </div>
        </div>
      </div>
    `;
    const emailJobs: Promise<EmailSendResult>[] = [];
    const adminAlertEmail = getEnvValue("SUPPORT_ALERT_EMAIL");
    if (adminAlertEmail) {
      emailJobs.push(sendEmailSafe(adminAlertEmail, adminEmailSubject, adminEmailBody, `ticket-create:${ticket.id}:admin-alert`));
    }

    // B. Send User Email Confirmation
    const userEmailSubject = `🎟️ [Ticket Raised] PugArch Support: Ticket ID ${ticket.id}`;
    const userEmailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0288D1; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">PugArch FSM Support</h2>
          <span style="font-size: 14px;">We've received your query! Ticket ID: <strong>${ticket.id}</strong></span>
        </div>
        <div style="padding: 20px; background-color: #FAFAFA; font-size: 14px; line-height: 1.5; color: #37474F;">
          <p>Dear <strong>${ticket.userName}</strong>,</p>
          <p>Thank you for reaching out to PugArch FSM Mobile Support. A technical support ticket has been created regarding your issue: <strong>"${ticket.issueTitle}"</strong>.</p>
          <p>A member of our support team will review your ticket and contact you shortly.</p>
          
          <div style="background-color: #E1F5FE; border-left: 4px solid #0288D1; padding: 15px; border-radius: 0 4px 4px 0; margin: 20px 0;">
            <strong style="color: #01579B;">Ticket Summary:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
              <li><strong>Ticket ID:</strong> ${ticket.id}</li>
              <li><strong>Category:</strong> ${ticket.category}</li>
              <li><strong>Status:</strong> ${ticket.status.toUpperCase()}</li>
              <li><strong>Created At:</strong> ${new Date(ticket.createdAt).toLocaleString()}</li>
            </ul>
          </div>
          
          <p style="font-size: 12px; color: #757575; border-top: 1px solid #E0E0E0; padding-top: 15px; margin-top: 25px;">This is an automated notification. Please do not reply directly to this email.</p>
        </div>
      </div>
    `;
    emailJobs.push(sendEmailSafe(ticket.userEmail, userEmailSubject, userEmailBody, `ticket-create:${ticket.id}:user-confirmation`));
    queueEmailDispatch(emailJobs, `ticket-create:${ticket.id}`);

    res.status(201).json({
      ...ticket,
      emailDispatch: {
        attempted: emailJobs.length,
        status: "queued",
      },
    });
  } catch (err: any) {
    console.error("Error creating ticket:", err);
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: "A user with this email or contact number already exists with different details." });
    }
    res.status(500).json({ error: err?.message || "Failed to generate ticket" });
  }
});

// Update Ticket (Assigned or Closed)
app.put("/api/tickets/:id", async (req, res) => {
  const { id } = req.params;
  const { status, assignedStaffId, assignedStaffName, resolutionNotes, operatorId, operatorName } = req.body;

  try {
    const existingTicket = await dbService.getTicketById(id);
    if (!existingTicket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const updatedTicket = await dbService.updateTicket(
      id,
      {
        ...(status !== undefined ? { status } : {}),
        ...(assignedStaffId !== undefined ? { assignedStaffId } : {}),
        ...(assignedStaffName !== undefined ? { assignedStaffName } : {}),
        ...(resolutionNotes !== undefined ? { resolutionNotes } : {}),
      },
      operatorId || "ADMIN",
      operatorName || "Admin Portal"
    );

    const emailResults: EmailSendResult[] = [];

    // Send notifications based on type of update:
    // B. Notify user about status changes
    if (status && status !== existingTicket.status) {
      const statusEmailSubject = `🔄 [Status Updated] PugArch Support: Ticket ID ${id}`;
      const statusEmailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1976D2; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Ticket Status Updated</h2>
            <span style="font-size: 14px;">Ticket ID: <strong>${id}</strong></span>
          </div>
          <div style="padding: 20px; background-color: #FAFAFA; font-size: 14px; line-height: 1.5; color: #37474F;">
            <p>Dear <strong>${updatedTicket.userName}</strong>,</p>
            <p>Your support ticket status has been updated.</p>
            
            <div style="background-color: #E3F2FD; border-left: 4px solid #1976D2; padding: 15px; border-radius: 0 4px 4px 0; margin: 20px 0;">
              <strong style="color: #0D47A1;">Current Status:</strong>
              <p style="margin: 8px 0 0 0; font-size: 14px; text-transform: capitalize;">${status}</p>
            </div>
            
            <p>If you need further assistance, please reply in the chat or open a new support request.</p>
            <p style="font-size: 11px; color: #757575; border-top: 1px solid #E0E0E0; padding-top: 15px; margin-top: 25px;">Best regards,<br/>PugArch Support Team</p>
          </div>
        </div>
      `;
      emailResults.push(await sendEmailSafe(updatedTicket.userEmail, statusEmailSubject, statusEmailBody, `ticket-update:${id}:status`));
    }

    // C. Notify Assigned Staff member
    if (assignedStaffId) {
      const staff = (await dbService.getStaff()).find((s) => s.id === assignedStaffId);
      if (staff && staff.email) {
        const staffEmailSubject = `📥 [Assigned Ticket] Ticket ID ${id} assigned to you`;
        const staffEmailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #E0E0E0; border-radius: 8px; padding: 20px; background-color: #FAFAFA;">
            <h2 style="color: #388E3C; margin-top: 0;">New Ticket Assignment</h2>
            <p>Dear <strong>${staff.name}</strong>,</p>
            <p>Ticket <strong>${id}</strong> has been assigned to you for investigation and resolution.</p>
            
            <div style="background-color: #E8F5E9; padding: 15px; border-radius: 4px; border-left: 4px solid #388E3C; margin: 15px 0;">
              <strong>Ticket details:</strong>
              <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px;">
                <li><strong>User Name:</strong> ${updatedTicket.userName}</li>
                <li><strong>Contact No:</strong> ${updatedTicket.userPhone}</li>
                <li><strong>Issue Title:</strong> ${updatedTicket.issueTitle}</li>
                <li><strong>Created:</strong> ${new Date(updatedTicket.createdAt).toLocaleString()}</li>
              </ul>
            </div>
            
            <p>Please log in to your PugArch dashboard to review and resolve this ticket.</p>
          </div>
        `;
        emailResults.push(await sendEmailSafe(staff.email, staffEmailSubject, staffEmailBody, `ticket-update:${id}:staff-assignment`));
      }
    }

    // D. Send Resolution Email to user when closed
    if (status === "closed") {
      const resolutionEmailSubject = `✅ [Resolved] PugArch Support: Ticket ID ${id}`;
      const resolutionEmailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #388E3C; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Ticket Resolved Successfully</h2>
            <span style="font-size: 14px;">Ticket ID: <strong>${id}</strong></span>
          </div>
          <div style="padding: 20px; background-color: #FAFAFA; font-size: 14px; line-height: 1.5; color: #37474F;">
            <p>Dear <strong>${updatedTicket.userName}</strong>,</p>
            <p>We are pleased to inform you that your FSM Mobile Support ticket has been resolved and closed by our support staff.</p>
            
            <div style="background-color: #E8F5E9; border-left: 4px solid #388E3C; padding: 15px; border-radius: 0 4px 4px 0; margin: 20px 0;">
              <strong style="color: #2E7D32;">Resolution Details:</strong>
              <p style="margin: 8px 0 0 0; font-size: 14px;">${resolutionNotes || "This issue has been successfully resolved."}</p>
            </div>
            
            <p>If you are still experiencing this issue or have any other concerns, feel free to start a new chat in the app by typing 'Hi'.</p>
            <p>Thank you for your cooperation!</p>
            
            <p style="font-size: 11px; color: #757575; border-top: 1px solid #E0E0E0; padding-top: 15px; margin-top: 25px;">Best regards,<br/>PugArch Support Team</p>
          </div>
        </div>
      `;
      emailResults.push(await sendEmailSafe(updatedTicket.userEmail, resolutionEmailSubject, resolutionEmailBody, `ticket-update:${id}:resolution`));
    }

    logEmailDispatchSummary(emailResults, `ticket-update:${id}`);
    res.json({ ...updatedTicket, emailDispatch: summarizeEmailDispatch(emailResults) });
  } catch (err) {
    console.error("Error updating ticket:", err);
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// 5. User Management Routes
app.get("/api/users", asyncHandler(async (req, res) => {
  const users = await dbService.getUsers();
  res.json(users);
}));

// 6. Support Staff CRUD Routes
app.get("/api/staff", asyncHandler(async (req, res) => {
  const staff = await dbService.getStaff();
  res.json(staff);
}));

app.post("/api/staff", async (req, res) => {
  const { name, email, phone, status } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Name, email, and phone are required" });
  }
  const emailError = validateEmailAddress(email);
  const phoneError = validateContactNumber(phone);
  if (emailError || phoneError) {
    return res.status(400).json({ error: emailError || phoneError });
  }
  try {
    const newStaff = await dbService.addStaff({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status: status || "active",
    });
    res.status(201).json(newStaff);
  } catch (err: any) {
    const message = err?.code === "SQLITE_CONSTRAINT_UNIQUE"
      ? "A staff member with this email or phone already exists."
      : err?.message || "Failed to add staff member.";
    res.status(err?.code === "SQLITE_CONSTRAINT_UNIQUE" ? 409 : 500).json({ error: message });
  }
});

app.put("/api/staff/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, status } = req.body;
  const emailError = validateEmailAddress(email);
  const phoneError = validateContactNumber(phone);
  if (!name || emailError || phoneError) {
    return res.status(400).json({ error: !name ? "Technician Name is required." : emailError || phoneError });
  }
  try {
    const updated = await dbService.updateStaff(id, { name: name.trim(), email: email.trim(), phone: phone.trim(), status });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "A staff member with this email or phone already exists." });
    }
    res.status(404).json({ error: err.message });
  }
});

app.delete("/api/staff/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await dbService.deleteStaff(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.post("/api/email/test", async (req, res) => {
  const configuredRecipient = getEnvValue("SUPPORT_ALERT_EMAIL") || getEnvValue("SMTP_USER", ["SMPT_USER"]);
  const recipient = normalizeEnvValue(req.body?.to || configuredRecipient);
  const subject = `PugArch FSM SMTP Test - ${new Date().toISOString()}`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 16px; border: 1px solid #E0E0E0; border-radius: 8px;">
      <h2 style="margin-top: 0;">PugArch FSM SMTP Test</h2>
      <p>This is a test email sent by the PugArch FSM support server.</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <p>If you received this, SMTP authentication and sendMail acceptance are working.</p>
    </div>
  `;

  const result = await sendEmailSafe(recipient, subject, html, "manual-test");
  if (!result.ok) {
    return res.status(502).json({
      error: "SMTP test email failed",
      emailDispatch: summarizeEmailDispatch([result]),
    });
  }

  res.json({
    success: true,
    emailDispatch: summarizeEmailDispatch([result]),
  });
});

// 7. Audit Log Route
app.get("/api/audit-logs", asyncHandler(async (req, res) => {
  const logs = await dbService.getAuditLogs();
  res.json(logs);
}));

// 8. Dynamic Live Analytics Endpoint
app.get("/api/analytics", asyncHandler(async (req, res) => {
  const tickets = await dbService.getTickets();
  const staff = await dbService.getStaff();
  const interactions = await dbService.getChatbotInteractions();

  const total = tickets.length;
  const pending = tickets.filter((t) => t.status === "pending").length;
  const assigned = tickets.filter((t) => t.status === "assigned").length;
  const closed = tickets.filter((t) => t.status === "closed").length;

  // Average resolution time in hours
  let closedWithResolutionTime = 0;
  let totalResolutionHours = 0;

  tickets.forEach((t) => {
    if (t.status === "closed" && t.closedAt) {
      const createdTime = new Date(t.createdAt).getTime();
      const closedTime = new Date(t.closedAt).getTime();
      const diffHrs = (closedTime - createdTime) / (1000 * 60 * 60);
      totalResolutionHours += diffHrs;
      closedWithResolutionTime++;
    }
  });

  const avgResolutionTime = closedWithResolutionTime > 0 ? (totalResolutionHours / closedWithResolutionTime).toFixed(1) : "0.0";

  // Category distribution
  const categoryMap: Record<string, number> = {};
  // Status distribution
  const statusMap = { pending: 0, assigned: 0, closed: 0 };
  // Support staff ticket count load
  const staffLoadMap: Record<string, number> = {};

  tickets.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + 1;
    statusMap[t.status] = (statusMap[t.status] || 0) + 1;
    if (t.assignedStaffId && t.status !== "closed") {
      staffLoadMap[t.assignedStaffName || "Unknown"] = (staffLoadMap[t.assignedStaffName || "Unknown"] || 0) + 1;
    }
  });

  const chatbotCategoryMap: Record<string, number> = {};
  const chatbotSubCategoryMap: Record<string, number> = {};
  const issueSearchMap: Record<string, { name: string; count: number }> = {};
  const eventTypeCounts = {
    category_selected: 0,
    subcategory_selected: 0,
    solution_provided: 0,
  };
  const dailyChatbotMap: Record<string, number> = {};
  const dailyTicketMap: Record<string, number> = {};

  interactions.forEach((interaction) => {
    if (interaction.eventType === "category_selected") {
      eventTypeCounts.category_selected += 1;
    } else if (interaction.eventType === "subcategory_selected") {
      eventTypeCounts.subcategory_selected += 1;
    } else if (interaction.eventType === "solution_provided") {
      eventTypeCounts.solution_provided += 1;
    }
    chatbotCategoryMap[interaction.category] = (chatbotCategoryMap[interaction.category] || 0) + 1;

    const issueKey = interaction.issueCode ? `${interaction.issueCode}::${interaction.issueTitle}` : interaction.issueTitle;
    chatbotSubCategoryMap[issueKey] = (chatbotSubCategoryMap[issueKey] || 0) + 1;

    if (interaction.issueCode) {
      issueSearchMap[interaction.issueCode] = issueSearchMap[interaction.issueCode] || {
        name: `${interaction.issueCode} - ${interaction.issueTitle}`,
        count: 0,
      };
      issueSearchMap[interaction.issueCode].count += 1;
    } else {
      issueSearchMap[interaction.issueTitle] = issueSearchMap[interaction.issueTitle] || {
        name: interaction.issueTitle,
        count: 0,
      };
      issueSearchMap[interaction.issueTitle].count += 1;
    }

    const dayKey = new Date(interaction.createdAt).toISOString().slice(0, 10);
    dailyChatbotMap[dayKey] = (dailyChatbotMap[dayKey] || 0) + 1;
  });

  tickets.forEach((ticket) => {
    const dayKey = new Date(ticket.createdAt).toISOString().slice(0, 10);
    dailyTicketMap[dayKey] = (dailyTicketMap[dayKey] || 0) + 1;
  });

  const categoryDistribution = Object.keys(categoryMap).map((cat) => ({
    name: cat,
    value: categoryMap[cat],
  }));

  const chatbotCategoryDistribution = Object.keys(chatbotCategoryMap)
    .sort((a, b) => chatbotCategoryMap[b] - chatbotCategoryMap[a])
    .map((cat) => ({
      name: cat,
      value: chatbotCategoryMap[cat],
    }));

  const chatbotSubCategoryDistribution = Object.keys(chatbotSubCategoryMap)
    .sort((a, b) => chatbotSubCategoryMap[b] - chatbotSubCategoryMap[a])
    .map((key) => ({
      name: key,
      value: chatbotSubCategoryMap[key],
    }));

  const topSearchedIssues = Object.values(issueSearchMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((entry) => ({
      name: entry.name,
      value: entry.count,
    }));

  const dailyChatbotInteractions = Object.keys(dailyChatbotMap)
    .sort()
    .map((date) => ({
      date,
      interactions: dailyChatbotMap[date],
    }));

  const dailyTicketGeneration = Object.keys(dailyTicketMap)
    .sort()
    .map((date) => ({
      date,
      tickets: dailyTicketMap[date],
    }));

  const totalChatbotQueries = interactions.length;
  const totalCategoriesSelected = eventTypeCounts.category_selected;
  const totalSubCategoriesSelected = eventTypeCounts.subcategory_selected;
  const totalSolutionsProvided = eventTypeCounts.solution_provided;
  const totalTicketsGenerated = tickets.length;
  const ticketConversionRate = totalChatbotQueries > 0 ? Number(((totalTicketsGenerated / totalChatbotQueries) * 100).toFixed(1)) : 0;

  const staffLoad = staff.map((s) => ({
    name: s.name,
    tickets: staffLoadMap[s.name] || 0,
    status: s.status,
  }));

  res.json({
    metrics: {
      totalTickets: total,
      pendingTickets: pending,
      activeTickets: assigned,
      closedTickets: closed,
      avgResolutionTimeHrs: parseFloat(avgResolutionTime),
      totalChatbotQueries,
      totalCategoriesSelected,
      totalSubCategoriesSelected,
      totalSolutionsProvided,
      totalTicketsGenerated,
      ticketConversionRate,
    },
    categoryDistribution,
    chatbotCategoryDistribution,
    chatbotSubCategoryDistribution,
    topSearchedIssues,
    dailyChatbotInteractions,
    dailyTicketGeneration,
    statusDistribution: [
      { name: "Pending", value: pending, color: "#EF4444" },
      { name: "Assigned", value: assigned, color: "#F59E0B" },
      { name: "Closed", value: closed, color: "#10B981" },
    ],
    staffLoad,
    sourceData: {
      interactions,
    },
  });
}));

function registerErrorHandler() {
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Invalid JSON in request body." });
    }
    console.error("Unhandled server error:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: "Internal server error." });
  });
}

const isVercel = Boolean(process.env.VERCEL);

if (isVercel) {
  registerErrorHandler();
}

// Configure Vite or Static Asset serving (local / self-hosted only)
async function startServer() {
  if (!isVercel) {
    if (process.env.NODE_ENV !== "production") {
      const [{ createServer: createViteServer }, { default: react }, { default: tailwindcss }] = await Promise.all([
        import("vite"),
        import("@vitejs/plugin-react"),
        import("@tailwindcss/vite"),
      ]);

      const vite = await createViteServer({
        configFile: false,
        root: process.cwd(),
        plugins: [react(), tailwindcss()],
        resolve: {
          alias: {
            "@": path.resolve(process.cwd(), "."),
          },
        },
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/")) {
          return next();
        }
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  if (!isVercel) {
    registerErrorHandler();
  }

  const port = Number(process.env.PORT) || PORT;
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port} in ${process.env.NODE_ENV || "development"} mode`);
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Set PORT to use a different port.`);
    } else {
      console.error("Failed to start server:", error);
    }
    process.exit(1);
  });
}

export default app;

if (!isVercel) {
  startServer().catch((error) => {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  });
}
