import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  LayoutDashboard, 
  Ticket as TicketIcon, 
  Users as UsersIcon, 
  ShieldAlert, 
  FileSpreadsheet, 
  Settings as SettingsIcon, 
  LogOut, 
  Search, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Edit,
  Trash2,
  Mail,
  UserCheck,
  Sliders,
  ChevronRight,
  Database,
  X,
  Filter,
  Calendar,
  Download,
  Menu,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Ticket, User, SupportStaff, AuditLog, ChatbotInteraction } from "../shared/types";
import { ISSUES } from "../shared/issues";
import { sanitizeContactNumber, validateContactNumber, validateEmailAddress } from "../shared/validation";
import TicketDetailsPage from "./TicketDetailsPage";

interface AdminViewProps {
  onLogout: () => void;
}

const TICKET_LIST_STATE_KEY = "pugarch_ticket_list_state";
const ANALYTICS_FILTER_STATE_KEY = "pugarch_analytics_filter_state";
const MAX_CATEGORY_LABEL = 16;
const MAX_TOP_ISSUE_LABEL = 28;
const ANALYTICS_CATEGORIES = [
  "Login & Account",
  "Location, GPS & Geofence",
  "Attendance & Tracking",
  "App Crashes & Performance",
  "Data & Sync",
];
const LANGUAGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
  { value: "or", label: "Odia" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "closed", label: "Closed" },
];
const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "custom", label: "Custom Date Range" },
];
const ISSUE_CATEGORY_BY_PREFIX = Object.values(ISSUES).reduce<Record<string, string>>((acc, issue) => {
  acc[issue.code.charAt(0)] = issue.category;
  return acc;
}, {});
const KNOWN_ISSUE_CATEGORIES = new Set(Object.values(ISSUES).map((issue) => issue.category));

type AnalyticsDateRange = "all" | "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "custom";

type AnalyticsFilters = {
  search: string;
  dateRange: AnalyticsDateRange;
  customStart: string;
  customEnd: string;
  category: string;
  subCategory: string;
  language: string;
  status: Ticket["status"] | "all";
};

const defaultAnalyticsFilters: AnalyticsFilters = {
  search: "",
  dateRange: "all",
  customStart: "",
  customEnd: "",
  category: "all",
  subCategory: "all",
  language: "all",
  status: "all",
};

function truncateAxisLabel(value: string, maxLength: number) {
  if (!value) {
    return "";
  }
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatDailyLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateRangeBounds(range: AnalyticsDateRange, customStart: string, customEnd: string) {
  const now = new Date();
  const today = getStartOfDay(now);
  let start: Date | null = null;
  let end: Date | null = null;

  if (range === "today") {
    start = today;
    end = new Date(today);
    end.setDate(end.getDate() + 1);
  } else if (range === "yesterday") {
    end = today;
    start = new Date(today);
    start.setDate(start.getDate() - 1);
  } else if (range === "last7") {
    start = new Date(today);
    start.setDate(start.getDate() - 6);
  } else if (range === "last30") {
    start = new Date(today);
    start.setDate(start.getDate() - 29);
  } else if (range === "thisMonth") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (range === "lastMonth") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (range === "custom") {
    start = customStart ? getStartOfDay(new Date(customStart)) : null;
    if (customEnd) {
      end = getStartOfDay(new Date(customEnd));
      end.setDate(end.getDate() + 1);
    }
  }

  return { start, end };
}

function isWithinDateRange(createdAt: string, filters: AnalyticsFilters) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return false;
  }

  const { start, end } = getDateRangeBounds(filters.dateRange, filters.customStart, filters.customEnd);
  if (start && created < start) {
    return false;
  }
  if (end && created >= end) {
    return false;
  }
  return true;
}

function normalizeLanguage(language: string | null | undefined) {
  const normalized = (language || "").toLowerCase().trim();
  if (["english", "en-us", "en_in", "en-in"].includes(normalized)) return "en";
  if (["hindi", "hin"].includes(normalized)) return "hi";
  if (["marathi", "ma"].includes(normalized)) return "mr";
  if (["odia", "oriya", "od"].includes(normalized)) return "or";
  return normalized;
}

function matchesLanguage(language: string | null | undefined, selectedLanguage: string) {
  return selectedLanguage === "all" || normalizeLanguage(language) === selectedLanguage;
}

function normalizeAnalyticsCategory(category: string | null | undefined, issueCode?: string | null) {
  const trimmed = (category || "").trim();
  const codePrefix = (issueCode || "").trim().charAt(0).toUpperCase();

  if (codePrefix && ISSUE_CATEGORY_BY_PREFIX[codePrefix]) {
    return ISSUE_CATEGORY_BY_PREFIX[codePrefix];
  }

  if (KNOWN_ISSUE_CATEGORIES.has(trimmed)) {
    return trimmed;
  }

  const prefixedCategory = trimmed.match(/^([A-E])\s*(?:-|—|â€”)\s*(.+)$/i);
  if (prefixedCategory) {
    const prefix = prefixedCategory[1].toUpperCase();
    return ISSUE_CATEGORY_BY_PREFIX[prefix] || prefixedCategory[2].trim();
  }

  return trimmed;
}

function areAnalyticsFiltersDefault(filters: AnalyticsFilters) {
  return (
    filters.search === defaultAnalyticsFilters.search &&
    filters.dateRange === defaultAnalyticsFilters.dateRange &&
    filters.customStart === defaultAnalyticsFilters.customStart &&
    filters.customEnd === defaultAnalyticsFilters.customEnd &&
    filters.category === defaultAnalyticsFilters.category &&
    filters.subCategory === defaultAnalyticsFilters.subCategory &&
    filters.language === defaultAnalyticsFilters.language &&
    filters.status === defaultAnalyticsFilters.status
  );
}

function buildAnalyticsFromSource(tickets: Ticket[], interactions: ChatbotInteraction[], staff: SupportStaff[]) {
  const total = tickets.length;
  const pending = tickets.filter((t) => t.status === "pending").length;
  const assigned = tickets.filter((t) => t.status === "assigned").length;
  const closed = tickets.filter((t) => t.status === "closed").length;

  let closedWithResolutionTime = 0;
  let totalResolutionHours = 0;
  tickets.forEach((t) => {
    if (t.status === "closed" && t.closedAt) {
      const createdTime = new Date(t.createdAt).getTime();
      const closedTime = new Date(t.closedAt).getTime();
      if (!Number.isNaN(createdTime) && !Number.isNaN(closedTime)) {
        totalResolutionHours += (closedTime - createdTime) / (1000 * 60 * 60);
        closedWithResolutionTime++;
      }
    }
  });

  const categoryMap: Record<string, number> = {};
  const statusMap: Record<Ticket["status"], number> = { pending: 0, assigned: 0, closed: 0 };
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
  const eventTypeCounts = { category_selected: 0, subcategory_selected: 0, solution_provided: 0 };
  const dailyChatbotMap: Record<string, number> = {};
  const dailyTicketMap: Record<string, number> = {};

  interactions.forEach((interaction) => {
    const normalizedInteractionCategory = normalizeAnalyticsCategory(interaction.category, interaction.issueCode);

    if (interaction.eventType === "category_selected") {
      eventTypeCounts.category_selected += 1;
      chatbotCategoryMap[normalizedInteractionCategory] = (chatbotCategoryMap[normalizedInteractionCategory] || 0) + 1;
    } else if (interaction.eventType === "subcategory_selected") {
      eventTypeCounts.subcategory_selected += 1;
      const issueKey = interaction.issueCode ? `${interaction.issueCode}::${interaction.issueTitle}` : interaction.issueTitle;
      chatbotSubCategoryMap[issueKey] = (chatbotSubCategoryMap[issueKey] || 0) + 1;
    } else if (interaction.eventType === "solution_provided") {
      eventTypeCounts.solution_provided += 1;
    }

    const searchKey = interaction.issueCode || interaction.issueTitle;
    issueSearchMap[searchKey] = issueSearchMap[searchKey] || {
      name: interaction.issueCode ? `${interaction.issueCode} - ${interaction.issueTitle}` : interaction.issueTitle,
      count: 0,
    };
    issueSearchMap[searchKey].count += 1;

    const dayKey = new Date(interaction.createdAt).toISOString().slice(0, 10);
    dailyChatbotMap[dayKey] = (dailyChatbotMap[dayKey] || 0) + 1;
  });

  tickets.forEach((ticket) => {
    const dayKey = new Date(ticket.createdAt).toISOString().slice(0, 10);
    dailyTicketMap[dayKey] = (dailyTicketMap[dayKey] || 0) + 1;
  });

  const totalChatbotQueries = interactions.length;
  const totalTicketsGenerated = tickets.length;

  return {
    metrics: {
      totalTickets: total,
      pendingTickets: pending,
      activeTickets: assigned,
      closedTickets: closed,
      avgResolutionTimeHrs: closedWithResolutionTime > 0 ? Number((totalResolutionHours / closedWithResolutionTime).toFixed(1)) : 0,
      totalChatbotQueries,
      totalCategoriesSelected: eventTypeCounts.category_selected,
      totalSubCategoriesSelected: eventTypeCounts.subcategory_selected,
      totalSolutionsProvided: eventTypeCounts.solution_provided,
      totalTicketsGenerated,
      ticketConversionRate: totalChatbotQueries > 0 ? Number(((totalTicketsGenerated / totalChatbotQueries) * 100).toFixed(1)) : 0,
    },
    categoryDistribution: Object.keys(categoryMap).map((cat) => ({ name: cat, value: categoryMap[cat] })),
    chatbotCategoryDistribution: Object.keys(chatbotCategoryMap)
      .sort((a, b) => chatbotCategoryMap[b] - chatbotCategoryMap[a])
      .map((cat) => ({ name: cat, value: chatbotCategoryMap[cat] })),
    chatbotSubCategoryDistribution: Object.keys(chatbotSubCategoryMap)
      .sort((a, b) => chatbotSubCategoryMap[b] - chatbotSubCategoryMap[a])
      .map((key) => ({ name: key, value: chatbotSubCategoryMap[key] })),
    topSearchedIssues: Object.values(issueSearchMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((entry) => ({ name: entry.name, value: entry.count })),
    dailyChatbotInteractions: Object.keys(dailyChatbotMap).sort().map((date) => ({ date, interactions: dailyChatbotMap[date] })),
    dailyTicketGeneration: Object.keys(dailyTicketMap).sort().map((date) => ({ date, tickets: dailyTicketMap[date] })),
    statusDistribution: [
      { name: "Pending", value: pending, color: "#EF4444" },
      { name: "Assigned", value: assigned, color: "#F59E0B" },
      { name: "Closed", value: closed, color: "#10B981" },
    ],
    staffLoad: staff.map((s) => ({ name: s.name, tickets: staffLoadMap[s.name] || 0, status: s.status })),
  };
}

function getTicketIdFromPath() {
  const match = window.location.pathname.match(/^\/admin\/tickets\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function AdminView({ onLogout }: AdminViewProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "tickets" | "users" | "staff" | "audit" | "settings">(
    window.location.pathname.startsWith("/admin/tickets") ? "tickets" : "dashboard"
  );
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [ticketDetailId, setTicketDetailId] = useState<string | null>(getTicketIdFromPath);
  const ticketListScrollRef = useRef<HTMLDivElement | null>(null);

  // Live DB states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [staff, setStaff] = useState<SupportStaff[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Filter/Search states
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
  const [ticketDateFilter, setTicketDateFilter] = useState("all");
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilters>(defaultAnalyticsFilters);
  const [userSearch, setUserSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  // Modals / Selection states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [techNotesText, setTechNotesText] = useState("");
  const [techNotes, setTechNotes] = useState<{[key: string]: string}>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState("");

  // Staff CRUD state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<SupportStaff | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "active" as "active" | "inactive"
  });
  const [staffFormErrors, setStaffFormErrors] = useState({
    email: "",
    phone: ""
  });

  // Diagnostics and loading
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const staffEmailError = validateEmailAddress(staffForm.email);
  const staffPhoneError = validateContactNumber(staffForm.phone);
  const isStaffFormValid = Boolean(staffForm.name.trim()) && !staffEmailError && !staffPhoneError;

  // Fetch all DB parameters
  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      const [ticketsRes, usersRes, staffRes, logsRes, analyticsRes] = await Promise.all([
        fetch("/api/tickets").then((r) => r.json()),
        fetch("/api/users").then((r) => r.json()),
        fetch("/api/staff").then((r) => r.json()),
        fetch("/api/audit-logs").then((r) => r.json()),
        fetch("/api/analytics").then((r) => r.json())
      ]);

      setTickets(ticketsRes);
      setUsers(usersRes);
      setStaff(staffRes);
      setAuditLogs(logsRes);
      setAnalytics(analyticsRes);
      console.log("[Analytics] Dashboard data received", {
        categoryRows: analyticsRes?.chatbotCategoryDistribution?.length || 0,
        subCategoryRows: analyticsRes?.chatbotSubCategoryDistribution?.length || 0,
        sourceInteractions: analyticsRes?.sourceData?.interactions?.length || 0,
        metrics: analyticsRes?.metrics,
      });
    } catch (err) {
      console.error("Failed to sync live data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedState = sessionStorage.getItem(TICKET_LIST_STATE_KEY);
    if (!savedState) {
      return;
    }

    try {
      const parsed = JSON.parse(savedState);
      if (typeof parsed.search === "string") setTicketSearch(parsed.search);
      if (typeof parsed.status === "string") setTicketStatusFilter(parsed.status);
      if (typeof parsed.date === "string") setTicketDateFilter(parsed.date);
    } catch (error) {
      console.error("Failed to restore ticket list state:", error);
    }
  }, []);

  useEffect(() => {
    const savedState = sessionStorage.getItem(ANALYTICS_FILTER_STATE_KEY);
    if (!savedState) {
      return;
    }

    try {
      const parsed = JSON.parse(savedState);
      setAnalyticsFilters({
        ...defaultAnalyticsFilters,
        ...parsed,
      });
    } catch (error) {
      console.error("Failed to restore analytics filter state:", error);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      TICKET_LIST_STATE_KEY,
      JSON.stringify({
        search: ticketSearch,
        status: ticketStatusFilter,
        date: ticketDateFilter,
        scrollTop: ticketListScrollRef.current?.scrollTop ?? 0,
      })
    );
  }, [ticketSearch, ticketStatusFilter, ticketDateFilter]);

  useEffect(() => {
    sessionStorage.setItem(ANALYTICS_FILTER_STATE_KEY, JSON.stringify(analyticsFilters));
  }, [analyticsFilters]);

  useEffect(() => {
    const handlePopState = () => {
      const nextTicketId = getTicketIdFromPath();
      setTicketDetailId(nextTicketId);
      if (nextTicketId) {
        setActiveTab("tickets");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (ticketDetailId) {
      const routeTicket = tickets.find((ticket) => ticket.id === ticketDetailId);
      if (routeTicket) {
        hydrateTicketForm(routeTicket);
      }
      return;
    }

    if (activeTab === "tickets") {
      window.setTimeout(() => {
        const savedState = sessionStorage.getItem(TICKET_LIST_STATE_KEY);
        if (!savedState || !ticketListScrollRef.current) {
          return;
        }

        try {
          const parsed = JSON.parse(savedState);
          ticketListScrollRef.current.scrollTop = Number(parsed.scrollTop) || 0;
        } catch {
          ticketListScrollRef.current.scrollTop = 0;
        }
      }, 0);
    }
  }, [activeTab, ticketDetailId, tickets]);

  // Load local technician notes on mount
  useEffect(() => {
    const savedTechNotes = localStorage.getItem("pugarch_tech_notes");
    if (savedTechNotes) {
      try {
        setTechNotes(JSON.parse(savedTechNotes));
      } catch (e) {
        console.error("Failed to load technician notes:", e);
      }
    }
  }, []);

  // Update Ticket (Assign or Close)
  const handleUpdateTicket = async (ticketId: string, statusOverride: Ticket["status"], techNotesOverride?: string) => {
    setIsLoading(true);
    const assigned = staff.find((s) => s.id === assigneeId);
    const nextStatus = statusOverride;
    const nextTechNotes = techNotesOverride ?? techNotesText;
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          assignedStaffId: assigneeId || null,
          assignedStaffName: assigned ? assigned.name : null,
          resolutionNotes: resolutionText || null,
          operatorId: "ADM-999",
          operatorName: "Admin Supervisor"
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        
        // Save technician notes to local dictionary & localStorage
        const updatedTechNotes = { ...techNotes, [ticketId]: nextTechNotes };
        setTechNotes(updatedTechNotes);
        localStorage.setItem("pugarch_tech_notes", JSON.stringify(updatedTechNotes));

        // Refresh local items
        fetchAllData();
        if (updated.emailDispatch?.failed > 0) {
          alert(`Ticket details updated, but ${updated.emailDispatch.failed} email notification(s) failed. Check the server SMTP logs for the exact failure.`);
        } else if (updated.emailDispatch?.attempted > 0) {
          alert("Ticket details updated and dispatch emails accepted by the SMTP server.");
        } else {
          alert("Ticket details updated. No email notifications were required for this change.");
        }
      }
    } catch (err) {
      console.error("Failed to update ticket:", err);
      alert("Error saving ticket changes.");
    } finally {
      setIsLoading(false);
    }
  };

  // Staff CRUD Action
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmailAddress(staffForm.email);
    const phoneError = validateContactNumber(staffForm.phone);
    setStaffFormErrors({ email: emailError, phone: phoneError });

    if (!staffForm.name.trim() || emailError || phoneError) {
      alert(!staffForm.name.trim() ? "Technician Name is required." : emailError || phoneError);
      return;
    }

    try {
      const payload = {
        ...staffForm,
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim()
      };
      let res;
      if (editingStaff) {
        // Edit
        res = await fetch(`/api/staff/${editingStaff.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Create
        res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowStaffModal(false);
        setEditingStaff(null);
        setStaffForm({ name: "", email: "", phone: "", status: "active" });
        setStaffFormErrors({ email: "", phone: "" });
        fetchAllData();
      } else {
        const error = await res.json().catch(() => ({ error: "Failed to save technician." }));
        alert(error.error || "Failed to save technician.");
      }
    } catch (err) {
      console.error("Failed to maintain staff member:", err);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to remove this support technician from the directory?")) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Failed to delete staff:", err);
    }
  };

  // Select ticket and update local state
  const hydrateTicketForm = (t: Ticket) => {
    setSelectedTicket(t);
    setAssigneeId(t.assignedStaffId || "");
    setResolutionText(t.resolutionNotes || "");
    setTechNotesText(techNotes[t.id] || "");
  };

  const saveTicketListState = () => {
    sessionStorage.setItem(
      TICKET_LIST_STATE_KEY,
      JSON.stringify({
        search: ticketSearch,
        status: ticketStatusFilter,
        date: ticketDateFilter,
        scrollTop: ticketListScrollRef.current?.scrollTop ?? 0,
      })
    );
  };

  const handleSelectTicket = (t: Ticket) => {
    hydrateTicketForm(t);
    saveTicketListState();
    const nextPath = `/admin/tickets/${encodeURIComponent(t.id)}`;
    window.history.pushState({ ticketId: t.id }, "", nextPath);
    setTicketDetailId(t.id);
    setActiveTab("tickets");
  };

  const handleBackToTickets = () => {
    window.history.pushState({}, "", "/admin/tickets");
    setTicketDetailId(null);
    setActiveTab("tickets");
  };

  const hasAnalyticsSourceData = Array.isArray(analytics?.sourceData?.interactions);
  const analyticsInteractions = (analytics?.sourceData?.interactions || []) as ChatbotInteraction[];
  const analyticsSubCategoryOptions = useMemo(() => {
    return Object.values(ISSUES)
      .filter((issue) => analyticsFilters.category === "all" || issue.category === analyticsFilters.category)
      .map((issue) => ({ value: issue.code, label: `${issue.code} - ${issue.title}`, category: issue.category }));
  }, [analyticsFilters.category]);

  useEffect(() => {
    if (
      analyticsFilters.subCategory !== "all" &&
      !analyticsSubCategoryOptions.some((option) => option.value === analyticsFilters.subCategory)
    ) {
      setAnalyticsFilters((current) => ({ ...current, subCategory: "all" }));
    }
  }, [analyticsFilters.subCategory, analyticsSubCategoryOptions]);

  const filteredAnalyticsSource = useMemo(() => {
    const searchTerm = analyticsFilters.search.trim().toLowerCase();
    const selectedIssue = analyticsFilters.subCategory !== "all" ? ISSUES[analyticsFilters.subCategory] : null;
    const ticketStatusById = new Map(tickets.map((ticket) => [ticket.id, ticket.status]));

    const ticketMatchesSearch = (ticket: Ticket) => {
      if (!searchTerm) return true;
      return [
        ticket.category,
        ticket.issueCode,
        ticket.issueTitle,
        ticket.id,
      ].some((value) => value.toLowerCase().includes(searchTerm));
    };

    const interactionMatchesSearch = (interaction: ChatbotInteraction) => {
      if (!searchTerm) return true;
      return [
        interaction.category,
        interaction.issueCode || "",
        interaction.issueTitle,
        interaction.ticketId || "",
      ].some((value) => value.toLowerCase().includes(searchTerm));
    };

    const matchesSubCategory = (issueCode: string | null | undefined, issueTitle: string) => {
      if (!selectedIssue) return true;
      return issueCode === selectedIssue.code || issueTitle === selectedIssue.title;
    };

    const filteredTicketRows = tickets.filter((ticket) => {
      return (
        ticketMatchesSearch(ticket) &&
        isWithinDateRange(ticket.createdAt, analyticsFilters) &&
        (analyticsFilters.category === "all" || ticket.category === analyticsFilters.category) &&
        matchesSubCategory(ticket.issueCode, ticket.issueTitle) &&
        matchesLanguage(ticket.language, analyticsFilters.language) &&
        (analyticsFilters.status === "all" || ticket.status === analyticsFilters.status)
      );
    });

    const filteredInteractionRows = analyticsInteractions.filter((interaction) => {
      const linkedTicketStatus = interaction.ticketId ? ticketStatusById.get(interaction.ticketId) : null;
      const normalizedInteractionCategory = normalizeAnalyticsCategory(interaction.category, interaction.issueCode);
      return (
        interactionMatchesSearch(interaction) &&
        isWithinDateRange(interaction.createdAt, analyticsFilters) &&
        (analyticsFilters.category === "all" || normalizedInteractionCategory === analyticsFilters.category) &&
        matchesSubCategory(interaction.issueCode, interaction.issueTitle) &&
        matchesLanguage(interaction.language, analyticsFilters.language) &&
        (analyticsFilters.status === "all" || linkedTicketStatus === analyticsFilters.status)
      );
    });

    return {
      tickets: filteredTicketRows,
      interactions: filteredInteractionRows,
    };
  }, [analyticsFilters, analyticsInteractions, tickets]);

  const filteredAnalytics = useMemo(() => {
    if (!hasAnalyticsSourceData && analytics && areAnalyticsFiltersDefault(analyticsFilters)) {
      return analytics;
    }
    return buildAnalyticsFromSource(filteredAnalyticsSource.tickets, filteredAnalyticsSource.interactions, staff);
  }, [analytics, analyticsFilters, filteredAnalyticsSource.tickets, filteredAnalyticsSource.interactions, hasAnalyticsSourceData, staff]);

  const updateAnalyticsFilter = <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => {
    setAnalyticsFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "category" ? { subCategory: "all" } : {}),
    }));
  };

  const resetAnalyticsFilters = () => setAnalyticsFilters(defaultAnalyticsFilters);

  const activeAnalyticsFilterChips = [
    analyticsFilters.search.trim() ? { key: "search", label: `Search: ${analyticsFilters.search.trim()}`, onRemove: () => updateAnalyticsFilter("search", "") } : null,
    analyticsFilters.dateRange !== "all" ? { key: "dateRange", label: DATE_RANGE_OPTIONS.find((item) => item.value === analyticsFilters.dateRange)?.label || "Date Range", onRemove: () => updateAnalyticsFilter("dateRange", "all") } : null,
    analyticsFilters.category !== "all" ? { key: "category", label: analyticsFilters.category, onRemove: () => updateAnalyticsFilter("category", "all") } : null,
    analyticsFilters.subCategory !== "all" ? { key: "subCategory", label: analyticsSubCategoryOptions.find((item) => item.value === analyticsFilters.subCategory)?.label || analyticsFilters.subCategory, onRemove: () => updateAnalyticsFilter("subCategory", "all") } : null,
    analyticsFilters.language !== "all" ? { key: "language", label: LANGUAGE_OPTIONS.find((item) => item.value === analyticsFilters.language)?.label || analyticsFilters.language, onRemove: () => updateAnalyticsFilter("language", "all") } : null,
    analyticsFilters.status !== "all" ? { key: "status", label: STATUS_OPTIONS.find((item) => item.value === analyticsFilters.status)?.label || analyticsFilters.status, onRemove: () => updateAnalyticsFilter("status", "all") } : null,
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  // Dynamic metrics helpers
  const metrics = analytics ? filteredAnalytics.metrics : {
    totalTickets: 0,
    pendingTickets: 0,
    activeTickets: 0,
    closedTickets: 0,
    avgResolutionTimeHrs: 0.0,
    totalChatbotQueries: 0,
    totalCategoriesSelected: 0,
    totalSubCategoriesSelected: 0,
    totalSolutionsProvided: 0,
    totalTicketsGenerated: 0,
    ticketConversionRate: 0,
  };

  const pieColors = ["#EF4444", "#F59E0B", "#10B981"];
  const maxStaffTickets = Math.max(1, ...(filteredAnalytics.staffLoad?.map((item: any) => item.tickets || 0) || [1]));

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = 
      t.id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.userName.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.userPhone.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.issueTitle.toLowerCase().includes(ticketSearch.toLowerCase());
    
    const matchesStatus = ticketStatusFilter === "all" || t.status === ticketStatusFilter;
    
    let matchesDate = true;
    if (ticketDateFilter !== "all") {
      const ticketDate = new Date(t.createdAt);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (ticketDateFilter === "today") {
        matchesDate = ticketDate >= startOfToday;
      } else if (ticketDateFilter === "week") {
        const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = ticketDate >= sevenDaysAgo;
      } else if (ticketDateFilter === "month") {
        const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = ticketDate >= thirtyDaysAgo;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Filtered Users (Search by Email first, Phone second)
  const filteredUsers = users.filter((u) => {
    return (
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch)
    );
  });

  // Filtered Staff
  const filteredStaff = staff.filter((s) => {
    return s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.email.toLowerCase().includes(staffSearch.toLowerCase());
  });

  const currentTicketDetail = ticketDetailId
    ? selectedTicket?.id === ticketDetailId
      ? selectedTicket
      : tickets.find((ticket) => ticket.id === ticketDetailId) || null
    : null;

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setTicketDetailId(null);
    setIsMobileNavOpen(false);
    if (tab === "tickets") {
      window.history.pushState({}, "", "/admin/tickets");
    } else if (window.location.pathname.startsWith("/admin/tickets")) {
      window.history.pushState({}, "", "/admin");
    }
  };

  const previewModal = previewImage && (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl flex flex-col">
        <button 
          onClick={() => setPreviewImage(null)} 
          className="absolute top-4 right-4 bg-slate-900/60 hover:bg-slate-900/80 text-white p-1.5 rounded-full z-10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-4 flex items-center justify-center bg-slate-50 min-h-[300px]">
          <img src={previewImage} alt="Attachment Preview" referrerPolicy="no-referrer" className="max-h-[65vh] object-contain rounded-lg shadow-inner" />
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white">
          <span className="text-xs text-slate-500 font-mono truncate max-w-[70%]">{previewImage}</span>
          <a 
            href={previewImage} 
            download 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download Image
          </a>
        </div>
      </div>
    </div>
  );

  if (ticketDetailId) {
    return (
      <div className="min-h-[100dvh] overflow-x-hidden bg-slate-100 p-3 text-slate-800 sm:p-6">
        <div className="mx-auto max-w-7xl">
          {currentTicketDetail ? (
            <TicketDetailsPage
              ticket={currentTicketDetail}
              users={users}
              staff={staff}
              auditLogs={auditLogs}
              techNotesText={techNotesText}
              resolutionText={resolutionText}
              assigneeId={assigneeId}
              isLoading={isLoading}
              onBack={handleBackToTickets}
              onPreviewImage={setPreviewImage}
              onTechNotesChange={setTechNotesText}
              onResolutionTextChange={setResolutionText}
              onAssigneeChange={setAssigneeId}
              onSaveStatus={(status, notes) => handleUpdateTicket(currentTicketDetail.id, status, notes)}
            />
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8">
              <button
                type="button"
                onClick={handleBackToTickets}
                className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                Back to Tickets
              </button>
              <h2 className="text-lg font-black text-slate-900">Ticket not found</h2>
              <p className="mt-1 text-sm text-slate-500">The selected ticket is unavailable or still loading.</p>
            </div>
          )}
        </div>
        {previewModal}
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-slate-100 text-slate-800 overflow-hidden font-sans">
      {/* ── Admin Sidebar Navigation ── */}
      {isMobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 max-w-[85vw] shrink-0 transform flex-col justify-between border-r border-slate-800 bg-slate-950 transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div>
          {/* Logo Brand */}
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-md shadow-md">
              FSM
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white">PugArch Admin</h1>
              <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">FSM Support Hub</span>
            </div>
          </div>
 
          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            {[
              { id: "dashboard", label: "Analytics Dashboard", icon: LayoutDashboard },
              { id: "tickets", label: "Support Tickets", icon: TicketIcon },
              { id: "users", label: "User Database", icon: UsersIcon },
              { id: "staff", label: "Support Technicians", icon: ShieldAlert },
              { id: "audit", label: "Security Audit Logs", icon: FileSpreadsheet },
              { id: "settings", label: "Diagnostic Settings", icon: SettingsIcon }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    activeTab === item.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
 
        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold">
              SK
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-200">Snehal Kolhe</span>
              <span className="block text-[9px] text-slate-500 font-mono">Supervisor Admin</span>
            </div>
          </div>
 
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            id="admin-logout-btn"
          >
            <LogOut className="w-4 h-4" />
            Logout to Client Chat
          </button>
        </div>
      </aside>
 
      {/* ── Main Workspace panel ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-100 overflow-hidden">
        {/* Workspace Header */}
        <header className="min-h-14 sm:min-h-16 border-b border-slate-200 bg-white px-2.5 sm:px-3 py-2.5 sm:py-3 shadow-sm sm:px-6 sm:py-0">
          <div className="flex flex-col gap-2 sm:gap-3 sm:h-14 sm:h-16 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <h2 className="font-bold text-sm sm:text-md capitalize tracking-tight text-slate-800">{activeTab} Panel</h2>
            {isRefreshing ? (
              <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                Syncing database...
              </span>
            ) : (
              <button 
                onClick={fetchAllData}
                className="text-[10px] sm:text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-all"
                title="Refresh database"
              >
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Synced live
              </button>
            )}
          </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-mono sm:text-right">
              System time: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </header>

        {/* Dynamic Inner Panel Viewports */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3 lg:p-4 lg:p-6">
          <AnimatePresence mode="wait">
            
            {/* ── TAB 1: DASHBOARD & RECHARTS ── */}
            {activeTab === "dashboard" && (
              <div className="space-y-4 sm:space-y-5 lg:space-y-6 min-w-0">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4 lg:p-5">
                  <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                        <Filter className="h-4 w-4 text-blue-600" />
                        Search & Filter
                      </h3>
                      <p className="mt-1 text-[10px] font-semibold text-slate-400 sm:text-xs">
                        {filteredAnalyticsSource.tickets.length} matching tickets | {filteredAnalyticsSource.interactions.length} matching interaction records
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetAnalyticsFilters}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] font-bold uppercase tracking-wide text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reset Filters
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-6">
                    <div className="relative md:col-span-2 xl:col-span-2">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={analyticsFilters.search}
                        onChange={(event) => updateAnalyticsFilter("search", event.target.value)}
                        placeholder="Search category, sub-category, code, title, ticket ID..."
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <select
                      value={analyticsFilters.dateRange}
                      onChange={(event) => updateAnalyticsFilter("dateRange", event.target.value as AnalyticsDateRange)}
                      className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    >
                      {DATE_RANGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>

                    <select
                      value={analyticsFilters.category}
                      onChange={(event) => updateAnalyticsFilter("category", event.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="all">All Categories</option>
                      {ANALYTICS_CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>

                    <select
                      value={analyticsFilters.subCategory}
                      onChange={(event) => updateAnalyticsFilter("subCategory", event.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="all">All Sub-categories</option>
                      {analyticsSubCategoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>

                    <select
                      value={analyticsFilters.language}
                      onChange={(event) => updateAnalyticsFilter("language", event.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>

                    <select
                      value={analyticsFilters.status}
                      onChange={(event) => updateAnalyticsFilter("status", event.target.value as AnalyticsFilters["status"])}
                      className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {analyticsFilters.dateRange === "custom" && (
                    <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:max-w-xl">
                      <input
                        type="date"
                        value={analyticsFilters.customStart}
                        onChange={(event) => updateAnalyticsFilter("customStart", event.target.value)}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                      <input
                        type="date"
                        value={analyticsFilters.customEnd}
                        onChange={(event) => updateAnalyticsFilter("customEnd", event.target.value)}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  )}

                  {activeAnalyticsFilterChips.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeAnalyticsFilterChips.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={chip.onRemove}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100"
                          title={`Remove ${chip.label}`}
                        >
                          <span className="truncate">{chip.label}</span>
                          <X className="h-3 w-3 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metric Summary Grid */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:gap-4">
                  {[
                    { label: "Total Tickets", val: metrics.totalTickets, icon: TicketIcon, textStyle: "text-slate-800" },
                    { label: "Pending", val: metrics.pendingTickets, icon: AlertTriangle, textStyle: "text-red-600" },
                    { label: "In Investigation", val: metrics.activeTickets, icon: Clock, textStyle: "text-amber-600" },
                    { label: "Closed / Resolved", val: metrics.closedTickets, icon: CheckCircle2, textStyle: "text-green-600" },
                    { label: "Avg Resolution Time", val: `${metrics.avgResolutionTimeHrs}h`, icon: Sliders, textStyle: "text-slate-800" },
                    { label: "Ticket Conversion Rate", val: `${metrics.ticketConversionRate}%`, icon: CheckCircle, textStyle: "text-blue-700" }
                  ].map((stat, i) => {
                    const StatIcon = stat.icon;
                    return (
                      <div key={i} className="bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl flex min-h-[92px] items-center justify-between gap-2 sm:gap-3 shadow-sm">
                        <div className="min-w-0">
                          <span className="block text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 leading-3">{stat.label}</span>
                          <span className={`block text-lg sm:text-xl font-extrabold tracking-tight ${stat.textStyle} break-words leading-none`}>{stat.val}</span>
                        </div>
                        <StatIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 opacity-80" />
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
                  {[
                    { label: "Total Chatbot Queries", val: metrics.totalChatbotQueries, icon: Search, textStyle: "text-slate-800" },
                    { label: "Total Categories Selected", val: metrics.totalCategoriesSelected, icon: LayoutDashboard, textStyle: "text-blue-700" },
                    { label: "Total Sub-categories Selected", val: metrics.totalSubCategoriesSelected, icon: ChevronRight, textStyle: "text-indigo-700" },
                    { label: "Total AI Solutions Provided", val: metrics.totalSolutionsProvided, icon: CheckCircle2, textStyle: "text-emerald-700" },
                    { label: "Total Tickets Raised", val: metrics.totalTicketsGenerated, icon: TicketIcon, textStyle: "text-slate-800" }
                  ].map((stat, i) => {
                    const StatIcon = stat.icon;
                    return (
                      <div key={i} className="bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl flex min-h-[92px] items-center justify-between gap-2 sm:gap-3 shadow-sm">
                        <div className="min-w-0">
                          <span className="block text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 leading-3">{stat.label}</span>
                          <span className={`block text-lg sm:text-xl font-extrabold tracking-tight ${stat.textStyle} break-words leading-none`}>{stat.val}</span>
                        </div>
                        <StatIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 opacity-80" />
                      </div>
                    );
                  })}
                </div>

                {/* Live Charts Dashboard using Recharts */}
                <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2 xl:gap-6 min-w-0">
                  {/* Category Distribution Bar Chart */}
                  <div className="bg-white border border-slate-200/80 p-3 sm:p-4 lg:p-5 rounded-2xl shadow-sm min-w-0 overflow-hidden">
                    <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-700 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                      <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      Incoming Issues by Category
                    </h3>
                    <div className="h-72 sm:h-80">
                      {filteredAnalytics.categoryDistribution?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={filteredAnalytics.categoryDistribution} layout="vertical" margin={{ top: 8, right: 18, left: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={170}
                              stroke="#64748B"
                              fontSize={10}
                              tickLine={false}
                              interval={0}
                              tickFormatter={(value) => truncateAxisLabel(String(value), MAX_CATEGORY_LABEL)}
                            />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px" }} />
                            <Bar dataKey="value" name="Tickets" fill="#2563EB" radius={[0, 8, 8, 0]} barSize={18} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400">No ticket category statistics recorded yet.</div>
                      )}
                    </div>
                  </div>

                  {/* Ticket Status Distribution Pie Chart */}
                  <div className="bg-white border border-slate-200/80 p-3 sm:p-4 lg:p-5 rounded-2xl shadow-sm min-w-0 overflow-hidden">
                    <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-700 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                      <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      Operational Resolution Statuses
                    </h3>
                    <div className="min-h-72 sm:min-h-80 flex items-center">
                      {filteredAnalytics.statusDistribution?.some((entry: any) => entry.value > 0) ? (
                        <div className="w-full flex flex-col gap-4 xl:flex-row">
                          <div className="h-56 w-full xl:h-72 xl:w-[68%]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={filteredAnalytics.statusDistribution}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={58}
                                  outerRadius={86}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {filteredAnalytics.statusDistribution.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex w-full flex-col justify-center gap-2 xl:w-[32%] xl:pl-2">
                            {filteredAnalytics.statusDistribution.map((entry: any, index: number) => (
                              <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] sm:text-xs">
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: pieColors[index] }}></span>
                                  <span className="min-w-0 truncate font-semibold text-slate-700">{entry.name}</span>
                                </span>
                                <span className="font-mono text-slate-500">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-500">No status metrics compiled.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2 xl:gap-6 min-w-0">
                  <div className="bg-white border border-slate-200/80 p-3 sm:p-4 lg:p-5 rounded-2xl shadow-sm min-w-0 overflow-hidden">
                    <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-700 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                      <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      Category-wise Query Count
                    </h3>
                    <div className="h-72 sm:h-80">
                      {filteredAnalytics.chatbotCategoryDistribution?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={filteredAnalytics.chatbotCategoryDistribution} layout="vertical" margin={{ top: 8, right: 18, left: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={190}
                              stroke="#64748B"
                              fontSize={10}
                              tickLine={false}
                              interval={0}
                              tickFormatter={(value) => truncateAxisLabel(String(value), MAX_CATEGORY_LABEL)}
                            />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px" }} />
                            <Bar dataKey="value" name="Queries" fill="#2563EB" radius={[0, 8, 8, 0]} barSize={18} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400">No chatbot category metrics recorded yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-3 sm:p-4 lg:p-5 rounded-2xl shadow-sm min-w-0 overflow-hidden">
                    <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-700 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      Sub-category-wise Query Count
                    </h3>
                    <div className="h-[26rem] sm:h-[30rem]">
                      {filteredAnalytics.chatbotSubCategoryDistribution?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={filteredAnalytics.chatbotSubCategoryDistribution} layout="vertical" margin={{ top: 8, right: 20, left: 12, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={240}
                              stroke="#64748B"
                              fontSize={10}
                              tickLine={false}
                              interval={0}
                              tickFormatter={(value) => truncateAxisLabel(String(value), MAX_TOP_ISSUE_LABEL)}
                            />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px" }} />
                            <Bar dataKey="value" name="Queries" fill="#0F766E" radius={[0, 8, 8, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400">No sub-category metrics recorded yet.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2 xl:gap-6 min-w-0">
                  <div className="bg-white border border-slate-200/80 p-3 sm:p-4 lg:p-5 rounded-2xl shadow-sm min-w-0 overflow-hidden">
                    <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-700 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      Daily Chatbot Interactions
                    </h3>
                    <div className="h-72 sm:h-80">
                      {filteredAnalytics.dailyChatbotInteractions?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={filteredAnalytics.dailyChatbotInteractions} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="chatbotAreaFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} tickFormatter={formatDailyLabel} interval="preserveStartEnd" />
                            <YAxis stroke="#64748B" fontSize={11} width={36} />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px" }} labelFormatter={formatDailyLabel} />
                            <Area type="monotone" dataKey="interactions" name="Interactions" stroke="#7C3AED" fill="url(#chatbotAreaFill)" strokeWidth={2.5} dot={{ r: 3, fill: "#7C3AED", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400">No daily interaction data recorded yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-3 sm:p-4 lg:p-5 rounded-2xl shadow-sm min-w-0 overflow-hidden">
                    <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-700 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                      <TicketIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      Daily Ticket Generation
                    </h3>
                    <div className="h-72 sm:h-80">
                      {filteredAnalytics.dailyTicketGeneration?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={filteredAnalytics.dailyTicketGeneration} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} tickFormatter={formatDailyLabel} interval="preserveStartEnd" />
                            <YAxis stroke="#64748B" fontSize={11} width={36} />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px" }} labelFormatter={formatDailyLabel} />
                            <Line type="monotone" dataKey="tickets" name="Tickets" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 3, fill: "#DC2626", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400">No daily ticket data recorded yet.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 p-3 sm:p-4 lg:p-5 rounded-2xl shadow-sm min-w-0 overflow-hidden">
                  <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-700 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                    Top 10 Most Searched Issues
                  </h3>
                  <div className="h-[26rem] sm:h-[30rem]">
                    {filteredAnalytics.topSearchedIssues?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredAnalytics.topSearchedIssues} layout="vertical" margin={{ top: 8, right: 20, left: 12, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={300}
                            stroke="#64748B"
                            fontSize={10}
                            tickLine={false}
                            interval={0}
                            tickFormatter={(value) => truncateAxisLabel(String(value), MAX_TOP_ISSUE_LABEL)}
                          />
                          <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px" }} />
                          <Bar dataKey="value" name="Searches" fill="#2563EB" radius={[0, 8, 8, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">No searched issue data recorded yet.</div>
                    )}
                  </div>
                </div>

                {/* Bottom Staff Load list */}
                <div className="bg-white border border-slate-200/80 p-3 sm:p-4 lg:p-5 rounded-2xl shadow-sm min-w-0">
                  <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-700 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                    <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                    Support Engineer Dispatch & Load Balancing
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
                    {filteredAnalytics.staffLoad?.map((staffItem: any, index: number) => (
                      <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="block truncate text-[10px] sm:text-xs font-bold text-slate-800">{staffItem.name}</span>
                            <span className="mt-0.5 block text-[9px] sm:text-[10px] uppercase font-mono text-slate-400">Status: {staffItem.status}</span>
                          </div>
                          <div className="rounded-xl bg-white px-2.5 py-1.5 text-right shadow-sm">
                            <span className="block text-base sm:text-lg font-black text-blue-600 leading-none">{staffItem.tickets}</span>
                            <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">Tickets</span>
                          </div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                            style={{ width: `${Math.max(8, (staffItem.tickets / maxStaffTickets) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: TICKETS LIST ── */}
            {activeTab === "tickets" && (
              <div className="h-[calc(100dvh-8rem)] min-h-[24rem] sm:h-[calc(100dvh-9rem)] sm:min-h-[28rem]">
                {/* Tickets list panel */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 lg:p-4 flex flex-col shadow-sm overflow-hidden h-full">
                  <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="flex flex-col gap-1.5 sm:gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-bold text-xs sm:text-sm tracking-tight text-slate-800 flex items-center gap-1.5 sm:gap-2">
                        <TicketIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                        Live Support Ticket Queues
                      </h3>
                      <span className="text-[9px] sm:text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                        {filteredTickets.length} of {tickets.length} tickets
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      {/* Search bar */}
                      <div className="relative min-w-full flex-1 sm:min-w-[180px] lg:min-w-[220px]">
                        <Search className="absolute left-2.5 sm:left-3 top-2 sm:top-2.5 w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search ID, User Name, Contact..."
                          value={ticketSearch}
                          onChange={(e) => setTicketSearch(e.target.value)}
                          className="w-full text-[11px] sm:text-xs pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
                        />
                      </div>

                      {/* Status Filter */}
                      <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-2.5 py-0.5 sm:py-1">
                        <Filter className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />
                        <select
                          value={ticketStatusFilter}
                          onChange={(e) => setTicketStatusFilter(e.target.value)}
                          className="text-[10px] sm:text-[11px] bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer pr-1"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="assigned">Assigned</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      {/* Date Filter */}
                      <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-2.5 py-0.5 sm:py-1">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />
                        <select
                          value={ticketDateFilter}
                          onChange={(e) => setTicketDateFilter(e.target.value)}
                          className="text-[10px] sm:text-[11px] bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer pr-1"
                        >
                          <option value="all">All Dates</option>
                          <option value="today">Today</option>
                          <option value="week">Last 7 Days</option>
                          <option value="month">Last 30 Days</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* High Density Scrollable Table List */}
                  <div ref={ticketListScrollRef} className="flex-1 overflow-auto rounded-xl border border-slate-100 bg-slate-50/50">
                    <table className="w-full min-w-[600px] sm:min-w-[760px] border-collapse text-left text-[10px] sm:text-xs">
                      <thead className="sticky top-0 bg-slate-100 text-slate-500 font-bold uppercase text-[8px] sm:text-[9px] tracking-wider border-b border-slate-200 shadow-sm z-10">
                        <tr>
                          <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-center w-10 sm:w-12">SR. No.</th>
                          <th className="py-2 sm:py-2.5 px-2 sm:px-3 w-16 sm:w-20 text-slate-600">Ticket ID</th>
                          <th className="py-2 sm:py-2.5 px-2 sm:px-3">User Name</th>
                          <th className="py-2 sm:py-2.5 px-2 sm:px-3">Contact Number</th>
                          <th className="py-2 sm:py-2.5 px-2 sm:px-3">Issue Title</th>
                          <th className="py-2 sm:py-2.5 px-2 sm:px-3 w-20 sm:w-24">Created Date</th>
                          <th className="py-2 sm:py-2.5 px-2 sm:px-3 w-16 sm:w-20">Status</th>
                          <th className="py-2 sm:py-2.5 px-2 sm:px-3 w-24 sm:w-28 hidden sm:table-cell">Assigned Technician</th>
                          <th className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-center w-6 sm:w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredTickets.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-10 sm:py-12 text-center text-slate-400">
                              <TicketIcon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-slate-300" />
                              <span className="text-[10px] sm:text-xs">No support tickets match these parameters.</span>
                            </td>
                          </tr>
                        ) : (
                          filteredTickets.map((t, idx) => (
                            <tr
                              key={t.id}
                              onClick={() => handleSelectTicket(t)}
                              className="hover:bg-slate-50/80 cursor-pointer transition-all text-slate-700"
                            >
                              <td className="py-1 sm:py-1.5 px-2 sm:px-3 text-center font-mono text-[9px] sm:text-[10px] text-slate-400 border-r border-slate-100/60">
                                {idx + 1}
                              </td>
                              <td className="py-1 sm:py-1.5 px-2 sm:px-3 font-mono text-[10px] sm:text-[11px] font-bold text-blue-600">
                                {t.id}
                              </td>
                              <td className="py-1 sm:py-1.5 px-2 sm:px-3 font-semibold text-slate-800">
                                {t.userName}
                              </td>
                              <td className="py-1 sm:py-1.5 px-2 sm:px-3 text-slate-500 font-mono text-[10px] sm:text-[11px]">
                                {t.userPhone}
                              </td>
                              <td className="py-1 sm:py-1.5 px-2 sm:px-3">
                                <div className="max-w-[120px] sm:max-w-[150px] truncate font-semibold text-slate-800" title={t.issueTitle}>
                                  {t.issueTitle}
                                </div>
                              </td>
                              <td className="py-1 sm:py-1.5 px-2 sm:px-3 text-slate-500 font-mono text-[10px] sm:text-[11px]">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-1 sm:py-1.5 px-2 sm:px-3">
                                <span className={`inline-block text-[8px] sm:text-[9px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full uppercase ${
                                  t.status === "closed"
                                    ? "bg-green-50 text-green-700 border border-green-200/50"
                                    : t.status === "assigned"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                                    : "bg-red-50 text-red-700 border border-red-200/50"
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-1 sm:py-1.5 px-2 sm:px-3 font-semibold text-slate-700 hidden sm:table-cell">
                                {t.assignedStaffName || (
                                  <span className="text-slate-400 font-normal italic text-[10px]">Unassigned</span>
                                )}
                              </td>
                              <td className="py-1 sm:py-1.5 px-1 sm:px-1.5 sm:px-2 text-center">
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 inline" />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 3: USER DATABASE SEARCH ── */}
            {activeTab === "users" && (
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm space-y-3 sm:space-y-4">
                <div className="flex flex-col gap-2 sm:gap-3 border-b border-slate-100 pb-3 sm:pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-bold text-xs sm:text-sm tracking-tight text-slate-700">Registered End Users Directory</h3>
                  <div className="relative w-full sm:w-60 lg:w-72">
                    <Search className="absolute left-2.5 sm:left-3 top-2 sm:top-2.5 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or contact..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full text-[11px] sm:text-xs pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] sm:min-w-[720px] text-left text-[10px] sm:text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[8px] sm:text-[10px] font-bold">
                        <th className="py-2 sm:py-3 px-2 sm:px-4">User ID</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Full Name</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Contact Credentials</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Company Designation</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Linked Tickets</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4 text-right hidden sm:table-cell">Register Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const linked = tickets.filter(t => t.userId === u.id);
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 font-mono text-blue-600 font-semibold text-[10px] sm:text-xs">{u.id}</td>
                            <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 font-bold text-slate-800 text-[10px] sm:text-xs">{u.name}</td>
                            <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 space-y-0.5">
                              <span className="block text-slate-700 font-semibold text-[10px] sm:text-xs">{u.email}</span>
                              <span className="block text-[9px] sm:text-[10px] text-slate-400 font-mono">{u.phone}</span>
                            </td>
                            <td className="py-2.5 sm:py-3.5 px-2 sm:px-4">
                              <span className="block text-slate-700 font-semibold text-[10px] sm:text-xs">{u.companyName}</span>
                              <span className="block text-[9px] sm:text-[10px] text-slate-400">{u.designation}</span>
                            </td>
                            <td className="py-2.5 sm:py-3.5 px-2 sm:px-4">
                              <span className="bg-slate-100 text-slate-600 border border-slate-200/60 px-2 sm:px-2.5 py-0.5 rounded-full font-bold text-[10px] sm:text-xs">
                                {linked.length} Tickets
                              </span>
                            </td>
                            <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-right text-slate-400 font-mono text-[10px] sm:text-xs hidden sm:table-cell">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 4: SUPPORT STAFF CRUD ── */}
            {activeTab === "staff" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white border border-slate-200/80 p-3 sm:p-4 lg:p-5 rounded-xl shadow-sm flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm tracking-tight text-slate-700">Support Technicians Directory</h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1">Manage, activate, or register support engineers eligible for ticket dispatch routing.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingStaff(null);
                      setStaffForm({ name: "", email: "", phone: "", status: "active" });
                      setStaffFormErrors({ email: "", phone: "" });
                      setShowStaffModal(true);
                    }}
                    className="w-full justify-center bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold shadow-md flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 sm:w-auto"
                    id="add-staff-btn"
                  >
                    <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Register New Technician
                  </button>
                </div>

                {/* Staff list */}
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
                  {filteredStaff.map((s) => (
                    <div key={s.id} className="bg-white border border-slate-200 p-3 sm:p-4 lg:p-5 rounded-xl shadow-sm space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded">
                          {s.id}
                        </span>
                        <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full capitalize ${
                          s.status === "active" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
                        }`}>
                          {s.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-800">{s.name}</h4>
                        <div className="space-y-0.5 text-[10px] sm:text-xs text-slate-500">
                          <span className="flex items-center gap-1.5 sm:gap-2">
                            <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                            {s.email}
                          </span>
                          <span className="flex items-center gap-1.5 sm:gap-2 font-mono">
                            <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                            {s.phone}
                          </span>
                        </div>
                      </div>

                      {/* CRUD controls */}
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2 border-t border-slate-100 pt-2.5 sm:pt-3">
                        <button
                          onClick={() => {
                            setEditingStaff(s);
                            setStaffForm({
                              name: s.name,
                              email: s.email,
                              phone: s.phone,
                              status: s.status
                            });
                            setStaffFormErrors({ email: "", phone: "" });
                            setShowStaffModal(true);
                          }}
                          className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                          title="Edit Staff Parameters"
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(s.id)}
                          className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                          title="Remove Technician"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Staff Modal */}
                {showStaffModal && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl">
                      <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                          {editingStaff ? "Edit Technician Details" : "Register Support Technician"}
                        </h3>
                        <button onClick={() => setShowStaffModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800">
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveStaff} noValidate className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Technician Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="Enter full name"
                            value={staffForm.name}
                            onChange={(e) => setStaffForm({...staffForm, name: e.target.value})}
                            className="w-full text-[11px] sm:text-xs p-2 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address *</label>
                          <input
                            type="email"
                            required
                            placeholder="username@pugarch.com"
                            value={staffForm.email}
                            onChange={(e) => {
                              const email = e.target.value;
                              setStaffForm({...staffForm, email});
                              setStaffFormErrors({...staffFormErrors, email: email ? validateEmailAddress(email) : ""});
                            }}
                            className={`w-full text-[11px] sm:text-xs p-2 sm:p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 ${staffFormErrors.email ? "border-red-300" : "border-slate-200"}`}
                          />
                          {staffFormErrors.email && <p className="text-[10px] text-red-600 font-semibold">{staffFormErrors.email}</p>}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Number *</label>
                          <input
                            type="tel"
                            required
                            inputMode="numeric"
                            pattern="[0-9]{10}"
                            maxLength={10}
                            placeholder="Mobile phone number"
                            value={staffForm.phone}
                            onChange={(e) => {
                              const phone = sanitizeContactNumber(e.target.value);
                              setStaffForm({...staffForm, phone});
                              setStaffFormErrors({...staffFormErrors, phone: validateContactNumber(phone)});
                            }}
                            className={`w-full text-[11px] sm:text-xs p-2 sm:p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 ${staffFormErrors.phone ? "border-red-300" : "border-slate-200"}`}
                          />
                          {staffFormErrors.phone && <p className="text-[10px] text-red-600 font-semibold">{staffFormErrors.phone}</p>}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operational Status</label>
                          <select
                            value={staffForm.status}
                            onChange={(e: any) => setStaffForm({...staffForm, status: e.target.value})}
                            className="w-full text-[11px] sm:text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 sm:p-2.5 focus:outline-none focus:border-blue-500 text-slate-700"
                          >
                            <option value="active">Active (Available for Dispatch)</option>
                            <option value="inactive">Inactive (Deactivated)</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          disabled={!isStaffFormValid}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs shadow-md transition-all mt-3 sm:mt-4"
                        >
                          {editingStaff ? "Save Technician Parameters" : "Register Technician"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 5: SECURITY AUDIT LOGS ── */}
            {activeTab === "audit" && (
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm space-y-3 sm:space-y-4">
                <div className="flex flex-col gap-1.5 sm:gap-2 border-b border-slate-100 pb-3 sm:pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm tracking-tight text-slate-700">Security & Operational Audit Logs</h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1">Immutable record of ticket updates, database writes, and administrative technician registrations.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] sm:min-w-[720px] text-left text-[10px] sm:text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[8px] sm:text-[10px] font-bold">
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Log ID</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Timestamp</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Operator</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">System Event Action Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 text-[10px] sm:text-xs">
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-slate-400 font-semibold">{log.id}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            <span className="bg-slate-100 text-slate-600 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold border border-slate-200/60">
                              {log.userName} ({log.userId})
                            </span>
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-blue-600 font-sans font-semibold">{log.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 6: DIAGNOSTICS & SYSTEM CONFIG ── */}
            {activeTab === "settings" && (
              <div className="space-y-4 sm:space-y-6 max-w-2xl">
                {/* SMTP Setup */}
                <div className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-xl shadow-sm space-y-3 sm:space-y-4">
                  <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5 sm:gap-2">
                    <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                    SMTP Server Diagnostic Credentials
                  </h3>
                  <div className="space-y-2 sm:space-y-3 font-mono text-[10px] sm:text-xs">
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-2">
                      <span className="text-slate-400">SMTP Host:</span>
                      <span className="sm:col-span-2 text-slate-700 font-semibold">smtp.gmail.com (SSL Port 587)</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-2">
                      <span className="text-slate-400">Dispatch Sender Email:</span>
                      <span className="sm:col-span-2 text-slate-700 font-semibold">Configured via SMTP_USER</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-2">
                      <span className="text-slate-400">Support Alert Target:</span>
                      <span className="sm:col-span-2 text-blue-600 font-bold">Configured via SUPPORT_ALERT_EMAIL</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-2">
                      <span className="text-slate-400">SMTP Service Connection:</span>
                      <span className="sm:col-span-2 text-green-600 flex items-center gap-1 sm:gap-1.5 font-bold">
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Ready & Authorized
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Configuration */}
                <div className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-xl shadow-sm space-y-3 sm:space-y-4">
                  <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5 sm:gap-2">
                    <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                    Gemini Multimodal NLP & Vision AI Config
                  </h3>
                  <div className="space-y-2 sm:space-y-3 font-mono text-[10px] sm:text-xs">
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-2">
                      <span className="text-slate-400">SDK Engine Library:</span>
                      <span className="sm:col-span-2 text-slate-700 font-semibold">@google/genai ^2.4.0</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-2">
                      <span className="text-slate-500 text-slate-400">Model Deployment:</span>
                      <span className="sm:col-span-2 text-slate-700 font-semibold">gemini-3.5-flash</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-2">
                      <span className="text-slate-400">Active Integrations:</span>
                      <span className="sm:col-span-2 text-slate-600">Semantic issue matching, OCR Image Extraction, voice transcription (Speech-to-Text)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Full screen Attachment Image Preview Modal Overlay */}
      {previewModal}
    </div>
  );
}
