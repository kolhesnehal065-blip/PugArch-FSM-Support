import React from "react";
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  Paperclip,
  Send,
  ShieldAlert,
  Sliders,
  User as UserIcon,
  UserCheck,
} from "lucide-react";
import { AuditLog, ChatMessage, SupportStaff, Ticket, User } from "../shared/types";

type TicketDetailsPageProps = {
  ticket: Ticket;
  users: User[];
  staff: SupportStaff[];
  auditLogs: AuditLog[];
  techNotesText: string;
  resolutionText: string;
  assigneeId: string;
  isLoading: boolean;
  onBack: () => void;
  onPreviewImage: (url: string | null) => void;
  onTechNotesChange: (value: string) => void;
  onResolutionTextChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onSaveStatus: (status: Ticket["status"], techNotesOverride?: string) => void;
};

function StatusBadge({ status }: { status: Ticket["status"] }) {
  const styles =
    status === "closed"
      ? "bg-green-50 text-green-700 border-green-200"
      : status === "assigned"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide ${styles}`}>
      {status}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-semibold text-slate-800 break-words">{children}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 lg:p-4 shadow-sm">
      <h3 className="mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 border-b border-slate-100 pb-2.5 sm:pb-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function messageLabel(message: ChatMessage, ticket: Ticket) {
  if (message.sender === "user") return "End User";
  if (message.sender === "bot") return "Diagnostics Bot";
  return `Technician: ${ticket.assignedStaffName || "Support staff"}`;
}

export default function TicketDetailsPage({
  ticket,
  users,
  staff,
  auditLogs,
  techNotesText,
  resolutionText,
  assigneeId,
  isLoading,
  onBack,
  onPreviewImage,
  onTechNotesChange,
  onResolutionTextChange,
  onAssigneeChange,
  onSaveStatus,
}: TicketDetailsPageProps) {
  const ticketUser = users.find((u) => u.id === ticket.userId) || {
    name: ticket.userName,
    phone: ticket.userPhone,
    email: ticket.userEmail,
    companyName: "PugArch Diagnostics",
    designation: "End User",
    createdAt: ticket.createdAt,
    id: ticket.userId,
  };
  const attachments = ticket.conversation?.filter((message) => message.type === "image" || message.mediaUrl) || [];
  const ticketLogs = auditLogs.filter((log) => log.action.toLowerCase().includes(ticket.id.toLowerCase()));
  const isClosed = ticket.status === "closed";

  const handleAssignAdmin = () => {
    if (!assigneeId) {
      alert("Select an admin before assigning this ticket.");
      return;
    }

    onSaveStatus("assigned");
  };

  return (
    <div className="min-h-full space-y-3 sm:space-y-4 lg:space-y-5">
      <div className="flex flex-col gap-3 sm:gap-4 rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 lg:p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Back to Tickets
          </button>
          <div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Ticket ID</div>
            <h2 className="break-all font-mono text-sm sm:text-base lg:text-lg font-black text-slate-900">{ticket.id}</h2>
          </div>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-5 xl:grid-cols-3 xl:gap-5">
        <div className="space-y-3 sm:space-y-4 lg:space-y-5 xl:col-span-2">
          <Section title="Ticket Information" icon={<Sliders className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />}>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
              <Field label="Category">{ticket.category || "General"}</Field>
              <Field label="Issue Code"><span className="font-mono">{ticket.issueCode}</span></Field>
              <Field label="Issue Title"><span className="text-sm sm:text-base">{ticket.issueTitle}</span></Field>
              <Field label="Language"><span className="uppercase">{ticket.language}</span></Field>
              <Field label="Created">{formatDate(ticket.createdAt)}</Field>
              <Field label="Closed">{formatDate(ticket.closedAt)}</Field>
            </div>
          </Section>

          <Section title="User Information" icon={<UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />}>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
              <Field label="Full Name">{ticket.userName}</Field>
              <Field label="Contact Number"><span className="font-mono">{ticket.userPhone}</span></Field>
              <Field label="Email"><span className="font-mono text-[10px] sm:text-xs">{ticket.userEmail}</span></Field>
              <Field label="Company">
                <span className="inline-flex items-center gap-1 sm:gap-1.5">
                  <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                  {ticketUser.companyName}
                </span>
              </Field>
              <Field label="Designation">{ticketUser.designation}</Field>
              <Field label="User ID"><span className="font-mono">{ticket.userId}</span></Field>
            </div>
          </Section>

          <Section title="Chat / Conversation History" icon={<Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />}>
            <div className="max-h-[400px] sm:max-h-[540px] space-y-3 sm:space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3 lg:p-4">
              {ticket.conversation?.length ? (
                ticket.conversation.map((message, index) => {
                  const isUser = message.sender === "user";
                  const isBot = message.sender === "bot";
                  return (
                    <div key={`${message.timestamp}-${index}`} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      <div
                        className={`max-w-[95%] sm:max-w-[92%] rounded-2xl p-2.5 sm:p-3 text-[10px] sm:text-xs leading-relaxed shadow-sm ${
                          isUser
                            ? "rounded-tr-none bg-blue-600 text-white"
                            : isBot
                            ? "rounded-tl-none border border-slate-200 bg-white text-slate-800"
                            : "rounded-tl-none border border-violet-200 bg-violet-50 text-violet-900"
                        }`}
                      >
                        <div className={`mb-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${isUser ? "text-blue-100" : isBot ? "text-emerald-600" : "text-violet-600"}`}>
                          {messageLabel(message, ticket)}
                        </div>
                        <p className="whitespace-pre-wrap break-words">{message.message}</p>
                        {message.type === "image" && message.mediaUrl && (
                          <button type="button" className="mt-2 sm:mt-3 block overflow-hidden rounded-lg border border-slate-200 bg-white" onClick={() => onPreviewImage(message.mediaUrl || null)}>
                            <img src={message.mediaUrl} alt="Conversation attachment" referrerPolicy="no-referrer" className="max-h-36 sm:max-h-44 object-contain" />
                          </button>
                        )}
                      </div>
                      <span className="mt-1 px-1 font-mono text-[9px] sm:text-[10px] text-slate-400">{formatDate(message.timestamp)}</span>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 sm:py-10 text-center text-[10px] sm:text-xs font-semibold text-slate-400">No conversation history recorded.</div>
              )}
            </div>
          </Section>

          <Section title="Timeline / Activity Log" icon={<CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />}>
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex gap-2.5 sm:gap-3 text-[10px] sm:text-xs">
                <div className="mt-1 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-blue-600" />
                <div>
                  <div className="font-bold text-slate-800 sm:text-xs">Ticket created</div>
                  <div className="font-mono text-slate-500">{formatDate(ticket.createdAt)}</div>
                </div>
              </div>
              {ticketLogs.map((log) => (
                <div key={log.id} className="flex gap-2.5 sm:gap-3 text-[10px] sm:text-xs">
                  <div className="mt-1 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-slate-300" />
                  <div>
                    <div className="font-bold text-slate-800 sm:text-xs">{log.action}</div>
                    <div className="font-mono text-slate-500">{formatDate(log.timestamp)} by {log.userName}</div>
                  </div>
                </div>
              ))}
              {ticket.closedAt && (
                <div className="flex gap-2.5 sm:gap-3 text-[10px] sm:text-xs">
                  <div className="mt-1 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-green-600" />
                  <div>
                    <div className="font-bold text-slate-800 sm:text-xs">Ticket closed</div>
                    <div className="font-mono text-slate-500">{formatDate(ticket.closedAt)}</div>
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>

        <div className="space-y-3 sm:space-y-4 lg:space-y-5">
          <Section title="Technician Details" icon={<UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />}>
            <div className="space-y-3 sm:space-y-4">
              <Field label="Assigned Technician">{ticket.assignedStaffName || "Unassigned"}</Field>
              <Field label="Technician Status"><StatusBadge status={ticket.status} /></Field>
              <Field label="Resolution Notes">{ticket.resolutionNotes || "No resolution details recorded yet."}</Field>
            </div>
          </Section>

          <Section title="Attachments" icon={<Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />}>
            {attachments.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-400">No attachments uploaded.</div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2">
                {attachments.map((attachment, index) => (
                  <div key={`${attachment.mediaUrl}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <button type="button" onClick={() => onPreviewImage(attachment.mediaUrl || null)} className="block w-full overflow-hidden rounded bg-white">
                      <img src={attachment.mediaUrl} alt={`Attachment ${index + 1}`} referrerPolicy="no-referrer" className="h-20 sm:h-24 w-full object-cover" />
                    </button>
                    <a href={attachment.mediaUrl} download target="_blank" rel="noopener noreferrer" className="mt-1.5 sm:mt-2 inline-flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-bold text-blue-600">
                      <Download className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Internal Notes" icon={<ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />}>
            <textarea
              placeholder="Document private internal diagnostic comments, technician remarks, or troubleshooting notes..."
              rows={4}
              value={techNotesText}
              onChange={(event) => onTechNotesChange(event.target.value)}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3 text-[10px] sm:text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </Section>

          <Section title="Action Buttons" icon={<Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />}>
            <div className="space-y-2.5 sm:space-y-3">
              <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                <label className="space-y-1">
                  <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Assign Admin</span>
                  <select
                    value={assigneeId}
                    onChange={(event) => onAssigneeChange(event.target.value)}
                    disabled={isClosed}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 sm:p-2.5 text-[10px] sm:text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Unassigned</option>
                    {staff.filter((person) => person.status === "active").map((person) => (
                      <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                  </select>
                </label>
                <div className="space-y-1">
                  <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Status</span>
                  <StatusBadge status={ticket.status} />
                </div>
              </div>

              <label className="block space-y-1">
                <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolution Notes</span>
                <textarea
                  placeholder="Add resolution details. This text is emailed directly to the customer as confirmation of issue resolution."
                  rows={3}
                  value={resolutionText}
                  onChange={(event) => onResolutionTextChange(event.target.value)}
                  disabled={isClosed}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 text-[10px] sm:text-xs text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleAssignAdmin}
                  disabled={isLoading || isClosed}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg bg-blue-600 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  Assign Admin
                </button>
                <button
                  type="button"
                  onClick={() => onSaveStatus("closed")}
                  disabled={isLoading || isClosed}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg bg-green-600 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Close Ticket
                </button>
              </div>

              {isClosed && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-2.5 sm:p-3 text-[10px] sm:text-xs font-semibold text-green-700">
                  This ticket is closed. Assignment and close actions are disabled.
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
