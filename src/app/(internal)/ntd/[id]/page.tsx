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

const STAGE_NAMES_ARRAY = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as NTDStage[]).map(s => STAGE_NAMES[s])

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
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-300 px-6 py-6">

      {/* Back link */}
      <Link
        href="/ntd"
        className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        NTD List
      </Link>

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

      {/* NTD Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          {/* Left column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">{record.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{record.title}</h1>
            <p className="text-slate-500 text-sm">New Tool Development · {record.component_count} Components</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-slate-100 text-slate-700 border-none text-xs font-semibold px-2 py-0.5 rounded-full">New Tool Development (NTD)</span>
            </div>
          </div>
          {/* Right column: 2×2 info chips */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {/* Created By (used as SPOC equivalent) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created By</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{record.created_by}</p>
            </div>
            {/* Locked Supplier */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Locked Supplier</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-tight line-clamp-2">
                {record.supplier
                  ? record.supplier
                  : <span className="text-slate-400 italic font-normal text-xs">Pending Assignment</span>}
              </p>
            </div>
            {/* Components chip */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Components</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{record.component_count}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">in this tool</p>
            </div>
            {/* Current Stage chip */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Stage</p>
              <p className="text-sm font-semibold text-blue-900 mt-0.5 leading-tight line-clamp-2">
                {currentStage}. {STAGE_NAMES[currentStage]}
              </p>
            </div>
          </div>
        </div>
        {/* Demo Controls strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Demo Controls</span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentStage <= 1}
              onClick={() => { updateNTDStage(id, (currentStage - 1) as NTDStage); handleStageAdvance() }}
              className="text-xs h-7 px-3 rounded-md border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous Stage
            </button>
            <button
              disabled={currentStage >= 9}
              onClick={() => { updateNTDStage(id, (currentStage + 1) as NTDStage); handleStageAdvance() }}
              className="text-xs h-7 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Demo: Next Stage →
            </button>
          </div>
        </div>
      </div>

      {/* Stage Progress — horizontal pill stepper */}
      <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex min-w-[700px] gap-1">
          {STAGE_NAMES_ARRAY.map((name, idx) => {
            const step = idx + 1
            const status = step < currentStage ? "complete" : step === currentStage ? "current" : "upcoming"
            const chipBg = status === "complete" ? "bg-blue-900"
              : status === "current" ? "bg-blue-700 ring-2 ring-blue-400 ring-offset-1"
              : "bg-slate-100"
            const labelColor = (status === "complete" || status === "current") ? "text-blue-200" : "text-slate-400"
            const nameColor = status === "complete" ? "text-white"
              : status === "current" ? "text-white"
              : "text-slate-400"
            return (
              <div key={step} className={`flex-1 rounded-md px-2 py-2.5 flex flex-col gap-1 transition-all duration-300 ${chipBg}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${labelColor}`}>Step {step}</span>
                <span className={`text-[11px] font-semibold leading-tight ${nameColor}`}>{name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Card stack */}
      <div className="space-y-3">
        {[...cards].reverse()}
      </div>
    </div>
  )
}
