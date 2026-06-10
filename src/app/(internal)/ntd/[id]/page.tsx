"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Circle, ArrowLeft, Wrench, ArrowRight } from "lucide-react"
import {
  getNTDRecord,
  getNTDSubStage8Status,
  getDFMProgress,
  getMouldDesignProgress,
  getTrialProgress,
  isNTDComplete,
  updateNTDStage,
} from "@/lib/ntd"
import type { NTDRecord, NTDStage } from "@/types/ntd"
import Stage1 from "./stages/Stage1"
import Stage2 from "./stages/Stage2"
import Stage3 from "./stages/Stage3"
import Stage4 from "./stages/Stage4"
import Stage5 from "./stages/Stage5"
import Stage6 from "./stages/Stage6"
import Stage8B from "./stages/Stage8B"
import Stage9 from "./stages/Stage9"

const STAGE_NAMES: Record<NTDStage, string> = {
  1: "Tool Initiation & R&D Brief",
  2: "Spec Sheet & Comparison",
  3: "RFQ Dispatch",
  4: "Quotation Review & Negotiations",
  5: "Supplier Finalization",
  6: "R&D Final Data Submission",
  7: "DFM Review",
  8: "Mould Design, Manufacturing & Trials",
  9: "Tool Commissioning & Dispatch",
}

// Card accent colours per stage
const STAGE_ACCENT = {
  1: { border: "border-violet-300",  bg: "bg-violet-50/30",  icon: "text-violet-600",  badge: "bg-violet-100 text-violet-700" },
  2: { border: "border-teal-300",    bg: "bg-teal-50/30",    icon: "text-teal-600",    badge: "bg-teal-100 text-teal-700" },
  3: { border: "border-indigo-300",  bg: "bg-indigo-50/30",  icon: "text-indigo-600",  badge: "bg-indigo-100 text-indigo-700" },
  4: { border: "border-amber-300",   bg: "bg-amber-50/30",   icon: "text-amber-600",   badge: "bg-amber-100 text-amber-700" },
  5: { border: "border-blue-300",    bg: "bg-blue-50/30",    icon: "text-blue-600",    badge: "bg-blue-100 text-blue-700" },
  6: { border: "border-emerald-300", bg: "bg-emerald-50/30", icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  7: { border: "border-purple-300",  bg: "bg-purple-50/30",  icon: "text-purple-600",  badge: "bg-purple-100 text-purple-700" },
  8: { border: "border-slate-300",   bg: "bg-slate-50/30",   icon: "text-slate-600",   badge: "bg-slate-100 text-slate-700" },
  9: { border: "border-blue-300",    bg: "bg-blue-50/30",    icon: "text-blue-600",    badge: "bg-blue-100 text-blue-700" },
} as const

export default function NTDDetailPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""

  const [record, setRecord] = useState<NTDRecord | null | undefined>(undefined)
  const [subStage8, setSubStage8] = useState<"8A" | "8B" | "8C">("8A")
  const [currentRole, setCurrentRole] = useState("rnd_user")
  const [ntdComplete, setNtdComplete] = useState(false)

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") || "rnd_user")
    const r = getNTDRecord(id)
    setRecord(r ?? null)
    setSubStage8(getNTDSubStage8Status(id))
    setNtdComplete(isNTDComplete(id))

    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener("rolechange", onRoleChange as EventListener)
    return () => window.removeEventListener("rolechange", onRoleChange as EventListener)
  }, [id])

  function handleStageAdvance() {
    const r = getNTDRecord(id)
    if (r) {
      setRecord(r)
      setSubStage8(getNTDSubStage8Status(id))
      setNtdComplete(isNTDComplete(id))
    }
  }

  // Loading
  if (record === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[13px] text-slate-400">Loading…</span>
      </div>
    )
  }

  // Not found
  if (record === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Wrench className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-[15px] font-bold text-slate-800">NTD not found</p>
        <p className="text-[12px] text-slate-400 mt-1">
          This NTD record does not exist or has been removed.
        </p>
        <Link
          href="/ntd"
          className="mt-4 text-[13px] text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to NTD List
        </Link>
      </div>
    )
  }

  const currentStage = record.current_stage

  // ── Build card stack ──────────────────────────────────────────

  const cards: React.ReactNode[] = []

  function pushCard(stage: NTDStage, activeContent: React.ReactNode, doneLabel?: string) {
    const isActive   = currentStage === stage
    const isDone     = currentStage > stage
    const isUpcoming = !isActive && !isDone

    const accent = STAGE_ACCENT[stage]

    const cardClass = [
      "rounded-xl border p-4",
      isDone     ? "bg-slate-50 border-slate-200" :
      isActive   ? `${accent.border} ${accent.bg}` :
                   "bg-slate-50 border-slate-200 opacity-50",
    ].join(" ")

    cards.push(
      <div key={stage} className={cardClass}>
        <div className="flex items-center gap-2 mb-3">
          {isDone
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            : <Circle className={`w-4 h-4 shrink-0 ${isActive ? accent.icon : "text-slate-400"}`} />
          }
          <h4 className="font-bold text-slate-800 text-sm">
            Stage {stage} — {STAGE_NAMES[stage]}
          </h4>
          {isDone && (
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
              {doneLabel ?? "Done"}
            </span>
          )}
          {isActive && (
            <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${accent.badge}`}>
              Active
            </span>
          )}
          {isUpcoming && (
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
              Upcoming
            </span>
          )}
        </div>
        {isDone && (
          <p className="text-[12px] text-slate-500">{doneLabel ?? "Completed"}</p>
        )}
        {isActive && activeContent}
      </div>
    )
  }

  // Stage 1 (always pushed)
  pushCard(1,
    <Stage1 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />,
    "Tool Initiation Submitted"
  )

  // Stages 2–6 (simple component stages)
  const simpleStageComponents: Partial<Record<NTDStage, React.ReactNode>> = {
    2: <Stage2 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />,
    3: <Stage3 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />,
    4: <Stage4 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />,
    5: <Stage5 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />,
    6: <Stage6 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />,
  }
  const simpleDoneLabels: Partial<Record<NTDStage, string>> = {
    2: "Spec Sheet Approved",
    3: "RFQ Dispatched",
    4: "Quotations Reviewed",
    5: "Supplier Finalized",
    6: "R&D Data Submitted",
  }
  for (const s of [2, 3, 4, 5, 6] as NTDStage[]) {
    if (currentStage >= s - 1) {
      pushCard(s, simpleStageComponents[s], simpleDoneLabels[s])
    }
  }

  // Stage 7 — DFM Review (pushed when currentStage >= 6)
  if (currentStage >= 6) {
    const dfmProgress = getDFMProgress(id)
    const isActive7   = currentStage === 7
    const isDone7     = currentStage > 7
    const isUpcoming7 = currentStage === 6
    const accent7 = STAGE_ACCENT[7]

    const card7Class = [
      "rounded-xl border p-4",
      isDone7     ? "bg-slate-50 border-slate-200" :
      isActive7   ? `${accent7.border} ${accent7.bg}` :
                    "bg-slate-50 border-slate-200 opacity-50",
    ].join(" ")

    cards.push(
      <div key={7} className={card7Class}>
        <div className="flex items-center gap-2 mb-3">
          {isDone7
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            : <Circle className={`w-4 h-4 shrink-0 ${isActive7 ? accent7.icon : "text-slate-400"}`} />
          }
          <h4 className="font-bold text-slate-800 text-sm">Stage 7 — {STAGE_NAMES[7]}</h4>
          {isDone7 && (
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
              DFM Review Complete — {dfmProgress.approved}/{dfmProgress.total} components approved
            </span>
          )}
          {isActive7 && (
            <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${accent7.badge}`}>
              Active
            </span>
          )}
          {isUpcoming7 && (
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
              Upcoming
            </span>
          )}
        </div>
        {isDone7 && (
          <p className="text-[12px] text-slate-500">
            DFM review complete — {dfmProgress.approved} / {dfmProgress.total} components approved
          </p>
        )}
        {isActive7 && (
          <div>
            <p className="text-[13px] text-slate-500 mb-4">
              Per-component DFM review loop — supplier submits, R&D and sourcing review iteratively.
            </p>
            <Link
              href={`/ntd/${id}/dfm`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            >
              Open DFM Review →
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <p className="text-[11px] text-slate-400 mt-2">
              Progress: {dfmProgress.approved} / {dfmProgress.total} components approved
            </p>
          </div>
        )}
      </div>
    )
  }

  // Stage 8 — Mould Design, Manufacturing & Trials (pushed when currentStage >= 7)
  if (currentStage >= 7) {
    const mouldProgress = getMouldDesignProgress(id)
    const trialProgress = getTrialProgress(id)
    const sub8 = subStage8

    const isActive8   = currentStage === 8
    const isDone8     = currentStage > 8
    const isUpcoming8 = currentStage === 7
    const accent8 = STAGE_ACCENT[8]

    const card8Class = [
      "rounded-xl border p-4",
      isDone8     ? "bg-slate-50 border-slate-200" :
      isActive8   ? `${accent8.border} ${accent8.bg}` :
                    "bg-slate-50 border-slate-200 opacity-50",
    ].join(" ")

    cards.push(
      <div key={8} className={card8Class}>
        <div className="flex items-center gap-2 mb-3">
          {isDone8
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            : <Circle className={`w-4 h-4 shrink-0 ${isActive8 ? accent8.icon : "text-slate-400"}`} />
          }
          <h4 className="font-bold text-slate-800 text-sm">Stage 8 — {STAGE_NAMES[8]}</h4>
          {isDone8 && (
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
              Done
            </span>
          )}
          {isActive8 && (
            <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${accent8.badge}`}>
              Active
            </span>
          )}
          {isUpcoming8 && (
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
              Upcoming
            </span>
          )}
        </div>

        {isDone8 && (
          <p className="text-[12px] text-slate-500">
            Mould Design, Manufacturing &amp; Trials — all sub-stages complete
          </p>
        )}

        {isActive8 && (
          <div className="space-y-3">
            {/* Sub-stage indicator strip */}
            <div className="flex items-center gap-0">
              {(["8A", "8B", "8C"] as const).map((ss, idx) => {
                const ssDone =
                  (ss === "8A" && (sub8 === "8B" || sub8 === "8C")) ||
                  (ss === "8B" && sub8 === "8C")
                const ssCurrent = sub8 === ss
                return (
                  <div key={ss} className="flex items-center flex-1">
                    <div
                      className={[
                        "flex items-center justify-center px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex-1",
                        ssDone
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : ssCurrent
                          ? "bg-slate-700 border-slate-700 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-400",
                      ].join(" ")}
                    >
                      {ssDone && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {ss}
                    </div>
                    {idx < 2 && (
                      <ArrowRight className="w-4 h-4 text-slate-300 mx-1 shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* 8A — Mould Design card */}
            <div
              className={[
                "rounded-xl border shadow-sm overflow-hidden",
                sub8 === "8A" ? "border-slate-300" : "border-slate-100",
              ].join(" ")}
            >
              <div className="bg-white px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                      sub8 === "8A"
                        ? "bg-slate-100 border border-slate-200"
                        : "bg-emerald-50 border border-emerald-100",
                    ].join(" ")}
                  >
                    {sub8 !== "8A" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-700">8A</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">Mould Design Review</p>
                    <p className="text-[11px] text-slate-400">
                      {mouldProgress.approved} / {mouldProgress.total} components approved
                    </p>
                  </div>
                </div>
                <Link
                  href={`/ntd/${id}/mould-design`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold bg-slate-900 hover:bg-slate-700 text-white transition-colors"
                >
                  Open Mould Design
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* 8B — Manufacturing (inline component) */}
            <Stage8B
              ntdId={id}
              currentRole={currentRole}
              onStageAdvance={handleStageAdvance}
            />

            {/* 8C — Trials card */}
            <div
              className={[
                "rounded-xl border shadow-sm overflow-hidden",
                sub8 === "8C" ? "border-slate-300" : "border-slate-100",
              ].join(" ")}
            >
              <div
                className={[
                  "bg-white px-5 py-4 flex items-center justify-between flex-wrap gap-3",
                  sub8 !== "8C" ? "opacity-60" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                      sub8 === "8C"
                        ? "bg-slate-100 border border-slate-200"
                        : "bg-slate-100 border border-slate-200",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "text-[10px] font-bold",
                        sub8 === "8C" ? "text-slate-700" : "text-slate-400",
                      ].join(" ")}
                    >
                      8C
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">Trial Samples &amp; Testing</p>
                    <p className="text-[11px] text-slate-400">
                      {trialProgress.passed} / {trialProgress.total} components passed across all trials
                    </p>
                  </div>
                </div>
                {sub8 === "8C" ? (
                  <Link
                    href={`/ntd/${id}/trials`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold bg-slate-900 hover:bg-slate-700 text-white transition-colors"
                  >
                    Open Trials
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Locked — complete 8B first
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Stage 9 — Tool Commissioning & Dispatch (pushed when currentStage >= 8)
  if (currentStage >= 8) {
    const isActive9   = currentStage === 9
    const isDone9     = currentStage > 9
    const isUpcoming9 = currentStage === 8
    const accent9 = STAGE_ACCENT[9]

    const card9Class = [
      "rounded-xl border p-4",
      isDone9     ? "bg-slate-50 border-slate-200" :
      isActive9   ? `${accent9.border} ${accent9.bg}` :
                    "bg-slate-50 border-slate-200 opacity-50",
    ].join(" ")

    cards.push(
      <div key={9} className={card9Class}>
        <div className="flex items-center gap-2 mb-3">
          {isDone9
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            : <Circle className={`w-4 h-4 shrink-0 ${isActive9 ? accent9.icon : "text-slate-400"}`} />
          }
          <h4 className="font-bold text-slate-800 text-sm">Stage 9 — {STAGE_NAMES[9]}</h4>
          {isDone9 && (
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
              NTD Commissioned &amp; Complete
            </span>
          )}
          {isActive9 && (
            <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${accent9.badge}`}>
              Active
            </span>
          )}
          {isUpcoming9 && (
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
              Upcoming
            </span>
          )}
        </div>
        {isDone9 && (
          <p className="text-[12px] text-slate-500">NTD Commissioned &amp; Complete</p>
        )}
        {isActive9 && (
          <Stage9 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <Link
          href="/ntd"
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          NTD List
        </Link>

        {/* NTD header card */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
              <Wrench className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-slate-400">{record.id}</span>
                {currentStage >= 9 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" /> Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    Stage {currentStage} / 9
                  </span>
                )}
              </div>
              <h1 className="text-[16px] font-bold text-slate-900 mt-0.5 leading-tight">{record.title}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-[11px] text-slate-400">
                  <span className="font-medium text-slate-600">{record.component_count}</span> component{record.component_count !== 1 ? "s" : ""}
                </span>
                {record.supplier && (
                  <span className="text-[11px] text-slate-400">
                    Supplier: <span className="font-medium text-slate-600">{record.supplier}</span>
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  Created by: <span className="font-medium text-slate-600">{record.created_by}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6 pb-24 space-y-3">
        {/* NTD Complete banner */}
        {ntdComplete && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[14px] font-bold text-emerald-800">NTD Complete</p>
              <p className="text-[12px] text-emerald-600">
                All 9 stages are done. This NTD has been fully commissioned and closed.
              </p>
            </div>
          </div>
        )}

        {[...cards].reverse()}
      </div>

      {/* Demo toolbar — fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 px-6 py-2.5 flex items-center gap-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Demo</span>
        <button
          disabled={currentStage <= 1}
          onClick={() => { updateNTDStage(id, (currentStage - 1) as NTDStage); handleStageAdvance() }}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          ← Prev
        </button>
        <span className="text-[12px] font-bold text-white tabular-nums">Stage {currentStage} / 9</span>
        <button
          disabled={currentStage >= 9}
          onClick={() => { updateNTDStage(id, (currentStage + 1) as NTDStage); handleStageAdvance() }}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          Next →
        </button>
        <span className="text-slate-600 text-sm">|</span>
        <span className="text-[11px] text-slate-400">Jump:</span>
        <select
          value={currentStage}
          onChange={e => { updateNTDStage(id, Number(e.target.value) as NTDStage); handleStageAdvance() }}
          className="bg-slate-700 border border-slate-600 text-slate-200 text-[12px] rounded-lg px-2 py-1 focus:outline-none"
        >
          {([1, 2, 3, 4, 5, 6, 7, 8, 9] as NTDStage[]).map(s => (
            <option key={s} value={s}>Stage {s}</option>
          ))}
        </select>
        <span className="ml-auto text-[10px] text-slate-600 italic">Demo Mode</span>
      </div>
    </div>
  )
}
