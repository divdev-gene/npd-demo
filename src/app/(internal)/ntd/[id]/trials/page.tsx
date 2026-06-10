"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import {
  getNTDTrials,
  setNTDTrials,
  getNTDRedesign,
  setNTDRedesign,
  getNTDMouldDesign,
  setNTDMouldDesign,
  getNTDInitiation,
  getNTDRecord,
  getNextTrialNo,
  getTrialProgress,
  updateNTDStage,
} from "@/lib/ntd"
import type {
  NTDTrialsData,
  NTDTrial,
  NTDComponentTestResult,
  NTDComponent,
  NTDMouldComponent,
  NTDMouldDesignData,
} from "@/types/ntd"

// ─── Helpers ──────────────────────────────────────────────────

function verdictToggle(
  value: "pass" | "fail",
  onChange: (v: "pass" | "fail") => void,
) {
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => onChange("pass")}
        className={[
          "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
          value === "pass"
            ? "bg-emerald-600 border-emerald-600 text-white"
            : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700",
        ].join(" ")}
      >
        Pass
      </button>
      <button
        type="button"
        onClick={() => onChange("fail")}
        className={[
          "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
          value === "fail"
            ? "bg-red-600 border-red-600 text-white"
            : "bg-white border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-700",
        ].join(" ")}
      >
        Fail
      </button>
    </div>
  )
}

function textInput(
  value: string,
  onChange: (v: string) => void,
  placeholder: string,
) {
  return (
    <input
      type="text"
      className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// ─── Component test form state ────────────────────────────────

type ComponentTestFormState = {
  dimensional_accuracy_verdict: "pass" | "fail"
  dimensional_accuracy_actual: string
  dimensional_accuracy_spec: string
  surface_finish_verdict: "pass" | "fail"
  surface_finish_ra: string
  surface_finish_visual: string
  material_hardness_verdict: "pass" | "fail"
  material_hardness_reading: string
  material_hardness_unit: "HRC" | "HB" | "other"
  cavity_fill_flash_verdict: "pass" | "fail"
  cavity_fill_flash_notes: string
  ejection_parting_verdict: "pass" | "fail"
  ejection_parting_defect: string
  tooling_fit_verdict: "pass" | "fail"
  tooling_fit_notes: string
  cycle_time_verdict: "pass" | "fail"
  cycle_time_actual: string
  cycle_time_target: string
  overall_verdict: "pass" | "fail"
  feedback_notes: string
  requires_redesign: boolean
}

function defaultFormState(): ComponentTestFormState {
  return {
    dimensional_accuracy_verdict: "pass",
    dimensional_accuracy_actual: "",
    dimensional_accuracy_spec: "",
    surface_finish_verdict: "pass",
    surface_finish_ra: "",
    surface_finish_visual: "",
    material_hardness_verdict: "pass",
    material_hardness_reading: "",
    material_hardness_unit: "HRC",
    cavity_fill_flash_verdict: "pass",
    cavity_fill_flash_notes: "",
    ejection_parting_verdict: "pass",
    ejection_parting_defect: "",
    tooling_fit_verdict: "pass",
    tooling_fit_notes: "",
    cycle_time_verdict: "pass",
    cycle_time_actual: "",
    cycle_time_target: "",
    overall_verdict: "pass",
    feedback_notes: "",
    requires_redesign: false,
  }
}

function formStateToResult(
  componentId: string,
  f: ComponentTestFormState,
): NTDComponentTestResult {
  const anyFail =
    f.dimensional_accuracy_verdict === "fail" ||
    f.surface_finish_verdict === "fail" ||
    f.material_hardness_verdict === "fail" ||
    f.cavity_fill_flash_verdict === "fail" ||
    f.ejection_parting_verdict === "fail" ||
    f.tooling_fit_verdict === "fail" ||
    f.cycle_time_verdict === "fail"

  return {
    componentId,
    dimensional_accuracy: {
      verdict: f.dimensional_accuracy_verdict,
      actual_measurement: f.dimensional_accuracy_actual,
      spec_measurement: f.dimensional_accuracy_spec,
    },
    surface_finish: {
      verdict: f.surface_finish_verdict,
      ra_value: f.surface_finish_ra,
      visual_grade: f.surface_finish_visual,
    },
    material_hardness: {
      verdict: f.material_hardness_verdict,
      reading: f.material_hardness_reading,
      unit: f.material_hardness_unit,
    },
    cavity_fill_flash: {
      verdict: f.cavity_fill_flash_verdict,
      notes: f.cavity_fill_flash_notes,
    },
    ejection_parting_line: {
      verdict: f.ejection_parting_verdict,
      defect_description: f.ejection_parting_defect,
    },
    tooling_fit_assembly: {
      verdict: f.tooling_fit_verdict,
      notes: f.tooling_fit_notes,
    },
    cycle_time: {
      verdict: f.cycle_time_verdict,
      actual_sec: parseFloat(f.cycle_time_actual) || 0,
      target_sec: parseFloat(f.cycle_time_target) || 0,
    },
    overall_verdict: f.overall_verdict || (anyFail ? "fail" : "pass"),
    feedback_notes: f.feedback_notes,
    requires_redesign: f.requires_redesign || f.overall_verdict === "fail",
  }
}

// ─── Component test accordion ─────────────────────────────────

interface ComponentTestCardProps {
  component: NTDComponent
  existingResult: NTDComponentTestResult | null
  isRnd: boolean
  onSubmit: (result: NTDComponentTestResult) => void
}

function ComponentTestCard({
  component,
  existingResult,
  isRnd,
  onSubmit,
}: ComponentTestCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState<ComponentTestFormState>(defaultFormState())

  function setField<K extends keyof ComponentTestFormState>(
    key: K,
    value: ComponentTestFormState[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Auto-suggest overall verdict
      const anyFail =
        next.dimensional_accuracy_verdict === "fail" ||
        next.surface_finish_verdict === "fail" ||
        next.material_hardness_verdict === "fail" ||
        next.cavity_fill_flash_verdict === "fail" ||
        next.ejection_parting_verdict === "fail" ||
        next.tooling_fit_verdict === "fail" ||
        next.cycle_time_verdict === "fail"
      return { ...next, overall_verdict: anyFail ? "fail" : "pass" }
    })
  }

  function handleSubmit() {
    if (!isRnd) return
    const result = formStateToResult(component.componentId, form)
    onSubmit(result)
  }

  // Show result if already tested
  if (existingResult) {
    const v = existingResult.overall_verdict
    return (
      <div
        className={[
          "rounded-xl border shadow-sm p-4",
          v === "pass"
            ? "border-emerald-100 bg-emerald-50/30"
            : "border-red-100 bg-red-50/30",
        ].join(" ")}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-slate-500">
              {component.componentId}
            </span>
            <span className="text-[13px] font-semibold text-slate-800">{component.name}</span>
          </div>
          <span
            className={[
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border",
              v === "pass"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200",
            ].join(" ")}
          >
            {v === "pass" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {v.toUpperCase()}
          </span>
        </div>
        {existingResult.feedback_notes && (
          <p className="text-[11px] text-slate-500 mt-1.5 italic">
            Notes: {existingResult.feedback_notes}
          </p>
        )}
      </div>
    )
  }

  // Test form
  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/70 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center justify-center w-5 h-5 text-slate-400 shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0">
          {component.componentId}
        </span>
        <span className="text-[13px] font-semibold text-slate-800 flex-1">{component.name}</span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
          Pending Test
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
          {!isRnd && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[12px] text-amber-700">
              R&amp;D engineers submit test results.
            </div>
          )}

          {/* 7 test parameters */}
          <div className="space-y-3">
            {/* 1. Dimensional Accuracy */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">1. Dimensional Accuracy</p>
              <div className="flex flex-wrap items-center gap-3">
                {verdictToggle(form.dimensional_accuracy_verdict, (v) =>
                  setField("dimensional_accuracy_verdict", v),
                )}
                {textInput(
                  form.dimensional_accuracy_actual,
                  (v) => setField("dimensional_accuracy_actual", v),
                  "Actual measurement (e.g. 12.4 mm)",
                )}
                {textInput(
                  form.dimensional_accuracy_spec,
                  (v) => setField("dimensional_accuracy_spec", v),
                  "Spec measurement (e.g. 12.0 ± 0.5 mm)",
                )}
              </div>
            </div>

            {/* 2. Surface Finish */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">2. Surface Finish</p>
              <div className="flex flex-wrap items-center gap-3">
                {verdictToggle(form.surface_finish_verdict, (v) =>
                  setField("surface_finish_verdict", v),
                )}
                {textInput(
                  form.surface_finish_ra,
                  (v) => setField("surface_finish_ra", v),
                  "Ra value (e.g. 0.8 µm)",
                )}
                {textInput(
                  form.surface_finish_visual,
                  (v) => setField("surface_finish_visual", v),
                  "Visual grade (e.g. N6)",
                )}
              </div>
            </div>

            {/* 3. Material Hardness */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">3. Material Hardness</p>
              <div className="flex flex-wrap items-center gap-3">
                {verdictToggle(form.material_hardness_verdict, (v) =>
                  setField("material_hardness_verdict", v),
                )}
                {textInput(
                  form.material_hardness_reading,
                  (v) => setField("material_hardness_reading", v),
                  "Reading value",
                )}
                <select
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={form.material_hardness_unit}
                  onChange={(e) =>
                    setField(
                      "material_hardness_unit",
                      e.target.value as "HRC" | "HB" | "other",
                    )
                  }
                >
                  <option value="HRC">HRC</option>
                  <option value="HB">HB</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* 4. Cavity Fill / Flash */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">4. Cavity Fill / Flash</p>
              <div className="flex flex-wrap items-center gap-3">
                {verdictToggle(form.cavity_fill_flash_verdict, (v) =>
                  setField("cavity_fill_flash_verdict", v),
                )}
                {textInput(
                  form.cavity_fill_flash_notes,
                  (v) => setField("cavity_fill_flash_notes", v),
                  "Notes (e.g. no flash observed)",
                )}
              </div>
            </div>

            {/* 5. Ejection / Parting Line */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">
                5. Ejection / Parting Line
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {verdictToggle(form.ejection_parting_verdict, (v) =>
                  setField("ejection_parting_verdict", v),
                )}
                {textInput(
                  form.ejection_parting_defect,
                  (v) => setField("ejection_parting_defect", v),
                  "Defect description (or 'none')",
                )}
              </div>
            </div>

            {/* 6. Tooling Fit / Assembly */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">
                6. Tooling Fit / Assembly
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {verdictToggle(form.tooling_fit_verdict, (v) =>
                  setField("tooling_fit_verdict", v),
                )}
                {textInput(
                  form.tooling_fit_notes,
                  (v) => setField("tooling_fit_notes", v),
                  "Notes",
                )}
              </div>
            </div>

            {/* 7. Cycle Time */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">7. Cycle Time</p>
              <div className="flex flex-wrap items-center gap-3">
                {verdictToggle(form.cycle_time_verdict, (v) =>
                  setField("cycle_time_verdict", v),
                )}
                {textInput(
                  form.cycle_time_actual,
                  (v) => setField("cycle_time_actual", v),
                  "Actual (sec)",
                )}
                {textInput(
                  form.cycle_time_target,
                  (v) => setField("cycle_time_target", v),
                  "Target (sec)",
                )}
              </div>
            </div>
          </div>

          {/* Overall verdict + notes */}
          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5">
            <p className="text-[12px] font-semibold text-slate-700">
              Overall Verdict (auto-suggested; you may override)
            </p>
            {verdictToggle(form.overall_verdict, (v) => setField("overall_verdict", v))}
            <textarea
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder={
                form.overall_verdict === "fail"
                  ? "Feedback notes required for fail verdict…"
                  : "Optional notes…"
              }
              value={form.feedback_notes}
              onChange={(e) => setField("feedback_notes", e.target.value)}
            />
            {form.overall_verdict === "fail" && (
              <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requires_redesign}
                  onChange={(e) => setField("requires_redesign", e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                Requires mould redesign (8A re-loop)
              </label>
            )}
          </div>

          {isRnd && (
            <button
              onClick={handleSubmit}
              disabled={
                form.overall_verdict === "fail" && !form.feedback_notes.trim()
              }
              className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Test Results for {component.componentId}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function TrialsPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""

  const [currentRole, setCurrentRole] = useState("rnd_user")
  const [trialsData, setTrialsData] = useState<NTDTrialsData | null>(null)
  const [allComponents, setAllComponents] = useState<NTDComponent[]>([])
  const [selectedTrialNo, setSelectedTrialNo] = useState<number>(1)
  const [stageComplete, setStageComplete] = useState(false)

  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"
  const isSpocOrSourcing =
    currentRole.startsWith("sourcing") ||
    currentRole.startsWith("spoc") ||
    currentRole === "super_admin"

  const loadData = useCallback(() => {
    const initiation = getNTDInitiation(id)
    setAllComponents(initiation?.components ?? [])

    const data = getNTDTrials(id) ?? { trials: [], stage_complete: false }
    setTrialsData(data)
    setStageComplete(data.stage_complete)

    if (data.trials.length > 0) {
      setSelectedTrialNo(data.trials[data.trials.length - 1].trial_no)
    }
  }, [id])

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") || "rnd_user")
    loadData()

    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener("rolechange", onRoleChange as EventListener)
    return () => window.removeEventListener("rolechange", onRoleChange as EventListener)
  }, [id, loadData])

  // ── Can initiate new trial? ──────────────────────────────────

  function canInitiateNewTrial(): boolean {
    if (!trialsData) return false
    if (trialsData.stage_complete) return false

    const trials = trialsData.trials
    if (trials.length === 0) return true

    const lastTrial = trials[trials.length - 1]
    if (lastTrial.status !== "complete") return false
    if (lastTrial.result === "all_pass") return false

    // For partial_fail: check redesign round is resolved
    const redesignData = getNTDRedesign(id)
    if (!redesignData) return false

    const triggeringRound = redesignData.redesign_rounds.find(
      (r) => r.triggered_by_trial === lastTrial.trial_no,
    )
    if (!triggeringRound) return false
    return triggeringRound.resolved_at !== ""
  }

  // ── Get IDs permanently passed across all trials ─────────────

  function getPermanentlyPassedIds(excludeTrialNo?: number): Set<string> {
    const passed = new Set<string>()
    if (!trialsData) return passed
    for (const trial of trialsData.trials) {
      if (excludeTrialNo !== undefined && trial.trial_no === excludeTrialNo) continue
      for (const comp of trial.components) {
        if (comp.overall_verdict === "pass") passed.add(comp.componentId)
      }
    }
    return passed
  }

  // ── Initiate new trial ───────────────────────────────────────

  function handleInitiateTrial() {
    if (!canInitiateNewTrial() || !trialsData) return
    const newTrialNo = getNextTrialNo(id)
    const newTrial: NTDTrial = {
      trial_no: newTrialNo,
      initiated_at: new Date().toISOString(),
      samples_received_at: "",
      status: "pending",
      result: null,
      components: [],
    }
    const updated: NTDTrialsData = {
      ...trialsData,
      trials: [...trialsData.trials, newTrial],
    }
    setNTDTrials(id, updated)
    setTrialsData(updated)
    setSelectedTrialNo(newTrialNo)
  }

  // ── Mark samples received ────────────────────────────────────

  function handleSamplesReceived(trialNo: number) {
    if (!trialsData || !isRnd) return
    const now = new Date().toISOString()
    const updated: NTDTrialsData = {
      ...trialsData,
      trials: trialsData.trials.map((t) =>
        t.trial_no === trialNo
          ? { ...t, samples_received_at: now, status: "samples_received" as const }
          : t,
      ),
    }
    setNTDTrials(id, updated)
    setTrialsData(updated)
  }

  // ── Submit component test result ─────────────────────────────

  function handleSubmitComponentResult(trialNo: number, result: NTDComponentTestResult) {
    if (!trialsData) return
    const now = new Date().toISOString()

    const permanentlyPassed = getPermanentlyPassedIds(trialNo)
    const componentsForThisTrial = allComponents.filter(
      (c) => !permanentlyPassed.has(c.componentId),
    )

    const updatedTrials = trialsData.trials.map((t) => {
      if (t.trial_no !== trialNo) return t

      const existingComponents = t.components.filter(
        (c) => c.componentId !== result.componentId,
      )
      const newComponents = [...existingComponents, result]

      // Check if all components for this trial have been tested
      const allTested = componentsForThisTrial.every((c) =>
        newComponents.some((cr) => cr.componentId === c.componentId),
      )

      if (!allTested) {
        return {
          ...t,
          components: newComponents,
          status: "testing" as const,
        }
      }

      // All tested — compute result
      const allPass = newComponents.every((c) => c.overall_verdict === "pass")
      const trialResult: "all_pass" | "partial_fail" = allPass ? "all_pass" : "partial_fail"

      return {
        ...t,
        components: newComponents,
        status: "complete" as const,
        result: trialResult,
      }
    })

    const updatedData: NTDTrialsData = {
      ...trialsData,
      trials: updatedTrials,
    }

    // Handle post-trial logic
    const completedTrial = updatedTrials.find((t) => t.trial_no === trialNo)
    if (completedTrial?.status === "complete") {
      if (completedTrial.result === "all_pass") {
        updatedData.stage_complete = true
        setNTDTrials(id, updatedData)
        setTrialsData(updatedData)
        setStageComplete(true)
        updateNTDStage(id, 9)
        return
      }

      if (completedTrial.result === "partial_fail") {
        // Create redesign round
        const failedIds = completedTrial.components
          .filter((c) => c.overall_verdict === "fail")
          .map((c) => c.componentId)

        const existingRedesign = getNTDRedesign(id) ?? { redesign_rounds: [] }
        const roundNo = existingRedesign.redesign_rounds.length + 1
        const mouldDesign = getNTDMouldDesign(id)!
        const newMouldRedesignRound = mouldDesign.redesign_round + 1

        setNTDRedesign(id, {
          redesign_rounds: [
            ...existingRedesign.redesign_rounds,
            {
              round_no: roundNo,
              triggered_by_trial: trialNo,
              failed_component_ids: failedIds,
              re_enters: "8A_MOULD_DESIGN_ONLY",
              mould_design_redesign_round: newMouldRedesignRound,
              resolved_at: "",
            },
          ],
        })

        // Re-open 8A for only failed components
        const updatedMould: NTDMouldDesignData = {
          redesign_round: newMouldRedesignRound,
          substage_complete: false,
          components: mouldDesign.components.map((c): NTDMouldComponent => ({
            ...c,
            locked: !failedIds.includes(c.componentId),
            final_status: failedIds.includes(c.componentId) ? "pending" : c.final_status,
          })),
        }
        setNTDMouldDesign(id, updatedMould)
      }
    }

    setNTDTrials(id, updatedData)
    setTrialsData(updatedData)
  }

  // ─── Render ───────────────────────────────────────────────────

  const progress = getTrialProgress(id)
  const progressPct = progress.total > 0 ? Math.round((progress.passed / progress.total) * 100) : 0

  const selectedTrial = trialsData?.trials.find((t) => t.trial_no === selectedTrialNo)

  // Components for selected trial (excluding permanently passed from OTHER trials)
  const permanentlyPassedForSelected = getPermanentlyPassedIds(selectedTrialNo)
  const componentsForSelectedTrial = allComponents.filter(
    (c) => !permanentlyPassedForSelected.has(c.componentId),
  )

  const latestRedesignRound = (() => {
    const rd = getNTDRedesign(id)
    if (!rd || rd.redesign_rounds.length === 0) return null
    const unresolved = rd.redesign_rounds.filter((r) => r.resolved_at === "")
    return unresolved.length > 0 ? unresolved[unresolved.length - 1] : null
  })()

  if (!trialsData) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[13px] text-slate-400">Loading trials data…</span>
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
            <h1 className="text-[16px] font-bold text-slate-900">
              Trial Samples &amp; Testing — Stage 8C
            </h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Unbounded trial loop. Failed components re-enter Stage 8A mould design.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold text-slate-600">
              {progress.passed} / {progress.total} Components Passed
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
      <div className="flex-1 overflow-auto px-6 py-6 space-y-4 max-w-4xl mx-auto w-full">
        {/* Completion banner */}
        {stageComplete && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-emerald-800">
                All trials passed — advancing to Stage 9.
              </p>
              <p className="text-[11px] text-emerald-600">
                All components have passed. The NTD is proceeding to Commissioning &amp; Dispatch.
              </p>
            </div>
          </div>
        )}

        {/* Redesign round active banner */}
        {latestRedesignRound && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-amber-800">
                Redesign Round {latestRedesignRound.round_no} — triggered by Trial{" "}
                {latestRedesignRound.triggered_by_trial}
              </p>
              <p className="text-[11px] text-amber-600">
                {latestRedesignRound.failed_component_ids.length} component
                {latestRedesignRound.failed_component_ids.length !== 1 ? "s" : ""} sent back to
                8A. New trial blocked until redesign is resolved.
              </p>
            </div>
            <Link
              href={`/ntd/${id}/mould-design`}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              Go to Mould Design (8A)
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Trial tabs + initiate button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {trialsData.trials.map((t) => (
              <button
                key={t.trial_no}
                onClick={() => setSelectedTrialNo(t.trial_no)}
                className={[
                  "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                  selectedTrialNo === t.trial_no
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-blue-300",
                ].join(" ")}
              >
                T{t.trial_no}
                {t.status === "complete" && t.result === "all_pass" && (
                  <span className="ml-1 text-emerald-300">✓</span>
                )}
                {t.status === "complete" && t.result === "partial_fail" && (
                  <span className="ml-1 text-red-300">✗</span>
                )}
              </button>
            ))}
          </div>

          {trialsData.trials.length === 0 && (
            <span className="text-[12px] text-slate-400 italic">No trials initiated yet.</span>
          )}

          {isSpocOrSourcing && (
            <button
              onClick={handleInitiateTrial}
              disabled={!canInitiateNewTrial()}
              className="ml-auto px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Initiate New Trial
            </button>
          )}
        </div>

        {/* Trial content */}
        {!selectedTrial && trialsData.trials.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-slate-500">No trials yet</p>
            <p className="text-[12px] text-slate-400 mt-1">
              Sourcing initiates the first trial once manufacturing is complete and sample batch is
              ready for dispatch.
            </p>
          </div>
        )}

        {selectedTrial && (
          <div className="space-y-4">
            {/* Trial info bar */}
            <div className="flex items-center gap-4 flex-wrap text-[12px] text-slate-500 bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
              <span>
                <span className="font-semibold text-slate-700">Trial {selectedTrial.trial_no}</span>{" "}
                — Initiated {new Date(selectedTrial.initiated_at).toLocaleString()}
              </span>
              <span
                className={[
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                  selectedTrial.status === "complete" && selectedTrial.result === "all_pass"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : selectedTrial.status === "complete" && selectedTrial.result === "partial_fail"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : selectedTrial.status === "testing"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : selectedTrial.status === "samples_received"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : "bg-slate-50 text-slate-500 border-slate-200",
                ].join(" ")}
              >
                {selectedTrial.status === "complete"
                  ? selectedTrial.result === "all_pass"
                    ? "All Pass"
                    : "Partial Fail"
                  : selectedTrial.status === "testing"
                  ? "Testing"
                  : selectedTrial.status === "samples_received"
                  ? "Samples Received"
                  : "Pending Dispatch"}
              </span>
              {selectedTrial.samples_received_at && (
                <span className="text-slate-400 text-[11px]">
                  Samples received: {new Date(selectedTrial.samples_received_at).toLocaleString()}
                </span>
              )}
            </div>

            {/* Samples received toggle */}
            {selectedTrial.status === "pending" && isRnd && (
              <div className="rounded-xl border border-yellow-100 bg-yellow-50/50 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-yellow-800">
                    Waiting for sample batch
                  </p>
                  <p className="text-[11px] text-yellow-600">
                    Mark as received once samples arrive at the plant.
                  </p>
                </div>
                <button
                  onClick={() => handleSamplesReceived(selectedTrial.trial_no)}
                  className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-yellow-600 hover:bg-yellow-700 text-white transition-colors"
                >
                  Mark Samples Received
                </button>
              </div>
            )}

            {/* Component tests */}
            {(selectedTrial.status === "samples_received" ||
              selectedTrial.status === "testing" ||
              selectedTrial.status === "complete") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-slate-600">
                    Component Tests — {selectedTrial.components.length} /{" "}
                    {componentsForSelectedTrial.length} tested
                  </p>
                  {selectedTrial.status === "complete" && (
                    <span
                      className={[
                        "text-[12px] font-bold",
                        selectedTrial.result === "all_pass"
                          ? "text-emerald-600"
                          : "text-red-600",
                      ].join(" ")}
                    >
                      {selectedTrial.result === "all_pass"
                        ? "All components passed"
                        : `${selectedTrial.components.filter((c) => c.overall_verdict === "fail").length} component(s) failed`}
                    </span>
                  )}
                </div>

                {componentsForSelectedTrial.map((comp) => {
                  const existingResult =
                    selectedTrial.components.find((c) => c.componentId === comp.componentId) ??
                    null
                  return (
                    <ComponentTestCard
                      key={comp.componentId}
                      component={comp}
                      existingResult={existingResult}
                      isRnd={isRnd}
                      onSubmit={(result) =>
                        handleSubmitComponentResult(selectedTrial.trial_no, result)
                      }
                    />
                  )
                })}

                {permanentlyPassedForSelected.size > 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
                    <div className="flex items-center gap-2 text-[12px] text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>{permanentlyPassedForSelected.size}</strong> component
                        {permanentlyPassedForSelected.size !== 1 ? "s" : ""} permanently passed in
                        previous trial(s) — excluded from this trial.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

