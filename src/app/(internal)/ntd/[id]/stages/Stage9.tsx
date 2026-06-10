"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Lock, Circle, Plus, Trash2 } from "lucide-react"
import {
  getNTDInspection, setNTDInspection,
  getNTDCommissioning, setNTDCommissioning,
  getNTDShipment, setNTDShipment,
  getNTDArrival, setNTDArrival,
} from "@/lib/ntd"
import type {
  NTDInspectionData,
  NTDCommissioningData,
  NTDShipmentData,
  NTDArrivalData,
} from "@/types/ntd"

// ─── Role helpers ─────────────────────────────────────────────

const SPOC_NAMES = [
  "Rahul Sharma", "Karan Mehta", "Priya Rajan",
  "Amit Kumar", "Varun Joshi", "Rohan Desai",
]

function isSpocOrSourcing(role: string) {
  return SPOC_NAMES.includes(role) || role === "sourcing_head"
}

function canApproveRole(role: string) {
  return role === "rnd_head" || role === "super_admin"
}

// ─── Sub-step wrapper ─────────────────────────────────────────

type SubStepStatus = "done" | "active" | "locked"

interface SubStepProps {
  no: number
  title: string
  status: SubStepStatus
  children?: React.ReactNode
  summary?: React.ReactNode
}

function SubStep({ no, title, status, children, summary }: SubStepProps) {
  return (
    <div className="flex gap-4">
      {/* Left: indicator + connector */}
      <div className="flex flex-col items-center">
        <div
          className={[
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 font-bold text-[12px] transition-all",
            status === "done"
              ? "bg-emerald-500 border-emerald-500 text-white"
              : status === "active"
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-slate-100 border-slate-200 text-slate-400",
          ].join(" ")}
        >
          {status === "done" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : status === "locked" ? (
            <Lock className="w-3.5 h-3.5" />
          ) : (
            <span>{no}</span>
          )}
        </div>
        {no < 5 && (
          <div
            className="w-0.5 flex-1 mt-1"
            style={{ minHeight: "1.5rem", background: status === "done" ? "#10B981" : "#E2E8F0" }}
          />
        )}
      </div>

      {/* Right: content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={[
              "text-[13px] font-semibold",
              status === "done"
                ? "text-emerald-700"
                : status === "active"
                ? "text-blue-800"
                : "text-slate-400",
            ].join(" ")}
          >
            {title}
          </span>
          {status === "done" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="w-3 h-3" /> Done
            </span>
          )}
          {status === "active" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <Circle className="w-3 h-3" /> Active
            </span>
          )}
          {status === "locked" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}
        </div>

        {status === "done" && summary && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-[12px] text-emerald-700 mt-1">
            {summary}
          </div>
        )}

        {status === "active" && children && (
          <div className="mt-2">{children}</div>
        )}
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────

interface Stage9Props {
  ntdId: string
  currentRole: string
  onStageAdvance: () => void
}

// ─── Main Component ───────────────────────────────────────────

export default function Stage9({ ntdId, currentRole, onStageAdvance }: Stage9Props) {
  const [inspection, setInspectionState] = useState<NTDInspectionData | null>(null)
  const [commissioning, setCommissioningState] = useState<NTDCommissioningData | null>(null)
  const [shipment, setShipmentState] = useState<NTDShipmentData | null>(null)
  const [arrival, setArrivalState] = useState<NTDArrivalData | null>(null)

  // Form state — Sub-step 1
  const [reportDoc, setReportDoc] = useState("")

  // Form state — Sub-step 2
  const [checklistDone, setChecklistDone] = useState(false)
  const [packListDoc, setPackListDoc] = useState("")
  const [invoiceDoc, setInvoiceDoc] = useState("")

  // Form state — Sub-step 3
  const [eximDocs, setEximDocs] = useState<string[]>([""])
  const [shipMode, setShipMode] = useState<"sea" | "air">("sea")
  const [trackingId, setTrackingId] = useState("")

  // Form state — Sub-step 4
  const [confirming, setConfirming] = useState(false)

  const canApprove = canApproveRole(currentRole)
  const isSourcing = isSpocOrSourcing(currentRole)
  const canSourcingHeadApprove =
    currentRole === "sourcing_head" || currentRole === "super_admin"

  function refresh() {
    setInspectionState(getNTDInspection(ntdId))
    setCommissioningState(getNTDCommissioning(ntdId))
    setShipmentState(getNTDShipment(ntdId))
    setArrivalState(getNTDArrival(ntdId))
  }

  useEffect(() => {
    refresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ntdId])

  // ── Sub-step 1 submit ────────────────────────────────────────
  function handleInspectionSubmit() {
    if (!reportDoc.trim()) return
    const data: NTDInspectionData = {
      report_doc: reportDoc.trim(),
      submitted_by: currentRole,
      submitted_at: new Date().toISOString(),
    }
    setNTDInspection(ntdId, data)
    setInspectionState(data)
  }

  // ── Sub-step 2 submit ────────────────────────────────────────
  function handleCommissioningSubmit() {
    if (!packListDoc.trim() || !invoiceDoc.trim()) return
    const data: NTDCommissioningData = {
      checklist_complete: checklistDone,
      pack_list_doc: packListDoc.trim(),
      invoice_doc: invoiceDoc.trim(),
    }
    setNTDCommissioning(ntdId, data)
    setCommissioningState(data)
  }

  // ── Sub-step 3 submit ────────────────────────────────────────
  function handleShipmentSubmit() {
    const validDocs = eximDocs.filter((d) => d.trim())
    if (validDocs.length === 0 || !trackingId.trim()) return
    const data: NTDShipmentData = {
      exim_docs: validDocs,
      mode: shipMode,
      tracking_id: trackingId.trim(),
      dispatched_at: new Date().toISOString(),
    }
    setNTDShipment(ntdId, data)
    setShipmentState(data)
  }

  // ── Sub-step 4 submit ────────────────────────────────────────
  function handleArrivalConfirm() {
    setConfirming(true)
    const data: NTDArrivalData = {
      arrived_at: new Date().toISOString(),
      plant: "Gurugram",
      rnd_head_approved: false,
      rnd_head_approved_by: "",
      rnd_head_approved_at: "",
      sourcing_head_approved: false,
      sourcing_head_approved_by: "",
      sourcing_head_approved_at: "",
      ntd_complete: false,
    }
    setNTDArrival(ntdId, data)
    setArrivalState(data)
    setConfirming(false)
  }

  // ── Sub-step 5 — RND Head approve ────────────────────────────
  function handleRndApprove() {
    if (!arrival) return
    const now = new Date().toISOString()
    const updated: NTDArrivalData = {
      ...arrival,
      rnd_head_approved: true,
      rnd_head_approved_by: currentRole,
      rnd_head_approved_at: now,
    }
    const withComplete = updated.sourcing_head_approved
      ? { ...updated, ntd_complete: true }
      : updated
    setNTDArrival(ntdId, withComplete)
    setArrivalState(withComplete)
    if (withComplete.ntd_complete) onStageAdvance()
  }

  // ── Sub-step 5 — Sourcing Head approve ───────────────────────
  function handleSourcingApprove() {
    if (!arrival) return
    const now = new Date().toISOString()
    const updated: NTDArrivalData = {
      ...arrival,
      sourcing_head_approved: true,
      sourcing_head_approved_by: currentRole,
      sourcing_head_approved_at: now,
    }
    const withComplete = updated.rnd_head_approved
      ? { ...updated, ntd_complete: true }
      : updated
    setNTDArrival(ntdId, withComplete)
    setArrivalState(withComplete)
    if (withComplete.ntd_complete) onStageAdvance()
  }

  // ── Derived state ─────────────────────────────────────────────
  const s1Status: SubStepStatus = inspection ? "done" : "active"
  const s2Status: SubStepStatus = !inspection
    ? "locked"
    : commissioning
    ? "done"
    : "active"
  const s3Status: SubStepStatus = !commissioning
    ? "locked"
    : shipment
    ? "done"
    : "active"
  const s4Status: SubStepStatus = !shipment
    ? "locked"
    : arrival
    ? "done"
    : "active"
  const s5Status: SubStepStatus = !arrival
    ? "locked"
    : arrival.ntd_complete
    ? "done"
    : "active"

  const ntdComplete = arrival?.ntd_complete === true

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-2">
      {/* Stage header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <span className="text-[12px] font-bold text-blue-700">9</span>
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-slate-800">Tool Commissioning &amp; Dispatch</h2>
          <p className="text-[12px] text-slate-500">
            Final inspection, commissioning checklist, shipment, and plant arrival sign-off.
          </p>
        </div>
      </div>

      {/* NTD Complete banner */}
      {ntdComplete && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-[14px] font-bold text-emerald-800">NTD Complete</p>
            <p className="text-[12px] text-emerald-600">
              Tool arrived at {arrival?.plant} and received dual sign-off. NTD lifecycle complete.
            </p>
          </div>
        </div>
      )}

      {/* ── Sub-step 1 — Final Inspection Report ────────────── */}
      <SubStep
        no={1}
        title="Final Inspection Report"
        status={s1Status}
        summary={
          inspection && (
            <span>
              Report submitted by <strong>{inspection.submitted_by}</strong> at{" "}
              {new Date(inspection.submitted_at).toLocaleString()}
              {" · "}
              <a
                href={inspection.report_doc}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View Report
              </a>
            </span>
          )
        }
      >
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-[12px] text-slate-500">
            Submit the final inspection report document link. This report confirms tool quality
            before commissioning.
          </p>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Report Document Link <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
              placeholder="https://drive.google.com/…"
              value={reportDoc}
              onChange={(e) => setReportDoc(e.target.value)}
            />
          </div>
          <button
            onClick={handleInspectionSubmit}
            disabled={!reportDoc.trim()}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Inspection Report
          </button>
        </div>
      </SubStep>

      {/* ── Sub-step 2 — Commissioning Checklist ────────────── */}
      <SubStep
        no={2}
        title="Commissioning Checklist"
        status={s2Status}
        summary={
          commissioning && (
            <span>
              Checklist {commissioning.checklist_complete ? "complete" : "incomplete"} · Pack list +
              invoice submitted.
            </span>
          )
        }
      >
        {isSourcing ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklistDone}
                onChange={(e) => setChecklistDone(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-300"
              />
              <span className="text-[12px] font-semibold text-slate-700">
                Commissioning checks complete
              </span>
            </label>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Pack List Document Link <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                placeholder="https://…"
                value={packListDoc}
                onChange={(e) => setPackListDoc(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Invoice Document Link <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                placeholder="https://…"
                value={invoiceDoc}
                onChange={(e) => setInvoiceDoc(e.target.value)}
              />
            </div>
            <button
              onClick={handleCommissioningSubmit}
              disabled={!packListDoc.trim() || !invoiceDoc.trim()}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm Commissioning
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-400">
            Action required by Sourcing SPOC or Sourcing Head.
          </div>
        )}
      </SubStep>

      {/* ── Sub-step 3 — EXIM & Shipment ────────────────────── */}
      <SubStep
        no={3}
        title="EXIM Documentation &amp; Shipment"
        status={s3Status}
        summary={
          shipment && (
            <span>
              Dispatched via <strong>{shipment.mode.toUpperCase()}</strong> · Tracking:{" "}
              <strong>{shipment.tracking_id}</strong> · {shipment.exim_docs.length} EXIM doc
              {shipment.exim_docs.length !== 1 ? "s" : ""} attached.
            </span>
          )
        }
      >
        {isSourcing ? (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {/* EXIM docs */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                EXIM Document Links <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5">
                {eximDocs.map((doc, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                      placeholder={`EXIM doc link ${idx + 1}`}
                      value={doc}
                      onChange={(e) => {
                        const next = [...eximDocs]
                        next[idx] = e.target.value
                        setEximDocs(next)
                      }}
                    />
                    {eximDocs.length > 1 && (
                      <button
                        onClick={() => setEximDocs(eximDocs.filter((_, i) => i !== idx))}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setEximDocs([...eximDocs, ""])}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add doc
              </button>
            </div>

            {/* Shipment mode */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Shipment Mode
              </label>
              <div className="flex gap-2">
                {(["sea", "air"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setShipMode(m)}
                    className={[
                      "px-4 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors capitalize",
                      shipMode === m
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300",
                    ].join(" ")}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Tracking ID */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Tracking ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                placeholder="AWB / BL number or courier tracking ID"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
              />
            </div>

            <button
              onClick={handleShipmentSubmit}
              disabled={eximDocs.filter((d) => d.trim()).length === 0 || !trackingId.trim()}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm Shipment
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-400">
            Action required by Sourcing SPOC or Sourcing Head.
          </div>
        )}
      </SubStep>

      {/* ── Sub-step 4 — Tool Arrival Confirmation ───────────── */}
      <SubStep
        no={4}
        title="Tool Arrival at Gurugram"
        status={s4Status}
        summary={
          arrival && (
            <span>
              Arrived at <strong>{arrival.plant}</strong> on{" "}
              {new Date(arrival.arrived_at).toLocaleString()}
            </span>
          )
        }
      >
        {isSourcing ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-[12px] text-slate-500">
              Confirm that the tool has arrived at the Gurugram plant. This will initiate the dual
              sign-off process.
            </p>
            <button
              onClick={handleArrivalConfirm}
              disabled={confirming}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirming ? "Confirming…" : "Confirm Arrival at Gurugram"}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-400">
            Action required by Sourcing SPOC or Sourcing Head.
          </div>
        )}
      </SubStep>

      {/* ── Sub-step 5 — Dual Sign-off ───────────────────────── */}
      <SubStep
        no={5}
        title="Dual Sign-off — R&D Head + Sourcing Head"
        status={s5Status}
        summary={
          arrival?.ntd_complete ? (
            <span>Both approvals received. NTD closed.</span>
          ) : undefined
        }
      >
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
          <p className="text-[12px] text-slate-500">
            Both R&amp;D Head and Sourcing Head must approve tool arrival to close the NTD.
          </p>

          {/* R&D Head approval */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {arrival?.rnd_head_approved ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300" />
              )}
              <div>
                <p className="text-[12px] font-semibold text-slate-700">R&amp;D Head Approval</p>
                {arrival?.rnd_head_approved && (
                  <p className="text-[11px] text-emerald-600">
                    Approved by {arrival.rnd_head_approved_by} ·{" "}
                    {new Date(arrival.rnd_head_approved_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            {!arrival?.rnd_head_approved && canApprove && (
              <button
                onClick={handleRndApprove}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                R&amp;D Head Approve
              </button>
            )}
            {!arrival?.rnd_head_approved && !canApprove && (
              <span className="text-[11px] text-slate-400">Awaiting R&amp;D Head</span>
            )}
          </div>

          {/* Sourcing Head approval */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {arrival?.sourcing_head_approved ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300" />
              )}
              <div>
                <p className="text-[12px] font-semibold text-slate-700">Sourcing Head Approval</p>
                {arrival?.sourcing_head_approved && (
                  <p className="text-[11px] text-emerald-600">
                    Approved by {arrival.sourcing_head_approved_by} ·{" "}
                    {new Date(arrival.sourcing_head_approved_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            {!arrival?.sourcing_head_approved && canSourcingHeadApprove && (
              <button
                onClick={handleSourcingApprove}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                Sourcing Head Approve
              </button>
            )}
            {!arrival?.sourcing_head_approved && !canSourcingHeadApprove && (
              <span className="text-[11px] text-slate-400">Awaiting Sourcing Head</span>
            )}
          </div>

          {/* Completion banner inside dual sign-off */}
          {arrival?.ntd_complete && (
            <div className="rounded-lg bg-emerald-100 border border-emerald-200 px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-[13px] font-bold text-emerald-800">
                NTD Complete — both approvals received
              </p>
            </div>
          )}
        </div>
      </SubStep>
    </div>
  )
}
