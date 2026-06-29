import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
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
  Send,
  Sliders,
  ChevronRight,
  Database,
  Loader2,
  X,
  Filter,
  Calendar,
  Paperclip,
  Download,
  Phone,
  Building,
  User as UserIcon
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Ticket, User, SupportStaff, AuditLog } from "../shared/types";
import { sanitizeContactNumber, validateContactNumber, validateEmailAddress } from "../shared/validation";

interface AdminViewProps {
  onLogout: () => void;
}

export default function AdminView({ onLogout }: AdminViewProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "tickets" | "users" | "staff" | "audit" | "settings">("dashboard");

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
  const [userSearch, setUserSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  // Modals / Selection states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [techNotesText, setTechNotesText] = useState("");
  const [techNotes, setTechNotes] = useState<{[key: string]: string}>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeStatus, setAssigneeStatus] = useState<"pending" | "assigned" | "closed">("pending");

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
  const handleUpdateTicket = async (ticketId: string) => {
    setIsLoading(true);
    const assigned = staff.find((s) => s.id === assigneeId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: assigneeStatus,
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
        const updatedTechNotes = { ...techNotes, [ticketId]: techNotesText };
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
  const handleSelectTicket = (t: Ticket) => {
    setSelectedTicket(t);
    setAssigneeId(t.assignedStaffId || "");
    setAssigneeStatus(t.status);
    setResolutionText(t.resolutionNotes || "");
    setTechNotesText(techNotes[t.id] || "");
  };

  // Dynamic metrics helpers
  const metrics = analytics?.metrics || {
    totalTickets: 0,
    pendingTickets: 0,
    activeTickets: 0,
    closedTickets: 0,
    avgResolutionTimeHrs: 0.0
  };

  const pieColors = ["#EF4444", "#F59E0B", "#10B981"];

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

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans">
      {/* ── Admin Sidebar Navigation ── */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-full justify-between shrink-0">
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
                  onClick={() => setActiveTab(item.id as any)}
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
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-md capitalize tracking-tight text-slate-800">{activeTab} Panel</h2>
            {isRefreshing ? (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Syncing database...
              </span>
            ) : (
              <button 
                onClick={fetchAllData}
                className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-all"
                title="Refresh database"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Synced live
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            System time: {new Date().toLocaleTimeString()}
          </div>
        </header>

        {/* Dynamic Inner Panel Viewports */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            
            {/* ── TAB 1: DASHBOARD & RECHARTS ── */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { label: "Total Tickets", val: metrics.totalTickets, icon: TicketIcon, textStyle: "text-slate-800" },
                    { label: "Pending", val: metrics.pendingTickets, icon: AlertTriangle, textStyle: "text-red-600" },
                    { label: "In Investigation", val: metrics.activeTickets, icon: Clock, textStyle: "text-amber-600" },
                    { label: "Closed / Resolved", val: metrics.closedTickets, icon: CheckCircle2, textStyle: "text-green-600" },
                    { label: "Avg Resolution Time", val: `${metrics.avgResolutionTimeHrs}h`, icon: Sliders, textStyle: "text-slate-800" }
                  ].map((stat, i) => {
                    const StatIcon = stat.icon;
                    return (
                      <div key={i} className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between shadow-sm">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">{stat.label}</span>
                          <span className={`text-xl font-extrabold tracking-tight block ${stat.textStyle}`}>{stat.val}</span>
                        </div>
                        <StatIcon className="w-5 h-5 text-blue-600 opacity-80" />
                      </div>
                    );
                  })}
                </div>

                {/* Live Charts Dashboard using Recharts */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Category Distribution Bar Chart */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Incoming Issues by Category
                    </h3>
                    <div className="h-64">
                      {analytics?.categoryDistribution?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.categoryDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748B" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px" }} />
                            <Bar dataKey="value" name="Tickets" fill="#2563EB" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400">No ticket category statistics recorded yet.</div>
                      )}
                    </div>
                  </div>

                  {/* Ticket Status Distribution Pie Chart */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Operational Resolution Statuses
                    </h3>
                    <div className="h-64 flex items-center">
                      {analytics?.statusDistribution?.length > 0 ? (
                        <div className="w-full flex">
                          <div className="w-2/3 h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analytics.statusDistribution}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {analytics.statusDistribution.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-1/3 flex flex-col justify-center space-y-3 pl-2">
                            {analytics.statusDistribution.map((entry: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[index] }}></span>
                                <span className="text-slate-700 font-semibold">{entry.name}:</span>
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

                {/* Bottom Staff Load list */}
                <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Support Engineer Dispatch & Load Balancing
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {analytics?.staffLoad?.map((staffItem: any, index: number) => (
                      <div key={index} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-slate-800 block">{staffItem.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono mt-0.5 block">Status: {staffItem.status}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-blue-600 block">{staffItem.tickets}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Tickets</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: TICKETS LIST & INTERACTIVE CHAT REVIEW ── */}
            {activeTab === "tickets" && (
              <div className="grid grid-cols-12 gap-6 h-[calc(100vh-10rem)]">
                {/* Tickets list panel */}
                <div className="col-span-12 xl:col-span-7 lg:col-span-7 bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col shadow-sm overflow-hidden h-full">
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm tracking-tight text-slate-800 flex items-center gap-2">
                        <TicketIcon className="w-4 h-4 text-blue-600" />
                        Live Support Ticket Queues
                      </h3>
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                        {filteredTickets.length} of {tickets.length} tickets
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Search bar */}
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search ID, User Name, Contact..."
                          value={ticketSearch}
                          onChange={(e) => setTicketSearch(e.target.value)}
                          className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
                        />
                      </div>

                      {/* Status Filter */}
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                        <Filter className="w-3 h-3 text-slate-400" />
                        <select
                          value={ticketStatusFilter}
                          onChange={(e) => setTicketStatusFilter(e.target.value)}
                          className="text-[11px] bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer pr-1"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="assigned">Assigned</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      {/* Date Filter */}
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <select
                          value={ticketDateFilter}
                          onChange={(e) => setTicketDateFilter(e.target.value)}
                          className="text-[11px] bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer pr-1"
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
                  <div className="flex-1 overflow-auto rounded-xl border border-slate-100 bg-slate-50/50">
                    <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                      <thead className="sticky top-0 bg-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200 shadow-sm z-10">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-12">SR. No.</th>
                          <th className="py-2.5 px-3 w-20 text-slate-600">Ticket ID</th>
                          <th className="py-2.5 px-3">User Name</th>
                          <th className="py-2.5 px-3">Contact Number</th>
                          <th className="py-2.5 px-3">Issue Title</th>
                          <th className="py-2.5 px-3 w-24">Created Date</th>
                          <th className="py-2.5 px-3 w-20">Status</th>
                          <th className="py-2.5 px-3 w-28">Assigned Technician</th>
                          <th className="py-2.5 px-2 text-center w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredTickets.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400">
                              <TicketIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                              <span className="text-xs">No support tickets match these parameters.</span>
                            </td>
                          </tr>
                        ) : (
                          filteredTickets.map((t, idx) => (
                            <tr
                              key={t.id}
                              onClick={() => handleSelectTicket(t)}
                              className={`hover:bg-slate-50/80 cursor-pointer transition-all ${
                                selectedTicket?.id === t.id ? "bg-blue-50/70 text-slate-900 font-medium" : "text-slate-700"
                              }`}
                            >
                              <td className="py-1.5 px-3 text-center font-mono text-[10px] text-slate-400 border-r border-slate-100/60">
                                {idx + 1}
                              </td>
                              <td className="py-1.5 px-3 font-mono text-[11px] font-bold text-blue-600">
                                {t.id}
                              </td>
                              <td className="py-1.5 px-3 font-semibold text-slate-800">
                                {t.userName}
                              </td>
                              <td className="py-1.5 px-3 text-slate-500 font-mono text-[11px]">
                                {t.userPhone}
                              </td>
                              <td className="py-1.5 px-3">
                                <div className="max-w-[150px] truncate font-semibold text-slate-800" title={t.issueTitle}>
                                  {t.issueTitle}
                                </div>
                              </td>
                              <td className="py-1.5 px-3 text-slate-500 font-mono text-[11px]">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-1.5 px-3">
                                <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                  t.status === "closed"
                                    ? "bg-green-50 text-green-700 border border-green-200/50"
                                    : t.status === "assigned"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                                    : "bg-red-50 text-red-700 border border-red-200/50"
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 font-semibold text-slate-700">
                                {t.assignedStaffName || (
                                  <span className="text-slate-400 font-normal italic">Unassigned</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ticket Details & Chat Log Panel */}
                <div className="col-span-12 xl:col-span-5 lg:col-span-5 bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col shadow-sm overflow-y-auto h-full space-y-4">
                  {selectedTicket ? (
                    <div className="space-y-4 flex flex-col h-full justify-between">
                      {/* Section 1: Ticket Information */}
                      {(() => {
                        // Dynamic priority computation helper
                        const getPriority = (code: string) => {
                          if (!code) return "Low";
                          const c = code.toUpperCase();
                          if (c.startsWith("A") || c.includes("PAY") || c.includes("ERR")) return "High";
                          if (c.startsWith("B") || c.includes("ACC")) return "Medium";
                          return "Low";
                        };
                        const priority = getPriority(selectedTicket.issueCode);
                        const priorityColor = 
                          priority === "High" ? "bg-rose-50 border-rose-200 text-rose-700" :
                          priority === "Medium" ? "bg-amber-50 border-amber-200 text-amber-700" :
                          "bg-slate-50 border-slate-200 text-slate-600";

                        const ticketUser = users.find(u => u.id === selectedTicket.userId) || {
                          name: selectedTicket.userName,
                          phone: selectedTicket.userPhone,
                          email: selectedTicket.userEmail,
                          companyName: "PugArch Diagnostics",
                          designation: "End User"
                        };

                        // Attachments filtered from chat messages
                        const attachments = selectedTicket.conversation?.filter(m => m.type === "image" || m.mediaUrl) || [];

                        return (
                          <>
                            <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Information</span>
                                </div>
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${priorityColor}`}>
                                  {priority} Priority
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Ticket ID</span>
                                  <span className="font-mono font-bold text-slate-800">{selectedTicket.id}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Category</span>
                                  <span className="font-semibold text-slate-700 truncate block" title={selectedTicket.category}>{selectedTicket.category || "General"}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Issue Title</span>
                                  <span className="font-bold text-slate-800 block text-xs">{selectedTicket.issueTitle}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Created Date</span>
                                  <span className="text-slate-600 font-mono text-[11px] block">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Last Updated</span>
                                  <span className="text-slate-600 font-mono text-[11px] block">
                                    {selectedTicket.closedAt ? new Date(selectedTicket.closedAt).toLocaleString() : new Date(selectedTicket.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Language Support</span>
                                  <span className="text-slate-700 font-semibold uppercase">{selectedTicket.language}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Status Code</span>
                                  <span className="font-mono text-slate-600 text-[11px]">{selectedTicket.issueCode}</span>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: User Information */}
                            <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3.5 space-y-2.5">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 pb-2 flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                                End User Information
                              </h4>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Full Name</span>
                                  <span className="font-bold text-slate-800">{selectedTicket.userName}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Contact Number</span>
                                  <span className="font-semibold text-slate-700 font-mono">{selectedTicket.userPhone}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Email Address</span>
                                  <span className="text-slate-600 font-mono block truncate" title={selectedTicket.userEmail}>{selectedTicket.userEmail}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Company Name & Designation</span>
                                  <span className="text-slate-700 font-medium block">
                                    <Building className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                                    {ticketUser.companyName} • <span className="text-slate-500">{ticketUser.designation}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Section 3: ChatGPT/WhatsApp Style Chat Conversation */}
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                WhatsApp Live Diagnostics Log
                              </h4>
                              <div className="overflow-y-auto space-y-3.5 bg-slate-100/70 border border-slate-200/50 p-4 rounded-xl h-64 shadow-inner">
                                {selectedTicket.conversation?.map((msg, i) => {
                                  const isUser = msg.sender === "user";
                                  const isBot = msg.sender === "bot";
                                  
                                  return (
                                    <div key={i} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                                      <div className={`p-3 rounded-2xl text-xs max-w-[85%] shadow-sm ${
                                        isUser 
                                          ? "bg-blue-600 text-white rounded-tr-none" 
                                          : isBot 
                                          ? "bg-white text-slate-800 border border-slate-200 rounded-tl-none" 
                                          : "bg-purple-50 text-purple-900 border border-purple-200 rounded-tl-none"
                                      }`}>
                                        <div className="flex items-center justify-between gap-4 mb-1">
                                          <span className={`font-bold text-[9px] uppercase tracking-wider block ${
                                            isUser ? "text-blue-100" : isBot ? "text-emerald-600" : "text-purple-600"
                                          }`}>
                                            {isUser ? "End User Client" : isBot ? "🤖 Diagnostics Bot" : `🔧 Tech: ${selectedTicket.assignedStaffName || "Support staff"}`}
                                          </span>
                                        </div>
                                        <p className="whitespace-pre-wrap leading-relaxed font-sans">{msg.message}</p>
                                        
                                        {/* Attachment inclusion within balloon itself */}
                                        {msg.type === "image" && msg.mediaUrl && (
                                          <div className="mt-2.5 relative group cursor-zoom-in rounded-lg overflow-hidden border border-slate-200/50 bg-slate-50">
                                            <img 
                                              src={msg.mediaUrl} 
                                              alt="Screenshot" 
                                              referrerPolicy="no-referrer"
                                              className="max-h-28 object-contain mx-auto"
                                              onClick={() => setPreviewImage(msg.mediaUrl || null)}
                                            />
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-[8px] text-slate-400 mt-1 font-mono tracking-tighter px-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Section 4: Attachments */}
                            <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3.5 space-y-2">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                                Interactive Attachments ({attachments.length})
                              </h4>
                              
                              {attachments.length === 0 ? (
                                <div className="flex items-center gap-2 p-2 bg-slate-100/50 border border-slate-200/30 rounded-lg text-slate-400 text-xs">
                                  <span>No attachments uploaded in this conversation.</span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-4 gap-2">
                                  {attachments.map((att, idx) => (
                                    <div key={idx} className="group relative border border-slate-200 bg-white rounded-lg p-1.5 flex flex-col justify-between items-center space-y-1.5 shadow-sm hover:shadow-md transition-all">
                                      <img 
                                        src={att.mediaUrl} 
                                        alt={`Attach-${idx}`} 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-12 object-cover rounded cursor-pointer group-hover:scale-105 transition-all"
                                        onClick={() => setPreviewImage(att.mediaUrl || null)}
                                      />
                                      <div className="flex justify-between w-full border-t border-slate-100 pt-1">
                                        <button 
                                          onClick={() => setPreviewImage(att.mediaUrl || null)}
                                          className="text-[9px] text-blue-600 hover:underline font-bold"
                                        >
                                          View
                                        </button>
                                        <a 
                                          href={att.mediaUrl} 
                                          download 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-[9px] text-slate-500 hover:text-slate-800 inline-flex items-center"
                                        >
                                          <Download className="w-2.5 h-2.5" />
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Section 6: Action Controls */}
                            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-3">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 pb-1.5 flex items-center gap-1">
                                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                                Administrative Ticket Operations
                              </h4>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Assign Technician</label>
                                  <select
                                    value={assigneeId}
                                    onChange={(e) => setAssigneeId(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 focus:outline-none focus:border-blue-500 text-slate-700 font-semibold cursor-pointer"
                                  >
                                    <option value="">Unassigned</option>
                                    {staff.filter(s => s.status === "active").map((s) => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Ticket Status</label>
                                  <select
                                    value={assigneeStatus}
                                    onChange={(e: any) => setAssigneeStatus(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 focus:outline-none focus:border-blue-500 text-slate-700 font-semibold cursor-pointer"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="assigned">Assigned</option>
                                    <option value="closed">Closed / Resolved</option>
                                  </select>
                                </div>
                              </div>

                              {/* Technician Notes (Internal) Input */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Internal Technician Notes</label>
                                <textarea
                                  placeholder="Document private internal diagnostic comments, technician remarks, or troubleshooting notes..."
                                  rows={2}
                                  value={techNotesText}
                                  onChange={(e) => setTechNotesText(e.target.value)}
                                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 resize-none text-slate-700"
                                />
                              </div>

                              {/* Resolution Notes (Public) Input */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Resolution Notes (Email to User)</label>
                                <textarea
                                  placeholder="Add resolution details. This text is emailed directly to the customer as confirmation of issue resolution."
                                  rows={2.5}
                                  value={resolutionText}
                                  onChange={(e) => setResolutionText(e.target.value)}
                                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 resize-none text-slate-700"
                                />
                              </div>

                              <button
                                onClick={() => handleUpdateTicket(selectedTicket.id)}
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                Save Changes & Dispatch Emails
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-20">
                      <Sliders className="w-12 h-12 text-slate-300 mb-2" />
                      <span className="text-xs font-bold text-slate-700">No Ticket Selected</span>
                      <p className="text-[10px] text-slate-500 max-w-xs mt-1">Select an active support escalation from the list on the left to review logs, assign a tech, and document resolution notes.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 3: USER DATABASE SEARCH ── */}
            {activeTab === "users" && (
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center gap-4 border-b border-slate-100 pb-4">
                  <h3 className="font-bold text-sm tracking-tight text-slate-700">Registered End Users Directory</h3>
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or contact number..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="py-3 px-4">User ID</th>
                        <th className="py-3 px-4">Full Name</th>
                        <th className="py-3 px-4">Contact Credentials</th>
                        <th className="py-3 px-4">Company Designation</th>
                        <th className="py-3 px-4">Linked Tickets</th>
                        <th className="py-3 px-4 text-right">Register Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const linked = tickets.filter(t => t.userId === u.id);
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-mono text-blue-600 font-semibold">{u.id}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-800">{u.name}</td>
                            <td className="py-3.5 px-4 space-y-0.5">
                              <span className="block text-slate-700 font-semibold">{u.email}</span>
                              <span className="block text-[10px] text-slate-400 font-mono">{u.phone}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="block text-slate-700 font-semibold">{u.companyName}</span>
                              <span className="block text-[10px] text-slate-400">{u.designation}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="bg-slate-100 text-slate-600 border border-slate-200/60 px-2.5 py-0.5 rounded-full font-bold">
                                {linked.length} Tickets
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-400 font-mono">
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
              <div className="space-y-6">
                <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-slate-700">Support Technicians Directory</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Manage, activate, or register support engineers eligible for ticket dispatch routing.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingStaff(null);
                      setStaffForm({ name: "", email: "", phone: "", status: "active" });
                      setStaffFormErrors({ email: "", phone: "" });
                      setShowStaffModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
                    id="add-staff-btn"
                  >
                    <UserPlus className="w-4 h-4" />
                    Register New Technician
                  </button>
                </div>

                {/* Staff list */}
                <div className="grid grid-cols-3 gap-6">
                  {filteredStaff.map((s) => (
                    <div key={s.id} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                          {s.id}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          s.status === "active" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
                        }`}>
                          {s.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800">{s.name}</h4>
                        <div className="space-y-0.5 text-xs text-slate-500">
                          <span className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {s.email}
                          </span>
                          <span className="flex items-center gap-2 font-mono">
                            <Sliders className="w-3.5 h-3.5 text-slate-400" />
                            {s.phone}
                          </span>
                        </div>
                      </div>

                      {/* CRUD controls */}
                      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
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
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                          title="Edit Staff Parameters"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(s.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                          title="Remove Technician"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Staff Modal */}
                {showStaffModal && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                      <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-sm text-slate-800">
                          {editingStaff ? "Edit Technician Details" : "Register Support Technician"}
                        </h3>
                        <button onClick={() => setShowStaffModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveStaff} noValidate className="p-5 space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Technician Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="Enter full name"
                            value={staffForm.name}
                            onChange={(e) => setStaffForm({...staffForm, name: e.target.value})}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800"
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
                            className={`w-full text-xs p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 ${staffFormErrors.email ? "border-red-300" : "border-slate-200"}`}
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
                            className={`w-full text-xs p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 ${staffFormErrors.phone ? "border-red-300" : "border-slate-200"}`}
                          />
                          {staffFormErrors.phone && <p className="text-[10px] text-red-600 font-semibold">{staffFormErrors.phone}</p>}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operational Status</label>
                          <select
                            value={staffForm.status}
                            onChange={(e: any) => setStaffForm({...staffForm, status: e.target.value})}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 text-slate-700"
                          >
                            <option value="active">Active (Available for Dispatch)</option>
                            <option value="inactive">Inactive (Deactivated)</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          disabled={!isStaffFormValid}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all mt-4"
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
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-slate-700">Security & Operational Audit Logs</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Immutable record of ticket updates, database writes, and administrative technician registrations.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="py-3 px-4">Log ID</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Operator</th>
                        <th className="py-3 px-4">System Event Action Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 text-xs">
                          <td className="py-3 px-4 text-slate-400 font-semibold">{log.id}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200/60">
                              {log.userName} ({log.userId})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-blue-600 font-sans font-semibold">{log.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 6: DIAGNOSTICS & SYSTEM CONFIG ── */}
            {activeTab === "settings" && (
              <div className="space-y-6 max-w-2xl">
                {/* SMTP Setup */}
                <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    SMTP Server Diagnostic Credentials
                  </h3>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-400">SMTP Host:</span>
                      <span className="col-span-2 text-slate-700 font-semibold">smtp.gmail.com (SSL Port 587)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-400">Dispatch Sender Email:</span>
                      <span className="col-span-2 text-slate-700 font-semibold">Configured via SMTP_USER</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-400">Support Alert Target:</span>
                      <span className="col-span-2 text-blue-600 font-bold">Configured via SUPPORT_ALERT_EMAIL</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-400">SMTP Service Connection:</span>
                      <span className="col-span-2 text-green-600 flex items-center gap-1.5 font-bold">
                        <CheckCircle className="w-4 h-4" /> Ready & Authorized
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Configuration */}
                <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    Gemini Multimodal NLP & Vision AI Config
                  </h3>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-400">SDK Engine Library:</span>
                      <span className="col-span-2 text-slate-700 font-semibold">@google/genai ^2.4.0</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 text-slate-400">Model Deployment:</span>
                      <span className="col-span-2 text-slate-700 font-semibold">gemini-3.5-flash</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-400">Active Integrations:</span>
                      <span className="col-span-2 text-slate-600">Semantic issue matching, OCR Image Extraction, voice transcription (Speech-to-Text)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Full screen Attachment Image Preview Modal Overlay */}
      {previewImage && (
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
      )}
    </div>
  );
}
