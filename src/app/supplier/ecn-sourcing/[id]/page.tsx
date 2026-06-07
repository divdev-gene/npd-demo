"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  ECN_SOURCING_DISPATCH_KEY,
  ECN_PRICE_ESTIMATION_KEY,
  ECN_NEGOTIATION_KEY,
  ECN_PP_NEGOTIATION_KEY,
} from "@/lib/mockData"
import {
  CheckCircle, CheckCircle2, UploadCloud, Truck, Mail, Tag,
} from "lucide-react"

type SubmissionRecord = {
  dispatchDate: string
  docs: string[]
  submittedAt: number
}

type NegotiationRound = {
  round: number
  targetPrice: string
  currency: "INR" | "USD" | "EUR"
  sentAt: number
  sentBy: string
  supplierResponse?: {
    price: string
    currency: "INR" | "USD" | "EUR"
    docs: string[]
    submittedAt: number
  }
}

type NegotiationRecord = {
  rounds: NegotiationRound[]
  approvedAt?: number
  approvedBy?: string
  finalPrice?: string
  finalCurrency?: "INR" | "USD" | "EUR"
}

const DEMO_FILES = [
  "dispatch_challan.pdf",
  "shipping_confirmation.pdf",
  "test_report.pdf",
  "quality_certificate.pdf",
  "invoice.pdf",
  "price_quote.pdf",
]

const currSymbol = (c: string) => c === "INR" ? "₹" : c === "USD" ? "$" : "€"

export default function EcnSourcingPage() {
  const params  = useParams()
  const npdId   = params.id as string

  // Dispatch state
  const [submitted,    setSubmitted]    = useState(false)
  const [dispatchDate, setDispatchDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  })
  const [docNames,     setDocNames]     = useState<string[]>([])
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [currency,     setCurrency]     = useState<"INR" | "USD" | "EUR">("INR")

  // Negotiation state (Stage 2)
  const [negRecord,    setNegRecord]    = useState<NegotiationRecord | null>(null)
  const [negPrice,     setNegPrice]     = useState("")
  const [negCurrency,  setNegCurrency]  = useState<"INR" | "USD" | "EUR">("INR")
  const [negDocs,      setNegDocs]      = useState<string[]>([])
  const [negSubmitted, setNegSubmitted] = useState(false)

  // PP Negotiation state (Stage 7)
  const [ppNegRecord,    setPpNegRecord]    = useState<NegotiationRecord | null>(null)
  const [ppNegPrice,     setPpNegPrice]     = useState("")
  const [ppNegCurrency,  setPpNegCurrency]  = useState<"INR" | "USD" | "EUR">("INR")
  const [ppNegDocs,      setPpNegDocs]      = useState<string[]>([])
  const [ppNegSubmitted, setPpNegSubmitted] = useState(false)

  useEffect(() => {
    // Dispatch
    const rawD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
    const allD: Record<string, { submission: SubmissionRecord }> = rawD ? JSON.parse(rawD) : {}
    if (allD[npdId]?.submission) setSubmitted(true)

    // Stage 2 negotiation
    const rawN = localStorage.getItem(ECN_NEGOTIATION_KEY)
    if (rawN) {
      const allN: Record<string, NegotiationRecord> = JSON.parse(rawN)
      if (allN[npdId]) {
        setNegRecord(allN[npdId])
        const latest = allN[npdId].rounds[allN[npdId].rounds.length - 1]
        if (latest?.supplierResponse) setNegSubmitted(true)
      }
    }

    // PP negotiation
    const rawPP = localStorage.getItem(ECN_PP_NEGOTIATION_KEY)
    if (rawPP) {
      const allPP: Record<string, NegotiationRecord> = JSON.parse(rawPP)
      if (allPP[npdId]) {
        setPpNegRecord(allPP[npdId])
        const latest = allPP[npdId].rounds[allPP[npdId].rounds.length - 1]
        if (latest?.supplierResponse) setPpNegSubmitted(true)
      }
    }
  }, [npdId])

  const addFile = (setter: React.Dispatch<React.SetStateAction<string[]>>, current: string[]) => {
    const next = DEMO_FILES[current.length % DEMO_FILES.length]
    const name = current.includes(next) ? `${next.replace(".pdf", "")}_${current.length + 1}.pdf` : next
    setter(prev => [...prev, name])
  }

  const removeFile = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) =>
    setter(prev => prev.filter((_, i) => i !== index))

  // Submit Stage 2 negotiation response
  const handleNegSubmit = () => {
    if (!negRecord) return
    const rounds = [...negRecord.rounds]
    rounds[rounds.length - 1] = {
      ...rounds[rounds.length - 1],
      supplierResponse: {
        price: negPrice,
        currency: negCurrency,
        docs: negDocs,
        submittedAt: Date.now(),
      },
    }
    const updated: NegotiationRecord = { ...negRecord, rounds }
    const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
    all[npdId] = updated
    localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
    setNegRecord(updated)
    setNegSubmitted(true)
  }

  // Submit PP negotiation response
  const handlePpNegSubmit = () => {
    if (!ppNegRecord) return
    const rounds = [...ppNegRecord.rounds]
    rounds[rounds.length - 1] = {
      ...rounds[rounds.length - 1],
      supplierResponse: {
        price: ppNegPrice,
        currency: ppNegCurrency,
        docs: ppNegDocs,
        submittedAt: Date.now(),
      },
    }
    const updated: NegotiationRecord = { ...ppNegRecord, rounds }
    const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_PP_NEGOTIATION_KEY) ?? "{}")
    all[npdId] = updated
    localStorage.setItem(ECN_PP_NEGOTIATION_KEY, JSON.stringify(all))
    setPpNegRecord(updated)
    setPpNegSubmitted(true)
  }

  // Submit dispatch
  const handleDispatchSubmit = () => {
    const submission: SubmissionRecord = { dispatchDate, docs: docNames, submittedAt: Date.now() }
    const rawD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
    const allD: Record<string, { submission: SubmissionRecord }> = rawD ? JSON.parse(rawD) : {}
    allD[npdId] = { submission }
    localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(allD))

    const priceEntry = { pricePerUnit, currency, submittedAt: Date.now() }
    const rawP = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
    const allP: Record<string, typeof priceEntry> = rawP ? JSON.parse(rawP) : {}
    allP[npdId] = priceEntry
    localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(allP))

    setSubmitted(true)
  }

  const canDispatchSubmit = !!dispatchDate && docNames.length > 0 && !!pricePerUnit && parseFloat(pricePerUnit) > 0
  const dateFormatted = dispatchDate
    ? new Date(dispatchDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "Not specified"

  // Pending round helpers
  const negLatest = negRecord?.rounds[negRecord.rounds.length - 1]
  const negPending = negLatest && !negLatest.supplierResponse && !negRecord?.approvedAt
  const ppNegLatest = ppNegRecord?.rounds[ppNegRecord.rounds.length - 1]
  const ppNegPending = ppNegLatest && !ppNegLatest.supplierResponse && !ppNegRecord?.approvedAt

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-3">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/amber-logo.png" alt="Amber" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-sm font-bold text-slate-700">ECN Sourcing Portal</span>
          </div>
          <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
            Supplier Portal
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* NPD summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col gap-2">
            <span className="inline-block text-[10px] font-bold tracking-widest bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full self-start">
              {npdId}
            </span>
            <h1 className="text-2xl font-bold text-slate-900">ECN Supplier Portal</h1>
            <p className="text-sm text-slate-500">
              Submit price quotes and dispatch details for this Engineering Change Notice.
            </p>
          </div>
        </div>

        {/* ── Stage 2: Price Negotiation ── */}
        {negPending && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" /> Price Quote — Round {negLatest.round}
            </h2>

            {negSubmitted ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Quote submitted — awaiting Amber review</p>
                  <p className="text-xs text-emerald-700 mt-0.5">You will be contacted if a counter offer is made.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">Amber&apos;s target price</p>
                  <p className="text-xl font-bold text-blue-900">
                    {currSymbol(negLatest.currency)}{parseFloat(negLatest.targetPrice).toLocaleString("en-IN")} <span className="text-sm font-normal">/ unit</span>
                  </p>
                  <p className="text-[10px] text-blue-500 mt-1">Sent {new Date(negLatest.sentAt).toLocaleString("en-IN")}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Your counter-quote</h3>
                  <div className="flex gap-3">
                    <div className="w-28 shrink-0">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                      <select value={negCurrency} onChange={e => setNegCurrency(e.target.value as "INR" | "USD" | "EUR")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="INR">INR ₹</option>
                        <option value="USD">USD $</option>
                        <option value="EUR">EUR €</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Your price / unit <span className="text-red-500">*</span></label>
                      <input type="number" min="0" step="0.01" placeholder="e.g. 118.00" value={negPrice} onChange={e => setNegPrice(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* Optional docs */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Supporting documents <span className="text-slate-400">(optional)</span></label>
                    <div onClick={() => addFile(setNegDocs, negDocs)} className="rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 p-4 text-center cursor-pointer transition-all">
                      <p className="text-xs text-slate-400">Click to attach file</p>
                    </div>
                    {negDocs.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {negDocs.map((name, i) => (
                          <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                            <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span className="text-xs font-medium text-emerald-800 truncate">{name}</span></div>
                            <button onClick={() => removeFile(setNegDocs, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    onClick={handleNegSubmit}
                    disabled={!negPrice || parseFloat(negPrice) <= 0}
                    className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
                  >
                    Submit Quote
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Stage 3: Dispatch ── */}
        {submitted ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Dispatch Confirmed</h2>
              <p className="text-sm text-slate-500 mt-1">Your ECN sourcing dispatch details have been submitted.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Submission Summary</span>
              </div>
              <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
                <p><strong>Reference:</strong> {npdId}</p>
                <p><strong>Dispatch Date:</strong> {dateFormatted}</p>
                <p><strong>Documents:</strong> {docNames.length > 0 ? docNames.join(", ") : "—"}</p>
                {pricePerUnit && <p><strong>Price Estimate:</strong> {currSymbol(currency)}{parseFloat(pricePerUnit).toLocaleString("en-IN")} per unit</p>}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Document upload */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-orange-500" /> Documents <span className="text-red-500">*</span>
              </h2>
              <p className="text-sm text-slate-500">Upload challan, receipt, shipping confirmation, or test reports.</p>
              <div onClick={() => addFile(setDocNames, docNames)} className="block rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/40 p-8 text-center cursor-pointer transition-all">
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-10 h-10 text-slate-300 mb-1" />
                  <p className="text-sm font-semibold text-slate-600">Click to attach file</p>
                  <p className="text-xs text-slate-400">PDF, JPG, PNG, XLSX accepted</p>
                </div>
              </div>
              {docNames.length > 0 && (
                <ul className="space-y-2">
                  {docNames.map((name, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2">
                      <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /><span className="text-sm font-medium text-emerald-800 truncate">{name}</span></div>
                      <button onClick={() => removeFile(setDocNames, idx)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Dispatch date + price + submit */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-500" /> Dispatch Details
              </h2>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Dispatch Date <span className="text-red-500">*</span></label>
                <p className="text-xs text-slate-400 mb-2">Date on which you will dispatch materials / samples.</p>
                <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-400 max-w-xs" />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-500" /> Price Estimation Per Unit <span className="text-red-500">*</span>
                </h3>
                <div className="flex gap-3">
                  <div className="w-28 shrink-0">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value as "INR" | "USD" | "EUR")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="INR">INR ₹</option>
                      <option value="USD">USD $</option>
                      <option value="EUR">EUR €</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Amount per unit</label>
                    <input type="number" min="0" step="0.01" placeholder="e.g. 125.50" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <button onClick={handleDispatchSubmit} disabled={!canDispatchSubmit} className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors flex items-center justify-center gap-2">
                <Truck className="w-5 h-5" /> Confirm Dispatch
              </button>
              {!canDispatchSubmit && (
                <p className="text-xs text-slate-400 text-center">
                  {docNames.length === 0 ? "Attach at least one document to continue." : !pricePerUnit || parseFloat(pricePerUnit) <= 0 ? "Enter a price per unit to continue." : "Fill in all required fields to continue."}
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Stage 7: PP Price Negotiation ── */}
        {ppNegPending && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-500" /> PP Price Quote — Round {ppNegLatest.round}
            </h2>

            {ppNegSubmitted ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">PP quote submitted — awaiting Amber review</p>
                  <p className="text-xs text-emerald-700 mt-0.5">You will be contacted if a counter offer is made.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
                  <p className="text-xs font-semibold text-orange-700 mb-0.5">Amber&apos;s PP target price</p>
                  <p className="text-xl font-bold text-orange-900">
                    {currSymbol(ppNegLatest.currency)}{parseFloat(ppNegLatest.targetPrice).toLocaleString("en-IN")} <span className="text-sm font-normal">/ unit</span>
                  </p>
                  <p className="text-[10px] text-orange-500 mt-1">Sent {new Date(ppNegLatest.sentAt).toLocaleString("en-IN")}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Your PP counter-quote</h3>
                  <div className="flex gap-3">
                    <div className="w-28 shrink-0">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                      <select value={ppNegCurrency} onChange={e => setPpNegCurrency(e.target.value as "INR" | "USD" | "EUR")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                        <option value="INR">INR ₹</option>
                        <option value="USD">USD $</option>
                        <option value="EUR">EUR €</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Your PP price / unit <span className="text-red-500">*</span></label>
                      <input type="number" min="0" step="0.01" placeholder="e.g. 138.00" value={ppNegPrice} onChange={e => setPpNegPrice(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Supporting documents <span className="text-slate-400">(optional)</span></label>
                    <div onClick={() => addFile(setPpNegDocs, ppNegDocs)} className="rounded-lg border-2 border-dashed border-slate-200 hover:border-orange-400 p-4 text-center cursor-pointer transition-all">
                      <p className="text-xs text-slate-400">Click to attach file</p>
                    </div>
                    {ppNegDocs.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {ppNegDocs.map((name, i) => (
                          <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                            <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span className="text-xs font-medium text-emerald-800 truncate">{name}</span></div>
                            <button onClick={() => removeFile(setPpNegDocs, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    onClick={handlePpNegSubmit}
                    disabled={!ppNegPrice || parseFloat(ppNegPrice) <= 0}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
                  >
                    Submit PP Quote
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
