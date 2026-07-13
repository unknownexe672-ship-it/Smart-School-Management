import { useCallback, useEffect, useRef, useState } from "react";
import { Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
} from "recharts";

// ─── Zones ───────────────────────────────────────────────────────────────────
type ZoneId = "classrooms" | "computer_lab" | "science_lab" | "canteen" | "admin" | "outdoor";

const ZONES = [
  { id: "classrooms"  as ZoneId, label: "Classrooms (A–D)", description: "12 rooms · ACs, fans & lighting",   color: "#f59e0b", dim: "#fef3c7" },
  { id: "computer_lab"as ZoneId, label: "Computer Lab",     description: "40 PCs, projectors & cooling",      color: "#ef4444", dim: "#fee2e2" },
  { id: "science_lab" as ZoneId, label: "Science Labs",     description: "Equipment, fume hoods & ACs",       color: "#8b5cf6", dim: "#ede9fe" },
  { id: "canteen"     as ZoneId, label: "Canteen & Kitchen",description: "Cooking appliances, fridges & ACs", color: "#f97316", dim: "#ffedd5" },
  { id: "admin"       as ZoneId, label: "Admin & Staffroom",description: "Offices, PCs & ACs",                color: "#06b6d4", dim: "#cffafe" },
  { id: "outdoor"     as ZoneId, label: "Outdoor Lighting", description: "Streetlamps & security lights",     color: "#84cc16", dim: "#ecfccb" },
] as const;

// ─── TNB Tiered Tariff (Malaysian Commercial School Rate) ─────────────────────
// Tier 1: 0–200 kWh  → RM 0.218/kWh
// Tier 2: 201–500 kWh → RM 0.334/kWh
// Tier 3: >500 kWh   → RM 0.509/kWh
function calcCost(kWh: number): number {
  if (kWh <= 200) return kWh * 0.218;
  if (kWh <= 500) return 200 * 0.218 + (kWh - 200) * 0.334;
  return 200 * 0.218 + 300 * 0.334 + (kWh - 500) * 0.509;
}
function marginalRate(kWh: number): number {
  if (kWh <= 200) return 0.218;
  if (kWh <= 500) return 0.334;
  return 0.509;
}
function tierLabel(kWh: number) {
  if (kWh <= 200) return { label: "Tier 1", color: "#22c55e" };
  if (kWh <= 500) return { label: "Tier 2", color: "#f59e0b" };
  return { label: "Tier 3", color: "#ef4444" };
}

// ─── Simulation: base kW draw per zone by time of day ────────────────────────
function baseKw(id: ZoneId, h: number, m: number): number {
  const t = h + m / 60;
  switch (id) {
    case "classrooms": {
      if (t >= 7 && t < 16)  return 35;
      if (t >= 16 && t < 19) return 8;
      return 2;
    }
    case "computer_lab": {
      const inSession = (t >= 8 && t < 10) || (t >= 11 && t < 13) || (t >= 14 && t < 16);
      if (inSession) return 22;
      if (t >= 7 && t < 16)  return 3;
      return 0.5;
    }
    case "science_lab": {
      if (t >= 8 && t < 16)  return 12;
      if (t >= 16 && t < 18) return 3;
      return 1;
    }
    case "canteen": {
      if (t >= 6 && t < 7.5)  return 20;
      if (t >= 7.5 && t < 10) return 12;
      if (t >= 10 && t < 14)  return 22;
      if (t >= 14 && t < 18)  return 8;
      return 4;
    }
    case "admin": {
      if (t >= 7.5 && t < 17) return 10;
      if (t >= 17 && t < 19)  return 4;
      return 1;
    }
    case "outdoor": {
      if (t >= 18 || t < 7) return 8;
      return 0;
    }
    default: return 0;
  }
}

// Burst config: random load spikes (AC surge, equipment power-on)
function burstCfg(id: ZoneId, h: number) {
  switch (id) {
    case "classrooms":  return { prob: 0.01, mag: 8,  dur: 5 };
    case "computer_lab":return { prob: 0.008,mag: 12, dur: 8 };
    case "science_lab": return { prob: 0.015,mag: 15, dur: 10 };
    case "canteen":     return { prob: 0.012,mag: 10, dur: 6 };
    case "admin":       return { prob: 0.005,mag: 5,  dur: 4 };
    case "outdoor":     return { prob: 0,    mag: 0,  dur: 0 };
    default:            return { prob: 0,    mag: 0,  dur: 0 };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type DataPoint = { time: string } & Record<ZoneId, number> & { total: number };

type ZoneSim = {
  currentKw: number;
  burstRemaining: number;
  burstMag: number;
  kWhAccum: number;
  sessionKwh: number;
  sessionCost: number;
  peakKw: number;
  sparkline: number[];
};

function fmt(d: Date) {
  return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function seedHistory(n = 20): DataPoint[] {
  const points: DataPoint[] = [];
  const now = Date.now();
  const h = new Date(now).getHours();
  const m = new Date(now).getMinutes();
  for (let i = n; i >= 1; i--) {
    const d = new Date(now - i * 1000);
    const vals = Object.fromEntries(
      ZONES.map((z) => [z.id, Math.max(0, baseKw(z.id, h, m) + (Math.random() - 0.5) * baseKw(z.id, h, m) * 0.3)])
    ) as Record<ZoneId, number>;
    const total = ZONES.reduce((s, z) => s + vals[z.id], 0);
    points.push({ time: fmt(d), total, ...vals });
  }
  return points;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ElectricMonitor() {
  // Live DB-backed trend: poll every 15 s
  const { data: allExpenses = [], dataUpdatedAt: elecUpdatedAt } = trpc.expenses.list.useQuery(undefined, {
    refetchInterval: 15000,
  } as any);
  const elecBatches = (allExpenses as any[])
    .filter((e: any) => e.vendor === "TNB (Tenaga Nasional Berhad)")
    .slice(-24)
    .map((e: any, i: number, arr: any[]) => ({
      label: `B${i + 1}`,
      cost: parseFloat(e.amount ?? "0"),
      time: e.expenseDate ?? "",
    }));
  const totalElecDbCost = (allExpenses as any[])
    .filter((e: any) => e.vendor === "TNB (Tenaga Nasional Berhad)")
    .reduce((s: number, e: any) => s + parseFloat(e.amount ?? "0"), 0);
  const lastElecBatch = (allExpenses as any[]).filter((e: any) => e.vendor === "TNB (Tenaga Nasional Berhad)").slice(-1)[0];

  const [history,     setHistory]     = useState<DataPoint[]>(() => seedHistory(20));
  const [zoneSims,    setZoneSims]    = useState<Record<ZoneId, ZoneSim>>(() =>
    Object.fromEntries(
      ZONES.map((z) => {
        const h = new Date().getHours();
        const m = new Date().getMinutes();
        const kw = baseKw(z.id, h, m);
        return [z.id, { currentKw: kw, burstRemaining: 0, burstMag: 0, kWhAccum: 0, sessionKwh: 0, sessionCost: 0, peakKw: kw, sparkline: Array(20).fill(kw) }];
      })
    ) as Record<ZoneId, ZoneSim>
  );
  const [totalKwh,    setTotalKwh]    = useState(0);
  const [batchCount,  setBatchCount]  = useState(0);
  const [events,      setEvents]      = useState<{ time: string; zone: string; msg: string; kw: number }[]>([]);

  const simRef     = useRef<Record<ZoneId, ZoneSim>>(zoneSims);
  const totalsRef  = useRef({ totalKwh: 0, batchCount: 0 });
  const nextBatch  = useRef(1); // kWh threshold for next log
  const rollbackRef= useRef<{ prevKwh: number; prevNext: number } | null>(null);
  const mutateRef  = useRef<ReturnType<typeof trpc.expenses.create.useMutation>["mutate"] | null>(null);

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => { toast.success("⚡ Electricity usage logged to expenses"); },
    onError:   () => {
      if (rollbackRef.current) {
        totalsRef.current.totalKwh = rollbackRef.current.prevKwh;
        nextBatch.current          = rollbackRef.current.prevNext;
        rollbackRef.current        = null;
      }
      toast.error("Failed to log electricity expense — rolled back");
    },
  });

  useEffect(() => { mutateRef.current = createExpense.mutate; }, [createExpense.mutate]);

  const tick = useCallback(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const DT = 1 / 3600; // 1 second in hours → kWh per tick

    const newSims = { ...simRef.current };
    const newEvents: { time: string; zone: string; msg: string; kw: number }[] = [];

    ZONES.forEach((z) => {
      const sim    = { ...newSims[z.id] };
      const base   = baseKw(z.id, h, m);
      const burst  = burstCfg(z.id, h);
      const noise  = (Math.random() - 0.5) * base * 0.25;

      if (sim.burstRemaining > 0) {
        sim.burstRemaining--;
      } else if (burst.prob > 0 && Math.random() < burst.prob) {
        sim.burstRemaining = burst.dur;
        sim.burstMag       = burst.mag;
        newEvents.push({ time: fmt(now), zone: z.label, msg: `Load spike detected`, kw: base + burst.mag });
      }

      const extra = sim.burstRemaining > 0 ? sim.burstMag : 0;
      sim.currentKw   = Math.max(0, base + noise + extra);
      sim.peakKw      = Math.max(sim.peakKw, sim.currentKw);

      const incKwh    = sim.currentKw * DT;
      sim.kWhAccum    = (sim.kWhAccum ?? 0) + incKwh;
      sim.sessionKwh  = (sim.sessionKwh  ?? 0) + incKwh;
      sim.sessionCost = calcCost(sim.sessionKwh);
      sim.sparkline   = [...(sim.sparkline ?? []).slice(-19), sim.currentKw];

      newSims[z.id] = sim;
    });

    simRef.current = newSims;

    const totalIncKwh = ZONES.reduce((s, z) => s + newSims[z.id].currentKw * DT, 0);
    totalsRef.current.totalKwh += totalIncKwh;

    // Auto-log every 1 kWh
    if (totalsRef.current.totalKwh >= nextBatch.current) {
      const batchKwh  = 1;
      const batchCost = batchKwh * marginalRate(totalsRef.current.totalKwh);
      rollbackRef.current = { prevKwh: totalsRef.current.totalKwh, prevNext: nextBatch.current };
      nextBatch.current += 1;
      totalsRef.current.batchCount += 1;

      const breakdown = ZONES.map((z) => `${z.label.split("(")[0].trim()}: ${newSims[z.id].sessionKwh.toFixed(3)} kWh`).join(" | ");

      const today = new Date().toISOString().slice(0, 10);
      mutateRef.current?.({
        title:         `Electricity Usage - Batch #${totalsRef.current.batchCount}`,
        category:      "Utilities",
        amount:        batchCost.toFixed(6),
        expenseDate:   today,
        paymentStatus: "paid",
        vendor:        "TNB (Tenaga Nasional Berhad)",
        approvalStatus:"approved",
        description:   `Auto-logged: ${batchKwh} kWh @ RM ${batchCost.toFixed(4)}. ${breakdown}`,
        notes:         "Electric Monitor auto-log",
      });
    }

    const vals = Object.fromEntries(ZONES.map((z) => [z.id, newSims[z.id].currentKw])) as Record<ZoneId, number>;
    const total = ZONES.reduce((s, z) => s + newSims[z.id].currentKw, 0);
    const point: DataPoint = { time: fmt(now), total, ...vals };

    setHistory((prev) => [...prev.slice(-59), point]);
    setZoneSims({ ...newSims });
    setTotalKwh(totalsRef.current.totalKwh);
    setBatchCount(totalsRef.current.batchCount);
    if (newEvents.length) setEvents((prev) => [...newEvents, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const lastPt   = history[history.length - 1];
  const totalKw  = lastPt?.total ?? 0;
  const topZone  = ZONES.reduce((a, b) => (lastPt?.[a.id] ?? 0) >= (lastPt?.[b.id] ?? 0) ? a : b);
  const tier     = tierLabel(totalKwh);
  const cost     = calcCost(totalKwh);
  const mRate    = marginalRate(totalKwh);
  const isHigh   = totalKw > 60;
  const statusLabel = totalKw <= 5 ? "Minimal Load" : totalKw <= 30 ? "Low Load" : totalKw <= 60 ? "Normal" : totalKw <= 80 ? "High Load" : "Peak Load";
  const statusColor = totalKw <= 5 ? "#94a3b8" : totalKw <= 30 ? "#22c55e" : totalKw <= 60 ? "#3b82f6" : totalKw <= 80 ? "#f59e0b" : "#ef4444";

  const donutData = ZONES.map((z) => ({ name: z.label.split("(")[0].trim(), value: lastPt?.[z.id] ?? 0, color: z.color }));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-8 w-8 text-amber-500" />
            Electric Monitor
          </h1>
          <p className="text-muted-foreground text-sm">
            6 live zone meters · auto-logs expenses · TNB tiered tariff (RM 0.218–0.509/kWh)
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border"
          style={{ borderColor: statusColor, color: statusColor, background: statusColor + "18" }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusColor }} />
          {statusLabel}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: <Zap className="w-5 h-5 text-amber-500" />,
            label: "TOTAL LOAD NOW",
            value: <><span className="text-3xl font-bold">{totalKw.toFixed(1)}</span><span className="text-base font-normal ml-1 text-muted-foreground">kW</span></>,
            sub: "live · all zones",
            bg: "from-amber-50 to-yellow-50",
            border: "border-amber-100",
            dot: "#f59e0b",
          },
          {
            icon: <TrendingUp className="w-5 h-5 text-rose-500" />,
            label: "TOP CONSUMER",
            value: <span className="text-2xl font-bold">{topZone.label.split("(")[0].trim()}</span>,
            sub: `${(lastPt?.[topZone.id] ?? 0).toFixed(1)} kW live`,
            bg: "from-rose-50 to-pink-50",
            border: "border-rose-100",
            dot: "#ef4444",
          },
          {
            icon: <Zap className="w-5 h-5 text-violet-500" />,
            label: "SESSION ENERGY",
            value: <><span className="text-3xl font-bold">{totalKwh.toFixed(3)}</span><span className="text-base font-normal ml-1 text-muted-foreground">kWh</span></>,
            sub: `${batchCount} batches logged`,
            bg: "from-violet-50 to-purple-50",
            border: "border-violet-100",
            dot: "#8b5cf6",
          },
          {
            icon: <span className="text-emerald-500 font-bold">RM</span>,
            label: "SESSION COST",
            value: <span className="text-2xl font-bold">RM {cost.toFixed(4)}</span>,
            sub: `@ RM ${mRate.toFixed(3)}/kWh · ${tier.label}`,
            bg: "from-emerald-50 to-green-50",
            border: "border-emerald-100",
            dot: "#10b981",
          },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${k.border} bg-gradient-to-br ${k.bg} p-4`}>
            <div className="flex items-center gap-1.5 mb-2">
              {k.icon}
              <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{k.label}</span>
              {i === 0 && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
            </div>
            <div className="leading-none mb-1">{k.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-base">Live Power by Zone</h2>
            <p className="text-xs text-muted-foreground">Stacked area · last 60 seconds · kW per zone</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />LIVE
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} label={{ value: "kW", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
            <Tooltip formatter={(v: number, n: string) => [`${v.toFixed(2)} kW`, n]} contentStyle={{ fontSize: 12 }} />
            {ZONES.map((z, i) => (
              <Area key={z.id} type="monotone" dataKey={z.id} name={z.label.split("(")[0].trim()}
                stackId="1" stroke={z.color} fill={z.color} fillOpacity={0.55} isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {ZONES.map((z) => (
            <div key={z.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm" style={{ background: z.color }} />
              {z.label.split("(")[0].trim()}
            </div>
          ))}
        </div>
      </div>

      {/* Zone Cards */}
      <div>
        <h2 className="font-semibold text-base mb-3">Zone Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ZONES.map((z) => {
            const sim = zoneSims[z.id];
            const kw  = sim.currentKw;
            const isBurst = sim.burstRemaining > 0;
            const pct = Math.min(100, (kw / (baseKw(z.id, new Date().getHours(), new Date().getMinutes()) * 2 || 1)) * 100);
            return (
              <div key={z.id} className="rounded-xl border bg-white p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{z.label}</p>
                    <p className="text-[10px] text-muted-foreground">{z.description}</p>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-2 shrink-0"
                    style={{ background: isBurst ? "#fef3c7" : z.dim, color: isBurst ? "#b45309" : z.color }}>
                    {isBurst ? "SURGE" : "LIVE"}
                  </span>
                </div>

                {/* Sparkline */}
                <div className="h-12">
                  <LineChart width={140} height={48} data={sim.sparkline.map((v, i) => ({ i, v }))}>
                    <Line type="monotone" dataKey="v" stroke={z.color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  </LineChart>
                </div>

                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>
                    <p className="text-muted-foreground">Now</p>
                    <p className="font-semibold" style={{ color: z.color }}>{kw.toFixed(2)} kW</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peak</p>
                    <p className="font-semibold">{sim.peakKw.toFixed(2)} kW</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: isBurst ? "#f59e0b" : z.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribution + Activity Log */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Donut */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold text-sm mb-1">Current Load Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Share of live draw by zone</p>
          <div className="flex items-center gap-4">
            <PieChart width={160} height={160}>
              <Pie data={donutData} cx={80} cy={80} innerRadius={45} outerRadius={70}
                paddingAngle={3} dataKey="value" isAnimationActive={false}>
                {donutData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              </Pie>
              <Tooltip formatter={(v: number, n: string) => [`${v.toFixed(2)} kW`, n]} />
            </PieChart>
            <div className="flex-1 space-y-1.5">
              {donutData.map((d) => {
                const pct = totalKw > 0 ? ((d.value / totalKw) * 100).toFixed(0) : "0";
                return (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="font-medium tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold text-sm mb-1">Activity Log</h3>
          <p className="text-xs text-muted-foreground mb-4">Detected load spikes — latest first</p>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Monitoring… surges will appear here</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">{ev.zone}</span>
                    <span className="text-muted-foreground"> · {ev.msg} ({ev.kw.toFixed(1)} kW)</span>
                    <p className="text-[10px] text-slate-400">{ev.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DB Live Trend ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <div>
            <h2 className="font-semibold text-base">Database Expense Trend</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Auto-logged batches from DB · refreshes every 15 s · last {elecBatches.length} records</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total logged</p>
              <p className="text-sm font-bold text-amber-700">RM {totalElecDbCost.toFixed(4)}</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${lastElecBatch ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
              <span className={`w-2 h-2 rounded-full ${lastElecBatch ? "bg-amber-400 animate-pulse" : "bg-gray-300"}`} />
              {lastElecBatch ? "Receiving" : "Waiting"}
            </div>
          </div>
        </div>

        {elecBatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-sm text-muted-foreground gap-2">
            <Zap className="w-6 h-6 text-gray-200" />
            Batches will appear here as the sensor logs consumption
          </div>
        ) : (
          <div className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={elecBatches} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }}
                  label={{ value: "RM", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip formatter={(v: any) => [`RM ${Number(v).toFixed(5)}`, "Cost"]}
                  labelFormatter={(l, p) => `${l} · ${p[0]?.payload?.time ?? ""}`}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="cost" name="Cost (RM)" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-6 mt-2 px-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{(allExpenses as any[]).filter((e: any) => e.vendor === "TNB (Tenaga Nasional Berhad)").length}</span> total batches logged
              </p>
              {lastElecBatch && (
                <p className="text-xs text-muted-foreground">
                  Last: <span className="font-semibold text-foreground">{lastElecBatch.notes ?? lastElecBatch.expenseDate}</span>
                </p>
              )}
              <p className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
                DB sync: {elecUpdatedAt ? new Date(elecUpdatedAt).toLocaleTimeString("en-MY", { hour12: false }) : "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Config Footer */}
      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-amber-700 mb-2 uppercase tracking-wide text-[10px]">Sensor Configuration</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <span><b>Supplier:</b> Tenaga Nasional Berhad (TNB)</span>
          <span><b>Tariff Tier 1:</b> RM 0.218/kWh (first 200 kWh)</span>
          <span><b>Tariff Tier 2:</b> RM 0.334/kWh (next 300 kWh)</span>
          <span><b>Tariff Tier 3:</b> RM 0.509/kWh (above 500 kWh)</span>
          <span><b>Sample Rate:</b> 1 Hz (every second)</span>
          <span><b>Auto-log Trigger:</b> Every 1 kWh consumed</span>
          <span><b>Zones:</b> 6 monitored circuits</span>
          <span><b>Tier now:</b> <span style={{ color: tier.color, fontWeight: 600 }}>{tier.label}</span></span>
        </div>
      </div>
    </div>
  );
}
