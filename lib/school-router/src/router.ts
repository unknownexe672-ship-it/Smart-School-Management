import { z } from "zod";
import { router, publicProcedure } from "./trpc.js";
import { ADMIN_USER } from "./context.js";
import OpenAI from "openai";
import pptxgen from "pptxgenjs";
import {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherStats,
  getTeacherAttendanceByDate,
  recordTeacherAttendance,
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  getAllRooms,
  getRoomById,
  createRoom,
  getAllSchedules,
  getSchedulesByClass,
  getSchedulesByTeacher,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
  recordEmployeeAttendance,
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getResourcesNeedingReorder,
  createResourceBorrowing,
  getResourceBorrowings,
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByDateRange,
  getExpenseStats,
  saveChatMessage,
  getChatHistory,
  getMonthlyExpenseSummary,
  getMonthlyTeacherPerformanceSummary,
  getMonthlyEmployeeSummary,
  getSchoolAnalyticsData,
} from "./db-ops.js";

// ── DeepSeek client (OpenAI-compatible) ──────────────────────────────────────
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "sk-placeholder",
  baseURL: "https://api.deepseek.com/v1",
});

// ── PPT colour palette ────────────────────────────────────────────────────────
const C = {
  NAVY:    "0F2044",   // deep navy — primary
  TEAL:    "0D9488",   // accent teal
  GOLD:    "F59E0B",   // amber accent
  SLATE:   "334155",   // body text
  LGRAY:   "F1F5F9",   // slide background (light)
  MID:     "CBD5E1",   // subtle dividers
  WHITE:   "FFFFFF",
  BLUE:    "2563EB",   // secondary accent
  GREEN:   "16A34A",   // positive indicator
  RED:     "DC2626",   // alert
  MUTED:   "64748B",   // secondary text
  LBLUE:   "DBEAFE",   // light blue fill
};

// ── Helper: month label from "YYYY-MM-DD" ────────────────────────────────────
function toMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleString("en-MY", { month: "short", year: "2-digit" });
}

// ── Helper: group expense array by month, summing amounts ────────────────────
function groupByMonth(items: { expenseDate: string; amount: string | null }[]): { label: string; total: number }[] {
  // Sort ascending by date so the resulting array is in chronological order
  const sorted = [...items].sort((a, b) => (a.expenseDate ?? "").localeCompare(b.expenseDate ?? ""));
  const map = new Map<string, number>();
  for (const item of sorted) {
    const lbl = toMonthLabel(item.expenseDate ?? "");
    const cur = map.get(lbl) ?? 0;
    map.set(lbl, cur + parseFloat(item.amount ?? "0"));
  }
  return Array.from(map.entries()).map(([label, total]) => ({ label, total }));
}

// ── Helper: add professional slide header ────────────────────────────────────
function addSlideHeader(
  slide: pptxgen.Slide,
  title: string,
  subtitle: string,
  accentColor = C.TEAL,
) {
  // Top accent bar
  slide.addShape("rect", {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: accentColor },
  });
  // Title
  slide.addText(title, {
    x: 0.45, y: 0.18, w: 9.1, h: 0.52,
    fontSize: 22, bold: true, color: C.NAVY, fontFace: "Calibri",
  });
  // Subtitle / data line
  slide.addText(subtitle, {
    x: 0.45, y: 0.68, w: 9.1, h: 0.28,
    fontSize: 10.5, color: C.MUTED, fontFace: "Calibri",
  });
  // Bottom rule
  slide.addShape("rect", {
    x: 0.45, y: 0.95, w: 9.1, h: 0.025,
    fill: { color: C.MID },
  });
}

// ── Helper: small KPI card (shape + two text lines) ──────────────────────────
function addKpiCard(
  slide: pptxgen.Slide,
  x: number, y: number,
  w: number, h: number,
  label: string, value: string, note: string,
  accentColor = C.TEAL,
) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: C.WHITE },
    line: { color: C.MID, width: 0.75 },
    shadow: { type: "outer", blur: 4, offset: 1, angle: 45, color: "000000", opacity: 0.07 },
  });
  slide.addShape("rect", {
    x, y, w: 0.06, h,
    fill: { color: accentColor },
  });
  slide.addText(value, {
    x: x + 0.15, y: y + 0.08, w: w - 0.2, h: h * 0.45,
    fontSize: 20, bold: true, color: C.NAVY, fontFace: "Calibri",
  });
  slide.addText(label, {
    x: x + 0.15, y: y + h * 0.48, w: w - 0.2, h: h * 0.28,
    fontSize: 10, bold: true, color: C.SLATE, fontFace: "Calibri",
  });
  if (note) {
    slide.addText(note, {
      x: x + 0.15, y: y + h * 0.75, w: w - 0.2, h: h * 0.22,
      fontSize: 8.5, color: C.MUTED, fontFace: "Calibri",
    });
  }
}

// ── Helper: rating bar (visual progress bar via shapes) ──────────────────────
function addRatingBar(
  slide: pptxgen.Slide,
  x: number, y: number, w: number, h: number,
  ratio: number,  // 0–1
  color = C.TEAL,
) {
  slide.addShape("rect", { x, y, w, h, fill: { color: C.LGRAY }, line: { color: C.MID, width: 0.5 } });
  if (ratio > 0) {
    slide.addShape("rect", { x, y, w: w * Math.min(ratio, 1), h, fill: { color } });
  }
}

// ── Helper: table cell options ────────────────────────────────────────────────
function hd(fill = C.NAVY): pptxgen.TableCellProps {
  return { fill: { color: fill }, color: C.WHITE, bold: true, align: "center", valign: "middle", fontFace: "Calibri" };
}
function td(fill = C.WHITE, align: pptxgen.HAlign = "center"): pptxgen.TableCellProps {
  return { fill: { color: fill }, color: C.SLATE, align, valign: "middle", fontFace: "Calibri" };
}

export const appRouter = router({
  // ============================================================================
  // AUTH (mock — no real auth needed)
  // ============================================================================
  auth: router({
    me: publicProcedure.query(() => ADMIN_USER),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),

  // ============================================================================
  // MODULE 1: SMART TEACHER ANALYTICS
  // ============================================================================
  teachers: router({
    list: publicProcedure.query(() => getAllTeachers()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getTeacherById(input.id)),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().optional(),
          gender: z.enum(["male", "female", "other"]).optional(),
          subjects: z.string().optional(),
          qualifications: z.string().optional(),
          yearsOfExperience: z.number().default(0),
        })
      )
      .mutation(({ input }) => createTeacher(input)),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          gender: z.enum(["male", "female", "other"]).optional(),
          performanceRating: z
            .number()
            .optional()
            .transform((v) => v?.toString()),
          attendancePercentage: z
            .number()
            .optional()
            .transform((v) => v?.toString()),
          status: z.enum(["active", "inactive", "on_leave"]).optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateTeacher(id, data as Parameters<typeof updateTeacher>[1]);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteTeacher(input.id)),

    getStats: publicProcedure.query(() => getTeacherStats()),

    recordAttendance: publicProcedure
      .input(
        z.object({
          teacherId: z.number(),
          attendanceDate: z.date(),
          status: z.enum(["present", "absent", "late", "leave"]),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) =>
        recordTeacherAttendance({
          ...input,
          attendanceDate: input.attendanceDate.toISOString().split("T")[0],
        })
      ),

    getAttendanceByDate: publicProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date() }))
      .query(({ input }) =>
        getTeacherAttendanceByDate(input.startDate, input.endDate)
      ),
  }),

  // ============================================================================
  // MODULE 2: SMART CLASS SCHEDULER
  // ============================================================================
  classes: router({
    list: publicProcedure.query(() => getAllClasses()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getClassById(input.id)),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          grade: z.string().optional(),
          section: z.string().optional(),
          subject: z.string().min(1),
          teacherId: z.number().optional(),
          studentCount: z.number().default(0),
          description: z.string().optional(),
        })
      )
      .mutation(({ input }) => createClass(input)),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          grade: z.string().optional(),
          section: z.string().optional(),
          subject: z.string().optional(),
          teacherId: z.number().optional().nullable(),
          studentCount: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateClass(id, data);
      }),
  }),

  rooms: router({
    list: publicProcedure.query(() => getAllRooms()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getRoomById(input.id)),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          capacity: z.number().default(30),
          type: z.enum(["classroom", "lab", "hall", "office"]).default("classroom"),
          facilities: z.string().optional(),
        })
      )
      .mutation(({ input }) => createRoom(input)),
  }),

  schedules: router({
    list: publicProcedure.query(() => getAllSchedules()),

    getByClass: publicProcedure
      .input(z.object({ classId: z.number() }))
      .query(({ input }) => getSchedulesByClass(input.classId)),

    getByTeacher: publicProcedure
      .input(z.object({ teacherId: z.number() }))
      .query(({ input }) => getSchedulesByTeacher(input.teacherId)),

    create: publicProcedure
      .input(
        z.object({
          classId: z.number(),
          teacherId: z.number(),
          roomId: z.number().optional(),
          subject: z.string().optional(),
          dayOfWeek: z.enum([
            "monday", "tuesday", "wednesday", "thursday",
            "friday", "saturday", "sunday",
          ]),
          startTime: z.string(),
          endTime: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => createSchedule(input)),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          classId: z.number().optional(),
          teacherId: z.number().optional(),
          roomId: z.number().optional().nullable(),
          subject: z.string().optional(),
          dayOfWeek: z
            .enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
            .optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateSchedule(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteSchedule(input.id)),
  }),

  // ============================================================================
  // MODULE 3: EMPLOYEE MANAGEMENT
  // ============================================================================
  employees: router({
    list: publicProcedure.query(() => getAllEmployees()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getEmployeeById(input.id)),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().optional(),
          gender: z.enum(["male", "female", "other"]).optional(),
          role: z.string().min(1),
          department: z.string().min(1),
          employmentStatus: z
            .enum(["full_time", "part_time", "contract", "temporary"])
            .default("full_time"),
          startDate: z.string().optional(),
        })
      )
      .mutation(({ input }) => createEmployee(input)),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          gender: z.enum(["male", "female", "other"]).optional(),
          role: z.string().optional(),
          department: z.string().optional(),
          employmentStatus: z
            .enum(["full_time", "part_time", "contract", "temporary"])
            .optional(),
          performanceRating: z
            .number()
            .optional()
            .transform((v) => v?.toString()),
          attendancePercentage: z
            .number()
            .optional()
            .transform((v) => v?.toString()),
          status: z.enum(["active", "inactive", "on_leave"]).optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateEmployee(id, data as Parameters<typeof updateEmployee>[1]);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteEmployee(input.id)),

    getStats: publicProcedure.query(() => getEmployeeStats()),

    recordAttendance: publicProcedure
      .input(
        z.object({
          employeeId: z.number(),
          attendanceDate: z.date(),
          status: z.enum(["present", "absent", "late", "leave"]),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) =>
        recordEmployeeAttendance({
          ...input,
          attendanceDate: input.attendanceDate.toISOString().split("T")[0],
        })
      ),
  }),

  // ============================================================================
  // MODULE 4: ESSENTIALS TRACKER
  // ============================================================================
  resources: router({
    list: publicProcedure.query(() => getAllResources()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getResourceById(input.id)),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          category: z.string().min(1),
          description: z.string().optional(),
          quantity: z.number().default(0),
          unit: z.string().default("unit"),
          condition: z.string().optional().default("good"),
          reorderLevel: z.number().default(0),
          reorderQuantity: z.number().default(0),
          location: z.string().optional(),
          cost: z.string().optional(),
          supplier: z.string().optional(),
        })
      )
      .mutation(({ input }) => createResource(input)),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          category: z.string().optional(),
          description: z.string().optional(),
          quantity: z.number().optional(),
          unit: z.string().optional(),
          condition: z.string().optional(),
          reorderLevel: z.number().optional(),
          reorderQuantity: z.number().optional(),
          location: z.string().optional(),
          cost: z.string().optional(),
          supplier: z.string().optional(),
          status: z
            .enum(["available", "low_stock", "out_of_stock", "borrowed"])
            .optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateResource(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteResource(input.id)),

    getNeedingReorder: publicProcedure.query(() => getResourcesNeedingReorder()),

    createBorrowing: publicProcedure
      .input(
        z.object({
          resourceId: z.number(),
          borrowerName: z.string().min(1),
          borrowerRole: z.string().optional(),
          quantity: z.number().default(1),
          borrowDate: z.string(),
          returnDate: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => createResourceBorrowing(input)),

    getBorrowings: publicProcedure
      .input(z.object({ resourceId: z.number().optional() }))
      .query(({ input }) => getResourceBorrowings(input.resourceId)),
  }),

  // ============================================================================
  // MODULE 5: EXPENSE MONITORING
  // ============================================================================
  expenses: router({
    list: publicProcedure.query(() => getAllExpenses()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getExpenseById(input.id)),

    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          amount: z.string(),
          category: z.string().min(1),
          expenseDate: z.string(),
          paymentStatus: z.string().optional().default("paid"),
          receiptNumber: z.string().optional(),
          vendor: z.string().optional(),
          approvalStatus: z.enum(["pending", "approved", "rejected"]).default("pending"),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => createExpense({
        title: input.title ?? input.category,
        description: input.description,
        amount: input.amount,
        category: input.category,
        expenseDate: input.expenseDate,
        paymentStatus: input.paymentStatus,
        receiptNumber: input.receiptNumber,
        vendor: input.vendor,
        approvalStatus: input.approvalStatus,
        notes: input.notes,
      })),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          amount: z.string().optional(),
          category: z.string().optional(),
          expenseDate: z.string().optional(),
          paymentStatus: z.string().optional(),
          receiptNumber: z.string().optional(),
          vendor: z.string().optional(),
          approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateExpense(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteExpense(input.id)),

    getByDateRange: publicProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date() }))
      .query(({ input }) =>
        getExpensesByDateRange(input.startDate, input.endDate)
      ),

    getStats: publicProcedure.query(() => getExpenseStats()),
  }),

  // ============================================================================
  // MODULE 6: AMIRA AI ASSISTANT (DeepSeek-powered)
  // ============================================================================
  amira: router({
    getChatHistory: publicProcedure.query(() => getChatHistory(ADMIN_USER.id, 100)),

    getAnalytics: publicProcedure.query(() => getSchoolAnalyticsData()),

    askAmira: publicProcedure
      .input(
        z.object({
          question: z.string().min(1),
          history: z
            .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const analytics = await getSchoolAnalyticsData();

        const n = (v: unknown) => parseFloat(String(v ?? "0"));

        const waterTotal = analytics.waterExpenses.reduce((s, e) => s + n(e.amount), 0);
        const elecTotal  = analytics.electricExpenses.reduce((s, e) => s + n(e.amount), 0);

        const systemPrompt = `You are Amira, an intelligent AI assistant for the Smart School Management System (SSM) in Malaysia. You have real-time access to the school database and give concise, data-driven, professional insights in a friendly tone.

== LIVE SCHOOL DATA ==
Teachers  : ${analytics.teachers?.totalTeachers ?? 0} total · avg performance ${n(analytics.teachers?.avgPerformance).toFixed(2)}/5.00 · avg attendance ${n(analytics.teachers?.avgAttendance).toFixed(1)}%
Employees : ${analytics.employees?.totalEmployees ?? 0} total · avg performance ${n(analytics.employees?.avgPerformance).toFixed(2)}/5.00

Expenses by category:
${analytics.expensesByCategory.map(e => `  • ${e.category}: RM ${n(e.total).toFixed(2)} (${e.count} entries)`).join("\n")}

Water Usage (${analytics.waterExpenses.length} auto-logged batches, total RM ${waterTotal.toFixed(2)}):
${analytics.waterExpenses.slice(0, 8).map(e => `  • ${e.title} on ${e.expenseDate} — RM ${e.amount}`).join("\n")}

Electricity Usage (${analytics.electricExpenses.length} auto-logged batches, total RM ${elecTotal.toFixed(2)}):
${analytics.electricExpenses.slice(0, 8).map(e => `  • ${e.title} on ${e.expenseDate} — RM ${e.amount}`).join("\n")}

Top 5 Teachers by Performance:
${analytics.topTeachers.map((t, i) => `  ${i + 1}. ${t.name} — ${t.subjects ?? "N/A"} — ${n(t.performanceRating).toFixed(2)}/5.00 · ${n(t.attendancePercentage).toFixed(1)}% attendance`).join("\n")}

== INSTRUCTIONS ==
- Use RM for currency (Malaysian ringgit).
- Be specific, refer to actual numbers from the data above.
- When comparing water vs electricity, highlight which costs more and why.
- Format responses with headers, bullet points, or short tables where helpful.
- Keep responses concise (≤400 words) unless a detailed breakdown is requested.`;

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: "system", content: systemPrompt },
          ...(input.history ?? []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: input.question },
        ];

        const completion = await deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages,
          max_tokens: 1024,
        });

        const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response right now.";

        await saveChatMessage({ userId: ADMIN_USER.id, role: "user",      message: input.question });
        await saveChatMessage({ userId: ADMIN_USER.id, role: "assistant", message: reply });

        return { response: reply };
      }),

    generateMonthlyReport: publicProcedure
      .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
      .mutation(async ({ input }) => {
        const [expenseSummary, teacherSummary, employeeSummary] = await Promise.all([
          getMonthlyExpenseSummary(input.year, input.month),
          getMonthlyTeacherPerformanceSummary(input.year, input.month),
          getMonthlyEmployeeSummary(input.year, input.month),
        ]);

        const monthName = new Date(input.year, input.month - 1).toLocaleString("en-MY", { month: "long" });
        const n = (v: unknown) => parseFloat(String(v ?? "0"));

        const prompt = `Write a 3-paragraph executive summary for the ${monthName} ${input.year} school management report:
- Teachers: ${teacherSummary?.totalTeachers ?? 0} active, avg performance ${n(teacherSummary?.avgPerformance).toFixed(2)}/5.00, avg attendance ${n(teacherSummary?.avgAttendance).toFixed(1)}%
- Employees: ${employeeSummary?.totalEmployees ?? 0} active, avg performance ${n(employeeSummary?.avgPerformance).toFixed(2)}/5.00
- Expenses: ${expenseSummary.map((e) => `${e.category} RM ${n(e.total).toFixed(2)}`).join(", ")}
Include key highlights, any concerns, and 2–3 actionable recommendations for school leadership.`;

        const completion = await deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are Amira, an AI assistant for Smart School Management in Malaysia. Write professional, concise school management reports in English." },
            { role: "user", content: prompt },
          ],
          max_tokens: 800,
        });

        const summary = completion.choices[0]?.message?.content
          ?? `Monthly report for ${monthName} ${input.year} generated.`;

        const reportData = { expenseSummary, teacherSummary, employeeSummary };

        await saveChatMessage({
          userId: ADMIN_USER.id,
          role: "assistant",
          message: summary,
          metadata: JSON.stringify({ type: "monthly_report", month: input.month, year: input.year }),
        });

        return { reportData, summary };
      }),

    // ==========================================================================
    // EXPORT REPORT — Professional PPT with charts & trend analysis
    // ==========================================================================
    exportReport: publicProcedure
      .input(
        z.object({
          title:     z.string().default("Smart School Management Report"),
          aiSummary: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const analytics = await getSchoolAnalyticsData();
        const n = (v: unknown) => parseFloat(String(v ?? "0"));
        const now     = new Date();
        const dateStr = now.toLocaleDateString("en-MY", { day: "2-digit", month: "long", year: "numeric" });
        const pct = (part: number, total: number) =>
          total > 0 ? `${((part / total) * 100).toFixed(1)}%` : "—";

        // ── Pre-compute totals & trends ────────────────────────────────────────
        const waterTotal   = analytics.waterExpenses.reduce((s, e) => s + n(e.amount), 0);
        const elecTotal    = analytics.electricExpenses.reduce((s, e) => s + n(e.amount), 0);
        const allTotal     = analytics.expensesByCategory.reduce((s, e) => s + n(e.total), 0);
        const waterTrend   = groupByMonth(analytics.waterExpenses);
        const elecTrend    = groupByMonth(analytics.electricExpenses);
        const avgPerf      = n(analytics.teachers?.avgPerformance);
        const avgAttend    = n(analytics.teachers?.avgAttendance);

        // Merge water + electricity monthly labels for combined chart
        const allMonths = [...new Set([...waterTrend.map(d => d.label), ...elecTrend.map(d => d.label)])];
        const waterByMonth = allMonths.map(m => waterTrend.find(d => d.label === m)?.total ?? 0);
        const elecByMonth  = allMonths.map(m => elecTrend.find(d => d.label === m)?.total ?? 0);

        // ── Trend direction helpers ────────────────────────────────────────────
        function trendArrow(data: { total: number }[]): string {
          if (data.length < 2) return "—";
          const last = data[data.length - 1].total;
          const prev = data[data.length - 2].total;
          if (last > prev * 1.05) return "Increasing (+)";
          if (last < prev * 0.95) return "Decreasing (-)";
          return "Stable (~)";
        }

        // ── AI Insights: trend-focused prompt ─────────────────────────────────
        let aiText = input.aiSummary;
        if (!aiText) {
          const waterMonthStr = waterTrend.map(d => `${d.label}: RM ${d.total.toFixed(2)}`).join(", ");
          const elecMonthStr  = elecTrend.map(d => `${d.label}: RM ${d.total.toFixed(2)}`).join(", ");
          const completion = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content: "You are Amira, a strategic AI advisor for a Malaysian school. Write in professional English. Be specific, data-driven, and actionable. Focus on trends and forward-looking recommendations.",
              },
              {
                role: "user",
                content: `Analyse these school metrics and provide 5 specific, numbered strategic insights. For each insight, identify the trend, explain the implication, and give a concrete action item.

RESOURCE COSTS:
- Water trend (by month): ${waterMonthStr || "No data yet"}
- Electricity trend (by month): ${elecMonthStr || "No data yet"}
- Water total: RM ${waterTotal.toFixed(2)} | Electricity total: RM ${elecTotal.toFixed(2)}
- Water trend direction: ${trendArrow(waterTrend)} | Electricity trend: ${trendArrow(elecTrend)}

STAFF PERFORMANCE:
- Teachers: ${analytics.teachers?.totalTeachers ?? 0} active, avg performance ${avgPerf.toFixed(2)}/5.00, avg attendance ${avgAttend.toFixed(1)}%
- Top performer: ${analytics.topTeachers[0]?.name ?? "—"} (${n(analytics.topTeachers[0]?.performanceRating).toFixed(2)}/5)

EXPENSES BY CATEGORY:
${analytics.expensesByCategory.map(e => `- ${e.category}: RM ${n(e.total).toFixed(2)} (${pct(n(e.total), allTotal)} of budget)`).join("\n")}

Format each insight as: [#] [Trend/Observation]: [Implication]. Action: [Specific recommendation]. Keep each insight under 60 words.`,
              },
            ],
            max_tokens: 700,
          });
          aiText = completion.choices[0]?.message?.content ?? "No recommendations generated.";
        }

        // ── Build PowerPoint ───────────────────────────────────────────────────
        const ppt = new pptxgen();
        ppt.layout = "LAYOUT_WIDE";  // 13.33" × 7.5"

        // ── SLIDE 1: Cover ─────────────────────────────────────────────────────
        {
          const s = ppt.addSlide();
          s.background = { color: C.NAVY };

          // Decorative top stripe
          s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: C.TEAL } });

          // Left accent column
          s.addShape("rect", { x: 0, y: 0.12, w: 0.45, h: 7.38, fill: { color: "0A1A36" } });

          // Main title
          s.addText("Smart School Management", {
            x: 0.8, y: 1.4, w: 11.5, h: 1.0,
            fontSize: 40, bold: true, color: C.WHITE, fontFace: "Calibri",
          });

          // Subtitle
          s.addText(input.title, {
            x: 0.8, y: 2.5, w: 11.5, h: 0.7,
            fontSize: 22, color: "7DD3FC", fontFace: "Calibri",
          });

          // Divider
          s.addShape("rect", { x: 0.8, y: 3.3, w: 8, h: 0.04, fill: { color: C.TEAL } });

          // Meta line
          s.addText(`Generated by Amira AI  ·  ${dateStr}`, {
            x: 0.8, y: 3.5, w: 11.5, h: 0.4,
            fontSize: 14, color: "94A3B8", fontFace: "Calibri",
          });

          // Stats preview boxes
          const kpis = [
            { label: "Teachers",   val: String(analytics.teachers?.totalTeachers ?? 0) },
            { label: "Employees",  val: String(analytics.employees?.totalEmployees ?? 0) },
            { label: "Water Cost", val: `RM ${waterTotal.toFixed(0)}` },
            { label: "Elec. Cost", val: `RM ${elecTotal.toFixed(0)}` },
          ];
          kpis.forEach((k, i) => {
            const bx = 0.8 + i * 3.0;
            s.addShape("rect", { x: bx, y: 4.4, w: 2.8, h: 1.1, fill: { color: "1E3A5F" }, line: { color: C.TEAL, width: 0.75 } });
            s.addText(k.val,   { x: bx + 0.15, y: 4.5,  w: 2.5, h: 0.5, fontSize: 22, bold: true, color: C.WHITE, fontFace: "Calibri" });
            s.addText(k.label, { x: bx + 0.15, y: 5.0,  w: 2.5, h: 0.35, fontSize: 11, color: "94A3B8", fontFace: "Calibri" });
          });

          // Bottom tag
          s.addText("Confidential — For Internal Use Only", {
            x: 0.8, y: 6.9, w: 11.5, h: 0.3,
            fontSize: 9, color: "475569", align: "center", fontFace: "Calibri",
          });
        }

        // ── SLIDE 2: Table of Contents ─────────────────────────────────────────
        {
          const s = ppt.addSlide();
          s.background = { color: C.LGRAY };
          addSlideHeader(s, "Report Contents", "Smart School Management System — Auto-generated by Amira AI");

          const sections = [
            { n: "01", title: "Executive Summary",             desc: "Key performance indicators at a glance" },
            { n: "02", title: "Resource Cost Trend Analysis",   desc: "Monthly water & electricity cost trends" },
            { n: "03", title: "Water Usage Deep-Dive",          desc: "SAJ tariff analysis and consumption log" },
            { n: "04", title: "Electricity Usage Deep-Dive",    desc: "TNB tariff analysis and consumption log" },
            { n: "05", title: "Expense Breakdown by Category",  desc: "Budget allocation and spending distribution" },
            { n: "06", title: "Teacher Performance Analysis",   desc: "Performance ratings and attendance metrics" },
            { n: "07", title: "AI Strategic Insights",          desc: "Trend analysis and actionable recommendations" },
          ];

          sections.forEach((sec, i) => {
            const yy = 1.2 + i * 0.75;
            s.addShape("rect", { x: 0.6, y: yy, w: 0.55, h: 0.55, fill: { color: C.NAVY } });
            s.addText(sec.n, { x: 0.6, y: yy, w: 0.55, h: 0.55, fontSize: 14, bold: true, color: C.WHITE, align: "center", valign: "middle", fontFace: "Calibri" });
            s.addText(sec.title, { x: 1.3, y: yy + 0.02, w: 5.5, h: 0.3, fontSize: 13, bold: true, color: C.NAVY, fontFace: "Calibri" });
            s.addText(sec.desc,  { x: 1.3, y: yy + 0.3,  w: 5.5, h: 0.22, fontSize: 9.5, color: C.MUTED, fontFace: "Calibri" });
            if (i < sections.length - 1) {
              s.addShape("rect", { x: 0.6, y: yy + 0.62, w: 11.73, h: 0.01, fill: { color: C.MID } });
            }
          });
        }

        // ── SLIDE 3: Executive Summary (KPI cards) ─────────────────────────────
        {
          const s = ppt.addSlide();
          s.background = { color: C.LGRAY };
          addSlideHeader(s, "Executive Summary", `Report date: ${dateStr}  ·  Data sourced live from school database`);

          const perfStatus = avgPerf >= 4.0 ? "Excellent" : avgPerf >= 3.0 ? "Good" : "Needs Attention";
          const attStatus  = avgAttend >= 95 ? "Excellent" : avgAttend >= 85 ? "Good" : "Monitor";

          // Row 1: 4 KPI cards
          const kpis1 = [
            { lbl: "Active Teachers",    val: String(analytics.teachers?.totalTeachers ?? 0),    note: "Full staff roster", color: C.NAVY },
            { lbl: "Active Employees",   val: String(analytics.employees?.totalEmployees ?? 0),   note: "All departments",    color: C.BLUE },
            { lbl: "Avg Performance",    val: `${avgPerf.toFixed(2)} / 5`,                        note: perfStatus,           color: C.TEAL },
            { lbl: "Avg Attendance",     val: `${avgAttend.toFixed(1)}%`,                         note: attStatus,            color: C.GREEN },
          ];
          kpis1.forEach((k, i) => addKpiCard(s, 0.45 + i * 3.1, 1.15, 2.9, 1.1, k.lbl, k.val, k.note, k.color));

          // Row 2: cost KPIs
          const kpis2 = [
            { lbl: "Total Water Cost",       val: `RM ${waterTotal.toFixed(2)}`,   note: `${analytics.waterExpenses.length} batches · SAJ tariff`,  color: "0891B2" },
            { lbl: "Total Electricity Cost", val: `RM ${elecTotal.toFixed(2)}`,    note: `${analytics.electricExpenses.length} batches · TNB tariff`, color: C.GOLD },
            { lbl: "Total Expenses",         val: `RM ${allTotal.toFixed(2)}`,     note: `${analytics.expensesByCategory.length} categories`,        color: C.BLUE },
            { lbl: "Resource Dominance",     val: elecTotal > waterTotal ? "Electricity" : "Water", note: `Higher cost resource`,               color: elecTotal > waterTotal ? C.GOLD : "0891B2" },
          ];
          kpis2.forEach((k, i) => addKpiCard(s, 0.45 + i * 3.1, 2.45, 2.9, 1.1, k.lbl, k.val, k.note, k.color));

          // Expense category mini-table
          s.addText("Expense Categories at a Glance", {
            x: 0.45, y: 3.75, w: 12.4, h: 0.3,
            fontSize: 11, bold: true, color: C.SLATE, fontFace: "Calibri",
          });
          const catRows: pptxgen.TableRow[] = [
            [
              { text: "Category",          options: hd() },
              { text: "Total (RM)",         options: hd(C.TEAL) },
              { text: "% of Budget",        options: hd() },
              { text: "Entries",            options: hd() },
            ],
            ...analytics.expensesByCategory.slice(0, 4).map((e, i) => [
              { text: e.category ?? "—",            options: td(i % 2 ? C.LGRAY : C.WHITE, "left") },
              { text: n(e.total).toFixed(2),         options: td(i % 2 ? C.LGRAY : C.WHITE) },
              { text: pct(n(e.total), allTotal),     options: td(i % 2 ? C.LGRAY : C.WHITE) },
              { text: String(e.count),               options: td(i % 2 ? C.LGRAY : C.WHITE) },
            ] as pptxgen.TableCell[]),
          ];
          s.addTable(catRows, { x: 0.45, y: 4.1, w: 12.4, rowH: 0.36, fontSize: 11 });
        }

        // ── SLIDE 4: Resource Cost Trend (combined chart) ──────────────────────
        {
          const s = ppt.addSlide();
          s.background = { color: C.LGRAY };
          addSlideHeader(
            s,
            "Resource Cost Trend Analysis",
            `Water trend: ${trendArrow(waterTrend)}  ·  Electricity trend: ${trendArrow(elecTrend)}  ·  Combined resource spend: RM ${(waterTotal + elecTotal).toFixed(2)}`,
            "0891B2",
          );

          if (allMonths.length >= 2) {
            // Grouped bar chart — water vs electricity by month
            const chartData = [
              {
                name: "Water (RM)",
                labels: allMonths,
                values: waterByMonth,
              },
              {
                name: "Electricity (RM)",
                labels: allMonths,
                values: elecByMonth,
              },
            ];
            s.addChart(pptxgen.ChartType.bar, chartData, {
              x: 0.45, y: 1.1, w: 8.5, h: 5.5,
              barDir: "col",
              barGrouping: "clustered",
              chartColors: ["0891B2", C.GOLD],
              showLegend: true,
              legendPos: "b",
              showValue: true,
              dataLabelFontSize: 8,
              dataLabelColor: C.SLATE,
              valAxisMinVal: 0,
              catAxisLabelFontSize: 10,
              valAxisLabelFontSize: 10,
              titleFontSize: 13,
            });
          } else {
            s.addText("Insufficient monthly data for trend chart.\nMore data will appear as the school logs expenses over time.", {
              x: 0.45, y: 2.5, w: 8.5, h: 2,
              fontSize: 14, color: C.MUTED, align: "center", valign: "middle", fontFace: "Calibri",
            });
          }

          // Side summary panel
          s.addShape("rect", { x: 9.2, y: 1.1, w: 3.7, h: 5.5, fill: { color: C.WHITE }, line: { color: C.MID, width: 0.75 } });
          s.addText("Trend Summary", { x: 9.35, y: 1.2, w: 3.4, h: 0.35, fontSize: 11, bold: true, color: C.NAVY, fontFace: "Calibri" });
          s.addShape("rect", { x: 9.35, y: 1.55, w: 3.4, h: 0.02, fill: { color: C.MID } });

          const summaryLines = [
            { lbl: "Water Total",    val: `RM ${waterTotal.toFixed(2)}`,   color: "0891B2" },
            { lbl: "Elec. Total",    val: `RM ${elecTotal.toFixed(2)}`,    color: C.GOLD   },
            { lbl: "Combined",       val: `RM ${(waterTotal + elecTotal).toFixed(2)}`, color: C.NAVY },
            { lbl: "Data Points",    val: String(allMonths.length),         color: C.SLATE  },
            { lbl: "Water Trend",    val: trendArrow(waterTrend),           color: "0891B2" },
            { lbl: "Elec. Trend",    val: trendArrow(elecTrend),            color: C.GOLD   },
            { lbl: "Higher Cost",    val: elecTotal >= waterTotal ? "Electricity" : "Water", color: C.RED },
          ];
          summaryLines.forEach((line, i) => {
            const sy = 1.7 + i * 0.65;
            s.addText(line.lbl, { x: 9.35, y: sy,        w: 3.4, h: 0.3, fontSize: 9,  color: C.MUTED, fontFace: "Calibri" });
            s.addText(line.val, { x: 9.35, y: sy + 0.27, w: 3.4, h: 0.32, fontSize: 12, bold: true, color: line.color, fontFace: "Calibri" });
          });
        }

        // ── SLIDE 5: Water Usage Deep-Dive ─────────────────────────────────────
        {
          const s = ppt.addSlide();
          s.background = { color: C.LGRAY };
          addSlideHeader(
            s,
            "Water Usage Analysis",
            `SAJ Tiered Tariff (RM 0.57–2.00 / m³)  ·  ${analytics.waterExpenses.length} batches logged  ·  Total: RM ${waterTotal.toFixed(2)}  ·  Trend: ${trendArrow(waterTrend)}`,
            "0891B2",
          );

          // Bar chart for water trend
          if (waterTrend.length >= 1) {
            s.addChart(pptxgen.ChartType.bar, [{
              name: "Water Cost (RM)",
              labels: waterTrend.map(d => d.label),
              values: waterTrend.map(d => d.total),
            }], {
              x: 0.45, y: 1.1, w: 6.5, h: 3.4,
              barDir: "col",
              barGrouping: "standard",
              chartColors: ["0891B2"],
              showLegend: false,
              showValue: true,
              dataLabelFontSize: 8,
              dataLabelColor: C.SLATE,
              valAxisMinVal: 0,
              catAxisLabelFontSize: 9,
              valAxisLabelFontSize: 9,
            });
          }

          // Recent data table
          s.addText("Recent Batch Log", { x: 7.15, y: 1.1, w: 6.0, h: 0.3, fontSize: 11, bold: true, color: C.NAVY, fontFace: "Calibri" });
          const waterRows: pptxgen.TableRow[] = [
            [
              { text: "#",           options: hd("0891B2") },
              { text: "Batch",       options: hd("0891B2") },
              { text: "Date",        options: hd("0891B2") },
              { text: "RM",          options: hd("0891B2") },
            ],
            ...analytics.waterExpenses.slice(0, 6).map((e, i) => [
              { text: String(i + 1),            options: td(i % 2 ? C.LGRAY : C.WHITE) },
              { text: (e.title ?? "").slice(0, 18), options: td(i % 2 ? C.LGRAY : C.WHITE, "left") },
              { text: String(e.expenseDate),    options: td(i % 2 ? C.LGRAY : C.WHITE) },
              { text: n(e.amount).toFixed(2),   options: td(i % 2 ? C.LGRAY : C.WHITE) },
            ] as pptxgen.TableCell[]),
          ];
          s.addTable(waterRows, { x: 7.15, y: 1.45, w: 5.7, rowH: 0.37, fontSize: 10.5 });

          // Monthly trend mini-table
          s.addText("Monthly Totals", { x: 0.45, y: 4.65, w: 12.4, h: 0.3, fontSize: 11, bold: true, color: C.NAVY, fontFace: "Calibri" });
          if (waterTrend.length > 0) {
            const trendRows: pptxgen.TableRow[] = [
              [
                ...waterTrend.map(d => ({ text: d.label, options: hd("0891B2") })),
              ],
              [
                ...waterTrend.map((d, i) => ({ text: `RM ${d.total.toFixed(2)}`, options: td(i % 2 ? C.LGRAY : C.WHITE) })),
              ],
            ];
            s.addTable(trendRows, { x: 0.45, y: 5.0, w: 12.4, rowH: 0.38, fontSize: 10 });
          } else {
            s.addText("No monthly data yet.", { x: 0.45, y: 5.0, w: 12.4, h: 0.4, fontSize: 11, color: C.MUTED, fontFace: "Calibri" });
          }
        }

        // ── SLIDE 6: Electricity Usage Deep-Dive ──────────────────────────────
        {
          const s = ppt.addSlide();
          s.background = { color: C.LGRAY };
          addSlideHeader(
            s,
            "Electricity Usage Analysis",
            `TNB Tiered Tariff (RM 0.218–0.509 / kWh)  ·  ${analytics.electricExpenses.length} batches logged  ·  Total: RM ${elecTotal.toFixed(2)}  ·  Trend: ${trendArrow(elecTrend)}`,
            C.GOLD,
          );

          if (elecTrend.length >= 1) {
            s.addChart(pptxgen.ChartType.bar, [{
              name: "Electricity Cost (RM)",
              labels: elecTrend.map(d => d.label),
              values: elecTrend.map(d => d.total),
            }], {
              x: 0.45, y: 1.1, w: 6.5, h: 3.4,
              barDir: "col",
              barGrouping: "standard",
              chartColors: [C.GOLD],
              showLegend: false,
              showValue: true,
              dataLabelFontSize: 8,
              dataLabelColor: C.SLATE,
              valAxisMinVal: 0,
              catAxisLabelFontSize: 9,
              valAxisLabelFontSize: 9,
            });
          } else {
            s.addText("No electricity data yet.\nStart the Electric Monitor to begin logging consumption.", {
              x: 0.45, y: 1.8, w: 6.5, h: 2,
              fontSize: 13, color: C.MUTED, align: "center", valign: "middle", fontFace: "Calibri",
            });
          }

          // Recent data table
          s.addText("Recent Batch Log", { x: 7.15, y: 1.1, w: 6.0, h: 0.3, fontSize: 11, bold: true, color: C.NAVY, fontFace: "Calibri" });
          const elecDataRows: pptxgen.TableRow[] = analytics.electricExpenses.length > 0
            ? analytics.electricExpenses.slice(0, 6).map((e, i) => [
                { text: String(i + 1),              options: td(i % 2 ? C.LGRAY : C.WHITE) },
                { text: (e.title ?? "").slice(0, 18), options: td(i % 2 ? C.LGRAY : C.WHITE, "left") },
                { text: String(e.expenseDate),      options: td(i % 2 ? C.LGRAY : C.WHITE) },
                { text: n(e.amount).toFixed(2),     options: td(i % 2 ? C.LGRAY : C.WHITE) },
              ] as pptxgen.TableCell[])
            : [[
                { text: "No electricity data — start Electric Monitor", options: { ...td(), colspan: 4 } },
              ] as pptxgen.TableCell[]];

          const elecRows: pptxgen.TableRow[] = [
            [
              { text: "#",     options: hd(C.GOLD) },
              { text: "Batch", options: hd(C.GOLD) },
              { text: "Date",  options: hd(C.GOLD) },
              { text: "RM",    options: hd(C.GOLD) },
            ],
            ...elecDataRows,
          ];
          s.addTable(elecRows, { x: 7.15, y: 1.45, w: 5.7, rowH: 0.37, fontSize: 10.5 });

          // Monthly trend row
          s.addText("Monthly Totals", { x: 0.45, y: 4.65, w: 12.4, h: 0.3, fontSize: 11, bold: true, color: C.NAVY, fontFace: "Calibri" });
          if (elecTrend.length > 0) {
            const trendRows: pptxgen.TableRow[] = [
              [ ...elecTrend.map(d => ({ text: d.label, options: hd(C.GOLD) })) ],
              [ ...elecTrend.map((d, i) => ({ text: `RM ${d.total.toFixed(2)}`, options: td(i % 2 ? C.LGRAY : C.WHITE) })) ],
            ];
            s.addTable(trendRows, { x: 0.45, y: 5.0, w: 12.4, rowH: 0.38, fontSize: 10 });
          } else {
            s.addText("No monthly data yet.", { x: 0.45, y: 5.0, w: 12.4, h: 0.4, fontSize: 11, color: C.MUTED, fontFace: "Calibri" });
          }
        }

        // ── SLIDE 7: Expense Breakdown ─────────────────────────────────────────
        {
          const s = ppt.addSlide();
          s.background = { color: C.LGRAY };
          addSlideHeader(
            s,
            "Expense Breakdown by Category",
            `Total budget: RM ${allTotal.toFixed(2)}  ·  ${analytics.expensesByCategory.length} categories  ·  ${analytics.expensesByCategory.reduce((t, e) => t + e.count, 0)} transactions`,
          );

          // Horizontal bar chart — spending by category
          if (analytics.expensesByCategory.length > 0) {
            s.addChart(pptxgen.ChartType.bar, [{
              name: "Total Spend (RM)",
              labels: analytics.expensesByCategory.map(e => e.category ?? "Other"),
              values: analytics.expensesByCategory.map(e => n(e.total)),
            }], {
              x: 0.45, y: 1.1, w: 7.0, h: 5.3,
              barDir: "bar",   // horizontal
              barGrouping: "standard",
              chartColors: [C.NAVY, C.TEAL, C.BLUE, C.GOLD, "7C3AED", C.GREEN, "BE185D"],
              showLegend: false,
              showValue: true,
              dataLabelFontSize: 9,
              dataLabelColor: C.WHITE,
              valAxisMinVal: 0,
              catAxisLabelFontSize: 10,
              valAxisLabelFontSize: 9,
            });
          }

          // Category detail table
          const catRows: pptxgen.TableRow[] = [
            [
              { text: "Category",   options: hd() },
              { text: "Total (RM)", options: hd(C.TEAL) },
              { text: "% Budget",   options: hd() },
              { text: "Count",      options: hd() },
            ],
            ...analytics.expensesByCategory.map((e, i) => [
              { text: e.category ?? "—",           options: td(i % 2 ? C.LGRAY : C.WHITE, "left") },
              { text: n(e.total).toFixed(2),        options: td(i % 2 ? C.LGRAY : C.WHITE) },
              { text: pct(n(e.total), allTotal),    options: td(i % 2 ? C.LGRAY : C.WHITE) },
              { text: String(e.count),              options: td(i % 2 ? C.LGRAY : C.WHITE) },
            ] as pptxgen.TableCell[]),
            [
              { text: "TOTAL", options: hd() },
              { text: `RM ${allTotal.toFixed(2)}`, options: hd(C.TEAL) },
              { text: "100%", options: hd() },
              { text: String(analytics.expensesByCategory.reduce((t, e) => t + e.count, 0)), options: hd() },
            ],
          ];
          s.addTable(catRows, { x: 7.7, y: 1.1, w: 5.2, rowH: 0.37, fontSize: 10.5 });
        }

        // ── SLIDE 8: Teacher Performance ──────────────────────────────────────
        {
          const s = ppt.addSlide();
          s.background = { color: C.LGRAY };
          addSlideHeader(
            s,
            "Teacher Performance Analysis",
            `${analytics.teachers?.totalTeachers ?? 0} active teachers  ·  Avg performance: ${avgPerf.toFixed(2)}/5.00  ·  Avg attendance: ${avgAttend.toFixed(1)}%`,
          );

          // Bar chart — top teachers performance
          if (analytics.topTeachers.length > 0) {
            s.addChart(pptxgen.ChartType.bar, [
              {
                name: "Performance Rating (/5)",
                labels: analytics.topTeachers.map(t => t.name.split(" ")[0]),
                values: analytics.topTeachers.map(t => n(t.performanceRating)),
              },
              {
                name: "Attendance (%/20)",   // scaled for visual parity with /5 scale
                labels: analytics.topTeachers.map(t => t.name.split(" ")[0]),
                values: analytics.topTeachers.map(t => n(t.attendancePercentage) / 20),
              },
            ], {
              x: 0.45, y: 1.1, w: 6.5, h: 3.5,
              barDir: "col",
              barGrouping: "clustered",
              chartColors: [C.NAVY, C.TEAL],
              showLegend: true,
              legendPos: "b",
              showValue: true,
              dataLabelFontSize: 8,
              dataLabelColor: C.WHITE,
              valAxisMinVal: 0,
              valAxisMaxVal: 5,
              catAxisLabelFontSize: 9,
              valAxisLabelFontSize: 9,
            });
          }

          // Detailed teacher table
          s.addText("Top Teachers — Detailed View", { x: 7.15, y: 1.1, w: 5.7, h: 0.3, fontSize: 11, bold: true, color: C.NAVY, fontFace: "Calibri" });
          const teacherRows: pptxgen.TableRow[] = [
            [
              { text: "#",          options: hd() },
              { text: "Name",       options: hd() },
              { text: "Rating",     options: hd(C.TEAL) },
              { text: "Attend.",    options: hd() },
            ],
            ...analytics.topTeachers.map((t, i) => [
              { text: `#${i + 1}`,                              options: td(i % 2 ? C.LGRAY : C.WHITE) },
              { text: t.name,                                   options: td(i % 2 ? C.LGRAY : C.WHITE, "left") },
              { text: `${n(t.performanceRating).toFixed(2)}/5`, options: td(i % 2 ? C.LGRAY : C.WHITE) },
              { text: `${n(t.attendancePercentage).toFixed(0)}%`, options: td(i % 2 ? C.LGRAY : C.WHITE) },
            ] as pptxgen.TableCell[]),
          ];
          s.addTable(teacherRows, { x: 7.15, y: 1.45, w: 5.7, rowH: 0.38, fontSize: 10.5 });

          // Performance visual bars for top teachers
          s.addText("Performance Bars", { x: 0.45, y: 4.75, w: 12.4, h: 0.3, fontSize: 10, bold: true, color: C.SLATE, fontFace: "Calibri" });
          analytics.topTeachers.slice(0, 5).forEach((t, i) => {
            const bx = 0.45;
            const by = 5.1 + i * 0.35;
            const ratio = n(t.performanceRating) / 5;
            const barColor = ratio >= 0.8 ? C.GREEN : ratio >= 0.6 ? C.TEAL : C.GOLD;
            s.addText(t.name.split(" ")[0].padEnd(10), { x: bx, y: by, w: 2.0, h: 0.3, fontSize: 9, color: C.SLATE, fontFace: "Calibri" });
            addRatingBar(s, bx + 2.1, by + 0.04, 6.0, 0.22, ratio, barColor);
            s.addText(`${n(t.performanceRating).toFixed(2)}/5`, { x: bx + 8.3, y: by, w: 1.0, h: 0.3, fontSize: 9, bold: true, color: barColor, fontFace: "Calibri" });
          });
        }

        // ── SLIDE 9: AI Strategic Insights ────────────────────────────────────
        {
          const s = ppt.addSlide();
          s.background = { color: C.NAVY };

          // Top stripe
          s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: C.TEAL } });

          // Title area
          s.addText("AI Strategic Insights & Recommendations", {
            x: 0.6, y: 0.25, w: 12.0, h: 0.6,
            fontSize: 24, bold: true, color: C.WHITE, fontFace: "Calibri",
          });
          s.addText("Generated by Amira AI (DeepSeek)  ·  Based on live school data", {
            x: 0.6, y: 0.88, w: 12.0, h: 0.3,
            fontSize: 11, color: "94A3B8", fontFace: "Calibri",
          });
          s.addShape("rect", { x: 0.6, y: 1.22, w: 12.13, h: 0.025, fill: { color: C.TEAL } });

          // AI insights text
          s.addText(aiText ?? "", {
            x: 0.6, y: 1.35, w: 12.13, h: 5.2,
            fontSize: 12.5, color: "E2E8F0", fontFace: "Calibri",
            valign: "top", wrap: true, lineSpacingMultiple: 1.3,
          });

          // Footer
          s.addText(`Smart School Management System  ·  ${dateStr}  ·  Amira AI`, {
            x: 0.6, y: 6.95, w: 12.13, h: 0.28,
            fontSize: 9, color: "475569", align: "center", fontFace: "Calibri",
          });
        }

        // ── Serialize ──────────────────────────────────────────────────────────
        const buffer = await ppt.write({ outputType: "nodebuffer" }) as Buffer;
        const pptxBase64 = Buffer.from(buffer).toString("base64");
        const filename   = `SSM-Report-${now.toISOString().slice(0, 10)}.pptx`;

        return { pptxBase64, filename };
      }),
  }),
});

export type AppRouter = typeof appRouter;
