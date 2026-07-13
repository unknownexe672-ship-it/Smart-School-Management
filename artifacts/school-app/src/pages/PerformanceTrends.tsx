import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine,
} from "recharts";
import {
  TrendingUp, Users, Award, Activity, Star,
  GraduationCap, Briefcase, ArrowUp, ArrowDown, Minus,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

const toNum = (v: any): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v) || 0;
  return 0;
};

function shortName(name: string) {
  const parts = name.split(" ");
  if (parts.length <= 1) return name;
  // "Dr. Aisha Rahman" → "Dr. Rahman"
  const prefix = ["Dr.", "Mr.", "Ms.", "Mrs.", "Puan", "En."].includes(parts[0]) ? parts[0] + " " : "";
  return prefix + parts[parts.length - 1];
}

// ─── custom chart pieces ──────────────────────────────────────────────────────

const GRID_COLOR = "#e5e7eb";
const AXIS_STYLE = { fill: "#6b7280", fontSize: 11, fontFamily: "inherit" };

function CustomTooltipBox({ active, payload, label, unit = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[160px]">
      <p className="font-semibold text-gray-800 mb-2 border-b pb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-bold" style={{ color: p.color }}>
            {typeof p.value === "number" ? p.value.toFixed(2) : p.value}{unit}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function PerformanceTrends() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data: teachersRaw = [], isLoading: tLoading } = trpc.teachers.list.useQuery(undefined, {
    refetchInterval: 10000,
    onSuccess: () => setLastUpdated(new Date()),
  } as any);
  const { data: employeesRaw = [], isLoading: eLoading } = trpc.employees.list.useQuery(undefined, {
    refetchInterval: 10000,
  } as any);

  const teachers: any[] = teachersRaw as any[];
  const employees: any[] = employeesRaw as any[];

  // ── derived data ────────────────────────────────────────────────────────────
  const { teacherRows, employeeRows, combinedRows, avgTP, avgEP, avgTA, avgEA } = useMemo(() => {
    const teacherRows = [...teachers]
      .map((t) => ({
        name: shortName(t.name ?? ""),
        fullName: t.name ?? "",
        performance: toNum(t.performanceRating),
        attendance: toNum(t.attendancePercentage),
        experience: toNum(t.yearsOfExperience),
        subject: t.subjects ?? "—",
        type: "Teacher",
      }))
      .sort((a, b) => b.performance - a.performance);

    const employeeRows = [...employees]
      .map((e) => ({
        name: shortName(e.name ?? ""),
        fullName: e.name ?? "",
        performance: toNum(e.performanceRating),
        attendance: toNum(e.attendancePercentage),
        experience: toNum(e.yearsOfExperience),
        role: e.role ?? "—",
        type: "Employee",
      }))
      .sort((a, b) => b.performance - a.performance);

    const combinedRows = [...teacherRows, ...employeeRows].sort((a, b) => b.performance - a.performance);

    const avg = (arr: any[], key: string) =>
      arr.length ? arr.reduce((s, x) => s + x[key], 0) / arr.length : 0;

    return {
      teacherRows,
      employeeRows,
      combinedRows,
      avgTP: avg(teacherRows, "performance"),
      avgEP: avg(employeeRows, "performance"),
      avgTA: avg(teacherRows, "attendance"),
      avgEA: avg(employeeRows, "attendance"),
    };
  }, [teachers, employees]);

  // performance vs attendance comparison data (both groups, indexed by position)
  const overlapData = useMemo(() => {
    const maxLen = Math.max(teacherRows.length, employeeRows.length);
    return Array.from({ length: maxLen }, (_, i) => ({
      idx: i + 1,
      teacherPerf: teacherRows[i]?.performance ?? null,
      employeePerf: employeeRows[i]?.performance ?? null,
      teacherName: teacherRows[i]?.name ?? "",
      employeeName: employeeRows[i]?.name ?? "",
    }));
  }, [teacherRows, employeeRows]);

  // gender split donut
  const genderData = useMemo(() => {
    const male = teachers.filter((t) => t.gender === "male").length;
    const female = teachers.filter((t) => t.gender === "female").length;
    return [
      { name: "Male", value: male, color: "#6366f1" },
      { name: "Female", value: female, color: "#ec4899" },
    ];
  }, [teachers]);

  // performance tier donut
  const tierData = useMemo(() => {
    const all = [...teacherRows, ...employeeRows];
    return [
      { name: "Excellent (≥4.5)", value: all.filter((p) => p.performance >= 4.5).length, color: "#10b981" },
      { name: "Good (4–4.4)", value: all.filter((p) => p.performance >= 4 && p.performance < 4.5).length, color: "#3b82f6" },
      { name: "Average (3–3.9)", value: all.filter((p) => p.performance >= 3 && p.performance < 4).length, color: "#f59e0b" },
      { name: "Below (< 3)", value: all.filter((p) => p.performance < 3).length, color: "#ef4444" },
    ];
  }, [teacherRows, employeeRows]);

  if (tLoading || eLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading performance data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-indigo-600" />
              Performance Trends
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive analytics across all teaching and support staff
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            LIVE · refreshes every 10s
            {lastUpdated && (
              <span className="font-normal text-indigo-500 ml-1">
                · {lastUpdated.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<GraduationCap className="w-5 h-5" />} label="Teacher Performance" value={`${avgTP.toFixed(2)}/5.00`} sub={`${teachers.length} teachers`} delta={avgTP - 4} color="indigo" />
        <KpiCard icon={<Briefcase className="w-5 h-5" />} label="Employee Performance" value={`${avgEP.toFixed(2)}/5.00`} sub={`${employees.length} employees`} delta={avgEP - 4} color="violet" />
        <KpiCard icon={<Activity className="w-5 h-5" />} label="Teacher Attendance" value={`${avgTA.toFixed(1)}%`} sub="on-time presence" delta={avgTA - 90} color="emerald" />
        <KpiCard icon={<Users className="w-5 h-5" />} label="Employee Attendance" value={`${avgEA.toFixed(1)}%`} sub="on-time presence" delta={avgEA - 90} color="cyan" />
      </div>

      {/* ── Section 1: Performance Line Charts ──────────────────────────── */}
      <Section title="Performance Rating Trends" sub="Individual ratings ranked from highest to lowest — dots show exact scores">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Teacher performance line */}
          <ChartCard title="Teacher Performance" badge="Ratings" badgeColor="indigo">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={teacherRows} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <defs>
                  <linearGradient id="tpGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis domain={[3, 5]} tick={AXIS_STYLE} tickFormatter={(v) => v.toFixed(1)} />
                <Tooltip content={<CustomTooltipBox />} />
                <ReferenceLine y={avgTP} stroke="#6366f1" strokeDasharray="6 3" strokeOpacity={0.5}
                  label={{ value: `Avg ${avgTP.toFixed(2)}`, fill: "#6366f1", fontSize: 10, position: "right" }} />
                <Line
                  type="monotone" dataKey="performance" name="Performance"
                  stroke="url(#tpGrad)" strokeWidth={2.5}
                  dot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Employee performance line */}
          <ChartCard title="Employee Performance" badge="Ratings" badgeColor="violet">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={employeeRows} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <defs>
                  <linearGradient id="epGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis domain={[3, 5]} tick={AXIS_STYLE} tickFormatter={(v) => v.toFixed(1)} />
                <Tooltip content={<CustomTooltipBox />} />
                <ReferenceLine y={avgEP} stroke="#7c3aed" strokeDasharray="6 3" strokeOpacity={0.5}
                  label={{ value: `Avg ${avgEP.toFixed(2)}`, fill: "#7c3aed", fontSize: 10, position: "right" }} />
                <Line
                  type="monotone" dataKey="performance" name="Performance"
                  stroke="url(#epGrad)" strokeWidth={2.5}
                  dot={{ r: 5, fill: "#7c3aed", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Section>

      {/* ── Section 2: Attendance Area Charts ───────────────────────────── */}
      <Section title="Attendance Trends" sub="Attendance percentage per staff member — shaded area shows deviation from benchmark">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <ChartCard title="Teacher Attendance" badge="%" badgeColor="emerald">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={teacherRows} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <defs>
                  <linearGradient id="taGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis domain={[80, 100]} tick={AXIS_STYLE} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltipBox unit="%" />} />
                <ReferenceLine y={90} stroke="#10b981" strokeDasharray="6 3" strokeOpacity={0.4}
                  label={{ value: "90% target", fill: "#10b981", fontSize: 10, position: "insideTopRight" }} />
                <Area
                  type="monotone" dataKey="attendance" name="Attendance"
                  stroke="#10b981" strokeWidth={2.5} fill="url(#taGrad)"
                  dot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Employee Attendance" badge="%" badgeColor="cyan">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={employeeRows} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <defs>
                  <linearGradient id="eaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis domain={[80, 100]} tick={AXIS_STYLE} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltipBox unit="%" />} />
                <ReferenceLine y={90} stroke="#06b6d4" strokeDasharray="6 3" strokeOpacity={0.4}
                  label={{ value: "90% target", fill: "#06b6d4", fontSize: 10, position: "insideTopRight" }} />
                <Area
                  type="monotone" dataKey="attendance" name="Attendance"
                  stroke="#06b6d4" strokeWidth={2.5} fill="url(#eaGrad)"
                  dot={{ r: 5, fill: "#06b6d4", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Section>

      {/* ── Section 3: Head-to-head comparison ──────────────────────────── */}
      <Section title="Teachers vs Employees Comparison" sub="Performance ratings plotted side-by-side across ranked positions">
        <ChartCard title="Combined Performance Overview" badge="Comparison" badgeColor="rose" full>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={overlapData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="idx" tick={AXIS_STYLE} label={{ value: "Rank position", position: "insideBottom", offset: -5, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis domain={[3.5, 5]} tick={AXIS_STYLE} tickFormatter={(v) => v.toFixed(1)} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = overlapData[Number(label) - 1];
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
                      <p className="font-semibold text-gray-700 mb-2">Rank #{label}</p>
                      {payload.map((p: any) => (
                        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                          <span className="text-gray-500 text-xs">
                            {p.dataKey === "teacherPerf" ? d?.teacherName : d?.employeeName}
                          </span>
                          <span className="font-bold ml-auto" style={{ color: p.color }}>
                            {p.value?.toFixed(2) ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line
                type="monotone" dataKey="teacherPerf" name="Teachers"
                stroke="#6366f1" strokeWidth={2.5} connectNulls
                dot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                type="monotone" dataKey="employeePerf" name="Employees"
                stroke="#10b981" strokeWidth={2.5} connectNulls
                dot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                strokeDasharray="6 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>

      {/* ── Section 4: Horizontal bar rankings ──────────────────────────── */}
      <Section title="Staff Rankings" sub="Horizontal bars make it easy to compare at a glance — longer = higher rated">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <ChartCard title="Teacher Rankings" badge="Sorted" badgeColor="indigo">
            <ResponsiveContainer width="100%" height={teacherRows.length * 42 + 20}>
              <BarChart data={teacherRows} layout="vertical" margin={{ top: 4, right: 60, left: 10, bottom: 4 }}>
                <defs>
                  <linearGradient id="trBarGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a5b4fc" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
                <XAxis type="number" domain={[0, 5]} tick={AXIS_STYLE} tickFormatter={(v) => v.toFixed(1)} />
                <YAxis type="category" dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 12 }} width={80} />
                <Tooltip content={<CustomTooltipBox />} />
                <ReferenceLine x={avgTP} stroke="#6366f1" strokeDasharray="5 3" strokeOpacity={0.5} />
                <Bar dataKey="performance" name="Performance" fill="url(#trBarGrad)" radius={[0, 6, 6, 0]} barSize={22}
                  label={{ position: "right", formatter: (v: number) => v.toFixed(2), fill: "#6366f1", fontSize: 11, fontWeight: 700 }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Employee Rankings" badge="Sorted" badgeColor="violet">
            <ResponsiveContainer width="100%" height={employeeRows.length * 42 + 20}>
              <BarChart data={employeeRows} layout="vertical" margin={{ top: 4, right: 60, left: 10, bottom: 4 }}>
                <defs>
                  <linearGradient id="erBarGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
                <XAxis type="number" domain={[0, 5]} tick={AXIS_STYLE} tickFormatter={(v) => v.toFixed(1)} />
                <YAxis type="category" dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 12 }} width={80} />
                <Tooltip content={<CustomTooltipBox />} />
                <ReferenceLine x={avgEP} stroke="#7c3aed" strokeDasharray="5 3" strokeOpacity={0.5} />
                <Bar dataKey="performance" name="Performance" fill="url(#erBarGrad)" radius={[0, 6, 6, 0]} barSize={22}
                  label={{ position: "right", formatter: (v: number) => v.toFixed(2), fill: "#7c3aed", fontSize: 11, fontWeight: 700 }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Section>

      {/* ── Section 5: Distribution donuts + leaderboard ─────────────────── */}
      <Section title="Distribution & Insights" sub="Staff composition and performance tier breakdown">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Gender donut */}
          <ChartCard title="Teacher Gender" badge="Split" badgeColor="rose">
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    paddingAngle={4} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: "#d1d5db" }}
                  >
                    {genderData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-1">
                {genderData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.name}: <strong>{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Tier donut */}
          <ChartCard title="Performance Tiers" badge="All Staff" badgeColor="amber">
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={tierData.filter((d) => d.value > 0)} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value"
                    label={({ name, value }) => value > 0 ? `${value}` : ""}
                  >
                    {tierData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                {tierData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-500 truncate">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Top performers list */}
          <ChartCard title="Top Performers" badge="Leaderboard" badgeColor="emerald">
            <div className="space-y-2">
              {combinedRows.slice(0, 7).map((p, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? "bg-amber-400 text-white" :
                    idx === 1 ? "bg-gray-300 text-gray-700" :
                    idx === 2 ? "bg-orange-300 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">{p.type === "Teacher" ? p.subject : (p as any).role}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-bold ${p.performance >= 4.5 ? "text-emerald-600" : p.performance >= 4 ? "text-blue-600" : "text-orange-500"}`}>
                      {p.performance.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-gray-400">{p.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </Section>

    </div>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-700",
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
  cyan: "bg-cyan-100 text-cyan-700",
  rose: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-700",
};

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function ChartCard({
  title, badge, badgeColor = "indigo", children, full,
}: {
  title: string; badge?: string; badgeColor?: string; children: React.ReactNode; full?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${full ? "col-span-full" : ""}`}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        {badge && (
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${BADGE_COLORS[badgeColor] ?? BADGE_COLORS.indigo}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="px-4 pb-5">{children}</div>
    </div>
  );
}

const COLOR_MAP: Record<string, { kpi: string; ring: string; text: string }> = {
  indigo: { kpi: "bg-indigo-50 border-indigo-100", ring: "bg-indigo-100", text: "text-indigo-700" },
  violet: { kpi: "bg-violet-50 border-violet-100", ring: "bg-violet-100", text: "text-violet-700" },
  emerald: { kpi: "bg-emerald-50 border-emerald-100", ring: "bg-emerald-100", text: "text-emerald-700" },
  cyan: { kpi: "bg-cyan-50 border-cyan-100", ring: "bg-cyan-100", text: "text-cyan-700" },
};

function KpiCard({ icon, label, value, sub, delta, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; delta: number; color: string;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;
  const DeltaIcon = delta > 0.1 ? ArrowUp : delta < -0.1 ? ArrowDown : Minus;
  const deltaColor = delta > 0.1 ? "text-emerald-600" : delta < -0.1 ? "text-rose-500" : "text-gray-400";

  return (
    <div className={`rounded-xl border px-4 py-4 ${c.kpi}`}>
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 ${c.ring} ${c.text}`}>
        {icon}
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        <DeltaIcon className={`w-3 h-3 ${deltaColor}`} />
        <p className={`text-xs ${deltaColor} font-medium`}>{sub}</p>
      </div>
    </div>
  );
}
