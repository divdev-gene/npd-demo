"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Wrench, ChevronRight } from "lucide-react"
import { getAllNTDRecords } from "@/lib/ntd"
import type { NTDRecord } from "@/types/ntd"

const STAGE_NAMES: Record<number, string> = {
  1: "Initiation", 2: "Spec & Sign-off", 3: "RFQ Dispatch", 4: "Quotation",
  5: "Supplier Select", 6: "Design Handoff", 7: "DFM", 8: "Mould Design",
  9: "Manufacturing", 10: "Trials", 11: "Commissioning",
}

export default function NTDListPage() {
  const router = useRouter()
  const [records, setRecords] = useState<NTDRecord[]>([])
  const [search, setSearch] = useState("")
  useEffect(() => {
    const load = () => setRecords([...getAllNTDRecords()].reverse())
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [])

  const filtered = records.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Wrench className="w-5 h-5 text-blue-800" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tool Development</h1>
            <p className="text-sm text-slate-500">{records.length} record{records.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title or NTD ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {records.length === 0 ? "No tool development records yet" : "No records match your search"}
          </p>
          
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">NTD ID</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-48">Stage</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Supplier</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Components</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Created By</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(r => {
                const pct = Math.round((r.current_stage / 11) * 100)
                return (
                  <tr key={r.id}
                    onClick={() => router.push(`/ntd/${r.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">{r.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{r.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-600">
                          {r.current_stage}/11 — {STAGE_NAMES[r.current_stage] ?? ""}
                        </p>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-36">
                          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {r.supplier ?? <span className="text-slate-400 italic">TBD</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {r.component_count != null ? r.component_count : <span className="text-slate-400 italic">TBD</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{r.created_by}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === "complete" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                        {r.status === "complete" ? "Complete" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
