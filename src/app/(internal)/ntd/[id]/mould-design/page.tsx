"use client"
import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ExternalLink,
  FileText, Link2, Copy, Check as CheckIcon, RefreshCcw, ClipboardCheck,
  Clock, AlertTriangle,
} from "lucide-react"
import {
  getNTDRecord, getNTDHandoff, getNTDMould, setNTDMould, getNTDDFM,
  getNTDRedesign, setNTDRedesign,
  advanceNTDStage, appendActivity, getMouldProgress,
  createVersionedFile, addFileVersion, addFileComment, resolveComment,
  getSLADeadline, getActiveCommodities,
} from "@/lib/ntd"
import type { NTDRecord, NTDMouldData, NTDMouldComponent, NTDRole, MouldReview, NTDDFMData, VersionedFile } from "@/types/ntd"
import { ComponentApprovalBoard } from "@/components/ntd/ComponentApprovalBoard"

// ─── 8B per-commodity types ───────────────────────────────────

type Mould8BCommodityRecord = {
  feedback: string
  feedback_by: string
  feedback_at: string
  supplier_deadline: string    // feedback_at + 24hrs
  supplier_files: VersionedFile[]
  supplier_uploaded_at?: string
  approved: boolean
  approved_by?: string
  approved_at?: string
}

type Mould8BData = Record<string, Mould8BCommodityRecord>

function getMould8B(ntdId: string): Mould8BData {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(`ntd_mould_8b_${ntdId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setMould8B(ntdId: string, data: Mould8BData): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`ntd_mould_8b_${ntdId}`, JSON.stringify(data))
}

// ─── Helpers ──────────────────────────────────────────────────

function toNTDRole(pocRole: string): NTDRole {
  if (pocRole === "rnd_head") return "rnd_head"
  if (pocRole === "sourcing_head") return "sourcing_head"
  if (pocRole === "super_admin") return "super_admin"
  if (pocRole.startsWith("rnd")) return "rnd"
  if (pocRole.startsWith("sourcing") || ["Rahul Sharma","Karan Mehta","Priya Rajan","Amit Kumar","Varun Joshi","Rohan Desai"].includes(pocRole)) return "sourcing"
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

/** Format remaining time from now to deadline */
function formatCountdown(deadline: string): { label: string; status: "ok" | "warning" | "overdue" } {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return { label: "OVERDUE", status: "overdue" }
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const label = `${hours}h ${mins}m remaining`
  return { label, status: diff < 4 * 60 * 60 * 1000 ? "warning" : "ok" }
}

// ─── Page ─────────────────────────────────────────────────────

export default function MouldDesignPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [currentRole, setCurrentRole] = useState("")
  const [record, setRecord] = useState<NTDRecord | null>(null)
  const [mouldData, setMouldData] = useState<NTDMouldData | null>(null)
  const [dfmData, setDFMData] = useState<NTDDFMData | null>(null)
  const [redesignData, setRedesignData] = useState<ReturnType<typeof getNTDRedesign>>(null)
  const [mould8B, setMould8BState] = useState<Mould8BData>({})
  const [commodities, setCommodities] = useState<string[]>([])

  // 8A commodity filter
  const [selectedCommodity, setSelectedCommodity] = useState<string>("All")

  // 8A / 8B sub-stage tab
  const [activeSubStage, setActiveSubStage] = useState<"8A" | "8B">("8A")

  // per-commodity feedback text state
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({})

  const [jointFeedback, setJointFeedback] = useState("")
  const [dfmPanelOpen, setDfmPanelOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const reload = useCallback(() => {
    setRecord(getNTDRecord(id))
    const data = getOrInitMould(id)
    setMouldData(data)
    setDFMData(getNTDDFM(id))
    setRedesignData(getNTDRedesign(id))
    setMould8BState(getMould8B(id))
    setCommodities(getActiveCommodities(id))
    const allApproved = data.components.length > 0 && data.components.every(c => c.final_status === "approved")
    setActiveSubStage(prev => {
      // Only auto-advance to 8B; never auto-revert
      if (allApproved && prev === "8A") return "8B"
      return prev
    })
  }, [id])

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
    reload()
  }, [reload])

  // Poll every 3s
  useEffect(() => {
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
  const SOURCING_SPOC_ROLES = ["Rahul Sharma", "Karan Mehta", "Priya Rajan", "Amit Kumar", "Varun Joshi", "Rohan Desai"]
  const isSourcing = currentRole.startsWith("sourcing") || SOURCING_SPOC_ROLES.includes(currentRole) || currentRole === "super_admin"
  const { approved, total } = getMouldProgress(id)
  const allComponentsApproved = approved === total && total > 0

  // 8B completion check
  const all8BComplete = commodities.length > 0 && commodities.every(c => mould8B[c]?.approved === true)

  // ─── handlers ─────────────────────────────────────────────────

  const handleFileAction = (
    componentId: string,
    fileSlot: "ppt" | "design_3d" | "mould_3d" | "mfa_ppt" | "rnd_doc",
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
        const pendingReview: MouldReview = { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "", sla_deadline: getSLADeadline(now) }

        if (!file && action === "upload") {
          file = createVersionedFile(slot === "mould_3d" ? "Mould 3D" : "MFA PPT", String(data.link), currentRole)
          return {
            ...comp,
            [slot]: file,
            rnd_review: pendingReview,
            sourcing_review: pendingReview,
            final_status: "under_review" as const,
          }
        } else if (file) {
          if (action === "revise") {
            file = addFileVersion(file, String(data.link), currentRole, data.note ? String(data.note) : undefined)
            if (comp.final_status === "revision_required") {
              return {
                ...comp,
                [slot]: file,
                rnd_review: pendingReview,
                sourcing_review: pendingReview,
                final_status: "under_review" as const,
                iteration_no: (comp.iteration_no ?? 1) + 1,
              }
            }
          }
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
    const allApproved = updated.components.every(c => c.final_status === "approved")
    if (allApproved && !existing.components.every(c => c.final_status === "approved")) {
      appendActivity(id, currentRole, ntdRole, 8, "stage_complete", "All mould components approved — moving to 8B joint review", undefined, "8A")
    }
    setNTDMould(id, updated)

    // Resolve active redesign round if all its failed components are now approved
    const redesign = getNTDRedesign(id)
    if (redesign) {
      const activeRound = redesign.redesign_rounds.slice().reverse().find(r => !r.resolved_at)
      if (activeRound) {
        const allRoundComponentsApproved = activeRound.failed_component_ids.every(cid =>
          updated.components.find(c => c.componentId === cid)?.final_status === "approved"
        )
        if (allRoundComponentsApproved) {
          setNTDRedesign(id, {
            redesign_rounds: redesign.redesign_rounds.map(r =>
              r.round_no === activeRound.round_no
                ? { ...r, resolved_at: new Date().toISOString() }
                : r
            )
          })
          appendActivity(id, currentRole, ntdRole, 10, "stage_complete",
            `Redesign Round ${activeRound.round_no} complete — all failed components approved. Trial T${activeRound.triggered_by_trial + 1} can now be initiated.`)
        }
      }
    }
    reload()
  }

  // 8B handlers
  const handleSubmitJointFeedback = (commodity: string) => {
    const text = feedbackInputs[commodity]?.trim()
    if (!text) return
    const now = new Date().toISOString()
    const existing = getMould8B(id)
    const updated: Mould8BData = {
      ...existing,
      [commodity]: {
        feedback: text,
        feedback_by: currentRole,
        feedback_at: now,
        supplier_deadline: getSLADeadline(now),
        supplier_files: [],
        approved: false,
      },
    }
    setMould8B(id, updated)
    appendActivity(id, currentRole, ntdRole, 8, "stage_complete",
      `8B joint review feedback submitted for ${commodity}`, undefined, "8B")
    setFeedbackInputs(prev => ({ ...prev, [commodity]: "" }))
    reload()
  }

  const handleApprove8BCommodity = (commodity: string) => {
    const existing = getMould8B(id)
    const rec = existing[commodity]
    if (!rec) return
    const now = new Date().toISOString()
    const updated: Mould8BData = {
      ...existing,
      [commodity]: { ...rec, approved: true, approved_by: currentRole, approved_at: now },
    }
    setMould8B(id, updated)
    appendActivity(id, currentRole, ntdRole, 8, "file_approved",
      `8B joint review approved for ${commodity}`, undefined, "8B")

    // Check if ALL commodities are now approved → advance to Stage 9
    const newAll8BComplete = commodities.every(c => (updated[c]?.approved === true))
    if (newAll8BComplete) {
      const mouldExisting = getOrInitMould(id)
      setNTDMould(id, { ...mouldExisting, stage_complete: true })
      advanceNTDStage(id, 9, currentRole, ntdRole)
      appendActivity(id, currentRole, ntdRole, 8, "stage_complete",
        "Stage 8 complete — all mould designs approved. Advanced to Stage 9.", undefined, "8B")
      reload()
      router.push(`/ntd/${id}`)
    } else {
      reload()
    }
  }

  // Simulate supplier 8B upload (demo)
  const handleSimulate8BUpload = (commodity: string) => {
    const existing = getMould8B(id)
    const rec = existing[commodity]
    if (!rec) return
    const now = new Date().toISOString()
    const demoFile: VersionedFile = createVersionedFile(
      `Final Mould Design — ${commodity}`,
      `https://drive.google.com/demo-mould-${commodity.replace(/\s+/g, "-").toLowerCase()}`,
      "supplier"
    )
    const updated: Mould8BData = {
      ...existing,
      [commodity]: {
        ...rec,
        supplier_files: [...(rec.supplier_files ?? []), demoFile],
        supplier_uploaded_at: now,
      },
    }
    setMould8B(id, updated)
    reload()
  }

  // Legacy single joint_review handler (kept for backwards compat, not shown)
  const handleSubmitLegacyJointFeedback = () => {
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

  // ─── commodity filter for 8A ───────────────────────────────────

  // Map component → commodity from initiation data
  const handoff = getNTDHandoff(id)
  const componentCommodityMap: Record<string, string> = {}
  if (handoff) {
    handoff.components.forEach(c => {
      componentCommodityMap[c.componentId] = c.commodity
    })
  }

  const filteredMouldComponents = selectedCommodity === "All"
    ? mouldData.components
    : mouldData.components.filter(c => componentCommodityMap[c.componentId] === selectedCommodity)

  // Per-commodity 8A counts (for chips)
  const commodityCounts: Record<string, { approved: number; total: number }> = {}
  for (const commodity of commodities) {
    const comps = mouldData.components.filter(c => componentCommodityMap[c.componentId] === commodity)
    commodityCounts[commodity] = {
      approved: comps.filter(c => c.final_status === "approved").length,
      total: comps.length,
    }
  }

  const redesignRound = mouldData.redesign_round

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
      <Link href={`/ntd/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to NTD {record.id}
      </Link>

      {/* Header */}
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
                {sub === "8A" && (
                  <span className="ml-1.5 text-xs font-bold opacity-80">
                    {approved}/{total}
                  </span>
                )}
                {sub === "8B" && allComponentsApproved && (
                  <span className="ml-1.5 text-xs font-bold opacity-80">
                    {commodities.filter(c => mould8B[c]?.approved).length}/{commodities.length}
                  </span>
                )}
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

        {/* Redesign round banner */}
        {(() => {
          const activeRound = redesignData?.redesign_rounds.slice().reverse().find(r => !r.resolved_at)
          if (!activeRound) return null
          const awaitingIds = activeRound.failed_component_ids.filter(cid => {
            const comp = mouldData.components.find(c => c.componentId === cid)
            return comp && comp.final_status === "under_review"
          })
          const pendingIds = activeRound.failed_component_ids.filter(cid => {
            const comp = mouldData.components.find(c => c.componentId === cid)
            return comp && (comp.final_status === "pending" || comp.final_status === "revision_required")
          })
          return (
            <div className="mt-4 bg-violet-50 border border-violet-200 rounded-xl px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-violet-600" />
                <p className="font-bold text-violet-800 text-sm">
                  Redesign Round {activeRound.round_no} — triggered by Trial T{activeRound.triggered_by_trial}
                </p>
              </div>
              {awaitingIds.length > 0 && (
                <div className="flex items-start gap-2">
                  <ClipboardCheck className="w-3.5 h-3.5 text-violet-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-violet-700">
                    <span className="font-semibold">{awaitingIds.length} component(s) awaiting R&amp;D &amp; Sourcing approval:</span>{" "}
                    {awaitingIds.join(", ")}
                  </p>
                </div>
              )}
              {pendingIds.length > 0 && (
                <p className="text-xs text-violet-600 pl-5">
                  {pendingIds.length} component(s) still awaiting supplier resubmission: {pendingIds.join(", ")}
                </p>
              )}
            </div>
          )
        })()}
      </div>

      {/* Supplier portal link */}
      <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Supplier Portal</h3>
            </div>
            <p className="text-[11px] text-slate-500">Share this link with the supplier to submit Mould 3D and MFA PPT files for review.</p>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <a href={`/supplier/ntd/${id}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-xs text-blue-700 font-mono truncate hover:underline">
                /supplier/ntd/{id}
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/supplier/ntd/${id}`)
                  setCopied("main")
                  setTimeout(() => setCopied(null), 2000)
                }}
                className="shrink-0 p-1 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors"
                title="Copy link">
                {copied === "main" ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <a href={`/supplier/ntd/${id}`} target="_blank" rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 transition-colors mt-6">
            Open Portal <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* DFM Approved Files Reference */}
      {dfmData && dfmData.components.some(c => c.final_status === "approved") && (
        <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setDfmPanelOpen(p => !p)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">DFM Approved Files</span>
              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full">
                {dfmData.components.filter(c => c.final_status === "approved").length} / {dfmData.components.length} components
              </span>
            </div>
            {dfmPanelOpen
              ? <ChevronUp className="w-4 h-4 text-emerald-600" />
              : <ChevronDown className="w-4 h-4 text-emerald-600" />}
          </button>

          {dfmPanelOpen && (
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500">Approved DFM files from Stage 7 — use these as reference for mould design.</p>
              <div className="space-y-2">
                {dfmData.components.filter(c => c.final_status === "approved").map(c => {
                  const pptLink = c.ppt?.versions.find(v => v.version_no === c.ppt.current_version)?.link ?? ""
                  const d3dLink = c.design_3d?.versions.find(v => v.version_no === c.design_3d.current_version)?.link ?? ""
                  const rndDocs = (c.rnd_docs ?? [])
                  return (
                    <div key={c.componentId} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <p className="text-sm font-semibold text-slate-800">{c.componentId} — {c.name}</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {pptLink && (
                          <a href={pptLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium bg-white border border-blue-200 rounded-lg px-3 py-1.5">
                            <FileText className="w-3 h-3" /> DFM PPT v{c.ppt.current_version}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {d3dLink && (
                          <a href={d3dLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium bg-white border border-blue-200 rounded-lg px-3 py-1.5">
                            <FileText className="w-3 h-3" /> 3D Design v{c.design_3d.current_version}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {rndDocs.map(doc => {
                          const docLink = doc.versions.find(v => v.version_no === doc.current_version)?.link ?? ""
                          return docLink ? (
                            <a key={doc.file_id} href={docLink} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-indigo-700 hover:underline font-medium bg-white border border-indigo-200 rounded-lg px-3 py-1.5">
                              <FileText className="w-3 h-3" /> {doc.slot_name} v{doc.current_version}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : null
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 8A Tab ────────────────────────────────────────────── */}
      {activeSubStage === "8A" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          {/* Commodity filter chips */}
          {commodities.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCommodity("All")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  selectedCommodity === "All"
                    ? "bg-blue-900 text-white border-blue-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}>
                All
                <span className="ml-1.5 opacity-70">{approved}/{total}</span>
              </button>
              {commodities.map(commodity => {
                const counts = commodityCounts[commodity] ?? { approved: 0, total: 0 }
                const isActive = selectedCommodity === commodity
                const isDone = counts.approved === counts.total && counts.total > 0
                return (
                  <button
                    key={commodity}
                    onClick={() => setSelectedCommodity(commodity)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                      isActive
                        ? "bg-blue-900 text-white border-blue-900"
                        : isDone
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}>
                    {commodity}
                    <span className="ml-1.5 opacity-80">{counts.approved}/{counts.total}</span>
                    {isDone && <CheckCircle2 className="inline w-3 h-3 ml-1 -mt-0.5" />}
                  </button>
                )
              })}
            </div>
          )}

          <ComponentApprovalBoard
            components={filteredMouldComponents}
            mode="mould"
            role={ntdRole}
            onFileAction={handleFileAction}
            onMouldReview={handleMouldReview}
            showSLATimer
            redesignRound={redesignRound}
          />
        </div>
      )}

      {/* ── 8B Tab ────────────────────────────────────────────── */}
      {activeSubStage === "8B" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">8B — Joint Review</h2>
            <span className="text-xs text-slate-500">
              {commodities.filter(c => mould8B[c]?.approved).length} / {commodities.length} commodities complete
            </span>
          </div>

          {commodities.map(commodity => {
            const supplierName = record.selectedSuppliers?.[commodity] ?? "—"
            const rec = mould8B[commodity]

            // Status
            const hasFeedback = !!rec?.feedback_at
            const hasSupplierUpload = (rec?.supplier_files ?? []).length > 0
            const isApproved = rec?.approved === true

            return (
              <div key={commodity}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                  isApproved
                    ? "border-emerald-200"
                    : hasFeedback
                      ? "border-amber-200"
                      : "border-slate-200"
                }`}>

                {/* Card header */}
                <div className={`px-5 py-3.5 flex items-center justify-between ${
                  isApproved
                    ? "bg-emerald-50"
                    : hasFeedback
                      ? "bg-amber-50"
                      : "bg-slate-50"
                }`}>
                  <div className="flex items-center gap-3">
                    {isApproved
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      : hasFeedback
                        ? <Clock className="w-4 h-4 text-amber-500" />
                        : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    }
                    <div>
                      <p className="text-sm font-bold text-slate-800">{commodity}</p>
                      <p className="text-xs text-slate-500">Supplier: {supplierName}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    isApproved
                      ? "bg-emerald-100 text-emerald-700"
                      : hasFeedback && hasSupplierUpload
                        ? "bg-blue-100 text-blue-700"
                        : hasFeedback
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                  }`}>
                    {isApproved
                      ? "COMPLETE"
                      : hasFeedback && hasSupplierUpload
                        ? "AWAITING APPROVAL"
                        : hasFeedback
                          ? "AWAITING SUPPLIER"
                          : "FEEDBACK REQUIRED"
                    }
                  </span>
                </div>

                <div className="p-5 space-y-4">

                  {/* Step 1 — Feedback */}
                  {!hasFeedback ? (
                    (isRnd || isSourcing) ? (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                          Submit consolidated feedback to supplier for confirmed mould design files:
                        </p>
                        <textarea
                          value={feedbackInputs[commodity] ?? ""}
                          onChange={e => setFeedbackInputs(prev => ({ ...prev, [commodity]: e.target.value }))}
                          placeholder={`Joint feedback for ${commodity} supplier (${supplierName})…`}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                        />
                        <button
                          onClick={() => handleSubmitJointFeedback(commodity)}
                          disabled={!(feedbackInputs[commodity]?.trim())}
                          className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
                          Submit Joint Feedback to Supplier
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Awaiting joint review submission from R&amp;D or Sourcing…</p>
                    )
                  ) : (
                    <>
                      {/* Feedback sent panel */}
                      <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Feedback sent to supplier</p>
                        <p className="text-sm text-slate-800">{rec!.feedback}</p>
                        <p className="text-xs text-slate-400">
                          By {rec!.feedback_by} · {new Date(rec!.feedback_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Countdown / portal link */}
                      {!hasSupplierUpload && !isApproved && (
                        <div className="space-y-3">
                          {/* SLA countdown */}
                          {(() => {
                            const { label, status } = formatCountdown(rec!.supplier_deadline)
                            return (
                              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border ${
                                status === "overdue"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : status === "warning"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-sky-50 text-sky-700 border-sky-200"
                              }`}>
                                {status === "overdue" ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                Supplier deadline: {label}
                              </div>
                            )
                          })()}

                          {/* Portal link for this commodity */}
                          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            <span className="text-[10px] font-bold text-blue-500 uppercase">Portal</span>
                            <a
                              href={`/supplier/ntd/${id}?commodity=${encodeURIComponent(commodity)}&stage=8b`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-xs text-blue-700 font-mono truncate hover:underline">
                              /supplier/ntd/{id}?commodity={encodeURIComponent(commodity)}&amp;stage=8b
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/supplier/ntd/${id}?commodity=${encodeURIComponent(commodity)}&stage=8b`
                                )
                                setCopied(`8b-${commodity}`)
                                setTimeout(() => setCopied(null), 2000)
                              }}
                              className="shrink-0 p-1 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors"
                              title="Copy link">
                              {copied === `8b-${commodity}` ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Demo: simulate supplier upload */}
                          <button
                            onClick={() => handleSimulate8BUpload(commodity)}
                            className="text-xs text-slate-500 hover:text-slate-700 underline transition-colors">
                            [Demo] Simulate supplier upload
                          </button>
                        </div>
                      )}

                      {/* Supplier uploaded files */}
                      {hasSupplierUpload && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Supplier uploaded files</p>
                          {rec!.supplier_files.map(file => {
                            const link = file.versions.find(v => v.version_no === file.current_version)?.link ?? ""
                            return (
                              <div key={file.file_id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{file.slot_name}</span>
                                {link && (
                                  <a href={link} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-700 hover:underline shrink-0">
                                    Open <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )
                          })}
                          {rec?.supplier_uploaded_at && (
                            <p className="text-xs text-slate-400">Uploaded: {new Date(rec.supplier_uploaded_at).toLocaleString()}</p>
                          )}
                        </div>
                      )}

                      {/* Approve button */}
                      {hasSupplierUpload && !isApproved && (isRnd || isSourcing) && (
                        <button
                          onClick={() => handleApprove8BCommodity(commodity)}
                          className="flex items-center gap-2 text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                          Approve Mould Design — {commodity}
                          {all8BComplete
                            ? ""
                            : commodities.every(c => c === commodity ? true : mould8B[c]?.approved)
                              ? " & Advance to Stage 9"
                              : ""}
                        </button>
                      )}

                      {/* Approved strip */}
                      {isApproved && (
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            Approved by <strong>{rec!.approved_by}</strong> · {new Date(rec!.approved_at!).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* All 8B done banner */}
          {all8BComplete && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">
                All commodity joint reviews approved — Stage 8 complete. Advanced to Stage 9.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
