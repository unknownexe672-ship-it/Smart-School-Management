import { eq, and, desc, gte, lte, count, avg, sum, sql, like } from "drizzle-orm";
import { db, IS_DEMO_MODE } from "@workspace/db";
import {
  users,
  teachers,
  teacherAttendance,
  classes,
  schedules,
  rooms,
  employees,
  employeeAttendance,
  resources,
  resourceBorrowings,
  expenses,
  aiChatHistory,
  auditLogs,
  type InsertUser,
} from "@workspace/db";
import {
  DEMO_TEACHERS,
  DEMO_TEACHER_STATS,
  DEMO_CLASSES,
  DEMO_ROOMS,
  DEMO_SCHEDULES,
  DEMO_EMPLOYEES,
  DEMO_EMPLOYEE_STATS,
  DEMO_RESOURCES,
  DEMO_EXPENSES,
  DEMO_EXPENSE_STATS,
  DEMO_ANALYTICS,
  DEMO_MONTHLY_EXPENSE,
  DEMO_MONTHLY_TEACHER_PERF,
  DEMO_MONTHLY_EMPLOYEE,
} from "./demo-data.js";

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (IS_DEMO_MODE) return;
  if (!user.openId) throw new Error("User openId is required");
  await db
    .insert(users)
    .values({ ...user, lastSignedIn: new Date() })
    .onConflictDoUpdate({
      target: users.openId,
      set: {
        name: user.name,
        email: user.email,
        loginMethod: user.loginMethod,
        lastSignedIn: new Date(),
        ...(user.role ? { role: user.role } : {}),
      },
    });
}

export async function getUserByOpenId(openId: string) {
  if (IS_DEMO_MODE) return { id: 1, openId, name: "Demo Admin", role: "admin" } as any;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// MODULE 1: TEACHER ANALYTICS
// ============================================================================

export async function getAllTeachers() {
  if (IS_DEMO_MODE) return DEMO_TEACHERS as any[];
  return db.select().from(teachers).orderBy(desc(teachers.createdAt));
}

export async function getTeacherById(id: number) {
  if (IS_DEMO_MODE) return DEMO_TEACHERS.find((t) => t.id === id) ?? null as any;
  const result = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createTeacher(data: typeof teachers.$inferInsert) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99 }] as any[];
  return db.insert(teachers).values(data).returning();
}

export async function updateTeacher(id: number, data: Partial<typeof teachers.$inferInsert>) {
  if (IS_DEMO_MODE) return [{ id, ...data }] as any[];
  return db.update(teachers).set({ ...data, updatedAt: new Date() }).where(eq(teachers.id, id)).returning();
}

export async function deleteTeacher(id: number) {
  if (IS_DEMO_MODE) return;
  return db.delete(teachers).where(eq(teachers.id, id));
}

export async function getTeacherStats() {
  if (IS_DEMO_MODE) return DEMO_TEACHER_STATS as any;
  const result = await db
    .select({
      totalTeachers: count(),
      avgPerformance: avg(teachers.performanceRating),
      avgAttendance: avg(teachers.attendancePercentage),
    })
    .from(teachers)
    .where(eq(teachers.status, "active"));
  return result[0] ?? null;
}

export async function getTeacherAttendanceByDate(startDate: Date, endDate: Date) {
  if (IS_DEMO_MODE) return [] as any[];
  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];
  return db
    .select()
    .from(teacherAttendance)
    .where(
      and(
        gte(teacherAttendance.attendanceDate, start),
        lte(teacherAttendance.attendanceDate, end)
      )
    )
    .orderBy(desc(teacherAttendance.attendanceDate));
}

export async function recordTeacherAttendance(data: typeof teacherAttendance.$inferInsert) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99 }] as any[];
  return db.insert(teacherAttendance).values(data).returning();
}

// ============================================================================
// MODULE 2: CLASS SCHEDULER
// ============================================================================

export async function getAllClasses() {
  if (IS_DEMO_MODE) return DEMO_CLASSES as any[];
  return db.select().from(classes).orderBy(desc(classes.createdAt));
}

export async function getClassById(id: number) {
  if (IS_DEMO_MODE) return DEMO_CLASSES.find((c) => c.id === id) ?? null as any;
  const result = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createClass(data: typeof classes.$inferInsert) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99 }] as any[];
  return db.insert(classes).values(data).returning();
}

export async function updateClass(id: number, data: Partial<typeof classes.$inferInsert>) {
  if (IS_DEMO_MODE) return [{ id, ...data }] as any[];
  return db.update(classes).set({ ...data, updatedAt: new Date() }).where(eq(classes.id, id)).returning();
}

export async function getAllRooms() {
  if (IS_DEMO_MODE) return DEMO_ROOMS as any[];
  return db.select().from(rooms).orderBy(rooms.name);
}

export async function getRoomById(id: number) {
  if (IS_DEMO_MODE) return DEMO_ROOMS.find((r) => r.id === id) ?? null as any;
  const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createRoom(data: typeof rooms.$inferInsert) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99 }] as any[];
  return db.insert(rooms).values(data).returning();
}

export async function getAllSchedules() {
  if (IS_DEMO_MODE) return DEMO_SCHEDULES as any[];
  return db.select().from(schedules).orderBy(schedules.dayOfWeek, schedules.startTime);
}

export async function getSchedulesByClass(classId: number) {
  if (IS_DEMO_MODE) return DEMO_SCHEDULES.filter((s) => s.classId === classId) as any[];
  return db
    .select()
    .from(schedules)
    .where(eq(schedules.classId, classId))
    .orderBy(schedules.dayOfWeek, schedules.startTime);
}

export async function getSchedulesByTeacher(teacherId: number) {
  if (IS_DEMO_MODE) return DEMO_SCHEDULES.filter((s) => s.teacherId === teacherId) as any[];
  return db
    .select()
    .from(schedules)
    .where(eq(schedules.teacherId, teacherId))
    .orderBy(schedules.dayOfWeek, schedules.startTime);
}

export async function createSchedule(data: typeof schedules.$inferInsert) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99 }] as any[];
  return db.insert(schedules).values(data).returning();
}

export async function updateSchedule(id: number, data: Partial<typeof schedules.$inferInsert>) {
  if (IS_DEMO_MODE) return [{ id, ...data }] as any[];
  return db.update(schedules).set(data).where(eq(schedules.id, id)).returning();
}

export async function deleteSchedule(id: number) {
  if (IS_DEMO_MODE) return;
  return db.delete(schedules).where(eq(schedules.id, id));
}

// ============================================================================
// MODULE 3: EMPLOYEE MANAGEMENT
// ============================================================================

export async function getAllEmployees() {
  if (IS_DEMO_MODE) return DEMO_EMPLOYEES as any[];
  return db.select().from(employees).orderBy(desc(employees.createdAt));
}

export async function getEmployeeById(id: number) {
  if (IS_DEMO_MODE) return DEMO_EMPLOYEES.find((e) => e.id === id) ?? null as any;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createEmployee(data: typeof employees.$inferInsert) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99 }] as any[];
  return db.insert(employees).values(data).returning();
}

export async function updateEmployee(id: number, data: Partial<typeof employees.$inferInsert>) {
  if (IS_DEMO_MODE) return [{ id, ...data }] as any[];
  return db.update(employees).set({ ...data, updatedAt: new Date() }).where(eq(employees.id, id)).returning();
}

export async function deleteEmployee(id: number) {
  if (IS_DEMO_MODE) return;
  return db.delete(employees).where(eq(employees.id, id));
}

export async function getEmployeeStats() {
  if (IS_DEMO_MODE) return DEMO_EMPLOYEE_STATS as any;
  const result = await db
    .select({
      totalEmployees: count(),
      avgPerformance: avg(employees.performanceRating),
      avgAttendance: avg(employees.attendancePercentage),
    })
    .from(employees)
    .where(eq(employees.status, "active"));
  return result[0] ?? null;
}

export async function recordEmployeeAttendance(data: typeof employeeAttendance.$inferInsert) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99 }] as any[];
  return db.insert(employeeAttendance).values(data).returning();
}

// ============================================================================
// MODULE 4: ESSENTIALS TRACKER (RESOURCES)
// ============================================================================

export async function getAllResources() {
  if (IS_DEMO_MODE) return DEMO_RESOURCES as any[];
  return db.select().from(resources).orderBy(resources.name);
}

export async function getResourceById(id: number) {
  if (IS_DEMO_MODE) return DEMO_RESOURCES.find((r) => r.id === id) ?? null as any;
  const result = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createResource(data: typeof resources.$inferInsert) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99 }] as any[];
  return db.insert(resources).values(data).returning();
}

export async function updateResource(id: number, data: Partial<typeof resources.$inferInsert>) {
  if (IS_DEMO_MODE) return [{ id, ...data }] as any[];
  return db.update(resources).set({ ...data, updatedAt: new Date() }).where(eq(resources.id, id)).returning();
}

export async function deleteResource(id: number) {
  if (IS_DEMO_MODE) return;
  return db.delete(resources).where(eq(resources.id, id));
}

export async function getResourcesNeedingReorder() {
  if (IS_DEMO_MODE) return [] as any[];
  return db
    .select()
    .from(resources)
    .where(
      sql`${resources.quantity} <= ${resources.reorderLevel}`
    )
    .orderBy(resources.name);
}

export async function createResourceBorrowing(data: typeof resourceBorrowings.$inferInsert) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99 }] as any[];
  return db.insert(resourceBorrowings).values(data).returning();
}

export async function getResourceBorrowings(resourceId?: number) {
  if (IS_DEMO_MODE) return [] as any[];
  if (resourceId) {
    return db
      .select()
      .from(resourceBorrowings)
      .where(eq(resourceBorrowings.resourceId, resourceId))
      .orderBy(desc(resourceBorrowings.createdAt));
  }
  return db.select().from(resourceBorrowings).orderBy(desc(resourceBorrowings.createdAt));
}

// ============================================================================
// MODULE 5: EXPENSE MONITORING
// ============================================================================

export async function getAllExpenses() {
  if (IS_DEMO_MODE) return DEMO_EXPENSES as any[];
  return db.select().from(expenses).orderBy(desc(expenses.expenseDate));
}

export async function getExpenseById(id: number) {
  if (IS_DEMO_MODE) return DEMO_EXPENSES.find((e) => e.id === id) ?? null as any;
  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createExpense(data: typeof expenses.$inferInsert) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99 }] as any[];
  return db.insert(expenses).values(data).returning();
}

export async function updateExpense(id: number, data: Partial<typeof expenses.$inferInsert>) {
  if (IS_DEMO_MODE) return [{ id, ...data }] as any[];
  return db.update(expenses).set({ ...data, updatedAt: new Date() }).where(eq(expenses.id, id)).returning();
}

export async function deleteExpense(id: number) {
  if (IS_DEMO_MODE) return;
  return db.delete(expenses).where(eq(expenses.id, id));
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
  if (IS_DEMO_MODE) return DEMO_EXPENSES as any[];
  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];
  return db
    .select()
    .from(expenses)
    .where(
      and(
        gte(expenses.expenseDate, start),
        lte(expenses.expenseDate, end)
      )
    )
    .orderBy(desc(expenses.expenseDate));
}

export async function getExpenseStats() {
  if (IS_DEMO_MODE) return DEMO_EXPENSE_STATS as any;
  const result = await db
    .select({
      totalExpenses: sum(expenses.amount),
      count: count(),
    })
    .from(expenses);
  return result[0] ?? null;
}

// ============================================================================
// CHAT HISTORY
// ============================================================================

export async function saveChatMessage(data: { userId: number; role: "user" | "assistant" | "system"; message: string; metadata?: string }) {
  if (IS_DEMO_MODE) return [{ ...data, id: 99, createdAt: new Date().toISOString() }] as any[];
  return db.insert(aiChatHistory).values(data).returning();
}

export async function getChatHistory(userId: number, limit = 50) {
  if (IS_DEMO_MODE) return [] as any[];
  return db
    .select()
    .from(aiChatHistory)
    .where(eq(aiChatHistory.userId, userId))
    .orderBy(aiChatHistory.createdAt)
    .limit(limit);
}

// ============================================================================
// MONTHLY SUMMARIES
// ============================================================================

export async function getMonthlyExpenseSummary(year: number, month: number) {
  if (IS_DEMO_MODE) return DEMO_MONTHLY_EXPENSE as any[];
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
  const result = await db
    .select({
      category: expenses.category,
      total: sum(expenses.amount),
      count: count(),
    })
    .from(expenses)
    .where(
      and(
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      )
    )
    .groupBy(expenses.category);
  return result;
}

export async function getMonthlyTeacherPerformanceSummary(_year: number, _month: number) {
  if (IS_DEMO_MODE) return DEMO_MONTHLY_TEACHER_PERF as any;
  const result = await db
    .select({
      totalTeachers: count(),
      avgPerformance: avg(teachers.performanceRating),
      avgAttendance: avg(teachers.attendancePercentage),
    })
    .from(teachers)
    .where(eq(teachers.status, "active"));
  return result[0] ?? null;
}

export async function getMonthlyEmployeeSummary(_year: number, _month: number) {
  if (IS_DEMO_MODE) return DEMO_MONTHLY_EMPLOYEE as any;
  const result = await db
    .select({
      totalEmployees: count(),
      avgPerformance: avg(employees.performanceRating),
      avgAttendance: avg(employees.attendancePercentage),
    })
    .from(employees)
    .where(eq(employees.status, "active"));
  return result[0] ?? null;
}

// ============================================================================
// ANALYTICS — full school data snapshot for Amira AI + PPT export
// ============================================================================

export async function getSchoolAnalyticsData() {
  if (IS_DEMO_MODE) return DEMO_ANALYTICS as any;

  const [teacherData, employeeData, expenseData, waterExp, electricExp, topTeachers] =
    await Promise.all([
      db
        .select({
          totalTeachers: count(),
          avgPerformance: avg(teachers.performanceRating),
          avgAttendance: avg(teachers.attendancePercentage),
        })
        .from(teachers),

      db
        .select({
          totalEmployees: count(),
          avgPerformance: avg(employees.performanceRating),
          avgAttendance: avg(employees.attendancePercentage),
        })
        .from(employees),

      db
        .select({ category: expenses.category, total: sum(expenses.amount), count: count() })
        .from(expenses)
        .groupBy(expenses.category),

      db
        .select({
          id: expenses.id,
          title: expenses.title,
          amount: expenses.amount,
          expenseDate: expenses.expenseDate,
          description: expenses.description,
        })
        .from(expenses)
        .where(like(expenses.title, "%Water%"))
        .orderBy(desc(expenses.expenseDate))
        .limit(30),

      db
        .select({
          id: expenses.id,
          title: expenses.title,
          amount: expenses.amount,
          expenseDate: expenses.expenseDate,
          description: expenses.description,
        })
        .from(expenses)
        .where(like(expenses.title, "%Electricity%"))
        .orderBy(desc(expenses.expenseDate))
        .limit(30),

      db
        .select({
          name: teachers.name,
          performanceRating: teachers.performanceRating,
          attendancePercentage: teachers.attendancePercentage,
          subjects: teachers.subjects,
          status: teachers.status,
        })
        .from(teachers)
        .orderBy(desc(teachers.performanceRating))
        .limit(5),
    ]);

  return {
    teachers: teacherData[0] ?? null,
    employees: employeeData[0] ?? null,
    expensesByCategory: expenseData,
    waterExpenses: waterExp,
    electricExpenses: electricExp,
    topTeachers,
  };
}

// ============================================================================
// SEED DATABASE WITH DEMO DATA
// ============================================================================

export async function seedDatabase() {
  if (IS_DEMO_MODE) throw new Error("Cannot seed database in demo mode");

  try {
    // Clear existing data in correct dependency order
    // Delete in reverse order of foreign key dependencies
    try { await db.delete(schedules); } catch (e) { console.log("schedules delete:", e); }
    try { await db.delete(resourceBorrowings); } catch (e) { console.log("resourceBorrowings delete:", e); }
    try { await db.delete(teacherAttendance); } catch (e) { console.log("teacherAttendance delete:", e); }
    try { await db.delete(employeeAttendance); } catch (e) { console.log("employeeAttendance delete:", e); }
    try { await db.delete(classes); } catch (e) { console.log("classes delete:", e); }
    try { await db.delete(teachers); } catch (e) { console.log("teachers delete:", e); }
    try { await db.delete(employees); } catch (e) { console.log("employees delete:", e); }
    try { await db.delete(resources); } catch (e) { console.log("resources delete:", e); }
    try { await db.delete(expenses); } catch (e) { console.log("expenses delete:", e); }
    try { await db.delete(rooms); } catch (e) { console.log("rooms delete:", e); }

    // Insert teachers
    const now = new Date();
    for (const teacher of DEMO_TEACHERS as any[]) {
      await db.insert(teachers).values({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        gender: teacher.gender as "male" | "female" | "other",
        subjects: Array.isArray(teacher.subjects) ? teacher.subjects.join(", ") : teacher.subjects,
        qualifications: teacher.qualifications,
        yearsOfExperience: teacher.yearsOfExperience,
        performanceRating: parseFloat(teacher.performanceRating),
        attendancePercentage: parseFloat(teacher.attendancePercentage),
        status: teacher.status as "active" | "inactive" | "on_leave",
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing({ target: teachers.email });
    }

    // Insert rooms
    for (const room of DEMO_ROOMS as any[]) {
      await db.insert(rooms).values({
        name: room.name,
        type: "classroom" as any,
        capacity: room.capacity,
        facilities: Array.isArray(room.facilities) ? room.facilities.join(", ") : room.facilities,
        isAvailable: room.status === "available",
        createdAt: now,
      }).onConflictDoNothing({ target: rooms.name });
    }

    // Insert classes
    for (const cls of DEMO_CLASSES as any[]) {
      await db.insert(classes).values({
        name: cls.name,
        grade: cls.form.toString(),
        subject: cls.subject,
        teacherId: cls.teacherId,
        studentCount: cls.studentCount,
        isActive: cls.status === "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Insert schedules
    for (const sched of DEMO_SCHEDULES as any[]) {
      const dayMap: Record<number, any> = {
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
      };
      await db.insert(schedules).values({
        classId: sched.classId,
        teacherId: sched.teacherId,
        roomId: sched.roomId,
        subject: sched.subject,
        dayOfWeek: dayMap[sched.dayOfWeek] || "monday",
        startTime: sched.startTime,
        endTime: sched.endTime,
        isActive: sched.status === "active",
        createdAt: now,
      });
    }

    // Insert employees
    for (const emp of DEMO_EMPLOYEES as any[]) {
      await db.insert(employees).values({
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        gender: emp.gender as "male" | "female" | "other",
        role: emp.position,
        department: emp.department,
        employmentStatus: emp.employeeType as any,
        performanceRating: parseFloat(emp.performanceRating),
        attendancePercentage: parseFloat(emp.attendancePercentage),
        startDate: emp.joinDate,
        status: emp.status as "active" | "inactive" | "on_leave",
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing({ target: employees.email });
    }

    // Insert resources
    for (const res of DEMO_RESOURCES as any[]) {
      await db.insert(resources).values({
        name: res.name,
        category: res.category,
        quantity: res.quantity,
        unit: res.unit,
        reorderLevel: res.reorderLevel,
        cost: parseFloat(res.unitCost),
        supplier: res.supplier,
        location: res.location,
        status: res.status as "available" | "low_stock" | "out_of_stock" | "borrowed",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Insert expenses
    for (const exp of DEMO_EXPENSES as any[]) {
      await db.insert(expenses).values({
        title: exp.title,
        description: exp.description,
        amount: parseFloat(exp.amount),
        category: exp.category,
        expenseDate: exp.expenseDate,
        paymentStatus: exp.status,
        receiptNumber: exp.receiptNumber,
        vendor: exp.vendor,
        approvalStatus: "approved" as any,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, message: "Database seeded successfully!" };
  } catch (error) {
    console.error("Seed error:", error);
    throw error;
  }
}
