import { useState, useRef, useEffect } from "react";
import {
  MessageCircle, Database, Download, Loader2, Send,
  Zap, Droplets, Users, DollarSign, ChevronDown, ChevronUp,
  FileText, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = "user" | "assistant";
type Msg  = { role: Role; content: string; ts?: Date };

// ─── Suggested prompts ────────────────────────────────────────────────────────
const PROMPTS = [
  "Which uses more budget — water or electricity?",
  "Summarise teacher performance this term",
  "Which zone / source consumes the most resources?",
  "Give me 3 cost-reduction recommendations",
  "Compare water and electricity expenses in detail",
  "Who are the top 5 performing teachers and why?",
];

// ─── Analytics badge helpers ──────────────────────────────────────────────────
function n(v: unknown) { return parseFloat(String(v ?? "0")); }

export default function AmiraAI() {
  const [messages,    setMessages]    = useState<Msg[]>([{
    role: "assistant",
    content: "Hi! I'm **Amira**, your AI assistant for Smart School Management. I have live access to your school database — water usage, electricity consumption, teacher performance, expenses, and more.\n\nAsk me anything, or click **Export PPT** to generate a full report presentation.",
    ts: new Date(),
  }]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [scanOpen,    setScanOpen]    = useState(false);
  const [pptLoading,  setPptLoading]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const askMutation    = trpc.amira.askAmira.useMutation();
  const exportMutation = trpc.amira.exportReport.useMutation();
  const { data: analytics, refetch: refetchAnalytics } = trpc.amira.getAnalytics.useQuery(undefined, { refetchOnWindowFocus: false });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ─── Send message ───────────────────────────────────────────────────────────
  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: trimmed, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build conversation history (all prior turns) for context
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await askMutation.mutateAsync({ question: trimmed, history });
      setMessages((prev) => [...prev, { role: "assistant", content: res.response, ts: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please check your DeepSeek API key and try again.",
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Export PPT ─────────────────────────────────────────────────────────────
  const handleExportPPT = async () => {
    setPptLoading(true);
    try {
      // Find last Amira response to use as AI insights
      const lastReply = [...messages].reverse().find((m) => m.role === "assistant")?.content;

      const res = await exportMutation.mutateAsync({
        title:     "Resource & Performance Report",
        aiSummary: lastReply,
      });

      // Decode base64 → Blob → download
      const binary  = atob(res.pptxBase64);
      const bytes   = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob    = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
      const url     = URL.createObjectURL(blob);
      const a       = document.createElement("a");
      a.href        = url;
      a.download    = res.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${res.filename}`);
    } catch (e) {
      console.error(e);
      toast.error("PPT generation failed — check server logs");
    } finally {
      setPptLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-indigo-500" />
            Amira AI
          </h1>
          <p className="text-muted-foreground text-sm">
            Powered by DeepSeek · live database access · PPT export
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setScanOpen((v) => !v); refetchAnalytics(); }}
            className="gap-1.5">
            <Database className="w-4 h-4" />
            {scanOpen ? "Hide" : "Scan"} Database
          </Button>
          <Button size="sm" onClick={handleExportPPT} disabled={pptLoading}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
            {pptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PPT
          </Button>
        </div>
      </div>

      {/* Database Scan Panel */}
      {scanOpen && (
        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-blue-50/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              Live Database Snapshot — what Amira can see
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!analytics ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Teachers */}
                <div className="rounded-lg bg-white border p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    <Users className="w-3.5 h-3.5" /> Teachers
                  </div>
                  <p className="text-xl font-bold">{analytics.teachers?.totalTeachers ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Avg {n(analytics.teachers?.avgPerformance).toFixed(2)}/5 rating · {n(analytics.teachers?.avgAttendance).toFixed(1)}% attendance</p>
                </div>
                {/* Expenses */}
                <div className="rounded-lg bg-white border p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                    <DollarSign className="w-3.5 h-3.5" /> Expenses
                  </div>
                  <p className="text-xl font-bold">RM {analytics.expensesByCategory.reduce((s, e) => s + n(e.total), 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{analytics.expensesByCategory.length} categories · {analytics.expensesByCategory.reduce((s, e) => s + e.count, 0)} entries</p>
                </div>
                {/* Water */}
                <div className="rounded-lg bg-white border p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 uppercase tracking-wide">
                    <Droplets className="w-3.5 h-3.5" /> Water Batches
                  </div>
                  <p className="text-xl font-bold">{analytics.waterExpenses.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Total RM {analytics.waterExpenses.reduce((s, e) => s + n(e.amount), 0).toFixed(4)} · SAJ tariff
                  </p>
                </div>
                {/* Electricity */}
                <div className="rounded-lg bg-white border p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wide">
                    <Zap className="w-3.5 h-3.5" /> Electric Batches
                  </div>
                  <p className="text-xl font-bold">{analytics.electricExpenses.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Total RM {analytics.electricExpenses.reduce((s, e) => s + n(e.amount), 0).toFixed(4)} · TNB tariff
                  </p>
                </div>

                {/* Category breakdown */}
                <div className="rounded-lg bg-white border p-3 col-span-full">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Expense Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {analytics.expensesByCategory.map((e) => (
                      <span key={e.category ?? "—"} className="px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-700">
                        {e.category ?? "—"}: <b>RM {n(e.total).toFixed(2)}</b> ({e.count} entries)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Top teachers */}
                <div className="rounded-lg bg-white border p-3 col-span-full">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top 5 Teachers by Performance</p>
                  <div className="flex flex-wrap gap-2">
                    {analytics.topTeachers.map((t, i) => (
                      <span key={t.name} className="px-2 py-1 rounded-full bg-indigo-50 text-xs text-indigo-800">
                        #{i + 1} {t.name} · {n(t.performanceRating).toFixed(2)}/5
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chat window */}
      <Card className="flex flex-col" style={{ height: "clamp(420px, 60vh, 640px)" }}>
        <CardHeader className="border-b py-3 px-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-indigo-500" />
                Chat with Amira
              </CardTitle>
              <CardDescription className="text-xs">
                Ask about water usage, electricity, teachers, expenses…
              </CardDescription>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              DeepSeek connected
            </span>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-slate-50 border text-slate-800 rounded-tl-sm"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
                {msg.ts && (
                  <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-indigo-200" : "text-slate-400"}`}>
                    {msg.ts.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mr-2 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="bg-slate-50 border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Amira is thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardContent>

        {/* Suggested prompts */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button key={p} onClick={() => send(p)}
                className="px-3 py-1.5 rounded-full border text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t px-4 py-3 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about water, electricity, teachers, expenses…"
              disabled={loading}
              className="flex-1 rounded-xl border bg-slate-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon"
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>

      {/* Export PPT info card */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-indigo-100 p-3 shrink-0">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Export as PowerPoint</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Generates a 7-slide report: Cover · Dashboard Overview · Water Usage · Electricity Usage · Expense Breakdown · Teacher Performance · AI Insights — populated with real data from your school database.
              </p>
              <Button size="sm" onClick={handleExportPPT} disabled={pptLoading}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                {pptLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {pptLoading ? "Generating…" : "Generate & Download PPT"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
