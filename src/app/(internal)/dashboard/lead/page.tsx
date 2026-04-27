"use client"

import { useState, useEffect } from "react"
import { useNPDs } from "@/lib/npdContext"
import { Badge } from "@/components/ui/badge"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import {
  ENQUIRY_SENT_KEY, LIVE_QUOTATIONS_KEY, VENDOR_QUOTE_APPROVALS_KEY,
  VENDOR_STATUS_KEY, type VendorStatusResponse,
} from "@/lib/mockData"

// ── Stage labels matching npd/[id]/page.tsx ────────────────────────────────
const STAGE_LABELS = [
  "Request Initiation", "R&D Internal Review", "NPD Sourcing Allocation",
  "Supplier Defense", "Sample Submission", "Sample Receipt / MRN",
  "R&D Evaluation", "FPA (First Part Approval)", "Sample Cost Finalization", "PP Lot Pricing"
]

const TAT_COLORS: Record<string, string> = {
  green: '#10b981', amber: '#f59e0b', red: '#ef4444', black: '#0f172a'
}

const SUPPLIER_HEATMAP = [
  { name: "Shenzhen Optoelectronics", composite: 8.5, rejects: 2, npds: 14, tatCompliance: 92 },
  { name: "Cords India",              composite: 9.1, rejects: 0, npds: 8,  tatCompliance: 100 },
  { name: "SealTech",                 composite: 7.2, rejects: 5, npds: 22, tatCompliance: 78 },
  { name: "Tubetech India",           composite: 5.8, rejects: 12,npds: 19, tatCompliance: 55 },
]

const REJECTION_PARETO = [
  { code: "DIM-01: Dimension Mismatch", count: 48 },
  { code: "MAT-08: Material Grade",     count: 22 },
  { code: "DOC-03: Missing Test Cert",  count: 14 },
  { code: "PKG-01: Transit Damage",     count: 5  },
]

const SITE_TAT_AVG = [
  { site: 'Rajpura A',      avgTAT: 28 },
  { site: 'Rajpura Comm',   avgTAT: 34 },
  { site: 'Jhajjhar',       avgTAT: 22 },
  { site: 'Sricity',        avgTAT: 45 },
  { site: 'Air Purifier',   avgTAT: 18 },
  { site: 'Water Purifier', avgTAT: 25 },
]

const SPOCS = [
  { id: 1, name: "Rahul Sharma", initials: "RS", vertical: "Commodity",  npds: 12, breached: 1, red: 2 },
  { id: 2, name: "Priya Rajan",  initials: "PR", vertical: "Electrical", npds: 8,  breached: 0, red: 0 },
  { id: 3, name: "Aditi Verma",  initials: "AV", vertical: "Compliance", npds: 15, breached: 3, red: 4 },
]

const STAGE_COLORS = [
  '#0f172a','#1e3a5f','#1d4ed8','#2563eb','#7c3aed',
  '#0891b2','#059669','#d97706','#dc2626','#64748b'
]

// ── Helper components ──────────────────────────────────────────────────────
function PanelHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      {right && <span className="text-[10px] font-medium text-slate-500">{right}</span>}
    </div>
  )
}

function TATDot({ health, size = 6 }: { health: string; size?: number }) {
  return <div style={{ width: size, height: size, backgroundColor: TAT_COLORS[health], borderRadius: '50%' }} />
}

function KPICard({ label, value, sub, color, delta, alert }: {
  label: string; value: string | number; sub?: string;
  color?: string; delta?: string; alert?: boolean
}) {
  return (
    <div className="bg-white border border-slate-200 p-3 flex-1 min-w-[110px] shadow-sm flex flex-col justify-between rounded-sm">
      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold font-mono leading-none ${color ?? 'text-slate-900'}`}>{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {sub  && <div className={`text-[10px] font-medium ${alert ? 'text-red-500' : 'text-slate-500'}`}>{sub}</div>}
        {delta && <div className="text-[10px] font-bold text-emerald-600">{delta}</div>}
      </div>
    </div>
  )
}

function TATHeatmap({ data }: { data: ReturnType<typeof useNPDs>['npds'] }) {
  const groups = STAGE_LABELS.map((label, i) => ({
    stage: i + 1, label,
    items: data.filter(d => d.stage === i + 1),
  })).filter(g => g.items.length > 0)

  if (groups.length === 0) {
    return <div className="p-4 text-xs text-slate-400 italic">No active NPDs to display.</div>
  }

  return (
    <div className="p-3 overflow-x-auto min-h-[120px]">
      <div className="flex gap-2 min-w-max">
        {groups.map(g => (
          <div key={g.stage} className="w-20 min-w-[80px]">
            <div className="text-[9px] font-bold text-slate-500 mb-2 tracking-wide uppercase line-clamp-1" title={g.label}>
              S{g.stage} · {g.label.split(' ').slice(0, 2).join(' ')}
            </div>
            <div className="flex flex-col gap-1">
              {g.items.map(npd => (
                <div
                  key={npd.id}
                  title={`${npd.id} — ${npd.itemName}`}
                  className="h-6 rounded-sm px-1.5 flex items-center gap-1.5 cursor-pointer hover:opacity-80 border-l-[3px] shadow-sm"
                  style={{ backgroundColor: TAT_COLORS[npd.tatHealth] + '18', borderLeftColor: TAT_COLORS[npd.tatHealth] }}
                >
                  <TATDot health={npd.tatHealth} size={6} />
                  <span className="text-[9px] text-slate-800 font-mono font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                    {npd.id.split('-').slice(-1)[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 border-t border-slate-100 pt-2">
        {(Object.entries({ green: 'On Track', amber: 'At Risk', red: 'Due Today', black: 'Overdue' })).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <TATDot health={k} size={7} />
            <span className="text-[9px] font-semibold text-slate-500">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BottleneckPanel({ data }: { data: typeof REJECTION_PARETO }) {
  const max = (data[0] as any)?.count || 1
  return (
    <div className="p-3 space-y-2">
      {(data as any[]).map((row, i) => (
        <div key={i} className="mb-2">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-600">{row.stage ?? row.code}</span>
            <span className="text-[10px] text-slate-900 font-mono font-bold">
              {row.count} NPD{row.count > 1 ? 's' : ''}
              {row.avgDaysOver > 0 && <span className="text-red-500 ml-1">+{row.avgDaysOver}d avg</span>}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
            <div className="h-full rounded-sm" style={{
              width: `${(row.count / max) * 100}%`,
              backgroundColor: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#3b82f6',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SupplierHeatmapPanel({ data }: { data: typeof SUPPLIER_HEATMAP }) {
  const scoreColor = (s: number) => s >= 8 ? 'text-emerald-600' : s >= 6 ? 'text-amber-600' : 'text-red-600'
  const tatColor   = (t: number) => t >= 80 ? 'text-emerald-600' : t >= 60 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {['Supplier','TQR Score','Rejects','Total NPDs','TAT %'].map(h => (
              <th key={h} className={`py-1.5 px-3 font-semibold text-slate-500 uppercase tracking-widest ${h !== 'Supplier' ? 'text-center' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((s, i) => (
            <tr key={i} className="hover:bg-slate-50/50">
              <td className="py-1.5 px-3 font-medium text-slate-900">{s.name}</td>
              <td className={`py-1.5 px-3 text-center font-mono font-bold ${scoreColor(s.composite)}`}>{s.composite.toFixed(1)}</td>
              <td className={`py-1.5 px-3 text-center font-mono font-semibold ${s.rejects > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{s.rejects}</td>
              <td className="py-1.5 px-3 text-center text-slate-600 font-mono">{s.npds}</td>
              <td className={`py-1.5 px-3 text-center font-mono font-bold ${tatColor(s.tatCompliance)}`}>{s.tatCompliance}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RejectionPareto({ data }: { data: typeof REJECTION_PARETO }) {
  const max = data[0]?.count || 1
  const total = data.reduce((a, b) => a + b.count, 0)
  let cumulative = 0
  return (
    <div className="p-3">
      {data.map((row, i) => {
        cumulative += row.count
        const cumPct = Math.round((cumulative / total) * 100)
        return (
          <div key={i} className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-600">{row.code}</span>
              <span className="text-[10px] font-mono font-semibold">
                <span className="text-slate-900">{row.count}</span>
                <span className="text-slate-400 ml-1.5">{cumPct}%</span>
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

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function LeadDashboard() {
  const { npds } = useNPDs()
  const [locFilter,  setLocFilter]  = useState('All')
  const [vertFilter, setVertFilter] = useState('All')

  // Live KPI data from localStorage
  const [enquiriesSent,    setEnquiriesSent]    = useState(0)
  const [quotesReceived,   setQuotesReceived]   = useState(0)
  const [vendorsApproved,  setVendorsApproved]  = useState(0)
  const [mrnPending,       setMrnPending]       = useState(0)
  const [extPending,       setExtPending]       = useState(0)
  const [fpaDone,          setFpaDone]          = useState(0)
  const [costSaved,        setCostSaved]        = useState(0)

  useEffect(() => {
    try {
      const rawSent = localStorage.getItem(ENQUIRY_SENT_KEY)
      const allSent: Record<string, string[]> = rawSent ? JSON.parse(rawSent) : {}
      setEnquiriesSent(Object.keys(allSent).length)

      const rawLive = localStorage.getItem(LIVE_QUOTATIONS_KEY)
      const allLive: Record<string, Record<string, unknown>> = rawLive ? JSON.parse(rawLive) : {}
      let qCount = 0
      for (const vendors of Object.values(allLive)) qCount += Object.keys(vendors).length
      setQuotesReceived(qCount)

      const rawAppr = localStorage.getItem(VENDOR_QUOTE_APPROVALS_KEY)
      const allAppr: Record<string, Record<string, string>> = rawAppr ? JSON.parse(rawAppr) : {}
      let aCount = 0
      for (const vendors of Object.values(allAppr))
        aCount += Object.values(vendors).filter(v => v === "approved").length
      setVendorsApproved(aCount)

      const rawMRN   = localStorage.getItem("sample_receipt_v1")
      const rawMAppr = localStorage.getItem("mrn_approval_v1")
      const allMRN:   Record<string, unknown>            = rawMRN   ? JSON.parse(rawMRN)   : {}
      const allMAppr: Record<string, string>             = rawMAppr ? JSON.parse(rawMAppr) : {}
      const mrnKeys = Object.values(allMRN).map((v: any) => v?.mrnNumber).filter(Boolean) as string[]
      setMrnPending(mrnKeys.filter(k => !allMAppr[k]).length)

      const rawStatus = localStorage.getItem(VENDOR_STATUS_KEY)
      const allStatus: Record<string, Record<string, VendorStatusResponse>> = rawStatus ? JSON.parse(rawStatus) : {}
      const rawDateA  = localStorage.getItem("vendor_date_approval_v1")
      const allDateA: Record<string, Record<string, string>> = rawDateA ? JSON.parse(rawDateA) : {}
      let extCount = 0
      for (const [npdId, vendors] of Object.entries(allStatus)) {
        for (const [vendor, resp] of Object.entries(vendors)) {
          if (!resp.onTime && resp.newDate && !allDateA[npdId]?.[vendor]) extCount++
        }
      }
      setExtPending(extCount)

      const rawFPA  = localStorage.getItem("fpa_data_v1")
      const allFPA: Record<string, unknown> = rawFPA ? JSON.parse(rawFPA) : {}
      setFpaDone(Object.keys(allFPA).length)

      const rawCost = localStorage.getItem("sample_cost_v1")
      const allCost: Record<string, unknown> = rawCost ? JSON.parse(rawCost) : {}
      setCostSaved(Object.keys(allCost).length)
    } catch {}
  }, [npds])

  const filtered = (locFilter === 'All' ? npds : npds.filter(n => n.rAndDDivision === locFilter))
  const filteredNPDs = vertFilter === 'All' ? filtered : filtered.filter(n =>
    n.itemCategory.includes(vertFilter) || n.typeOfWork.includes(vertFilter)
  )

  // Live derived KPIs
  const totalActive     = npds.length
  const overdue         = npds.filter(n => n.tatHealth === 'black').length
  const atRisk          = npds.filter(n => n.tatHealth === 'amber' || n.tatHealth === 'red').length
  const inSourcing      = npds.filter(n => n.stage >= 3 && n.stage <= 5).length
  const inTesting       = npds.filter(n => n.stage === 7).length
  const completed       = npds.filter(n => n.stage >= 10).length
  const escalationList  = npds.filter(n => n.tatHealth === 'black')

  // Live stage distribution for chart
  const stageDistData = STAGE_LABELS.map((label, i) => ({
    stage:  `S${i + 1}`,
    label:  label.split(' ').slice(0, 3).join(' '),
    count:  npds.filter(n => n.stage === i + 1).length,
  })).filter(d => d.count > 0)

  // Bottleneck: compute from live data (top stages by count, sorted desc)
  const bottleneckData = STAGE_LABELS.map((label, i) => ({
    stage: `S${i + 1}: ${label.split(' ').slice(0, 2).join(' ')}`,
    count: npds.filter(n => n.stage === i + 1).length,
    avgDaysOver: 0,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)

  const tatPendencyData = STAGE_LABELS.map((label, i) => ({
    stage:   `S${i + 1}`,
    pending: npds.filter(n => n.stage === i + 1).length,
    tatAvg:  [2, 5, 3, 8, 12, 4, 6, 5, 3, 2][i] ?? 3,
  }))

  return (
    <div className="max-w-[1600px] mx-auto p-4 flex flex-col gap-4 overflow-y-auto">

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location:</span>
          {['All','Rajpura Grade A','Rajpura Commercial','Jhajjhar RAC','Sricity RAC','Air Purifier Division','Water Purifier Division'].map(v => (
            <button key={v} onClick={() => setLocFilter(v)}
              className={`px-2.5 py-1 rounded-sm text-[10px] font-semibold border transition-colors ${
                locFilter === v ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vertical:</span>
          {['All','Commodity','Electrical','Compliance','Packaging'].map(v => (
            <button key={v} onClick={() => setVertFilter(v)}
              className={`px-2.5 py-1 rounded-sm text-[10px] font-semibold border transition-colors ${
                vertFilter === v ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Charts Row (moved up) ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Live stage distribution — updates as NPDs progress */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 h-64 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">NPD Stage Distribution</h3>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">LIVE</span>
          </div>
          {stageDistData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400">No data yet</div>
          ) : (
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageDistData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="stage" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                    formatter={(v, _, entry: any) => [(v ?? 0) + ' NPDs', entry?.payload?.label ?? '']}
                  />
                  <Bar dataKey="count" name="NPDs" radius={[2,2,0,0]} barSize={18}>
                    {stageDistData.map((_, i) => (
                      <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* TAT vs Pendency — uses live pending counts */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 h-64 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">TAT vs Pendency (by Stage)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tatPendencyData.filter(d => d.pending > 0)} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left"  tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar yAxisId="left" dataKey="pending" name="Pending Count" fill="#3b82f6" radius={[2,2,0,0]} barSize={14} />
                <Line yAxisId="right" dataKey="tatAvg" name="Avg TAT (Days)" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Site-wise Avg TAT */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 h-64 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Site-wise Avg TAT (Days)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SITE_TAT_AVG} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="site" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                <Line type="monotone" dataKey="avgTAT" name="Avg TAT" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── TAT Heatmap ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <PanelHeader title="TAT Heatmap — Active NPDs by Stage" right={
          <div className="flex gap-1">
            {['All','Commodity','Electrical','Compliance','Packaging'].map(v => (
              <button key={v} onClick={() => setVertFilter(v)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${
                  vertFilter === v ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {v}
              </button>
            ))}
          </div>
        } />
        <TATHeatmap data={filteredNPDs} />
      </div>

      {/* ── Live KPI Strip ────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <KPICard label="Total Active"      value={totalActive}    sub="NPDs in pipeline"             color="text-slate-900" />
        <KPICard label="In Sourcing"       value={inSourcing}     sub="Stages 3–5"                   color="text-blue-700" />
        <KPICard label="Enquiries Sent"    value={enquiriesSent}  sub="RFQs dispatched"              color="text-blue-600" />
        <KPICard label="Quotes Received"   value={quotesReceived} sub="from suppliers"               color="text-indigo-600" />
        <KPICard label="Vendors Approved"  value={vendorsApproved} sub="quote approvals"             color="text-emerald-600" />
        <KPICard label="MRNs Pending"      value={mrnPending}     sub="awaiting R&D Head"            color={mrnPending > 0 ? "text-amber-500" : "text-slate-400"} alert={mrnPending > 0} />
        <KPICard label="Ext. Requests"     value={extPending}     sub="dispatch extensions"          color={extPending > 0 ? "text-amber-500" : "text-slate-400"} alert={extPending > 0} />
        <KPICard label="In R&D Eval"       value={inTesting}      sub="Stage 7"                      color="text-violet-600" />
        <KPICard label="FPA Completed"     value={fpaDone}        sub="first-part approvals"         color="text-purple-600" />
        <KPICard label="Cost Finalised"    value={costSaved}      sub="sample cost saved"            color="text-teal-600" />
        <KPICard label="Completed"         value={completed}      sub="Stage 10 reached"             color="text-slate-500" />
        <KPICard label="Overdue"           value={overdue}        sub="TAT breached"                 color={overdue > 0 ? "text-red-600" : "text-slate-400"} alert={overdue > 0} />
        <KPICard label="At Risk"           value={atRisk}         sub="amber / red TAT"              color={atRisk > 0 ? "text-amber-500" : "text-slate-400"} />
      </div>

      {/* ── Middle Row ────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader title="Stage Bottleneck Analysis" right="live" />
          {bottleneckData.length > 0
            ? <BottleneckPanel data={bottleneckData as any} />
            : <div className="p-4 text-[10px] text-slate-400 italic">No bottlenecks — all stages clear.</div>
          }
        </div>
        <div className="flex-[1.5] bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader title="Supplier Performance Heatmap" right="TQR composite · 90d" />
          <SupplierHeatmapPanel data={SUPPLIER_HEATMAP} />
        </div>
      </div>

      {/* ── Bottom Row ────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader title="Rejection Root-Cause Pareto" right="89 total" />
          <RejectionPareto data={REJECTION_PARETO} />
        </div>

        <div className="flex-[2] bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader
            title="Escalation Queue"
            right={<span className={escalationList.length > 0 ? "text-red-600" : "text-slate-400"}>
              {escalationList.length} overdue
            </span>}
          />
          <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {escalationList.length === 0 ? (
              <div className="p-3 text-[10px] text-slate-400">No active escalations</div>
            ) : escalationList.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                <TATDot health="black" size={8} />
                <span className="font-mono text-[10px] font-bold text-blue-700 min-w-[100px]">{e.id}</span>
                <span className="text-[11px] font-semibold text-slate-800 flex-1 truncate">{e.itemName}</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-1 h-4 uppercase">
                  {e.productLine}
                </Badge>
                <span className="font-mono text-[10px] font-bold text-red-600 w-24 text-right">
                  +{-e.tatDaysRemaining}d overdue
                </span>
                <button className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase hover:bg-red-100 transition-colors">
                  Escalate
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 45-Day SPOC Compliance ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden mb-4">
        <PanelHeader title="45-Day Sample Compliance by Vertical" />
        <div className="flex gap-4 p-3 overflow-x-auto">
          {SPOCS.map(sp => {
            const pct = Math.round(((sp.npds - sp.breached - sp.red) / sp.npds) * 100)
            return (
              <div key={sp.id} className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-sm min-w-[160px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                    {sp.initials}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900">{sp.name}</div>
                    <div className="text-[9px] font-semibold text-slate-500 uppercase">{sp.vertical}</div>
                  </div>
                </div>
                <div className={`text-3xl font-mono font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {pct}%
                </div>
                <div className="text-[9px] font-medium text-slate-500 mt-1 uppercase tracking-wider">
                  {sp.npds} Active ·{' '}
                  {sp.breached > 0
                    ? <span className="text-red-500 font-bold">{sp.breached} Breached</span>
                    : '0 Breached'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
