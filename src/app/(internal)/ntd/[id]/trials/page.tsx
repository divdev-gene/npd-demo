"use client"
import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Plus, CheckCircle2, XCircle, AlertTriangle,
  Link2, Copy, Check as CheckIcon, ExternalLink, ChevronDown, ChevronUp,
  Package, FlaskConical, RefreshCcw, ThumbsUp, ThumbsDown, Clock,
} from "lucide-react"
import {
  getNTDRecord, getNTDHandoff, getNTDTrials, setNTDTrials,
  getNTDRedesign, setNTDRedesign, getNTDMould, setNTDMould,
  advanceNTDStage, appendActivity, getTrialProgress,
  getNextTrialNo, canInitiateNewTrial, getFailedComponentsFromTrial,
  getSLADeadline,
} from "@/lib/ntd"
import type { NTDRecord, NTDTrialsData, NTDTrial, ComponentTestResult, NTDRole, NTDMouldData, NTDMouldComponent, MouldReview } from "@/types/ntd"

const SOURCING_SPOC_ROLES = ["Rahul Sharma", "Karan Mehta", "Priya Rajan", "Amit Kumar", "Varun Joshi", "Rohan Desai"]

function toNTDRole(pocRole: string): NTDRole {
  if (pocRole === "rnd_head") return "rnd_head"
  if (pocRole === "sourcing_head") return "sourcing_head"
  if (pocRole === "super_admin") return "super_admin"
  if (pocRole.startsWith("rnd")) return "rnd"
  if (pocRole.startsWith("sourcing") || SOURCING_SPOC_ROLES.includes(pocRole)) return "sourcing"
  return "rnd"
}

const TEST_PARAMS = [
  { key: "dimensional_accuracy",  label: "Dimensional Accuracy",   fields: ["actual", "spec"] },
  { key: "surface_finish",        label: "Surface Finish",         fields: ["ra_value", "visual_grade"] },
  { key: "material_hardness",     label: "Material Hardness",      fields: ["reading"] },
  { key: "cavity_fill_flash",     label: "Cavity Fill / Flash",    fields: ["notes"] },
  { key: "ejection_parting_line", label: "Ejection / Parting Line",fields: ["defect_desc"] },
  { key: "tooling_fit_assembly",  label: "Tooling Fit & Assembly", fields: ["notes"] },
  { key: "cycle_time",            label: "Cycle Time",             fields: ["actual_sec", "target_sec"] },
] as const

type TestParamKey = typeof TEST_PARAMS[number]["key"]

const STATUS_META = {
  pending:            { label: "Pending",            cls: "bg-slate-100 text-slate-600" },
  samples_dispatched: { label: "Samples Dispatched", cls: "bg-blue-100 text-blue-700" },
  samples_received:   { label: "Samples Received",   cls: "bg-indigo-100 text-indigo-700" },
  testing:            { label: "Testing",             cls: "bg-amber-100 text-amber-700" },
  complete:           { label: "Complete",            cls: "bg-slate-100 text-slate-600" },
}

function relTime(iso: string) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

// ── Completed result detail panel ─────────────────────────────────────────────
function ResultBreakdown({ result }: { result: ComponentTestResult }) {
  const [open, setOpen] = useState(false)
  const r = result as unknown as Record<string, Record<string, string>>

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 mt-1 transition-colors">
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? "Hide" : "Show"} test breakdown
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {TEST_PARAMS.map(param => {
            const paramResult = r[param.key]
            if (!paramResult) return null
            const isPassed = paramResult.verdict === "pass"
            return (
              <div key={param.key} className={`flex items-start gap-3 rounded-lg px-3 py-2 text-xs ${isPassed ? "bg-emerald-50" : "bg-red-50"}`}>
                <span className={`shrink-0 font-bold text-[10px] px-1.5 py-0.5 rounded-full ${isPassed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {isPassed ? "PASS" : "FAIL"}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700">{param.label}</p>
                  <p className="text-slate-500 mt-0.5">
                    {param.fields.map(f => `${f.replace(/_/g, " ")}: ${paramResult[f] || "—"}`).join(" · ")}
                  </p>
                </div>
              </div>
            )
          })}
          {result.feedback_ppt_link && (
            <a href={result.feedback_ppt_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-red-700 hover:underline font-medium mt-1">
              <ExternalLink className="w-3 h-3" /> Feedback PPT
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default function TrialsPage() {
  const params = useParams()
  const id = params.id as string
  const [currentRole, setCurrentRole] = useState("")
  const [record, setRecord] = useState<NTDRecord | null>(null)
  const [trialsData, setTrialsData] = useState<NTDTrialsData | null>(null)
  const [activeTrial, setActiveTrial] = useState(1)
  const [testInputs, setTestInputs] = useState<Record<string, Record<string, string>>>({})
  const [copied, setCopied] = useState(false)
  const [copiedRedesign, setCopiedRedesign] = useState(false)
  const [mouldData, setMouldData] = useState<NTDMouldData | null>(null)
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({})

  const reload = useCallback(() => {
    setRecord(getNTDRecord(id))
    const data = getNTDTrials(id) ?? { trials: [], stage_complete: false }
    setTrialsData(data)
    if (data.trials.length > 0) setActiveTrial(data.trials[data.trials.length - 1].trial_no)
    setMouldData(getNTDMould(id))
  }, [id])

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
    reload()
    const t = setInterval(reload, 3000)
    return () => clearInterval(t)
  }, [reload])

  if (!record || !trialsData) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Loading...</p>
    </div>
  )

  const ntdRole = toNTDRole(currentRole)
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"
  const isSourcing = currentRole.startsWith("sourcing") || SOURCING_SPOC_ROLES.includes(currentRole) || currentRole === "super_admin"
  const { passed, total } = getTrialProgress(id)
  const currentTrial = trialsData.trials.find(t => t.trial_no === activeTrial)
  const canInit = canInitiateNewTrial(id)
  const nextTrialNo = getNextTrialNo(id)
  const handoff = getNTDHandoff(id)
  const components = handoff?.components ?? []
  const redesignData = getNTDRedesign(id)

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleInitiateTrial = () => {
    const data = getNTDTrials(id) ?? { trials: [], stage_complete: false }
    const newTrial: NTDTrial = {
      trial_no: nextTrialNo,
      initiated_at: new Date().toISOString(),
      initiated_by: currentRole,
      samples_dispatched_at: "",
      samples_received_at: "",
      status: "pending",
      result: null,
      components: [],
    }
    setNTDTrials(id, { ...data, trials: [...data.trials, newTrial] })
    appendActivity(id, currentRole, ntdRole, 10, "trial_initiated", `Trial T${nextTrialNo} initiated`)
    setActiveTrial(nextTrialNo)
    reload()
  }

  // Demo: simulate supplier dispatch
  const handleSimulateDispatch = (trialNo: number) => {
    const data = getNTDTrials(id)!
    setNTDTrials(id, {
      ...data,
      trials: data.trials.map(t => t.trial_no === trialNo
        ? { ...t, status: "samples_dispatched", samples_dispatched_at: new Date().toISOString() }
        : t)
    })
    appendActivity(id, "supplier", "supplier", 10, "samples_dispatched", `Trial T${trialNo} samples dispatched`, { trial_no: trialNo })
    reload()
  }

  const handleMarkSamplesReceived = (trialNo: number) => {
    const data = getNTDTrials(id)!
    setNTDTrials(id, {
      ...data,
      trials: data.trials.map(t => t.trial_no === trialNo
        ? { ...t, status: "samples_received", samples_received_at: new Date().toISOString() }
        : t)
    })
    appendActivity(id, currentRole, ntdRole, 10, "samples_received", `Samples received for Trial T${trialNo}`)
    reload()
  }

  // Inline redesign component approval (writes to mould data, resolves redesign round)
  const handleRedesignApproval = (componentId: string, reviewer: "rnd" | "sourcing", verdict: "approved" | "rejected") => {
    const existing = getNTDMould(id)
    if (!existing) return
    const now = new Date().toISOString()
    const comments = reviewComments[`${componentId}_${reviewer}`] ?? ""
    const updated: NTDMouldData = {
      ...existing,
      components: existing.components.map(comp => {
        if (comp.componentId !== componentId) return comp
        const reviewKey = reviewer === "rnd" ? "rnd_review" : "sourcing_review"
        const updatedReview: MouldReview = {
          verdict,
          comments,
          reviewed_by: currentRole,
          reviewed_at: now,
          sla_deadline: comp[reviewKey].sla_deadline || getSLADeadline(now),
        }
        const updatedComp = { ...comp, [reviewKey]: updatedReview }
        const rndVerdict = reviewer === "rnd" ? verdict : comp.rnd_review.verdict
        const sourcingVerdict = reviewer === "sourcing" ? verdict : comp.sourcing_review.verdict
        const rndDone = rndVerdict !== "pending"
        const sourcingDone = sourcingVerdict !== "pending"
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
    setNTDMould(id, updated)

    // Resolve redesign round if all failed components are now approved
    const redesign = getNTDRedesign(id)
    if (redesign) {
      const activeRound = redesign.redesign_rounds.slice().reverse().find(r => !r.resolved_at)
      if (activeRound) {
        const allApproved = activeRound.failed_component_ids.every(cid =>
          updated.components.find(c => c.componentId === cid)?.final_status === "approved"
        )
        if (allApproved) {
          setNTDRedesign(id, {
            redesign_rounds: redesign.redesign_rounds.map(r =>
              r.round_no === activeRound.round_no
                ? { ...r, resolved_at: new Date().toISOString() }
                : r
            )
          })
          appendActivity(id, currentRole, ntdRole, 10, "stage_complete",
            `Redesign Round ${activeRound.round_no} complete — Trial T${activeRound.triggered_by_trial + 1} can now be initiated.`)
        }
      }
    }
    setReviewComments(prev => { const n = { ...prev }; delete n[`${componentId}_${reviewer}`]; return n })
    reload()
  }

  const handleSetTestInput = (componentId: string, field: string, value: string) =>
    setTestInputs(prev => ({ ...prev, [componentId]: { ...(prev[componentId] ?? {}), [field]: value } }))

  const handleSubmitComponent = (trialNo: number, componentId: string) => {
    const data = getNTDTrials(id)!
    const inputs = testInputs[componentId] ?? {}
    let anyFail = false
    const results: Record<string, { verdict: "pass" | "fail" } & Record<string, unknown>> = {}
    for (const param of TEST_PARAMS) {
      const verdict = (inputs[`${param.key}_verdict`] ?? "pass") as "pass" | "fail"
      if (verdict === "fail") anyFail = true
      const extra: Record<string, string | number> = {}
      for (const f of param.fields) extra[f] = inputs[`${param.key}_${f}`] ?? (f.includes("sec") ? 0 : "")
      results[param.key] = { verdict, ...extra }
    }
    const overall = anyFail ? "fail" : "pass"
    const newResult: ComponentTestResult = {
      componentId,
      dimensional_accuracy:   results.dimensional_accuracy as ComponentTestResult["dimensional_accuracy"],
      surface_finish:         results.surface_finish as ComponentTestResult["surface_finish"],
      material_hardness:      results.material_hardness as ComponentTestResult["material_hardness"],
      cavity_fill_flash:      results.cavity_fill_flash as ComponentTestResult["cavity_fill_flash"],
      ejection_parting_line:  results.ejection_parting_line as ComponentTestResult["ejection_parting_line"],
      tooling_fit_assembly:   results.tooling_fit_assembly as ComponentTestResult["tooling_fit_assembly"],
      cycle_time:             results.cycle_time as ComponentTestResult["cycle_time"],
      overall_verdict: overall,
      feedback_ppt_link: inputs.feedback_ppt_link ?? "",
      requires_redesign: overall === "fail",
    }

    const updated: NTDTrialsData = {
      ...data,
      trials: data.trials.map(t => {
        if (t.trial_no !== trialNo) return t
        const existing = t.components.filter(c => c.componentId !== componentId)
        const all = [...existing, newResult]
        const allSubmitted = handoff?.components.every(c => all.some(r => r.componentId === c.componentId))
        if (allSubmitted) {
          const allPass = all.every(c => c.overall_verdict === "pass")
          return { ...t, components: all, status: "complete", result: allPass ? "all_pass" : "partial_fail" }
        }
        // At least one component submitted → testing status
        return { ...t, components: all, status: "testing" }
      })
    }

    const trial = updated.trials.find(t => t.trial_no === trialNo)
    if (trial?.result === "all_pass") {
      updated.stage_complete = true
      setNTDTrials(id, updated)
      advanceNTDStage(id, 11, currentRole, ntdRole)
      appendActivity(id, currentRole, ntdRole, 10, "trial_result", `Trial T${trialNo} — ALL PASS. Advancing to Stage 11.`, { trial_no: trialNo })
    } else if (trial?.result === "partial_fail") {
      setNTDTrials(id, updated)
      const failedIds = getFailedComponentsFromTrial(id, trialNo)
      const redesign = getNTDRedesign(id) ?? { redesign_rounds: [] }
      const newRound = redesign.redesign_rounds.length + 1
      setNTDRedesign(id, {
        redesign_rounds: [...redesign.redesign_rounds, {
          round_no: newRound,
          triggered_by_trial: trialNo,
          failed_component_ids: failedIds,
          re_enters: "STAGE_8A_MOULD_DESIGN_ONLY",
          mould_redesign_round_ref: newRound,
          resolved_at: "",
        }]
      })
      const mould = getNTDMould(id)
      if (mould) {
        setNTDMould(id, {
          ...mould,
          redesign_round: newRound,
          components: mould.components.map(c => failedIds.includes(c.componentId)
            ? { ...c, locked: false, final_status: "pending" }
            : c)
        })
      }
      appendActivity(id, currentRole, ntdRole, 10, "redesign_triggered",
        `Trial T${trialNo} partial fail — ${failedIds.length} component(s) sent back to Stage 8A`, { trial_no: trialNo })
    } else {
      setNTDTrials(id, updated)
    }

    setTestInputs(prev => { const n = { ...prev }; delete n[componentId]; return n })
    reload()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
      <Link href={`/ntd/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to NTD {record.id}
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Stage 10 — Trials</h1>
            <p className="text-sm text-slate-500 mt-0.5">{record.title}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-800">{passed} <span className="text-slate-400 text-lg">/ {total}</span></p>
            <p className="text-xs text-slate-400">Components Passed (Cumulative)</p>
          </div>
        </div>
        {/* Cumulative progress bar */}
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: total > 0 ? `${Math.round((passed / total) * 100)}%` : "0%" }} />
        </div>
        {trialsData.stage_complete && (
          <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="font-semibold text-emerald-800">All trials passed — Advanced to Stage 11.</p>
          </div>
        )}
      </div>

      {/* Two-column layout: sidebar + main */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Supplier portal link */}
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Supplier Portal</h3>
            </div>
            <p className="text-[11px] text-slate-500">Share with supplier to confirm sample dispatch for each trial.</p>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <a href={`/supplier/ntd/${id}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-xs text-blue-700 font-mono truncate hover:underline">
                /supplier/ntd/{id}
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/supplier/ntd/${id}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="shrink-0 p-1 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors"
                title="Copy link">
                {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <a href={`/supplier/ntd/${id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 transition-colors">
              Open Supplier Portal <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Redesign portal link — shown when a redesign is active */}
          {!canInit && !trialsData.stage_complete && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-amber-900 text-sm">Supplier Redesign Portal</h3>
              </div>
              <p className="text-[11px] text-amber-800">Share with supplier to upload redesigned mould files.</p>
              <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
                <a href={`/supplier/ntd/redesign/${id}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-[10px] text-amber-800 font-mono truncate hover:underline">
                  /supplier/ntd/redesign/{id}
                </a>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/supplier/ntd/redesign/${id}`); setCopiedRedesign(true); setTimeout(() => setCopiedRedesign(false), 2000) }}
                  className="shrink-0 p-1 rounded hover:bg-amber-100 text-amber-500 transition-colors">
                  {copiedRedesign ? <CheckIcon className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <a href={`/supplier/ntd/redesign/${id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-amber-700 bg-white hover:bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 transition-colors">
                Open Supplier Portal <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Trial list / initiate */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Trials</p>
            <div className="space-y-1.5">
              {trialsData.trials.map(t => (
                <button key={t.trial_no} onClick={() => setActiveTrial(t.trial_no)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTrial === t.trial_no
                    ? "bg-slate-800 text-white"
                    : t.result === "all_pass" ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : t.result === "partial_fail" ? "bg-red-50 text-red-700 hover:bg-red-100"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
                  <span className="flex items-center gap-2">
                    {t.result === "all_pass" ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : t.result === "partial_fail" ? <XCircle className="w-3.5 h-3.5" />
                      : <FlaskConical className="w-3.5 h-3.5 opacity-60" />}
                    Trial T{t.trial_no}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_META[t.status].cls}`}>
                    {STATUS_META[t.status].label}
                  </span>
                </button>
              ))}
            </div>
            {!trialsData.stage_complete && isSourcing && (
              <button onClick={handleInitiateTrial} disabled={!canInit}
                title={!canInit ? "Waiting for redesign loop to complete" : undefined}
                className="flex items-center justify-center gap-1.5 w-full text-sm font-semibold border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-colors">
                <Plus className="w-4 h-4" /> Initiate T{nextTrialNo}
              </button>
            )}
            {!canInit && !trialsData.stage_complete && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                Redesign loop in progress — complete Stage 8A before initiating next trial.
              </p>
            )}
          </div>

          {/* Redesign history */}
          {redesignData && redesignData.redesign_rounds.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Redesign History</p>
              {redesignData.redesign_rounds.map(r => (
                <div key={r.round_no} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
                  <p className="text-xs font-semibold text-amber-800">
                    Round {r.round_no} — triggered by T{r.triggered_by_trial}
                  </p>
                  <p className="text-[11px] text-amber-700">
                    {r.failed_component_ids.length} component(s): {r.failed_component_ids.join(", ")}
                  </p>
                  <Link href={`/ntd/${id}/mould-design`}
                    className="text-[11px] text-amber-700 hover:underline font-semibold">
                    Open Mould Design →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Main panel ── */}
        <div className="lg:col-span-2">

          {/* ── Redesign Approval Panel (shown when a redesign round is active) ── */}
          {!canInit && !trialsData.stage_complete && (() => {
            const activeRound = redesignData?.redesign_rounds.slice().reverse().find(r => !r.resolved_at)
            if (!activeRound) return null
            const failedIds = activeRound.failed_component_ids
            const failedComponents = (mouldData?.components ?? []).filter(c => failedIds.includes(c.componentId))
            const approvedCount = failedComponents.filter(c => c.final_status === "approved").length
            const allApproved = approvedCount === failedComponents.length && failedComponents.length > 0

            return (
              <div className="space-y-4 mb-6">
                {/* Banner */}
                <div className={`rounded-xl border px-5 py-4 flex items-start gap-3 ${allApproved ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"}`}>
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${allApproved ? "bg-emerald-100" : "bg-orange-100"}`}>
                    {allApproved ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <RefreshCcw className="w-4 h-4 text-orange-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${allApproved ? "text-emerald-800" : "text-orange-800"}`}>
                      {allApproved
                        ? `Redesign Round ${activeRound.round_no} Complete — Trial T${activeRound.triggered_by_trial + 1} is ready to initiate`
                        : `Redesign Round ${activeRound.round_no} — Approval Required Before Trial T${activeRound.triggered_by_trial + 1}`}
                    </p>
                    <p className={`text-xs mt-0.5 ${allApproved ? "text-emerald-700" : "text-orange-700"}`}>
                      {allApproved
                        ? "All failed components approved. Use the Initiate button to start the next trial."
                        : `${approvedCount}/${failedComponents.length} components approved · Trial T${activeRound.triggered_by_trial} failed: ${failedIds.join(", ")}`}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${allApproved ? "bg-emerald-200 text-emerald-800" : "bg-orange-200 text-orange-800"}`}>
                    {approvedCount}/{failedComponents.length}
                  </span>
                </div>

                {/* Component approval cards */}
                {failedComponents.map(comp => {
                  const isApproved = comp.final_status === "approved"
                  const isPending = comp.final_status === "pending"
                  const isUnderReview = comp.final_status === "under_review"
                  const isRevisionRequired = comp.final_status === "revision_required"
                  const mouldLink = comp.mould_3d?.versions.find(v => v.version_no === comp.mould_3d.current_version)?.link ?? ""
                  const mfaLink = comp.mfa_ppt?.versions.find(v => v.version_no === comp.mfa_ppt.current_version)?.link ?? ""
                  const myReviewKey = isRnd ? "rnd_review" : isSourcing ? "sourcing_review" : null
                  const myReview = myReviewKey ? comp[myReviewKey] : null
                  const alreadyReviewed = myReview && myReview.verdict !== "pending"
                  const canReview = (isRnd || isSourcing) && (isUnderReview || isRevisionRequired) && !alreadyReviewed

                  return (
                    <div key={comp.componentId} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isApproved ? "border-emerald-200" : isRevisionRequired ? "border-red-200" : isUnderReview ? "border-violet-200" : "border-slate-200"}`}>
                      {/* Component header */}
                      <div className={`px-5 py-3 flex items-center justify-between ${isApproved ? "bg-emerald-50" : isRevisionRequired ? "bg-red-50" : isUnderReview ? "bg-violet-50" : "bg-slate-50"}`}>
                        <div className="flex items-center gap-2.5">
                          {isApproved
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            : isRevisionRequired ? <XCircle className="w-4 h-4 text-red-500" />
                            : isUnderReview ? <Clock className="w-4 h-4 text-violet-500" />
                            : <Package className="w-4 h-4 text-slate-400" />}
                          <p className="font-bold text-slate-800">{comp.componentId} — {comp.name}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isApproved ? "bg-emerald-200 text-emerald-800"
                          : isRevisionRequired ? "bg-red-100 text-red-700"
                          : isUnderReview ? "bg-violet-100 text-violet-700"
                          : "bg-slate-100 text-slate-500"}`}>
                          {isApproved ? "Approved" : isRevisionRequired ? "Revision Required" : isUnderReview ? "Under Review" : "Awaiting Supplier"}
                        </span>
                      </div>

                      <div className="p-5 space-y-4">
                        {isPending && (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Clock className="w-4 h-4 text-slate-300" />
                            Waiting for supplier to submit redesigned files via the portal above.
                          </div>
                        )}

                        {(isUnderReview || isRevisionRequired || isApproved) && (
                          <div className="space-y-3">
                            {/* Submitted files */}
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Submitted Files</p>
                              <div className="flex flex-wrap gap-2">
                                {mouldLink ? (
                                  <a href={mouldLink} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg px-3 py-1.5 transition-colors">
                                    Mould 3D v{comp.mould_3d.current_version} <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Mould 3D — not submitted</span>
                                )}
                                {mfaLink ? (
                                  <a href={mfaLink} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg px-3 py-1.5 transition-colors">
                                    MFA PPT v{comp.mfa_ppt.current_version} <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">MFA PPT — not submitted</span>
                                )}
                              </div>
                            </div>

                            {/* Reviewer status */}
                            <div className="grid grid-cols-2 gap-3">
                              {(["rnd", "sourcing"] as const).map(rev => {
                                const r = rev === "rnd" ? comp.rnd_review : comp.sourcing_review
                                const label = rev === "rnd" ? "R&D" : "Sourcing"
                                return (
                                  <div key={rev} className={`rounded-lg border px-3 py-2.5 space-y-1 ${r.verdict === "approved" ? "border-emerald-200 bg-emerald-50" : r.verdict === "rejected" ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                                    <div className="flex items-center justify-between">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${r.verdict === "approved" ? "bg-emerald-200 text-emerald-700" : r.verdict === "rejected" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-500"}`}>
                                        {r.verdict === "approved" ? "Approved" : r.verdict === "rejected" ? "Rejected" : "Pending"}
                                      </span>
                                    </div>
                                    {r.verdict !== "pending" && r.reviewed_by && (
                                      <p className="text-[10px] text-slate-500">{r.reviewed_by}</p>
                                    )}
                                    {r.comments && <p className="text-[10px] text-slate-600 italic">&ldquo;{r.comments}&rdquo;</p>}
                                  </div>
                                )
                              })}
                            </div>

                            {/* Inline approve / reject — for current role */}
                            {canReview && myReviewKey && (
                              <div className="border-t border-slate-100 pt-3 space-y-2">
                                <p className="text-[11px] font-semibold text-slate-600">
                                  Your review ({isRnd ? "R&D" : "Sourcing"}):
                                </p>
                                <textarea
                                  value={reviewComments[`${comp.componentId}_${isRnd ? "rnd" : "sourcing"}`] ?? ""}
                                  onChange={e => setReviewComments(prev => ({ ...prev, [`${comp.componentId}_${isRnd ? "rnd" : "sourcing"}`]: e.target.value }))}
                                  placeholder="Optional remarks..."
                                  rows={2}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRedesignApproval(comp.componentId, isRnd ? "rnd" : "sourcing", "approved")}
                                    className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors">
                                    <ThumbsUp className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleRedesignApproval(comp.componentId, isRnd ? "rnd" : "sourcing", "rejected")}
                                    className="flex items-center gap-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors">
                                    <ThumbsDown className="w-3.5 h-3.5" /> Request Revision
                                  </button>
                                </div>
                              </div>
                            )}

                            {alreadyReviewed && !isApproved && (
                              <p className="text-[11px] text-slate-400 italic pt-1">
                                You submitted your review. Waiting for {isRnd ? "Sourcing" : "R&D"} to review.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* ── Trial content ── */}
          {!currentTrial ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
              <FlaskConical className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">
                {isSourcing ? "Initiate a new trial to begin." : "Waiting for Sourcing to initiate Trial 1."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Trial header */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">Trial T{currentTrial.trial_no}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Initiated {relTime(currentTrial.initiated_at)} by {currentTrial.initiated_by}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    currentTrial.result === "all_pass" ? "bg-emerald-100 text-emerald-700"
                    : currentTrial.result === "partial_fail" ? "bg-red-100 text-red-700"
                    : STATUS_META[currentTrial.status].cls}`}>
                    {currentTrial.result === "all_pass" ? "All Pass ✓"
                    : currentTrial.result === "partial_fail" ? "Partial Fail"
                    : STATUS_META[currentTrial.status].label}
                  </span>
                </div>

                {/* Trial timeline */}
                <div className="mt-4 flex items-center gap-0">
                  {[
                    { key: "pending",            label: "Initiated",          done: true },
                    { key: "samples_dispatched", label: "Samples Dispatched", done: ["samples_dispatched","samples_received","testing","complete"].includes(currentTrial.status) },
                    { key: "samples_received",   label: "Samples Received",   done: ["samples_received","testing","complete"].includes(currentTrial.status) },
                    { key: "testing",            label: "Testing",            done: ["testing","complete"].includes(currentTrial.status) },
                    { key: "complete",           label: "Complete",           done: currentTrial.status === "complete" },
                  ].map((step, i, arr) => (
                    <div key={step.key} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-3 h-3 rounded-full border-2 ${step.done ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"}`} />
                        <p className={`text-[9px] font-semibold whitespace-nowrap ${step.done ? "text-blue-700" : "text-slate-400"}`}>{step.label}</p>
                      </div>
                      {i < arr.length - 1 && (
                        <div className={`flex-1 h-px mx-1 mb-3 ${step.done ? "bg-blue-400" : "bg-slate-200"}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 1: Awaiting supplier dispatch */}
              {currentTrial.status === "pending" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-slate-400" />
                    <p className="font-semibold text-slate-700">Awaiting Supplier Sample Dispatch</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    The supplier must confirm sample dispatch via the supplier portal before R&D can mark samples as received.
                  </p>
                  {/* Demo simulate button */}
                  <button
                    onClick={() => handleSimulateDispatch(currentTrial.trial_no)}
                    className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors border border-slate-200">
                    ⚡ Simulate Supplier Dispatch (demo)
                  </button>
                </div>
              )}

              {/* Step 2: Mark samples received */}
              {currentTrial.status === "samples_dispatched" && (
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-blue-600" />
                    <p className="font-semibold text-slate-800">Samples Dispatched by Supplier</p>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-semibold">
                      {currentTrial.samples_dispatched_at ? relTime(currentTrial.samples_dispatched_at) : ""}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">Confirm receipt of samples at the plant to begin testing.</p>
                  {isRnd && (
                    <button onClick={() => handleMarkSamplesReceived(currentTrial.trial_no)}
                      className="flex items-center gap-2 text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors">
                      <CheckCircle2 className="w-4 h-4" /> Mark Samples Received
                    </button>
                  )}
                </div>
              )}

              {/* Step 3: Testing — per-component test forms */}
              {(currentTrial.status === "samples_received" || currentTrial.status === "testing") && isRnd && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <FlaskConical className="w-4 h-4 text-amber-600" />
                    <p className="font-semibold text-slate-800 text-sm">Component Test Checklist</p>
                    <span className="text-xs text-slate-400">
                      {currentTrial.components.length} / {components.length} submitted
                    </span>
                  </div>

                  {components.map(comp => {
                    const submitted = currentTrial.components.find(c => c.componentId === comp.componentId)
                    if (submitted) {
                      return (
                        <div key={comp.componentId} className={`bg-white rounded-xl border p-4 ${submitted.overall_verdict === "pass" ? "border-emerald-200" : "border-red-200"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {submitted.overall_verdict === "pass"
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                : <XCircle className="w-4 h-4 text-red-500" />}
                              <p className="font-semibold text-slate-800">{comp.componentId} — {comp.name}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${submitted.overall_verdict === "pass" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              {submitted.overall_verdict === "pass" ? "PASS" : "FAIL"}
                            </span>
                          </div>
                          <ResultBreakdown result={submitted} />
                        </div>
                      )
                    }

                    const inputs = testInputs[comp.componentId] ?? {}
                    const anyFail = TEST_PARAMS.some(p => inputs[`${p.key}_verdict`] === "fail")

                    return (
                      <div key={comp.componentId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
                          <p className="font-bold text-slate-800 text-sm">{comp.componentId} — {comp.name}</p>
                        </div>
                        <div className="p-4 space-y-3">
                          {TEST_PARAMS.map(param => {
                            const verdict = inputs[`${param.key}_verdict`] ?? "pass"
                            return (
                              <div key={param.key} className={`rounded-lg border p-3 space-y-2 ${verdict === "fail" ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50"}`}>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-slate-700">{param.label}</p>
                                  <div className="flex gap-1">
                                    {(["pass", "fail"] as const).map(v => (
                                      <button key={v}
                                        onClick={() => handleSetTestInput(comp.componentId, `${param.key}_verdict`, v)}
                                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${verdict === v
                                          ? v === "pass" ? "bg-emerald-600 text-white shadow-sm"
                                          : "bg-red-500 text-white shadow-sm"
                                          : "bg-white border border-slate-200 text-slate-400 hover:bg-slate-100"}`}>
                                        {v.toUpperCase()}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  {param.fields.map(f => (
                                    <input key={f}
                                      type="text" autoComplete="off"
                                      placeholder={f.replace(/_/g, " ")}
                                      value={inputs[`${param.key}_${f}`] ?? ""}
                                      onChange={e => handleSetTestInput(comp.componentId, `${param.key}_${f}`, e.target.value)}
                                      className="flex-1 min-w-[100px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                  ))}
                                </div>
                              </div>
                            )
                          })}

                          {/* Feedback PPT — required for any fail */}
                          {anyFail && (
                            <div className="space-y-1.5">
                              <label className="flex items-center gap-1 text-xs font-bold text-red-700">
                                <AlertTriangle className="w-3.5 h-3.5" /> Feedback PPT Link (required on fail)
                              </label>
                              <input type="text" autoComplete="off"
                                value={inputs.feedback_ppt_link ?? ""}
                                onChange={e => handleSetTestInput(comp.componentId, "feedback_ppt_link", e.target.value)}
                                placeholder="Drive link to feedback PPT"
                                className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                          )}

                          <button
                            onClick={() => handleSubmitComponent(currentTrial.trial_no, comp.componentId)}
                            disabled={anyFail && !inputs.feedback_ppt_link?.trim()}
                            className="w-full text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors">
                            Submit Test Results for {comp.componentId}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Completed trial summary */}
              {currentTrial.status === "complete" && (
                <div className="space-y-3">
                  {/* Result banner */}
                  {currentTrial.result === "all_pass" ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-800">Trial T{currentTrial.trial_no} — All Pass</p>
                        <p className="text-xs text-emerald-700 mt-0.5">All {components.length} components passed. Advanced to Stage 11.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                        <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-red-800">Trial T{currentTrial.trial_no} — Partial Fail</p>
                          <p className="text-xs text-red-700 mt-0.5">
                            {currentTrial.components.filter(c => c.overall_verdict === "fail").length} component(s) failed — redesign approval required above before Trial T{currentTrial.trial_no + 1} can begin.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Per-component results */}
                  <div className="space-y-2">
                    {components.map(comp => {
                      const result = currentTrial.components.find(c => c.componentId === comp.componentId)
                      if (!result) return null
                      return (
                        <div key={comp.componentId} className={`bg-white rounded-xl border p-4 ${result.overall_verdict === "pass" ? "border-emerald-200" : "border-red-200"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {result.overall_verdict === "pass"
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                : <XCircle className="w-4 h-4 text-red-500" />}
                              <p className="font-semibold text-slate-800">{comp.componentId} — {comp.name}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${result.overall_verdict === "pass" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              {result.overall_verdict === "pass" ? "PASS" : "FAIL"}
                            </span>
                          </div>
                          <ResultBreakdown result={result} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
