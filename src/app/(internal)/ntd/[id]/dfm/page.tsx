"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import {
  getNTDDFM,
  setNTDDFM,
  getDFMProgress,
  getNTDInitiation,
  updateNTDStage,
  getNTDRecord,
} from "@/lib/ntd"
import type { NTDDFMData, NTDDFMComponent, NTDDFMIteration, NTDReviewEntry } from "@/types/ntd"

// ─── Helpers ──────────────────────────────────────────────────

function statusLabel(status: NTDDFMComponent["final_status"]) {
  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </span>
      )
    case "under_review":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100">
          <Clock className="w-3 h-3" /> Under Review
        </span>
      )
    case "revision_required":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">
          <AlertCircle className="w-3 h-3" /> Revision Required
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200">
          Pending
        </span>
      )
  }
}

function verdictBadge(verdict: NTDReviewEntry["verdict"]) {
  if (verdict === "approved")
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Approved</span>
  if (verdict === "rejected")
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">Rejected</span>
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200">Pending</span>
}

// ─── Per-component card ────────────────────────────────────────

interface ComponentCardProps {
  component: NTDDFMComponent
  isRnd: boolean
  isSpocOrSourcing: boolean
  currentRole: string
  onSaveReview: (componentId: string, reviewer: "rnd" | "sourcing", verdict: "approved" | "rejected", comments: string) => void
}

function ComponentCard({ component, isRnd, isSpocOrSourcing, currentRole, onSaveReview }: ComponentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)

  const latestIteration: NTDDFMIteration | undefined =
    component.iterations.length > 0 ? component.iterations[component.iterations.length - 1] : undefined

  // R&D review state
  const [rndVerdict, setRndVerdict] = useState<"approved" | "rejected" | "">("")
  const [rndComments, setRndComments] = useState("")

  // Sourcing review state
  const [sourcingVerdict, setSourcingVerdict] = useState<"approved" | "rejected" | "">("")
  const [sourcingComments, setSourcingComments] = useState("")

  const isLocked = component.final_status === "approved"

  const rndAlreadyReviewed = latestIteration?.rnd_review.verdict !== "pending"
  const sourcingAlreadyReviewed = latestIteration?.sourcing_review.verdict !== "pending"

  function handleRndSubmit() {
    if (!rndVerdict) return
    if (rndVerdict === "rejected" && !rndComments.trim()) return
    onSaveReview(component.componentId, "rnd", rndVerdict, rndComments.trim())
    setRndVerdict("")
    setRndComments("")
  }

  function handleSourcingSubmit() {
    if (!sourcingVerdict) return
    if (sourcingVerdict === "rejected" && !sourcingComments.trim()) return
    onSaveReview(component.componentId, "sourcing", sourcingVerdict, sourcingComments.trim())
    setSourcingVerdict("")
    setSourcingComments("")
  }

  return (
    <div
      className={[
        "rounded-xl border shadow-sm overflow-hidden transition-all",
        isLocked
          ? "border-emerald-100 bg-emerald-50/30 opacity-70"
          : "border-slate-100 bg-white",
      ].join(" ")}
    >
      {/* Row header — click to expand */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/70 transition-colors"
        onClick={() => !isLocked && setExpanded((p) => !p)}
        disabled={isLocked}
      >
        <div className="flex items-center justify-center w-6 h-6 text-slate-400 shrink-0">
          {isLocked ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0">
            {component.componentId}
          </span>
          <span className="text-[13px] font-semibold text-slate-800 truncate">{component.name}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {component.iterations.length > 0 && (
            <span className="text-[10px] text-slate-400">
              Iter. {component.iterations.length}
            </span>
          )}
          {statusLabel(component.final_status)}
        </div>
      </button>

      {/* Approved — collapsed summary only */}
      {isLocked && (
        <div className="px-4 pb-3 flex items-center gap-2 text-[12px] text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            Approved after {component.iterations.length} iteration
            {component.iterations.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Expanded non-approved content */}
      {!isLocked && expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
          {/* Latest submission links */}
          {latestIteration ? (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Latest Submission — Iteration {latestIteration.iteration_no}
              </p>
              <div className="flex flex-wrap gap-4 text-[12px]">
                <a
                  href={latestIteration.supplier_submission.ppt}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  PPT Presentation
                </a>
                <a
                  href={latestIteration.supplier_submission.data_3d}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  3D Data
                </a>
                <span className="text-slate-400 text-[11px]">
                  Submitted {new Date(latestIteration.supplier_submission.submitted_at).toLocaleString()}
                </span>
              </div>

              {/* Current review status summary */}
              <div className="flex gap-4 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">R&amp;D:</span>
                  {verdictBadge(latestIteration.rnd_review.verdict)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">Sourcing:</span>
                  {verdictBadge(latestIteration.sourcing_review.verdict)}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
              <p className="text-[12px] text-amber-700">
                No submission yet. Waiting for supplier to submit PPT and 3D data.
              </p>
            </div>
          )}

          {/* R&D review panel */}
          {latestIteration && isRnd && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5">
              <p className="text-[12px] font-semibold text-slate-700">R&amp;D Review</p>

              {rndAlreadyReviewed ? (
                <div className="flex items-center gap-2 text-[12px] text-slate-600">
                  {verdictBadge(latestIteration.rnd_review.verdict)}
                  {latestIteration.rnd_review.comments && (
                    <span className="text-slate-500 text-[11px] truncate max-w-xs">
                      — {latestIteration.rnd_review.comments}
                    </span>
                  )}
                  <span className="text-slate-400 text-[10px] ml-auto shrink-0">
                    by {latestIteration.rnd_review.reviewed_by}
                  </span>
                </div>
              ) : (
                <>
                  {/* Waiting indicator if sourcing has reviewed but R&D hasn't */}
                  {sourcingAlreadyReviewed && (
                    <p className="text-[11px] text-amber-600">
                      Sourcing has reviewed — waiting for your R&amp;D verdict.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRndVerdict("approved")}
                      className={[
                        "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                        rndVerdict === "approved"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700",
                      ].join(" ")}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setRndVerdict("rejected")}
                      className={[
                        "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                        rndVerdict === "rejected"
                          ? "bg-red-600 border-red-600 text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-700",
                      ].join(" ")}
                    >
                      Request Revision
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder={rndVerdict === "rejected" ? "Comments required for revision request…" : "Optional comments…"}
                    value={rndComments}
                    onChange={(e) => setRndComments(e.target.value)}
                  />
                  <button
                    onClick={handleRndSubmit}
                    disabled={!rndVerdict || (rndVerdict === "rejected" && !rndComments.trim())}
                    className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Submit R&amp;D Review
                  </button>
                </>
              )}
            </div>
          )}

          {/* Sourcing review panel */}
          {latestIteration && isSpocOrSourcing && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5">
              <p className="text-[12px] font-semibold text-slate-700">Sourcing Review</p>

              {sourcingAlreadyReviewed ? (
                <div className="flex items-center gap-2 text-[12px] text-slate-600">
                  {verdictBadge(latestIteration.sourcing_review.verdict)}
                  {latestIteration.sourcing_review.comments && (
                    <span className="text-slate-500 text-[11px] truncate max-w-xs">
                      — {latestIteration.sourcing_review.comments}
                    </span>
                  )}
                  <span className="text-slate-400 text-[10px] ml-auto shrink-0">
                    by {latestIteration.sourcing_review.reviewed_by}
                  </span>
                </div>
              ) : (
                <>
                  {rndAlreadyReviewed && (
                    <p className="text-[11px] text-amber-600">
                      R&amp;D has reviewed — waiting for your sourcing verdict.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSourcingVerdict("approved")}
                      className={[
                        "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                        sourcingVerdict === "approved"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700",
                      ].join(" ")}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setSourcingVerdict("rejected")}
                      className={[
                        "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                        sourcingVerdict === "rejected"
                          ? "bg-red-600 border-red-600 text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-700",
                      ].join(" ")}
                    >
                      Request Revision
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder={sourcingVerdict === "rejected" ? "Comments required for revision request…" : "Optional comments…"}
                    value={sourcingComments}
                    onChange={(e) => setSourcingComments(e.target.value)}
                  />
                  <button
                    onClick={handleSourcingSubmit}
                    disabled={!sourcingVerdict || (sourcingVerdict === "rejected" && !sourcingComments.trim())}
                    className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Submit Sourcing Review
                  </button>
                </>
              )}
            </div>
          )}

          {/* Waiting indicator when no action available */}
          {latestIteration && !isRnd && !isSpocOrSourcing && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-[12px] text-slate-500">
              Reviews are submitted by R&amp;D and Sourcing roles.
            </div>
          )}

          {/* Iteration history */}
          {component.iterations.length > 0 && (
            <div>
              <button
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                onClick={() => setHistoryExpanded((p) => !p)}
              >
                {historyExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Iteration History ({component.iterations.length})
              </button>

              {historyExpanded && (
                <div className="mt-2 space-y-2">
                  {[...component.iterations].reverse().map((iter) => (
                    <div key={iter.iteration_no} className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-[11px] space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-semibold text-slate-700">Iteration {iter.iteration_no}</span>
                        <span
                          className={[
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                            iter.overall_status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : iter.overall_status === "revision_required"
                              ? "bg-red-50 text-red-700 border border-red-100"
                              : "bg-yellow-50 text-yellow-700 border border-yellow-100",
                          ].join(" ")}
                        >
                          {iter.overall_status === "under_review"
                            ? "Under Review"
                            : iter.overall_status === "approved"
                            ? "Approved"
                            : "Revision Required"}
                        </span>
                      </div>
                      <div className="flex gap-4 text-slate-500">
                        <span>R&amp;D: {iter.rnd_review.verdict}</span>
                        <span>Sourcing: {iter.sourcing_review.verdict}</span>
                      </div>
                      {(iter.rnd_review.comments || iter.sourcing_review.comments) && (
                        <div className="space-y-0.5 text-slate-500">
                          {iter.rnd_review.comments && (
                            <p>R&amp;D note: {iter.rnd_review.comments}</p>
                          )}
                          {iter.sourcing_review.comments && (
                            <p>Sourcing note: {iter.sourcing_review.comments}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function DFMReviewPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""

  const [currentRole, setCurrentRole] = useState("rnd_user")
  const [dfm, setDfm] = useState<NTDDFMData | null>(null)
  const [stageComplete, setStageComplete] = useState(false)

  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"
  const isSpocOrSourcing =
    currentRole.startsWith("sourcing") ||
    currentRole.startsWith("spoc") ||
    currentRole === "super_admin"

  const initDFM = useCallback(() => {
    let data = getNTDDFM(id)

    if (!data) {
      const initiation = getNTDInitiation(id)
      const comps = initiation?.components ?? []
      const initialData: NTDDFMData = {
        components: comps.map((c) => ({
          componentId: c.componentId,
          name: c.name,
          iterations: [],
          final_status: "pending",
        })),
        stage_complete: false,
      }
      setNTDDFM(id, initialData)
      data = initialData
    }

    setDfm(data)
    setStageComplete(data.stage_complete)
  }, [id])

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") || "rnd_user")
    initDFM()

    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener("rolechange", onRoleChange as EventListener)
    return () => window.removeEventListener("rolechange", onRoleChange as EventListener)
  }, [id, initDFM])

  function handleSaveReview(
    componentId: string,
    reviewer: "rnd" | "sourcing",
    verdict: "approved" | "rejected",
    comments: string
  ) {
    if (!dfm) return

    const now = new Date().toISOString()
    const updatedComponents = dfm.components.map((comp) => {
      if (comp.componentId !== componentId) return comp

      // Must not touch an already-approved component
      if (comp.final_status === "approved") return comp

      const iterations = [...comp.iterations]
      if (iterations.length === 0) return comp

      const lastIdx = iterations.length - 1
      const lastIter = { ...iterations[lastIdx] }

      // Apply the reviewer's verdict
      const reviewEntry: NTDReviewEntry = {
        verdict,
        comments,
        reviewed_by: currentRole,
        reviewed_at: now,
      }

      if (reviewer === "rnd") {
        // Don't overwrite if already reviewed
        if (lastIter.rnd_review.verdict !== "pending") return comp
        lastIter.rnd_review = reviewEntry
      } else {
        if (lastIter.sourcing_review.verdict !== "pending") return comp
        lastIter.sourcing_review = reviewEntry
      }

      // Compute overall_status after this review
      const rndDone = lastIter.rnd_review.verdict !== "pending"
      const sourcingDone = lastIter.sourcing_review.verdict !== "pending"

      let newFinalStatus: NTDDFMComponent["final_status"] = comp.final_status
      if (rndDone && sourcingDone) {
        const bothApproved =
          lastIter.rnd_review.verdict === "approved" &&
          lastIter.sourcing_review.verdict === "approved"
        const anyRejected =
          lastIter.rnd_review.verdict === "rejected" ||
          lastIter.sourcing_review.verdict === "rejected"

        if (bothApproved) {
          lastIter.overall_status = "approved"
          newFinalStatus = "approved"
        } else if (anyRejected) {
          lastIter.overall_status = "revision_required"
          newFinalStatus = "revision_required"
        }
      }

      iterations[lastIdx] = lastIter
      return { ...comp, iterations, final_status: newFinalStatus }
    })

    // Check if all components are approved
    const allApproved = updatedComponents.every((c) => c.final_status === "approved")
    const updatedDFM: NTDDFMData = {
      components: updatedComponents,
      stage_complete: allApproved,
    }

    setNTDDFM(id, updatedDFM)
    setDfm(updatedDFM)

    if (allApproved && !stageComplete) {
      setStageComplete(true)
      updateNTDStage(id, 8)
    }
  }

  const progress = getDFMProgress(id)
  const progressPct = progress.total > 0 ? Math.round((progress.approved / progress.total) * 100) : 0

  // Loading
  if (!dfm) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[13px] text-slate-400">Loading DFM data…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <Link
          href={`/ntd/${id}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to NTD {id}
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[16px] font-bold text-slate-900">DFM Review — Stage 7</h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Per-component Design for Manufacturability review. Both R&amp;D and Sourcing must approve each component.
            </p>
          </div>

          {/* Progress pill */}
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold text-slate-600">
              {progress.approved} / {progress.total} Approved
            </span>
            <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6 space-y-3 max-w-4xl mx-auto w-full">
        {/* Completion banner */}
        {stageComplete && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-emerald-800">
                DFM Complete — All components approved.
              </p>
              <p className="text-[11px] text-emerald-600">Proceeding to Stage 8: Mould Design, Manufacturing &amp; Trials.</p>
            </div>
          </div>
        )}

        {/* Role info banner if neither R&D nor Sourcing */}
        {!isRnd && !isSpocOrSourcing && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-[12px] text-amber-700">
            You are viewing as <strong>{currentRole}</strong>. Review actions are available to R&amp;D and Sourcing roles.
          </div>
        )}

        {/* Component list */}
        <div className="space-y-2">
          {dfm.components.map((comp) => (
            <ComponentCard
              key={comp.componentId}
              component={comp}
              isRnd={isRnd}
              isSpocOrSourcing={isSpocOrSourcing}
              currentRole={currentRole}
              onSaveReview={handleSaveReview}
            />
          ))}
        </div>

        {dfm.components.length === 0 && (
          <div className="text-center py-12 text-[13px] text-slate-400">
            No components found. Ensure Stage 1 initiation is complete.
          </div>
        )}
      </div>
    </div>
  )
}
