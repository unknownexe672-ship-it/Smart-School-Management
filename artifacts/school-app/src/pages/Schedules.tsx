import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, BookOpen, ChevronDown } from "lucide-react";
import { ScheduleDialog } from "@/components/ScheduleDialog";

// ─── constants ───────────────────────────────────────────────────────────────

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday",
};
const DAY_SHORT: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri",
};

// time slots we show as rows — derive from actual data, but define order
const TIME_SLOTS = ["07:30", "08:30", "09:00", "10:00", "11:00", "12:00"];

// subject → colour scheme  [bg, border-left, text, badge-bg, badge-text]
const SUBJECT_COLORS: Record<string, [string, string, string, string, string]> = {
  Mathematics:      ["bg-blue-50",   "border-blue-500",   "text-blue-900",   "bg-blue-100",   "text-blue-800"],
  Physics:          ["bg-cyan-50",   "border-cyan-500",   "text-cyan-900",   "bg-cyan-100",   "text-cyan-800"],
  Chemistry:        ["bg-orange-50", "border-orange-500", "text-orange-900", "bg-orange-100", "text-orange-800"],
  "Bahasa Malaysia":["bg-green-50",  "border-green-500",  "text-green-900",  "bg-green-100",  "text-green-800"],
  English:          ["bg-purple-50", "border-purple-500", "text-purple-900", "bg-purple-100", "text-purple-800"],
  Sejarah:          ["bg-rose-50",   "border-rose-500",   "text-rose-900",   "bg-rose-100",   "text-rose-800"],
};
const FALLBACK_COLORS: [string, string, string, string, string] =
  ["bg-gray-50", "border-gray-400", "text-gray-900", "bg-gray-100", "text-gray-800"];

function subjectColors(subject?: string | null) {
  if (!subject) return FALLBACK_COLORS;
  return SUBJECT_COLORS[subject] ?? FALLBACK_COLORS;
}

// day header accent colours
const DAY_HEADER: Record<string, string> = {
  monday:    "bg-blue-600",
  tuesday:   "bg-violet-600",
  wednesday: "bg-emerald-600",
  thursday:  "bg-amber-500",
  friday:    "bg-rose-600",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(t: string) {
  // "07:30:00" → "7:30 AM" etc.
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function Schedules() {
  const schedulesQuery = trpc.schedules.list.useQuery();
  const { data: classes = [] } = trpc.classes.list.useQuery();
  const { data: teachers = [] } = trpc.teachers.list.useQuery();
  const { data: rooms = [] } = trpc.rooms.list.useQuery();

  const [filterTeacher, setFilterTeacher] = useState<number | "all">("all");
  const [filterClass, setFilterClass] = useState<number | "all">("all");
  const [view, setView] = useState<"timetable" | "teacher">("timetable");

  const classMap = Object.fromEntries((classes as any[]).map((c) => [c.id, c.name]));
  const teacherMap = Object.fromEntries((teachers as any[]).map((t) => [t.id, t.name]));
  const roomMap = Object.fromEntries((rooms as any[]).map((r) => [r.id, r.name]));

  const all: any[] = schedulesQuery.data ?? [];

  const filtered = all.filter((s) => {
    if (filterTeacher !== "all" && s.teacherId !== filterTeacher) return false;
    if (filterClass !== "all" && s.classId !== filterClass) return false;
    return true;
  });

  // unique time slots from data, merged with our ordered list
  const slotSet = new Set<string>([
    ...TIME_SLOTS,
    ...all.map((s) => s.startTime.slice(0, 5)),
  ]);
  const slots = [...slotSet].sort();

  // lookup: day → timeStart → schedules[]
  const grid: Record<string, Record<string, any[]>> = {};
  for (const day of DAYS) {
    grid[day] = {};
    for (const slot of slots) grid[day][slot] = [];
  }
  for (const s of filtered) {
    const day = s.dayOfWeek as string;
    const slot = s.startTime.slice(0, 5);
    if (grid[day]?.[slot]) grid[day][slot].push(s);
  }

  // stats
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const todayCount = filtered.filter((s) => s.dayOfWeek === today).length;
  const subjectSet = new Set(all.map((s) => s.subject).filter(Boolean));

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8 text-purple-600" />
            Class Scheduler
          </h1>
          <p className="text-muted-foreground mt-1">
            Weekly timetable for all classes and teachers
          </p>
        </div>
        <ScheduleDialog onSuccess={() => schedulesQuery.refetch()} />
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Sessions", value: all.length, icon: <BookOpen className="w-4 h-4" />, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Today", value: todayCount, icon: <Clock className="w-4 h-4" />, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Teachers", value: teachers.length, icon: <User className="w-4 h-4" />, color: "text-violet-600 bg-violet-50 border-violet-100" },
          { label: "Subjects", value: subjectSet.size, icon: <MapPin className="w-4 h-4" />, color: "text-rose-600 bg-rose-50 border-rose-100" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${s.color}`}>
            <div className="shrink-0">{s.icon}</div>
            <div>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-xs mt-0.5 opacity-70 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle */}
        <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
          <button
            onClick={() => setView("timetable")}
            className={`px-4 py-2 transition-colors ${view === "timetable" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            📅 Timetable
          </button>
          <button
            onClick={() => setView("teacher")}
            className={`px-4 py-2 transition-colors border-l ${view === "teacher" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            👤 By Teacher
          </button>
        </div>

        {/* Teacher filter */}
        <div className="relative">
          <select
            value={filterTeacher}
            onChange={(e) => setFilterTeacher(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="appearance-none border rounded-lg pl-3 pr-8 py-2 text-sm bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="all">All Teachers</option>
            {(teachers as any[]).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Class filter */}
        <div className="relative">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="appearance-none border rounded-lg pl-3 pr-8 py-2 text-sm bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="all">All Classes</option>
            {(classes as any[]).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {(filterTeacher !== "all" || filterClass !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterTeacher("all"); setFilterClass("all"); }}
            className="text-gray-500"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Main view ───────────────────────────────────────────────────── */}
      {schedulesQuery.isLoading ? (
        <div className="grid grid-cols-5 gap-3">
          {DAYS.map((d) => (
            <div key={d} className="space-y-2">
              <div className="h-10 rounded-lg bg-gray-200 animate-pulse" />
              {[1,2,3].map((i) => <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />)}
            </div>
          ))}
        </div>
      ) : view === "timetable" ? (
        <TimetableGrid grid={grid} slots={slots} classMap={classMap} teacherMap={teacherMap} roomMap={roomMap} />
      ) : (
        <ByTeacherView schedules={filtered} teachers={teachers as any[]} classMap={classMap} roomMap={roomMap} />
      )}

      {/* ── Subject legend ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 pt-2">
        <span className="text-xs text-gray-500 self-center font-medium">Subjects:</span>
        {Object.entries(SUBJECT_COLORS).map(([subj, [, , , badgeBg, badgeText]]) => (
          <span key={subj} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeBg} ${badgeText}`}>
            {subj}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Timetable grid ───────────────────────────────────────────────────────────

function TimetableGrid({
  grid, slots, classMap, teacherMap, roomMap,
}: {
  grid: Record<string, Record<string, any[]>>;
  slots: string[];
  classMap: Record<number, string>;
  teacherMap: Record<number, string>;
  roomMap: Record<number, string>;
}) {
  const occupiedSlots = slots.filter((slot) =>
    DAYS.some((day) => (grid[day]?.[slot]?.length ?? 0) > 0)
  );

  if (occupiedSlots.length === 0) {
    return (
      <div className="text-center py-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No schedules found</p>
        <p className="text-sm text-gray-400 mt-1">Add a schedule or clear your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full border-collapse min-w-[700px]">
        <thead>
          <tr>
            {/* time column header */}
            <th className="w-24 bg-gray-50 border-b border-r border-gray-200 p-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</span>
            </th>
            {DAYS.map((day) => (
              <th key={day} className="border-b border-r last:border-r-0 border-gray-200 p-0">
                <div className={`${DAY_HEADER[day]} text-white py-3 px-4 text-center`}>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80 hidden sm:block">{DAY_LABELS[day]}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80 sm:hidden">{DAY_SHORT[day]}</p>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {occupiedSlots.map((slot, si) => (
            <tr key={slot} className={si % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
              {/* time label */}
              <td className="border-r border-b border-gray-100 p-3 align-top w-24">
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                  <Clock className="w-3 h-3" />
                  {fmt(slot)}
                </div>
              </td>
              {DAYS.map((day) => {
                const items = grid[day]?.[slot] ?? [];
                return (
                  <td key={day} className="border-r last:border-r-0 border-b border-gray-100 p-1.5 align-top min-w-[130px]">
                    <div className="space-y-1.5">
                      {items.length === 0 ? (
                        <div className="h-full min-h-[56px] rounded-lg border border-dashed border-gray-100" />
                      ) : (
                        items.map((s) => {
                          const [bg, border, textCol, , ] = subjectColors(s.subject);
                          return (
                            <div
                              key={s.id}
                              className={`${bg} border-l-4 ${border} rounded-lg p-2.5 group hover:shadow-md transition-shadow cursor-default`}
                            >
                              <p className={`text-xs font-bold ${textCol} leading-tight truncate`}>
                                {s.subject ?? "—"}
                              </p>
                              <p className="text-[11px] text-gray-600 mt-1 truncate font-medium">
                                {classMap[s.classId] ?? `Class ${s.classId}`}
                              </p>
                              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-500">
                                <User className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{(teacherMap[s.teacherId] ?? "—").split(" ").slice(-1)[0]}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{roomMap[s.roomId] ?? `Room ${s.roomId}`}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1.5">
                                {fmt(s.startTime)} – {fmt(s.endTime)}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── By-teacher swimlane view ─────────────────────────────────────────────────

function ByTeacherView({
  schedules, teachers, classMap, roomMap,
}: {
  schedules: any[];
  teachers: any[];
  classMap: Record<number, string>;
  roomMap: Record<number, string>;
}) {
  const byTeacher: Record<number, any[]> = {};
  for (const t of teachers) byTeacher[t.id] = [];
  for (const s of schedules) {
    if (byTeacher[s.teacherId]) byTeacher[s.teacherId].push(s);
  }

  // sort by day then time
  const dayOrder: Record<string, number> = { monday:0, tuesday:1, wednesday:2, thursday:3, friday:4, saturday:5, sunday:6 };

  return (
    <div className="space-y-4">
      {teachers.map((teacher: any) => {
        const ts = [...(byTeacher[teacher.id] ?? [])].sort(
          (a, b) => (dayOrder[a.dayOfWeek] ?? 9) - (dayOrder[b.dayOfWeek] ?? 9) || a.startTime.localeCompare(b.startTime)
        );
        if (ts.length === 0) return null;
        return (
          <div key={teacher.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* teacher header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {teacher.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{teacher.name}</p>
                  <p className="text-white/70 text-xs">{teacher.subjects ?? ""}</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-xs">
                {ts.length} session{ts.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {/* sessions row */}
            <div className="p-3 flex gap-2.5 flex-wrap">
              {ts.map((s) => {
                const [bg, border, textCol] = subjectColors(s.subject);
                return (
                  <div key={s.id} className={`${bg} border-l-4 ${border} rounded-xl p-3 min-w-[130px] max-w-[160px] flex-shrink-0`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${textCol}`}>
                        {DAY_SHORT[s.dayOfWeek] ?? s.dayOfWeek}
                      </span>
                      <span className="text-[10px] text-gray-400">{fmt(s.startTime)}</span>
                    </div>
                    <p className={`text-xs font-bold ${textCol} leading-tight`}>{s.subject ?? "—"}</p>
                    <p className="text-[11px] text-gray-600 mt-1 font-medium">{classMap[s.classId] ?? `Class ${s.classId}`}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-500">
                      <MapPin className="w-2.5 h-2.5" />
                      <span className="truncate">{roomMap[s.roomId] ?? `Room ${s.roomId}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
