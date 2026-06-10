"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { CheckCircle2, AlertCircle, Clock, ExternalLink } from "lucide-react"
import {
  getNTDRecord,
  getNTDDFM,
  setNTDDFM,
  getDFMComponentsForSupplier,
} from "@/lib/ntd"
import type { NTDRecord, NTDDFMComponent, NTDDFMIteration } from "@/types/ntd"

// ─── Helpers ──────────────────────────────────────────────────

function FeedbackBlock({ iteration }: { iteration: NTDDFMIteration }) {
  const hasRndFeedback =
    iteration.rnd_review.verdict !== "pending" && iteration.rnd_review.comments
  const hasSourcingFeedback =
    iteration.sourcing_review.verdict !== "pending" && iteration.sourcing_review.comments

  if (!hasRndFeedback && !hasSourcingFeedback) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-[12px] text-red-700">
        Revision requested. Please review and resubmit.
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-700 uppercase tracking-wide">
        <AlertCircle className="w-3.5 h-3.5" />
        Revision Feedback
      </div>
      {hasRndFeedback && (
        <div className="text-[12px] text-red-800">
          <span className="font-semibold">R&amp;D:</span> {iteration.rnd_review.comments}
        </div>
      )}
      {hasSourcingFeedback && (
        <div className="text-[12px] text-red-800">
          <span className="font-semibold">Sourcing:</span> {iteration.sourcing_review.comments}
        </div>
      )}
    </div>
  )
}

interface ComponentSubmitCardProps {
  component: NTDDFMComponent
  ntdId: string
  onSubmitted: () => void
}

function ComponentSubmitCard({ component, ntdId, onSubmitted }: ComponentSubmitCardProps) {
  const [ppt, setPpt] = useState("")
  const [data3d, setData3d] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const latestIteration =
    component.iterations.length > 0
      ? component.iterations[component.iterations.length - 1]
      : null

  const isRevisionRequired = component.final_status === "revision_required"
  const isUnderReview = component.final_status === "under_review"

  // Already submitted in this session or currently under review with submission
  if ((isUnderReview && latestIteration) || submitted) {
    return (
      <div className="rounded-xl border border-yellow-100 bg-yellow-50/40 p-4 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-slate-500">{component.componentId}</span>
            <span className="text-[13px] font-semibold text-slate-800">{component.name}</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100">
            <Clock className="w-3 h-3" /> Under Review
          </span>
        </div>
        {latestIteration && (
          <div className="flex gap-4 text-[12px] text-slate-500">
            <a
              href={latestIteration.supplier_submission.ppt}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> PPT
            </a>
            <a
              href={latestIteration.supplier_submission.data_3d}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> 3D Data
            </a>
            <span className="text-[11px] text-slate-400">
              Iteration {latestIteration.iteration_no} — Awaiting review
            </span>
          </div>
        )}
      </div>
    )
  }

  function handleSubmit() {
    if (!ppt.trim() || !data3d.trim()) return
    setSubmitting(true)

    const now = new Date().toISOString()
    const dfm = getNTDDFM(ntdId)
    if (!dfm) {
      setSubmitting(false)
      return
    }

    const updatedComponents = dfm.components.map((comp) => {
      if (comp.componentId !== component.componentId) return comp
      // Never reopen an approved component
      if (comp.final_status === "approved") return comp

      const newIteration: NTDDFMIteration = {
        iteration_no: comp.iterations.length + 1,
        supplier_submission: {
          ppt: ppt.trim(),
          data_3d: data3d.trim(),
          submitted_at: now,
        },
        rnd_review: { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "" },
        sourcing_review: { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "" },
        overall_status: "under_review",
      }

      return {
        ...comp,
        iterations: [...comp.iterations, newIteration],
        final_status: "under_review" as const,
      }
    })

    setNTDDFM(ntdId, { ...dfm, components: updatedComponents })
    setSubmitting(false)
    setSubmitted(true)
    onSubmitted()
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-slate-500">{component.componentId}</span>
          <span className="text-[13px] font-semibold text-slate-800">{component.name}</span>
        </div>
        {isRevisionRequired ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">
            <AlertCircle className="w-3 h-3" /> Revision Required
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200">
            Pending Submission
          </span>
        )}
      </div>

      {/* Revision feedback */}
      {isRevisionRequired && latestIteration && (
        <FeedbackBlock iteration={latestIteration} />
      )}

      {/* Upload form */}
      <div className="space-y-2">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            PPT Presentation Link <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="https://drive.google.com/…"
            value={ppt}
            onChange={(e) => setPpt(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            3D Data Link <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="https://…"
            value={data3d}
            onChange={(e) => setData3d(e.target.value)}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || !ppt.trim() || !data3d.trim()}
          className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting…" : `Submit Files${component.iterations.length > 0 ? ` (Iteration ${component.iterations.length + 1})` : ""}`}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function SupplierNTDPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = typeof params.id === "string" ? params.id : ""

  const [record, setRecord] = useState<NTDRecord | null | undefined>(undefined)
  const [actionableComponents, setActionableComponents] = useState<NTDDFMComponent[]>([])
  const [approvedCount, setApprovedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [allApproved, setAllApproved] = useState(false)

  const refresh = useCallback(() => {
    const r = getNTDRecord(id)
    setRecord(r ?? null)

    const dfm = getNTDDFM(id)
    if (dfm) {
      const actionable = getDFMComponentsForSupplier(id)
      setActionableComponents(actionable)
      const approved = dfm.components.filter((c) => c.final_status === "approved").length
      setApprovedCount(approved)
      setTotalCount(dfm.components.length)
      setAllApproved(dfm.stage_complete)
    }
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Loading
  if (record === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="text-[13px] text-slate-400">Loading…</span>
      </div>
    )
  }

  // Not found
  if (record === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center px-4">
        <p className="text-[15px] font-bold text-slate-800">NTD not found</p>
        <p className="text-[12px] text-slate-400 mt-1">
          This NTD record does not exist or the link may be incorrect.
        </p>
      </div>
    )
  }

  const currentStage = record.current_stage

  // Not yet at DFM stage
  if (currentStage < 7) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center px-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-[15px] font-bold text-slate-800">Stage {currentStage} In Progress</p>
        <p className="text-[12px] text-slate-400 mt-1">
          DFM file submission will be available when Stage 7 begins. No supplier action required at this time.
        </p>
      </div>
    )
  }

  // DFM complete
  if (allApproved) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center px-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>
        <p className="text-[15px] font-bold text-slate-800">All Components Approved — DFM Complete</p>
        <p className="text-[12px] text-slate-500 mt-1">
          All {totalCount} components have been approved. The NTD is proceeding to Stage 8.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-[11px] font-mono text-slate-400 mb-0.5">{record.id}</p>
              <h1 className="text-[16px] font-bold text-slate-900">{record.title}</h1>
              <p className="text-[12px] text-slate-500 mt-0.5">DFM File Submission — Stage 7</p>
            </div>

            {/* Progress */}
            <div className="text-right">
              <p className="text-[12px] font-semibold text-slate-600">
                {approvedCount} / {totalCount} Approved
              </p>
              <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden mt-1 ml-auto">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: totalCount > 0 ? `${Math.round((approvedCount / totalCount) * 100)}%` : "0%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        <p className="text-[12px] text-slate-500">
          Please submit your PPT presentation and 3D data for each component below. Both R&amp;D and Sourcing will review your files.
          Components requiring revision will display feedback from the review team.
        </p>

        {/* Approved components notice */}
        {approvedCount > 0 && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <div className="flex items-center gap-2 text-[12px] text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                <strong>{approvedCount}</strong> component{approvedCount !== 1 ? "s" : ""} approved and locked.
              </span>
            </div>
          </div>
        )}

        {/* Actionable components */}
        {actionableComponents.length === 0 ? (
          <div className="rounded-xl border border-yellow-100 bg-yellow-50/50 px-4 py-6 text-center">
            <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-yellow-800">All submitted files are under review</p>
            <p className="text-[11px] text-yellow-600 mt-1">
              You will be notified when any component requires revision or is approved.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actionableComponents.map((comp) => (
              <ComponentSubmitCard
                key={comp.componentId}
                component={comp}
                ntdId={id}
                onSubmitted={refresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
