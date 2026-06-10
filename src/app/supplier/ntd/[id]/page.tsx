"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Plus,
} from "lucide-react"
import {
  getNTDRecord,
  getNTDDFM,
  setNTDDFM,
  getDFMComponentsForSupplier,
  getNTDSubStage8Status,
  getNTDMouldDesign,
  setNTDMouldDesign,
  getNTDMfgStatus,
  setNTDMfgStatus,
  getNTDTrials,
  setNTDTrials,
  getNTDInspection,
  setNTDInspection,
} from "@/lib/ntd"
import type {
  NTDRecord,
  NTDDFMComponent,
  NTDDFMIteration,
  NTDMouldComponent,
  NTDMouldIteration,
  NTDMfgStatusData,
  NTDInspectionData,
} from "@/types/ntd"

// ─── DFM Helpers ──────────────────────────────────────────────

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
    if (!dfm) { setSubmitting(false); return }

    const updatedComponents = dfm.components.map((comp) => {
      if (comp.componentId !== component.componentId) return comp
      if (comp.final_status === "approved") return comp

      const newIteration: NTDDFMIteration = {
        iteration_no: comp.iterations.length + 1,
        supplier_submission: { ppt: ppt.trim(), data_3d: data3d.trim(), submitted_at: now },
        rnd_review: { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "" },
        sourcing_review: { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "" },
        overall_status: "under_review",
      }

      return { ...comp, iterations: [...comp.iterations, newIteration], final_status: "under_review" as const }
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

      {isRevisionRequired && latestIteration && <FeedbackBlock iteration={latestIteration} />}

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

// ─── Stage 8A — Mould Design submit (supplier) ────────────────

interface MouldSubmitCardProps {
  component: NTDMouldComponent
  ntdId: string
  onSubmitted: () => void
}

function MouldSubmitCard({ component, ntdId, onSubmitted }: MouldSubmitCardProps) {
  const [mouldDesign3d, setMouldDesign3d] = useState("")
  const [mfaPpt, setMfaPpt] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const latestIteration =
    component.iterations.length > 0
      ? component.iterations[component.iterations.length - 1]
      : null

  const isRevisionRequired = component.final_status === "revision_required"
  const isUnderReview = component.final_status === "under_review"

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
              href={latestIteration.supplier_submission.mould_design_3d}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Mould Design 3D
            </a>
            <a
              href={latestIteration.supplier_submission.mfa_ppt}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> MFA PPT
            </a>
          </div>
        )}
      </div>
    )
  }

  function handleSubmit() {
    if (!mouldDesign3d.trim() || !mfaPpt.trim()) return
    setSubmitting(true)

    const now = new Date().toISOString()
    const slaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const mouldData = getNTDMouldDesign(ntdId)
    if (!mouldData) { setSubmitting(false); return }

    const updatedComponents = mouldData.components.map((comp): NTDMouldComponent => {
      if (comp.componentId !== component.componentId) return comp
      if (comp.final_status === "approved") return comp

      const newIteration: NTDMouldIteration = {
        iteration_no: comp.iterations.length + 1,
        redesign_round: mouldData.redesign_round,
        supplier_submission: {
          mould_design_3d: mouldDesign3d.trim(),
          mfa_ppt: mfaPpt.trim(),
          submitted_at: now,
        },
        rnd_review: { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "", sla_deadline: slaDeadline },
        sourcing_review: { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "", sla_deadline: slaDeadline },
        overall_status: "under_review",
      }

      return { ...comp, iterations: [...comp.iterations, newIteration], final_status: "under_review" }
    })

    setNTDMouldDesign(ntdId, { ...mouldData, components: updatedComponents })
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

      {isRevisionRequired && latestIteration && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-700 uppercase tracking-wide">
            <AlertCircle className="w-3.5 h-3.5" />
            Revision Feedback
          </div>
          {latestIteration.rnd_review.verdict !== "pending" && latestIteration.rnd_review.comments && (
            <div className="text-[12px] text-red-800">
              <span className="font-semibold">R&amp;D:</span> {latestIteration.rnd_review.comments}
            </div>
          )}
          {latestIteration.sourcing_review.verdict !== "pending" && latestIteration.sourcing_review.comments && (
            <div className="text-[12px] text-red-800">
              <span className="font-semibold">Sourcing:</span> {latestIteration.sourcing_review.comments}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Mould Design 3D Link <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="https://…"
            value={mouldDesign3d}
            onChange={(e) => setMouldDesign3d(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            MFA PPT Link <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="https://…"
            value={mfaPpt}
            onChange={(e) => setMfaPpt(e.target.value)}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || !mouldDesign3d.trim() || !mfaPpt.trim()}
          className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Submitting…"
            : `Submit Mould Design${component.iterations.length > 0 ? ` (Iteration ${component.iterations.length + 1})` : ""}`}
        </button>
      </div>
    </div>
  )
}

// ─── Stage 8B — Manufacturing (supplier view) ─────────────────

function Stage8BSupplierView({ ntdId }: { ntdId: string }) {
  const [mfgData, setMfgData] = useState<NTDMfgStatusData | null>(null)
  const [startDate, setStartDate] = useState("")
  const [etaDate, setEtaDate] = useState("")
  const [updateNote, setUpdateNote] = useState("")

  useEffect(() => {
    setMfgData(getNTDMfgStatus(ntdId))
  }, [ntdId])

  function handleConfirmStart() {
    if (!startDate || !etaDate) return
    const data: NTDMfgStatusData = {
      mfg_start_date: startDate,
      eta_date: etaDate,
      updates: [],
      status: "in_progress",
    }
    setNTDMfgStatus(ntdId, data)
    setMfgData(data)
  }

  function handlePostUpdate() {
    if (!updateNote.trim() || !mfgData) return
    const updated: NTDMfgStatusData = {
      ...mfgData,
      updates: [
        ...mfgData.updates,
        { date: new Date().toISOString(), note: updateNote.trim(), posted_by: "supplier" },
      ],
    }
    setNTDMfgStatus(ntdId, updated)
    setMfgData(updated)
    setUpdateNote("")
  }

  function handleMarkComplete() {
    if (!mfgData) return
    const updated: NTDMfgStatusData = { ...mfgData, status: "complete" }
    setNTDMfgStatus(ntdId, updated)
    setMfgData(updated)
  }

  if (mfgData?.status === "complete") {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <div>
          <p className="text-[13px] font-bold text-emerald-800">Manufacturing Complete</p>
          <p className="text-[11px] text-emerald-600">
            Started {mfgData.mfg_start_date} · ETA was {mfgData.eta_date}
          </p>
        </div>
      </div>
    )
  }

  if (mfgData?.status === "in_progress") {
    return (
      <div className="rounded-xl border border-blue-100 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-[13px] font-bold text-slate-800">Manufacturing — In Progress</span>
        </div>
        <div className="text-[12px] text-slate-500">
          Started: <span className="font-medium text-slate-700">{mfgData.mfg_start_date}</span>
          {" · "}ETA: <span className="font-medium text-slate-700">{mfgData.eta_date}</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="Post a manufacturing status update…"
            value={updateNote}
            onChange={(e) => setUpdateNote(e.target.value)}
          />
          <button
            onClick={handlePostUpdate}
            disabled={!updateNote.trim()}
            className="px-3 py-2 rounded-lg text-[12px] font-semibold bg-slate-700 hover:bg-slate-800 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Post
          </button>
        </div>

        {mfgData.updates.length > 0 && (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {[...mfgData.updates].reverse().map((u, idx) => (
              <div key={idx} className="text-[12px] text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5">
                {u.note} <span className="text-[10px] text-slate-400 ml-1">{new Date(u.date).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleMarkComplete}
          className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          Mark Manufacturing Complete
        </button>
      </div>
    )
  }

  // Not started
  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
      <p className="text-[13px] font-bold text-slate-800">Confirm Manufacturing Start</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Start Date</label>
          <input
            type="date"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">ETA Date</label>
          <input
            type="date"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
            value={etaDate}
            onChange={(e) => setEtaDate(e.target.value)}
          />
        </div>
      </div>
      <button
        onClick={handleConfirmStart}
        disabled={!startDate || !etaDate}
        className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Confirm Start
      </button>
    </div>
  )
}

// ─── Stage 8C — Sample dispatch (supplier) ────────────────────

function Stage8CSupplierView({ ntdId, onDispatched }: { ntdId: string; onDispatched: () => void }) {
  const [trackingInfo, setTrackingInfo] = useState("")
  const [dispatching, setDispatching] = useState(false)
  const [dispatched, setDispatched] = useState(false)

  const trialsData = getNTDTrials(ntdId)
  if (!trialsData || trialsData.trials.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
        <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-[13px] font-semibold text-slate-400">
          Awaiting trial initiation by sourcing team
        </p>
      </div>
    )
  }

  const latestTrial = trialsData.trials[trialsData.trials.length - 1]
  const trialNo = latestTrial.trial_no

  if (latestTrial.status !== "pending" || dispatched) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <div>
          <p className="text-[13px] font-bold text-emerald-800">
            Trial {trialNo} — Samples Dispatched
          </p>
          <p className="text-[11px] text-emerald-600">
            {latestTrial.samples_received_at
              ? `Received at plant: ${new Date(latestTrial.samples_received_at).toLocaleString()}`
              : "Awaiting receipt confirmation at plant."}
          </p>
        </div>
      </div>
    )
  }

  function handleDispatch() {
    if (!trackingInfo.trim()) return
    setDispatching(true)
    const now = new Date().toISOString()
    const data = getNTDTrials(ntdId)
    if (!data) { setDispatching(false); return }

    const updated = {
      ...data,
      trials: data.trials.map((t) =>
        t.trial_no === trialNo
          ? { ...t, status: "samples_received" as const, samples_received_at: now }
          : t,
      ),
    }
    setNTDTrials(ntdId, updated)
    setDispatching(false)
    setDispatched(true)
    onDispatched()
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
      <p className="text-[13px] font-bold text-slate-800">
        Dispatch Sample Batch — Trial {trialNo}
      </p>
      <p className="text-[12px] text-slate-500">
        Confirm shipment of sample batch for Trial {trialNo}. Enter tracking information.
      </p>
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
          Tracking / Dispatch Info <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
          placeholder="Courier name, tracking number, or notes…"
          value={trackingInfo}
          onChange={(e) => setTrackingInfo(e.target.value)}
        />
      </div>
      <button
        onClick={handleDispatch}
        disabled={dispatching || !trackingInfo.trim()}
        className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {dispatching ? "Confirming…" : `Confirm Dispatch for Trial ${trialNo}`}
      </button>
    </div>
  )
}

// ─── Stage 9 — Final Inspection Report (supplier) ────────────

function Stage9InspectionView({ ntdId }: { ntdId: string }) {
  const [reportDoc, setReportDoc] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [inspection, setInspectionState] = useState<NTDInspectionData | null>(null)

  useEffect(() => {
    setInspectionState(getNTDInspection(ntdId))
  }, [ntdId])

  if (inspection) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-4 flex items-center gap-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <div>
          <p className="text-[13px] font-bold text-emerald-800">Report Submitted</p>
          <p className="text-[11px] text-emerald-600">
            Submitted at {new Date(inspection.submitted_at).toLocaleString()}
          </p>
          <a
            href={inspection.report_doc}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-emerald-700 underline mt-0.5 inline-block"
          >
            View Report
          </a>
        </div>
      </div>
    )
  }

  function handleSubmit() {
    if (!reportDoc.trim()) return
    setSubmitting(true)
    const data: NTDInspectionData = {
      report_doc: reportDoc.trim(),
      submitted_by: "supplier",
      submitted_at: new Date().toISOString(),
    }
    setNTDInspection(ntdId, data)
    setInspectionState(data)
    setSubmitting(false)
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
      <p className="text-[13px] font-bold text-slate-800">Submit Final Inspection Report</p>
      <p className="text-[12px] text-slate-500">
        Upload a link to the final inspection report confirming tool quality before commissioning.
      </p>
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
          Report Document Link <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
          placeholder="https://drive.google.com/…"
          value={reportDoc}
          onChange={(e) => setReportDoc(e.target.value)}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting || !reportDoc.trim()}
        className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting…" : "Submit Final Inspection Report"}
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function SupplierNTDPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""

  const [record, setRecord] = useState<NTDRecord | null | undefined>(undefined)
  const [actionableComponents, setActionableComponents] = useState<NTDDFMComponent[]>([])
  const [approvedCount, setApprovedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [dfmAllApproved, setDfmAllApproved] = useState(false)
  const [subStage8, setSubStage8] = useState<"8A" | "8B" | "8C">("8A")
  const [mouldActionable, setMouldActionable] = useState<NTDMouldComponent[]>([])
  const [mouldApprovedCount, setMouldApprovedCount] = useState(0)
  const [mouldTotal, setMouldTotal] = useState(0)

  const refresh = useCallback(() => {
    const r = getNTDRecord(id)
    setRecord(r ?? null)

    if (!r) return

    // DFM data (stage 7)
    const dfm = getNTDDFM(id)
    if (dfm) {
      const actionable = getDFMComponentsForSupplier(id)
      setActionableComponents(actionable)
      const approved = dfm.components.filter((c) => c.final_status === "approved").length
      setApprovedCount(approved)
      setTotalCount(dfm.components.length)
      setDfmAllApproved(dfm.stage_complete)
    }

    // Stage 8 data
    if (r.current_stage >= 8) {
      const sub = getNTDSubStage8Status(id)
      setSubStage8(sub)

      const mouldData = getNTDMouldDesign(id)
      if (mouldData) {
        const actionable = mouldData.components.filter(
          (c) => !c.locked && c.final_status !== "approved",
        )
        setMouldActionable(actionable)
        const approved = mouldData.components.filter((c) => c.final_status === "approved").length
        setMouldApprovedCount(approved)
        setMouldTotal(mouldData.components.length)
      }
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
  const safeRecord = record

  // ── Shared page header ────────────────────────────────────────

  function PageHeader({ subtitle }: { subtitle: string }) {
    return (
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] font-mono text-slate-400 mb-0.5">{safeRecord.id}</p>
          <h1 className="text-[16px] font-bold text-slate-900">{safeRecord.title}</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
    )
  }

  // ── Stages 1–6: no supplier action ───────────────────────────

  if (currentStage < 7) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader subtitle={`Stage ${currentStage} — No Supplier Action Required`} />
        <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-[15px] font-bold text-slate-800">Stage {currentStage} In Progress</p>
          <p className="text-[12px] text-slate-400 mt-1">
            DFM file submission will be available when Stage 7 begins. No supplier action required at
            this time.
          </p>
        </div>
      </div>
    )
  }

  // ── Stage 7 — DFM ────────────────────────────────────────────

  if (currentStage === 7) {
    if (dfmAllApproved) {
      return (
        <div className="min-h-screen bg-slate-50">
          <PageHeader subtitle="DFM File Submission — Stage 7" />
          <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-[15px] font-bold text-slate-800">
              All Components Approved — DFM Complete
            </p>
            <p className="text-[12px] text-slate-500 mt-1">
              All {totalCount} components have been approved. The NTD is proceeding to Stage 8.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-100 px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-[11px] font-mono text-slate-400 mb-0.5">{record.id}</p>
                <h1 className="text-[16px] font-bold text-slate-900">{record.title}</h1>
                <p className="text-[12px] text-slate-500 mt-0.5">DFM File Submission — Stage 7</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-semibold text-slate-600">
                  {approvedCount} / {totalCount} Approved
                </p>
                <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden mt-1 ml-auto">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: totalCount > 0 ? `${Math.round((approvedCount / totalCount) * 100)}%` : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
          <p className="text-[12px] text-slate-500">
            Please submit your PPT presentation and 3D data for each component below. Both R&amp;D
            and Sourcing will review your files. Components requiring revision will display feedback.
          </p>

          {approvedCount > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
              <div className="flex items-center gap-2 text-[12px] text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{approvedCount}</strong> component{approvedCount !== 1 ? "s" : ""}{" "}
                  approved and locked.
                </span>
              </div>
            </div>
          )}

          {actionableComponents.length === 0 ? (
            <div className="rounded-xl border border-yellow-100 bg-yellow-50/50 px-4 py-6 text-center">
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-yellow-800">
                All submitted files are under review
              </p>
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

  // ── Stage 8 ──────────────────────────────────────────────────

  if (currentStage === 8) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <p className="text-[11px] font-mono text-slate-400 mb-0.5">{record.id}</p>
            <h1 className="text-[16px] font-bold text-slate-900">{record.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[12px] text-slate-500">Stage 8 —</span>
              <span className="text-[12px] font-semibold text-blue-700">
                {subStage8 === "8A"
                  ? "Mould Design Review"
                  : subStage8 === "8B"
                  ? "Manufacturing"
                  : "Trial Samples & Testing"}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
          {/* 8A — Mould Design */}
          {subStage8 === "8A" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-[14px] font-bold text-slate-800">8A — Mould Design Submission</h2>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-slate-600">
                    {mouldApprovedCount} / {mouldTotal} Approved
                  </p>
                  <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden mt-1 ml-auto">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: mouldTotal > 0 ? `${Math.round((mouldApprovedCount / mouldTotal) * 100)}%` : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[12px] text-slate-500">
                Submit Mould Design 3D file and MFA PPT for each component. Both R&amp;D and Sourcing
                will review within 24 hours.
              </p>

              {mouldActionable.length === 0 ? (
                <div className="rounded-xl border border-yellow-100 bg-yellow-50/50 px-4 py-6 text-center">
                  <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-[13px] font-semibold text-yellow-800">
                    All submitted files are under review
                  </p>
                  <p className="text-[11px] text-yellow-600 mt-1">
                    Awaiting R&amp;D and Sourcing review.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mouldActionable.map((comp) => (
                    <MouldSubmitCard
                      key={comp.componentId}
                      component={comp}
                      ntdId={id}
                      onSubmitted={refresh}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 8B — Manufacturing */}
          {subStage8 === "8B" && (
            <div className="space-y-4">
              <h2 className="text-[14px] font-bold text-slate-800">8B — Manufacturing</h2>
              <p className="text-[12px] text-slate-500">
                Confirm manufacturing start, post status updates, and mark complete when the sample
                batch is ready.
              </p>
              <Stage8BSupplierView ntdId={id} />
            </div>
          )}

          {/* 8C — Sample dispatch */}
          {subStage8 === "8C" && (
            <div className="space-y-4">
              <h2 className="text-[14px] font-bold text-slate-800">8C — Trial Sample Dispatch</h2>
              <p className="text-[12px] text-slate-500">
                When the sourcing team initiates a new trial, dispatch the sample batch and confirm
                below.
              </p>
              <Stage8CSupplierView ntdId={id} onDispatched={refresh} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Stage 9 — Final Inspection Report ────────────────────────

  if (currentStage === 9) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader subtitle="Final Inspection Report — Stage 9" />
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
          <p className="text-[12px] text-slate-500">
            Submit the final inspection report to confirm tool quality before commissioning and
            dispatch.
          </p>
          <Stage9InspectionView ntdId={id} />
        </div>
      </div>
    )
  }

  // ── Fallback for any unexpected stage ────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader subtitle={`Stage ${currentStage} In Progress`} />
      <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-[15px] font-bold text-slate-800">Stage {currentStage} In Progress</p>
        <p className="text-[12px] text-slate-400 mt-1">
          No supplier action required at this stage.
        </p>
      </div>
    </div>
  )
}
