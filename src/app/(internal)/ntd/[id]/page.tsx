"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, ArrowLeft, Wrench, Package, ArrowRight } from "lucide-react"
import { getNTDRecord, getNTDSubStage8Status, getDFMProgress } from "@/lib/ntd"
import type { NTDRecord, NTDStage } from "@/types/ntd"
import Stage1 from "./stages/Stage1"
import Stage2 from "./stages/Stage2"
import Stage3 from "./stages/Stage3"
import Stage4 from "./stages/Stage4"
import Stage5 from "./stages/Stage5"
import Stage6 from "./stages/Stage6"

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

const STAGE_DESCRIPTIONS: Record<NTDStage, string> = {
  1: "R&D submits the tool initiation brief, master 3D data package, and component list.",
  2: "Sourcing and R&D review and approve the technical spec sheet and vendor comparisons.",
  3: "Sourcing dispatches RFQs to shortlisted vendors with or without NDA.",
  4: "Sourcing reviews vendor quotations and conducts multi-round price negotiations.",
  5: "Sourcing finalises the selected vendor; R&D acknowledges the selection.",
  6: "R&D uploads per-component PPT and 3D data; supplier acknowledges receipt.",
  7: "Per-component DFM review loop — supplier submits, R&D and sourcing review iteratively.",
  8: "Mould design (8A), manufacturing tracking (8B), and trial samples & testing (8C).",
  9: "Final inspection, commissioning checklist, shipment, and plant arrival sign-off.",
}

function StageStepper({
  currentStage,
  subStage8,
}: {
  currentStage: NTDStage
  subStage8: "8A" | "8B" | "8C"
}) {
  const stages: NTDStage[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  return (
    <div className="flex items-start gap-0">
      {stages.map((stage, idx) => {
        const isDone = currentStage > stage
        const isCurrent = currentStage === stage
        const isLocked = currentStage < stage

        return (
          <div key={stage} className="flex items-start flex-1 min-w-0">
            {/* Step + connector */}
            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {/* Left connector */}
                {idx > 0 && (
                  <div
                    className="flex-1 h-0.5 mt-[1px]"
                    style={{ background: isDone || isCurrent ? "#10B981" : "#E2E8F0" }}
                  />
                )}
                {/* Circle */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold border-2 transition-all"
                  style={
                    isDone
                      ? { background: "#10B981", borderColor: "#10B981", color: "#fff" }
                      : isCurrent
                      ? { background: "#1E40AF", borderColor: "#1E40AF", color: "#fff" }
                      : { background: "#F1F5F9", borderColor: "#CBD5E1", color: "#94A3B8" }
                  }
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span>{stage}</span>
                  )}
                </div>
                {/* Right connector */}
                {idx < stages.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mt-[1px]"
                    style={{ background: isDone ? "#10B981" : "#E2E8F0" }}
                  />
                )}
              </div>

              {/* Label */}
              <div className="mt-1.5 flex flex-col items-center gap-0.5">
                <span
                  className={[
                    "text-[9px] font-semibold text-center leading-tight px-0.5 truncate max-w-[60px]",
                    isDone
                      ? "text-emerald-600"
                      : isCurrent
                      ? "text-blue-700"
                      : "text-slate-400",
                  ].join(" ")}
                  title={STAGE_NAMES[stage]}
                >
                  {stage === 8 ? "S8" : STAGE_NAMES[stage].split(" ")[0]}
                </span>
                {stage === 8 && isCurrent && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                    {subStage8}
                  </span>
                )}
                {stage === 8 && isDone && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    Done
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ComingSoonCard({ stage, name, description }: { stage: NTDStage; name: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <span className="text-[12px] font-bold text-blue-700">{stage}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-[14px] font-bold text-slate-800">{name}</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              Implementation coming soon
            </span>
          </div>
          <p className="text-[13px] text-slate-500">{description}</p>

          {/* Placeholder content */}
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-slate-400">
              Stage {stage} — {name}
            </p>
            <p className="text-[12px] text-slate-300 mt-1">
              Stage UI will be available in a future phase.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NTDDetailPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""

  const [record, setRecord] = useState<NTDRecord | null | undefined>(undefined)
  const [subStage8, setSubStage8] = useState<"8A" | "8B" | "8C">("8A")
  const [currentRole, setCurrentRole] = useState("rnd_user")

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") || "rnd_user")
    const r = getNTDRecord(id)
    setRecord(r ?? null)
    setSubStage8(getNTDSubStage8Status(id))

    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener("rolechange", onRoleChange as EventListener)
    return () => window.removeEventListener("rolechange", onRoleChange as EventListener)
  }, [id])

  function handleStageAdvance() {
    const r = getNTDRecord(id)
    if (r) {
      setRecord(r)
      setSubStage8(getNTDSubStage8Status(id))
    }
  }

  function renderCurrentStage(stage: NTDStage) {
    switch (stage) {
      case 1:
        return <Stage1 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />
      case 2:
        return <Stage2 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />
      case 3:
        return <Stage3 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />
      case 4:
        return <Stage4 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />
      case 5:
        return <Stage5 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />
      case 6:
        return <Stage6 ntdId={id} currentRole={currentRole} onStageAdvance={handleStageAdvance} />
      case 7: {
        const dfmProgress = getDFMProgress(id)
        return (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <span className="text-[12px] font-bold text-blue-700">7</span>
              </div>
              <div className="flex-1">
                <h2 className="text-[14px] font-bold text-slate-800 mb-1">
                  {STAGE_NAMES[7]}
                </h2>
                <p className="text-[13px] text-slate-500 mb-4">
                  {STAGE_DESCRIPTIONS[7]}
                </p>
                <Link
                  href={`/ntd/${id}/dfm`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Open DFM Review
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <p className="text-[11px] text-slate-400 mt-2">
                  Progress: {dfmProgress.approved} / {dfmProgress.total} components approved
                </p>
              </div>
            </div>
          </div>
        )
      }
      case 8:
      case 9:
        return (
          <ComingSoonCard
            stage={stage}
            name={STAGE_NAMES[stage]}
            description={STAGE_DESCRIPTIONS[stage]}
          />
        )
      default:
        return null
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
      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">

        {/* Stage stepper */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4">
          <StageStepper currentStage={currentStage} subStage8={subStage8} />
        </div>

        {/* Current stage */}
        {renderCurrentStage(currentStage)}

      </div>
    </div>
  )
}
