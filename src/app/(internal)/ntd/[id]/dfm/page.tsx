"use client"
import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import {
  getNTDRecord, getNTDHandoff, getNTDDFM, setNTDDFM,
  advanceNTDStage, appendActivity,
  createVersionedFile, addFileVersion, addFileComment, resolveComment, approveFile,
} from "@/lib/ntd"
import type { NTDRecord, NTDDFMData, NTDDFMComponent, NTDRole } from "@/types/ntd"
import { ComponentApprovalBoard } from "@/components/ntd/ComponentApprovalBoard"

function toNTDRole(pocRole: string): NTDRole {
  if (pocRole === "rnd_head") return "rnd_head"
  if (pocRole === "sourcing_head") return "sourcing_head"
  if (pocRole === "super_admin") return "super_admin"
  if (pocRole.startsWith("rnd")) return "rnd"
  if (pocRole.startsWith("sourcing")) return "sourcing"
  return "rnd"
}

export default function DFMPage() {
  const params = useParams()
  const id = params.id as string
  const [currentRole, setCurrentRole] = useState("")
  const [record, setRecord] = useState<NTDRecord | null>(null)
  const [dfmData, setDFMData] = useState<NTDDFMData | null>(null)

  const reload = useCallback(() => {
    setRecord(getNTDRecord(id))
    setDFMData(getDFMOrInit(id))
  }, [id])

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
    reload()
    const t = setInterval(reload, 3000)
    return () => clearInterval(t)
  }, [reload])

  if (!record || !dfmData) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Loading...</p>
    </div>
  )

  const ntdRole = toNTDRole(currentRole)
  const approved = dfmData.components.filter(c => c.final_status === "approved").length
  const total = dfmData.components.length
  const allApproved = approved === total && total > 0

  const handleFileAction = (
    componentId: string,
    fileSlot: "ppt" | "design_3d" | "mould_3d" | "mfa_ppt",
    action: "upload" | "revise" | "approve" | "comment" | "resolve",
    data: Record<string, unknown>
  ) => {
    const existing = getDFMOrInit(id)
    const updated: NTDDFMData = {
      ...existing,
      components: existing.components.map(comp => {
        if (comp.componentId !== componentId) return comp
        const slot = fileSlot as "ppt" | "design_3d"
        let file = comp[slot]
        if (!file && action === "upload") {
          file = createVersionedFile(slot === "ppt" ? "DFM PPT" : "3D Design", String(data.link), currentRole)
        } else if (file) {
          if (action === "revise") file = addFileVersion(file, String(data.link), currentRole, data.note ? String(data.note) : undefined)
          if (action === "approve") file = approveFile(file, currentRole)
          if (action === "comment") file = addFileComment(file, currentRole, ntdRole, String(data.text), Boolean(data.req))
          if (action === "resolve") file = resolveComment(file, String(data.cid), currentRole)
        }
        const updatedComp: NTDDFMComponent = { ...comp, [slot]: file ?? comp[slot] }
        // Update status based on file state
        if (updatedComp.ppt && updatedComp.design_3d) {
          const bothHaveFiles = updatedComp.ppt.current_version > 0 && updatedComp.design_3d.current_version > 0
          if (bothHaveFiles && updatedComp.final_status === "pending") {
            updatedComp.final_status = "under_review"
          }
          if (updatedComp.design_3d.approved && updatedComp.ppt.approved && updatedComp.final_status !== "approved") {
            updatedComp.final_status = "approved"
            updatedComp.approved_by = currentRole
            updatedComp.approved_at = new Date().toISOString()
          }
        }
        return updatedComp
      }),
      stage_complete: existing.stage_complete,
      po_activity: existing.po_activity,
    }
    // Check if all approved
    const allDone = updated.components.every(c => c.final_status === "approved")
    if (allDone && !updated.stage_complete) {
      updated.stage_complete = true
      setNTDDFM(id, updated)
      advanceNTDStage(id, 8, currentRole, ntdRole)
      appendActivity(id, currentRole, ntdRole, 7, "stage_complete", "DFM complete — all components approved")
    } else {
      setNTDDFM(id, updated)
    }
    reload()
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
      <Link href={`/ntd/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to NTD {record.id}
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Stage 7 — DFM Review</h1>
            <p className="text-sm text-slate-500 mt-0.5">{record.title}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-800">{approved} / {total}</p>
            <p className="text-xs text-slate-400">Components Approved</p>
          </div>
        </div>
        {allApproved && (
          <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="font-semibold text-emerald-800">DFM Complete — All components approved. Advanced to Stage 8.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <ComponentApprovalBoard
          components={dfmData.components}
          mode="dfm"
          role={ntdRole}
          onFileAction={handleFileAction}
        />
      </div>
    </div>
  )
}

function getDFMOrInit(id: string): NTDDFMData {
  const existing = getNTDDFM(id)
  if (existing) return existing
  // Initialize from handoff
  const handoff = getNTDHandoff(id)
  if (!handoff) return { components: [], po_activity: { raised: false, po_number: "", raised_by: "", raised_at: "" }, stage_complete: false }
  const components: NTDDFMComponent[] = handoff.components.map(c => ({
    componentId: c.componentId,
    name: c.name,
    ppt: createVersionedFile("DFM PPT", "", "system"),
    design_3d: createVersionedFile("3D Design", "", "system"),
    iteration_no: 1,
    final_status: "pending",
  }))
  const data: NTDDFMData = { components, po_activity: { raised: false, po_number: "", raised_by: "", raised_at: "" }, stage_complete: false }
  setNTDDFM(id, data)
  return data
}
