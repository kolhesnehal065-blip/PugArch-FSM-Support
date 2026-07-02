export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  companyName: string;
  createdAt: string;
}

export interface SupportStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface ChatMessage {
  sender: "user" | "bot" | "staff";
  message: string;
  timestamp: string;
  type?: "text" | "image" | "voice";
  mediaUrl?: string;
}

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  category: string;
  issueCode: string;
  issueTitle: string;
  conversation: ChatMessage[];
  status: "pending" | "assigned" | "closed";
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  resolutionNotes: string | null;
  language: string;
  createdAt: string;
  closedAt: string | null;
}

export type ChatbotInteractionEventType = "category_selected" | "subcategory_selected" | "solution_provided";

export interface ChatbotInteraction {
  id: string;
  eventKey: string;
  eventType: ChatbotInteractionEventType;
  category: string;
  issueCode: string | null;
  issueTitle: string;
  userId: string | null;
  sessionId: string;
  language: string;
  ticketCreated: boolean;
  ticketId: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface Issue {
  code: string;
  category: string;
  title: string;
  solution: string;
}
