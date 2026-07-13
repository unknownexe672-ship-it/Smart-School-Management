import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  numeric,
  boolean,
  date,
  time,
  json,
  index,
} from "drizzle-orm/pg-core";

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable("school_users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: text("role").$type<"user" | "admin">().default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// MODULE 1: SMART TEACHER ANALYTICS
// ============================================================================

export const teachers = pgTable(
  "teachers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    phone: varchar("phone", { length: 20 }),
    gender: text("gender").$type<"male" | "female" | "other">(),
    subjects: text("subjects"),
    qualifications: text("qualifications"),
    yearsOfExperience: integer("yearsOfExperience").default(0),
    performanceRating: numeric("performanceRating", { precision: 3, scale: 2 }).default("0.00"),
    attendancePercentage: numeric("attendancePercentage", { precision: 5, scale: 2 }).default("100.00"),
    classesCompleted: integer("classesCompleted").default(0),
    classesAssigned: integer("classesAssigned").default(0),
    status: text("status").$type<"active" | "inactive" | "on_leave">().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("teachers_email_idx").on(table.email),
    genderIdx: index("teachers_gender_idx").on(table.gender),
  })
);

export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = typeof teachers.$inferInsert;

export const teacherAttendance = pgTable(
  "teacher_attendance",
  {
    id: serial("id").primaryKey(),
    teacherId: integer("teacherId")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    attendanceDate: date("attendanceDate").notNull(),
    status: text("status").$type<"present" | "absent" | "late" | "leave">().notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    teacherDateIdx: index("attendance_teacher_date_idx").on(table.teacherId, table.attendanceDate),
  })
);

export type TeacherAttendance = typeof teacherAttendance.$inferSelect;
export type InsertTeacherAttendance = typeof teacherAttendance.$inferInsert;

// ============================================================================
// MODULE 2: SMART CLASS SCHEDULER
// ============================================================================

export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    capacity: integer("capacity").default(30),
    type: text("type").$type<"classroom" | "lab" | "hall" | "office">().default("classroom"),
    facilities: text("facilities"),
    isAvailable: boolean("isAvailable").default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

export const classes = pgTable(
  "classes",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    grade: varchar("grade", { length: 20 }),
    section: varchar("section", { length: 50 }),
    subject: varchar("subject", { length: 100 }).notNull(),
    teacherId: integer("teacherId").references(() => teachers.id, { onDelete: "set null" }),
    studentCount: integer("studentCount").default(0),
    description: text("description"),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    teacherIdx: index("classes_teacher_idx").on(table.teacherId),
  })
);

export type Class = typeof classes.$inferSelect;
export type InsertClass = typeof classes.$inferInsert;

export const schedules = pgTable(
  "schedules",
  {
    id: serial("id").primaryKey(),
    classId: integer("classId")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    teacherId: integer("teacherId")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    roomId: integer("roomId")
      .references(() => rooms.id, { onDelete: "set null" }),
    subject: varchar("subject", { length: 100 }),
    dayOfWeek: text("dayOfWeek").$type<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday">().notNull(),
    startTime: time("startTime").notNull(),
    endTime: time("endTime").notNull(),
    isActive: boolean("isActive").default(true),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    classIdx: index("schedules_class_idx").on(table.classId),
    teacherIdx: index("schedules_teacher_idx").on(table.teacherId),
    roomIdx: index("schedules_room_idx").on(table.roomId),
  })
);

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;

// ============================================================================
// MODULE 3: EMPLOYEE MANAGEMENT
// ============================================================================

export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    phone: varchar("phone", { length: 20 }),
    gender: text("gender").$type<"male" | "female" | "other">(),
    role: varchar("role", { length: 100 }).notNull(),
    department: varchar("department", { length: 100 }).notNull(),
    employmentStatus: text("employmentStatus").$type<"full_time" | "part_time" | "contract" | "temporary">().default("full_time"),
    attendancePercentage: numeric("attendancePercentage", { precision: 5, scale: 2 }).default("100.00"),
    taskCompletionRate: numeric("taskCompletionRate", { precision: 5, scale: 2 }).default("100.00"),
    performanceRating: numeric("performanceRating", { precision: 3, scale: 2 }).default("0.00"),
    startDate: date("startDate"),
    status: text("status").$type<"active" | "inactive" | "on_leave">().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("employees_email_idx").on(table.email),
    roleIdx: index("employees_role_idx").on(table.role),
    genderIdx: index("employees_gender_idx").on(table.gender),
  })
);

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

export const employeeAttendance = pgTable(
  "employee_attendance",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employeeId")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    attendanceDate: date("attendanceDate").notNull(),
    status: text("status").$type<"present" | "absent" | "late" | "leave">().notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    employeeDateIdx: index("emp_attendance_date_idx").on(table.employeeId, table.attendanceDate),
  })
);

export type EmployeeAttendance = typeof employeeAttendance.$inferSelect;
export type InsertEmployeeAttendance = typeof employeeAttendance.$inferInsert;

// ============================================================================
// MODULE 4: ESSENTIALS TRACKER (RESOURCES)
// ============================================================================

export const resources = pgTable(
  "resources",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description"),
    quantity: integer("quantity").default(0),
    unit: varchar("unit", { length: 50 }).default("unit"),
    condition: text("condition").default("good"),
    reorderLevel: integer("reorderLevel").default(0),
    reorderQuantity: integer("reorderQuantity").default(0),
    location: varchar("location", { length: 255 }),
    cost: numeric("cost", { precision: 10, scale: 2 }),
    supplier: varchar("supplier", { length: 255 }),
    status: text("status").$type<"available" | "low_stock" | "out_of_stock" | "borrowed">().default("available"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("resources_category_idx").on(table.category),
    statusIdx: index("resources_status_idx").on(table.status),
  })
);

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

export const resourceBorrowings = pgTable(
  "resource_borrowings",
  {
    id: serial("id").primaryKey(),
    resourceId: integer("resourceId")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    borrowerName: varchar("borrowerName", { length: 255 }).notNull(),
    borrowerRole: varchar("borrowerRole", { length: 100 }),
    quantity: integer("quantity").default(1),
    borrowDate: date("borrowDate").notNull(),
    returnDate: date("returnDate"),
    actualReturnDate: date("actualReturnDate"),
    status: text("status").$type<"borrowed" | "returned" | "overdue">().default("borrowed"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    resourceIdx: index("borrowings_resource_idx").on(table.resourceId),
    statusIdx: index("borrowings_status_idx").on(table.status),
  })
);

export type ResourceBorrowing = typeof resourceBorrowings.$inferSelect;
export type InsertResourceBorrowing = typeof resourceBorrowings.$inferInsert;

// ============================================================================
// MODULE 5: EXPENSE MONITORING
// ============================================================================

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    expenseDate: date("expenseDate").notNull(),
    paymentStatus: text("paymentStatus").default("paid"),
    receiptNumber: varchar("receiptNumber", { length: 100 }),
    vendor: varchar("vendor", { length: 255 }),
    approvalStatus: text("approvalStatus").$type<"pending" | "approved" | "rejected">().default("pending"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("expenses_category_idx").on(table.category),
    dateIdx: index("expenses_date_idx").on(table.expenseDate),
    statusIdx: index("expenses_status_idx").on(table.approvalStatus),
  })
);

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ============================================================================
// AI CHAT & AUDIT
// ============================================================================

export const aiChatHistory = pgTable(
  "ai_chat_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<"user" | "assistant" | "system">().notNull(),
    message: text("message").notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("chat_user_idx").on(table.userId),
    createdIdx: index("chat_created_idx").on(table.createdAt),
  })
);

export type AIChatHistory = typeof aiChatHistory.$inferSelect;
export type InsertAIChatHistory = typeof aiChatHistory.$inferInsert;

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: integer("entityId"),
    oldValues: text("oldValues"),
    newValues: text("newValues"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("audit_user_idx").on(table.userId),
    entityIdx: index("audit_entity_idx").on(table.entityType, table.entityId),
    dateIdx: index("audit_date_idx").on(table.createdAt),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
