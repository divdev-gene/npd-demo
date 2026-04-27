"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getStageName } from "@/lib/mockData"
import { useNPDs } from "@/lib/npdContext"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, AlertTriangle, Star, Activity, Layers } from "lucide-react"

const FULL_ACCESS_ROLES = ["sourcing_head", "super_admin", "rnd_head"]
const SPOC_NAMES = ["Rahul Sharma", "Karan Mehta", "Priya Rajan", "Amit Kumar", "Varun Joshi"]

const TYPE_FILTERS = ["All", "NCD", "ECN", "Compliance", "PP"] as const
type TypeFilter = typeof TYPE_FILTERS[number]

const TAT_ROW: Record<string, string> = {
  green: "",
  amber: "bg-amber-100/70",
  red:   "bg-red-100/70",
  black: "bg-red-200/80",
}

const TAT_CHIP: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red:   "bg-red-100 text-red-700",
  black: "bg-red-600 text-white",
}

const TAT_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red:   "bg-red-500",
  black: "bg-white animate-pulse",
}

function getRoleLabel(role: string) {
  if (role === "rnd_user") return "Your Requests"
  if (SPOC_NAMES.includes(role)) return `Assigned to ${role}`
  return "All NPD Requests"
}

function StageBar({ stage, total = 10 }: { stage: number; total?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px]">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-3 rounded-sm ${i < stage ? "bg-blue-900" : "bg-slate-200"}`}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold text-slate-500 tabular-nums">{stage}/{total}</span>
    </div>
  )
}

export default function ArchivePage() {
  const { npds } = useNPDs()
  const [searchTerm,   setSearchTerm]   = useState("")
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>("All")
  const [currentRole,  setCurrentRole]  = useState("rnd_user")

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
    if (typeFilter === "NCD") return n.typeOfWork.includes("NCD") || n.typeOfWork.includes("New Component")
    if (typeFilter === "ECN") return n.typeOfWork.includes("ECN") || n.typeOfWork.includes("Engineering Change")
    if (typeFilter === "Compliance") return n.typeOfWork.includes("Compliance")
    if (typeFilter === "PP") return n.typeOfWork.includes("PP")
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

  // KPIs
  const total    = visibleNPDs.length
  const active   = visibleNPDs.filter(n => n.stage < 10).length
  const overdue  = visibleNPDs.filter(n => n.tatHealth === "black" || n.tatHealth === "red").length
  const gradeA   = visibleNPDs.filter(n => n.gradeA).length

  const showRaisedBy = FULL_ACCESS_ROLES.includes(currentRole)

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{getRoleLabel(currentRole)}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Search and filter through your visible NPD repository.</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">{total}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">{active}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue / At Risk</p>
            <p className={`text-xl font-bold leading-tight ${overdue > 0 ? "text-red-600" : "text-slate-900"}`}>{overdue}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade A</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">{gradeA}</p>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Toolbar */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search ID, item, supplier, SPOC…"
                className="pl-8 bg-slate-50 border-slate-200 text-sm h-8"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="text-xs text-slate-400 ml-auto">
              {filteredNPDs.length} of {visibleNPDs.length} results
            </span>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2">
            {TYPE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  typeFilter === f
                    ? "bg-blue-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">NPD ID</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Item</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Type</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Supplier</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Progress</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">TAT</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">SPOC</TableHead>
                {showRaisedBy && <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Raised By</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNPDs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showRaisedBy ? 8 : 7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Layers className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-medium">No NPDs found</p>
                      <p className="text-xs">Try adjusting your search or filter</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredNPDs.map(npd => (
                  <TableRow
                    key={npd.id}
                    className={`cursor-pointer group transition-colors ${
                      npd.tatHealth === "black" ? TAT_ROW.black + " hover:bg-red-300/80"   :
                      npd.tatHealth === "red"   ? TAT_ROW.red   + " hover:bg-red-200/80"   :
                      npd.tatHealth === "amber" ? TAT_ROW.amber + " hover:bg-amber-200/80" :
                      "hover:bg-blue-50/40"
                    }`}
                  >
                    <TableCell className={`font-medium border-l-4 ${
                      npd.tatHealth === "black" ? "border-l-red-600"   :
                      npd.tatHealth === "red"   ? "border-l-red-400"   :
                      npd.tatHealth === "amber" ? "border-l-amber-400" :
                      "border-l-transparent"
                    }`}>
                      <Link href={`/npd/${npd.id}`} className="text-blue-700 hover:underline font-mono text-xs">
                        {npd.id}
                      </Link>
                      {npd.gradeA && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                          <Star className="w-2.5 h-2.5" /> A
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900 text-sm group-hover:text-blue-900 transition-colors leading-tight">{npd.itemName}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{npd.productLine}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {npd.typeOfWork.split(' (')[0].split(' ').slice(0, 2).join(' ')}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1 max-w-[160px] truncate">{npd.itemCategory}</div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {npd.supplier === "Pending Assignment" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                          Pending Assignment
                        </span>
                      ) : (
                        <span className="text-slate-700">{npd.supplier}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-[11px] text-slate-600 font-medium mb-1.5 truncate max-w-[160px]">
                        {getStageName(npd.stage, npd.typeOfWork)}
                      </div>
                      <StageBar stage={npd.stage} />
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${TAT_CHIP[npd.tatHealth]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${TAT_DOT[npd.tatHealth]}`} />
                        {npd.tatHealth === "black" ? "Overdue" :
                         npd.tatHealth === "red"   ? "Due Today" :
                         `${npd.tatDaysRemaining}d left`}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{npd.spoc}</TableCell>
                    {showRaisedBy && (
                      <TableCell className="text-xs text-slate-400">
                        {npd.raisedBy === "rnd_head" ? "R&D Head" : "R&D User"}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 bg-slate-50/30">
          <span>{filteredNPDs.length} record{filteredNPDs.length !== 1 ? "s" : ""}</span>
          <div className="flex gap-1.5">
            <button className="px-3 py-1 border border-slate-200 rounded text-slate-400 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 border border-slate-200 rounded text-slate-500 hover:bg-slate-100">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
