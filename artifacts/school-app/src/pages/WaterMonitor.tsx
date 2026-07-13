import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Droplets, DollarSign, AlertTriangle, Activity,
  Waves, Zap, FlaskConical, Leaf, UtensilsCrossed, Building2,
} from "lucide-react";

// ─── Malaysian water tariff (non-residential/school, SAJ) ────────────────────
// Tiered by monthly consumption — we track daily and project
function calcCost(litres: number): number {
  const m3 = litres / 1000;
  if (m3 <= 35)  return m3 * 0.57;
  if (m3 <= 50)  return 35 * 0.57 + (m3 - 35) * 1.03;
  return 35 * 0.57 + 15 * 1.03 + (m3 - 50) * 2.00;
}
function marginalRate(litres: number): number {
  const m3 = litres / 1000;
  if (m3 <= 35) return 0.00057;
  if (m3 <= 50) return 0.00103;
  return 0.00200;
}

const CHART_WINDOW     = 60;    // rolling seconds kept in chart
const TICK_MS          = 1000;
const EXPENSE_BATCH_L  = 60;    // log to DB every 60 L consumed

// ─── Sources ─────────────────────────────────────────────────────────────────
type SourceId = "toilets" | "canteen" | "garden" | "lab" | "admin";

export const SOURCES: {
  id: SourceId; label: string; shortLabel: string;
  color: string; lightBg: string; border: string;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    id: "toilets",   label: "Student Toilets",      shortLabel: "Toilets",
    color: "#6366f1", lightBg: "bg-indigo-50", border: "border-indigo-200",
    Icon: Waves, description: "Male & female blocks + staff",
  },
  {
    id: "canteen",   label: "Canteen & Kitchen",    shortLabel: "Canteen",
    color: "#f59e0b", lightBg: "bg-amber-50",  border: "border-amber-200",
    Icon: UtensilsCrossed, description: "Food prep, dishwashing, drinks",
  },
  {
    id: "garden",    label: "Garden & Irrigation",  shortLabel: "Garden",
    color: "#10b981", lightBg: "bg-emerald-50", border: "border-emerald-200",
    Icon: Leaf, description: "School field, flower beds, hosepipe",
  },
  {
    id: "lab",       label: "Science Laboratories", shortLabel: "Science Lab",
    color: "#8b5cf6", lightBg: "bg-violet-50",  border: "border-violet-200",
    Icon: FlaskConical, description: "Experiment sinks, equipment rinsing",
  },
  {
    id: "admin",     label: "Admin & Staffroom",    shortLabel: "Admin",
    color: "#06b6d4", lightBg: "bg-cyan-50",   border: "border-cyan-200",
    Icon: Building2, description: "Pantry, toilets, general office use",
  },
];

// ─── Per-source simulation config ────────────────────────────────────────────
interface BurstCfg {
  chance: number;        // prob per tick of starting a burst
  minDur: number;        // seconds
  maxDur: number;
  minMag: number;        // L/min extra during burst
  maxMag: number;
  minGap: number;        // seconds until next burst window
  maxGap: number;
}

interface SimState {
  inBurst: boolean; countdown: number; peak: number; nextIn: number;
}

/** Time-aware base flow (L/min) for each source */
function baseFlow(id: SourceId, h: number, m: number): number {
  const t = h + m / 60;
  const inSchool  = t >= 7   && t < 15;
  const isRecess  = t >= 10  && t < 10.5;
  const isLunch   = t >= 12.5 && t < 13.5;
  const isMorning = t >= 7   && t < 8;
  const isEnd     = t >= 14.5 && t < 15.5;
  const isGarden  = t >= 6.5 && t < 8.5;

  switch (id) {
    case "toilets":
      if (isRecess)  return 18;   // recess rush
      if (isLunch)   return 14;   // lunch rush
      if (isMorning || isEnd) return 7;
      if (inSchool)  return 3;
      return 0.3;                 // overnight trickle

    case "canteen":
      if (isRecess)  return 10;   // serving + washing
      if (isLunch)   return 14;   // full service
      if (isMorning) return 4;    // morning prep
      if (inSchool)  return 2;
      if (t >= 15 && t < 16) return 3; // cleanup
      return 0;

    case "garden":
      if (isGarden)  return 11;   // morning gardener + automated drip
      // brief hand-watering mid-morning/afternoon — near-zero rest of time
      return 0;

    case "lab":
      // Only during lesson blocks, not recess/lunch
      if (inSchool && !isRecess && !isLunch) return 1;
      return 0;

    case "admin":
      if (isMorning) return 3;
      if (inSchool)  return 1.5;
      if (t >= 7 && t < 18) return 0.8;
      return 0.1;
  }
}

/** Burst configuration for each source, scaled to peak/off-peak */
function burstCfg(id: SourceId, h: number, m: number): BurstCfg {
  const t = h + m / 60;
  const isPeak = (t >= 10 && t < 10.5) || (t >= 12.5 && t < 13.5);

  switch (id) {
    case "toilets": return {
      chance: isPeak ? 0.14 : 0.04,
      minDur: isPeak ? 8 : 4,  maxDur: isPeak ? 20 : 10,
      minMag: isPeak ? 18 : 6, maxMag: isPeak ? 42 : 16,
      minGap: isPeak ? 8 : 18, maxGap: isPeak ? 18 : 45,
    };
    case "canteen": return {
      chance: isPeak ? 0.11 : 0.03,
      minDur: 5, maxDur: 18,
      minMag: isPeak ? 12 : 3, maxMag: isPeak ? 28 : 9,
      minGap: 15, maxGap: 50,
    };
    case "garden": return {
      // Simulate irrigation controller cycling every 3–5 min
      chance: (t >= 6.5 && t < 8.5) ? 0.025 : 0.005,
      minDur: 25, maxDur: 80,
      minMag: 5,  maxMag: 14,
      minGap: 40, maxGap: 140,
    };
    case "lab": return {
      chance: 0.022,
      minDur: 10, maxDur: 40,
      minMag: 7,  maxMag: 22,
      minGap: 35, maxGap: 130,
    };
    case "admin": return {
      chance: 0.025,
      minDur: 3,  maxDur: 8,
      minMag: 1.5, maxMag: 6,
      minGap: 20, maxGap: 70,
    };
  }
}

function tickSource(
  sim: SimState, base: number, cfg: BurstCfg
): { flow: number; next: SimState } {
  let { inBurst, countdown, peak, nextIn } = sim;

  nextIn -= 1;

  if (!inBurst && nextIn <= 0 && Math.random() < cfg.chance) {
    inBurst   = true;
    countdown = cfg.minDur + Math.floor(Math.random() * (cfg.maxDur - cfg.minDur));
    peak      = cfg.minMag + Math.random() * (cfg.maxMag - cfg.minMag);
    nextIn    = cfg.minGap + Math.floor(Math.random() * (cfg.maxGap - cfg.minGap));
  } else if (!inBurst && nextIn <= 0) {
    nextIn = cfg.minGap + Math.floor(Math.random() * (cfg.maxGap - cfg.minGap));
  }

  let flow: number;
  if (inBurst) {
    flow = base + peak + (Math.random() - 0.5) * 4;
    countdown -= 1;
    if (countdown <= 0) inBurst = false;
  } else {
    flow = base + (Math.random() - 0.5) * Math.max(base * 0.4, 0.5);
  }

  return { flow: Math.max(0, flow), next: { inBurst, countdown, peak, nextIn } };
}

// ─── Types ────────────────────────────────────────────────────────────────────
type DataPoint = { time: string } & Record<SourceId, number> & { total: number };

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

/** Generate N seed points so the chart is pre-filled on load */
function seedHistory(n = 20): DataPoint[] {
  const points: DataPoint[] = [];
  const now = Date.now();
  const h = new Date(now).getHours();
  const m = new Date(now).getMinutes();
  for (let i = n; i >= 1; i--) {
    const d = new Date(now - i * 1000);
    const flows = Object.fromEntries(
      SOURCES.map((s) => [
        s.id,
        Math.max(0, baseFlow(s.id, h, m) + (Math.random() - 0.5) * baseFlow(s.id, h, m) * 0.5),
      ])
    ) as Record<SourceId, number>;
    const total = SOURCES.reduce((sum, s) => sum + flows[s.id], 0);
    points.push({ time: fmtTime(d), total, ...flows });
  }
  return points;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function StackedTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[200px]">
      <p className="text-xs text-gray-400 mb-2">{label}</p>
      <div className="space-y-1">
        {[...payload].reverse().map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
              {p.name}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: p.fill }}>
              {Number(p.value).toFixed(1)} L/m
            </span>
          </div>
        ))}
      </div>
      <div className="border-t mt-2 pt-1.5 flex justify-between text-xs font-bold text-gray-700">
        <span>Total</span>
        <span>{total.toFixed(1)} L/min</span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WaterMonitor() {
  const utils = trpc.useUtils();

  // Live DB-backed trend: poll every 15 s to reflect newly auto-logged batches
  const { data: allExpenses = [], dataUpdatedAt } = trpc.expenses.list.useQuery(undefined, {
    refetchInterval: 15000,
  } as any);
  const waterBatches = allExpenses
    .filter((e: any) => e.vendor === "Syarikat Air Johor (SAJ)")
    .slice(-24)
    .map((e: any, i: number, arr: any[]) => ({
      label: `B${arr.length - arr.length + i + 1}`,
      cost: parseFloat(e.amount ?? "0"),
      time: e.notes?.split("·")?.[1]?.trim() ?? e.expenseDate ?? "",
    }));
  const totalDbCost = allExpenses
    .filter((e: any) => e.vendor === "Syarikat Air Johor (SAJ)")
    .reduce((s: number, e: any) => s + parseFloat(e.amount ?? "0"), 0);
  const lastBatch = allExpenses.filter((e: any) => e.vendor === "Syarikat Air Johor (SAJ)").slice(-1)[0];

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      setExpenseCount((c) => c + 1);
    },
    onError: () => {
      nextBatchRef.current -= EXPENSE_BATCH_L;
      toast.error("Water sensor: failed to log expense — will retry.");
    },
  });

  const mutateRef = useRef(createExpense.mutate);
  mutateRef.current = createExpense.mutate;

  // ── state ──────────────────────────────────────────────────────────────────
  const [history, setHistory]       = useState<DataPoint[]>(() => seedHistory(20));
  const [totals, setTotals]         = useState<Record<SourceId, number>>({ toilets: 0, canteen: 0, garden: 0, lab: 0, admin: 0 });
  const [peakFlows, setPeakFlows]   = useState<Record<SourceId, number>>({ toilets: 0, canteen: 0, garden: 0, lab: 0, admin: 0 });
  const [expenseCount, setExpenseCount] = useState(0);
  const [events, setEvents]         = useState<{ time: string; source: string; flow: number; color: string }[]>([]);

  // ── refs (stable, no re-renders) ───────────────────────────────────────────
  const simRef = useRef<Record<SourceId, SimState>>({
    toilets: { inBurst: false, countdown: 0, peak: 0, nextIn: 6  },
    canteen: { inBurst: false, countdown: 0, peak: 0, nextIn: 12 },
    garden:  { inBurst: false, countdown: 0, peak: 0, nextIn: 4  },
    lab:     { inBurst: false, countdown: 0, peak: 0, nextIn: 20 },
    admin:   { inBurst: false, countdown: 0, peak: 0, nextIn: 15 },
  });
  const totalsRef   = useRef<Record<SourceId, number>>({ toilets: 0, canteen: 0, garden: 0, lab: 0, admin: 0 });
  const nextBatchRef = useRef(EXPENSE_BATCH_L);
  // track previous burst state to detect transitions (for event log)
  const wasBurstRef = useRef<Record<SourceId, boolean>>({ toilets: false, canteen: false, garden: false, lab: false, admin: false });

  // ── tick ───────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const ts = fmtTime(now);

    const flows = {} as Record<SourceId, number>;
    const newEvents: { time: string; source: string; flow: number; color: string }[] = [];

    for (const src of SOURCES) {
      const base = baseFlow(src.id, h, m);
      const cfg  = burstCfg(src.id, h, m);
      const { flow, next } = tickSource(simRef.current[src.id], base, cfg);
      simRef.current[src.id] = next;
      flows[src.id] = flow;

      // detect new burst start → push event
      if (next.inBurst && !wasBurstRef.current[src.id]) {
        newEvents.push({ time: ts, source: src.label, flow, color: src.color });
      }
      wasBurstRef.current[src.id] = next.inBurst;
    }

    const total = SOURCES.reduce((s, src) => s + flows[src.id], 0);
    const point: DataPoint = { time: ts, total, ...flows } as DataPoint;

    setHistory((prev) => {
      const next = [...prev, point];
      return next.length > CHART_WINDOW ? next.slice(next.length - CHART_WINDOW) : next;
    });

    // update totals
    for (const src of SOURCES) {
      totalsRef.current[src.id] += flows[src.id] / 60; // L/min → L per 1-s tick
    }
    const grandTotal = SOURCES.reduce((s, src) => s + totalsRef.current[src.id], 0);
    setTotals({ ...totalsRef.current });

    // peak tracking
    setPeakFlows((prev) => {
      const next = { ...prev };
      for (const src of SOURCES) if (flows[src.id] > prev[src.id]) next[src.id] = flows[src.id];
      return next;
    });

    // expense logging
    if (grandTotal >= nextBatchRef.current) {
      const rate  = marginalRate(grandTotal);
      const cost  = EXPENSE_BATCH_L * rate;
      const breakdown = SOURCES.map((s) => `${s.shortLabel}: ${totalsRef.current[s.id].toFixed(1)}L`).join(", ");
      mutateRef.current({
        title: `Water Usage – Sensor Batch`,
        category: "utilities",
        amount: cost.toFixed(5),
        expenseDate: now.toISOString().slice(0, 10),
        paymentStatus: "paid",
        vendor: "Syarikat Air Johor (SAJ)",
        approvalStatus: "approved",
        description: `Auto-logged: ${EXPENSE_BATCH_L}L @ RM${rate.toFixed(5)}/L. Sources — ${breakdown}.`,
        notes: `Batch ${Math.ceil(grandTotal / EXPENSE_BATCH_L)} · ${ts}`,
      });
      nextBatchRef.current += EXPENSE_BATCH_L;
    }

    if (newEvents.length) {
      setEvents((prev) => [...newEvents, ...prev].slice(0, 20));
    }
  }, []);

  useEffect(() => {
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [tick]);

  // ── derived ────────────────────────────────────────────────────────────────
  const lastPoint   = history[history.length - 1];
  const currentFlow = (lastPoint?.total ?? 0);
  const grandLitres = SOURCES.reduce((s, src) => s + totals[src.id], 0);
  const totalCost   = calcCost(grandLitres);
  const topSource   = SOURCES.reduce((a, b) => totals[a.id] > totals[b.id] ? a : b, SOURCES[0]);

  // donut data from current flows
  const donutData = SOURCES.map((s) => ({
    name: s.shortLabel, value: lastPoint ? +(lastPoint[s.id] || 0).toFixed(2) : 0, color: s.color,
  })).filter((d) => d.value > 0);

  const overallStatus: "night" | "idle" | "active" | "high" | "peak" =
    currentFlow > 60 ? "peak"   :
    currentFlow > 30 ? "high"   :
    currentFlow > 8  ? "active" :
    currentFlow > 1  ? "idle"   : "night";

  const statusConfig = {
    night:  { label: "School Closed",   cls: "bg-gray-100 border-gray-200 text-gray-600",    dot: "bg-gray-400" },
    idle:   { label: "Low Activity",    cls: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-400" },
    active: { label: "Normal Usage",    cls: "bg-blue-50 border-blue-200 text-blue-700",     dot: "bg-blue-400" },
    high:   { label: "High Usage",      cls: "bg-amber-50 border-amber-200 text-amber-700",  dot: "bg-amber-400" },
    peak:   { label: "Peak / Surge",    cls: "bg-rose-50 border-rose-200 text-rose-600",     dot: "bg-rose-500 animate-ping" },
  }[overallStatus];

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Droplets className="h-8 w-8 text-cyan-500" />
            Water Flow Monitor
          </h1>
          <p className="text-muted-foreground mt-1">
            5 live sensor points · auto-logs expenses · SAJ tiered tariff (RM 0.57–2.00/m³)
          </p>
        </div>
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold ${statusConfig.cls}`}>
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${statusConfig.dot}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusConfig.dot.replace(" animate-ping","")}`} />
          </span>
          {statusConfig.label}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Flow Now" value={currentFlow.toFixed(1)} unit="L/min"
          sub="live · all sources" color="cyan" Icon={Waves} live />
        <KpiCard label="Top Consumer" value={topSource.shortLabel} unit=""
          sub={`${totals[topSource.id].toFixed(1)} L this session`} color="indigo" Icon={topSource.Icon} />
        <KpiCard label="Session Volume" value={grandLitres.toFixed(1)} unit="L"
          sub={`${(grandLitres/1000).toFixed(3)} m³ · ${expenseCount} batch${expenseCount !== 1 ? "es" : ""} logged`} color="blue" Icon={Activity} />
        <KpiCard label="Session Cost" value={`RM ${totalCost.toFixed(4)}`} unit=""
          sub={`@ RM ${marginalRate(grandLitres).toFixed(5)}/L current tier`} color="emerald" Icon={DollarSign} />
      </div>

      {/* Stacked area chart */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <div>
            <h2 className="font-bold text-gray-800">Live Flow by Source</h2>
            <p className="text-xs text-gray-500 mt-0.5">Stacked area · last 60 seconds · L/min per source</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-cyan-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            LIVE
          </div>
        </div>
        <div className="px-4 pb-5">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 28 }}>
              <defs>
                {SOURCES.map((s) => (
                  <linearGradient key={s.id} id={`g_${s.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={s.color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }}
                angle={-30} textAnchor="end" height={44} interval={9} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }}
                label={{ value: "L/min", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11, dy: 25 }} />
              <Tooltip content={<StackedTooltip />} />
              {SOURCES.map((s) => (
                <Area key={s.id} type="monotone" dataKey={s.id} name={s.shortLabel}
                  stackId="1" stroke={s.color} strokeWidth={1.5}
                  fill={`url(#g_${s.id})`} isAnimationActive={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-6 pb-4">
          {SOURCES.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-3 h-2 rounded" style={{ background: s.color }} />
              {s.shortLabel}
            </span>
          ))}
        </div>
      </div>

      {/* Source cards */}
      <div>
        <h2 className="font-bold text-gray-800 mb-3">Source Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {SOURCES.map((s) => {
            const cur = lastPoint?.[s.id] ?? 0;
            const isBursting = simRef.current[s.id]?.inBurst ?? false;
            const miniData = history.slice(-30).map((p) => ({ v: p[s.id] ?? 0 }));
            const litres = totals[s.id];
            const cost = calcCost(grandLitres) * (grandLitres > 0 ? litres / grandLitres : 0);
            return (
              <div key={s.id} className={`rounded-2xl border p-4 ${s.lightBg} ${s.border}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center`}
                    style={{ background: s.color + "22" }}>
                    <s.Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBursting
                    ? "bg-rose-100 text-rose-600 animate-pulse"
                    : cur > 5 ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-500"}`}>
                    {isBursting ? "ACTIVE" : cur > 5 ? "IN USE" : "IDLE"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-600 leading-tight">{s.label}</p>
                <p className="text-[10px] text-gray-400 mb-2">{s.description}</p>

                {/* Mini sparkline */}
                <div className="h-[48px] -mx-1 mb-2">
                  <ResponsiveContainer width="100%" height={48}>
                    <LineChart data={miniData}>
                      <Line type="monotone" dataKey="v" stroke={s.color} strokeWidth={1.5}
                        dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>
                      {cur.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-gray-400">L/min now</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-700">{litres.toFixed(1)} L</p>
                    <p className="text-[10px] text-gray-400">RM {cost.toFixed(4)}</p>
                  </div>
                </div>

                {/* Peak bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>0</span>
                    <span>Peak {peakFlows[s.id].toFixed(1)} L/m</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ background: s.color, width: `${Math.min(100, (cur / Math.max(peakFlows[s.id], 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribution donut + event log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Current distribution donut */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 pt-4 pb-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-1">Current Flow Distribution</h3>
          <p className="text-xs text-gray-500 mb-3">Share of live flow by source</p>
          {donutData.length > 0 ? (
            <div className="flex items-center gap-4">
              <PieChart width={160} height={160}>
                <Pie data={donutData} cx={80} cy={80}
                  innerRadius={45} outerRadius={70}
                  paddingAngle={3} dataKey="value" isAnimationActive={false}>
                  {donutData.map((d, i) => (
                    <Cell key={i} fill={d.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [`${Number(v).toFixed(2)} L/min`, n]} />
              </PieChart>
              <div className="flex flex-col gap-2 flex-1">
                {SOURCES.map((s) => {
                  const v = lastPoint?.[s.id] ?? 0;
                  const pct = currentFlow > 0 ? (v / currentFlow) * 100 : 0;
                  return (
                    <div key={s.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-600 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                          {s.shortLabel}
                        </span>
                        <span className="font-semibold text-gray-700">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ background: s.color, width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Waiting for data…</div>
          )}
        </div>

        {/* Event log */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 pt-4 pb-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-1">Activity Log</h3>
          <p className="text-xs text-gray-500 mb-3">Detected usage bursts — latest first</p>
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              Monitoring… bursts will appear here
            </div>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {events.map((e, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg bg-gray-50 text-sm">
                  <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: e.color }} />
                  <span className="text-gray-400 text-xs tabular-nums shrink-0">{e.time}</span>
                  <span className="font-semibold text-gray-700 truncate">{e.source}</span>
                  <span className="ml-auto text-xs font-bold tabular-nums shrink-0" style={{ color: e.color }}>
                    {e.flow.toFixed(1)} L/m
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DB Live Trend ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <div>
            <h2 className="font-bold text-gray-800">Database Expense Trend</h2>
            <p className="text-xs text-gray-500 mt-0.5">Auto-logged batches from DB · refreshes every 15 s · last {waterBatches.length} records</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total logged</p>
              <p className="text-sm font-bold text-cyan-700">RM {totalDbCost.toFixed(4)}</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${lastBatch ? "bg-cyan-50 border-cyan-200 text-cyan-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
              <span className={`w-2 h-2 rounded-full ${lastBatch ? "bg-cyan-400 animate-pulse" : "bg-gray-300"}`} />
              {lastBatch ? "Receiving" : "Waiting"}
            </div>
          </div>
        </div>

        {waterBatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-400 gap-2">
            <Droplets className="w-6 h-6 text-gray-300" />
            Batches will appear here as the sensor logs consumption
          </div>
        ) : (
          <div className="px-4 pb-5">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={waterBatches} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }}
                  label={{ value: "RM", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 10, dy: 15 }} />
                <Tooltip formatter={(v: any) => [`RM ${Number(v).toFixed(5)}`, "Cost"]}
                  labelFormatter={(l, p) => `${l} · ${p[0]?.payload?.time ?? ""}`}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="cost" name="Cost (RM)" fill="#06b6d4" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-6 mt-2 px-2">
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{allExpenses.filter((e: any) => e.vendor === "Syarikat Air Johor (SAJ)").length}</span> total batches logged
              </div>
              {lastBatch && (
                <div className="text-xs text-gray-500">
                  Last: <span className="font-semibold text-gray-700">{lastBatch.notes ?? lastBatch.expenseDate}</span>
                </div>
              )}
              <div className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
                DB sync: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("en-MY", { hour12: false }) : "—"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-2xl px-5 py-4">
        <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-2">Sensor Configuration</p>
        <div className="flex flex-wrap gap-x-8 gap-y-1.5">
          {[
            ["Supplier",         "Syarikat Air Johor (SAJ)"],
            ["Tariff Tier 1",    "RM 0.57/m³ (first 35 m³)"],
            ["Tariff Tier 2",    "RM 1.03/m³ (next 15 m³)"],
            ["Tariff Tier 3",    "RM 2.00/m³ (above 50 m³)"],
            ["Sample Rate",      "1 Hz (every second)"],
            ["Auto-log Trigger", `Every ${EXPENSE_BATCH_L} L consumed`],
          ].map(([k, v]) => (
            <div key={k} className="text-sm flex items-center gap-1.5">
              <span className="text-gray-500">{k}:</span>
              <span className="font-semibold text-gray-700">{v}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────
const KPI_COLORS: Record<string, string> = {
  cyan:    "bg-cyan-50 border-cyan-100 text-cyan-700 bg-cyan-100",
  indigo:  "bg-indigo-50 border-indigo-100 text-indigo-700 bg-indigo-100",
  blue:    "bg-blue-50 border-blue-100 text-blue-700 bg-blue-100",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-700 bg-emerald-100",
};

function KpiCard({ label, value, unit, sub, color, Icon, live }: {
  label: string; value: string; unit: string; sub: string;
  color: string; Icon: React.ComponentType<{ className?: string }>; live?: boolean;
}) {
  const parts = KPI_COLORS[color]?.split(" ") ?? [];
  return (
    <div className={`rounded-xl border px-4 py-4 ${parts[0]} ${parts[1]}`}>
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 ${parts[4]} ${parts[2]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${parts[2]}`}>
        {label}
        {live && <span className="flex items-center gap-0.5 text-cyan-500 normal-case"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />LIVE</span>}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
        {value}{unit && <span className="text-base font-semibold text-gray-400 ml-1">{unit}</span>}
      </p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
