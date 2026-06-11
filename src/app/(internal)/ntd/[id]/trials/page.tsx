"use client"
import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import {
  getNTDRecord, getNTDHandoff, getNTDTrials, setNTDTrials,
  getNTDRedesign, setNTDRedesign, getNTDMould, setNTDMould,
  advanceNTDStage, appendActivity, getTrialProgress,
  getNextTrialNo, canInitiateNewTrial, getFailedComponentsFromTrial,
} from "@/lib/ntd"
import type { NTDRecord, NTDTrialsData, NTDTrial, ComponentTestResult, NTDRole } from "@/types/ntd"

function toNTDRole(pocRole: string): NTDRole {
  if (pocRole === "rnd_head") return "rnd_head"
  if (pocRole === "sourcing_head") return "sourcing_head"
  if (pocRole === "super_admin") return "super_admin"
  if (pocRole.startsWith("rnd")) return "rnd"
  if (pocRole.startsWith("sourcing")) return "sourcing"
  return "rnd"
}

const TEST_PARAMS = [
  { key: "dimensional_accuracy", label: "Dimensional Accuracy", fields: ["actual", "spec"] },
  { key: "surface_finish", label: "Surface Finish", fields: ["ra_value", "visual_grade"] },
  { key: "material_hardness", label: "Material Hardness", fields: ["reading"] },
  { key: "cavity_fill_flash", label: "Cavity Fill / Flash", fields: ["notes"] },
  { key: "ejection_parting_line", label: "Ejection / Parting Line", fields: ["defect_desc"] },
  { key: "tooling_fit_assembly", label: "Tooling Fit & Assembly", fields: ["notes"] },
  { key: "cycle_time", label: "Cycle Time", fields: ["actual_sec", "target_sec"] },
] as const

type TestParamKey = typeof TEST_PARAMS[number]["key"]

export default function TrialsPage() {
  const params = useParams()
  const id = params.id as string
  const [currentRole, setCurrentRole] = useState("")
  const [record, setRecord] = useState<NTDRecord | null>(null)
  const [trialsData, setTrialsData] = useState<NTDTrialsData | null>(null)
  const [activeTrial, setActiveTrial] = useState(1)
  const [testInputs, setTestInputs] = useState<Record<string, Record<string, string>>>({})

  const reload = useCallback(() => {
    setRecord(getNTDRecord(id))
    const data = getNTDTrials(id) ?? { trials: [], stage_complete: false }
    setTrialsData(data)
    if (data.trials.length > 0) setActiveTrial(data.trials[data.trials.length - 1].trial_no)
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
  const isSourcing = currentRole.startsWith("sourcing") || currentRole === "super_admin"
  const { passed, total } = getTrialProgress(id)
  const currentTrial = trialsData.trials.find(t => t.trial_no === activeTrial)
  const canInit = canInitiateNewTrial(id)
  const nextTrialNo = getNextTrialNo(id)

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

  const handleSetTestInput = (componentId: string, field: string, value: string) => {
    setTestInputs(prev => ({
      ...prev,
      [componentId]: { ...(prev[componentId] ?? {}), [field]: value }
    }))
  }

  const handleSubmitComponent = (trialNo: number, componentId: string, componentName: string) => {
    const data = getNTDTrials(id)!
    const handoff = getNTDHandoff(id)
    if (!handoff) return
    const inputs = testInputs[componentId] ?? {}
    const results: Record<string, { verdict: "pass" | "fail" } & Record<string, unknown>> = {}
    let anyFail = false
    for (const param of TEST_PARAMS) {
      const verdict = (inputs[`${param.key}_verdict`] ?? "pass") as "pass" | "fail"
      if (verdict === "fail") anyFail = true
      const extra: Record<string, string | number> = {}
      for (const f of param.fields) {
        extra[f] = inputs[`${param.key}_${f}`] ?? (param.key === "cycle_time" ? 0 : "")
      }
      results[param.key] = { verdict, ...extra }
    }
    const overall = anyFail ? "fail" : "pass"
    const newResult: ComponentTestResult = {
      componentId,
      dimensional_accuracy: results.dimensional_accuracy as ComponentTestResult["dimensional_accuracy"],
      surface_finish: results.surface_finish as ComponentTestResult["surface_finish"],
      material_hardness: results.material_hardness as ComponentTestResult["material_hardness"],
      cavity_fill_flash: results.cavity_fill_flash as ComponentTestResult["cavity_fill_flash"],
      ejection_parting_line: results.ejection_parting_line as ComponentTestResult["ejection_parting_line"],
      tooling_fit_assembly: results.tooling_fit_assembly as ComponentTestResult["tooling_fit_assembly"],
      cycle_time: results.cycle_time as ComponentTestResult["cycle_time"],
      overall_verdict: overall,
      feedback_ppt_link: inputs.feedback_ppt_link ?? "",
      requires_redesign: overall === "fail",
    }

    const updated: NTDTrialsData = {
      ...data,
      trials: data.trials.map(t => {
        if (t.trial_no !== trialNo) return t
        const existingComps = t.components.filter(c => c.componentId !== componentId)
        const updatedComponents = [...existingComps, newResult]
        const allSubmitted = handoff.components.every(c => updatedComponents.some(r => r.componentId === c.componentId))
        if (allSubmitted) {
          const allPass = updatedComponents.every(c => c.overall_verdict === "pass")
          const result = allPass ? "all_pass" : "partial_fail"
          return { ...t, components: updatedComponents, status: "complete", result }
        }
        return { ...t, components: updatedComponents }
      })
    }

    // Check if trial complete
    const trial = updated.trials.find(t => t.trial_no === trialNo)
    if (trial?.result === "all_pass") {
      updated.stage_complete = true
      setNTDTrials(id, updated)
      advanceNTDStage(id, 11, currentRole, ntdRole)
      appendActivity(id, currentRole, ntdRole, 10, "trial_result", `Trial T${trialNo} — ALL PASS. Advancing to Stage 11.`, { trial_no: trialNo })
    } else if (trial?.result === "partial_fail") {
      setNTDTrials(id, updated)
      // Trigger redesign loop
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
      // Unlock failed components in mould
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
      appendActivity(id, currentRole, ntdRole, 10, "redesign_triggered", `Trial T${trialNo} partial fail — ${failedIds.length} component(s) sent back to Stage 8A`, { trial_no: trialNo })
    } else {
      setNTDTrials(id, updated)
    }

    setTestInputs(prev => { const n = { ...prev }; delete n[componentId]; return n })
    reload()
  }

  const handoff = getNTDHandoff(id)
  const components = handoff?.components ?? []

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
      <Link href={`/ntd/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to NTD {record.id}
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Stage 10 — Trials</h1>
            <p className="text-sm text-slate-500 mt-0.5">{record.title}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-800">{passed} / {total}</p>
            <p className="text-xs text-slate-400">Components Passed (Cumulative)</p>
          </div>
        </div>
        {trialsData.stage_complete && (
          <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="font-semibold text-emerald-800">All trials passed — Advanced to Stage 11.</p>
          </div>
        )}
      </div>

      {/* Trial tabs */}
      <div className="flex items-center gap-2">
        {trialsData.trials.map(t => (
          <button key={t.trial_no} onClick={() => setActiveTrial(t.trial_no)}
            className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${activeTrial === t.trial_no
              ? "bg-blue-900 text-white"
              : t.result === "all_pass" ? "bg-emerald-100 text-emerald-800"
              : t.result === "partial_fail" ? "bg-red-100 text-red-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            T{t.trial_no}
            {t.result === "all_pass" && <CheckCircle2 className="w-3.5 h-3.5 inline ml-1.5" />}
            {t.result === "partial_fail" && <XCircle className="w-3.5 h-3.5 inline ml-1.5" />}
          </button>
        ))}
        {!trialsData.stage_complete && isSourcing && (
          <button onClick={handleInitiateTrial} disabled={!canInit}
            title={!canInit ? "Waiting for redesign loop to complete" : undefined}
            className="flex items-center gap-1.5 text-sm font-semibold border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> T{nextTrialNo}
          </button>
        )}
      </div>

      {!currentTrial ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-12 text-center">
          <p className="text-slate-400">No trial selected. {isSourcing ? "Initiate a new trial to begin." : "Waiting for Sourcing to initiate Trial 1."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Trial T{currentTrial.trial_no}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              currentTrial.result === "all_pass" ? "bg-emerald-100 text-emerald-700"
              : currentTrial.result === "partial_fail" ? "bg-red-100 text-red-700"
              : currentTrial.status === "samples_received" ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-500"}`}>
              {currentTrial.result === "all_pass" ? "All Pass"
              : currentTrial.result === "partial_fail" ? "Partial Fail"
              : currentTrial.status.replace("_", " ")}
            </span>
          </div>

          {currentTrial.status === "pending" && (
            <div className="text-sm text-slate-500 italic">Awaiting sample dispatch from supplier...</div>
          )}

          {currentTrial.status !== "complete" && currentTrial.status !== "pending" && (
            <>
              {currentTrial.status === "samples_dispatched" && isRnd && (
                <button onClick={() => handleMarkSamplesReceived(currentTrial.trial_no)}
                  className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors">
                  Mark Samples Received
                </button>
              )}
              {currentTrial.status === "samples_received" && isRnd && (
                <div className="space-y-4">
                  {components.map(comp => {
                    const alreadySubmitted = currentTrial.components.some(c => c.componentId === comp.componentId)
                    if (alreadySubmitted) {
                      const result = currentTrial.components.find(c => c.componentId === comp.componentId)!
                      return (
                        <div key={comp.componentId} className={`rounded-xl border p-4 ${result.overall_verdict === "pass" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                          <div className="flex items-center gap-2">
                            {result.overall_verdict === "pass" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                            <p className="font-semibold text-slate-800">{comp.componentId} — {comp.name}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${result.overall_verdict === "pass" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              {result.overall_verdict.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )
                    }
                    const inputs = testInputs[comp.componentId] ?? {}
                    return (
                      <div key={comp.componentId} className="rounded-xl border border-slate-200 p-4 space-y-3">
                        <p className="font-semibold text-slate-800">{comp.componentId} — {comp.name}</p>
                        <div className="space-y-2">
                          {TEST_PARAMS.map(param => (
                            <div key={param.key} className="grid grid-cols-[200px_1fr] gap-3 items-start">
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1">{param.label}</p>
                                <div className="flex gap-1">
                                  {(["pass", "fail"] as const).map(v => (
                                    <button key={v} onClick={() => handleSetTestInput(comp.componentId, `${param.key}_verdict`, v)}
                                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${inputs[`${param.key}_verdict`] === v
                                        ? v === "pass" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                      {v.toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {param.fields.map(f => (
                                  <input key={f} type={f.includes("sec") ? "number" : "text"}
                                    placeholder={f.replace(/_/g, " ")}
                                    value={inputs[`${param.key}_${f}`] ?? ""}
                                    onChange={e => handleSetTestInput(comp.componentId, `${param.key}_${f}`, e.target.value)}
                                    className="flex-1 min-w-[100px] rounded-lg border border-slate-200 px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                ))}
                              </div>
                            </div>
                          ))}
                          {/* Fail feedback */}
                          {inputs.dimensional_accuracy_verdict === "fail" || inputs.surface_finish_verdict === "fail" || inputs.material_hardness_verdict === "fail" ? (
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-red-700 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Feedback PPT Link (required for fail)
                              </label>
                              <input type="url" value={inputs.feedback_ppt_link ?? ""}
                                onChange={e => handleSetTestInput(comp.componentId, "feedback_ppt_link", e.target.value)}
                                placeholder="Drive link to feedback PPT"
                                className="w-full rounded-lg border border-red-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                          ) : null}
                        </div>
                        <button onClick={() => handleSubmitComponent(currentTrial.trial_no, comp.componentId, comp.name)}
                          className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors">
                          Submit Test Results
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {currentTrial.result === "partial_fail" && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Trial T{currentTrial.trial_no} partial fail — failed components sent back to Stage 8A for redesign.
                </p>
                <Link href={`/ntd/${id}/mould-design`} className="text-xs text-amber-700 hover:underline mt-0.5 block">
                  Open Mould Design →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
