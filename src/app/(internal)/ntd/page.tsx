"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Wrench, Search, Plus } from "lucide-react"
import { getAllNTDRecords } from "@/lib/ntd"
import type { NTDRecord } from "@/types/ntd"

function StageProgress({ stage }: { stage: number }) {
  const total = 9
  const pct = Math.round((stage / total) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-slate-500 tabular-nums">Stage {stage} / {total}</span>
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

export default function NTDListPage() {
  const router = useRouter()
  const [records, setRecords] = useState<NTDRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentRole, setCurrentRole] = useState("rnd_user")

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") || "rnd_user")
    setRecords(getAllNTDRecords())

    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener("rolechange", onRoleChange as EventListener)
    return () => window.removeEventListener("rolechange", onRoleChange as EventListener)
  }, [])

  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"

  const filtered = records.filter((r) => {
    const q = searchTerm.toLowerCase()
    return r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900">Tool Development</h1>
            <p className="text-[11px] text-slate-400">New Tool Development (NTD) requests</p>
          </div>
        </div>
        {isRnd && (
          <button
            onClick={() => router.push("/ntd/new")}
            className="flex items-center gap-1.5 bg-slate-900 text-white text-[12px] font-semibold px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Tool Development
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 bg-white border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by NTD ID or title…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Wrench className="w-6 h-6 text-slate-400" />
            </div>
            {records.length === 0 ? (
              <>
                <p className="text-[14px] font-semibold text-slate-700">No NTD records yet</p>
                <p className="text-[12px] text-slate-400 mt-1">
                  {isRnd
                    ? 'Click "New Tool Development" to create the first NTD request.'
                    : "No tool development requests have been created yet."}
                </p>
              </>
            ) : (
              <>
                <p className="text-[14px] font-semibold text-slate-700">No results found</p>
                <p className="text-[12px] text-slate-400 mt-1">Try adjusting your search term.</p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">NTD ID</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Title</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Components</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Stage</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Supplier</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Created By</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Created At</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => router.push(`/ntd/${record.id}`)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors last:border-b-0"
                  >
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-600 font-medium">{record.id}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px] truncate">{record.title}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{record.component_count}</td>
                    <td className="px-4 py-3">
                      <StageProgress stage={record.current_stage} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[12px]">
                      {record.supplier ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[12px]">{record.created_by}</td>
                    <td className="px-4 py-3 text-slate-400 text-[12px] tabular-nums">
                      {new Date(record.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {record.current_stage >= 9 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          In Progress
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
