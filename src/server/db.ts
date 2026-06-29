import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { AuditLog, ChatMessage, SupportStaff, Ticket, User } from "../shared/types";

const LEGACY_DB_PATH = path.join(process.cwd(), "server-db.json");

function getDatabasePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "pugarch.db");
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return path.join(process.cwd(), "dev.db");
  }

  if (databaseUrl.startsWith("file:")) {
    const rawPath = databaseUrl.slice("file:".length);
    return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
  }

  return path.isAbsolute(databaseUrl) ? databaseUrl : path.resolve(process.cwd(), databaseUrl);
}

const DB_PATH = getDatabasePath();

interface LegacyDBStructure {
  users: User[];
  staff: SupportStaff[];
  tickets: Ticket[];
  auditLogs: AuditLog[];
}

const DEFAULT_STAFF: SupportStaff[] = [
  {
    id: "STF-001",
    name: "Snehal Kolhe",
    email: "snehalkolhe2628@gmail.com",
    phone: "9876543210",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "STF-002",
    name: "Rajesh Kumar",
    email: "rajesh@pugarch.com",
    phone: "9876543211",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "STF-003",
    name: "Amit Sharma",
    email: "amit.sharma@pugarch.com",
    phone: "9876543212",
    status: "active",
    createdAt: new Date().toISOString(),
  },
];

const SEED_USERS: User[] = [
  {
    id: "USR-001",
    name: "Rahul Verma",
    email: "rahul.verma@company.com",
    phone: "9911223344",
    designation: "Field Officer",
    companyName: "Vanguard Guarding",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "USR-002",
    name: "Priya Patel",
    email: "priya@enterprise.com",
    phone: "9922334455",
    designation: "Site Manager",
    companyName: "Securitas India",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const SEED_TICKETS: Ticket[] = [
  {
    id: "TIC-8421",
    userId: "USR-001",
    userName: "Rahul Verma",
    userEmail: "rahul.verma@company.com",
    userPhone: "9911223344",
    category: "Location, GPS & Geofence",
    issueCode: "B1",
    issueTitle: "Out of geofence message",
    status: "closed",
    assignedStaffId: "STF-001",
    assignedStaffName: "Snehal Kolhe",
    resolutionNotes:
      "Instructed officer to step outside the basement area to improve GPS signal accuracy. Re-tested and verified GPS was fetching correctly with 5m accuracy.",
    language: "en",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 3.8 * 24 * 60 * 60 * 1000).toISOString(),
    conversation: [
      {
        sender: "user",
        message: "Hello, I am getting an Out of Geofence error even when standing right at the gate.",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "bot",
        message:
          "Hi! Welcome to PugArch FSM Support. I can help you resolve common app issues instantly. Please select the type of problem you are facing:\nA — Login & Account\nB — Location, GPS & Geofence\nC — Attendance & Tracking\nD — App Crashes & Performance\nE — Data & Sync\nF — Something else",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "user",
        message: "B",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "bot",
        message:
          "Got it — Location, GPS & Geofence issues. Which problem are you facing?\nB1 — Out of geofence message\nB2 — Site or geofence not visible\nB3 — Geofence missing\nB4 — Location not fetching",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "user",
        message: "B1",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "bot",
        message:
          "**Out of Geofence Message**\n\nPossible reason: Low GPS accuracy.\n\nSolution:\n1. Open the app and check your current location on the map.\n2. Move to an open area (away from buildings or rooftops).\n3. Wait 30 seconds and retry.\n\nWas this helpful?",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "user",
        message: "NO",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "bot",
        message:
          "Sorry the solution did not work! I am creating a support ticket for you. Please share your details.",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "TIC-4019",
    userId: "USR-002",
    userName: "Priya Patel",
    userEmail: "priya@enterprise.com",
    userPhone: "9922334455",
    category: "Attendance & Tracking",
    issueCode: "C1",
    issueTitle: "Face recognition failed",
    status: "assigned",
    assignedStaffId: "STF-002",
    assignedStaffName: "Rajesh Kumar",
    resolutionNotes: null,
    language: "hi",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    closedAt: null,
    conversation: [
      {
        sender: "user",
        message: "मेरा फेस स्कैन काम नहीं कर रहा है। बार-बार एरर आ रहा है।",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "bot",
        message:
          "**Face Recognition Failed**\n\nPossible reason: Camera permission is denied.\n\nSolution:\n1. Go to phone Settings > Apps > PugArch FSM > Permissions.\n2. Allow Camera permission.\n3. Retry face recognition.\n\nIf it still fails, please share a clear selfie with your full name and details on this chat. Our team will update your face data.\n\nक्या यह मददगार था?",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "user",
        message: "नहीं",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "bot",
        message: "खेद है कि समाधान काम नहीं आया! आपके लिए सहायता टिकट बनाया जा रहा है।",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "TIC-9102",
    userId: "USR-001",
    userName: "Rahul Verma",
    userEmail: "rahul.verma@company.com",
    userPhone: "9911223344",
    category: "Login & Account",
    issueCode: "A1",
    issueTitle: "User not found during signup",
    status: "pending",
    assignedStaffId: null,
    assignedStaffName: null,
    resolutionNotes: null,
    language: "en",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    closedAt: null,
    conversation: [
      {
        sender: "user",
        message: "I cannot complete my signup. App says user not found.",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "bot",
        message:
          "**User Not Found During Signup**\n\nPossible reason: Your user account has not been created in the system yet.\n\nSolution: Please share the following details with our team on this chat:\n- Full name\n- Contact number\n- Designation\n- Company name\n\nOur team will register you and confirm within 1 working day.\n\nWas this helpful?",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "user",
        message: "NO",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: "AUD-001",
    action: "Database initialized with seed data",
    userId: "SYSTEM",
    userName: "System",
    timestamp: new Date().toISOString(),
  },
  {
    id: "AUD-002",
    action: "Assigned ticket TIC-8421 to Snehal Kolhe",
    userId: "SYSTEM",
    userName: "System",
    timestamp: new Date(Date.now() - 3.9 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "AUD-003",
    action: "Closed ticket TIC-8421 with resolution: signal correction",
    userId: "STF-001",
    userName: "Snehal Kolhe",
    timestamp: new Date(Date.now() - 3.8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "AUD-004",
    action: "Assigned ticket TIC-4019 to Rajesh Kumar",
    userId: "SYSTEM",
    userName: "System",
    timestamp: new Date(Date.now() - 1.9 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let database: DatabaseSync | null = null;

function getDatabase(): DatabaseSync {
  if (database) {
    return database;
  }

  database = new DatabaseSync(DB_PATH);
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      designation TEXT NOT NULL,
      companyName TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      password TEXT,
      status TEXT NOT NULL CHECK(status IN ('active', 'inactive')),
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      userEmail TEXT NOT NULL,
      userPhone TEXT NOT NULL,
      category TEXT NOT NULL,
      issueCode TEXT NOT NULL,
      issueTitle TEXT NOT NULL,
      conversation TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'assigned', 'closed')),
      assignedStaffId TEXT,
      assignedStaffName TEXT,
      resolutionNotes TEXT,
      language TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      closedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  seedDatabaseIfNeeded(database);
  return database;
}

function countRows(db: DatabaseSync, tableName: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count: number } | undefined;
  return row?.count ?? 0;
}

function readLegacyDatabase(): LegacyDBStructure | null {
  try {
    if (!fs.existsSync(LEGACY_DB_PATH)) {
      return null;
    }

    const parsed = JSON.parse(fs.readFileSync(LEGACY_DB_PATH, "utf8")) as Partial<LegacyDBStructure>;
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.staff) || !Array.isArray(parsed.tickets) || !Array.isArray(parsed.auditLogs)) {
      return null;
    }

    return {
      users: parsed.users,
      staff: parsed.staff,
      tickets: parsed.tickets,
      auditLogs: parsed.auditLogs,
    };
  } catch (error) {
    console.error("Error reading legacy database file:", error);
    return null;
  }
}

function seedDatabaseIfNeeded(db: DatabaseSync) {
  const hasData = countRows(db, "users") > 0 || countRows(db, "staff") > 0 || countRows(db, "tickets") > 0 || countRows(db, "audit_logs") > 0;
  if (hasData) {
    return;
  }

  const legacy = readLegacyDatabase();
  const source = legacy ?? {
    users: SEED_USERS,
    staff: DEFAULT_STAFF,
    tickets: SEED_TICKETS,
    auditLogs: SEED_AUDIT_LOGS,
  };

  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, phone, designation, companyName, createdAt)
    VALUES (@id, @name, @email, @phone, @designation, @companyName, @createdAt)
  `);
  const insertStaff = db.prepare(`
    INSERT OR REPLACE INTO staff (id, name, email, phone, password, status, createdAt)
    VALUES (@id, @name, @email, @phone, @password, @status, @createdAt)
  `);
  const insertTicket = db.prepare(`
    INSERT OR REPLACE INTO tickets (
      id, userId, userName, userEmail, userPhone, category, issueCode, issueTitle,
      conversation, status, assignedStaffId, assignedStaffName, resolutionNotes, language, createdAt, closedAt
    ) VALUES (
      @id, @userId, @userName, @userEmail, @userPhone, @category, @issueCode, @issueTitle,
      @conversation, @status, @assignedStaffId, @assignedStaffName, @resolutionNotes, @language, @createdAt, @closedAt
    )
  `);
  const insertAudit = db.prepare(`
    INSERT OR REPLACE INTO audit_logs (id, action, userId, userName, timestamp)
    VALUES (@id, @action, @userId, @userName, @timestamp)
  `);

  for (const user of source.users) {
    insertUser.run(user as any);
  }
  for (const staff of source.staff) {
    insertStaff.run(staff as any);
  }
  for (const ticket of source.tickets) {
    insertTicket.run({
      ...ticket,
      conversation: JSON.stringify(ticket.conversation ?? []),
    } as any);
  }
  for (const auditLog of source.auditLogs) {
    insertAudit.run(auditLog as any);
  }
}

function serializeConversation(conversation: ChatMessage[]): string {
  return JSON.stringify(conversation ?? []);
}

function deserializeConversation(serialized: string | null): ChatMessage[] {
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function mapTicketRow(row: any): Ticket {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    userPhone: row.userPhone,
    category: row.category,
    issueCode: row.issueCode,
    issueTitle: row.issueTitle,
    conversation: deserializeConversation(row.conversation),
    status: row.status,
    assignedStaffId: row.assignedStaffId ?? null,
    assignedStaffName: row.assignedStaffName ?? null,
    resolutionNotes: row.resolutionNotes ?? null,
    language: row.language,
    createdAt: row.createdAt,
    closedAt: row.closedAt ?? null,
  };
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

function addAuditLog(action: string, userId: string, userName: string) {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO audit_logs (id, action, userId, userName, timestamp)
     VALUES (?, ?, ?, ?, ?)`
  ).run(makeId("AUD"), action, userId, userName, new Date().toISOString());
}

export const dbService = {
  getUsers(): User[] {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM users ORDER BY createdAt DESC`).all() as unknown as User[];
  },

  addUser(user: Omit<User, "id" | "createdAt">): User {
    const db = getDatabase();
    const existing = db
      .prepare(`SELECT * FROM users WHERE lower(email) = lower(?) OR phone = ? LIMIT 1`)
      .get(user.email, user.phone) as unknown as User | undefined;

    if (existing) {
      return existing;
    }

    const newUser: User = {
      ...user,
      id: makeId("USR"),
      createdAt: new Date().toISOString(),
    };

    db.prepare(
      `INSERT INTO users (id, name, email, phone, designation, companyName, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(newUser.id, newUser.name, newUser.email, newUser.phone, newUser.designation, newUser.companyName, newUser.createdAt);

    addAuditLog(`Created user profile for ${user.name} (${user.email})`, "SYSTEM", "System");
    return newUser;
  },

  getStaff(): SupportStaff[] {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM staff ORDER BY createdAt DESC`).all() as unknown as SupportStaff[];
  },

  addStaff(staff: Omit<SupportStaff, "id" | "createdAt">): SupportStaff {
    const db = getDatabase();
    const newStaff: SupportStaff = {
      ...staff,
      id: makeId("STF"),
      createdAt: new Date().toISOString(),
    };

    db.prepare(
      `INSERT INTO staff (id, name, email, phone, password, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newStaff.id,
      newStaff.name,
      newStaff.email,
      newStaff.phone,
      newStaff.password ?? null,
      newStaff.status,
      newStaff.createdAt
    );

    addAuditLog(`Added support staff member: ${staff.name}`, "SYSTEM", "System");
    return newStaff;
  },

  updateStaff(id: string, staffData: Partial<SupportStaff>): SupportStaff {
    const db = getDatabase();
    const existing = db.prepare(`SELECT * FROM staff WHERE id = ?`).get(id) as unknown as SupportStaff | undefined;
    if (!existing) {
      throw new Error("Support staff not found");
    }

    const updated: SupportStaff = {
      ...existing,
      ...staffData,
      password: staffData.password ?? existing.password,
    };

    db.prepare(
      `UPDATE staff
       SET name = ?, email = ?, phone = ?, password = ?, status = ?
       WHERE id = ?`
    ).run(
      updated.name,
      updated.email,
      updated.phone,
      updated.password ?? null,
      updated.status,
      id
    );

    addAuditLog(`Updated staff member details for ${updated.name}`, "SYSTEM", "System");
    return updated;
  },

  deleteStaff(id: string): void {
    const db = getDatabase();
    const staff = db.prepare(`SELECT * FROM staff WHERE id = ?`).get(id) as unknown as SupportStaff | undefined;
    if (!staff) {
      return;
    }

    db.prepare(`DELETE FROM staff WHERE id = ?`).run(id);
    addAuditLog(`Deleted staff member: ${staff.name}`, "SYSTEM", "System");
  },

  getTickets(): Ticket[] {
    const db = getDatabase();
    const rows = db.prepare(`SELECT * FROM tickets ORDER BY createdAt DESC`).all() as unknown as any[];
    return rows.map(mapTicketRow);
  },

  getTicketById(id: string): Ticket | undefined {
    const db = getDatabase();
    const row = db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(id) as unknown as any | undefined;
    return row ? mapTicketRow(row) : undefined;
  },

  addTicket(ticketData: Omit<Ticket, "id" | "createdAt" | "closedAt">): Ticket {
    const db = getDatabase();
    const newTicket: Ticket = {
      ...ticketData,
      id: makeId("TIC"),
      createdAt: new Date().toISOString(),
      closedAt: null,
    };

    db.prepare(
      `INSERT INTO tickets (
        id, userId, userName, userEmail, userPhone, category, issueCode, issueTitle,
        conversation, status, assignedStaffId, assignedStaffName, resolutionNotes, language, createdAt, closedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newTicket.id,
      newTicket.userId,
      newTicket.userName,
      newTicket.userEmail,
      newTicket.userPhone,
      newTicket.category,
      newTicket.issueCode,
      newTicket.issueTitle,
      serializeConversation(newTicket.conversation),
      newTicket.status,
      newTicket.assignedStaffId,
      newTicket.assignedStaffName,
      newTicket.resolutionNotes,
      newTicket.language,
      newTicket.createdAt,
      newTicket.closedAt
    );

    addAuditLog(
      `Ticket ${newTicket.id} raised by ${newTicket.userName} (${newTicket.issueTitle})`,
      "SYSTEM",
      "System"
    );
    return newTicket;
  },

  updateTicket(id: string, updates: Partial<Ticket>, operatorId = "SYSTEM", operatorName = "System"): Ticket {
    const db = getDatabase();
    const previous = this.getTicketById(id);
    if (!previous) {
      throw new Error("Ticket not found");
    }

    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    ) as Partial<Ticket>;

    const updated: Ticket = {
      ...previous,
      ...definedUpdates,
    };

    if (updates.status === "closed" && previous.status !== "closed") {
      updated.closedAt = new Date().toISOString();
    }

    db.prepare(
      `UPDATE tickets
       SET userId = ?, userName = ?, userEmail = ?, userPhone = ?, category = ?, issueCode = ?, issueTitle = ?,
           conversation = ?, status = ?, assignedStaffId = ?, assignedStaffName = ?, resolutionNotes = ?,
           language = ?, createdAt = ?, closedAt = ?
       WHERE id = ?`
    ).run(
      updated.userId,
      updated.userName,
      updated.userEmail,
      updated.userPhone,
      updated.category,
      updated.issueCode,
      updated.issueTitle,
      serializeConversation(updated.conversation),
      updated.status,
      updated.assignedStaffId,
      updated.assignedStaffName,
      updated.resolutionNotes,
      updated.language,
      updated.createdAt,
      updated.closedAt,
      id
    );

    let action = `Updated ticket ${id}`;
    if (updates.status && updates.status !== previous.status) {
      action = `Ticket ${id} status updated from '${previous.status}' to '${updates.status}'`;
    } else if (updates.assignedStaffId && updates.assignedStaffId !== previous.assignedStaffId) {
      action = `Ticket ${id} assigned to ${updates.assignedStaffName}`;
    } else if (updates.resolutionNotes) {
      action = `Ticket ${id} resolved with notes`;
    }

    addAuditLog(action, operatorId, operatorName);
    return updated;
  },

  getAuditLogs(): AuditLog[] {
    const db = getDatabase();
    return db
      .prepare(`SELECT * FROM audit_logs ORDER BY timestamp DESC`)
      .all() as unknown as AuditLog[];
  },

  addAuditLog(action: string, userId: string, userName: string) {
    addAuditLog(action, userId, userName);
  },
};
