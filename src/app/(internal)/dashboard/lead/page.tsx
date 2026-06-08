"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useNPDs } from "@/lib/npdContext"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer, Cell,
} from "recharts"
import {
  Package, Calendar, ClipboardCheck,
  AlertTriangle, AlertCircle, Layers, Star, Clock, CheckCircle2,
  FlaskConical, IndianRupee, ArrowRight, Zap,
  Users, Timer, Hourglass, ThumbsUp,
} from "lucide-react"
import {
  ENQUIRY_SENT_KEY, LIVE_QUOTATIONS_KEY, VENDOR_QUOTE_APPROVALS_KEY,
  VENDOR_STATUS_KEY, VENDOR_DATE_APPROVAL_KEY,
  type VendorStatusResponse,
} from "@/lib/mockData"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ── Constants ──────────────────────────────────────────────────────────────
const STAGE_SHORT = [
  "Request Init", "Sourcing", "Dispatch",
  "Design & Feasibility", "Testing & TQR", "RND Approval", "PP Pricing", "Closure",
]
const PHASE_DEFS = [
  { name: "Sourcing",   color: "#2563eb", stages: [2, 3] },
  { name: "R&D",        color: "#7c3aed", stages: [4, 5, 6] },
  { name: "Closure",    color: "#059669", stages: [7, 8] },
]
const STAGE_ACCENT = [
  "#6366f1","#2563eb","#3b82f6","#7c3aed","#8b5cf6","#a78bfa","#059669","#34d399",
]
const TAT_COLORS: Record<string, string> = {
  green: "#10b981", amber: "#f59e0b", red: "#ef4444", black: "#dc2626",
}
const TAT_LABELS: Record<string, string> = {
  green: "On Track", amber: "At Risk", red: "Due Today", black: "Overdue",
}
const DATE_PRESETS = ["All Time", "Last 7d", "Last 30d", "Last 90d", "This FY"] as const
type DatePreset = typeof DATE_PRESETS[number]

const ALL_SITES = [
  "All",
  "Rajpura Grade A", "Rajpura Commercial", "Rajpura RAC",
  "Jhajjhar RAC",
  "Sricity RAC",
  "Air Purifier Division", "Water Purifier Division",
]
const ALL_VERTICALS = [
  "All",
  "Plastics", "Sheet Metal", "Electronics & Electrical",
  "Compressors & Motors", "Packaging & Others", "Others",
]
const ALL_FY = ["All", "FY26", "FY25", "FY24"]

// ── Helpers ────────────────────────────────────────────────────────────────
const pct  = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
const p75  = (arr: number[]) => {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(0.75 * (s.length - 1))]
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.16em] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

function FilterSelect({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.16em] shrink-0">{label}</span>
      <Select value={value} onValueChange={(v: string | null) => { if (v) onChange(v) }}>
        <SelectTrigger className="h-7 text-[11px] w-auto min-w-[120px] max-w-[200px] bg-white border-slate-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="bottom" alignItemWithTrigger={false}>
          {options.map(o => <SelectItem key={o} value={o} className="text-[11px]">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, sub, accent, alert, rate }: {
  icon?: React.ElementType; label: string; value: string | number
  sub?: string; accent: string; alert?: boolean; rate?: number
}) {
  return (
    <div className="flex flex-col gap-1.5 border-l-[3px] px-3 py-2.5 rounded-sm bg-white shadow-sm"
      style={{ borderLeftColor: accent, border: `1px solid ${accent}22`, borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</span>
        {Icon && <Icon size={11} style={{ color: accent }} strokeWidth={2.5} />}
      </div>
      <span className="text-[22px] font-bold font-mono leading-none" style={{ color: alert ? accent : "#0f172a" }}>
        {value}
      </span>
      {rate !== undefined && (
        <div className="h-0.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: accent }} />
        </div>
      )}
      {sub && <span className="text-[9px] font-medium text-slate-400 leading-tight">{sub}</span>}
    </div>
  )
}

function FunnelStrip({ steps }: {
  steps: { label: string; value: number; pct?: string; color: string }[]
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-sm bg-white shadow-sm"
            style={{ border: `1px solid ${s.color}22` }}>
            <span className="text-[20px] font-bold font-mono leading-none" style={{ color: s.color }}>{s.value}</span>
            <span className="text-[9px] font-semibold text-slate-400 text-center leading-tight max-w-[80px]">{s.label}</span>
            {s.pct && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5"
                style={{ background: s.color + "15", color: s.color }}>{s.pct}</span>
            )}
          </div>
          {i < steps.length - 1 && <ArrowRight size={12} className="text-slate-300 shrink-0" />}
        </div>
      ))}
    </div>
  )
}

function TATDot({ health, size = 6 }: { health: string; size?: number }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: TAT_COLORS[health] ?? "#94a3b8", flexShrink: 0 }} />
}

function PanelCard({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid #f1f5f9" }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100" style={{ background: "#FAFAFA" }}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">{title}</span>
        {right && <span className="text-[10px] text-slate-400">{right}</span>}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex items-center justify-center py-10 text-[11px] text-slate-300 italic">{label}</div>
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function LeadDashboard() {
  const { npds } = useNPDs()

  const [currentRole, setCurrentRole] = useState("rnd_user")
  const [locFilter,    setLocFilter]    = useState("All")
  const [vertFilter,   setVertFilter]   = useState("All")
  const [fyFilter,     setFyFilter]     = useState("All")
  const [datePreset,   setDatePreset]   = useState<DatePreset>("All Time")
  const [enquiriesSent,   setEnquiriesSent]   = useState(0)
  const [quotesReceived,  setQuotesReceived]  = useState(0)
  const [vendorsApproved, setVendorsApproved] = useState(0)
  const [mrnPending,      setMrnPending]      = useState(0)
  const [extPending,      setExtPending]      = useState(0)
  const [fpaDone,         setFpaDone]         = useState(0)
  const [costSaved,       setCostSaved]       = useState(0)

  const refreshCounters = () => {
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
      const mrnKeys = Object.values(allMRN).map((v: any) => v?.mrnNumber).filter(Boolean) as string[]
      setMrnPending(mrnKeys.filter(k => !allMAppr[k]).length)

      const allStatus: Record<string, Record<string, VendorStatusResponse>> = JSON.parse(localStorage.getItem(VENDOR_STATUS_KEY) || "{}")
      const allDateA:  Record<string, Record<string, any>>                   = JSON.parse(localStorage.getItem(VENDOR_DATE_APPROVAL_KEY) || "{}")
      let ec = 0
      for (const [nId, vs] of Object.entries(allStatus))
        for (const [vn, r] of Object.entries(vs))
          if (!r.onTime && r.newDate && !allDateA[nId]?.[vn]) ec++
      setExtPending(ec)

      setFpaDone(Object.keys(JSON.parse(localStorage.getItem("fpa_data_v1") || "{}")).length)
      setCostSaved(Object.keys(JSON.parse(localStorage.getItem("sample_cost_v1") || "{}")).length)

    } catch {}
  }

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") || "rnd_user")
    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener("rolechange", onRoleChange as EventListener)
    return () => window.removeEventListener("rolechange", onRoleChange as EventListener)
  }, [])

  useEffect(() => { refreshCounters() }, [npds])

  useEffect(() => {
    const id = setInterval(() => refreshCounters(), 2000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handler = () => refreshCounters()
    window.addEventListener("storage", handler)
    window.addEventListener("npd_updated", handler)
    return () => { window.removeEventListener("storage", handler); window.removeEventListener("npd_updated", handler) }
  }, [])

  const filtered = useMemo(() => {
    let base = npds.filter(n => {
      if (n.parentId) return false // hide child records from all views
      if (!n.typeOfWork.includes("Alternative Supplier")) return true
      const isDqa = currentRole === "dqa_engineer" || currentRole === "dqa_lead"
      return currentRole.startsWith("rnd") || currentRole === "super_admin" || isDqa || n.raisedBy === currentRole
    })
    if (locFilter !== "All") base = base.filter(n => n.rAndDDivision === locFilter)
    if (vertFilter !== "All") base = base.filter(n => n.itemCategory === vertFilter)
    if (fyFilter !== "All") base = base.filter(n => n.id.includes(`NPD-FY-20${fyFilter.slice(2)}`))
    if (datePreset !== "All Time") {
      const now = Date.now()
      const cutoff =
        datePreset === "Last 7d"  ? now - 7  * 86400000 :
        datePreset === "Last 30d" ? now - 30 * 86400000 :
        datePreset === "Last 90d" ? now - 90 * 86400000 :
        /* This FY */ (() => {
          const today = new Date()
          const fyStart = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1)
          return fyStart.getTime()
        })()
      base = base.filter(n => n.createdAt ? new Date(n.createdAt).getTime() >= cutoff : true)
    }
    return base
  }, [npds, currentRole, locFilter, vertFilter, fyFilter, datePreset])

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const total        = filtered.length
  const overdue      = filtered.filter(n => n.tatHealth === "black").length
  const atRisk       = filtered.filter(n => n.tatHealth === "amber" || n.tatHealth === "red").length
  const onTrack      = filtered.filter(n => n.tatHealth === "green").length
  const tatComp      = pct(onTrack, total)
  const completed    = filtered.filter(n => n.stage >= 8).length
  const gradeA       = filtered.filter(n => n.gradeA).length
  const critical     = filtered.filter(n => n.priority === "Critical").length
  const inSourcing   = filtered.filter(n => n.stage >= 2 && n.stage <= 3).length
  const inRnd        = filtered.filter(n => n.stage >= 4 && n.stage <= 6).length
  const compRate     = pct(completed, total)
  const enquiryConv  = pct(quotesReceived,  enquiriesSent)
  const approvalConv = pct(vendorsApproved, quotesReceived)

  const activeAges  = filtered.filter(n => n.stage < 8).map(n => (n.totalTat ?? 90) - n.tatDaysRemaining).filter(a => a >= 0)
  const avgCycle    = activeAges.length ? Math.round(activeAges.reduce((s, a) => s + a, 0) / activeAges.length) : 0
  const agingP75Val = p75(activeAges)

  const rejectedQ = useMemo(() => {
    try {
      const all: Record<string, Record<string, string>> = JSON.parse(localStorage.getItem(VENDOR_QUOTE_APPROVALS_KEY) || "{}")
      let r = 0; for (const v of Object.values(all)) r += Object.values(v).filter(x => x === "rejected").length
      return r
    } catch { return 0 }
  }, [quotesReceived, vendorsApproved])
  const rejRate = pct(rejectedQ, quotesReceived)

  const stageDistData = STAGE_SHORT.slice(0, 7).map((label, i) => ({
    stage: `S${i + 1}`, label,
    count: filtered.filter(n => n.stage === i + 1).length,
  })).filter(d => d.count > 0)

  const bottleneckData = STAGE_SHORT
    .map((s, i) => ({ stage: `S${i + 1}: ${s}`, count: filtered.filter(n => n.stage === i + 1).length }))
    .filter((d, i) => d.count > 0 && i + 1 < 8).sort((a, b) => b.count - a.count).slice(0, 6)
  const bottleneckMax = bottleneckData[0]?.count || 1

  const siteData = useMemo(() => {
    const map: Record<string, number[]> = {}
    filtered.forEach(n => {
      if (!n.rAndDDivision) return
      if (!map[n.rAndDDivision]) map[n.rAndDDivision] = []
      map[n.rAndDDivision].push(n.tatDaysRemaining)
    })
    return Object.entries(map).map(([site, vals]) => ({
      site: site.split(" ").slice(0, 2).join(" "),
      avgTAT: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }))
  }, [filtered])

  const supplierData = useMemo(() => {
    const map: Record<string, { npds: number; issues: number }> = {}
    filtered.forEach(n => {
      if (!n.supplier || n.supplier === "Pending Assignment") return
      if (!map[n.supplier]) map[n.supplier] = { npds: 0, issues: 0 }
      map[n.supplier].npds++
      if (n.tatHealth === "black" || n.tatHealth === "red") map[n.supplier].issues++
    })
    return Object.entries(map)
      .map(([name, d]) => ({ name, npds: d.npds, issues: d.issues, tatComp: pct(d.npds - d.issues, d.npds) }))
      .sort((a, b) => b.npds - a.npds).slice(0, 6)
  }, [filtered])

  const spocData = useMemo(() => {
    const map: Record<string, { total: number; breached: number; atRisk: number }> = {}
    filtered.forEach(n => {
      if (!n.spoc) return
      if (!map[n.spoc]) map[n.spoc] = { total: 0, breached: 0, atRisk: 0 }
      map[n.spoc].total++
      if (n.tatHealth === "black") map[n.spoc].breached++
      if (n.tatHealth === "red" || n.tatHealth === "amber") map[n.spoc].atRisk++
    })
    return Object.entries(map).map(([name, d]) => ({
      name,
      initials: name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      total: d.total, breached: d.breached, atRisk: d.atRisk,
      compliance: pct(d.total - d.breached - d.atRisk, d.total),
    }))
  }, [filtered])

  const tatPendencyData = STAGE_SHORT.slice(0, 7).map((_, i) => ({
    stage:   `S${i + 1}`,
    pending: filtered.filter(n => n.stage === i + 1).length,
    tatAvg:  [3, 7, 5, 10, 14, 2, 6][i] ?? 3,
  }))

  const escalations = filtered.filter(n => n.tatHealth === "black")

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="-mx-6 -mt-6 min-h-full flex flex-col bg-[#F2F4F7] animate-in fade-in duration-300">
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-5 flex flex-col gap-4">

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
          <FilterSelect label="Site"     options={ALL_SITES}          value={locFilter}   onChange={setLocFilter} />
          <div className="w-px h-5 bg-slate-100 hidden sm:block" />
          <FilterSelect label="Category" options={ALL_VERTICALS}      value={vertFilter}  onChange={setVertFilter} />
          <div className="w-px h-5 bg-slate-100 hidden sm:block" />
          <FilterSelect label="FY"       options={ALL_FY}             value={fyFilter}    onChange={setFyFilter} />
          <div className="w-px h-5 bg-slate-100 hidden sm:block" />
          <FilterSelect label="Period"   options={[...DATE_PRESETS]}  value={datePreset}  onChange={v => setDatePreset(v as DatePreset)} />
          {(locFilter !== "All" || vertFilter !== "All" || fyFilter !== "All" || datePreset !== "All Time") && (
            <button
              onClick={() => { setLocFilter("All"); setVertFilter("All"); setFyFilter("All"); setDatePreset("All Time") }}
              className="ml-auto text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors px-2 py-1 rounded hover:bg-slate-50 transition-colors">
              Clear all ×
            </button>
          )}
        </div>

        {/* ── Hero block ──────────────────────────────────────────────────── */}
        {(
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex flex-wrap items-start gap-8">
              {/* Big number */}
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.16em]">Total Active NPDs</div>
                <div className="text-[64px] font-bold font-mono leading-none text-slate-900 mt-1">{total}</div>
                <div className="text-[11px] text-slate-400 mt-1">{compRate}% completion · {gradeA} Grade A</div>
              </div>
              <div className="self-stretch w-px bg-slate-100" />
              {/* TAT tiles */}
              <div className="grid grid-cols-2 gap-2.5 flex-1 min-w-[260px]">
                {[
                  { k: "green", label: "On Track",  v: onTrack,  icon: CheckCircle2 },
                  { k: "amber", label: "At Risk",   v: atRisk,   icon: AlertCircle  },
                  { k: "red",   label: "Due Today", v: filtered.filter(n => n.tatHealth === "red").length, icon: Clock },
                  { k: "black", label: "Overdue",   v: overdue,  icon: AlertTriangle },
                ].map(({ k, label, v, icon: Icon }) => (
                  <div key={k} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                    style={{ background: TAT_COLORS[k] + "10", border: `1px solid ${TAT_COLORS[k]}30` }}>
                    <Icon size={13} style={{ color: TAT_COLORS[k] }} />
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TAT_COLORS[k] }}>{label}</div>
                      <div className="text-[20px] font-bold font-mono leading-none" style={{ color: v > 0 && k !== "green" ? TAT_COLORS[k] : "#0f172a" }}>{v}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="self-stretch w-px bg-slate-100" />
              {/* Compliance meter */}
              <div className="flex flex-col items-center justify-center gap-1.5 min-w-[110px]">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.16em]">TAT Compliance</div>
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="7" />
                    <circle cx="40" cy="40" r="32" fill="none"
                      stroke={tatComp >= 80 ? "#10b981" : tatComp >= 50 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="7"
                      strokeDasharray={`${(tatComp / 100) * 201} 201`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[18px] font-bold font-mono text-slate-900">{tatComp}%</span>
                  </div>
                </div>
                <div className="text-[9px] text-slate-400">{onTrack}/{total} on track</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Analytics ─────────────────────────────────────────────────────── */}
        <div>
          <SectionLabel label="Analytics" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* Stage distribution */}
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Stage Distribution</h3>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">LIVE</span>
              </div>
              <div className="relative" style={{ height: 180 }}>
                {stageDistData.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-300 italic z-10">No submissions yet</div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageDistData.length ? stageDistData : [{ stage: "—", label: "—", count: 0 }]} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RTooltip contentStyle={{ fontSize: "11px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      formatter={(v, _, e: any) => [(v ?? 0) + " NPDs", e?.payload?.label ?? ""]} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={18}>
                      {stageDistData.map((_, i) => <Cell key={i} fill={STAGE_ACCENT[i % STAGE_ACCENT.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TAT vs Pendency */}
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
              <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">TAT vs Pendency (by Stage)</h3>
              <div className="relative" style={{ height: 180 }}>
                {tatPendencyData.every(d => d.pending === 0) && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-300 italic z-10">No active stages</div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tatPendencyData} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ fontSize: "11px", borderRadius: "4px", border: "1px solid #e2e8f0" }} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar yAxisId="left" dataKey="pending" name="Pending" fill="#3b82f6" radius={[2,2,0,0]} barSize={14} />
                    <Line yAxisId="right" dataKey="tatAvg" name="Avg TAT (d)" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Site-wise TAT */}
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
              <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Site-wise Avg TAT Remaining (Days)</h3>
              <div className="relative" style={{ height: 180 }}>
                {siteData.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-300 italic z-10">No site data yet</div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={siteData.length ? siteData : [{ site: "—", avgTAT: 0 }]} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="site" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ fontSize: "11px", borderRadius: "4px", border: "1px solid #e2e8f0" }} />
                    <Line type="monotone" dataKey="avgTAT" name="Avg TAT" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>

        {/* ── Pipeline Depth ───────────────────────────────────────────────── */}
        <div>
          <SectionLabel label="Pipeline Depth" />
          <div className="grid grid-cols-6 gap-2">
            <KPICard icon={Layers}        label="Total Active"   value={total}             accent="#0f172a" sub={`${inSourcing} in sourcing`} rate={compRate} />
            <KPICard icon={CheckCircle2}  label="Completed"      value={completed}         accent="#059669" sub={`${compRate}% completion`} rate={compRate} />
            <KPICard icon={Star}          label="Grade A"        value={gradeA}            accent="#7c3aed" sub="priority tracked" />
            <KPICard icon={AlertTriangle} label="Critical"       value={critical}          accent="#dc2626" sub="high-urgency" alert={critical > 0} />
            <KPICard icon={Clock}         label="TAT Compliance" value={`${tatComp}%`}     accent="#10b981" sub={`${onTrack} of ${total} on track`} rate={tatComp} />
            <KPICard icon={FlaskConical}  label="In R&D / TQR"  value={inRnd}             accent="#8b5cf6" sub="Stages 4–6 active" />
          </div>
        </div>

        {/* ── Efficiency ───────────────────────────────────────────────────── */}
        <div>
          <SectionLabel label="Efficiency Metrics" />
          <div className="grid grid-cols-6 gap-2">
            <KPICard icon={Timer}       label="Avg Age"          value={avgCycle > 0 ? `${avgCycle}d` : "—"}     accent="#2563eb" sub="avg days elapsed (active)" />
            <KPICard icon={Hourglass}   label="Aging P75"        value={agingP75Val > 0 ? `${agingP75Val}d` : "—"} accent="#f59e0b" sub="75th pct. active NPD age" alert={agingP75Val > 40} />
            <KPICard icon={AlertCircle} label="Supplier Reject"  value={`${rejRate}%`}                            accent="#ef4444" sub="rejection rate on quotes"  alert={rejRate > 10} />
            <KPICard icon={Zap}         label="Enquiry Conv."    value={`${enquiryConv}%`}                        accent="#2563eb" sub={`${quotesReceived} quotes / ${enquiriesSent} sent`} rate={enquiryConv} />
            <KPICard icon={Users}       label="Vendor Approval"  value={`${approvalConv}%`}                       accent="#059669" sub={`${vendorsApproved} approved of ${quotesReceived}`} rate={approvalConv} />
            <KPICard icon={ThumbsUp}    label="Closed Rate"      value={`${compRate}%`}                           accent="#10b981" sub={`${completed} of ${total} NPDs closed`} rate={compRate} />
          </div>
        </div>

        {/* ── Operations ───────────────────────────────────────────────────── */}
        <div>
          <SectionLabel label="Operations" />
          <div className="flex gap-3 items-stretch">
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3 shrink-0">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-2.5">Sourcing Funnel</div>
              <FunnelStrip steps={[
                { label: "Enquiries Sent",   value: enquiriesSent,   color: "#2563eb" },
                { label: "Quotes Received",  value: quotesReceived,  color: "#7c3aed", pct: `${enquiryConv}% resp.` },
                { label: "Vendors Approved", value: vendorsApproved, color: "#059669", pct: `${approvalConv}% appr.` },
              ]} />
            </div>
            <div className="grid grid-cols-4 gap-2 flex-1">
              <KPICard icon={Package}        label="MRNs Pending"   value={mrnPending}  accent="#f59e0b" sub="awaiting R&D Head" alert={mrnPending > 0} />
              <KPICard icon={Calendar}       label="Ext. Requests"  value={extPending}  accent="#f97316" sub="date extensions" alert={extPending > 0} />
              <KPICard icon={ClipboardCheck} label="FPA Done"       value={fpaDone}     accent="#8b5cf6" sub="first-part approvals" />
              <KPICard icon={IndianRupee}    label="Cost Finalised" value={costSaved}   accent="#0891b2" sub="sample costs saved" />
            </div>
          </div>
        </div>

        {/* ── Stage Pipeline ────────────────────────────────────────────────── */}
        <PanelCard title="Stage Pipeline — All NPDs" right={`${filtered.length} visible`}>
          <div className="p-4">
            {/* Phase header bands */}
            <div className="grid grid-cols-7 gap-2 mb-1">
              {PHASE_DEFS.map(phase => (
                <div key={phase.name}
                  className="flex items-center justify-center gap-1 py-0.5 rounded-sm"
                  style={{ gridColumn: `span ${phase.stages.length}`, background: phase.color + "12", border: `1px solid ${phase.color}25` }}>
                  <span className="text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: phase.color }}>{phase.name}</span>
                </div>
              ))}
            </div>
            {/* Stage columns — always 8 */}
            <div className="grid grid-cols-7 gap-2">
              {PHASE_DEFS.flatMap(phase =>
                phase.stages.map(sn => {
                  const sNPDs = filtered.filter(n => n.stage === sn)
                  const isDone = sn === 8
                  return (
                    <div key={sn} className="flex flex-col gap-1 min-h-[60px]">
                      <div className="text-[9px] font-semibold px-1 py-0.5 rounded-sm mb-1 truncate flex items-center gap-1"
                        style={{ color: isDone ? "#059669" : phase.color, background: isDone ? "#05966912" : phase.color + "08" }}>
                        {isDone ? "✓" : `S${sn}`} · {isDone ? "Completed" : STAGE_SHORT[sn - 1]}
                      </div>
                      {sNPDs.length === 0
                        ? <div className="flex-1 rounded-sm border border-dashed border-slate-100 min-h-[36px]" />
                        : sNPDs.map(npd => (
                          <Link key={npd.id} href={`/npd/${npd.id}`}
                            className="h-7 rounded-sm px-2 flex items-center gap-1.5 hover:opacity-70 transition-opacity w-full"
                            style={isDone
                              ? { background: "#05966918", borderLeft: "2px solid #059669" }
                              : { background: TAT_COLORS[npd.tatHealth] + "15", borderLeft: `2px solid ${TAT_COLORS[npd.tatHealth]}` }}
                            title={`${npd.id} — ${npd.itemName}`}>
                            {isDone
                              ? <span className="text-[9px] text-emerald-600">✓</span>
                              : <TATDot health={npd.tatHealth} size={5} />}
                            <span className="text-[9px] font-mono font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                              style={{ color: isDone ? "#059669" : "#334155" }}>
                              {npd.id.split("-").slice(-1)[0]}
                            </span>
                          </Link>
                        ))
                      }
                    </div>
                  )
                })
              )}
            </div>
            {/* TAT legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">TAT:</span>
              {Object.entries(TAT_LABELS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <TATDot health={k} size={6} />
                  <span className="text-[9px] font-medium text-slate-400">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </PanelCard>

        {/* ── Middle row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PanelCard title="Stage Bottleneck" right="live">
            <div className="p-4 space-y-2.5 min-h-[80px]">
              {bottleneckData.length === 0
                ? <EmptyState label="No active stages" />
                : bottleneckData.map((row, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-medium text-slate-500">{row.stage}</span>
                      <span className="text-[11px] font-mono font-bold text-slate-800">{row.count} NPD{row.count > 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1.5 rounded-sm bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-sm" style={{
                        width: `${(row.count / bottleneckMax) * 100}%`,
                        background: i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#3b82f6",
                      }} />
                    </div>
                  </div>
                ))
              }
            </div>
          </PanelCard>

          <PanelCard title="Supplier Performance" right="live NPDs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Supplier","NPDs","Issues","TAT %"].map(h => (
                      <th key={h} className="py-2 px-3 font-semibold text-slate-400 uppercase tracking-wider text-[9px]"
                        style={{ textAlign: h !== "Supplier" ? "center" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {supplierData.length === 0
                    ? <tr><td colSpan={4} className="py-8 text-center text-[10px] text-slate-300 italic">Suppliers appear once NPDs are assigned</td></tr>
                    : supplierData.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium text-slate-700">{s.name}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">{s.npds}</td>
                        <td className="py-2 px-3 text-center font-mono font-semibold" style={{ color: s.issues > 0 ? "#ef4444" : "#059669" }}>{s.issues}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold"
                          style={{ color: s.tatComp >= 80 ? "#059669" : s.tatComp >= 60 ? "#f59e0b" : "#ef4444" }}>
                          {s.tatComp}%
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </PanelCard>
        </div>

        {/* ── Bottom row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PanelCard title="Escalation Queue"
            right={<span className={escalations.length > 0 ? "text-red-600 font-bold" : ""}>{escalations.length} overdue</span>}>
            <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto min-h-[60px]">
              {escalations.length === 0
                ? <EmptyState label="No active escalations — all NPDs within TAT" />
                : escalations.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                    <TATDot health="black" size={7} />
                    <Link href={`/npd/${e.id}`} className="font-mono text-[10px] font-bold text-blue-700 hover:underline min-w-[110px]">
                      {e.id}
                    </Link>
                    <span className="text-[11px] font-semibold text-slate-700 flex-1 truncate">{e.itemName}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">{e.productLine}</span>
                    <span className="font-mono text-[10px] font-bold text-red-600 w-20 text-right">+{-e.tatDaysRemaining}d</span>
                  </div>
                ))
              }
            </div>
          </PanelCard>

          <PanelCard title="SPOC TAT Compliance">
            <div className="p-4 grid grid-cols-2 gap-2 max-h-60 overflow-y-auto min-h-[60px]">
              {spocData.length === 0
                ? <div className="col-span-2"><EmptyState label="SPOC data appears once NPDs have SPOCs assigned" /></div>
                : spocData.map(sp => (
                  <div key={sp.name} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                        {sp.initials}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-900">{sp.name}</div>
                        <div className="text-[9px] text-slate-400">{sp.total} NPD{sp.total !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    <div className="text-[26px] font-mono font-bold leading-none"
                      style={{ color: sp.compliance >= 80 ? "#059669" : sp.compliance >= 60 ? "#f59e0b" : "#ef4444" }}>
                      {sp.compliance}%
                    </div>
                    <div className="h-1 rounded-full bg-slate-200 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${sp.compliance}%`,
                        background: sp.compliance >= 80 ? "#059669" : sp.compliance >= 60 ? "#f59e0b" : "#ef4444",
                      }} />
                    </div>
                    {sp.breached > 0 && <div className="text-[9px] mt-1.5 font-semibold text-red-500">{sp.breached} breached</div>}
                  </div>
                ))
              }
            </div>
          </PanelCard>
        </div>

        <div className="pb-4" />
      </div>
    </div>
  )
}
