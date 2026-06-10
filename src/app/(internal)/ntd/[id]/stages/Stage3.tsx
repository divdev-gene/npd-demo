"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Plus, Send } from "lucide-react"
import { getNTDRFQ, setNTDRFQ, updateNTDStage } from "@/lib/ntd"
import { VENDOR_CATALOG } from "@/lib/mockData"
import type { NTDRFQData, NTDRFQVendorEntry } from "@/types/ntd"

const SPOC_NAMES = [
  "Rahul Sharma", "Karan Mehta", "Priya Rajan",
  "Amit Kumar", "Varun Joshi", "Rohan Desai",
]

interface Stage3Props {
  ntdId: string
  currentRole: string
  onStageAdvance: () => void
}

interface CustomVendorForm {
  name: string
}

export default function Stage3({ ntdId, currentRole, onStageAdvance }: Stage3Props) {
  const isSpocOrSourcing =
    SPOC_NAMES.includes(currentRole) || currentRole === "sourcing_head"

  const [rfq, setRfqState] = useState<NTDRFQData>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [customVendor, setCustomVendor] = useState<CustomVendorForm>({ name: "" })

  // Build a flat vendor list from catalog (for display)
  const catalogVendors: Array<{ id: string; commodity: string; name: string; tier: string }> =
    Object.entries(VENDOR_CATALOG).flatMap(([commodity, vendors]) =>
      vendors.map((v) => ({
        id: `catalog__${commodity}__${v.name}`,
        commodity,
        name: v.name,
        tier: v.tier,
      }))
    )

  useEffect(() => {
    const data = getNTDRFQ(ntdId) ?? {}
    setRfqState(data)
    setSelectedIds(new Set(Object.keys(data)))
  }, [ntdId])

  function toggleVendor(id: string, name: string, tier: string, ndaRequired: boolean) {
    if (selectedIds.has(id)) {
      // Deselect — only if not sent
      if (rfq[id]?.sent) return
      const next = { ...rfq }
      delete next[id]
      setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s })
      setRfqState(next)
      setNTDRFQ(ntdId, next)
    } else {
      const entry: NTDRFQVendorEntry = {
        vendor_name: name,
        sent: false,
        sent_at: "",
        nda_required: ndaRequired,
        nda_signed: false,
        rfq_doc: "",
      }
      const next = { ...rfq, [id]: entry }
      setSelectedIds((prev) => { const s = new Set(prev); s.add(id); return s })
      setRfqState(next)
      setNTDRFQ(ntdId, next)
    }
  }

  function handleAddCustomVendor() {
    const name = customVendor.name.trim()
    if (!name) return
    const id = `custom__${Date.now()}`
    const entry: NTDRFQVendorEntry = {
      vendor_name: name,
      sent: false,
      sent_at: "",
      nda_required: true,
      nda_signed: false,
      rfq_doc: "",
    }
    const next = { ...rfq, [id]: entry }
    setSelectedIds((prev) => { const s = new Set(prev); s.add(id); return s })
    setRfqState(next)
    setNTDRFQ(ntdId, next)
    setCustomVendor({ name: "" })
  }

  function handleUpdateRfqDoc(id: string, val: string) {
    const next = { ...rfq, [id]: { ...rfq[id], rfq_doc: val } }
    setRfqState(next)
    setNTDRFQ(ntdId, next)
  }

  function handleSendRFQ(id: string) {
    const now = new Date().toISOString()
    const next = { ...rfq, [id]: { ...rfq[id], sent: true, sent_at: now } }
    setRfqState(next)
    setNTDRFQ(ntdId, next)
  }

  function handleSendAll() {
    const now = new Date().toISOString()
    const next = { ...rfq }
    for (const id of Object.keys(next)) {
      if (!next[id].sent) {
        next[id] = { ...next[id], sent: true, sent_at: now }
      }
    }
    setRfqState(next)
    setNTDRFQ(ntdId, next)
  }

  function handleProceed() {
    updateNTDStage(ntdId, 4)
    onStageAdvance()
  }

  const anySent = Object.values(rfq).some((v) => v.sent)
  const selectedEntries = Object.entries(rfq)

  // Group catalog vendors by commodity for display
  const catalogGroups = Object.entries(VENDOR_CATALOG)

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
      {/* Stage header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <span className="text-[12px] font-bold text-blue-700">3</span>
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-slate-800">RFQ Dispatch</h2>
          <p className="text-[12px] text-slate-500">
            Sourcing dispatches RFQs to shortlisted vendors.
          </p>
        </div>
      </div>

      {isSpocOrSourcing ? (
        <>
          {/* Vendor catalog checklist */}
          <div>
            <p className="text-[12px] font-semibold text-slate-600 mb-2">Select Vendors from Catalog</p>
            <div className="rounded-lg border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
              {catalogGroups.map(([commodity, vendors]) => (
                <div key={commodity}>
                  <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      {commodity}
                    </span>
                  </div>
                  {vendors.map((v) => {
                    const id = `catalog__${commodity}__${v.name}`
                    const isSelected = selectedIds.has(id)
                    const isSent = rfq[id]?.sent
                    return (
                      <label
                        key={id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleVendor(id, v.name, v.tier, false)}
                          disabled={isSent}
                          className="rounded"
                        />
                        <span className="text-[13px] text-slate-800 flex-1">{v.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {v.tier}
                        </span>
                      </label>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Add custom vendor */}
          <div>
            <p className="text-[12px] font-semibold text-slate-600 mb-2">Add Non-Catalog Vendor</p>
            <div className="flex gap-2">
              <input
                type="text"
                className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] flex-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
                placeholder="Vendor name"
                value={customVendor.name}
                onChange={(e) => setCustomVendor({ name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustomVendor()}
              />
              <button
                onClick={handleAddCustomVendor}
                disabled={!customVendor.name.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <p className="text-[11px] text-amber-600 mt-1">Non-catalog vendors have NDA required automatically.</p>
          </div>
        </>
      ) : null}

      {/* Selected vendor rows */}
      {selectedEntries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-slate-600">
              Selected Vendors ({selectedEntries.length})
            </p>
            {isSpocOrSourcing && selectedEntries.some(([, v]) => !v.sent) && (
              <button
                onClick={handleSendAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Send All RFQs
              </button>
            )}
          </div>
          <div className="space-y-2">
            {selectedEntries.map(([id, entry]) => (
              <div
                key={id}
                className="rounded-lg border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-[140px]">
                  <p className="text-[13px] font-semibold text-slate-800">{entry.vendor_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.nda_required && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                        NDA Required
                      </span>
                    )}
                    {entry.sent ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3" />
                        Sent {entry.sent_at ? `· ${new Date(entry.sent_at).toLocaleTimeString()}` : ""}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {isSpocOrSourcing && !entry.sent && (
                  <input
                    type="text"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] w-48 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="RFQ doc link"
                    value={entry.rfq_doc}
                    onChange={(e) => handleUpdateRfqDoc(id, e.target.value)}
                  />
                )}
                {isSpocOrSourcing && entry.rfq_doc && !entry.sent && (
                  <span className="text-[12px] text-slate-400 truncate max-w-[120px]">{entry.rfq_doc}</span>
                )}

                {isSpocOrSourcing && !entry.sent && (
                  <button
                    onClick={() => handleSendRFQ(id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send RFQ
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proceed button */}
      {isSpocOrSourcing && (
        <div className="pt-2">
          <button
            onClick={handleProceed}
            disabled={!anySent}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Proceed to Quotation Review →
          </button>
          {!anySent && (
            <p className="text-[11px] text-slate-400 mt-1">Send at least one RFQ to proceed.</p>
          )}
        </div>
      )}

      {!isSpocOrSourcing && selectedEntries.length === 0 && (
        <p className="text-[13px] text-slate-400">Awaiting sourcing to dispatch RFQs.</p>
      )}
    </div>
  )
}
