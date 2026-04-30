"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getStageName } from "@/lib/mockData"
import { useNPDs } from "@/lib/npdContext"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Search, AlertTriangle, Star, Activity, Layers, Filter } from "lucide-react"

const FULL_ACCESS_ROLES = ["sourcing_head", "super_admin", "rnd_head"]
const SPOC_NAMES        = ["Rahul Sharma", "Karan Mehta", "Priya Rajan", "Amit Kumar", "Varun Joshi"]

const TYPE_FILTERS = ["All", "NCD", "ECN", "Compliance", "PP"] as const
type TypeFilter = typeof TYPE_FILTERS[number]

const TAT_ACCENT: Record<string, string> = {
  green: "#10B981",
  amber: "#F59E0B",
  red:   "#EF4444",
  black: "#DC2626",
}

const TAT_LABEL: Record<string, string> = {
  green: "On Track",
  amber: "At Risk",
  red:   "Due Today",
  black: "Overdue",
}

function getRoleLabel(role: string) {
  if (role === "rnd_user") return "Your Requests"
  if (SPOC_NAMES.includes(role)) return `Assigned to ${role}`
  return "All NPD Requests"
}

function getStageTotal(typeOfWork: string) {
  if (typeOfWork.includes("ECN") || typeOfWork.includes("NTD")) return 10
  if (typeOfWork.includes("Compliance")) return 6
  if (typeOfWork.includes("PP")) return 4
  return 8
}

function StageProgress({ stage, typeOfWork }: { stage: number; typeOfWork: string }) {
  const total = getStageTotal(typeOfWork)
  const pct = Math.round((stage / total) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-500 tabular-nums">{stage}/{total}</span>
        <span className="text-[10px] font-bold text-slate-400">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-slate-100 overflow-hidden w-28">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: stage >= total ? "#10B981" : stage >= 7 ? "#8B5CF6" : "#1E40AF",
          }}
        />
      </div>
    </div>
  )
}

export default function ArchivePage() {
  const { npds } = useNPDs()
  const [searchTerm,  setSearchTerm]  = useState("")
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>("All")
  const [currentRole, setCurrentRole] = useState("rnd_user")

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") || "rnd_user")
    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener("rolechange", onRoleChange as EventListener)
    return () => window.removeEventListener("rolechange", onRoleChange as EventListener)
  }, [])

  const visibleNPDs = (() => {
    if (FULL_ACCESS_ROLES.includes(currentRole)) return npds
    if (currentRole === "rnd_user") return npds.filter(n => (n.raisedBy ?? "rnd_user") === "rnd_user")
    if (SPOC_NAMES.includes(currentRole)) return npds.filter(n => n.spoc === currentRole && n.stage >= 2)
    return npds
  })()

  const typeFiltered = typeFilter === "All" ? visibleNPDs : visibleNPDs.filter(n => {
    if (typeFilter === "NCD")        return n.typeOfWork.includes("NCD") || n.typeOfWork.includes("New Component")
    if (typeFilter === "ECN")        return n.typeOfWork.includes("ECN") || n.typeOfWork.includes("Engineering Change")
    if (typeFilter === "Compliance") return n.typeOfWork.includes("Compliance")
    if (typeFilter === "PP")         return n.typeOfWork.includes("PP")
    return true
  })

  const filteredNPDs = typeFiltered.filter(npd => {
    const term = searchTerm.toLowerCase()
    return (
      npd.id.toLowerCase().includes(term) ||
      npd.itemName.toLowerCase().includes(term) ||
      npd.supplier.toLowerCase().includes(term) ||
      npd.spoc.toLowerCase().includes(term)
    )
  })

  const total   = visibleNPDs.length
  const active  = visibleNPDs.filter(n => n.stage < 10).length
  const overdue = visibleNPDs.filter(n => n.tatHealth === "black" || n.tatHealth === "red").length
  const gradeA  = visibleNPDs.filter(n => n.gradeA).length
  const showRaisedBy = FULL_ACCESS_ROLES.includes(currentRole)

  const kpis = [
    { label: "Total NPDs",     value: total,  icon: Layers,        color: "#1E40AF", bg: "#EFF6FF" },
    { label: "Active",         value: active, icon: Activity,      color: "#059669", bg: "#ECFDF5" },
    { label: "Overdue / Risk", value: overdue,icon: AlertTriangle,  color: overdue > 0 ? "#DC2626" : "#64748B", bg: overdue > 0 ? "#FEF2F2" : "#F8FAFC", alert: overdue > 0 },
    { label: "Grade A",        value: gradeA, icon: Star,          color: "#7C3AED", bg: "#F5F3FF" },
  ]

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{getRoleLabel(currentRole)}</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Search and filter through your visible NPD repository.</p>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">{total} total records</span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <div key={i} className="bg-white border border-slate-100 rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: k.bg }}>
                <Icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</p>
                <p className="text-xl font-bold leading-tight" style={{ color: k.alert ? k.color : "#0F172A" }}>{k.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, item, supplier, SPOC…"
              className="w-full pl-9 pr-3 py-1.5 text-[13px] text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {TYPE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: typeFilter === f ? "#0F172A" : "#F1F5F9",
                  color: typeFilter === f ? "#FFFFFF" : "#64748B",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11px] text-slate-400 font-medium whitespace-nowrap">
            {filteredNPDs.length} of {visibleNPDs.length}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100" style={{ background: "#FAFAFA" }}>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] py-3 pl-5">NPD ID</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] py-3">Item</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] py-3">Type</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] py-3">Supplier</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] py-3">Progress</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] py-3">TAT Status</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] py-3">SPOC</TableHead>
                {showRaisedBy && <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] py-3">Raised By</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNPDs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showRaisedBy ? 8 : 7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Layers className="w-8 h-8 text-slate-200" />
                      <p className="text-[13px] font-semibold text-slate-400">No NPDs found</p>
                      <p className="text-[12px] text-slate-400">Try adjusting your search or filter</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredNPDs.map(npd => {
                  const accent = TAT_ACCENT[npd.tatHealth] ?? "#10B981"
                  return (
                    <TableRow
                      key={npd.id}
                      className="group cursor-pointer border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
                    >
                      <TableCell className="py-3.5 pl-5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-8 rounded-full shrink-0" style={{ background: accent }} />
                          <div>
                            <Link href={`/npd/${npd.id}`} className="font-mono text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline block">
                              {npd.id}
                            </Link>
                            {npd.gradeA && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full mt-0.5">
                                <Star className="w-2 h-2" /> Grade A
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <p className="text-[13px] font-semibold text-slate-800 group-hover:text-slate-900 leading-tight">{npd.itemName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{npd.productLine}</p>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {npd.typeOfWork.split(' (')[0].split(' ').slice(0, 2).join(' ')}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[140px] truncate">{npd.itemCategory}</p>
                      </TableCell>
                      <TableCell className="py-3.5">
                        {npd.supplier === "Pending Assignment" ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending
                          </span>
                        ) : (
                          <span className="text-[13px] text-slate-700">{npd.supplier}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <p className="text-[11px] text-slate-500 font-medium mb-1.5 truncate max-w-[160px]">
                          {getStageName(npd.stage, npd.typeOfWork)}
                        </p>
                        <StageProgress stage={npd.stage} typeOfWork={npd.typeOfWork} />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                          style={{
                            color: accent,
                            background: accent + "18",
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
                          {TAT_LABEL[npd.tatHealth]}
                          {!["black","red"].includes(npd.tatHealth) && ` · ${npd.tatDaysRemaining}d`}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="text-[12px] font-medium text-slate-600">{npd.spoc}</span>
                      </TableCell>
                      {showRaisedBy && (
                        <TableCell className="py-3.5 text-[11px] text-slate-400">
                          {npd.raisedBy === "rnd_head" ? "R&D Head" : "R&D User"}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between" style={{ background: "#FAFAFA" }}>
          <span className="text-[11px] text-slate-400 font-medium">
            Showing {filteredNPDs.length} record{filteredNPDs.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-1.5">
            <button className="px-3 py-1 border border-slate-200 rounded-lg text-[11px] text-slate-400 cursor-not-allowed">← Previous</button>
            <button className="px-3 py-1 border border-slate-200 rounded-lg text-[11px] text-slate-500 hover:bg-white transition-colors">Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
