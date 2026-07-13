import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeacherDialog } from "@/components/TeacherDialog";
import { useLocation } from "wouter";
import {
  Users, Star, TrendingUp, Award, Search, SlidersHorizontal,
  Mail, BookOpen, Clock, ChevronRight, GraduationCap,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// avatar bg by teacher id — predictable, distinct
const AVATAR_PALETTES = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-500",
  "bg-cyan-600",
  "bg-pink-600",
  "bg-indigo-600",
];
function avatarBg(id: number) {
  return AVATAR_PALETTES[(id - 1) % AVATAR_PALETTES.length];
}

function perfColor(r: number) {
  if (r >= 4.5) return "text-emerald-600";
  if (r >= 4.0) return "text-green-600";
  if (r >= 3.0) return "text-blue-600";
  return "text-orange-500";
}
function perfBarColor(r: number) {
  if (r >= 4.5) return "bg-emerald-500";
  if (r >= 4.0) return "bg-green-500";
  if (r >= 3.0) return "bg-blue-500";
  return "bg-orange-400";
}

function statusMeta(status: string) {
  if (status === "active") return { label: "Active", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (status === "on_leave") return { label: "On Leave", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Inactive", cls: "bg-gray-100 text-gray-600 border-gray-200" };
}

// ─── component ───────────────────────────────────────────────────────────────

export default function Teachers() {
  const [, navigate] = useLocation();
  const teachersQuery = trpc.teachers.list.useQuery();
  const teachers: any[] = teachersQuery.data ?? [];

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "on_leave" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "performance" | "attendance">("performance");
  const [view, setView] = useState<"cards" | "list">("cards");

  // ── derived stats ───────────────────────────────────────────────────────
  const avgPerf = teachers.length
    ? teachers.reduce((a, t) => a + Number(t.performanceRating ?? 0), 0) / teachers.length
    : 0;
  const avgAtt = teachers.length
    ? teachers.reduce((a, t) => a + Number(t.attendancePercentage ?? 0), 0) / teachers.length
    : 0;
  const topTeacher = [...teachers].sort(
    (a, b) => Number(b.performanceRating ?? 0) - Number(a.performanceRating ?? 0)
  )[0];
  const activeCount = teachers.filter((t) => t.status === "active").length;

  // ── filtered + sorted list ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...teachers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.name?.toLowerCase().includes(q) || t.subjects?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") list = list.filter((t) => (t.status ?? "active") === filterStatus);
    list.sort((a, b) => {
      if (sortBy === "performance") return Number(b.performanceRating ?? 0) - Number(a.performanceRating ?? 0);
      if (sortBy === "attendance") return Number(b.attendancePercentage ?? 0) - Number(a.attendancePercentage ?? 0);
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
    return list;
  }, [teachers, search, filterStatus, sortBy]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-indigo-600" />
            Teacher Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor performance, attendance, and subject assignments
          </p>
        </div>
        <TeacherDialog onSuccess={() => teachersQuery.refetch()} />
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Teachers" value={teachers.length} sub={`${activeCount} active`} color="bg-indigo-50 border-indigo-100 text-indigo-700" />
        <StatCard icon={<Star className="w-5 h-5" />} label="Avg Performance" value={`${avgPerf.toFixed(1)}/5.0`} sub="across all staff" color="bg-amber-50 border-amber-100 text-amber-700" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Avg Attendance" value={`${avgAtt.toFixed(1)}%`} sub="this semester" color="bg-emerald-50 border-emerald-100 text-emerald-700" />
        <StatCard icon={<Award className="w-5 h-5" />} label="Top Performer" value={topTeacher ? topTeacher.name.split(" ").slice(-1)[0] : "—"} sub={topTeacher ? `${Number(topTeacher.performanceRating).toFixed(1)}/5.0` : ""} color="bg-rose-50 border-rose-100 text-rose-700" />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teachers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg border overflow-hidden text-sm font-medium bg-white">
          {(["all", "active", "on_leave"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 capitalize transition-colors border-r last:border-r-0 ${filterStatus === s ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {s === "all" ? "All" : s === "on_leave" ? "On Leave" : "Active"}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border rounded-lg px-2 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="performance">Sort: Performance</option>
            <option value="attendance">Sort: Attendance</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          <button onClick={() => setView("cards")} className={`px-3 py-2 transition-colors ${view === "cards" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>⊞</button>
          <button onClick={() => setView("list")} className={`px-3 py-2 border-l transition-colors ${view === "list" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>☰</button>
        </div>
      </div>

      {/* ── Results label ──────────────────────────────────────────────── */}
      <p className="text-sm text-gray-500">
        {filtered.length} teacher{filtered.length !== 1 ? "s" : ""}
        {search || filterStatus !== "all" ? " matching your filters" : ""}
      </p>

      {/* ── Loading skeletons ─────────────────────────────────────────── */}
      {teachersQuery.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!teachersQuery.isLoading && filtered.length === 0 && (
        <div className="text-center py-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No teachers found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* ── Card grid ─────────────────────────────────────────────────── */}
      {!teachersQuery.isLoading && filtered.length > 0 && view === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onClick={() => navigate(`/teacher/${teacher.id}`)}
            />
          ))}
        </div>
      )}

      {/* ── List view ─────────────────────────────────────────────────── */}
      {!teachersQuery.isLoading && filtered.length > 0 && view === "list" && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Teacher</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Email</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Performance</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Attendance</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher, idx) => {
                const r = Number(teacher.performanceRating ?? 0);
                const a = Number(teacher.attendancePercentage ?? 0);
                const sm = statusMeta(teacher.status ?? "active");
                return (
                  <tr
                    key={teacher.id}
                    onClick={() => navigate(`/teacher/${teacher.id}`)}
                    className={`border-b last:border-b-0 cursor-pointer hover:bg-indigo-50/40 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50/30"}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${avatarBg(teacher.id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {initials(teacher.name ?? "?")}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{teacher.name}</p>
                          <p className="text-xs text-gray-500">{teacher.subjects ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-600 truncate max-w-[180px]">{teacher.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${perfColor(r)}`}>{r.toFixed(1)}</span>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
                          <div className={`h-full ${perfBarColor(r)} rounded-full`} style={{ width: `${(r / 5) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{a.toFixed(1)}%</span>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden hidden lg:block">
                          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${a}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`border text-xs font-medium ${sm.cls}`}>{sm.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── TeacherCard ──────────────────────────────────────────────────────────────

function TeacherCard({ teacher, onClick }: { teacher: any; onClick: () => void }) {
  const r = Number(teacher.performanceRating ?? 0);
  const a = Number(teacher.attendancePercentage ?? 0);
  const sm = statusMeta(teacher.status ?? "active");

  // star render
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = i < Math.floor(r);
    const half = !filled && i < r;
    return { filled, half };
  });

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* top accent bar */}
      <div className={`h-1.5 w-full ${avatarBg(teacher.id)}`} />

      <div className="p-5">
        {/* avatar + name row */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl ${avatarBg(teacher.id)} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm`}>
            {initials(teacher.name ?? "?")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">{teacher.name}</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{teacher.subjects ?? "Subject not assigned"}</p>
          </div>
          <Badge className={`shrink-0 text-xs border font-medium ${sm.cls}`}>{sm.label}</Badge>
        </div>

        {/* stars */}
        <div className="flex items-center gap-1 mb-4">
          {stars.map((s, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${s.filled ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
            />
          ))}
          <span className={`text-sm font-bold ml-1.5 ${perfColor(r)}`}>{r.toFixed(1)}</span>
          <span className="text-xs text-gray-400">/5.0</span>
        </div>

        {/* metrics */}
        <div className="space-y-2.5">
          <MetricRow icon={<TrendingUp className="w-3.5 h-3.5 text-indigo-500" />} label="Attendance">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(a, 100)}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-700 w-10 text-right">{a.toFixed(1)}%</span>
            </div>
          </MetricRow>

          <MetricRow icon={<BookOpen className="w-3.5 h-3.5 text-violet-500" />} label="Classes">
            <span className="text-xs font-semibold text-gray-700">
              {teacher.classesAssigned ?? 0} assigned · {teacher.classesCompleted ?? 0} done
            </span>
          </MetricRow>

          <MetricRow icon={<Clock className="w-3.5 h-3.5 text-emerald-500" />} label="Experience">
            <span className="text-xs font-semibold text-gray-700">{teacher.yearsOfExperience ?? 0} years</span>
          </MetricRow>

          <MetricRow icon={<Mail className="w-3.5 h-3.5 text-rose-400" />} label="Email">
            <span className="text-xs text-gray-500 truncate">{teacher.email ?? "—"}</span>
          </MetricRow>
        </div>
      </div>

      {/* footer */}
      <div className="border-t bg-gray-50/60 px-5 py-2.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">Click to view details</span>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}

function MetricRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="shrink-0">{icon}</div>
      <span className="text-xs text-gray-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs mt-1 opacity-60">{sub}</p>
    </div>
  );
}
