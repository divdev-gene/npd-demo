"use client"

import { useState, useEffect } from "react"
import { useNPDs } from "@/lib/npdContext"
import { Badge } from "@/components/ui/badge"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell,
} from "recharts"
import {
  Send, FileText, UserCheck, Package, Calendar, ClipboardCheck,
  AlertTriangle, AlertCircle, Layers, Star, Clock, CheckCircle2,
  TrendingUp, FlaskConical, IndianRupee, ArrowRight,
} from "lucide-react"
import {
  ENQUIRY_SENT_KEY, LIVE_QUOTATIONS_KEY, VENDOR_QUOTE_APPROVALS_KEY,
  VENDOR_STATUS_KEY, type VendorStatusResponse,
} from "@/lib/mockData"

// ── Constants ──────────────────────────────────────────────────────────────
const STAGE_LABELS = [
  "Request Initiation", "R&D Internal Review", "NPD Sourcing Allocation",
  "Supplier Defense", "Sample Submission", "Sample Receipt / MRN",
  "R&D Evaluation", "FPA (First Part Approval)", "Sample Cost Finalization", "PP Lot Pricing",
]

const STAGE_SHORT = [
  "Request Init.", "R&D Review", "Sourcing Alloc.", "Supplier Defense",
  "Sample Submit", "MRN Receipt", "R&D Evaluation", "FPA", "Sample Cost", "PP Lot Pricing",
]

const STAGE_PHASES = [
  { name: "Initiation",     color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", stages: [1, 2] },
  { name: "Sourcing",       color: "#2563eb", bg: "#dbeafe", border: "#bfdbfe", stages: [3, 4, 5] },
  { name: "Quality & FPA",  color: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe", stages: [6, 7, 8] },
  { name: "Finalization",   color: "#059669", bg: "#d1fae5", border: "#a7f3d0", stages: [9, 10] },
]

const STAGE_COLORS = [
  "#6366f1","#818cf8","#2563eb","#3b82f6","#60a5fa",
  "#7c3aed","#8b5cf6","#a78bfa","#059669","#34d399",
]

const TAT_COLORS: Record<string, string> = {
  green: "#10b981", amber: "#f59e0b", red: "#ef4444", black: "#0f172a",
}

const SUPPLIER_HEATMAP = [
  { name: "Shenzhen Optoelectronics", composite: 8.5, rejects: 2,  npds: 14, tatCompliance: 92  },
  { name: "Cords India",              composite: 9.1, rejects: 0,  npds: 8,  tatCompliance: 100 },
  { name: "SealTech",                 composite: 7.2, rejects: 5,  npds: 22, tatCompliance: 78  },
  { name: "Tubetech India",           composite: 5.8, rejects: 12, npds: 19, tatCompliance: 55  },
]

const REJECTION_PARETO = [
  { code: "DIM-01: Dimension Mismatch", count: 48 },
  { code: "MAT-08: Material Grade",     count: 22 },
  { code: "DOC-03: Missing Test Cert",  count: 14 },
  { code: "PKG-01: Transit Damage",     count: 5  },
]

const SITE_TAT_AVG = [
  { site: "Rajpura A",      avgTAT: 28 },
  { site: "Rajpura Comm",   avgTAT: 34 },
  { site: "Jhajjhar",       avgTAT: 22 },
  { site: "Sricity",        avgTAT: 45 },
  { site: "Air Purifier",   avgTAT: 18 },
  { site: "Water Purifier", avgTAT: 25 },
]

const SPOCS = [
  { id: 1, name: "Rahul Sharma", initials: "RS", vertical: "Commodity",  npds: 12, breached: 1, red: 2 },
  { id: 2, name: "Priya Rajan",  initials: "PR", vertical: "Electrical", npds: 8,  breached: 0, red: 0 },
  { id: 3, name: "Aditi Verma",  initials: "AV", vertical: "Compliance", npds: 15, breached: 3, red: 4 },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function PanelHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      {right && <span className="text-[10px] font-medium text-slate-500">{right}</span>}
    </div>
  )
}

function TATDot({ health, size = 6 }: { health: string; size?: number }) {
  return <div style={{ width: size, height: size, backgroundColor: TAT_COLORS[health], borderRadius: "50%" }} />
}

// ── Stage Legend ───────────────────────────────────────────────────────────
function StageLegend({ stageCounts }: { stageCounts: number[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
      <PanelHeader
        title="NPD Stage Reference"
        right={<span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">LIVE COUNTS</span>}
      />
      <div className="px-3 pt-3 pb-2 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {STAGE_PHASES.map((phase, pi) => (
            <div key={pi} className="flex flex-col" style={{ marginRight: pi < STAGE_PHASES.length - 1 ? 8 : 0 }}>
              {/* Phase label */}
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <div className="h-px flex-1" style={{ backgroundColor: phase.color, opacity: 0.4 }} />
                <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap"
                  style={{ color: phase.color }}>
                  {phase.name}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: phase.color, opacity: 0.4 }} />
              </div>
              {/* Stage pills */}
              <div className="flex gap-1.5">
                {phase.stages.map(sn => {
                  const count = stageCounts[sn - 1] ?? 0
                  return (
                    <div key={sn}
                      className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg border"
                      style={{ background: phase.bg, borderColor: phase.border, minWidth: 68 }}>
                      {/* Stage number circle */}
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                        style={{ backgroundColor: phase.color }}>
                        {sn}
                      </div>
                      {/* Stage name */}
                      <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: phase.color }}>
                        {STAGE_SHORT[sn - 1]}
                      </span>
                      {/* NPD count — separated below name */}
                      <span className="text-[10px] font-bold" style={{ color: count > 0 ? phase.color : "#cbd5e1" }}>
                        {count} NPD{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* TAT health legend */}
        <div className="flex items-center gap-5 mt-3 pt-2 border-t border-slate-100">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">TAT Health:</span>
          {Object.entries({ green: "On Track", amber: "At Risk", red: "Due Today", black: "Overdue" }).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <TATDot health={k} size={7} />
              <span className="text-[9px] font-semibold text-slate-500">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── KPI Components ─────────────────────────────────────────────────────────
function KPIGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-0.5">{label}</span>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

function KPICard({
  icon: Icon, label, value, sub, accent, alert, badge, rate,
}: {
  icon?: React.ElementType
  label: string
  value: string | number
  sub?: string
  accent: string
  alert?: boolean
  badge?: string
  rate?: number // 0-100 progress bar
}) {
  return (
    <div className={`bg-white border-l-[3px] border border-slate-200 p-3 min-w-[100px] shadow-sm flex flex-col gap-1 rounded-sm`}
      style={{ borderLeftColor: accent }}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{label}</span>
        {Icon && <Icon size={12} color={accent} strokeWidth={2.5} />}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-[22px] font-bold font-mono leading-none" style={{ color: alert ? accent : "#0f172a" }}>
          {value}
        </span>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mb-0.5"
            style={{ background: accent + "18", color: accent }}>
            {badge}
          </span>
        )}
      </div>
      {rate !== undefined && (
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: accent }} />
        </div>
      )}
      {sub && (
        <span className={`text-[9px] font-medium leading-tight ${alert ? "font-semibold" : "text-slate-400"}`}
          style={alert ? { color: accent } : {}}>
          {sub}
        </span>
      )}
    </div>
  )
}

function FunnelStrip({ steps }: {
  steps: { label: string; value: number; pct?: string; color: string }[]
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-3">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sourcing Funnel</span>
      <div className="flex items-center gap-0 mt-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1 px-3">
              <div className="text-[20px] font-bold font-mono leading-none" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="text-[9px] font-semibold text-slate-500 text-center leading-tight">{s.label}</div>
              {s.pct && (
                <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: s.color + "18", color: s.color }}>
                  {s.pct}
                </div>
              )}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight size={14} className="text-slate-300 shrink-0 mx-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Panel helpers ──────────────────────────────────────────────────────────
function TATHeatmap({ data }: { data: ReturnType<typeof useNPDs>["npds"] }) {
  const groups = STAGE_LABELS.map((label, i) => ({
    stage: i + 1, label,
    items: data.filter(d => d.stage === i + 1),
  })).filter(g => g.items.length > 0)

  if (groups.length === 0)
    return <div className="p-4 text-xs text-slate-400 italic">No active NPDs to display.</div>

  return (
    <div className="p-3 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {groups.map(g => (
          <div key={g.stage} className="w-20 min-w-[80px]">
            <div className="text-[9px] font-bold text-slate-500 mb-2 tracking-wide uppercase line-clamp-1" title={g.label}>
              S{g.stage} · {g.label.split(" ").slice(0, 2).join(" ")}
            </div>
            <div className="flex flex-col gap-1">
              {g.items.map(npd => (
                <div key={npd.id} title={`${npd.id} — ${npd.itemName}`}
                  className="h-6 rounded-sm px-1.5 flex items-center gap-1.5 cursor-pointer hover:opacity-80 border-l-[3px] shadow-sm"
                  style={{ backgroundColor: TAT_COLORS[npd.tatHealth] + "18", borderLeftColor: TAT_COLORS[npd.tatHealth] }}>
                  <TATDot health={npd.tatHealth} size={6} />
                  <span className="text-[9px] text-slate-800 font-mono font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                    {npd.id.split("-").slice(-1)[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BottleneckPanel({ data }: { data: { stage: string; count: number; avgDaysOver: number }[] }) {
  const max = data[0]?.count || 1
  return (
    <div className="p-3 space-y-2">
      {data.map((row, i) => (
        <div key={i}>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-600">{row.stage}</span>
            <span className="text-[10px] text-slate-900 font-mono font-bold">
              {row.count} NPD{row.count > 1 ? "s" : ""}
              {row.avgDaysOver > 0 && <span className="text-red-500 ml-1">+{row.avgDaysOver}d</span>}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
            <div className="h-full rounded-sm transition-all" style={{
              width: `${(row.count / max) * 100}%`,
              backgroundColor: i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#3b82f6",
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SupplierHeatmapPanel() {
  const scoreColor = (s: number) => s >= 8 ? "text-emerald-600" : s >= 6 ? "text-amber-600" : "text-red-600"
  const tatColor   = (t: number) => t >= 80 ? "text-emerald-600" : t >= 60 ? "text-amber-600" : "text-red-600"
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {["Supplier", "TQR Score", "Rejects", "Total NPDs", "TAT %"].map(h => (
              <th key={h} className={`py-1.5 px-3 font-semibold text-slate-500 uppercase tracking-widest ${h !== "Supplier" ? "text-center" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {SUPPLIER_HEATMAP.map((s, i) => (
            <tr key={i} className="hover:bg-slate-50/50">
              <td className="py-1.5 px-3 font-medium text-slate-900">{s.name}</td>
              <td className={`py-1.5 px-3 text-center font-mono font-bold ${scoreColor(s.composite)}`}>{s.composite.toFixed(1)}</td>
              <td className={`py-1.5 px-3 text-center font-mono font-semibold ${s.rejects > 0 ? "text-red-600" : "text-emerald-600"}`}>{s.rejects}</td>
              <td className="py-1.5 px-3 text-center text-slate-600 font-mono">{s.npds}</td>
              <td className={`py-1.5 px-3 text-center font-mono font-bold ${tatColor(s.tatCompliance)}`}>{s.tatCompliance}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RejectionPareto() {
  const max   = REJECTION_PARETO[0]?.count || 1
  const total = REJECTION_PARETO.reduce((a, b) => a + b.count, 0)
  let cum = 0
  return (
    <div className="p-3">
      {REJECTION_PARETO.map((row, i) => {
        cum += row.count
        const pct = Math.round((cum / total) * 100)
        return (
          <div key={i} className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-600">{row.code}</span>
              <span className="text-[10px] font-mono font-semibold">
                <span className="text-slate-900">{row.count}</span>
                <span className="text-slate-400 ml-1.5">{pct}%</span>
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-sm">
              <div className="h-full rounded-sm bg-red-500" style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function LeadDashboard() {
  const { npds } = useNPDs()
  const [locFilter,  setLocFilter]  = useState("All")
  const [vertFilter, setVertFilter] = useState("All")

  const [enquiriesSent,   setEnquiriesSent]   = useState(0)
  const [quotesReceived,  setQuotesReceived]  = useState(0)
  const [vendorsApproved, setVendorsApproved] = useState(0)
  const [mrnPending,      setMrnPending]      = useState(0)
  const [extPending,      setExtPending]      = useState(0)
  const [fpaDone,         setFpaDone]         = useState(0)
  const [costSaved,       setCostSaved]       = useState(0)

  useEffect(() => {
    try {
      const allSent: Record<string, string[]> = JSON.parse(localStorage.getItem(ENQUIRY_SENT_KEY) || "{}")
      setEnquiriesSent(Object.keys(allSent).length)

      const allLive: Record<string, Record<string, unknown>> = JSON.parse(localStorage.getItem(LIVE_QUOTATIONS_KEY) || "{}")
      let qc = 0; for (const v of Object.values(allLive)) qc += Object.keys(v).length
      setQuotesReceived(qc)

      const allAppr: Record<string, Record<string, string>> = JSON.parse(localStorage.getItem(VENDOR_QUOTE_APPROVALS_KEY) || "{}")
      let ac = 0; for (const v of Object.values(allAppr)) ac += Object.values(v).filter(x => x === "approved").length
      setVendorsApproved(ac)

      const allMRN:   Record<string, any>    = JSON.parse(localStorage.getItem("sample_receipt_v1") || "{}")
      const allMAppr: Record<string, string> = JSON.parse(localStorage.getItem("mrn_approval_v1")   || "{}")
      const keys = Object.values(allMRN).map((v: any) => v?.mrnNumber).filter(Boolean) as string[]
      setMrnPending(keys.filter(k => !allMAppr[k]).length)

      const allStatus: Record<string, Record<string, VendorStatusResponse>> = JSON.parse(localStorage.getItem(VENDOR_STATUS_KEY) || "{}")
      const allDateA:  Record<string, Record<string, string>>                = JSON.parse(localStorage.getItem("vendor_date_approval_v1") || "{}")
      let ec = 0
      for (const [nId, vs] of Object.entries(allStatus))
        for (const [vn, r] of Object.entries(vs))
          if (!r.onTime && r.newDate && !allDateA[nId]?.[vn]) ec++
      setExtPending(ec)

      setFpaDone(Object.keys(JSON.parse(localStorage.getItem("fpa_data_v1") || "{}")).length)
      setCostSaved(Object.keys(JSON.parse(localStorage.getItem("sample_cost_v1") || "{}")).length)
    } catch {}
  }, [npds])

  const filtered    = locFilter === "All" ? npds : npds.filter(n => n.rAndDDivision === locFilter)
  const filteredNPDs = vertFilter === "All" ? filtered : filtered.filter(n =>
    n.itemCategory.includes(vertFilter) || n.typeOfWork.includes(vertFilter))

  // Derived live KPIs
  const totalActive    = npds.length
  const overdue        = npds.filter(n => n.tatHealth === "black").length
  const atRisk         = npds.filter(n => n.tatHealth === "amber" || n.tatHealth === "red").length
  const onTrack        = npds.filter(n => n.tatHealth === "green").length
  const tatCompliance  = totalActive > 0 ? Math.round((onTrack / totalActive) * 100) : 0
  const completed      = npds.filter(n => n.stage >= 10).length
  const gradeA         = npds.filter(n => n.gradeA).length
  const critical       = npds.filter(n => n.priority === "Critical").length
  const inSourcing     = npds.filter(n => n.stage >= 3 && n.stage <= 5).length
  const inTesting      = npds.filter(n => n.stage === 7).length
  const completionRate = totalActive > 0 ? Math.round((completed / totalActive) * 100) : 0
  const enquiryConv    = enquiriesSent  > 0 ? Math.round((quotesReceived / enquiriesSent)  * 100) : 0
  const approvalConv   = quotesReceived > 0 ? Math.round((vendorsApproved / quotesReceived) * 100) : 0
  const escalationList = npds.filter(n => n.tatHealth === "black")
  const stageCounts    = STAGE_LABELS.map((_, i) => npds.filter(n => n.stage === i + 1).length)

  const stageDistData  = STAGE_LABELS.map((label, i) => ({
    stage: `S${i + 1}`, label: label.split(" ").slice(0, 3).join(" "),
    count: npds.filter(n => n.stage === i + 1).length,
  })).filter(d => d.count > 0)

  const bottleneckData = STAGE_LABELS
    .map((label, i) => ({ stage: `S${i + 1}: ${label.split(" ").slice(0, 2).join(" ")}`, count: npds.filter(n => n.stage === i + 1).length, avgDaysOver: 0 }))
    .filter(d => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)

  const tatPendencyData = STAGE_LABELS.map((_, i) => ({
    stage: `S${i + 1}`,
    pending: npds.filter(n => n.stage === i + 1).length,
    tatAvg: [2, 5, 3, 8, 12, 4, 6, 5, 3, 2][i] ?? 3,
  }))

  return (
    <div className="max-w-[1600px] mx-auto p-4 flex flex-col gap-4 overflow-y-auto">

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex gap-1.5 items-center flex-wrap">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">Location:</span>
          {["All","Rajpura Grade A","Rajpura Commercial","Jhajjhar RAC","Sricity RAC","Air Purifier Division","Water Purifier Division"].map(v => (
            <button key={v} onClick={() => setLocFilter(v)}
              className={`px-2.5 py-1 rounded-sm text-[10px] font-semibold border transition-colors ${
                locFilter === v ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}>{v}</button>
          ))}
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">Vertical:</span>
          {["All","Commodity","Electrical","Compliance","Packaging"].map(v => (
            <button key={v} onClick={() => setVertFilter(v)}
              className={`px-2.5 py-1 rounded-sm text-[10px] font-semibold border transition-colors ${
                vertFilter === v ? "bg-slate-200 text-slate-800 border-slate-300" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}>{v}</button>
          ))}
        </div>
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Live stage distribution */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 h-64 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Stage Distribution</h3>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">LIVE</span>
          </div>
          {stageDistData.length === 0
            ? <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400">No data yet</div>
            : (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageDistData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ fontSize: "11px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      formatter={(v, _, e: any) => [(v ?? 0) + " NPDs", e?.payload?.label ?? ""]} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={18}>
                      {stageDistData.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
        </div>

        {/* TAT vs Pendency */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 h-64 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">TAT vs Pendency (by Stage)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tatPendencyData.filter(d => d.pending > 0)} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left"  tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ fontSize: "11px", borderRadius: "4px", border: "1px solid #e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar yAxisId="left" dataKey="pending" name="Pending" fill="#3b82f6" radius={[2,2,0,0]} barSize={14} />
                <Line yAxisId="right" dataKey="tatAvg" name="Avg TAT (d)" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Site-wise TAT */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 h-64 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Site-wise Avg TAT (Days)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SITE_TAT_AVG} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="site" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ fontSize: "11px", borderRadius: "4px", border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="avgTAT" name="Avg TAT" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Stage Legend ─────────────────────────────────────────────────── */}
      <StageLegend stageCounts={stageCounts} />

      {/* ── TAT Heatmap ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <PanelHeader title="TAT Heatmap — Active NPDs by Stage" right={
          <div className="flex gap-1">
            {["All","Commodity","Electrical","Compliance","Packaging"].map(v => (
              <button key={v} onClick={() => setVertFilter(v)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${
                  vertFilter === v ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-100"
                }`}>{v}</button>
            ))}
          </div>
        } />
        <TATHeatmap data={filteredNPDs} />
      </div>

      {/* ── KPI Dashboard ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">

        {/* Row 1: Pipeline overview */}
        <KPIGroup label="Pipeline Overview">
          <KPICard icon={Layers}       label="Total Active"   value={totalActive}           accent="#0f172a" sub={`${inSourcing} in sourcing`} rate={completionRate} />
          <KPICard icon={CheckCircle2} label="Completed"      value={completed}             accent="#059669" sub={`${completionRate}% completion rate`} rate={completionRate} />
          <KPICard icon={Star}         label="Grade A NPDs"   value={gradeA}                accent="#7c3aed" sub="priority tracked" />
          <KPICard icon={AlertTriangle}label="Critical"       value={critical}              accent="#dc2626" sub="high-urgency requests" alert={critical > 0} />
          <KPICard icon={Clock}        label="TAT Compliance" value={`${tatCompliance}%`}   accent="#10b981" sub={`${onTrack} of ${totalActive} on track`} rate={tatCompliance} />
          <KPICard icon={FlaskConical} label="In R&D Eval"    value={inTesting}             accent="#8b5cf6" sub="Stage 7 active" />
        </KPIGroup>

        {/* Row 2: Sourcing funnel + actions */}
        <div className="flex gap-2 flex-wrap">
          <FunnelStrip steps={[
            { label: "Enquiries Sent",   value: enquiriesSent,   color: "#2563eb" },
            { label: "Quotes Received",  value: quotesReceived,  color: "#7c3aed", pct: `${enquiryConv}% response` },
            { label: "Vendors Approved", value: vendorsApproved, color: "#059669", pct: `${approvalConv}% approval`  },
          ]} />
          <KPIGroup label="Approvals &amp; Quality">
            <KPICard icon={Package}        label="MRNs Pending"   value={mrnPending}  accent="#f59e0b" sub="awaiting R&D Head" alert={mrnPending > 0} />
            <KPICard icon={Calendar}       label="Ext. Requests"  value={extPending}  accent="#f97316" sub="dispatch extensions" alert={extPending > 0} />
            <KPICard icon={ClipboardCheck} label="FPA Done"       value={fpaDone}     accent="#8b5cf6" sub="first-part approvals" />
            <KPICard icon={IndianRupee}    label="Cost Finalised" value={costSaved}   accent="#0891b2" sub="sample costs saved" />
          </KPIGroup>
          <KPIGroup label="TAT Risk">
            <KPICard icon={AlertTriangle}  label="Overdue"        value={overdue}     accent="#dc2626" sub="TAT breached" alert={overdue > 0} />
            <KPICard icon={AlertCircle}    label="At Risk"        value={atRisk}      accent="#f59e0b" sub="amber / red TAT" alert={atRisk > 0} />
            <KPICard icon={TrendingUp}     label="On Track"       value={onTrack}     accent="#10b981" sub="green TAT status" rate={tatCompliance} />
          </KPIGroup>
        </div>
      </div>

      {/* ── Middle Row ───────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader title="Stage Bottleneck Analysis" right="live" />
          {bottleneckData.length > 0
            ? <BottleneckPanel data={bottleneckData} />
            : <div className="p-4 text-[10px] text-slate-400 italic">No bottlenecks — all stages clear.</div>}
        </div>
        <div className="flex-[1.5] bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader title="Supplier Performance Heatmap" right="TQR composite · 90d" />
          <SupplierHeatmapPanel />
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader title="Rejection Root-Cause Pareto" right="89 total" />
          <RejectionPareto />
        </div>
        <div className="flex-[2] bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader title="Escalation Queue"
            right={<span className={escalationList.length > 0 ? "text-red-600" : "text-slate-400"}>{escalationList.length} overdue</span>} />
          <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {escalationList.length === 0
              ? <div className="p-3 text-[10px] text-slate-400">No active escalations</div>
              : escalationList.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                  <TATDot health="black" size={8} />
                  <span className="font-mono text-[10px] font-bold text-blue-700 min-w-[100px]">{e.id}</span>
                  <span className="text-[11px] font-semibold text-slate-800 flex-1 truncate">{e.itemName}</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-1 h-4 uppercase">{e.productLine}</Badge>
                  <span className="font-mono text-[10px] font-bold text-red-600 w-24 text-right">+{-e.tatDaysRemaining}d overdue</span>
                  <button className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase hover:bg-red-100 transition-colors">Escalate</button>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ── SPOC Compliance ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden mb-4">
        <PanelHeader title="45-Day Sample Compliance by Vertical" />
        <div className="flex gap-4 p-3 overflow-x-auto">
          {SPOCS.map(sp => {
            const pct = Math.round(((sp.npds - sp.breached - sp.red) / sp.npds) * 100)
            return (
              <div key={sp.id} className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-sm min-w-[160px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">{sp.initials}</div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900">{sp.name}</div>
                    <div className="text-[9px] font-semibold text-slate-500 uppercase">{sp.vertical}</div>
                  </div>
                </div>
                <div className={`text-3xl font-mono font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-500" : "text-red-500"}`}>{pct}%</div>
                <div className="h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <div className="text-[9px] font-medium text-slate-500 mt-1.5 uppercase tracking-wider">
                  {sp.npds} Active ·{" "}
                  {sp.breached > 0 ? <span className="text-red-500 font-bold">{sp.breached} Breached</span> : "0 Breached"}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
