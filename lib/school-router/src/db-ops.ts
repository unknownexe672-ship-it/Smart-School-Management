import { eq, and, desc, gte, lte, count, avg, sum, sql, like } from "drizzle-orm";
import { db } from "@workspace/db";
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

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
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
  return db.select().from(teachers).orderBy(desc(teachers.createdAt));
}

export async function getTeacherById(id: number) {
  const result = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createTeacher(data: typeof teachers.$inferInsert) {
  return db.insert(teachers).values(data).returning();
}

export async function updateTeacher(id: number, data: Partial<typeof teachers.$inferInsert>) {
  return db.update(teachers).set({ ...data, updatedAt: new Date() }).where(eq(teachers.id, id)).returning();
}

export async function deleteTeacher(id: number) {
  return db.delete(teachers).where(eq(teachers.id, id));
}

export async function getTeacherStats() {
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
  return db.insert(teacherAttendance).values(data).returning();
}

// ============================================================================
// MODULE 2: CLASS SCHEDULER
// ============================================================================

export async function getAllClasses() {
  return db.select().from(classes).orderBy(desc(classes.createdAt));
}

export async function getClassById(id: number) {
  const result = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createClass(data: typeof classes.$inferInsert) {
  return db.insert(classes).values(data).returning();
}

export async function updateClass(id: number, data: Partial<typeof classes.$inferInsert>) {
  return db.update(classes).set({ ...data, updatedAt: new Date() }).where(eq(classes.id, id)).returning();
}

export async function getAllRooms() {
  return db.select().from(rooms).orderBy(rooms.name);
}

export async function getRoomById(id: number) {
  const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createRoom(data: typeof rooms.$inferInsert) {
  return db.insert(rooms).values(data).returning();
}

export async function getAllSchedules() {
  return db.select().from(schedules).orderBy(schedules.dayOfWeek, schedules.startTime);
}

export async function getSchedulesByClass(classId: number) {
  return db
    .select()
    .from(schedules)
    .where(eq(schedules.classId, classId))
    .orderBy(schedules.dayOfWeek, schedules.startTime);
}

export async function getSchedulesByTeacher(teacherId: number) {
  return db
    .select()
    .from(schedules)
    .where(eq(schedules.teacherId, teacherId))
    .orderBy(schedules.dayOfWeek, schedules.startTime);
}

export async function createSchedule(data: typeof schedules.$inferInsert) {
  return db.insert(schedules).values(data).returning();
}

export async function updateSchedule(id: number, data: Partial<typeof schedules.$inferInsert>) {
  return db.update(schedules).set(data).where(eq(schedules.id, id)).returning();
}

export async function deleteSchedule(id: number) {
  return db.delete(schedules).where(eq(schedules.id, id));
}

// ============================================================================
// MODULE 3: EMPLOYEE MANAGEMENT
// ============================================================================

export async function getAllEmployees() {
  return db.select().from(employees).orderBy(desc(employees.createdAt));
}

export async function getEmployeeById(id: number) {
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createEmployee(data: typeof employees.$inferInsert) {
  return db.insert(employees).values(data).returning();
}

export async function updateEmployee(id: number, data: Partial<typeof employees.$inferInsert>) {
  return db.update(employees).set({ ...data, updatedAt: new Date() }).where(eq(employees.id, id)).returning();
}

export async function deleteEmployee(id: number) {
  return db.delete(employees).where(eq(employees.id, id));
}

export async function getEmployeeStats() {
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
  return db.insert(employeeAttendance).values(data).returning();
}

// ============================================================================
// MODULE 4: ESSENTIALS TRACKER (RESOURCES)
// ============================================================================

export async function getAllResources() {
  return db.select().from(resources).orderBy(resources.name);
}

export async function getResourceById(id: number) {
  const result = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createResource(data: typeof resources.$inferInsert) {
  return db.insert(resources).values(data).returning();
}

export async function updateResource(id: number, data: Partial<typeof resources.$inferInsert>) {
  return db.update(resources).set({ ...data, updatedAt: new Date() }).where(eq(resources.id, id)).returning();
}

export async function deleteResource(id: number) {
  return db.delete(resources).where(eq(resources.id, id));
}

export async function getResourcesNeedingReorder() {
  return db
    .select()
    .from(resources)
    .where(
      sql`${resources.quantity} <= ${resources.reorderLevel}`
    )
    .orderBy(resources.name);
}

export async function createResourceBorrowing(data: typeof resourceBorrowings.$inferInsert) {
  return db.insert(resourceBorrowings).values(data).returning();
}

export async function getResourceBorrowings(resourceId?: number) {
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
  return db.select().from(expenses).orderBy(desc(expenses.expenseDate));
}

export async function getExpenseById(id: number) {
  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createExpense(data: typeof expenses.$inferInsert) {
  return db.insert(expenses).values(data).returning();
}

export async function updateExpense(id: number, data: Partial<typeof expenses.$inferInsert>) {
  return db.update(expenses).set({ ...data, updatedAt: new Date() }).where(eq(expenses.id, id)).returning();
}

export async function deleteExpense(id: number) {
  return db.delete(expenses).where(eq(expenses.id, id));
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
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
  return db.insert(aiChatHistory).values(data).returning();
}

export async function getChatHistory(userId: number, limit = 50) {
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
