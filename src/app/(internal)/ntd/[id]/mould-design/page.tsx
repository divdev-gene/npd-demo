"use client"
import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import {
  getNTDRecord, getNTDHandoff, getNTDMould, setNTDMould,
  advanceNTDStage, appendActivity, getMouldProgress,
  createVersionedFile, addFileVersion, addFileComment, resolveComment,
  getSLADeadline,
} from "@/lib/ntd"
import type { NTDRecord, NTDMouldData, NTDMouldComponent, NTDRole, MouldReview } from "@/types/ntd"
import { ComponentApprovalBoard } from "@/components/ntd/ComponentApprovalBoard"

function toNTDRole(pocRole: string): NTDRole {
  if (pocRole === "rnd_head") return "rnd_head"
  if (pocRole === "sourcing_head") return "sourcing_head"
  if (pocRole === "super_admin") return "super_admin"
  if (pocRole.startsWith("rnd")) return "rnd"
  if (pocRole.startsWith("sourcing")) return "sourcing"
  return "rnd"
}

function getOrInitMould(id: string): NTDMouldData {
  const existing = getNTDMould(id)
  if (existing) return existing
  const handoff = getNTDHandoff(id)
  if (!handoff) return { redesign_round: 0, components: [], joint_review: null, stage_complete: false }
  const pendingReview: MouldReview = { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "", sla_deadline: "" }
  const components: NTDMouldComponent[] = handoff.components.map(c => ({
    componentId: c.componentId,
    name: c.name,
    mould_3d: createVersionedFile("Mould 3D", "", "system"),
    mfa_ppt: createVersionedFile("MFA PPT", "", "system"),
    rnd_review: { ...pendingReview },
    sourcing_review: { ...pendingReview },
    iteration_no: 1,
    final_status: "pending",
    locked: false,
  }))
  const data: NTDMouldData = { redesign_round: 0, components, joint_review: null, stage_complete: false }
  setNTDMould(id, data)
  return data
}

export default function MouldDesignPage() {
  const params = useParams()
  const id = params.id as string
  const [currentRole, setCurrentRole] = useState("")
  const [record, setRecord] = useState<NTDRecord | null>(null)
  const [mouldData, setMouldData] = useState<NTDMouldData | null>(null)
  const [jointFeedback, setJointFeedback] = useState("")
  const [activeSubStage, setActiveSubStage] = useState<"8A" | "8B">("8A")

  const reload = useCallback(() => {
    setRecord(getNTDRecord(id))
    const data = getOrInitMould(id)
    setMouldData(data)
    const allApproved = data.components.length > 0 && data.components.every(c => c.final_status === "approved")
    setActiveSubStage(allApproved ? "8B" : "8A")
  }, [id])

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
    reload()
    const t = setInterval(reload, 3000)
    return () => clearInterval(t)
  }, [reload])

  if (!record || !mouldData) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Loading...</p>
    </div>
  )

  const ntdRole = toNTDRole(currentRole)
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"
  const isSourcing = currentRole.startsWith("sourcing") || currentRole === "super_admin"
  const { approved, total } = getMouldProgress(id)
  const allComponentsApproved = approved === total && total > 0

  const handleFileAction = (
    componentId: string,
    fileSlot: "ppt" | "design_3d" | "mould_3d" | "mfa_ppt",
    action: "upload" | "revise" | "approve" | "comment" | "resolve",
    data: Record<string, unknown>
  ) => {
    const existing = getOrInitMould(id)
    const now = new Date().toISOString()
    const updated: NTDMouldData = {
      ...existing,
      components: existing.components.map(comp => {
        if (comp.componentId !== componentId) return comp
        const slot = fileSlot as "mould_3d" | "mfa_ppt"
        let file = comp[slot]
        if (!file && action === "upload") {
          file = createVersionedFile(slot === "mould_3d" ? "Mould 3D" : "MFA PPT", String(data.link), currentRole)
          // Set SLA deadline on first upload
          const slaDeadline = getSLADeadline(now)
          return {
            ...comp,
            [slot]: file,
            rnd_review: { ...comp.rnd_review, sla_deadline: slaDeadline },
            sourcing_review: { ...comp.sourcing_review, sla_deadline: slaDeadline },
            final_status: "under_review" as const,
          }
        } else if (file) {
          if (action === "revise") file = addFileVersion(file, String(data.link), currentRole, data.note ? String(data.note) : undefined)
          if (action === "comment") file = addFileComment(file, currentRole, ntdRole, String(data.text), Boolean(data.req))
          if (action === "resolve") file = resolveComment(file, String(data.cid), currentRole)
        }
        return { ...comp, [slot]: file ?? comp[slot] }
      }),
    }
    setNTDMould(id, updated)
    reload()
  }

  const handleMouldReview = (
    componentId: string,
    reviewer: "rnd" | "sourcing",
    verdict: "approved" | "rejected",
    comments: string
  ) => {
    const existing = getOrInitMould(id)
    const now = new Date().toISOString()
    const updated: NTDMouldData = {
      ...existing,
      components: existing.components.map(comp => {
        if (comp.componentId !== componentId) return comp
        const reviewKey = reviewer === "rnd" ? "rnd_review" : "sourcing_review"
        const updatedReview: MouldReview = { verdict, comments, reviewed_by: currentRole, reviewed_at: now, sla_deadline: comp[reviewKey].sla_deadline }
        const updatedComp = { ...comp, [reviewKey]: updatedReview }
        // Determine component status
        const rndDone = reviewer === "rnd" ? true : comp.rnd_review.verdict !== "pending"
        const sourcingDone = reviewer === "sourcing" ? true : comp.sourcing_review.verdict !== "pending"
        const rndVerdict = reviewer === "rnd" ? verdict : comp.rnd_review.verdict
        const sourcingVerdict = reviewer === "sourcing" ? verdict : comp.sourcing_review.verdict
        if (rndDone && sourcingDone) {
          if (rndVerdict === "approved" && sourcingVerdict === "approved") {
            updatedComp.final_status = "approved"
            updatedComp.locked = true
          } else {
            updatedComp.final_status = "revision_required"
          }
        }
        return updatedComp
      }),
    }
    // Check if all approved → move to 8B
    const allApproved = updated.components.every(c => c.final_status === "approved")
    if (allApproved && !existing.components.every(c => c.final_status === "approved")) {
      appendActivity(id, currentRole, ntdRole, 8, "stage_complete", "All mould components approved — moving to 8B joint review", undefined, "8A")
    }
    setNTDMould(id, updated)
    reload()
  }

  const handleSubmitJointFeedback = () => {
    if (!jointFeedback.trim()) return
    const existing = getOrInitMould(id)
    const now = new Date().toISOString()
    setNTDMould(id, {
      ...existing,
      joint_review: {
        feedback: jointFeedback.trim(),
        feedback_by: currentRole,
        feedback_at: now,
        supplier_deadline: getSLADeadline(now),
        supplier_files: [],
        supplier_uploaded_at: "",
        approved: false,
        approved_by: "",
        approved_at: "",
      },
    })
    appendActivity(id, currentRole, ntdRole, 8, "stage_complete", "Joint review feedback submitted to supplier", undefined, "8B")
    setJointFeedback("")
    reload()
  }

  const handleApproveJointReview = () => {
    const existing = getOrInitMould(id)
    if (!existing.joint_review) return
    const updated: NTDMouldData = {
      ...existing,
      joint_review: { ...existing.joint_review, approved: true, approved_by: currentRole, approved_at: new Date().toISOString() },
      stage_complete: true,
    }
    setNTDMould(id, updated)
    advanceNTDStage(id, 9, currentRole, ntdRole)
    appendActivity(id, currentRole, ntdRole, 8, "stage_complete", "Mould design complete — joint review approved", undefined, "8B")
    reload()
  }

  const redesignRound = mouldData.redesign_round

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
      <Link href={`/ntd/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to NTD {record.id}
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Stage 8 — Mould Design</h1>
            <p className="text-sm text-slate-500 mt-0.5">{record.title}</p>
          </div>
          <div className="flex gap-2">
            {(["8A", "8B"] as const).map(sub => (
              <button key={sub} onClick={() => setActiveSubStage(sub)}
                disabled={sub === "8B" && !allComponentsApproved}
                className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${activeSubStage === sub ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {sub}
              </button>
            ))}
          </div>
        </div>
        {mouldData.stage_complete && (
          <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="font-semibold text-emerald-800">Mould Design Complete — Advanced to Stage 9.</p>
          </div>
        )}
      </div>

      {activeSubStage === "8A" ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <ComponentApprovalBoard
            components={mouldData.components}
            mode="mould"
            role={ntdRole}
            onFileAction={handleFileAction}
            onMouldReview={handleMouldReview}
            showSLATimer
            redesignRound={redesignRound}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">8B — Joint Review</h2>
          {!mouldData.joint_review ? (
            (isRnd || isSourcing) ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Submit consolidated feedback to supplier for confirmed files:</p>
                <textarea value={jointFeedback} onChange={e => setJointFeedback(e.target.value)}
                  placeholder="Joint feedback for the supplier..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                <button onClick={handleSubmitJointFeedback} disabled={!jointFeedback.trim()}
                  className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
                  Submit Joint Feedback to Supplier
                </button>
              </div>
            ) : <p className="text-sm text-slate-400 italic">Awaiting joint review submission...</p>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Feedback sent to supplier</p>
                <p className="text-sm text-slate-800">{mouldData.joint_review.feedback}</p>
                <p className="text-xs text-slate-400">By {mouldData.joint_review.feedback_by} · Deadline: {new Date(mouldData.joint_review.supplier_deadline).toLocaleString()}</p>
              </div>
              {!mouldData.joint_review.approved && (isRnd || isSourcing) && (
                <button onClick={handleApproveJointReview}
                  className="flex items-center gap-2 text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Approve Joint Review & Advance to Stage 9
                </button>
              )}
              {mouldData.joint_review.approved && (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> Approved by {mouldData.joint_review.approved_by}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
