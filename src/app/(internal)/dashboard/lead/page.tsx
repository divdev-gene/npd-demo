"use client"

import { useState } from "react"
import { useNPDs } from "@/lib/npdContext"
import { Badge } from "@/components/ui/badge"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

const STAGES = [
  "New Request", "SPOC Assigned", "Target Specs",
  "Supplier Quote", "Sample Submission", "Sample Receipt / MRN",
  "R&D Inspection", "TQR Evaluation", "Sample Cost Finalization",
  "FPA Request", "PP Lot Pricing"
];

const TAT_COLORS: Record<string, string> = {
  green: '#10b981', // emerald-500
  amber: '#f59e0b', // amber-500
  red: '#ef4444',   // red-500
  black: '#0f172a'  // slate-900
};

const BOTTLENECK_DATA = [
  { stage: "S5: Sample Submission", count: 42, avgDaysOver: 4 },
  { stage: "S8: TQR Evaluation", count: 24, avgDaysOver: 2 },
  { stage: "S4: Supplier Quote", count: 18, avgDaysOver: 0 },
  { stage: "S9: Sample Cost Finalization", count: 9, avgDaysOver: 0 }
];

const SUPPLIER_HEATMAP = [
  { name: "Shenzhen Optoelectronics", composite: 8.5, rejects: 2, npds: 14, tatCompliance: 92 },
  { name: "Cords India", composite: 9.1, rejects: 0, npds: 8, tatCompliance: 100 },
  { name: "SealTech", composite: 7.2, rejects: 5, npds: 22, tatCompliance: 78 },
  { name: "Tubetech India", composite: 5.8, rejects: 12, npds: 19, tatCompliance: 55 }
];

const REJECTION_PARETO = [
  { code: "DIM-01: Dimension Mismatch", count: 48 },
  { code: "MAT-08: Material Grade", count: 22 },
  { code: "DOC-03: Missing Test Cert", count: 14 },
  { code: "PKG-01: Transit Damage", count: 5 }
];

const TAT_PENDENCY_DATA = [
  { stage: 'S1', tatAvg: 2, pending: 15 },
  { stage: 'S2', tatAvg: 5, pending: 22 },
  { stage: 'S3', tatAvg: 3, pending: 8 },
  { stage: 'S4', tatAvg: 8, pending: 35 },
  { stage: 'S5', tatAvg: 12, pending: 42 },
  { stage: 'S6', tatAvg: 4, pending: 19 },
];

const SITE_TAT_AVG = [
  { site: 'Rajpura A', avgTAT: 28 },
  { site: 'Rajpura Comm', avgTAT: 34 },
  { site: 'Jhajjhar', avgTAT: 22 },
  { site: 'Sricity', avgTAT: 45 },
  { site: 'Air Purifier', avgTAT: 18 },
  { site: 'Water Purifier', avgTAT: 25 },
];

const SITE_PENDING_ST = [
  { site: 'Rajpura A', st1: 12, st2: 18 },
  { site: 'Rajpura Comm', st1: 8, st2: 10 },
  { site: 'Jhajjhar', st1: 25, st2: 15 },
  { site: 'Sricity', st1: 19, st2: 24 },
  { site: 'Air Purifier', st1: 5, st2: 7 },
  { site: 'Water Purifier', st1: 14, st2: 9 },
];

// Helper Components
function KPICard({ label, value, sub, color, alert }: any) {
  return (
    <div className="bg-white border border-slate-200 p-3 flex-1 min-w-[100px] shadow-sm flex flex-col justify-between rounded-sm">
      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold font-mono leading-none ${color || 'text-slate-900'}`}>{value}</div>
      {sub && <div className={`text-[10px] font-medium mt-1 ${alert ? 'text-red-500' : 'text-slate-500'}`}>{sub}</div>}
    </div>
  );
}

function PanelHeader({ title, right }: any) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      {right && <span className="text-[10px] font-medium text-slate-500">{right}</span>}
    </div>
  );
}

function TATDot({ health, size = 6 }: any) {
  return (
    <div style={{ width: size, height: size, backgroundColor: TAT_COLORS[health], borderRadius: '50%' }} />
  );
}

function TATHeatmap({ data }: any) {
  const stageGroups = STAGES.map((s, i) => ({
    stage: i + 1, label: s,
    items: data.filter((d: any) => d.stage === i + 1),
  })).filter(g => g.items.length > 0);

  return (
    <div className="p-3 overflow-x-auto min-h-[140px]">
      <div className="flex gap-2 min-w-max">
        {stageGroups.map(g => (
          <div key={g.stage} className="flex-1 w-20 min-w-[80px]">
             <div className="text-[9px] font-bold text-slate-500 mb-2 tracking-wide uppercase line-clamp-1" title={g.label}>
               S{g.stage} · {g.label.split(' ').slice(0, 2).join(' ')}
             </div>
             <div className="flex flex-col gap-1">
               {g.items.map((npd: any) => (
                 <div key={npd.id}
                   title={`${npd.id} — ${npd.itemName}`}
                   className="h-6 rounded-sm px-1.5 flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity border-l-[3px] border border-r-0 border-t-0 border-b-0 shadow-sm"
                   style={{
                     backgroundColor: TAT_COLORS[npd.tatHealth] + '15',
                     borderLeftColor: TAT_COLORS[npd.tatHealth],
                   }}
                 >
                   <TATDot health={npd.tatHealth} size={6} />
                   <span className="text-[9px] text-slate-800 font-mono overflow-hidden text-ellipsis whitespace-nowrap font-semibold">
                     {npd.id.split('-').slice(-1)[0]}
                   </span>
                 </div>
               ))}
             </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 border-t border-slate-100 pt-2">
        {Object.entries({
          green: 'On Track',
          amber: 'At Risk',
          red: 'Due Today',
          black: 'Overdue'
        }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <TATDot health={k} size={7} />
            <span className="text-[9px] font-semibold text-slate-500 tracking-wide">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BottleneckPanel({ data }: any) {
  const max = data[0]?.count || 1;
  return (
    <div className="p-3 space-y-2">
      {data.map((row: any, i: number) => (
        <div key={i} className="mb-2">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-600">{row.stage}</span>
            <span className="text-[10px] text-slate-900 font-mono font-bold">
              {row.count} NPD{row.count > 1 ? 's' : ''}
              {row.avgDaysOver > 0 && <span className="text-red-500 ml-1">+{row.avgDaysOver}d avg</span>}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
            <div className="h-full rounded-sm transition-all" style={{
              width: `${(row.count / max) * 100}%`,
              backgroundColor: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#3b82f6'
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SupplierHeatmapPanel({ data }: any) {
  const scoreColor = (s: number) => s >= 8 ? 'text-emerald-600' : s >= 6 ? 'text-amber-600' : 'text-red-600';
  const tatColor = (t: number) => t >= 80 ? 'text-emerald-600' : t >= 60 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="p-0 overflow-x-auto">
      <table className="w-full text-left border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {['Supplier', 'TQR Score', 'Rejects', 'Total NPDs', 'TAT %'].map(h => (
              <th key={h} className={`py-1.5 px-3 font-semibold text-slate-500 uppercase tracking-widest ${h !== 'Supplier' ? 'text-center' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((s: any, i: number) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
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
  );
}

function RejectionPareto({ data }: any) {
  const max = data[0]?.count || 1;
  const total = data.reduce((a: number, b: any) => a + b.count, 0);
  let cumulative = 0;
  return (
    <div className="p-3">
      {data.map((row: any, i: number) => {
        cumulative += row.count;
        const cumPct = Math.round((cumulative / total) * 100);
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
        );
      })}
    </div>
  );
}

export default function LeadDashboard() {
  const { npds } = useNPDs()
  const [locFilter, setLocFilter] = useState('All');
  const [vertFilter, setFilter] = useState('All');

  const dashboardNPDs = locFilter === 'All' ? npds : npds.filter(n => n.rAndDDivision === locFilter);
  const filteredNPDs = vertFilter === 'All' ? dashboardNPDs : dashboardNPDs.filter(n =>
    n.itemCategory.includes(vertFilter) || n.typeOfWork.includes(vertFilter)
  );

  const totalNPDs = dashboardNPDs.length * 20 + 5;
  const samplesReceived = Math.floor(totalNPDs * 0.6);
  const approvedParts = Math.floor(totalNPDs * 0.3);
  const rejectedRework = Math.floor(totalNPDs * 0.08);
  const pendingApproval = Math.floor(totalNPDs * 0.15);
  const specSheetMissing = Math.floor(totalNPDs * 0.35);

  const escalationList = npds.filter(n => n.tatHealth === 'black');
  const pendingChanges = [
    { npd: "NPD-2026-0008", type: "AICM Cost", old: "₹115.00", new: "₹118.50", hours: 4 },
    { npd: "NPD-2026-0012", type: "Pricing Portal", old: "₹310.00", new: "₹308.00", hours: 24 }
  ];

  const spocs = [
    { id: 1, name: "Rahul Sharma", initials: "RS", vertical: "Commodity", npds: 12, breached: 1, red: 2 },
    { id: 2, name: "Priya Rajan", initials: "PR", vertical: "Electrical", npds: 8, breached: 0, red: 0 },
    { id: 3, name: "Aditi Verma", initials: "AV", vertical: "Compliance", npds: 15, breached: 3, red: 4 }
  ];

  return (
    <div className="max-w-[1600px] mx-auto p-4 flex flex-col gap-4 overflow-y-auto">
      
      {/* Location Filter */}
      <div className="flex gap-2 mb-2 items-center flex-wrap">
        <span className="text-xs font-bold text-slate-500 uppercase">R&D Location:</span>
        {['All', 'Rajpura Grade A', 'Rajpura Commercial', 'Jhajjhar RAC', 'Sricity RAC', 'Air Purifier Division', 'Water Purifier Division'].map(v => (
          <button key={v} onClick={() => setLocFilter(v)} 
            className={`px-3 py-1 rounded-sm text-xs font-semibold transition-colors border ${
              locFilter === v ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {v}
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <KPICard label="Total Projects" value={totalNPDs} sub="active NPDs" />
        <KPICard label="Samples Received" value={samplesReceived} sub="Sample Receipt / MRN completed" color="text-blue-600" />
        <KPICard label="Approved Parts" value={approvedParts} sub="this quarter" color="text-emerald-600" />
        <KPICard label="Rejected / Rework" value={rejectedRework} sub="in re-sample loop" color="text-red-500" alert />
        <KPICard label="Pending Actions" value={pendingApproval} sub="awaiting verdict" color="text-amber-500" />
        <KPICard label="Spec Sheet Attached" value={`${totalNPDs - specSheetMissing} / ${totalNPDs}`} sub={`Missing from ${specSheetMissing} NPDs`} color="text-amber-600" alert />
      </div>

      {/* TAT Heatmap */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <PanelHeader title="TAT Heatmap — Active NPDs by Stage" right={
          <div className="flex gap-1">
            {['All', 'Commodity', 'Electrical', 'Compliance', 'Packaging'].map(v => (
              <button key={v} onClick={() => setFilter(v)} 
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

      {/* Middle Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader title="Stage Bottleneck Analysis" right="last 30d" />
          <BottleneckPanel data={BOTTLENECK_DATA} />
        </div>
        <div className="flex-[1.5] bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader title="Supplier Performance Heatmap" right="TQR composite · 90d" />
          <SupplierHeatmapPanel data={SUPPLIER_HEATMAP} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <PanelHeader title="Rejection Root-Cause Pareto" right="89 total" />
          <RejectionPareto data={REJECTION_PARETO} />
        </div>
        
        <div className="flex-[2] flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
            <PanelHeader title="Escalation Queue" right={<span className="text-red-600">{escalationList.length} overdue</span>} />
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {escalationList.length === 0 ? (
                 <div className="p-3 text-[10px] text-slate-500">No active escalations</div>
              ) : escalationList.map(e => (
                 <div key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                    <TATDot health="black" size={8} />
                    <span className="font-mono text-[10px] font-bold text-blue-700 min-w-[100px]">{e.id}</span>
                    <span className="text-[11px] font-semibold text-slate-800 flex-1">{e.itemName}</span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-1 py-0 h-4 uppercase">
                      {e.productLine}
                    </Badge>
                    <span className="font-mono text-[10px] font-bold text-red-600 ml-2 w-24 text-right">
                      +{-e.tatDaysRemaining}d overdue
                    </span>
                    <button className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase ml-2 hover:bg-red-100 transition-colors">
                      Escalate
                    </button>
                 </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 h-72 flex flex-col">
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-4">TAT vs Pendency (By Stage)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TAT_PENDENCY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar yAxisId="left" dataKey="pending" name="Pending Count" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={15} />
                <Line yAxisId="right" dataKey="tatAvg" name="Avg TAT (Days)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 h-72 flex flex-col">
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-4">Site-wise Avg TAT (Days)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SITE_TAT_AVG} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="site" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                <Line type="monotone" dataKey="avgTAT" name="Avg TAT" stroke="#10b981" strokeWidth={3} fill="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 h-72 flex flex-col">
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-4">Sourcing Pending by Team & Site</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SITE_PENDING_ST} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="site" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="st1" name="ST I" stackId="a" fill="#0f172a" />
                <Bar dataKey="st2" name="ST II" stackId="a" fill="#64748b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SPOC vertical health */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden mb-6">
        <PanelHeader title="45-Day Sample Compliance by Vertical" />
        <div className="flex gap-4 p-3 overflow-x-auto">
          {spocs.map(sp => {
             const pct = Math.round(((sp.npds - sp.breached - sp.red) / sp.npds) * 100);
             return (
               <div key={sp.id} className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-sm min-w-[160px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">{sp.initials}</div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-900 leading-tight">{sp.name}</div>
                      <div className="text-[9px] font-semibold text-slate-500 uppercase">{sp.vertical}</div>
                    </div>
                  </div>
                  <div className={`text-3xl font-mono font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                    {pct}%
                  </div>
                  <div className="text-[9px] font-medium text-slate-500 mt-1 uppercase tracking-wider">
                    {sp.npds} Active · {sp.breached > 0 ? <span className="text-red-500 font-bold">{sp.breached} Breached</span> : '0 Breached'}
                  </div>
               </div>
             )
          })}
        </div>
      </div>

    </div>
  )
}
