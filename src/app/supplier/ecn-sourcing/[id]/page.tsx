"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  ECN_SOURCING_DISPATCH_KEY,
  ECN_PRICE_ESTIMATION_KEY,
  ECN_NEGOTIATION_KEY,
  ECN_PP_NEGOTIATION_KEY,
  ECN_INITIAL_QUOTE_KEY,
  mockNPDs,
  type NPDRecord,
} from "@/lib/mockData"
import {
  CheckCircle, CheckCircle2, UploadCloud, Truck, Mail, Tag, AlertCircle, Clock, Package,
} from "lucide-react"
import { SupplierPortalShell } from "@/components/SupplierPortalShell"

type SubmissionRecord = {
  dispatchDate: string
  docs: string[]
  submittedAt: number
}

type StatusUpdate = {
  onTrack: "yes" | "no"
  newDate?: string
  notes: string
  updatedAt: number
  dateApproved?: { approvedBy: string; approvedAt: number }
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
  rejectedAt?: number
}

type DispatchEntry = {
  portalSentAt?: number
  sentBy?: string
  submission?: SubmissionRecord
  statusUpdate?: StatusUpdate
  received?: { markedBy: string; markedAt: number; doc?: string }
}

const DEMO_FILES = [
  "dispatch_challan.pdf",
  "shipping_confirmation.pdf",
  "test_report.pdf",
  "quality_certificate.pdf",
  "invoice.pdf",
  "price_quote.pdf",
]

const currSymbol = (c: "INR" | "USD" | "EUR") => c === "INR" ? "₹" : c === "USD" ? "$" : "€"

export default function EcnSourcingPage() {
  const params = useParams()
  const npdId  = params.id as string

  const [npd,          setNpd]          = useState<NPDRecord | null>(null)
  const [npdStage,     setNpdStage]     = useState(2)
  const isAltSupplier = npd?.typeOfWork?.includes("Alternative Supplier") ?? false

  // Dispatch state
  const [submitted,    setSubmitted]    = useState(false)
  const [dispatchDate, setDispatchDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]
  })
  const [docNames,     setDocNames]     = useState<string[]>([])
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [currency,     setCurrency]     = useState<"INR" | "USD" | "EUR">("INR")

  // Status update state
  const [statusUpdate,  setStatusUpdate]  = useState<StatusUpdate | null>(null)
  const [statusOnTrack, setStatusOnTrack] = useState<"yes" | "no">("yes")
  const [statusNewDate, setStatusNewDate] = useState("")
  const [statusNotes,   setStatusNotes]   = useState("")
  const [statusSaved,   setStatusSaved]   = useState(false)

  // Received state
  const [received, setReceived] = useState<{ markedBy: string; markedAt: number; doc?: string } | null>(null)

  // Initial supplier quote (Stage 2 — collected before negotiation begins)
  const [initialQuote,    setInitialQuote]    = useState<{ price: string; currency: "INR" | "USD" | "EUR"; date: string; docs: string[]; submittedAt: number } | null>(null)
  const [initPrice,       setInitPrice]       = useState("")
  const [initCurrency,    setInitCurrency]    = useState<"INR" | "USD" | "EUR">("INR")
  const [initDate,        setInitDate]        = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0] })
  const [initDocs,        setInitDocs]        = useState<string[]>([])

  // Negotiation state (Stage 2)
  const [negRecord,   setNegRecord]   = useState<NegotiationRecord | null>(null)
  const [negPrice,    setNegPrice]    = useState("")
  const [negCurrency, setNegCurrency] = useState<"INR" | "USD" | "EUR">("INR")
  const [negDocs,     setNegDocs]     = useState<string[]>([])

  // PP Negotiation state (Stage 7)
  const [ppNegRecord,   setPpNegRecord]   = useState<NegotiationRecord | null>(null)
  const [ppNegPrice,    setPpNegPrice]    = useState("")
  const [ppNegCurrency, setPpNegCurrency] = useState<"INR" | "USD" | "EUR">("INR")
  const [ppNegDocs,     setPpNegDocs]     = useState<string[]>([])

  useEffect(() => {
    // Load NPD record for stage + item details
    const stored = localStorage.getItem("npd_records_v1")
    const records: NPDRecord[] = stored ? JSON.parse(stored) : mockNPDs
    const found = records.find(n => n.id === npdId) ?? mockNPDs.find(n => n.id === npdId) ?? null
    if (found) { setNpd(found); setNpdStage(found.stage) }

    // Dispatch key
    const rawD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
    const allD: Record<string, DispatchEntry> = rawD ? JSON.parse(rawD) : {}
    const entry = allD[npdId]
    if (entry?.submission) {
      setSubmitted(true)
      setDispatchDate(entry.submission.dispatchDate)
      setDocNames(entry.submission.docs)
    }
    if (entry?.statusUpdate) {
      const su = entry.statusUpdate
      setStatusUpdate(su)
      setStatusOnTrack(su.onTrack)
      setStatusNotes(su.notes)
      if (su.newDate) setStatusNewDate(su.newDate)
    }
    if (entry?.received) setReceived(entry.received)

    // Price
    const rawP = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
    if (rawP) {
      const allP: Record<string, { pricePerUnit: string; currency: "INR" | "USD" | "EUR" }> = JSON.parse(rawP)
      if (allP[npdId]) { setPricePerUnit(allP[npdId].pricePerUnit); setCurrency(allP[npdId].currency) }
    }

    // Initial supplier quote (Stage 2)
    const rawIQ = localStorage.getItem(ECN_INITIAL_QUOTE_KEY)
    if (rawIQ) {
      const allIQ: Record<string, { price: string; currency: "INR" | "USD" | "EUR"; date: string; docs: string[]; submittedAt: number }> = JSON.parse(rawIQ)
      if (allIQ[npdId]) {
        setInitialQuote(allIQ[npdId])
        setInitDate(allIQ[npdId].date)
        setInitDocs(allIQ[npdId].docs)
        setInitPrice(allIQ[npdId].price)
        setInitCurrency(allIQ[npdId].currency)
      }
    }

    // Stage 2 negotiation
    const rawN = localStorage.getItem(ECN_NEGOTIATION_KEY)
    if (rawN) {
      const allN: Record<string, NegotiationRecord> = JSON.parse(rawN)
      if (allN[npdId]) setNegRecord(allN[npdId])
    }

    // PP negotiation
    const rawPP = localStorage.getItem(ECN_PP_NEGOTIATION_KEY)
    if (rawPP) {
      const allPP: Record<string, NegotiationRecord> = JSON.parse(rawPP)
      if (allPP[npdId]) setPpNegRecord(allPP[npdId])
    }
  }, [npdId])

  // Poll for sourcing's date approval when supplier said "no"
  useEffect(() => {
    if (!statusUpdate || statusUpdate.onTrack !== "no" || statusUpdate.dateApproved) return
    const interval = setInterval(() => {
      const raw = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
      if (!raw) return
      const all: Record<string, DispatchEntry> = JSON.parse(raw)
      const su = all[npdId]?.statusUpdate
      if (su?.dateApproved) setStatusUpdate(su)
    }, 3000)
    return () => clearInterval(interval)
  }, [statusUpdate, npdId])

  // Poll for new negotiation rounds from sourcing (AS Stage 3)
  useEffect(() => {
    if (!isAltSupplier || npdStage !== 3 || negRecord?.approvedAt) return
    const interval = setInterval(() => {
      const raw = localStorage.getItem(ECN_NEGOTIATION_KEY)
      if (!raw) return
      const all: Record<string, NegotiationRecord> = JSON.parse(raw)
      if (all[npdId]) setNegRecord(all[npdId])
    }, 3000)
    return () => clearInterval(interval)
  }, [isAltSupplier, npdStage, npdId, negRecord?.approvedAt])

  const addFile = (setter: React.Dispatch<React.SetStateAction<string[]>>, current: string[]) => {
    const next = DEMO_FILES[current.length % DEMO_FILES.length]
    const name = current.includes(next) ? `${next.replace(".pdf", "")}_${current.length + 1}.pdf` : next
    setter(prev => [...prev, name])
  }

  const removeFile = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) =>
    setter(prev => prev.filter((_, i) => i !== index))

  const handleInitialQuoteSubmit = () => {
    const entry = { price: initPrice, currency: initCurrency, date: initDate, docs: initDocs, submittedAt: Date.now() }
    const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_INITIAL_QUOTE_KEY) ?? "{}")
    all[npdId] = entry
    localStorage.setItem(ECN_INITIAL_QUOTE_KEY, JSON.stringify(all))
    setInitialQuote(entry)
  }

  const handleNegSubmit = () => {
    if (!negRecord) return
    const rounds = [...negRecord.rounds]
    rounds[rounds.length - 1] = {
      ...rounds[rounds.length - 1],
      supplierResponse: { price: negPrice, currency: negCurrency, docs: negDocs, submittedAt: Date.now() },
    }
    const updated: NegotiationRecord = { ...negRecord, rounds }
    const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
    all[npdId] = updated
    localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
    setNegRecord(updated)
  }

  const advanceNpdToStage4 = () => {
    const rawNpd = localStorage.getItem("npd_records_v1")
    if (!rawNpd) return
    const records: NPDRecord[] = JSON.parse(rawNpd)
    const idx = records.findIndex(n => n.id === npdId)
    if (idx !== -1) {
      records[idx] = { ...records[idx], stage: 4 }
      localStorage.setItem("npd_records_v1", JSON.stringify(records))
    }
    setNpdStage(4)
  }

  const handleAcceptAmbersPrice = () => {
    if (!negRecord) return
    const latest = negRecord.rounds[negRecord.rounds.length - 1]
    const updated: NegotiationRecord = {
      ...negRecord,
      approvedAt: Date.now(),
      approvedBy: "supplier",
      finalPrice: latest.targetPrice,
      finalCurrency: latest.currency,
    }
    const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
    all[npdId] = updated
    localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
    setNegRecord(updated)
    advanceNpdToStage4()
  }

  const handleRejectOffer = () => {
    if (!negRecord) return
    const updated: NegotiationRecord = { ...negRecord, rejectedAt: Date.now() }
    const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
    all[npdId] = updated
    localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
    setNegRecord(updated)
  }

  const handlePpNegSubmit = () => {
    if (!ppNegRecord) return
    const rounds = [...ppNegRecord.rounds]
    rounds[rounds.length - 1] = {
      ...rounds[rounds.length - 1],
      supplierResponse: { price: ppNegPrice, currency: ppNegCurrency, docs: ppNegDocs, submittedAt: Date.now() },
    }
    const updated: NegotiationRecord = { ...ppNegRecord, rounds }
    const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_PP_NEGOTIATION_KEY) ?? "{}")
    all[npdId] = updated
    localStorage.setItem(ECN_PP_NEGOTIATION_KEY, JSON.stringify(all))
    setPpNegRecord(updated)
  }

  const handleDispatchSubmit = () => {
    const submission: SubmissionRecord = { dispatchDate, docs: docNames, submittedAt: Date.now() }
    const rawD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
    const allD: Record<string, DispatchEntry> = rawD ? JSON.parse(rawD) : {}
    allD[npdId] = { ...allD[npdId], submission }
    localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(allD))

    // For ECN: advance NPD to stage 4. For AS: already at stage 4 (advanced on price approval).
    if (!isAltSupplier) {
      const rawNpd = localStorage.getItem("npd_records_v1")
      if (rawNpd) {
        const records: NPDRecord[] = JSON.parse(rawNpd)
        const idx = records.findIndex(n => n.id === npdId)
        if (idx !== -1) {
          records[idx] = { ...records[idx], stage: 4 }
          localStorage.setItem("npd_records_v1", JSON.stringify(records))
        }
      }
      setNpdStage(4)
    }

    setSubmitted(true)
  }

  const handleStatusSubmit = () => {
    const su: StatusUpdate = {
      onTrack: statusOnTrack,
      ...(statusOnTrack === "no" && statusNewDate ? { newDate: statusNewDate } : {}),
      notes: statusNotes,
      updatedAt: Date.now(),
    }
    const rawD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
    const allD: Record<string, DispatchEntry> = rawD ? JSON.parse(rawD) : {}
    allD[npdId] = { ...allD[npdId], statusUpdate: su }
    localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(allD))
    setStatusUpdate(su)
    setStatusSaved(true)
    setTimeout(() => setStatusSaved(false), 3000)
  }

  const canDispatchSubmit = !!dispatchDate && docNames.length > 0
  const dateFormatted = dispatchDate
    ? new Date(dispatchDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "Not specified"

  const negLatest     = negRecord?.rounds[negRecord.rounds.length - 1]
  const negPending    = negLatest && !negLatest.supplierResponse && !negRecord?.approvedAt
  const negResponded  = !!negLatest?.supplierResponse && !negRecord?.approvedAt
  const ppNegLatest   = ppNegRecord?.rounds[ppNegRecord.rounds.length - 1]
  const ppNegPending  = ppNegLatest && !ppNegLatest.supplierResponse && !ppNegRecord?.approvedAt
  const ppNegResponded = !!ppNegLatest?.supplierResponse && !ppNegRecord?.approvedAt

  const supplierName = npd?.supplier ?? "Supplier"
  const itemName     = npd?.itemName ?? npdId

  return (
    <SupplierPortalShell portalLabel="ECN / Sourcing">

        {/* NPD summary card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <span className="inline-block text-[10px] font-bold tracking-widest bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full mb-3">
                {npdId}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{itemName}</h1>
              {npd && <p className="text-sm text-slate-500">{npd.itemCategory} · {npd.productLine}</p>}
              {supplierName && (
                <p className="text-sm font-semibold text-orange-900 mt-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5 inline-block">
                  Dispatching as: {supplierName}
                </p>
              )}
            </div>
            {npd?.spoc && (
              <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 self-start">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sourcing SPOC</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{npd.spoc}</p>
                <p className="text-xs text-slate-400">{npd.productLine}</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            STAGE 2: Price Negotiation (ECN only — hidden for Alt Supplier)
        ═══════════════════════════════════════════════════════════════════ */}
        {npdStage === 2 && !isAltSupplier && (
          <>
            {/* Step 1: Supplier submits their initial price (no target from Amber yet) */}
            {!initialQuote && (
              <>
                {/* Documents */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-orange-500" /> Supporting Documents <span className="text-slate-400 text-xs font-normal">(optional)</span>
                  </h2>
                  <p className="text-sm text-slate-500">Upload your price quotation sheet, specifications, or any supporting documents.</p>
                  <div onClick={() => addFile(setInitDocs, initDocs)} className="block rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/40 p-8 text-center cursor-pointer transition-all">
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud className="w-10 h-10 text-slate-300 mb-1" />
                      <p className="text-sm font-semibold text-slate-600">Click to attach file</p>
                      <p className="text-xs text-slate-400">PDF, JPG, PNG, XLSX accepted</p>
                    </div>
                  </div>
                  {initDocs.length > 0 && (
                    <ul className="space-y-2">
                      {initDocs.map((name, i) => (
                        <li key={name} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2">
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /><span className="text-sm font-medium text-emerald-800 truncate">{name}</span></div>
                          <button onClick={() => removeFile(setInitDocs, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Date + Price */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" /> Quote Details
                  </h2>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Quote Valid Until <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-400 mb-2">Date until which this price is valid.</p>
                    <input type="date" value={initDate} onChange={e => setInitDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-400 max-w-xs" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">Price Per Unit <span className="text-red-500">*</span></label>
                    <div className="flex gap-3">
                      <div className="w-28 shrink-0">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                        <select value={initCurrency} onChange={e => setInitCurrency(e.target.value as "INR" | "USD" | "EUR")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="INR">INR ₹</option>
                          <option value="USD">USD $</option>
                          <option value="EUR">EUR €</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Amount per unit</label>
                        <input type="number" min="0" step="0.01" placeholder="e.g. 125.00" value={initPrice} onChange={e => setInitPrice(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleInitialQuoteSubmit}
                    disabled={!initPrice || parseFloat(initPrice) <= 0 || !initDate}
                    className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
                  >
                    Submit Quote
                  </button>
                  {(!initPrice || parseFloat(initPrice) <= 0) && (
                    <p className="text-xs text-slate-400 text-center">Enter a price per unit to continue.</p>
                  )}
                </div>
              </>
            )}

            {/* Initial quote submitted — awaiting Amber target / negotiation response */}
            {initialQuote && !negRecord && (
              <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" /> Your Price Quote
                </h2>
                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Submission Summary</span>
                  </div>
                  <div className="p-4 space-y-2 text-[13px] text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Price per unit</span>
                      <span className="font-bold text-slate-900">{currSymbol(initialQuote.currency)}{parseFloat(initialQuote.price).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valid until</span>
                      <span className="font-semibold text-slate-800">{new Date(initialQuote.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                    {initialQuote.docs.length > 0 && (
                      <div>
                        <p className="text-slate-500 mb-1">Documents</p>
                        <div className="flex flex-wrap gap-1.5">
                          {initialQuote.docs.map(d => (
                            <span key={d} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5 rounded-md">
                              <CheckCircle className="w-3 h-3 text-emerald-500" />{d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400">Submitted {new Date(initialQuote.submittedAt).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Quote received — awaiting Amber&apos;s response</p>
                    <p className="text-xs text-amber-700 mt-0.5">Amber will review your price and may share a target for negotiation.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Negotiation round — Amber has sent a target, supplier responds */}
            {negPending && (
              <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" /> Price Negotiation — Round {negLatest.round}
                </h2>

                {initialQuote && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Your initial quote</span>
                    <span className="text-sm font-bold text-slate-800">{currSymbol(initialQuote.currency)}{parseFloat(initialQuote.price).toLocaleString("en-IN")} / unit</span>
                  </div>
                )}

                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">Amber&apos;s target price</p>
                  <p className="text-xl font-bold text-blue-900">
                    {currSymbol(negLatest.currency)}{parseFloat(negLatest.targetPrice).toLocaleString("en-IN")} <span className="text-sm font-normal">/ unit</span>
                  </p>
                  <p className="text-[10px] text-blue-500 mt-1">Sent {new Date(negLatest.sentAt).toLocaleString("en-IN")}</p>
                </div>

                <div className="space-y-3">
                  {/* Accept Target Price */}
                  <button
                    onClick={() => {
                      const raw = localStorage.getItem(ECN_NEGOTIATION_KEY)
                      const all: Record<string, NegotiationRecord> = raw ? JSON.parse(raw) : {}
                      const updated: NegotiationRecord = {
                        ...negRecord!,
                        rounds: negRecord!.rounds.map((r, idx) =>
                          idx === negRecord!.rounds.length - 1
                            ? { ...r, supplierResponse: { price: negLatest.targetPrice, currency: negLatest.currency, docs: [], submittedAt: Date.now() } }
                            : r
                        ),
                        approvedAt: Date.now(),
                        approvedBy: "supplier",
                        finalPrice: negLatest.targetPrice,
                        finalCurrency: negLatest.currency,
                      }
                      all[npdId] = updated
                      localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
                      setNegRecord(updated)
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-6 py-3 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Accept Target Price — {currSymbol(negLatest.currency)}{parseFloat(negLatest.targetPrice).toLocaleString("en-IN")} / unit
                  </button>

                  {/* Or Submit Counter-Quote */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">or propose a counter</span></div>
                  </div>
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
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Supporting documents <span className="text-slate-400">(optional)</span></label>
                    <div onClick={() => addFile(setNegDocs, negDocs)} className="rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 p-4 text-center cursor-pointer transition-all">
                      <p className="text-xs text-slate-400">Click to attach file</p>
                    </div>
                    {negDocs.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {negDocs.map((name, i) => (
                          <li key={name} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                            <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span className="text-xs font-medium text-emerald-800 truncate">{name}</span></div>
                            <button onClick={() => removeFile(setNegDocs, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button onClick={handleNegSubmit} disabled={!negPrice || parseFloat(negPrice) <= 0} className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors">
                    Submit Counter-Quote
                  </button>
                </div>
              </div>
            )}

            {/* Responded to a round — awaiting Amber review */}
            {negResponded && (
              <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-3">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" /> Price Negotiation — Round {negLatest!.round}
                </h2>
                {initialQuote && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Your initial quote</span>
                    <span className="text-sm font-bold text-slate-800">{currSymbol(initialQuote.currency)}{parseFloat(initialQuote.price).toLocaleString("en-IN")} / unit</span>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Counter-quote submitted — awaiting Amber review</p>
                    <p className="text-xs text-emerald-700 mt-0.5">You will be contacted if a further counter is made.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Price agreed */}
            {negRecord?.approvedAt && (
              <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-6">
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Price agreed — {currSymbol(negRecord.finalCurrency!)}{parseFloat(negRecord.finalPrice!).toLocaleString("en-IN")} / unit</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Amber will proceed to the next stage.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STAGE 3: AS — Price Negotiation then Dispatch
                     ECN — Direct Dispatch
        ═══════════════════════════════════════════════════════════════════ */}
        {npdStage === 3 && isAltSupplier && (
          <>
            {/* State 1: Supplier submits their initial price */}
            {!initialQuote && (
              <>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-orange-500" /> Supporting Documents <span className="text-slate-400 text-xs font-normal">(optional)</span>
                  </h2>
                  <p className="text-sm text-slate-500">Upload your price quotation sheet or any supporting documents.</p>
                  <div onClick={() => addFile(setInitDocs, initDocs)} className="block rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/40 p-8 text-center cursor-pointer transition-all">
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud className="w-10 h-10 text-slate-300 mb-1" />
                      <p className="text-sm font-semibold text-slate-600">Click to attach file</p>
                      <p className="text-xs text-slate-400">PDF, JPG, PNG, XLSX accepted</p>
                    </div>
                  </div>
                  {initDocs.length > 0 && (
                    <ul className="space-y-2">
                      {initDocs.map((name, i) => (
                        <li key={name} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2">
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /><span className="text-sm font-medium text-emerald-800 truncate">{name}</span></div>
                          <button onClick={() => removeFile(setInitDocs, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" /> Your Price Quote
                  </h2>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Quote Valid Until <span className="text-red-500">*</span></label>
                    <input type="date" value={initDate} onChange={e => setInitDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-400 max-w-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">Price Per Unit <span className="text-red-500">*</span></label>
                    <div className="flex gap-3">
                      <div className="w-28 shrink-0">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                        <select value={initCurrency} onChange={e => setInitCurrency(e.target.value as "INR" | "USD" | "EUR")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="INR">INR ₹</option>
                          <option value="USD">USD $</option>
                          <option value="EUR">EUR €</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Amount per unit</label>
                        <input type="number" min="0" step="0.01" placeholder="e.g. 125.00" value={initPrice} onChange={e => setInitPrice(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleInitialQuoteSubmit}
                    disabled={!initPrice || parseFloat(initPrice) <= 0 || !initDate}
                    className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
                  >
                    Submit Price Quote
                  </button>
                </div>
              </>
            )}

            {/* State 1b: Quote submitted, awaiting Amber counter */}
            {initialQuote && !negRecord && (
              <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" /> Your Price Quote
                </h2>
                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Submission Summary</span>
                  </div>
                  <div className="p-4 space-y-2 text-[13px] text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Price per unit</span>
                      <span className="font-bold text-slate-900">{currSymbol(initialQuote.currency)}{parseFloat(initialQuote.price).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valid until</span>
                      <span className="font-semibold">{new Date(initialQuote.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Submitted {new Date(initialQuote.submittedAt).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Quote received — awaiting Amber&apos;s counter</p>
                    <p className="text-xs text-amber-700 mt-0.5">Amber will review your price and may send a target for negotiation.</p>
                  </div>
                </div>
              </div>
            )}

            {/* State 2: Sourcing sent target — supplier accepts, rejects, or counters */}
            {negPending && !negRecord?.rejectedAt && (
              <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" /> Price Negotiation — Round {negLatest!.round}
                </h2>
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">Amber&apos;s target price</p>
                  <p className="text-xl font-bold text-blue-900">
                    {currSymbol(negLatest!.currency)}{parseFloat(negLatest!.targetPrice).toLocaleString("en-IN")} <span className="text-sm font-normal">/ unit</span>
                  </p>
                  <p className="text-[10px] text-blue-500 mt-1">Sent {new Date(negLatest!.sentAt).toLocaleString("en-IN")}</p>
                </div>

                {/* Accept / Reject */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAcceptAmbersPrice}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-4 py-2.5 text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Accept This Price
                  </button>
                  <button
                    onClick={handleRejectOffer}
                    className="px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>

                {/* Counter form */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-600">Or send a counter-quote</h3>
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
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Your price / unit</label>
                      <input type="number" min="0" step="0.01" placeholder="e.g. 118.00" value={negPrice} onChange={e => setNegPrice(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Supporting documents <span className="text-slate-400">(optional)</span></label>
                    <div onClick={() => addFile(setNegDocs, negDocs)} className="rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 p-4 text-center cursor-pointer transition-all">
                      <p className="text-xs text-slate-400">Click to attach file</p>
                    </div>
                    {negDocs.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {negDocs.map((name, i) => (
                          <li key={name} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                            <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span className="text-xs font-medium text-emerald-800 truncate">{name}</span></div>
                            <button onClick={() => removeFile(setNegDocs, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button onClick={handleNegSubmit} disabled={!negPrice || parseFloat(negPrice) <= 0} className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors">
                    Submit Counter-Quote
                  </button>
                </div>
              </div>
            )}

            {/* Rejected state */}
            {negRecord?.rejectedAt && !negRecord.approvedAt && (
              <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">You have declined Amber&apos;s offer</p>
                    <p className="text-xs text-red-700 mt-0.5">Amber has been notified. They may send a revised offer.</p>
                  </div>
                </div>
              </div>
            )}

            {/* State 3: Responded — awaiting Amber review */}
            {negResponded && (
              <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-3">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" /> Price Negotiation — Round {negLatest!.round}
                </h2>
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Amber&apos;s target</span>
                  <span className="text-sm font-bold text-slate-800">{currSymbol(negLatest!.currency)}{parseFloat(negLatest!.targetPrice).toLocaleString("en-IN")} / unit</span>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Your counter</span>
                  <span className="text-sm font-bold text-slate-800">{currSymbol(negLatest!.supplierResponse!.currency)}{parseFloat(negLatest!.supplierResponse!.price).toLocaleString("en-IN")} / unit</span>
                </div>
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Counter-quote submitted — awaiting Amber review</p>
                    <p className="text-xs text-amber-700 mt-0.5">Amber will review and accept or send a new target.</p>
                  </div>
                </div>
              </div>
            )}

            {/* State 4: Price agreed — portal will advance to stage 4 for dispatch */}
            {negRecord?.approvedAt && (
              <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-6">
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      Price agreed — {currSymbol(negRecord.finalCurrency!)}{parseFloat(negRecord.finalPrice!).toLocaleString("en-IN")} / unit
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">Proceeding to dispatch stage…</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {npdStage === 3 && !isAltSupplier && (
          <>
            {!submitted ? (
              /* ── Step 1: Dispatch form ── */
              <>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-orange-500" /> Dispatch Documents <span className="text-red-500">*</span>
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
                      {docNames.map((name, i) => (
                        <li key={name} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2">
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /><span className="text-sm font-medium text-emerald-800 truncate">{name}</span></div>
                          <button onClick={() => removeFile(setDocNames, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-500" /> Dispatch Details
                  </h2>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Expected Arrival Date at Amber (ETA) <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-400 mb-2">When do you expect the samples to arrive at the Amber R&amp;D facility?</p>
                    <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-400 max-w-xs" />
                  </div>

                  <button onClick={handleDispatchSubmit} disabled={!canDispatchSubmit} className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors flex items-center justify-center gap-2">
                    <Truck className="w-5 h-5" /> Confirm Dispatch
                  </button>
                  {!canDispatchSubmit && (
                    <p className="text-xs text-slate-400 text-center">
                      {docNames.length === 0 ? "Attach at least one document to continue." : "Fill in all required fields to continue."}
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* ── Step 2: Dispatch confirmed ── */
              <div className="space-y-4">
                {/* Confirmation banner */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <Truck className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Dispatch Confirmed</h2>
                    <p className="text-sm text-slate-500 mt-1">Your dispatch details have been submitted. The Amber team has been notified.</p>
                  </div>

                  {/* Email to Sourcing */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email 1 — Sourcing SPOC</span>
                    </div>
                    <div className="p-4 space-y-2 text-[13px] text-slate-700 leading-relaxed">
                      <p><strong>To:</strong> {npd?.spoc ?? "Sourcing SPOC"}</p>
                      <p><strong>Subject:</strong> Dispatch Confirmed — {itemName} ({npdId})</p>
                      <hr className="border-slate-200" />
                      <p>Dear {npd?.spoc ?? "Team"},</p>
                      <p><strong>{supplierName}</strong> has confirmed dispatch of samples for <em>{itemName}</em> ({npdId}).</p>
                      <p><strong>NPD ID:</strong> {npdId}</p>
                      <p><strong>Item:</strong> {itemName}</p>
                      <p><strong>Expected Arrival (ETA):</strong> {dateFormatted}</p>
                      {docNames.length > 0 && <p><strong>Dispatch Documents:</strong> {docNames.join(", ")}</p>}
                      {pricePerUnit && <p><strong>Price Estimate:</strong> {currSymbol(currency)}{parseFloat(pricePerUnit).toLocaleString("en-IN")} per unit</p>}
                      <p>Kindly coordinate receipt and initiate R&amp;D evaluation upon arrival.</p>
                      <p className="pt-1">Regards,<br /><strong>{supplierName}</strong></p>
                    </div>
                  </div>

                  {/* Email to R&D */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email 2 — R&amp;D Team</span>
                    </div>
                    <div className="p-4 space-y-2 text-[13px] text-slate-700 leading-relaxed">
                      <p><strong>To:</strong> R&amp;D Team, Amber Enterprises</p>
                      <p><strong>Subject:</strong> Samples Dispatched — {itemName} ({npdId})</p>
                      <hr className="border-slate-200" />
                      <p>Dear R&amp;D Team,</p>
                      <p><strong>{supplierName}</strong> has dispatched samples for <em>{itemName}</em> ({npdId}) and they are expected to arrive by <strong>{dateFormatted}</strong>.</p>
                      <p><strong>NPD ID:</strong> {npdId}</p>
                      <p><strong>Item:</strong> {itemName}</p>
                      <p><strong>Supplier:</strong> {supplierName}</p>
                      <p><strong>Expected Arrival (ETA):</strong> {dateFormatted}</p>
                      {docNames.length > 0 && <p><strong>Dispatch Documents:</strong> {docNames.join(", ")}</p>}
                      <p>Please prepare for sample receipt and initiate evaluation on arrival.</p>
                      <p className="pt-1">Regards,<br /><strong>{supplierName}</strong></p>
                    </div>
                  </div>
                </div>

                {/* On-track status form */}
                {!statusUpdate ? (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" /> Dispatch Status Update
                    </h2>
                    <p className="text-sm text-slate-500">Let Amber know whether your dispatch is on schedule.</p>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-2">Are you on track with the dispatch?</label>
                      <div className="flex gap-3">
                        {(["yes", "no"] as const).map((val) => (
                          <label key={val} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                            statusOnTrack === val
                              ? val === "yes" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-red-400 bg-red-50 text-red-800"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}>
                            <input type="radio" name="onTrack" value={val} checked={statusOnTrack === val} onChange={() => setStatusOnTrack(val)} className="sr-only" />
                            {val === "yes" ? "Yes, on track" : "No"}
                          </label>
                        ))}
                      </div>
                    </div>
                    {statusOnTrack === "no" && (
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">New expected dispatch date <span className="text-red-500">*</span></label>
                        <p className="text-xs text-slate-400 mb-2">When do you now expect to dispatch?</p>
                        <input type="date" value={statusNewDate} onChange={e => setStatusNewDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-red-400 focus:border-red-400 max-w-xs" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Notes <span className="text-slate-400">(optional)</span></label>
                      <textarea value={statusNotes} onChange={e => setStatusNotes(e.target.value)} placeholder="e.g. Slight delay due to quality check — dispatching by Friday." rows={2} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                    <button
                      onClick={handleStatusSubmit}
                      disabled={statusOnTrack === "no" && !statusNewDate}
                      className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-2.5 transition-colors text-sm"
                    >
                      {statusSaved ? "Status saved!" : "Submit Status"}
                    </button>
                  </div>
                ) : (
                  /* After status submitted */
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className={`rounded-lg border px-4 py-3 flex items-start gap-2 text-sm font-medium ${
                      statusUpdate.onTrack === "yes" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      {statusUpdate.onTrack === "yes" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p><strong>{statusUpdate.onTrack === "yes" ? "On track" : "Not on track"}</strong>{statusUpdate.notes ? ` — ${statusUpdate.notes}` : ""}</p>
                        {statusUpdate.onTrack === "no" && statusUpdate.newDate && (
                          <p className="text-xs mt-1 opacity-80">
                            New expected date: <strong>{new Date(statusUpdate.newDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>
                            {statusUpdate.dateApproved
                              ? <span className="ml-2 text-emerald-700 font-semibold">✓ Approved by Amber</span>
                              : <span className="ml-2 opacity-60">— awaiting Amber approval</span>}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] opacity-60 shrink-0">{new Date(statusUpdate.updatedAt).toLocaleString("en-IN")}</span>
                    </div>

                    {received ? (
                      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
                        <Package className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-emerald-800">Samples received by R&amp;D</p>
                          <p className="text-xs text-emerald-600 mt-0.5">R&amp;D has confirmed receipt and will begin evaluation shortly.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
                        <Clock className="w-6 h-6 text-blue-500 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-blue-800">Awaiting R&amp;D Receipt</p>
                          <p className="text-xs text-blue-600 mt-0.5">R&amp;D will confirm receipt of your samples and begin evaluation.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STAGE 4: AS — Supplier Sample Dispatch (after price agreement)
        ═══════════════════════════════════════════════════════════════════ */}
        {npdStage === 4 && isAltSupplier && (
          <>
            {negRecord?.finalPrice && (
              <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-4">
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800">
                    Price agreed — {currSymbol(negRecord.finalCurrency!)}{parseFloat(negRecord.finalPrice).toLocaleString("en-IN")} / unit. Please dispatch samples.
                  </p>
                </div>
              </div>
            )}

            {!submitted ? (
              <>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-orange-500" /> Dispatch Documents <span className="text-red-500">*</span>
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
                      {docNames.map((name, i) => (
                        <li key={name} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2">
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /><span className="text-sm font-medium text-emerald-800 truncate">{name}</span></div>
                          <button onClick={() => removeFile(setDocNames, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-500" /> Dispatch Details
                  </h2>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Expected Arrival Date at Amber (ETA) <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-400 mb-2">When do you expect the samples to arrive at the Amber R&amp;D facility?</p>
                    <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-400 max-w-xs" />
                  </div>
                  <button onClick={handleDispatchSubmit} disabled={!canDispatchSubmit} className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors flex items-center justify-center gap-2">
                    <Truck className="w-5 h-5" /> Confirm Dispatch
                  </button>
                  {!canDispatchSubmit && (
                    <p className="text-xs text-slate-400 text-center">
                      {docNames.length === 0 ? "Attach at least one document to continue." : "Fill in all required fields to continue."}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <Truck className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Dispatch Confirmed</h2>
                <p className="text-sm text-slate-500">Your dispatch details have been submitted. The Amber team has been notified.</p>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STAGE 4+: Samples received by R&D (non-AS, or AS after dispatch)
        ═══════════════════════════════════════════════════════════════════ */}
        {npdStage >= 4 && npdStage <= 6 && (!isAltSupplier || submitted) && (
          <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Samples received by R&amp;D</p>
                <p className="text-xs text-emerald-600 mt-0.5">R&amp;D has confirmed receipt and is conducting evaluation. You will be notified of results.</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STAGE 7: PP Price Negotiation (ECN only)
        ═══════════════════════════════════════════════════════════════════ */}
        {ppNegPending && !isAltSupplier && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-500" /> PP Price Quote — Round {ppNegLatest.round}
            </h2>
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
                      <li key={name} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                        <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span className="text-xs font-medium text-emerald-800 truncate">{name}</span></div>
                        <button onClick={() => removeFile(setPpNegDocs, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={handlePpNegSubmit} disabled={!ppNegPrice || parseFloat(ppNegPrice) <= 0} className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors">
                Submit PP Quote
              </button>
            </div>
          </div>
        )}

        {ppNegResponded && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-500" /> PP Price Quote — Round {ppNegLatest!.round}
            </h2>
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mt-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">PP quote submitted — awaiting Amber review</p>
                <p className="text-xs text-emerald-700 mt-0.5">You will be contacted if a counter offer is made.</p>
              </div>
            </div>
          </div>
        )}

    </SupplierPortalShell>
  )
}
