"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { getNTDRFQ, getNTDQuotation, setNTDQuotation, updateNTDStage } from "@/lib/ntd"
import type { NTDQuotationData, NTDQuotationVendorEntry, NTDNegotiationRound } from "@/types/ntd"

interface Stage4Props {
  ntdId: string
  currentRole: string
  onStageAdvance: () => void
}

const CURRENCIES = ["INR", "USD", "EUR"]

const EMPTY_ENTRY: NTDQuotationVendorEntry = {
  quote_doc: "",
  quoted_amount: 0,
  currency: "INR",
  rounds: [],
  status: "under_review",
}

export default function Stage4({ ntdId, currentRole, onStageAdvance }: Stage4Props) {
  const [quotation, setQuotationState] = useState<NTDQuotationData>({})
  const [vendorIds, setVendorIds] = useState<string[]>([])
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({})
  // Per-vendor round drafts: { [vendorId]: { notes, counter_offer } }
  const [roundDraft, setRoundDraft] = useState<Record<string, { notes: string; counter_offer: string }>>({})

  useEffect(() => {
    const rfqData = getNTDRFQ(ntdId) ?? {}
    const ids = Object.keys(rfqData).filter((id) => rfqData[id].sent)
    setVendorIds(ids)
    const names: Record<string, string> = {}
    for (const id of ids) names[id] = rfqData[id].vendor_name
    setVendorNames(names)

    const q = getNTDQuotation(ntdId) ?? {}
    // Ensure an entry exists for each vendor
    const merged: NTDQuotationData = {}
    for (const id of ids) {
      merged[id] = q[id] ?? { ...EMPTY_ENTRY }
    }
    setQuotationState(merged)
  }, [ntdId])

  function save(next: NTDQuotationData) {
    setQuotationState(next)
    setNTDQuotation(ntdId, next)
  }

  function updateField<K extends keyof NTDQuotationVendorEntry>(
    vendorId: string,
    field: K,
    value: NTDQuotationVendorEntry[K]
  ) {
    const next = {
      ...quotation,
      [vendorId]: { ...quotation[vendorId], [field]: value },
    }
    save(next)
  }

  function handleAddRound(vendorId: string) {
    const draft = roundDraft[vendorId] ?? { notes: "", counter_offer: "" }
    const entry = quotation[vendorId]
    const newRound: NTDNegotiationRound = {
      round_no: (entry?.rounds?.length ?? 0) + 1,
      notes: draft.notes,
      counter_offer: parseFloat(draft.counter_offer) || 0,
      date: new Date().toISOString(),
    }
    const next = {
      ...quotation,
      [vendorId]: {
        ...entry,
        rounds: [...(entry?.rounds ?? []), newRound],
        status: "negotiating" as const,
      },
    }
    save(next)
    setRoundDraft((prev) => ({ ...prev, [vendorId]: { notes: "", counter_offer: "" } }))
  }

  function handleProceed() {
    updateNTDStage(ntdId, 5)
    onStageAdvance()
  }

  const anyFinalized = Object.values(quotation).some((v) => v.status === "finalized")

  if (vendorIds.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <p className="text-[13px] text-slate-400">No vendors have received RFQs yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
      {/* Stage header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <span className="text-[12px] font-bold text-blue-700">4</span>
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-slate-800">Quotation Review &amp; Negotiations</h2>
          <p className="text-[12px] text-slate-500">
            Review vendor quotations and conduct multi-round price negotiations.
          </p>
        </div>
      </div>

      {/* Per-vendor cards */}
      <div className="space-y-4">
        {vendorIds.map((id) => {
          const entry = quotation[id] ?? EMPTY_ENTRY
          const draft = roundDraft[id] ?? { notes: "", counter_offer: "" }
          const statusColor =
            entry.status === "finalized"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : entry.status === "negotiating"
              ? "bg-blue-50 text-blue-700 border-blue-100"
              : "bg-amber-50 text-amber-600 border-amber-100"

          return (
            <div key={id} className="rounded-lg border border-slate-200 p-4 space-y-3">
              {/* Vendor header */}
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-[13px] font-bold text-slate-800 flex-1">{vendorNames[id] ?? id}</p>
                <select
                  value={entry.status}
                  onChange={(e) =>
                    updateField(id, "status", e.target.value as NTDQuotationVendorEntry["status"])
                  }
                  className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${statusColor}`}
                >
                  <option value="under_review">Under Review</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="finalized">Finalized</option>
                </select>
              </div>

              {/* Quote fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quote Amount</label>
                  <input
                    type="number"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="0"
                    value={entry.quoted_amount || ""}
                    onChange={(e) => updateField(id, "quoted_amount", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Currency</label>
                  <select
                    value={entry.currency}
                    onChange={(e) => updateField(id, "currency", e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quote Doc Link</label>
                  <input
                    type="text"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="https://..."
                    value={entry.quote_doc}
                    onChange={(e) => updateField(id, "quote_doc", e.target.value)}
                  />
                </div>
              </div>

              {/* Negotiation rounds */}
              {entry.rounds && entry.rounds.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Negotiation Rounds</p>
                  <div className="space-y-1.5">
                    {entry.rounds.map((r) => (
                      <div
                        key={r.round_no}
                        className="flex items-start gap-3 text-[12px] bg-slate-50 rounded-lg px-3 py-2"
                      >
                        <span className="font-semibold text-slate-500 shrink-0">R{r.round_no}</span>
                        <span className="flex-1 text-slate-700">{r.notes || "—"}</span>
                        <span className="font-mono font-semibold text-slate-700 shrink-0">
                          {entry.currency} {r.counter_offer.toLocaleString()}
                        </span>
                        <span className="text-slate-400 shrink-0">
                          {new Date(r.date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add round */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500">Add Negotiation Round</p>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] flex-1 min-w-[140px] focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Round notes"
                    value={draft.notes}
                    onChange={(e) =>
                      setRoundDraft((prev) => ({
                        ...prev,
                        [id]: { ...prev[id] ?? { notes: "", counter_offer: "" }, notes: e.target.value },
                      }))
                    }
                  />
                  <input
                    type="number"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] w-32 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Counter offer"
                    value={draft.counter_offer}
                    onChange={(e) =>
                      setRoundDraft((prev) => ({
                        ...prev,
                        [id]: { ...prev[id] ?? { notes: "", counter_offer: "" }, counter_offer: e.target.value },
                      }))
                    }
                  />
                  <button
                    onClick={() => handleAddRound(id)}
                    disabled={!draft.notes.trim() && !draft.counter_offer}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Round
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Proceed button */}
      <div className="pt-2">
        <button
          onClick={handleProceed}
          disabled={!anyFinalized}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Proceed to Supplier Finalization →
        </button>
        {!anyFinalized && (
          <p className="text-[11px] text-slate-400 mt-1">
            Mark at least one vendor as &quot;Finalized&quot; to proceed.
          </p>
        )}
      </div>
    </div>
  )
}
