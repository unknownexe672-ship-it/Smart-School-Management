/**
 * Demo-mode sample data.
 * Returned by db-ops.ts read functions when DEMO_MODE=true
 * (i.e. when the database is unavailable or not configured).
 *
 * Write/mutation functions become no-ops in demo mode.
 */

const now = new Date().toISOString();
const today = now.slice(0, 10);

// ── Teachers ─────────────────────────────────────────────────────────────────
export const DEMO_TEACHERS = [
  { id: 1, name: "Cikgu Siti Aminah", email: "siti@smkbangsar.edu.my", phone: "012-3456789", subjects: ["Mathematics", "Additional Mathematics"], gender: "female", status: "active", performanceRating: "4.8", attendancePercentage: "97.5", yearsOfExperience: 12, qualifications: "B.Sc Mathematics (UM)", teachingLoad: 28, createdAt: now, updatedAt: now },
  { id: 2, name: "Cikgu Ahmad Firdaus", email: "ahmad@smkbangsar.edu.my", phone: "012-9876543", subjects: ["Physics", "Science"], gender: "male", status: "active", performanceRating: "4.6", attendancePercentage: "95.0", yearsOfExperience: 8, qualifications: "B.Sc Physics (USM)", teachingLoad: 26, createdAt: now, updatedAt: now },
  { id: 3, name: "Cikgu Nurul Huda", email: "nurul@smkbangsar.edu.my", phone: "011-2345678", subjects: ["Bahasa Malaysia", "Literature"], gender: "female", status: "active", performanceRating: "4.5", attendancePercentage: "96.0", yearsOfExperience: 10, qualifications: "B.A Bahasa Melayu (UKM)", teachingLoad: 24, createdAt: now, updatedAt: now },
  { id: 4, name: "Cikgu Ravi Kumar", email: "ravi@smkbangsar.edu.my", phone: "019-8765432", subjects: ["English Language", "Literature in English"], gender: "male", status: "active", performanceRating: "4.7", attendancePercentage: "94.5", yearsOfExperience: 15, qualifications: "B.A English (UM)", teachingLoad: 26, createdAt: now, updatedAt: now },
  { id: 5, name: "Cikgu Priya Devi", email: "priya@smkbangsar.edu.my", phone: "016-3456789", subjects: ["Chemistry", "Biology"], gender: "female", status: "active", performanceRating: "4.4", attendancePercentage: "93.0", yearsOfExperience: 6, qualifications: "B.Sc Chemistry (UTM)", teachingLoad: 24, createdAt: now, updatedAt: now },
  { id: 6, name: "Cikgu Mohd Azlan", email: "azlan@smkbangsar.edu.my", phone: "013-4567890", subjects: ["History", "Moral Education"], gender: "male", status: "active", performanceRating: "4.3", attendancePercentage: "92.5", yearsOfExperience: 9, qualifications: "B.A History (UUM)", teachingLoad: 22, createdAt: now, updatedAt: now },
  { id: 7, name: "Cikgu Lim Siew Mee", email: "siewmee@smkbangsar.edu.my", phone: "017-5678901", subjects: ["Mandarin", "Chinese Literature"], gender: "female", status: "active", performanceRating: "4.6", attendancePercentage: "96.5", yearsOfExperience: 11, qualifications: "B.A Chinese Studies (UTAR)", teachingLoad: 24, createdAt: now, updatedAt: now },
  { id: 8, name: "Cikgu Hafizuddin", email: "hafiz@smkbangsar.edu.my", phone: "014-6789012", subjects: ["Islamic Education"], gender: "male", status: "active", performanceRating: "4.5", attendancePercentage: "97.0", yearsOfExperience: 13, qualifications: "B.A Islamic Studies (UIAM)", teachingLoad: 20, createdAt: now, updatedAt: now },
  { id: 9, name: "Cikgu Kavitha", email: "kavitha@smkbangsar.edu.my", phone: "018-7890123", subjects: ["Tamil Language", "Moral Education"], gender: "female", status: "active", performanceRating: "4.2", attendancePercentage: "91.5", yearsOfExperience: 7, qualifications: "B.A Tamil (UM)", teachingLoad: 20, createdAt: now, updatedAt: now },
  { id: 10, name: "Cikgu Zulkifli", email: "zulkifli@smkbangsar.edu.my", phone: "011-8901234", subjects: ["Physical Education", "Health Science"], gender: "male", status: "active", performanceRating: "4.4", attendancePercentage: "95.5", yearsOfExperience: 5, qualifications: "B.Sc Sports Science (UPM)", teachingLoad: 28, createdAt: now, updatedAt: now },
];

export const DEMO_TEACHER_STATS = {
  totalTeachers: 10,
  avgPerformance: "4.50",
  avgAttendance: "94.95",
};

// ── Classes ───────────────────────────────────────────────────────────────────
export const DEMO_CLASSES = [
  { id: 1, name: "1 Amanah", form: 1, subject: "Mathematics", teacherId: 1, academicYear: 2025, studentCount: 35, classType: "regular", status: "active", createdAt: now, updatedAt: now },
  { id: 2, name: "2 Bestari", form: 2, subject: "Science", teacherId: 2, academicYear: 2025, studentCount: 33, classType: "regular", status: "active", createdAt: now, updatedAt: now },
  { id: 3, name: "3 Cemerlang", form: 3, subject: "Bahasa Malaysia", teacherId: 3, academicYear: 2025, studentCount: 34, classType: "regular", status: "active", createdAt: now, updatedAt: now },
  { id: 4, name: "4 Dedikasi", form: 4, subject: "English Language", teacherId: 4, academicYear: 2025, studentCount: 32, classType: "regular", status: "active", createdAt: now, updatedAt: now },
  { id: 5, name: "5 Elit", form: 5, subject: "Chemistry", teacherId: 5, academicYear: 2025, studentCount: 30, classType: "regular", status: "active", createdAt: now, updatedAt: now },
];

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const DEMO_ROOMS = [
  { id: 1, name: "Bilik Darjah 101", type: "classroom", capacity: 40, building: "Block A", floor: 1, facilities: ["whiteboard", "projector"], status: "available", createdAt: now, updatedAt: now },
  { id: 2, name: "Makmal Sains", type: "laboratory", capacity: 35, building: "Block B", floor: 1, facilities: ["fume hood", "microscopes", "projector"], status: "available", createdAt: now, updatedAt: now },
  { id: 3, name: "Makmal Komputer", type: "computer_lab", capacity: 40, building: "Block C", floor: 2, facilities: ["computers", "projector", "ac"], status: "available", createdAt: now, updatedAt: now },
  { id: 4, name: "Dewan Besar", type: "hall", capacity: 500, building: "Main Block", floor: 1, facilities: ["stage", "pa_system", "projector"], status: "available", createdAt: now, updatedAt: now },
];

// ── Schedules ─────────────────────────────────────────────────────────────────
export const DEMO_SCHEDULES = [
  { id: 1, classId: 1, teacherId: 1, roomId: 1, dayOfWeek: 1, startTime: "07:30", endTime: "08:30", subject: "Mathematics", status: "active", createdAt: now },
  { id: 2, classId: 2, teacherId: 2, roomId: 2, dayOfWeek: 1, startTime: "08:30", endTime: "09:30", subject: "Science", status: "active", createdAt: now },
  { id: 3, classId: 3, teacherId: 3, roomId: 1, dayOfWeek: 2, startTime: "07:30", endTime: "08:30", subject: "Bahasa Malaysia", status: "active", createdAt: now },
  { id: 4, classId: 4, teacherId: 4, roomId: 1, dayOfWeek: 2, startTime: "08:30", endTime: "09:30", subject: "English Language", status: "active", createdAt: now },
  { id: 5, classId: 5, teacherId: 5, roomId: 2, dayOfWeek: 3, startTime: "07:30", endTime: "08:30", subject: "Chemistry", status: "active", createdAt: now },
];

// ── Employees ─────────────────────────────────────────────────────────────────
export const DEMO_EMPLOYEES = [
  { id: 1, name: "Encik Farid Hamdan", email: "farid@smkbangsar.edu.my", phone: "012-1111111", department: "Administration", position: "Senior Clerk", gender: "male", status: "active", performanceRating: "4.2", attendancePercentage: "96.0", salary: "3200", employeeType: "permanent", joinDate: "2018-03-01", createdAt: now, updatedAt: now },
  { id: 2, name: "Puan Zainab Othman", email: "zainab@smkbangsar.edu.my", phone: "013-2222222", department: "Finance", position: "Finance Officer", gender: "female", status: "active", performanceRating: "4.5", attendancePercentage: "97.5", salary: "3800", employeeType: "permanent", joinDate: "2015-07-15", createdAt: now, updatedAt: now },
  { id: 3, name: "Encik Lee Weng Kit", email: "wengkit@smkbangsar.edu.my", phone: "011-3333333", department: "IT Department", position: "IT Technician", gender: "male", status: "active", performanceRating: "4.6", attendancePercentage: "95.0", salary: "3500", employeeType: "permanent", joinDate: "2019-01-10", createdAt: now, updatedAt: now },
  { id: 4, name: "Puan Suraya Malik", email: "suraya@smkbangsar.edu.my", phone: "016-4444444", department: "Library", position: "Librarian", gender: "female", status: "active", performanceRating: "4.3", attendancePercentage: "94.5", salary: "3100", employeeType: "permanent", joinDate: "2016-09-01", createdAt: now, updatedAt: now },
  { id: 5, name: "Encik Murugan Pillai", email: "murugan@smkbangsar.edu.my", phone: "019-5555555", department: "Maintenance", position: "Maintenance Head", gender: "male", status: "active", performanceRating: "4.1", attendancePercentage: "93.0", salary: "2900", employeeType: "permanent", joinDate: "2012-04-20", createdAt: now, updatedAt: now },
];

export const DEMO_EMPLOYEE_STATS = {
  totalEmployees: 5,
  avgPerformance: "4.34",
  avgAttendance: "95.20",
};

// ── Resources ─────────────────────────────────────────────────────────────────
export const DEMO_RESOURCES = [
  { id: 1, name: "Kertas A4 (Rim)", category: "stationery", quantity: 150, unit: "rim", reorderLevel: 20, unitCost: "12.00", supplier: "Stationery Hub Sdn Bhd", location: "Store Room A", status: "available", lastRestocked: today, createdAt: now, updatedAt: now },
  { id: 2, name: "Pen Marker Whiteboard", category: "stationery", quantity: 45, unit: "box", reorderLevel: 10, unitCost: "8.50", supplier: "Stationery Hub Sdn Bhd", location: "Store Room A", status: "available", lastRestocked: today, createdAt: now, updatedAt: now },
  { id: 3, name: "LCD Projector", category: "equipment", quantity: 8, unit: "unit", reorderLevel: 2, unitCost: "2500.00", supplier: "Acer Malaysia", location: "AV Room", status: "available", lastRestocked: today, createdAt: now, updatedAt: now },
  { id: 4, name: "Toner Printer (Black)", category: "consumable", quantity: 12, unit: "unit", reorderLevel: 3, unitCost: "85.00", supplier: "HP Malaysia", location: "Store Room B", status: "available", lastRestocked: today, createdAt: now, updatedAt: now },
  { id: 5, name: "Buku Teks Matematik F3", category: "textbook", quantity: 35, unit: "unit", reorderLevel: 5, unitCost: "18.90", supplier: "Dewan Bahasa & Pustaka", location: "Store Room C", status: "available", lastRestocked: today, createdAt: now, updatedAt: now },
];

// ── Expenses ──────────────────────────────────────────────────────────────────
export const DEMO_EXPENSES = [
  { id: 1, title: "Bil Elektrik – TNB Jun 2025", category: "utilities", amount: "4250.00", vendor: "TNB (Tenaga Nasional Berhad)", expenseDate: "2025-06-30", description: "Monthly electricity bill for all blocks", paymentMethod: "bank_transfer", receiptNumber: "TNB-2506-001", status: "paid", approvedBy: "Pengetua", createdAt: now, updatedAt: now },
  { id: 2, title: "Bil Air – SAJ Mei 2025", category: "utilities", amount: "890.00", vendor: "Syarikat Air Johor (SAJ)", expenseDate: "2025-05-31", description: "Monthly water bill", paymentMethod: "bank_transfer", receiptNumber: "SAJ-2505-001", status: "paid", approvedBy: "Pengetua", createdAt: now, updatedAt: now },
  { id: 3, title: "Selenggara Penghawa Dingin", category: "maintenance", amount: "1800.00", vendor: "Sejuk Beku Sdn Bhd", expenseDate: "2025-06-15", description: "Quarterly AC service for all classrooms", paymentMethod: "cheque", receiptNumber: "SB-2506-007", status: "paid", approvedBy: "GPK HEM", createdAt: now, updatedAt: now },
  { id: 4, title: "Alat Tulis Pejabat Q2", category: "stationery", amount: "620.00", vendor: "Stationery Hub Sdn Bhd", expenseDate: "2025-06-01", description: "Office supplies for Q2 2025", paymentMethod: "purchase_order", receiptNumber: "SH-2506-045", status: "paid", approvedBy: "Pengetua", createdAt: now, updatedAt: now },
  { id: 5, title: "Internet Broadband – Jun 2025", category: "telecommunications", amount: "350.00", vendor: "Telekom Malaysia", expenseDate: "2025-06-30", description: "Monthly fibre broadband subscription", paymentMethod: "direct_debit", receiptNumber: "TM-2506-112", status: "paid", approvedBy: "Pengetua", createdAt: now, updatedAt: now },
  { id: 6, title: "Bil Elektrik – TNB Mei 2025", category: "utilities", amount: "3980.00", vendor: "TNB (Tenaga Nasional Berhad)", expenseDate: "2025-05-31", description: "Monthly electricity bill", paymentMethod: "bank_transfer", receiptNumber: "TNB-2505-001", status: "paid", approvedBy: "Pengetua", createdAt: now, updatedAt: now },
  { id: 7, title: "Bil Air – SAJ Apr 2025", category: "utilities", amount: "820.00", vendor: "Syarikat Air Johor (SAJ)", expenseDate: "2025-04-30", description: "Monthly water bill", paymentMethod: "bank_transfer", receiptNumber: "SAJ-2504-001", status: "paid", approvedBy: "Pengetua", createdAt: now, updatedAt: now },
];

export const DEMO_EXPENSE_STATS = {
  totalExpenses: "12710.00",
  count: 7,
};

// ── Analytics snapshot ────────────────────────────────────────────────────────
export const DEMO_ANALYTICS = {
  teachers: { totalTeachers: 10, avgPerformance: "4.50", avgAttendance: "94.95" },
  employees: { totalEmployees: 5, avgPerformance: "4.34", avgAttendance: "95.20" },
  expensesByCategory: [
    { category: "utilities", total: "9940.00", count: 4 },
    { category: "maintenance", total: "1800.00", count: 1 },
    { category: "stationery", total: "620.00", count: 1 },
    { category: "telecommunications", total: "350.00", count: 1 },
  ],
  waterExpenses: [
    { id: 2, title: "Bil Air – SAJ Mei 2025", amount: "890.00", expenseDate: "2025-05-31", description: "Monthly water bill" },
    { id: 7, title: "Bil Air – SAJ Apr 2025", amount: "820.00", expenseDate: "2025-04-30", description: "Monthly water bill" },
  ],
  electricExpenses: [
    { id: 1, title: "Bil Elektrik – TNB Jun 2025", amount: "4250.00", expenseDate: "2025-06-30", description: "Monthly electricity bill" },
    { id: 6, title: "Bil Elektrik – TNB Mei 2025", amount: "3980.00", expenseDate: "2025-05-31", description: "Monthly electricity bill" },
  ],
  topTeachers: DEMO_TEACHERS.slice(0, 5).map(t => ({
    name: t.name,
    performanceRating: t.performanceRating,
    attendancePercentage: t.attendancePercentage,
    subjects: t.subjects,
    status: t.status,
  })),
};

// ── Monthly summaries ─────────────────────────────────────────────────────────
export const DEMO_MONTHLY_EXPENSE = [
  { category: "utilities", total: "5140.00", count: 2 },
  { category: "maintenance", total: "1800.00", count: 1 },
  { category: "stationery", total: "620.00", count: 1 },
  { category: "telecommunications", total: "350.00", count: 1 },
];

export const DEMO_MONTHLY_TEACHER_PERF = {
  totalTeachers: 10,
  avgPerformance: "4.50",
  avgAttendance: "94.95",
};

export const DEMO_MONTHLY_EMPLOYEE = {
  totalEmployees: 5,
  avgPerformance: "4.34",
  avgAttendance: "95.20",
};
