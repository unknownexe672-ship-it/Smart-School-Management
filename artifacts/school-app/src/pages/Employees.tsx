import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Search,
  Users,
  Star,
  CalendarCheck,
  TrendingUp,
  Mail,
  Phone,
  Building2,
  UserCheck,
  UserX,
  LayoutGrid,
  List,
} from "lucide-react";
import { EmployeeDialog } from "@/components/EmployeeDialog";

// ── helpers ──────────────────────────────────────────────────────────────────

const DEPT_COLOURS: Record<string, { bg: string; text: string; dot: string }> = {
  Administration:  { bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500"  },
  "Science Lab":   { bg: "bg-cyan-100",    text: "text-cyan-700",    dot: "bg-cyan-500"    },
  "Student Affairs":{ bg: "bg-amber-100", text: "text-amber-700",   dot: "bg-amber-500"   },
  Library:         { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  "ICT Unit":      { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
  Maintenance:     { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500"  },
  Finance:         { bg: "bg-green-100",   text: "text-green-700",   dot: "bg-green-500"   },
};

const deptColour = (dept: string) =>
  DEPT_COLOURS[dept] ?? { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" };

const ratingColour = (r: number) =>
  r >= 4.5 ? "text-emerald-600" :
  r >= 4.0 ? "text-green-600"   :
  r >= 3.5 ? "text-blue-600"    :
  r >= 3.0 ? "text-amber-600"   : "text-red-500";

const ratingBar = (r: number) =>
  r >= 4.5 ? "bg-emerald-500" :
  r >= 4.0 ? "bg-green-500"   :
  r >= 3.5 ? "bg-blue-500"    :
  r >= 3.0 ? "bg-amber-500"   : "bg-red-500";

function initials(name: string) {
  return name
    .split(" ")
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const AVATAR_PALETTE = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
  "from-teal-500 to-green-600",
  "from-orange-500 to-red-600",
];

const avatarGradient = (id: number) => AVATAR_PALETTE[id % AVATAR_PALETTE.length];

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  colour,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  colour: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colour}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

type Employee = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  role: string;
  department: string;
  employmentStatus?: string | null;
  attendancePercentage?: string | null;
  taskCompletionRate?: string | null;
  performanceRating?: string | null;
  startDate?: string | null;
  status?: string | null;
};

function EmployeeCard({ emp }: { emp: Employee }) {
  const rating = Number(emp.performanceRating ?? 0);
  const attendance = Number(emp.attendancePercentage ?? 0);
  const dept = deptColour(emp.department);
  const isActive = (emp.status ?? "active") === "active";

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group">
      {/* top accent bar per department */}
      <div className={`h-1 w-full ${dept.dot}`} />
      <CardContent className="p-5">
        {/* avatar + name */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarGradient(emp.id)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}
          >
            {initials(emp.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight truncate">{emp.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{emp.role}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${dept.bg} ${dept.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dept.dot}`} />
                {emp.department}
              </span>
              <Badge
                className={`text-[10px] px-2 py-0 h-5 border-0 ${
                  isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {isActive ? "Active" : (emp.status ?? "").replace("_", " ")}
              </Badge>
              {emp.gender && (
                <Badge className={`text-[10px] px-2 py-0 h-5 border-0 ${emp.gender === "female" ? "bg-pink-100 text-pink-700" : "bg-sky-100 text-sky-700"}`}>
                  {emp.gender === "female" ? "♀ Female" : "♂ Male"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* metrics */}
        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3" /> Performance
              </span>
              <span className={`text-xs font-bold ${ratingColour(rating)}`}>
                {rating.toFixed(1)}/5.0
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${ratingBar(rating)}`}
                style={{ width: `${(rating / 5) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarCheck className="w-3 h-3" /> Attendance
              </span>
              <span className={`text-xs font-bold ${attendance >= 95 ? "text-emerald-600" : attendance >= 85 ? "text-amber-600" : "text-red-500"}`}>
                {attendance.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${attendance >= 95 ? "bg-emerald-500" : attendance >= 85 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${attendance}%` }}
              />
            </div>
          </div>
        </div>

        {/* contact */}
        <div className="mt-4 pt-3 border-t border-border/50 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{emp.email}</span>
          </div>
          {emp.phone && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{emp.phone}</span>
            </div>
          )}
          {emp.startDate && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span>Since {emp.startDate}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeRow({ emp }: { emp: Employee }) {
  const rating = Number(emp.performanceRating ?? 0);
  const attendance = Number(emp.attendancePercentage ?? 0);
  const dept = deptColour(emp.department);
  const isActive = (emp.status ?? "active") === "active";

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group">
      <div
        className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(emp.id)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
      >
        {initials(emp.name)}
      </div>
      <div className="min-w-0 flex-[2]">
        <p className="font-semibold text-sm truncate">{emp.name}</p>
        <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
      </div>
      <div className="hidden md:block flex-1">
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${dept.bg} ${dept.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dept.dot}`} />
          {emp.department}
        </span>
      </div>
      <div className="hidden lg:flex flex-1 items-center gap-2">
        <div className="flex-1">
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-muted-foreground">Perf</span>
            <span className={`font-semibold ${ratingColour(rating)}`}>{rating.toFixed(1)}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${ratingBar(rating)}`} style={{ width: `${(rating / 5) * 100}%` }} />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-muted-foreground">Att.</span>
            <span className={`font-semibold ${attendance >= 95 ? "text-emerald-600" : "text-amber-600"}`}>{attendance.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${attendance >= 95 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${attendance}%` }} />
          </div>
        </div>
      </div>
      <div className="hidden sm:flex gap-1.5 flex-shrink-0">
        {emp.gender && (
          <Badge className={`text-[10px] px-1.5 py-0 h-5 border-0 ${emp.gender === "female" ? "bg-pink-100 text-pink-700" : "bg-sky-100 text-sky-700"}`}>
            {emp.gender === "female" ? "♀" : "♂"}
          </Badge>
        )}
        <Badge className={`text-[10px] px-1.5 py-0 h-5 border-0 ${isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
          {isActive ? "Active" : "Leave"}
        </Badge>
      </div>
      <div className="text-[11px] text-muted-foreground hidden xl:block flex-shrink-0 w-24 truncate">
        {emp.email.split("@")[0]}
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Employees() {
  const employeesQuery = trpc.employees.list.useQuery();
  const employees: Employee[] = (employeesQuery.data as Employee[]) || [];

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  // stats
  const total   = employees.length;
  const female  = employees.filter((e) => e.gender === "female").length;
  const male    = employees.filter((e) => e.gender === "male").length;
  const avgPerf = total
    ? (employees.reduce((s, e) => s + Number(e.performanceRating ?? 0), 0) / total).toFixed(2)
    : "0.00";
  const avgAtt  = total
    ? (employees.reduce((s, e) => s + Number(e.attendancePercentage ?? 0), 0) / total).toFixed(1)
    : "0.0";

  const departments = [...new Set(employees.map((e) => e.department))].sort();

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q);
    const matchDept   = deptFilter === "all"   || e.department === deptFilter;
    const matchGender = genderFilter === "all" || e.gender === genderFilter;
    return matchSearch && matchDept && matchGender;
  });

  return (
    <div className="space-y-6">
      {/* ── header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-green-600" />
            Employee Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Staff records, performance analytics &amp; attendance tracking
          </p>
        </div>
        <EmployeeDialog onSuccess={() => employeesQuery.refetch()} />
      </div>

      {/* ── stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-violet-600" />}
          label="Total Staff"
          value={total}
          sub={`${female}F · ${male}M · gender balanced`}
          colour="bg-violet-50"
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-amber-600" />}
          label="Avg Performance"
          value={`${avgPerf}/5.0`}
          sub="across all departments"
          colour="bg-amber-50"
        />
        <StatCard
          icon={<CalendarCheck className="w-5 h-5 text-emerald-600" />}
          label="Avg Attendance"
          value={`${avgAtt}%`}
          sub="this semester"
          colour="bg-emerald-50"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          label="Departments"
          value={departments.length}
          sub={`${employees.filter((e) => (e.status ?? "active") === "active").length} active employees`}
          colour="bg-blue-50"
        />
      </div>

      {/* ── gender equity strip ── */}
      {total > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
                <UserCheck className="w-4 h-4" /> Gender Balance
              </div>
              <div className="flex-1 flex h-3 rounded-full overflow-hidden">
                <div
                  className="bg-pink-400 transition-all"
                  style={{ width: `${(female / total) * 100}%` }}
                  title={`Female: ${female}`}
                />
                <div
                  className="bg-sky-400 transition-all"
                  style={{ width: `${(male / total) * 100}%` }}
                  title={`Male: ${male}`}
                />
              </div>
              <div className="flex gap-3 text-xs whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block" />
                  ♀ Female {female} ({Math.round((female / total) * 100)}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                  ♂ Male {male} ({Math.round((male / total) * 100)}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, role, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44">
            <Building2 className="w-4 h-4 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-36">
            <UserX className="w-4 h-4 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="female">♀ Female</SelectItem>
            <SelectItem value="male">♂ Male</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="sm"
            className="rounded-none h-9 px-3"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            className="rounded-none h-9 px-3 border-l"
            onClick={() => setView("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── results count ── */}
      <p className="text-sm text-muted-foreground -mt-2">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {total} employees
      </p>

      {/* ── employee grid / list ── */}
      {employeesQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="border shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex gap-3 items-center">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-2 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No employees found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</p>
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((emp) => (
            <EmployeeCard key={emp.id} emp={emp} />
          ))}
        </div>
      ) : (
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          {/* list header */}
          <div className="flex items-center gap-4 px-5 py-2.5 bg-muted/40 border-b text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="w-9 flex-shrink-0" />
            <div className="flex-[2]">Employee</div>
            <div className="hidden md:block flex-1">Department</div>
            <div className="hidden lg:block flex-1">Metrics</div>
            <div className="hidden sm:block w-20">Status</div>
            <div className="hidden xl:block w-24">Email</div>
          </div>
          {filtered.map((emp) => (
            <EmployeeRow key={emp.id} emp={emp} />
          ))}
        </Card>
      )}
    </div>
  );
}
