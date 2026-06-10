"use client"

import { useState, useEffect } from "react"
import { CheckCircle2 } from "lucide-react"
import {
  getNTDQuotation,
  getNTDFinalVendor,
  setNTDFinalVendor,
  getNTDRecord,
  saveNTDRecord,
  updateNTDStage,
} from "@/lib/ntd"
import type { NTDFinalVendorData } from "@/types/ntd"

const SPOC_NAMES = [
  "Rahul Sharma", "Karan Mehta", "Priya Rajan",
  "Amit Kumar", "Varun Joshi", "Rohan Desai",
]

interface Stage5Props {
  ntdId: string
  currentRole: string
  onStageAdvance: () => void
}

export default function Stage5({ ntdId, currentRole, onStageAdvance }: Stage5Props) {
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"
  const isSpocOrSourcing =
    SPOC_NAMES.includes(currentRole) || currentRole === "sourcing_head"

  const [finalizedVendors, setFinalizedVendors] = useState<Array<{ id: string; name: string }>>([])
  const [finalVendor, setFinalVendorState] = useState<NTDFinalVendorData | null>(null)
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    const quotation = getNTDQuotation(ntdId) ?? {}
    const finalized = Object.entries(quotation)
      .filter(([, v]) => v.status === "finalized")
      .map(([id, v]) => ({ id, name: v.quote_doc || id }))

    // Get vendor names from RFQ data via quotation keys
    // We'll resolve names from local storage context — quotation doesn't store names directly
    // Use ids and match with rfq if needed; here just use id as fallback label
    setFinalizedVendors(finalized)

    const fv = getNTDFinalVendor(ntdId)
    setFinalVendorState(fv)
  }, [ntdId])

  function handleSelectSupplier(vendorId: string, vendorName: string) {
    const now = new Date().toISOString()
    const data: NTDFinalVendorData = {
      vendor_id: vendorId,
      vendor_name: vendorName,
      sourcing_approved: true,
      sourcing_approved_by: currentRole,
      sourcing_approved_at: now,
      rnd_acknowledged: false,
      rnd_acknowledged_by: "",
      rnd_acknowledged_at: "",
    }
    setNTDFinalVendor(ntdId, data)
    setFinalVendorState(data)

    // Update the NTD record with supplier field
    const record = getNTDRecord(ntdId)
    if (record) {
      saveNTDRecord({ ...record, supplier: vendorName })
    }
  }

  function handleRndAcknowledge() {
    if (!finalVendor) return
    const now = new Date().toISOString()
    const updated: NTDFinalVendorData = {
      ...finalVendor,
      rnd_acknowledged: true,
      rnd_acknowledged_by: currentRole,
      rnd_acknowledged_at: now,
    }
    setNTDFinalVendor(ntdId, updated)
    setFinalVendorState(updated)

    if (updated.sourcing_approved && !advanced) {
      setAdvanced(true)
      updateNTDStage(ntdId, 6)
      onStageAdvance()
    }
  }

  // Attempt to get vendor display names from RFQ
  // We'll do a best-effort lookup
  useEffect(() => {
    // Enrich vendor list with names from RFQ
    const { getNTDRFQ } = require("@/lib/ntd")
    const rfq = getNTDRFQ(ntdId) ?? {}
    setFinalizedVendors((prev) =>
      prev.map((v) => ({
        ...v,
        name: rfq[v.id]?.vendor_name ?? v.name,
      }))
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ntdId])

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
      {/* Stage header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <span className="text-[12px] font-bold text-blue-700">5</span>
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-slate-800">Supplier Finalization</h2>
          <p className="text-[12px] text-slate-500">
            Sourcing selects the final supplier; R&amp;D acknowledges the selection.
          </p>
        </div>
      </div>

      {/* Finalized vendors list */}
      {finalizedVendors.length === 0 ? (
        <p className="text-[13px] text-slate-400">No vendors have been finalized in the quotation stage.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-slate-600">Finalized Vendors</p>
          {finalizedVendors.map((v) => {
            const isSelected = finalVendor?.vendor_id === v.id
            return (
              <div
                key={v.id}
                className={[
                  "rounded-lg border px-4 py-3 flex items-center justify-between gap-3 flex-wrap",
                  isSelected
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">{v.name}</p>
                  <p className="text-[11px] font-mono text-slate-400">{v.id}</p>
                </div>
                {isSelected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Selected
                  </span>
                ) : (
                  isSpocOrSourcing && !finalVendor?.sourcing_approved && (
                    <button
                      onClick={() => handleSelectSupplier(v.id, v.name)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      Select as Final Supplier
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Status / actions after sourcing selects */}
      {finalVendor?.sourcing_approved && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-blue-800">
                Supplier Selected: {finalVendor.vendor_name}
              </p>
              <p className="text-[11px] text-blue-600 mt-0.5">
                By {finalVendor.sourcing_approved_by} · {new Date(finalVendor.sourcing_approved_at).toLocaleString()}
              </p>
            </div>
          </div>

          {finalVendor.rnd_acknowledged ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-emerald-700">R&amp;D Acknowledged</p>
                <p className="text-[11px] text-emerald-600">
                  {finalVendor.rnd_acknowledged_by} · {new Date(finalVendor.rnd_acknowledged_at).toLocaleString()}
                </p>
              </div>
            </div>
          ) : isRnd ? (
            <button
              onClick={handleRndAcknowledge}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Acknowledge Supplier Selection
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-100">
              <span className="text-[13px] text-amber-700">Awaiting R&amp;D acknowledgement</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
