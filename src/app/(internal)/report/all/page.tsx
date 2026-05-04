"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft, Search, Download, FileText, Star,
  Package, FlaskConical, Truck, FolderOpen, Lock,
  Layers, Activity, AlertTriangle, ExternalLink,
  ChevronDown, ChevronRight,
} from "lucide-react"
import { useNPDs } from "@/lib/npdContext"
import { downloadMISReport, buildNPDRow } from "@/lib/reportGenerator"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Column groups
// ─────────────────────────────────────────────────────────────────────────────
const GROUPS = [
  {
    id: "project",
    label: "Project",
    icon: FolderOpen,
    accent: "#6366F1",   // indigo
    pill: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    cols: [
      { idx: 0,  name: "Project ID"   },
      { idx: 2,  name: "Location"     },
      { idx: 4,  name: "SPOC"         },
      { idx: 6,  name: "Product Line" },
      { idx: 12, name: "Category"     },
      { idx: 15, name: "TAT (Days)"   },
      { idx: 16, name: "Qty"          },
    ],
  },
  {
    id: "supplier",
    label: "Supplier",
    icon: Package,
    accent: "#3B82F6",   // blue
    pill: "bg-blue-50 text-blue-700 ring-blue-200",
    cols: [
      { idx: 17, name: "Type of Work" },
      { idx: 19, name: "RFQ Date"     },
      { idx: 21, name: "Supplier"     },
      { idx: 24, name: "Confirmed"    },
      { idx: 25, name: "Acceptance"   },
      { idx: 26, name: "Commit Date"  },
    ],
  },
  {
    id: "dispatch",
    label: "Dispatch",
    icon: Truck,
    accent: "#06B6D4",   // cyan
    pill: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    cols: [
      { idx: 28, name: "Lead Time"    },
      { idx: 29, name: "Sample Qty"   },
      { idx: 30, name: "Dispatch"     },
      { idx: 31, name: "TAT Used"     },
      { idx: 32, name: "Arrival"      },
      { idx: 33, name: "Status"       },
    ],
  },
  {
    id: "testing",
    label: "R&D Testing",
    icon: FlaskConical,
    accent: "#10B981",   // emerald
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    cols: [
      { idx: 34, name: "R&D SPOC"     },
      { idx: 35, name: "Test Start"   },
      { idx: 37, name: "Test Type"    },
      { idx: 41, name: "Verdict"      },
      { idx: 43, name: "Rejection"    },
    ],
  },
  {
    id: "closure",
    label: "Closure",
    icon: Lock,
    accent: "#F59E0B",   // amber
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    cols: [
      { idx: 44, name: "Part Code"    },
      { idx: 45, name: "Cost (₹)"     },
    ],
  },
] as const

const FULL_ACCESS_ROLES = ["sourcing_head", "super_admin", "rnd_head"]
const SPOC_NAMES        = ["Rahul Sharma", "Karan Mehta", "Priya Rajan", "Amit Kumar", "Varun Joshi"]

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, color, bg, iconColor,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  bg: string
  iconColor: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4 min-w-[148px]">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon className="w-4.5 h-4.5" style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-[26px] font-black leading-none tabular-nums" style={{ color }}>{value}</p>
        <p className="text-[11px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">{label}</p>
      </div>
    </div>
  )
}

function TATBadge({ health }: { health: string }) {
  const cfgs: Record<string, { label: string; className: string }> = {
    green: { label: "On Track",  className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
    amber: { label: "At Risk",   className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200"       },
    red:   { label: "Due Today", className: "bg-red-50 text-red-600 ring-1 ring-red-200"             },
    black: { label: "Overdue",   className: "bg-red-100 text-red-700 ring-1 ring-red-300"            },
  }
  const cfg = cfgs[health] ?? { label: "—", className: "bg-slate-100 text-slate-500" }
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap", cfg.className)}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current opacity-70" />
      {cfg.label}
    </span>
  )
}

function StatusBadge({ value }: { value: string }) {
  if (!value || value === "—") return <span className="text-slate-300">—</span>
  const approved = value.toLowerCase().includes("approv") && !value.toLowerCase().includes("not")
  const rejected = value.toLowerCase().includes("not") || value.toLowerCase().includes("reject")
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap ring-1",
      approved ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : rejected ? "bg-red-50 text-red-600 ring-red-200"
      : "bg-slate-100 text-slate-600 ring-slate-200"
    )}>
      {value}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AllReportsPage() {
  const { npds }  = useNPDs()
  const router    = useRouter()
  const [search,  setSearch]   = useState("")
  const [role,    setRole]     = useState("rnd_user")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    project: true, supplier: true, dispatch: false, testing: false, closure: false,
  })

  useEffect(() => {
    setRole(localStorage.getItem("poc_role") || "rnd_user")
    const h = (e: CustomEvent) => setRole(e.detail)
    window.addEventListener("rolechange", h as EventListener)
    return () => window.removeEventListener("rolechange", h as EventListener)
  }, [])

  const visible = (() => {
    if (FULL_ACCESS_ROLES.includes(role)) return npds
    if (role === "rnd_user") return npds.filter(n => (n.raisedBy ?? "rnd_user") === "rnd_user")
    if (SPOC_NAMES.includes(role)) return npds.filter(n => n.spoc === role && n.stage >= 2)
    return npds
  })()

  const filtered = visible.filter(n => {
    const t = search.toLowerCase()
    return !t || n.id.toLowerCase().includes(t) || n.itemName.toLowerCase().includes(t)
      || (n.supplier ?? "").toLowerCase().includes(t) || n.spoc.toLowerCase().includes(t)
  })

  const rows    = filtered.map(n => ({ npd: n, cells: buildNPDRow(n) }))
  const toggle  = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))
  const today   = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  const active  = filtered.filter(n => n.stage < 8).length
  const overdue = filtered.filter(n => n.tatHealth === "black" || n.tatHealth === "red").length
  const gradeA  = filtered.filter(n => n.gradeA).length

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC]">

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-slate-100">

        {/* Top row */}
        <div className="px-8 pt-5 pb-4 flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Back */}
            <button
              onClick={() => router.back()}
              className="mt-0.5 flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            {/* Title block */}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Image src="/amber-logo.png" alt="Amber" width={72} height={24} className="object-contain h-5 w-auto opacity-80" />
                <span className="text-slate-200 select-none">·</span>
                <span className="text-[11px] font-medium text-slate-400">NPD Sourcing Tracker</span>
              </div>
              <h1 className="text-[22px] font-black text-slate-900 tracking-tight leading-tight">
                MIS Report
              </h1>
              <p className="text-[12px] text-slate-400 mt-0.5">
                FY 2025–26 &nbsp;·&nbsp; {today} &nbsp;·&nbsp; {filtered.length} records
              </p>
            </div>
          </div>

          {/* Search + Export */}
          <div className="flex items-center gap-2.5 mt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search NPD, item, supplier…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-56 pl-9 pr-4 py-2 text-[13px] rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={() => downloadMISReport(filtered)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[.98] text-white text-[12px] font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shadow-indigo-200 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export .xlsx
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="px-8 pb-5 flex items-center gap-3 overflow-x-auto">
          <StatCard icon={Layers}        label="Total Records" value={filtered.length} color="#1E293B" bg="#F1F5F9" iconColor="#64748B" />
          <StatCard icon={Activity}      label="Active"        value={active}          color="#065F46" bg="#D1FAE5" iconColor="#059669" />
          <StatCard icon={Star}          label="Grade A"       value={gradeA}          color="#4C1D95" bg="#EDE9FE" iconColor="#7C3AED" />
          <StatCard
            icon={AlertTriangle}
            label="Overdue"
            value={overdue}
            color={overdue > 0 ? "#991B1B" : "#64748B"}
            bg={overdue > 0 ? "#FEE2E2" : "#F1F5F9"}
            iconColor={overdue > 0 ? "#DC2626" : "#94A3B8"}
          />
          <div className="ml-auto shrink-0 text-right hidden md:block">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Showing</p>
            <p className="text-[13px] font-bold text-slate-700 tabular-nums">{filtered.length} / {visible.length}</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="px-8 flex items-stretch gap-0 border-t border-slate-100 overflow-x-auto">
          {GROUPS.map(g => {
            const Icon = g.icon
            const on   = expanded[g.id]
            return (
              <button
                key={g.id}
                onClick={() => toggle(g.id)}
                className="flex items-center gap-2 px-4 py-3 text-[12px] font-semibold border-b-2 transition-all shrink-0 whitespace-nowrap"
                style={{
                  borderBottomColor: on ? g.accent : "transparent",
                  color: on ? g.accent : "#94A3B8",
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {g.label}
                <span
                  className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1", on ? g.pill : "bg-slate-100 text-slate-400 ring-slate-200")}
                >
                  {g.cols.length}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      {/* ── TABLE ────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <table className="border-collapse w-full min-w-max text-[13px]">

          {/* Column headers */}
          <thead className="sticky top-0 z-10">
            {/* Section group row */}
            <tr className="border-b border-slate-200" style={{ background: "#F8FAFC" }}>
              {/* Fixed left columns */}
              <th className="sticky left-0 z-20 bg-[#F8FAFC] px-6 py-3 text-left border-r border-slate-200 whitespace-nowrap" rowSpan={2}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">NPD ID</span>
              </th>
              <th className="bg-[#F8FAFC] px-5 py-3 text-left border-r border-slate-200 whitespace-nowrap" rowSpan={2}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">Item</span>
              </th>
              <th className="bg-[#F8FAFC] px-5 py-3 text-center border-r border-slate-200 whitespace-nowrap" rowSpan={2}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">TAT</span>
              </th>

              {/* Group section headers */}
              {GROUPS.map(g => {
                const Icon    = g.icon
                const colSpan = expanded[g.id] ? g.cols.length : 1
                return (
                  <th
                    key={g.id}
                    colSpan={colSpan}
                    className="px-4 py-2.5 text-left border-r border-slate-200 cursor-pointer select-none"
                    style={{ background: "#F8FAFC", borderTop: `2px solid ${g.accent}20` }}
                    onClick={() => toggle(g.id)}
                  >
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Icon className="w-3 h-3 shrink-0" style={{ color: g.accent }} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: g.accent }}>
                        {g.label}
                      </span>
                      {expanded[g.id]
                        ? <ChevronDown  className="w-3 h-3 ml-auto opacity-30" style={{ color: g.accent }} />
                        : <ChevronRight className="w-3 h-3 ml-auto opacity-30" style={{ color: g.accent }} />}
                    </span>
                  </th>
                )
              })}

              <th className="bg-[#F8FAFC] px-5 py-3 text-center whitespace-nowrap" rowSpan={2}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">Report</span>
              </th>
            </tr>

            {/* Column name sub-row */}
            <tr className="border-b-2 border-slate-200" style={{ background: "#F8FAFC" }}>
              {GROUPS.map(g =>
                expanded[g.id]
                  ? g.cols.map(col => (
                      <th key={col.idx} className="px-4 py-2 text-left border-r border-slate-100 whitespace-nowrap">
                        <span className="text-[10px] font-medium text-slate-400">{col.name}</span>
                      </th>
                    ))
                  : (
                    <th key={g.id + "-ph"} className="w-8 border-r border-slate-100" />
                  )
              )}
            </tr>
          </thead>

          {/* Rows */}
          <tbody className="bg-white divide-y divide-slate-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={99} className="py-24 text-center bg-white">
                  <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-slate-400">No records found</p>
                  <p className="text-[12px] text-slate-300 mt-1">Try adjusting your search</p>
                </td>
              </tr>
            ) : (
              rows.map(({ npd, cells }) => {
                const tatColor = { green: "#10B981", amber: "#F59E0B", red: "#EF4444", black: "#DC2626" }[npd.tatHealth] ?? "#CBD5E1"
                return (
                  <tr
                    key={npd.id}
                    className="group hover:bg-indigo-50/30 transition-colors"
                  >
                    {/* NPD ID — sticky, TAT left border */}
                    <td
                      className="sticky left-0 z-10 bg-white group-hover:bg-indigo-50/30 px-6 py-3.5 border-r border-slate-100 whitespace-nowrap transition-colors"
                      style={{ borderLeft: `3px solid ${tatColor}` }}
                    >
                      <Link
                        href={`/npd/${npd.id}`}
                        className="font-mono text-[12px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 transition-colors"
                      >
                        {npd.id}
                      </Link>
                      {npd.gradeA && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Star className="w-2.5 h-2.5 text-violet-500 fill-violet-500" />
                          <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">Grade A</span>
                        </div>
                      )}
                    </td>

                    {/* Item name + category */}
                    <td className="px-5 py-3.5 border-r border-slate-100 whitespace-nowrap">
                      <p className="text-[13px] font-semibold text-slate-800 max-w-[200px] truncate leading-tight">{npd.itemName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px] truncate">{npd.itemCategory}</p>
                    </td>

                    {/* TAT pill */}
                    <td className="px-5 py-3.5 border-r border-slate-100 text-center whitespace-nowrap">
                      <TATBadge health={npd.tatHealth} />
                    </td>

                    {/* Group data cells */}
                    {GROUPS.map(g =>
                      expanded[g.id]
                        ? g.cols.map(col => {
                            const raw     = cells[col.idx] ?? "—"
                            const isEmpty = raw === "—"
                            const n       = col.name as string
                            const isBadge = n === "Verdict" || n === "Status"
                            return (
                              <td key={col.idx} className="px-4 py-3.5 border-r border-slate-100 whitespace-nowrap max-w-[220px]">
                                {isBadge
                                  ? <StatusBadge value={raw} />
                                  : (
                                    <span
                                      className={cn("block truncate text-[12px]", isEmpty ? "text-slate-200" : "text-slate-600")}
                                      title={isEmpty ? undefined : raw}
                                    >
                                      {raw}
                                    </span>
                                  )}
                              </td>
                            )
                          })
                        : (
                          <td
                            key={g.id + "-ph"}
                            className="px-3 py-3.5 border-r border-slate-100 text-center"
                          >
                            <span
                              className="inline-block w-4 h-0.5 rounded-full opacity-30"
                              style={{ background: g.accent }}
                            />
                          </td>
                        )
                    )}

                    {/* Report link */}
                    <td className="px-5 py-3.5 text-center">
                      <Link
                        href={`/report/${npd.id}`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title={`Full report — ${npd.id}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="shrink-0 px-8 py-3 bg-white border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          Amber Enterprises India Limited &nbsp;·&nbsp; NPD Sourcing Tracker MIS &nbsp;·&nbsp; FY 2025–26
        </span>
        <span className="text-[11px] text-slate-400 tabular-nums">{today}</span>
      </footer>

    </div>
  )
}
