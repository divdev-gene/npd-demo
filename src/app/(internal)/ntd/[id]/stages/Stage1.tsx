"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, FileText, Box } from "lucide-react"
import { getNTDInitiation, setNTDInitiation, updateNTDStage } from "@/lib/ntd"
import type { NTDInitiationData } from "@/types/ntd"

interface Stage1Props {
  ntdId: string
  currentRole: string
  onStageAdvance: () => void
}

export default function Stage1({ ntdId, currentRole, onStageAdvance }: Stage1Props) {
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"

  const [initiation, setInitiation] = useState<NTDInitiationData | null>(null)

  useEffect(() => {
    setInitiation(getNTDInitiation(ntdId))
  }, [ntdId])

  function handleApprove() {
    if (!initiation) return
    const updated: NTDInitiationData = { ...initiation, status: "approved" }
    setNTDInitiation(ntdId, updated)
    updateNTDStage(ntdId, 2)
    setInitiation(updated)
    onStageAdvance()
  }

  if (!initiation) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <p className="text-[13px] text-slate-400">No initiation data found for this NTD.</p>
      </div>
    )
  }

  const isApproved = initiation.status === "approved"

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
      {/* Stage header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <span className="text-[12px] font-bold text-blue-700">1</span>
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-slate-800">Tool Initiation &amp; R&amp;D Brief</h2>
          <p className="text-[12px] text-slate-500">
            R&amp;D submits the tool initiation brief, master 3D data package, and component list.
          </p>
        </div>
      </div>

      {/* Info panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Brief Document</p>
          {initiation.brief_doc ? (
            <a
              href={initiation.brief_doc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1.5 break-all"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              {initiation.brief_doc}
            </a>
          ) : (
            <span className="text-[13px] text-slate-400">Not provided</span>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Master 3D Package</p>
          {initiation.master_3d ? (
            <a
              href={initiation.master_3d}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1.5 break-all"
            >
              <Box className="w-3.5 h-3.5 shrink-0" />
              {initiation.master_3d}
            </a>
          ) : (
            <span className="text-[13px] text-slate-400">Not provided</span>
          )}
        </div>
      </div>

      {/* Component list */}
      <div>
        <p className="text-[12px] font-semibold text-slate-600 mb-2">
          Component List ({initiation.components.length})
        </p>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2 text-left font-semibold text-slate-500 w-24">Component ID</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Name</th>
              </tr>
            </thead>
            <tbody>
              {initiation.components.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-center text-slate-400">
                    No components defined
                  </td>
                </tr>
              ) : (
                initiation.components.map((comp, i) => (
                  <tr key={comp.componentId} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-600">{comp.componentId}</td>
                    <td className="px-4 py-2.5 text-slate-800">{comp.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submitted at */}
      {initiation.submitted_at && (
        <p className="text-[11px] text-slate-400">
          Submitted: {new Date(initiation.submitted_at).toLocaleString()}
        </p>
      )}

      {/* Approve action or completion strip */}
      {isApproved ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[13px] font-semibold text-emerald-700">
            Approved — Routed to Sourcing
          </span>
        </div>
      ) : (
        isRnd && (
          <div className="pt-2">
            <button
              onClick={handleApprove}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Approve &amp; Route to Sourcing
            </button>
          </div>
        )
      )}
    </div>
  )
}
