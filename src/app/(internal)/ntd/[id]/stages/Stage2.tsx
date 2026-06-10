"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Plus, Trash2 } from "lucide-react"
import { getNTDSpec, setNTDSpec, updateNTDStage } from "@/lib/ntd"
import type { NTDSpecData, NTDSpecComparison } from "@/types/ntd"

const SPOC_NAMES = [
  "Rahul Sharma", "Karan Mehta", "Priya Rajan",
  "Amit Kumar", "Varun Joshi", "Rohan Desai",
]

interface Stage2Props {
  ntdId: string
  currentRole: string
  onStageAdvance: () => void
}

const EMPTY_SPEC: NTDSpecData = {
  spec_sheet: "",
  comparisons: [],
  sourcing_approved: false,
  sourcing_approved_by: "",
  sourcing_approved_at: "",
  rnd_approved: false,
  rnd_approved_by: "",
  rnd_approved_at: "",
}

export default function Stage2({ ntdId, currentRole, onStageAdvance }: Stage2Props) {
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"
  const isSpocOrSourcing =
    SPOC_NAMES.includes(currentRole) || currentRole === "sourcing_head"

  const [spec, setSpec] = useState<NTDSpecData>(EMPTY_SPEC)
  const [specSheet, setSpecSheet] = useState("")
  const [comparisons, setComparisons] = useState<NTDSpecComparison[]>([])
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    const s = getNTDSpec(ntdId) ?? EMPTY_SPEC
    setSpec(s)
    setSpecSheet(s.spec_sheet)
    setComparisons(s.comparisons ?? [])
  }, [ntdId])

  function currentSpec(): NTDSpecData {
    return { ...spec, spec_sheet: specSheet, comparisons }
  }

  function handleAddComparison() {
    const id = `V${Date.now()}`
    setComparisons((prev) => [
      ...prev,
      { vendorId: id, vendor_name: "", spec_doc: "", notes: "" },
    ])
  }

  function handleUpdateComparison(idx: number, field: keyof NTDSpecComparison, value: string) {
    setComparisons((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  function handleRemoveComparison(idx: number) {
    setComparisons((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSourcingSignOff() {
    const now = new Date().toISOString()
    const updated: NTDSpecData = {
      ...currentSpec(),
      sourcing_approved: true,
      sourcing_approved_by: currentRole,
      sourcing_approved_at: now,
    }
    setNTDSpec(ntdId, updated)
    setSpec(updated)
    maybeProceed(updated)
  }

  function handleRndSignOff() {
    const now = new Date().toISOString()
    const updated: NTDSpecData = {
      ...currentSpec(),
      rnd_approved: true,
      rnd_approved_by: currentRole,
      rnd_approved_at: now,
    }
    setNTDSpec(ntdId, updated)
    setSpec(updated)
    maybeProceed(updated)
  }

  function maybeProceed(s: NTDSpecData) {
    if (s.sourcing_approved && s.rnd_approved && !advanced) {
      setAdvanced(true)
      updateNTDStage(ntdId, 3)
      onStageAdvance()
    }
  }

  const bothApproved = spec.sourcing_approved && spec.rnd_approved

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
      {/* Stage header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <span className="text-[12px] font-bold text-blue-700">2</span>
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-slate-800">Spec Sheet &amp; Comparison</h2>
          <p className="text-[12px] text-slate-500">
            Sourcing and R&amp;D review and approve the technical spec sheet and vendor comparisons.
          </p>
        </div>
      </div>

      {/* Spec sheet input */}
      <div>
        <label className="block text-[12px] font-semibold text-slate-600 mb-1">
          Spec Sheet Link / Reference <span className="text-red-400">*</span>
        </label>
        {isSpocOrSourcing ? (
          <input
            type="text"
            className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="https://..."
            value={specSheet}
            onChange={(e) => setSpecSheet(e.target.value)}
            disabled={spec.sourcing_approved}
          />
        ) : (
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-[13px] text-slate-700">
            {spec.spec_sheet || <span className="text-slate-400">Not provided</span>}
          </div>
        )}
      </div>

      {/* Vendor comparisons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-slate-600">
            Vendor Comparisons ({comparisons.length})
          </p>
          {isSpocOrSourcing && !spec.sourcing_approved && (
            <button
              onClick={handleAddComparison}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Vendor Comparison
            </button>
          )}
        </div>

        {comparisons.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
            <p className="text-[12px] text-slate-400">No vendor comparisons added yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comparisons.map((c, idx) => (
              <div key={c.vendorId} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">{c.vendorId}</span>
                  {isSpocOrSourcing && !spec.sourcing_approved && (
                    <button
                      onClick={() => handleRemoveComparison(idx)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Vendor name"
                    value={c.vendor_name}
                    onChange={(e) => handleUpdateComparison(idx, "vendor_name", e.target.value)}
                    disabled={spec.sourcing_approved}
                  />
                  <input
                    type="text"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Spec doc link"
                    value={c.spec_doc}
                    onChange={(e) => handleUpdateComparison(idx, "spec_doc", e.target.value)}
                    disabled={spec.sourcing_approved}
                  />
                  <input
                    type="text"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Notes"
                    value={c.notes}
                    onChange={(e) => handleUpdateComparison(idx, "notes", e.target.value)}
                    disabled={spec.sourcing_approved}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign-off section */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-[12px] font-semibold text-slate-600 mb-3">Sign-offs Required</p>
        <div className="flex flex-wrap gap-3">
          {/* Sourcing sign-off */}
          {spec.sourcing_approved ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[12px] font-semibold text-emerald-700">Sourcing Signed Off</p>
                <p className="text-[10px] text-emerald-600">
                  {spec.sourcing_approved_by} · {new Date(spec.sourcing_approved_at).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSourcingSignOff}
              disabled={!isSpocOrSourcing || !specSheet.trim()}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sourcing Sign-off
            </button>
          )}

          {/* R&D sign-off */}
          {spec.rnd_approved ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[12px] font-semibold text-emerald-700">R&amp;D Signed Off</p>
                <p className="text-[10px] text-emerald-600">
                  {spec.rnd_approved_by} · {new Date(spec.rnd_approved_at).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleRndSignOff}
              disabled={!isRnd || !specSheet.trim()}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              R&amp;D Sign-off
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-3">
          <span
            className={[
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border",
              spec.sourcing_approved
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-amber-50 text-amber-600 border-amber-100",
            ].join(" ")}
          >
            {spec.sourcing_approved ? <CheckCircle2 className="w-3 h-3" /> : null}
            Sourcing {spec.sourcing_approved ? "Done" : "Pending"}
          </span>
          <span
            className={[
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border",
              spec.rnd_approved
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-amber-50 text-amber-600 border-amber-100",
            ].join(" ")}
          >
            {spec.rnd_approved ? <CheckCircle2 className="w-3 h-3" /> : null}
            R&amp;D {spec.rnd_approved ? "Done" : "Pending"}
          </span>
        </div>
      </div>

      {bothApproved && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[13px] font-semibold text-emerald-700">
            Both sign-offs complete — proceeding to RFQ Dispatch
          </span>
        </div>
      )}
    </div>
  )
}
