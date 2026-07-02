import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  X, 
  Globe, 
  History, 
  ArrowLeft, 
  Info, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  ChevronRight,
  User as UserIcon,
  Building,
  Briefcase,
  Phone,
  Mail,
  Loader2,
  AlertTriangle,
  RefreshCw,
  PlusCircle
} from "lucide-react";
import { Ticket, ChatMessage, Issue } from "../shared/types";
import { ISSUES } from "../shared/issues";
import { sanitizeContactNumber, validateContactNumber, validateEmailAddress } from "../shared/validation";

const CATEGORY_BY_CODE = Object.values(ISSUES).reduce<Record<string, string>>((acc, issue) => {
  acc[issue.code.charAt(0)] = issue.category;
  return acc;
}, {});

function formatIssueResponse(title: string, solution: string): string {
  return `### ${title}\n\n${solution}`;
}

async function parseTicketResponse(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  return { error: text || `Request failed with status ${res.status}` };
}

function getTicketErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? `Ticket creation failed: ${error.message}`
    : "Ticket creation failed. Please try again.";
}

// Predefined issues and fields to collect for interactive ticket creation
const ISSUE_FIELDS: Record<string, { key: string; label: string; prompt: Record<string, string>; type: string }[]> = {
  A1: [
    { key: "name", label: "Full Name", prompt: { en: "Please enter your Full Name:", hi: "कृपया अपना पूरा नाम दर्ज करें:", mr: "कृपया आपले पूर्ण नाव प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ସମ୍ପୂର୍ଣ୍ଣ ନାମ ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "email", label: "Email Address", prompt: { en: "Please enter your Email Address:", hi: "कृपया अपना ईमेल पता दर्ज करें:", mr: "कृपया आपला ईमेल पत्ता प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ଇମେଲ୍ ଠିକଣା ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "phone", label: "Contact Number", prompt: { en: "Please enter your Contact Number:", hi: "कृपया अपना संपर्क नंबर दर्ज करें:", mr: "कृपया आपला संपर्क क्रमांक प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ସମ୍ପର୍କ ନମ୍ବର ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "companyName", label: "Company Name", prompt: { en: "Please enter your Company Name:", hi: "कृपया अपनी कंपनी का नाम दर्ज करें:", mr: "कृपया आपल्या कंपनीचे नाव प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର କମ୍ପାନୀର ନାମ ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "designation", label: "Designation", prompt: { en: "Please enter your Designation:", hi: "कृपया अपना पद (Designation) दर्ज करें:", mr: "कृपया आपले पद (Designation) प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ପଦବୀ (Designation) ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" }
  ],
  B2: [
    { key: "name", label: "Full Name", prompt: { en: "Please enter your Full Name:", hi: "कृपया अपना पूरा नाम दर्ज करें:", mr: "कृपया आपले पूर्ण नाव प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ସମ୍ପୂର୍ଣ୍ଣ ନାମ ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "email", label: "Email Address", prompt: { en: "Please enter your Email Address:", hi: "कृपया अपना ईमेल पता दर्ज करें:", mr: "कृपया आपला ईमेल पत्ता प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ଇମେଲ୍ ଠିକଣା ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "phone", label: "Contact Number", prompt: { en: "Please enter your Contact Number:", hi: "कृपया अपना संपर्क नंबर दर्ज करें:", mr: "कृपया आपला संपर्क क्रमांक प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ସମ୍ପର୍କ ନମ୍ବର ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "companyName", label: "Company Name", prompt: { en: "Please enter your Company Name:", hi: "कृपया अपनी कंपनी का नाम दर्ज करें:", mr: "कृपया आपल्या कंपनीचे नाव प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର କମ୍ପାନୀର ନାମ ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "designation", label: "Designation", prompt: { en: "Please enter your Designation:", hi: "कृपया अपना पद (Designation) दर्ज करें:", mr: "कृपया आपले पद (Designation) प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ପଦବୀ (Designation) ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" }
  ],
  B3: [
    { key: "name", label: "Full Name", prompt: { en: "Please enter your Full Name:", hi: "कृपया अपना पूरा नाम दर्ज करें:", mr: "कृपया आपले पूर्ण नाव प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ସମ୍ପୂର୍ଣ୍ଣ ନାମ ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "email", label: "Email Address", prompt: { en: "Please enter your Email Address:", hi: "कृपया अपना ईमेल पता दर्ज करें:", mr: "कृपया आपला ईमेल पत्ता प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ଇମେଲ୍ ଠିକଣା ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "phone", label: "Contact Number", prompt: { en: "Please enter your Contact Number:", hi: "कृपया अपना संपर्क नंबर दर्ज करें:", mr: "कृपया आपला संपर्क क्रमांक प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ସମ୍ପର୍କ ନମ୍ବର ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "companyName", label: "Company Name", prompt: { en: "Please enter your Company Name:", hi: "कृपया अपनी कंपनी का नाम दर्ज करें:", mr: "कृपया आपल्या कंपनीचे नाव प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର କମ୍ପାନୀର ନାମ ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "currentLocation", label: "Current Location / Live Location", prompt: { en: "Please enter your Current Location / Live Location:", hi: "कृपया अपना वर्तमान स्थान / लाइव लोकेशन दर्ज करें:", mr: "कृपया आपले वर्तमान स्थान / लाइव्ह लोकेशन प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ବର୍ତ୍ତମାନର ସ୍ଥាន / ଲାଇଭ୍ ଲୋକେସନ୍ ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "kmlFile", label: "KML File (optional)", prompt: { en: "Please upload or enter KML File details (optional, type 'skip' to skip):", hi: "कृपया केएमएल फ़ाइल विवरण दर्ज या अपलोड करें (वैकल्पिक, छोड़ने के लिए 'skip' लिखें):", mr: "कृपया KML फाईल तपशील प्रविष्ट करा किंवा अपलोड करा (पर्यायी, वगळण्यासाठी 'skip' लिहा):", or: "ଦୟାକରି KML ଫାଇଲ୍ ବିବରଣୀ ପ୍ରଦାନ କରନ୍ତୁ (ବୈକଳ୍ପିକ, ବାଦ୍ ଦେବା ପାଇଁ 'skip' ଟାଇପ୍ କରନ୍ତୁ):" }, type: "file" }
  ],
  C1: [
    { key: "name", label: "Full Name", prompt: { en: "Please enter your Full Name:", hi: "कृपया अपना पूरा नाम दर्ज करें:", mr: "कृपया आपले पूर्ण नाव प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ସମ୍ପୂର୍ଣ୍ଣ ନାମ ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "email", label: "Email Address", prompt: { en: "Please enter your Email Address:", hi: "कृपया अपना ईमेल पता दर्ज करें:", mr: "कृपया आपला ईमेल पत्ता प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ଇମେଲ୍ ଠିକଣା ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "phone", label: "Contact Number", prompt: { en: "Please enter your Contact Number:", hi: "कृपया अपना संपर्क नंबर दर्ज करें:", mr: "कृपया आपला संपर्क क्रमांक प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ସମ୍ପର୍କ ନମ୍ବର ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "companyName", label: "Company Name", prompt: { en: "Please enter your Company Name:", hi: "कृपया अपनी कंपनी का नाम दर्ज करें:", mr: "कृपया आपल्या कंपनीचे नाव प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର କମ୍ପାନୀର ନାମ ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "designation", label: "Designation", prompt: { en: "Please enter your Designation:", hi: "कृपया अपना पद (Designation) दर्ज करें:", mr: "कृपया आपले पद (Designation) प्रविष्ट करा:", or: "ଦୟାକରି ଆପଣଙ୍କର ପଦବୀ (Designation) ପ୍ରଦାନ କରନ୍ତୁ:" }, type: "text" },
    { key: "selfie", label: "Selfie Image", prompt: { en: "Please upload your Selfie Image (using the camera or file attachment icon):", hi: "कृपया अपनी सेल्फी छवि अपलोड करें (कैमरा या फ़ाइल अटैचमेंट आइकन का उपयोग करके):", mr: "कृपया आपली सेल्फी प्रतिमा अपलोड करा (कॅмера किंवा फाईल संलग्नक चिन्ह वापरून):", or: "ଦୟାକରି ଆପଣଙ୍କର ସେଲଫି ଫଟୋ ଅପලୋଡ୍ କରନ୍ତୁ (କ୍ୟାମେରା କିମ୍ବା ଫାଇଲ୍ ସଂଲଗ୍ନ ଆଇକନ୍ ବ୍ୟବହାର କରି):" }, type: "image" }
  ]
};

const CHAT_SESSION_KEY = "pugarch_chatbot_session_id";

function createChatSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateChatSessionId(): string {
  const existing = localStorage.getItem(CHAT_SESSION_KEY);
  if (existing) {
    return existing;
  }

  const nextSessionId = createChatSessionId();
  localStorage.setItem(CHAT_SESSION_KEY, nextSessionId);
  return nextSessionId;
}

interface ChatbotViewProps {
  onAdminLoginClick: () => void;
}

export default function ChatbotView({ onAdminLoginClick }: ChatbotViewProps) {
  // Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [isTyping, setIsTyping] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);
  const [chatSessionId, setChatSessionId] = useState<string>(() => getOrCreateChatSessionId());

  // Active issue & ticket generation states
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [hasSelectedSubIssue, setHasSelectedSubIssue] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [awaitingFeedback, setAwaitingFeedback] = useState<string | null>(null); // code of issue awaiting YES/NO
  const [feedbackPrompt, setFeedbackPrompt] = useState<string>("");
  const [awaitingEscalationForm, setAwaitingEscalationForm] = useState(false);
  const [escalationDetails, setEscalationDetails] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    companyName: "",
    description: ""
  });
  const [escalationErrors, setEscalationErrors] = useState({
    email: "",
    phone: ""
  });

  // Interactive Information Collection States
  const [collectingIssueCode, setCollectingIssueCode] = useState<string | null>(null);
  const [currentFieldIdx, setCurrentFieldIdx] = useState<number>(0);
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});
  const [collectionErrors, setCollectionErrors] = useState<Record<string, string>>({});

  // OCR and media states
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // User tickets local history
  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [isSyncingTickets, setIsSyncingTickets] = useState(false);

  const escalationEmailError = validateEmailAddress(escalationDetails.email);
  const escalationPhoneError = validateContactNumber(escalationDetails.phone);
  const isEscalationFormValid =
    Boolean(escalationDetails.name.trim()) && !escalationEmailError && !escalationPhoneError;

  const mergeTickets = (localTickets: Ticket[], serverTickets: Ticket[]) => {
    const merged = new Map<string, Ticket>();

    for (const ticket of serverTickets) {
      merged.set(ticket.id, ticket);
    }

    for (const ticket of localTickets) {
      const serverTicket = merged.get(ticket.id);
      merged.set(ticket.id, serverTicket ? { ...ticket, ...serverTicket } : ticket);
    }

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const syncUserTicketsWithServer = async () => {
    const savedTickets = localStorage.getItem("pugarch_user_tickets");
    let localTickets: Ticket[] = [];

    try {
      if (savedTickets) {
        localTickets = JSON.parse(savedTickets);
      }
    } catch (e) {
      console.error(e);
    }

    setIsSyncingTickets(true);
    try {
      const res = await fetch("/api/tickets");
      if (res.ok) {
        const serverTickets: Ticket[] = await res.json();
        const updatedTickets = mergeTickets(localTickets, serverTickets);
        setUserTickets(updatedTickets);
        localStorage.setItem("pugarch_user_tickets", JSON.stringify(updatedTickets));
      }
    } catch (err) {
      console.error("Failed to sync tickets with server:", err);
      if (localTickets.length > 0) {
        setUserTickets(localTickets);
      }
    } finally {
      setIsSyncingTickets(false);
    }
  };

  const recordChatbotInteraction = async (payload: {
    eventType: "category_selected" | "subcategory_selected" | "solution_provided";
    category: string;
    issueCode?: string | null;
    issueTitle: string;
    ticketCreated?: boolean;
    ticketId?: string | null;
    createdAt?: string;
  }) => {
    const eventKey = `${chatSessionId}:${payload.eventType}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
    console.log("[Analytics] Chatbot event queued", {
      eventType: payload.eventType,
      category: payload.category,
      issueCode: payload.issueCode ?? null,
      issueTitle: payload.issueTitle,
      sessionId: chatSessionId,
    });
    try {
      const response = await fetch("/api/chatbot-interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventKey,
          eventType: payload.eventType,
          category: payload.category,
          issueCode: payload.issueCode ?? null,
          issueTitle: payload.issueTitle,
          userId: null,
          sessionId: chatSessionId,
          language: selectedLanguage,
          ticketCreated: Boolean(payload.ticketCreated),
          ticketId: payload.ticketId ?? null,
          createdAt: payload.createdAt || new Date().toISOString(),
        }),
      });
      const responseBody = await response.json().catch(() => null);
      if (!response.ok) {
        console.error("[Analytics] Chatbot event insert failed", {
          status: response.status,
          eventType: payload.eventType,
          responseBody,
        });
        return;
      }
      console.log("[Analytics] Chatbot event inserted", {
        status: response.status,
        eventType: payload.eventType,
        responseBody,
      });
    } catch (error) {
      console.error("Failed to record chatbot interaction:", error);
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Language display dictionary
  const t: Record<string, any> = {
    en: {
      title: "PugArch FSM Support",
      welcome: "Hi! Welcome to PugArch FSM Support. I can help you resolve app issues instantly.",
      selectIssue: "Please select the type of problem you are facing:",
      placeholder: "Type your issue or tap mic to speak...",
      wasHelpful: "Was this helpful?",
      yes: "YES",
      no: "NO",
      historyTitle: "My Ticket History",
      noHistory: "No support tickets found on this device.",
      categoriesBtn: "View Issue Categories",
      adminBtn: "Admin Portal",
      escalateTitle: "Create Support Ticket",
      submitting: "Submitting ticket...",
      ticketCreated: "Support ticket created successfully!",
      ticketId: "Ticket ID",
      ocrAnalyzing: "Vision AI is analyzing your screenshot...",
      recording: "Recording voice...",
      transcribing: "Transcribing audio..."
    },
    hi: {
      title: "पुगआर्च FSM सहायता",
      welcome: "नमस्ते! पुगआर्च FSM सहायता में आपका स्वागत है। मैं आपकी सामान्य समस्याओं को तुरंत हल करने में मदद कर सकता हूँ।",
      selectIssue: "कृपया अपनी समस्या का प्रकार चुनें:",
      placeholder: "अपनी समस्या लिखें या बोलने के लिए माइक दबाएं...",
      wasHelpful: "क्या यह मददगार था?",
      yes: "हाँ",
      no: "नहीं",
      historyTitle: "मेरा टिकट इतिहास",
      noHistory: "इस डिवाइस पर कोई सहायता टिकट नहीं मिला।",
      categoriesBtn: "समस्या श्रेणियाँ देखें",
      adminBtn: "एडमिन पोर्टल",
      escalateTitle: "सहायता टिकट बनाएं",
      submitting: "टिकट जमा किया जा रहा है...",
      ticketCreated: "सहायता टिकट सफलतापूर्वक बनाया गया!",
      ticketId: "टिकट आईडी",
      ocrAnalyzing: "विज़न एआई स्क्रीनशॉट का विश्लेषण कर रहा है...",
      recording: "आवाज रिकॉर्ड की जा रही है...",
      transcribing: "ऑडियो ट्रांसक्राइब किया जा रहा है..."
    },
    mr: {
      title: "पुगआर्च FSM सपोर्ट",
      welcome: "नमस्कार! पुगआर्च FSM सपोर्टमध्ये आपले स्वागत आहे. मी आपल्याला सामान्य ॲप समस्या त्वरित सोडविण्यास मदत करू शकतो.",
      selectIssue: "कृपया आपल्या समस्येचा प्रकार निवडा:",
      placeholder: "आपली समस्या लिहा किंवा बोलण्यासाठी माइक दाबा...",
      wasHelpful: "हे उपयुक्त ठरले का?",
      yes: "होय",
      no: "नाही",
      historyTitle: "माझा तिकीट इतिहास",
      noHistory: "या डिव्हाइसवर कोणतीही सपोर्ट तिकिटे आढळली नाहीत.",
      categoriesBtn: "समस्या श्रेणी पहा",
      adminBtn: "अ‍ॅडमिन पोर्टल",
      escalateTitle: "सपोर्ट तिकीट तयार करा",
      submitting: "तिकीट सादर केले जात आहे...",
      ticketCreated: "सपोर्ट तिकीट यशस्वीरित्या तयार केले गेले!",
      ticketId: "तिकीट आयडी",
      ocrAnalyzing: "व्हिजन एआय स्क्रीनशॉटचे विश्लेषण करत आहे...",
      recording: "आवाज रेकॉर्ड होत आहे...",
      transcribing: "ऑडिओ ट्रान्सक्राइब करत आहे..."
    },
    or: {
      title: "PugArch FSM ସହାୟତା",
      welcome: "ନମସ୍କାର! PugArch FSM ସହାୟତାରେ ଆପଣଙ୍କୁ ସ୍ୱାଗତ। ମୁଁ ଆପଣଙ୍କର ସାଧାରଣ ଆପ୍ ସମସ୍ୟାଗୁଡ଼ିକୁ ତୁରନ୍ତ ସମାଧାନ କରିବାରେ ସାହାଯ୍ୟ କରିପାରିବି।",
      selectIssue: "ଦୟାକରି ଆପଣ ସମ୍ମୁଖୀନ ହେଉଥିବା ସମସ୍ୟାର ପ୍ରକାର ଚୟନ କରନ୍ତୁ:",
      placeholder: "ଆପଣଙ୍କର ସମସ୍ୟା ଲେଖନ୍ତୁ କିମ୍ବା କହିବାକୁ ମାଇକ୍ ଦବାନ୍ତୁ...",
      wasHelpful: "ଏହା ସାହାଯ୍ୟକାରୀ ଥିଲା କି?",
      yes: "ହଁ",
      no: "ନାହିଁ",
      historyTitle: "ମୋର ଟିକେଟ୍ ଇତିହାସ",
      noHistory: "ଏହି ଡିଭାଇସରେ କୌණସି ସପୋର୍ଟ ଟିକେଟ୍ ମିଳିଲା ନାହିଁ।",
      categoriesBtn: "ସମସ୍ୟା ଶ୍ରେଣୀଗୁଡିକ ଦେଖନ୍ତୁ",
      adminBtn: "ଆଡମିନ ପୋର୍ଟାଲ",
      escalateTitle: "ସପୋର୍ଟ ଟିକେଟ୍ ସୃଷ୍ଟି କରନ୍ତୁ",
      submitting: "ଟିକେଟ୍ ଦାଖଲ କରାଯାଉଛି...",
      ticketCreated: "ସପୋର୍ଟ ଟିକେଟ୍ ସଫଳତାର ସହିତ ସୃଷ୍ଟି ହେଲା!",
      ticketId: "ଟିକେଟ୍ ID",
      ocrAnalyzing: "ଭิଜନ୍ AI ଆପଣଙ୍କର ସ୍କ୍ରିନସଟ୍ ବିଶ୍ଳେଷଣ କରୁଛି...",
      recording: "ସ୍ୱର ରେକର୍ଡିଂ ହେଉଛି...",
      transcribing: "ଅଡିଓ ଟ୍ରାନ୍ସକ୍ରାଇବ୍ ହେଉଛି..."
    }
  };

  // Pre-configured category list for FSM Chat
  const categories = [
    { code: "A", name: { en: "A — Login & Account", hi: "A — लॉगिन और खाता", mr: "A — लॉगिन आणि खाते", or: "A — ଲଗଇନ୍ ଓ ଆକାଉଣ୍ଟ୍" } },
    { code: "B", name: { en: "B — Location, GPS & Geofence", hi: "B — स्थान, जीपीएस और जियोफेंस", mr: "B — स्थान, जीपीएस आणि जिओफेन्स", or: "B — ଲୋକେସନ୍, GPS ଓ ଜିଓଫେନ୍ସ" } },
    { code: "C", name: { en: "C — Attendance & Tracking", hi: "C — उपस्थिति और Tracking", mr: "C — उपस्थिती आणि ट्रॅकिंग", or: "C — ଆଟେଣ୍ଡାନ୍ସ ଓ ଟ୍ରାକିଂ" } },
    { code: "D", name: { en: "D — App Crashes & Performance", hi: "D — ऐप क्रैश और प्रदर्शन", mr: "D — ॲप क्रॅश आणि कामगिरी", or: "D — ଆପ୍ କ୍ରାସ୍ ଓ ପରଫରମାନ୍ସ" } },
    { code: "E", name: { en: "E — Data & Sync", hi: "E — डेटा और सिंक", mr: "E — डेटा आणि सिंक", or: "E — ଡାଟା ଓ ସିଙ୍କ୍" } },
    { code: "F", name: { en: "F — Something else (Free Text / Photo)", hi: "F — कुछ और (फ्री टेक्स्ट / फोटो)", mr: "F — इतर काही (फ्री टेक्स्ट / फोटो)", or: "F — ଅନ୍ୟ କିଛି (ଟେକ୍ସଟ୍ / ଫଟୋ)" } }
  ];

  const subIssues: Record<string, { code: string; title: string }[]> = {
    A: [
      { code: "A1", title: "A1 — User not found during signup" },
      { code: "A2", title: "A2 — Unable to login" }
    ],
    B: [
      { code: "B1", title: "B1 — Out of geofence message" },
      { code: "B2", title: "B2 — Site or geofence not visible" },
      { code: "B3", title: "B3 — Geofence missing from map" },
      { code: "B4", title: "B4 — Location not fetching" }
    ],
    C: [
      { code: "C1", title: "C1 — Face recognition failed" },
      { code: "C2", title: "C2 — Attendance not syncing" },
      { code: "C3", title: "C3 — Live tracking not updating" },
      { code: "C4", title: "C4 — Tracking showing wrong route" },
      { code: "C5", title: "C5 — Patrolling status not updating" }
    ],
    D: [
      { code: "D1", title: "D1 — Application crashing frequently" },
      { code: "D2", title: "D2 — Slow app performance" },
      { code: "D3", title: "D3 — App not installing" }
    ],
    E: [
      { code: "E1", title: "E1 — Data loss after logout" }
    ]
  };

  const subIssueLabels: Record<string, Record<string, string>> = {
    A1: {
      en: "A1 - User not found during signup",
      hi: "A1 - साइनअप के दौरान उपयोगकर्ता नहीं मिला",
      mr: "A1 - साइनअप करताना वापरकर्ता सापडला नाही",
      or: "A1 - ସାଇନଅପ୍ ସମୟରେ ବ୍ୟବହାରକାରୀ ମିଳିଲେ ନାହିଁ",
    },
    A2: {
      en: "A2 - Unable to login",
      hi: "A2 - लॉगिन नहीं हो रहा है",
      mr: "A2 - लॉगिन करता येत नाही",
      or: "A2 - ଲଗଇନ୍ କରିପାରୁନାହାନ୍ତି",
    },
    B1: {
      en: "B1 - Out of geofence message",
      hi: "B1 - जियोफेंस से बाहर संदेश",
      mr: "B1 - जिओफेन्सच्या बाहेर असल्याचा संदेश",
      or: "B1 - ଜିଓଫେନ୍ସ ବାହାରେ ବାର୍ତ୍ତା",
    },
    B2: {
      en: "B2 - Site or geofence not visible",
      hi: "B2 - साइट या जियोफेंस दिखाई नहीं दे रहा",
      mr: "B2 - साइट किंवा जिओफेन्स दिसत नाही",
      or: "B2 - ସାଇଟ୍ କିମ୍ବା ଜିଓଫେନ୍ସ ଦେଖାଯାଉନାହିଁ",
    },
    B3: {
      en: "B3 - Geofence missing from map",
      hi: "B3 - मैप से जियोफेंस गायब है",
      mr: "B3 - नकाशावर जिओफेन्स दिसत नाही",
      or: "B3 - ମାପ୍‌ରୁ ଜିଓଫେନ୍ସ ନାହିଁ",
    },
    B4: {
      en: "B4 - Location not fetching",
      hi: "B4 - लोकेशन नहीं मिल रही",
      mr: "B4 - लोकेशन मिळत नाही",
      or: "B4 - ଲୋକେସନ୍ ଆସୁନାହିଁ",
    },
    C1: {
      en: "C1 - Face recognition failed",
      hi: "C1 - फेस रिकग्निशन असफल हुआ",
      mr: "C1 - फेस रिकग्निशन अयशस्वी झाले",
      or: "C1 - ଫେସ୍ ରେକଗ୍ନିସନ୍ ବିଫଳ ହେଲା",
    },
    C2: {
      en: "C2 - Attendance not syncing",
      hi: "C2 - अटेंडेंस सिंक नहीं हो रही",
      mr: "C2 - उपस्थिती सिंक होत नाही",
      or: "C2 - ଉପସ୍ଥିତି ସିଙ୍କ୍ ହେଉନାହିଁ",
    },
    C3: {
      en: "C3 - Live tracking not updating",
      hi: "C3 - लाइव ट्रैकिंग अपडेट नहीं हो रही",
      mr: "C3 - लाईव्ह ट्रॅकिंग अपडेट होत नाही",
      or: "C3 - ଲାଇଭ୍ ଟ୍ରାକିଂ ଅପଡେଟ୍ ହେଉନାହିଁ",
    },
    C4: {
      en: "C4 - Tracking showing wrong route",
      hi: "C4 - ट्रैकिंग गलत रूट दिखा रही है",
      mr: "C4 - ट्रॅकिंग चुकीचा मार्ग दाखवत आहे",
      or: "C4 - ଟ୍ରାକିଂ ଭୁଲ୍ ରୁଟ୍ ଦେଖାଉଛି",
    },
    C5: {
      en: "C5 - Patrolling status not updating",
      hi: "C5 - पेट्रोलिंग स्थिति अपडेट नहीं हो रही",
      mr: "C5 - पेट्रोलिंग स्थिती अपडेट होत नाही",
      or: "C5 - ପାଟ୍ରୋଲିଂ ସ୍ଥିତି ଅପଡେଟ୍ ହେଉନାହିଁ",
    },
    D1: {
      en: "D1 - Application crashing frequently",
      hi: "D1 - ऐप बार-बार क्रैश हो रहा है",
      mr: "D1 - अॅप वारंवार क्रॅश होत आहे",
      or: "D1 - ଆପ୍ ବାରମ୍ବାର କ୍ରାଶ୍ ହେଉଛି",
    },
    D2: {
      en: "D2 - Slow app performance",
      hi: "D2 - ऐप धीमा चल रहा है",
      mr: "D2 - अॅप हळू चालत आहे",
      or: "D2 - ଆପ୍ ଧୀରେ ଚାଲୁଛି",
    },
    D3: {
      en: "D3 - App not installing",
      hi: "D3 - ऐप इंस्टॉल नहीं हो रहा",
      mr: "D3 - अॅप इन्स्टॉल होत नाही",
      or: "D3 - ଆପ୍ ଇନଷ୍ଟଲ୍ ହେଉନାହିଁ",
    },
    E1: {
      en: "E1 - Data loss after logout",
      hi: "E1 - लॉगआउट के बाद डेटा खो गया",
      mr: "E1 - लॉगआउटनंतर डेटा गमावला",
      or: "E1 - ଲଗଆଉଟ୍ ପରେ ଡାଟା ହରାଇଗଲା",
    },
  };

  const categoryPanelLabels: Record<string, Record<string, string>> = {
    subProblems: {
      en: "Sub-problems",
      hi: "उप-समस्याएँ",
      mr: "उप-समस्या",
      or: "ଉପ-ସମସ୍ୟା",
    },
    back: {
      en: "Back",
      hi: "वापस",
      mr: "मागे",
      or: "ପଛକୁ",
    },
    notListed: {
      en: "My issue is different / Not listed",
      hi: "मेरी समस्या अलग है / सूची में नहीं है",
      mr: "माझी समस्या वेगळी आहे / यादीत नाही",
      or: "ମୋର ସମସ୍ୟା ଅଲଗା / ତାଲିକାରେ ନାହିଁ",
    },
  };

  const getLocalizedValue = (values: Record<string, string> | undefined, fallback: string) => {
    if (!values) return fallback;
    return values[selectedLanguage] || values.en || fallback;
  };

  const getSubIssueTitle = (subCode: string) => {
    return getLocalizedValue(subIssueLabels[subCode], subCode);
  };

  const getCategoryPanelLabel = (key: keyof typeof categoryPanelLabels) => {
    return getLocalizedValue(categoryPanelLabels[key], key);
  };

  // Process next collected field
  const processCollectedField = async (userText: string, imageToSend: string | null) => {
    if (!collectingIssueCode) return;
    const fields = ISSUE_FIELDS[collectingIssueCode];
    const currentField = fields[currentFieldIdx];

    if (currentField.key === "email") {
      const error = validateEmailAddress(userText);
      if (error) {
        setCollectionErrors((prev) => ({ ...prev, email: error }));
        setIsTyping(false);
        pushMessage("bot", error);
        return;
      }
    }

    if (currentField.key === "phone") {
      const sanitizedPhone = sanitizeContactNumber(userText);
      const error = validateContactNumber(sanitizedPhone);
      if (error) {
        setCollectionErrors((prev) => ({ ...prev, phone: error }));
        setIsTyping(false);
        pushMessage("bot", error);
        return;
      }
      userText = sanitizedPhone;
    }

    // Determine value to capture
    let fieldValue = userText;
    if (currentField.key === "email" || currentField.key === "phone") {
      fieldValue = userText.trim();
    }
    if (currentField.type === "image" || currentField.type === "file") {
      fieldValue = imageToSend || userText || "Uploaded file/image";
    }

    if (!fieldValue.trim() && !imageToSend) {
      fieldValue = "N/A";
    }

    // Skip handling for optional fields if skipped
    if (currentField.key === "kmlFile" && userText.trim().toLowerCase() === "skip") {
      fieldValue = "Skipped";
    }

    const updatedData = { ...collectedData, [currentField.key]: fieldValue };
    setCollectedData(updatedData);
    setCollectionErrors((prev) => ({ ...prev, [currentField.key]: "" }));

    const nextFieldIdx = currentFieldIdx + 1;

    if (nextFieldIdx < fields.length) {
      setCurrentFieldIdx(nextFieldIdx);
      const nextField = fields[nextFieldIdx];
      const promptText = nextField.prompt[selectedLanguage] || nextField.prompt["en"];

      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        pushMessage("bot", promptText);
      }, 600);
    } else {
      // Finished all fields - auto submit the ticket!
      await submitInteractiveTicket(updatedData);
    }
  };

  // Create support ticket automatically
  const submitInteractiveTicket = async (dataToSubmit: Record<string, any>) => {
    setIsTyping(true);
    const code = collectingIssueCode || "NONE";
    setCollectingIssueCode(null);

    const issueTitle = ISSUES[code]?.title || "Interactive registration details";

    // Build beautiful rich text summary of collected fields to append to conversation
    const fields = ISSUE_FIELDS[code] || [];
    const collectedSummaryText = `📋 **Collected Support Information:**\n` + 
      fields.map(f => {
        const val = dataToSubmit[f.key] || "N/A";
        if (typeof val === "string" && val.startsWith("data:image")) {
          return `• **${f.label}:** _[Selfie/Image Uploaded]_`;
        }
        return `• **${f.label}:** ${val}`;
      }).join("\n");

    const completeConversationForTicket = [
      ...messages,
      {
        sender: "user" as const,
        message: collectedSummaryText,
        timestamp: new Date().toISOString()
      }
    ];

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dataToSubmit.name || "Anonymous User",
          phone: dataToSubmit.phone || "N/A",
          email: dataToSubmit.email || "N/A",
          designation: dataToSubmit.designation || "N/A",
          companyName: dataToSubmit.companyName || "N/A",
          issueCode: code,
          issueTitle: issueTitle,
          conversation: completeConversationForTicket,
          language: selectedLanguage,
          sessionId: chatSessionId
        })
      });

      const newTicket = await parseTicketResponse(res);
      if (!res.ok) {
        throw new Error(newTicket.error || "Failed to create ticket");
      }
      setIsTyping(false);

      // Save ticket in LocalHistory
      const updatedTickets = [newTicket, ...userTickets];
      setUserTickets(updatedTickets);
      localStorage.setItem("pugarch_user_tickets", JSON.stringify(updatedTickets));

      const responseText = selectedLanguage === "en"
        ? `🎉 **Support Ticket Raised Successfully!**\n\n- **Ticket ID:** \`${newTicket.id}\`\n- **Status:** \`${newTicket.status.toUpperCase()}\`\n\nWe have dispatched notification emails to our engineering dispatch hub. A technician will contact you directly at **${newTicket.userPhone}** or **${newTicket.userEmail}** within 1 business day.\n\nYou can track the live status of this ticket anytime in your **Ticket History** (top right icon).`
        : selectedLanguage === "hi"
        ? `🎉 **सहायता टिकट सफलतापूर्वक बनाया गया!**\n\n- **टिकट आईडी:** \`${newTicket.id}\`\n- **स्थिति:** \`${newTicket.status.toUpperCase()}\`\n\nहमने अपने इंजीनियरिंग हब को ईमेल भेज दिया है। एक तकनीशियन 1 कार्य दिवस के भीतर **${newTicket.userPhone}** या **${newTicket.userEmail}** पर आपसे सीधे संपर्क करेगा।\n\nआप किसी भी समय अपने **टिकट इतिहास** (ऊपर दाईं ओर का आइकन) में इस टिकट की स्थिति देख सकते हैं।`
        : selectedLanguage === "mr"
        ? `🎉 **सपोर्ट तिकीट यशस्वीरित्या तयार केले गेले!**\n\n- **तिकीट आयडी:** \`${newTicket.id}\`\n- **स्थिती:** \`${newTicket.status.toUpperCase()}\`\n\nआम्ही आमच्या तंत्रज्ञांना ईमेल पाठवला आहे। १ व्यावसायिक दिवसाच्या आत तंत्रज्ञ आपल्याशी **${newTicket.userPhone}** किंवा **${newTicket.userEmail}** वर थेट संपर्क साधतील.\n\nआपण आपल्या **तिकीट इतिहास** (वरती उजव्या कोपऱ्यातील आयकॉन) मध्ये या तिकिटाची स्थिती कधीही तपासू शकता।`
        : `🎉 **ସପୋର୍ଟ ଟିକେଟ୍ ସଫଳତାର ସହିତ ସୃଷ୍ଟି ହେଲା!**\n\n- **ଟିକେଟ୍ ID:** \`${newTicket.id}\`\n- **ସ୍ଥିତି:** \`${newTicket.status.toUpperCase()}\`\n\nଆମେ ଇଞ୍ଜିନିୟରିଂ ସପୋର୍ଟ ହବ୍‌କୁ ଇମେଲ୍ ପଠାଇଛୁ। ଜଣେ ଟେକ୍ନିସିଆନ୍ ୧ କାର୍ଯ୍ୟଦିବସ ମଧ୍ୟରେ ଆପଣଙ୍କୁ **${newTicket.userPhone}** କିମ୍ବା **${newTicket.userEmail}** ରେ ସିଧାସଳଖ ଯୋଗାଯୋଗ କରିବେ।\n\nଆପଣ ଯେକୌଣସି ସମୟରେ ଆପଣଙ୍କର **ଟିକେଟ୍ ଇତିହିସ** (ଉପର ଡାହାଣ କୋଣରେ ଥିବା ଆଇକନ୍) ରେ ଏହି ଟିକେଟ୍ ର ସ୍ଥିତି ଯାଞ୍ଚ କରିପାରିବେ।`;

      pushMessage("bot", responseText);
      setCurrentCategory(null);
    } catch (err) {
      console.error("Failed to submit ticket:", err);
      setIsTyping(false);
      pushMessage("bot", getTicketErrorMessage(err));
    }
  };

  // Handling help confirmation YES / NO
  const handleFeedback = (isHelpful: boolean) => {
    pushMessage("user", isHelpful ? t[selectedLanguage].yes : t[selectedLanguage].no);
    setAwaitingFeedback(null);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      if (isHelpful) {
        const text = selectedLanguage === "en" 
          ? "Great! Glad I could help.\n\nIf you face any other issue, just send **'Hi'** or tap **View Issue Categories** to start again."
          : selectedLanguage === "hi"
          ? "बहुत बढ़िया! खुशी है कि मैं मदद कर सका।\n\nयदि आप किसी अन्य समस्या का सामना करते हैं, तो फिर से शुरू करने के लिए बस **'Hi'** भेजें या **समस्या श्रेणियाँ देखें** पर टैप करें।"
          : selectedLanguage === "mr"
          ? "खूप छान! मला आनंद आहे की मी मदत करू शकलो.\n\nतुम्हाला इतर कोणत्याही समस्येचा सामना करावा लागल्यास, पुन्हा सुरू करण्यासाठी फक्त **'Hi'** पाठवा किंवा **समस्या श्रेणी पहा** वर टॅप करा."
          : "ବହୁତ ବଢିଆ! ମୁଁ ସାହାଯ୍ୟ କରିପାରିଥିବାରୁ ଖୁସି।\n\nଯଦି ଆପଣ ଅନ୍ୟ କୌଣସି ସମସ୍ୟାର ସମ୍ମୁଖୀନ ହୁଅନ୍ତି, ତେବେ ପୁଣି ଆରମ୍ଭ କରିବାକୁ କେବଳ **'Hi'** ପଠାନ୍ତୁ କିମ୍ବା **ସମସ୍ୟା ଶ୍ରେଣୀଗୁଡିକ ଦେଖନ୍ତୁ** ଉପରେ ଟ୍ୟାପ୍ କରନ୍ତୁ।";
        pushMessage("bot", text);
        setCurrentCategory(null);
      } else {
        const text = selectedLanguage === "en"
          ? "Sorry the solution did not work!\n\nPlease fill out the ticket creation form below, and our engineering support team will contact you directly within 24 hours."
          : selectedLanguage === "hi"
          ? "खेद है कि समाधान काम नहीं आया!\n\nकृपया नीचे दिए गए टिकट निर्माण फॉर्म को भरें, और हमारी engineering सहायता टीम 24 घंटे के भीतर आपसे सीधे संपर्क करेगी।"
          : selectedLanguage === "mr"
          ? "दिलगीर आहोत, हा उपाय काम करू शकला नाही!\n\nकृपया खालील तिकीट निर्मिती फॉर्म भरा आणि आमची सपोर्ट टीम २४ तासांच्या आत आपल्याशी थेट संपर्क साधेल."
          : "ଦୁଃଖିତ, ସମାଧାନଟି କାମ କଲାନାହିଁ!\n\nଦୟାକରି ତଳେ ଦିଆଯାଇଥିବା ଟିକେଟ୍ ସୃଷ୍ଟି ଫର୍ମ ପୂରଣ କରନ୍ତୁ, ଏବଂ ଆମର ସପୋର୍ଟ ଟିମ୍ ୨୪ ଘଣ୍ଟା ମଧ୍ୟରେ ଆପଣଙ୍କୁ ସିଧାସଳଖ ଯୋଗାଯୋଗ କରିବେ।";
        pushMessage("bot", text);
        setAwaitingEscalationForm(true);
      }
    }, 600);
  };

  // Direct escalation to ticket creation flow when issue is not matched
  const handleCreateSupportTicket = () => {
    pushMessage("user", selectedLanguage === "en" ? "Create Support Ticket" : "सपोर्ट टिकट बनाएं");
    setAwaitingFeedback(null);
    setEscalationDetails(prev => ({
      ...prev,
      description: feedbackPrompt || ""
    }));
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const text = selectedLanguage === "en"
        ? "Please fill out the ticket creation form below, and our engineering support team will contact you directly within 24 hours."
        : selectedLanguage === "hi"
        ? "कृपया नीचे दिए गए टिकट निर्माण फॉर्म को भरें, और हमारी इंजीनियरिंग सहायता टीम 24 घंटे के भीतर आपसे सीधे संपर्क करेगी।"
        : selectedLanguage === "mr"
        ? "कृपया खालील तिकीट निर्मिती फॉर्म भरा आणि आमची सपोर्ट टीम २४ तासांच्या आत आपल्याशी थेट संपर्क साधेल।"
        : "ଦୟାକରି ତଳେ ଦିଆଯାଇଥିବା ଟିକେଟ୍ ସୃଷ୍ଟି ଫର୍ମ ପୂରଣ କରନ୍ତୁ, ଏବଂ ଆମର ସପୋର୍ଟ ଟିମ୍ ୨୪ ଘଣ୍ଟା ମଧ୍ୟରେ ଆପଣଙ୍କୁ ସିଧାସଳଖ ଯୋଗାଯୋଗ କରିବେ।";
      pushMessage("bot", text);
      setAwaitingEscalationForm(true);
    }, 600);
  };

  const getPlaceholder = () => {
    if (collectingIssueCode) {
      const fields = ISSUE_FIELDS[collectingIssueCode];
      const currentField = fields[currentFieldIdx];
      return `${selectedLanguage === "en" ? "Enter" : "दर्ज करें"} ${currentField.label}...`;
    }
    return t[selectedLanguage].placeholder;
  };

  // Load chat session & history on mount
  useEffect(() => {
    // Load local tickets history
    const savedTickets = localStorage.getItem("pugarch_user_tickets");
    if (savedTickets) {
      setUserTickets(JSON.parse(savedTickets));
    }

    // Load local conversation
    const savedChat = localStorage.getItem("pugarch_chatbot_chat");
    if (savedChat) {
      setMessages(JSON.parse(savedChat));
    } else {
      // Seed first welcome message
      triggerWelcomeMessage();
    }
  }, [selectedLanguage]);

  // Synchronize tickets with the server on component mount
  useEffect(() => {
    syncUserTicketsWithServer();
  }, []);

  // Synchronize and persist conversation
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("pugarch_chatbot_chat", JSON.stringify(messages));
    }
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle welcome message
  const triggerWelcomeMessage = () => {
    const welcomeText = `${t[selectedLanguage].welcome}\n\n${t[selectedLanguage].selectIssue}`;
    setMessages([
      {
        sender: "bot",
        message: welcomeText,
        timestamp: new Date().toISOString()
      }
    ]);
    setShowCategories(true);
  };

  // Start new chat / Reset conversation
  const handleResetChat = () => {
    localStorage.removeItem("pugarch_chatbot_chat");
    const nextSessionId = createChatSessionId();
    localStorage.setItem(CHAT_SESSION_KEY, nextSessionId);
    setChatSessionId(nextSessionId);
    setCurrentCategory(null);
    setHasSelectedSubIssue(false);
    setAwaitingFeedback(null);
    setAwaitingEscalationForm(false);
    setCollectingIssueCode(null);
    setCurrentFieldIdx(0);
    setCollectedData({});
    triggerWelcomeMessage();
  };

  // Helper: push message safely
  const pushMessage = (sender: "user" | "bot" | "staff", text: string, type: "text" | "image" | "voice" = "text", mediaUrl?: string) => {
    const newMessage: ChatMessage = {
      sender,
      message: text,
      timestamp: new Date().toISOString(),
      type,
      mediaUrl
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  // Trigger interactive field collection or standard feedback loop
  const handleIssueMatch = (issueCode: string, issueTitle: string) => {
    const issueCategory = ISSUES[issueCode]?.category || currentCategory || "General";
    void recordChatbotInteraction({
      eventType: "solution_provided",
      category: issueCategory,
      issueCode,
      issueTitle,
    });

    const interactiveCodes = ["A1", "B2", "B3", "C1"];
    if (interactiveCodes.includes(issueCode)) {
      setAwaitingFeedback(null);
      setCollectingIssueCode(issueCode);
      setCurrentFieldIdx(0);
      setCollectedData({});
      
      const fields = ISSUE_FIELDS[issueCode];
      if (fields && fields.length > 0) {
        const introMsg = selectedLanguage === "en"
          ? `To register this and auto-generate your support ticket, I will collect some required information. Let's start with your **${fields[0].label}**:`
          : selectedLanguage === "hi"
          ? `इसे पंजीकृत करने और आपका सहायता टिकट स्वतः उत्पन्न करने के लिए, मैं कुछ आवश्यक जानकारी एकत्र करूँगा। आइए आपके **${fields[0].label}** से शुरू करें:`
          : selectedLanguage === "mr"
          ? `या समस्येची नोंद करण्यासाठी आणि सपोर्ट तिकीट तयार करण्यासाठी, मी काही आवश्यक माहिती गोळा करतो. सुरवातीला आपले **${fields[0].label}** सांगा:`
          : `ଏହାକୁ ପଞ୍ଜୀକୃତ କରିବା ପାଇଁ ଏବଂ ସପୋର୍ଟ ଟିକେଟ୍ ସୃଷ୍ଟି କରିବା ପାଇଁ, ମୁଁ କିଛି ଆବଶ୍ୟକୀୟ ବିବରଣୀ ସଂଗ୍ରହ କରିବି। ଆସନ୍ତୁ ଆପଣଙ୍କର **${fields[0].label}** ରୁ ଆରମ୍ଭ କରିବା:`;

        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          pushMessage("bot", introMsg);
        }, 800);
      }
    } else {
      setAwaitingFeedback(issueCode);
      setFeedbackPrompt(issueTitle);
    }
  };

  // Handling standard menu card selection
  const handleCategorySelect = (catCode: string, displayLabel?: string) => {
    setShowCategories(false);
    setHasSelectedSubIssue(false);
    const canonicalCategory = CATEGORY_BY_CODE[catCode] || displayLabel || catCode;
    pushMessage(
      "user",
      displayLabel || categories.find(c => c.code === catCode)?.name[selectedLanguage] || catCode
    );
    console.log("[Analytics] Category selected", { catCode, category: canonicalCategory });
    void recordChatbotInteraction({
      eventType: "category_selected",
      category: canonicalCategory,
      issueTitle: canonicalCategory,
    });

    if (catCode === "F") {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const promptText = selectedLanguage === "en"
          ? "Please type your issue in detail."
          : selectedLanguage === "hi"
          ? "कृपया अपनी समस्या का संक्षेप में वर्णन करें या स्क्रीनशॉट/फोटो अपलोड करें।"
          : selectedLanguage === "mr"
          ? "कृपया आपल्या समस्येचे थोडक्यात वर्णन करा किंवा स्क्रीनशॉट/फोटो अपलोड करा."
          : "ଦୟାକରି ଆପଣଙ୍କର ସମସ୍ୟାକୁ କିଛି ଶବ୍ଦରେ ବର୍ଣ୍ଣନା କରନ୍ତୁ କିମ୍ବା ଏକ ସ୍କ୍ରିନସଟ୍/ଫଟୋ ଅପଲୋଡ୍ କରନ୍ତୁ।";
        pushMessage("bot", promptText);
      }, 600);
      setCurrentCategory("F");
      setHasSelectedSubIssue(true);
      return;
    }

    setCurrentCategory(catCode);
  };

  const handleSubIssueSelect = async (subCode: string) => {
    setHasSelectedSubIssue(true);
    pushMessage("user", getSubIssueTitle(subCode));
    const canonicalIssue = ISSUES[subCode];
    console.log("[Analytics] Sub-category selected", {
      issueCode: subCode,
      category: canonicalIssue?.category || currentCategory || "General",
      issueTitle: canonicalIssue?.title || subCode,
    });
    void recordChatbotInteraction({
      eventType: "subcategory_selected",
      category: canonicalIssue?.category || currentCategory || "General",
      issueCode: subCode,
      issueTitle: canonicalIssue?.title || subCode,
    });

    setIsTyping(true);
    try {
      // Fetch response for the sub-issue
      const res = await fetch(`/api/issues/${subCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: selectedLanguage })
      });
      const data = await res.json();
      setIsTyping(false);

      if (data.solution) {
        pushMessage("bot", formatIssueResponse(data.issueTitle, data.solution));
        handleIssueMatch(subCode, data.issueTitle);
      } else {
        // Fallback local lookup
        const matchedIssue = ISSUES[subCode];
        pushMessage("bot", formatIssueResponse(matchedIssue.title, matchedIssue.solution));
        handleIssueMatch(subCode, matchedIssue.title);
      }
    } catch (err) {
      console.error("Failed to fetch translation, serving local static fallback:", err);
      setIsTyping(false);
      const matchedIssue = ISSUES[subCode];
      pushMessage("bot", formatIssueResponse(matchedIssue.title, matchedIssue.solution));
      handleIssueMatch(subCode, matchedIssue.title);
    }
  };

  // Submit Text Message / OCR classification matching
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;

    if (collectingIssueCode) {
      const messageToSend = inputText.trim();
      const imageToSend = attachedImage;
      setInputText("");
      setAttachedImage(null);

      if (imageToSend) {
        pushMessage("user", selectedLanguage === "en" ? "Attached Photo" : "फोटो संलग्न", "image", imageToSend);
      } else if (messageToSend) {
        pushMessage("user", messageToSend);
      }

      setIsTyping(true);
      await processCollectedField(messageToSend, imageToSend);
      return;
    }

    const messageToSend = inputText.trim();
    const imageToSend = attachedImage;
    setInputText("");
    setAttachedImage(null);

    if (messageToSend) {
      pushMessage("user", messageToSend);
    }

    if (imageToSend) {
      pushMessage("user", selectedLanguage === "en" ? "Attached Photo" : "फोटो संलग्न", "image", imageToSend);
    }

    setIsTyping(true);

    if (currentCategory === "F" && messageToSend && !imageToSend) {
      try {
        const res = await fetch("/api/chat/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: messageToSend, language: selectedLanguage })
        });
        const data = await res.json();
        setIsTyping(false);

        if (data.matchedIssueCode !== "NONE") {
          pushMessage("bot", formatIssueResponse(data.issueTitle, data.solution));
          setCurrentCategory(null);
          handleIssueMatch(data.matchedIssueCode, data.issueTitle);
        } else {
          const text = selectedLanguage === "en"
            ? "Your issue requires assistance from our support team.\n\nPlease click \"Create Support Ticket\" to continue."
            : selectedLanguage === "hi"
            ? "मैं इस समस्या को हमारे FSM सामान्य समस्याओं के डेटाबेस से नहीं मिला सका। क्या आप सपोर्ट टिकट बनाना चाहेंगे ताकि हमारी टीम सीधे आपकी सहायता कर सके?"
            : selectedLanguage === "mr"
            ? "मी त्या समस्येला आमच्या FSM सामान्य समस्यांच्या डेटाबेसशी जुळवू शकलो नाही. आपण सपोर्ट तिकीट तयार करू इच्छिता का, जेणेकरून आमची टीम थेट मदत करू शकेल?"
            : "ମୁଁ ଏହି ସମସ୍ୟାକୁ ଆମ FSM ସାଧାରଣ ସମସ୍ୟା ଡାଟାବେସ୍ ସହିତ ମେଳ କରିପାରିଲି ନାହିଁ. ଆପଣ ସପୋର୍ଟ ଟିକେଟ୍ ସୃଷ୍ଟି କରିବାକୁ ଚାହାଁନ୍ତି କି?";
          pushMessage("bot", text);
          setFeedbackPrompt(messageToSend);
          setAwaitingFeedback("NONE");
        }

        setCurrentCategory(null);
        return;
      } catch (err) {
        console.error("F flow semantic matching failed:", err);
        setIsTyping(false);
        pushMessage("bot", "I was not able to match that issue right now. Please create a support ticket so our team can help you directly.");
        setFeedbackPrompt(messageToSend);
        setAwaitingFeedback("NONE");
        setCurrentCategory(null);
        return;
      }
    }

    // If there's an image screenshot attached
    if (imageToSend) {
      const ocrBase64 = imageToSend;
      setIsAnalyzingImage(true);

      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: ocrBase64, language: selectedLanguage })
        });
        const data = await res.json();
        setIsTyping(false);
        setIsAnalyzingImage(false);

        pushMessage("bot", `${selectedLanguage === "en" ? "📸 **Vision AI Screenshot Extraction Result:**" : "📸 **विज़न एआई स्क्रीनशॉट परिणाम:**"}\n*Detected Screen:* _${data.errorDetected}_\n\n${data.matchedIssueCode !== "NONE" ? formatIssueResponse(data.issueTitle, data.solution) : (selectedLanguage === "en" ? "We could not match this exact screen to a predefined issue solution. Would you like to create an engineering support ticket?" : "हम इस स्क्रीन को किसी पूर्व-निर्धारित समाधान से नहीं मिला सके। क्या आप सपोर्ट टिकट बनाना चाहते हैं?")}`);

        if (data.matchedIssueCode !== "NONE") {
          handleIssueMatch(data.matchedIssueCode, data.issueTitle);
        } else {
          setAwaitingFeedback("NONE");
          setFeedbackPrompt(data.errorDetected || "Screenshot Unmatched Error");
        }
      } catch (err) {
        console.error("OCR analysis error:", err);
        setIsTyping(false);
        setIsAnalyzingImage(false);
        pushMessage("bot", selectedLanguage === "en" ? "Sorry, I had trouble analyzing the uploaded image. Please describe the error in text." : "क्षमा करें, मुझे अपलोड की गई छवि का विश्लेषण करने में समस्या हुई। कृपया समस्या का वर्णन टेक्स्ट में करें।");
      }
      return;
    }

    // Process standard text messages (Hi greeting, or semantic NLP processing)
    if (messageToSend.toLowerCase() === "hi" || messageToSend.toLowerCase() === "hello" || messageToSend.toLowerCase() === "हे" || messageToSend.toLowerCase() === "नमस्ते" || messageToSend.toLowerCase() === "नमस्कार") {
      setIsTyping(false);
      handleResetChat();
      return;
    }

    try {
      // Call backend NLP Semantic classifier for free text issue detection
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSend, language: selectedLanguage })
      });
      const data = await res.json();
      setIsTyping(false);

      if (data.matchedIssueCode !== "NONE") {
        pushMessage("bot", `🤖 **Semantic Issue Detection Matched!**\n\n${formatIssueResponse(data.issueTitle, data.solution)}`);
        handleIssueMatch(data.matchedIssueCode, data.issueTitle);
      } else {
        const text = selectedLanguage === "en"
          ? "Your issue requires assistance from our support team.\n\nPlease click \"Create Support Ticket\" to continue."
          : selectedLanguage === "hi"
          ? "मैं उस समस्या को हमारे FSM सामान्य समस्याओं के डेटाबेस से नहीं मिला सका। क्या आप सपोर्ट टिकट बनाना चाहेंगे ताकि हमारी टीम सीधे आपकी सहायता कर सके?"
          : selectedLanguage === "mr"
          ? "मी त्या समस्येला आमच्या FSM सामान्य समस्या डेटाबेसशी जुळवू शकलो नाही. आपण सपोर्ट तिकीट तयार करू इच्छिता जेणेकरून आमचे पथक आपल्याला थेट मदत करू शकेल?"
          : "ମୁଁ ସେହି ସମସ୍ୟାକୁ ଆମର FSM ସାଧାରଣ ସମସ୍ୟା ଡାଟାବେସ ସହିତ ମେଳ କରିପାରିଲି ନାହିଁ। ଆପଣ ସପୋର୍ଟ ଟିକେଟ୍ ସୃଷ୍ଟି କରିବାକୁ ଚାହାଁନ୍ତି କି?";
        pushMessage("bot", text);
        setAwaitingFeedback("NONE");
        setFeedbackPrompt(messageToSend);
      }
    } catch (err) {
      console.error("NLP classification fetch error:", err);
      setIsTyping(false);
      pushMessage("bot", "I am currently experiencing connection issues. Please try again or select one of the manual categories below.");
      setShowCategories(true);
    }
  };

  // Image attach screenshot reading
  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Speech Recording handler
  const handleRecordVoice = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onload = async (event) => {
            if (event.target?.result) {
              const base64Audio = (event.target.result as string).split(",")[1];
              setIsTranscribing(true);
              setIsTyping(true);

              try {
                const res = await fetch("/api/voice/transcribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ audioBase64: base64Audio, language: selectedLanguage })
                });
                const data = await res.json();
                setIsTranscribing(false);
                setIsTyping(false);

                if (data.transcription) {
                  setInputText(data.transcription);
                  if (data.detectedLanguage && data.detectedLanguage !== selectedLanguage) {
                    setSelectedLanguage(data.detectedLanguage);
                  }
                }
              } catch (err) {
                console.error("Voice transcription failed:", err);
                setIsTranscribing(false);
                setIsTyping(false);
                pushMessage("bot", "Speech-to-text failed. Please type your issue manually.");
              }
            }
          };
          reader.readAsDataURL(audioBlob);

          // Stop all audio tracks to release the microphone
          stream.getTracks().forEach(track => track.stop());
        };

        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access failed:", err);
        alert("Microphone access permission was denied or is unsupported in this browser frame. Please type your message.");
      }
    }
  };

  // Submit Escalation Ticket Form
  const handleEscalationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmailAddress(escalationDetails.email);
    const phoneError = validateContactNumber(escalationDetails.phone);
    setEscalationErrors({ email: emailError, phone: phoneError });

    if (!escalationDetails.name.trim() || emailError || phoneError) {
      alert(!escalationDetails.name.trim() ? "Please enter your Full Name." : emailError || phoneError);
      return;
    }

    setIsTyping(true);
    setAwaitingEscalationForm(false);

    const completeConversationForTicket = [...messages, { sender: "user" as const, message: `Escalation Details: Name: ${escalationDetails.name}, Phone: ${escalationDetails.phone}, Email: ${escalationDetails.email}, Company: ${escalationDetails.companyName}, Job: ${escalationDetails.designation}. Description: ${escalationDetails.description}`, timestamp: new Date().toISOString() }];

    try {
    const res = await fetch("/api/tickets", {
      method: "POST",
          headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: escalationDetails.name.trim(),
          phone: escalationDetails.phone.trim(),
          email: escalationDetails.email.trim(),
          designation: escalationDetails.designation,
          companyName: escalationDetails.companyName,
          issueCode: awaitingFeedback || "NONE",
          issueTitle: feedbackPrompt || escalationDetails.description || "Unresolved technical issue",
          conversation: completeConversationForTicket,
          language: selectedLanguage,
          sessionId: chatSessionId,
        })
      });

      const newTicket = await parseTicketResponse(res);
      if (!res.ok) {
        throw new Error(newTicket.error || "Failed to create ticket");
      }
      setIsTyping(false);

      // Save ticket in LocalHistory
      const updatedTickets = [newTicket, ...userTickets];
      setUserTickets(updatedTickets);
      localStorage.setItem("pugarch_user_tickets", JSON.stringify(updatedTickets));

      const responseText = selectedLanguage === "en"
        ? `🎉 **Support Ticket Raised Successfully!**\n\n- **Ticket ID:** \`${newTicket.id}\`\n- **Status:** \`${newTicket.status.toUpperCase()}\`\n\nWe have dispatched notification emails to our engineering dispatch hub. A technician will contact you directly at **${newTicket.userPhone}** or **${newTicket.userEmail}** within 1 business day.\n\nYou can track the live status of this ticket anytime in your **Ticket History** (top right icon).`
        : selectedLanguage === "hi"
        ? `🎉 **सहायता टिकट सफलतापूर्वक बनाया गया!**\n\n- **टिकट आईडी:** \`${newTicket.id}\`\n- **स्थिति:** \`${newTicket.status.toUpperCase()}\`\n\nहमने अपने इंजीनियरिंग हब को ईमेल भेज दिया है। एक तकनीशियन 1 कार्य दिवस के भीतर **${newTicket.userPhone}** या **${newTicket.userEmail}** पर आपसे सीधे संपर्क करेगा।\n\nआप किसी भी समय अपने **टिकट इतिहास** (ऊपर दाईं ओर का आइकन) में इस टिकट की स्थिति देख सकते हैं।`
        : selectedLanguage === "mr"
        ? `🎉 **सपोर्ट तिकीट यशस्वीरित्या तयार केले गेले!**\n\n- **तिकीट आयडी:** \`${newTicket.id}\`\n- **स्थिती:** \`${newTicket.status.toUpperCase()}\`\n\nआम्ही आमच्या तंत्रज्ञांना ईमेल पाठवला आहे. १ व्यावसायिक दिवसाच्या आत तंत्रज्ञ आपल्याशी **${newTicket.userPhone}** किंवा **${newTicket.userEmail}** वर थेट संपर्क साधतील.\n\nआपण आपल्या **तिकीट इतिहास** (वरती उजव्या कोपऱ्यातील आयकॉन) मध्ये या तिकिटाची स्थिती कधीही तपासू शकता.`
        : `🎉 **ସପୋର୍ଟ ଟିକେଟ୍ ସଫଳତାର ସହିତ ସୃଷ୍ଟି ହେଲା!**\n\n- **ଟିକେଟ୍ ID:** \`${newTicket.id}\`\n- **ସ୍ଥିତି:** \`${newTicket.status.toUpperCase()}\`\n\nଆମେ ଇଞ୍ଜିନିୟରିଂ ସପୋର୍ଟ ହବ୍‌କୁ ଇମେଲ୍ ପଠାଇଛୁ। ଜଣେ ଟେକ୍ନିସିଆନ୍ ୧ କାର୍ଯ୍ୟଦିବସ ମଧ୍ୟରେ ଆପଣଙ୍କୁ **${newTicket.userPhone}** କିମ୍ବା **${newTicket.userEmail}** ରେ ସିଧାସଳଖ ଯୋଗାଯୋଗ କରିବେ।\n\nଆପଣ ଯେକୌଣସି ସମୟରେ ଆପଣଙ୍କର **ଟିକେଟ୍ ଇତିହାସ** (ଉପର ଡାହାଣ କୋଣରେ ଥିବା ଆଇକନ୍) ରେ ଏହି ଟିକେଟ୍ ର ସ୍ଥିତି ଯାଞ୍ଚ କରିପାରିବେ।`;

      pushMessage("bot", responseText);

      // Reset Form State
      setEscalationDetails({
        name: "",
        email: "",
        phone: "",
        designation: "",
        companyName: "",
        description: ""
      });
      setEscalationErrors({ email: "", phone: "" });
      setCurrentCategory(null);
    } catch (err) {
      console.error("Failed to submit ticket:", err);
      setIsTyping(false);
      pushMessage("bot", getTicketErrorMessage(err));
    }
  };

  return (
    <div id="chatbot-container" className="relative flex h-[100dvh] w-full max-w-full min-w-0 flex-col overflow-hidden overflow-x-hidden bg-slate-50 font-sans shadow-2xl sm:mx-auto sm:max-w-2xl sm:border-x sm:border-slate-200 lg:max-w-3xl xl:max-w-4xl">
      {/* ── Chat Header ── */}
      <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-2 sm:gap-3 border-b border-slate-100 bg-white p-2.5 sm:p-3 lg:p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-base sm:text-lg text-blue-600 border border-blue-200/50 shadow-sm">
            🐾
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-bold tracking-tight text-xs sm:text-sm text-slate-800">{t[selectedLanguage].title}</h1>
            <span className="text-[9px] sm:text-[10px] text-green-500 font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Online Now
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Language Picker */}
          <button 
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800 relative"
            title="Select Language"
            id="lang-selector-btn"
          >
            <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Ticket History */}
          <button 
            onClick={() => {
              setShowHistoryView(true);
              syncUserTicketsWithServer();
            }}
            className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800 relative"
            title="Ticket History"
            id="history-view-btn"
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
            {userTickets.length > 0 && (
              <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full border border-white"></span>
            )}
          </button>

          {/* Secret Admin Button */}
          <button 
            onClick={onAdminLoginClick}
            className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
            title="Admin Login"
            id="admin-login-link"
          >
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* ── Main Chat Area ── */}
      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3 lg:p-4 space-y-3 sm:space-y-4 flex flex-col scroll-smooth bg-[#F0F2F5]">
        {messages.map((msg, index) => {
          const isUser = msg.sender === "user";
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex shrink-0 ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[90%] break-words p-2.5 text-[11px] leading-relaxed shadow-sm sm:max-w-[92%] sm:p-3 sm:text-xs lg:max-w-[85%] lg:p-3.5 lg:text-sm rounded-2xl ${
                  isUser 
                    ? "bg-blue-600 text-white rounded-tr-none" 
                    : "bg-white text-slate-700 rounded-tl-none border border-slate-100/50"
                }`}
              >
                <div className="space-y-2">
                  {msg.type === "image" && msg.mediaUrl && (
                    <img
                      src={msg.mediaUrl}
                      alt={msg.message}
                      className="max-h-64 w-full rounded-xl object-contain"
                    />
                  )}
                  {/* Render Rich Message and markdown-style bold tags */}
                  <div className="whitespace-pre-wrap break-words">
                    {msg.message.split("\n").map((line, lIdx) => {
                      // Quick check for Markdown titles and lists
                      if (line.startsWith("### ")) {
                        return <h3 key={lIdx} className="font-bold text-md mt-1 mb-2 text-slate-900 border-b border-slate-100 pb-1">{line.replace("### ", "")}</h3>;
                      }
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <strong key={lIdx} className="block font-semibold text-slate-950 mt-1">{line.replace(/\*\*/g, "")}</strong>;
                      }
                      // Handle inline bold formatting
                      const parts = line.split(/(\*\*.*?\*\*)/);
                      return (
                        <p key={lIdx} className="mb-1">
                          {parts.map((part, pIdx) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                              return <strong key={pIdx} className="font-bold text-slate-950">{part.replace(/\*\*/g, "")}</strong>;
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>
                </div>
                <span className={`block text-[10px] text-right mt-1.5 ${isUser ? "text-blue-200" : "text-slate-400"}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Categories cards shown interactively */}
        {showCategories && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="shrink-0 bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 space-y-3 shadow-sm overflow-hidden"
          >
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              {t[selectedLanguage].selectIssue}
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-3">
              {categories.map((cat) => {
                let badgeStyle = "bg-blue-50 text-blue-600 border border-blue-100";
                let IconComp = UserIcon;
                
                if (cat.code === "A") {
                  badgeStyle = "bg-blue-50 text-blue-600 border border-blue-100";
                  IconComp = UserIcon;
                } else if (cat.code === "B") {
                  badgeStyle = "bg-orange-50 text-orange-600 border border-orange-100";
                  IconComp = Globe;
                } else if (cat.code === "C") {
                  badgeStyle = "bg-green-50 text-green-600 border border-green-100";
                  IconComp = CheckCircle;
                } else if (cat.code === "D") {
                  badgeStyle = "bg-purple-50 text-purple-600 border border-purple-100";
                  IconComp = AlertTriangle;
                } else if (cat.code === "E") {
                  badgeStyle = "bg-teal-50 text-teal-600 border border-teal-100";
                  IconComp = Briefcase;
                } else {
                  badgeStyle = "bg-slate-50 text-slate-600 border border-slate-200";
                  IconComp = Info;
                }

                return (
                  <button
                    key={cat.code}
                    onClick={() => handleCategorySelect(cat.code)}
                    className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-slate-50 cursor-pointer flex flex-col gap-3 shadow-sm transition-all text-left group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${badgeStyle} transition-transform group-hover:scale-105`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 leading-tight group-hover:text-blue-600 transition-colors">
                      {cat.name[selectedLanguage] || cat.name.en || cat.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Dynamic sub issues rendering based on selected Category */}
        {currentCategory && !hasSelectedSubIssue && !awaitingFeedback && !awaitingEscalationForm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="shrink-0 bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 lg:p-4 space-y-2 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {getCategoryPanelLabel("subProblems")}
              </h4>
              <button 
                onClick={() => setCurrentCategory(null)}
                className="text-xs text-red-500 hover:underline flex items-center gap-1"
              >
                {getCategoryPanelLabel("back")}
              </button>
            </div>
            <div className="space-y-1.5">
              {subIssues[currentCategory]?.map((sub) => (
                <button
                  key={sub.code}
                  onClick={() => handleSubIssueSelect(sub.code)}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs font-medium text-slate-800 flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 break-words">{getSubIssueTitle(sub.code)}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
              <button
                onClick={() => handleCategorySelect("F", getCategoryPanelLabel("notListed"))}
                className="w-full text-left p-3 rounded-xl border border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-xs text-slate-600 flex items-center justify-between gap-2"
              >
                <span className="min-w-0 break-words">{getCategoryPanelLabel("notListed")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Help feedback loops */}
        {awaitingFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 bg-blue-50 border border-blue-100 rounded-2xl p-3 sm:p-4 space-y-3 shadow-sm text-center overflow-hidden"
          >
            {awaitingFeedback === "NONE" ? (
              <>
                <p className="text-sm text-blue-900 font-medium">
                  {selectedLanguage === "en" 
                    ? "Would you like to raise a support ticket?" 
                    : selectedLanguage === "hi" 
                    ? "क्या आप सहायता टिकट बनाना चाहेंगे?" 
                    : selectedLanguage === "mr"
                    ? "आपण सपोर्ट तिकीट तयार करू इच्छिता का?"
                    : "ଆପଣ ଏକ ସପୋର୍ଟ ଟିକେଟ୍ ସୃଷ୍ଟି କରିବାକୁ ଚାହାଁନ୍ତି କି?"}
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleCreateSupportTicket()}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {selectedLanguage === "en" 
                      ? "Create Support Ticket" 
                      : selectedLanguage === "hi" 
                      ? "सपोर्ट टिकट बनाएं" 
                      : selectedLanguage === "mr"
                      ? "सपोर्ट तिकीट तयार करा"
                      : "ସପୋର୍ଟ ଟିକେଟ୍ ସୃଷ୍ଟି କରନ୍ତୁ"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-blue-900 font-medium">{t[selectedLanguage].wasHelpful}</p>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4">
                  <button
                    onClick={() => handleFeedback(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-xs font-semibold transition-transform active:scale-95 shadow-sm"
                  >
                    {t[selectedLanguage].yes}
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-6 py-2 rounded-xl text-xs font-semibold transition-transform active:scale-95 shadow-sm"
                  >
                    {t[selectedLanguage].no}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Dynamic Escalation Ticket Form inside Chat log */}
        {awaitingEscalationForm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="shrink-0 bg-white border border-red-100 rounded-2xl p-3 sm:p-4 space-y-3 shadow-md overflow-hidden"
          >
            <div className="flex items-center gap-2 text-red-600 font-semibold text-sm border-b border-slate-100 pb-2">
              <AlertCircle className="w-4 h-4" />
              {t[selectedLanguage].escalateTitle}
            </div>
            <form onSubmit={handleEscalationSubmit} noValidate className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Full Name *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={escalationDetails.name}
                    onChange={(e) => setEscalationDetails({...escalationDetails, name: e.target.value})}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Contact number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      placeholder="Phone number"
                      value={escalationDetails.phone}
                      onChange={(e) => {
                        const phone = sanitizeContactNumber(e.target.value);
                        setEscalationDetails({...escalationDetails, phone});
                        setEscalationErrors({...escalationErrors, phone: validateContactNumber(phone)});
                      }}
                      className={`w-full text-xs pl-9 pr-3 py-2 border rounded-xl focus:ring-1 focus:ring-slate-900 outline-none ${escalationErrors.phone ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                    />
                  </div>
                  {escalationErrors.phone && <p className="text-[10px] text-red-600 font-semibold">{escalationErrors.phone}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="Email address"
                      value={escalationDetails.email}
                      onChange={(e) => {
                        const email = e.target.value;
                        setEscalationDetails({...escalationDetails, email});
                        setEscalationErrors({...escalationErrors, email: email ? validateEmailAddress(email) : ""});
                      }}
                      className={`w-full text-xs pl-9 pr-3 py-2 border rounded-xl focus:ring-1 focus:ring-slate-900 outline-none ${escalationErrors.email ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                    />
                  </div>
                  {escalationErrors.email && <p className="text-[10px] text-red-600 font-semibold">{escalationErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Designation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Guard, Inspector"
                      value={escalationDetails.designation}
                      onChange={(e) => setEscalationDetails({...escalationDetails, designation: e.target.value})}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Company name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter your security agency/company name"
                    value={escalationDetails.companyName}
                    onChange={(e) => setEscalationDetails({...escalationDetails, companyName: e.target.value})}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Issue description</label>
                <textarea
                  placeholder="Describe what occurred, or leave blank to send chat logs"
                  rows={2}
                  value={escalationDetails.description}
                  onChange={(e) => setEscalationDetails({...escalationDetails, description: e.target.value})}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!isEscalationFormValid}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-[0.98]"
              >
                Submit Support Ticket
              </button>
            </form>
          </motion.div>
        )}

        {/* Loading Visualizer for Transcription/OCR */}
        {isTyping && (
          <div className="flex shrink-0 justify-start">
            <div className="bg-white border border-slate-100/50 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              {isTranscribing 
                ? t[selectedLanguage].transcribing 
                : isAnalyzingImage 
                ? t[selectedLanguage].ocrAnalyzing 
                : "Typing..."}
            </div>
          </div>
        )}

        <div ref={chatEndRef} className="shrink-0" />
      </main>

      {/* Attached Image Preview */}
      {attachedImage && (
        <div className="shrink-0 bg-slate-100 p-2 sm:p-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-4 animate-slideUp">
          <div className="flex min-w-0 items-center gap-2">
            <img src={attachedImage} alt="Attachment" className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-lg border border-slate-300" />
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-800">Screenshot Attached</span>
              <span className="block text-[9px] text-slate-500">Will be analyzed with Vision OCR on send</span>
            </div>
          </div>
          <button 
            onClick={() => setAttachedImage(null)}
            className="p-1 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive Support Information Collection Status Banner */}
      {collectingIssueCode && (
        <div className="shrink-0 bg-blue-50 px-2.5 sm:px-4 py-2 sm:py-2.5 border-t border-blue-100 flex flex-col gap-2 text-[11px] sm:text-xs text-blue-700 font-medium animate-slideUp sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-start gap-1.5">
            <Info className="w-4 h-4 text-blue-500" />
            <span>
              {selectedLanguage === "en" ? "Interactive Ticket Mode" : "इंटरैक्टिव टिकट मोड"} (Step {currentFieldIdx + 1} of {ISSUE_FIELDS[collectingIssueCode]?.length || 0}): <strong>{ISSUE_FIELDS[collectingIssueCode]?.[currentFieldIdx]?.label}</strong>
            </span>
          </span>
          <button 
            onClick={() => {
              setCollectingIssueCode(null);
              setCurrentFieldIdx(0);
              setCollectedData({});
              pushMessage("bot", selectedLanguage === "en" ? "Ticket generation cancelled. How else can I help you?" : "टिकट निर्माण रद्द कर दिया गया। मैं आपकी और क्या मदद कर सकता हूँ?");
            }}
            className="self-start text-red-500 hover:text-red-700 hover:underline font-semibold sm:self-auto"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Chat Input Footer ── */}
      <footer className="z-10 flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 bg-white px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:flex-nowrap sm:px-3 sm:pt-3 sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))] overflow-hidden">
        <form onSubmit={handleSendMessage} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 rounded-full border border-transparent bg-slate-100 px-2.5 py-2 sm:px-3 sm:py-2 lg:px-4 transition-all focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="p-1 text-slate-400 hover:text-blue-600 rounded-full hover:bg-slate-200/50 transition-all"
            title="Attach Screenshot"
            id="attach-screenshot-btn"
          >
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageAttach}
            accept="image/*"
            className="hidden"
          />

          <input
            type="text"
            placeholder={getPlaceholder()}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={awaitingEscalationForm}
            className="min-w-0 flex-1 bg-transparent border-none text-[11px] sm:text-xs outline-none text-slate-800 placeholder-slate-400 disabled:opacity-50"
          />

          {inputText.trim() || attachedImage ? (
            <button
              type="submit"
              className="p-1.5 sm:p-2 bg-blue-600 text-white hover:bg-blue-500 rounded-full transition-all shadow-sm active:scale-95 flex items-center justify-center"
              id="send-msg-btn"
            >
              <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRecordVoice}
              className={`p-1.5 rounded-full transition-all relative ${
                isRecording 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
              title="Voice Speech-to-Text"
              id="voice-mic-btn"
            >
              {isRecording ? <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            </button>
          )}
        </form>

        {/* Secondary Navigation buttons */}
        <button
          onClick={() => {
            setCurrentCategory(null);
            setAwaitingFeedback(null);
            setCollectingIssueCode(null);
            setCurrentFieldIdx(0);
            setCollectedData({});
            setShowCategories(true);
          }}
          className="min-h-9 sm:min-h-10 flex-1 justify-center p-2 px-2.5 sm:px-3 lg:px-4 border border-slate-200 hover:border-blue-500 text-slate-700 font-bold rounded-full hover:bg-slate-50 text-[11px] sm:text-xs transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap sm:flex-none"
          id="menu-toggle-btn"
        >
          Categories
        </button>
      </footer>

      {/* ── Language Overlay Menu ── */}
      <AnimatePresence>
        {showLanguageMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLanguageMenu(false)}
            className="absolute inset-0 bg-black/40 z-30 flex items-end"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[85dvh] overflow-y-auto bg-white rounded-t-3xl p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 shadow-xl border-t border-slate-100"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-slate-500" />
                  Select Language
                </h3>
                <button 
                  onClick={() => setShowLanguageMenu(false)}
                  className="p-1 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:gap-3 pb-3 sm:pb-4 sm:grid-cols-2">
                {[
                  { code: "en", label: "English", sub: "Global Language" },
                  { code: "hi", label: "हिंदी", sub: "Hindi" },
                  { code: "mr", label: "मराठी", sub: "Marathi" },
                  { code: "or", label: "ଓଡ଼ିଆ", sub: "Odia" }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLanguage(lang.code);
                      setShowLanguageMenu(false);
                    }}
                    className={`p-3 text-left rounded-2xl border transition-all ${
                      selectedLanguage === lang.code
                        ? "border-slate-950 bg-slate-50 font-bold"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-sm text-slate-900">{lang.label}</span>
                    <span className="text-[10px] text-slate-500">{lang.sub}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── User Ticket History Sidebar Overlay ── */}
      <AnimatePresence>
        {showHistoryView && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/50 z-40 flex justify-end"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="w-full max-w-full bg-white h-full flex flex-col shadow-2xl sm:max-w-md"
            >
              <div className="sticky top-0 flex items-center justify-between gap-2 bg-slate-900 p-2.5 sm:p-3 lg:p-4 text-white">
                <button 
                  onClick={() => setShowHistoryView(false)}
                  className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Back
                </button>
                <h3 className="min-w-0 truncate font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t[selectedLanguage].historyTitle}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={syncUserTicketsWithServer}
                    disabled={isSyncingTickets}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all disabled:opacity-50"
                    title="Refresh Ticket Statuses"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTickets ? "animate-spin text-emerald-400" : ""}`} />
                  </button>
                  <span className="bg-slate-800 text-[10px] px-2 py-0.5 rounded-full font-mono text-emerald-400">
                    {userTickets.length}
                  </span>
                </div>
              </div>

              {/* Ticket List */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3 lg:p-4 space-y-3 sm:space-y-4 bg-slate-50">
                {userTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                    <History className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">{t[selectedLanguage].noHistory}</p>
                    <p className="text-xs text-slate-400 mt-1">Tickets created here persist in your local storage cache.</p>
                  </div>
                ) : (
                  userTickets.map((t) => (
                    <div 
                      key={t.id}
                      className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 lg:p-4 shadow-sm relative overflow-hidden space-y-3 w-full"
                    >
                      {/* Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <span className="font-mono text-[10px] sm:text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg break-all min-w-0">
                          {t.id}
                        </span>
                        <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          t.status === "closed" 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                            : t.status === "assigned"
                            ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}>
                          {t.status}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Issue Summary</span>
                        <h4 className="text-xs font-bold text-slate-800 break-words">{t.issueTitle}</h4>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 sm:grid-cols-2">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Category</span>
                          <span className="font-medium text-slate-700">{t.category}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Raised Date</span>
                          <span className="font-medium text-slate-700">{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Staff & Resolution details if closed */}
                      {t.status === "closed" && t.resolutionNotes && (
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Resolved Notes
                          </div>
                          <p className="text-emerald-800 text-[11px] leading-relaxed">{t.resolutionNotes}</p>
                          {t.closedAt && (
                            <span className="block text-[9px] text-emerald-600 text-right">
                              Resolved: {new Date(t.closedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      {t.status === "assigned" && t.assignedStaffName && (
                        <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-xs flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          <span className="text-amber-800">Assigned to tech: <strong>{t.assignedStaffName}</strong></span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
