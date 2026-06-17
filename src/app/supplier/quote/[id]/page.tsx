"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  mockNPDs, LIVE_QUOTATIONS_KEY,
  type NPDRecord, type LiveQuotation,
  SPOC_CONTACTS, DEFAULT_RND_CONTACT, VENDOR_CATALOG, type ContactInfo,
} from "@/lib/mockData"
import {
  CheckCircle2, FileText, ExternalLink, UserCircle,
  Clock, AlertTriangle, XCircle, Phone, Mail, CheckCircle,
  MessageSquare, ChevronDown, ChevronUp,
} from "lucide-react"
import { SupplierPortalShell } from "@/components/SupplierPortalShell"

import { PRICE_NEG_KEY, type NegotiationRound, type NegotiationRecord } from "@/lib/npdTypes"

function getValidUntil(daysFromNow = 10) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

export default function SupplierQuotePage() {
  const params = useParams()
  const npdId  = params.id as string

  const [npd,             setNpd]            = useState<NPDRecord | null>(null)
  const [vendorName,      setVendorName]     = useState<string>("")
  const [feasibleChoice,  setFeasibleChoice] = useState<"yes" | "no" | "cannot" | null>(null)
  const [feasible,        setFeasible]       = useState<"yes" | "no" | "cannot" | null>(null)
  const [supplierQuery,   setSupplierQuery]  = useState("")
  const [supplyDate,      setSupplyDate]     = useState("")
  const [estimatedPrice,  setEstimatedPrice]  = useState("")
  const [docAttached,     setDocAttached]     = useState(false)
  const [submitted,       setSubmitted]      = useState(false)

  // RND reply state (set when RND has replied to a previous query)
  const [pendingRndReply,     setPendingRndReply]     = useState<string>("")
  const [pendingRndReplyDoc,  setPendingRndReplyDoc]  = useState<string>("")
  const [pendingQuery,        setPendingQuery]        = useState<string>("")
  const [queryHistory,        setQueryHistory]        = useState<Array<{ query: string; rndReply: string; rndReplyDoc?: string; repliedAt?: string }>>([])
  const [historyOpen,         setHistoryOpen]         = useState(false)

  // Price negotiation state (round-based, matches ECN Sourcing pattern)
  const [priceNegRecord, setPriceNegRecord] = useState<{
    rounds: NegotiationRound[]
    approvedAt?: number
    approvedBy?: string
    finalPrice?: string
    finalCurrency?: "INR" | "USD" | "EUR"
  } | null>(null)
  const [negPrice, setNegPrice] = useState("")
  const [negCurrency, setNegCurrency] = useState<"INR" | "USD" | "EUR">("INR")
  const [negDocs, setNegDocs] = useState<string[]>([])
  const [negSubmitted, setNegSubmitted] = useState(false)
  const currSymbol = (c: string) => c === "INR" ? "₹" : c === "USD" ? "$" : "€"

  // ── File helpers ──
  const addFile = (setter: React.Dispatch<React.SetStateAction<string[]>>, current: string[]) => {
    const names = ["quotation.pdf", "price_breakdown.xlsx", "material_spec.pdf", "capacity_report.pdf"]
    const name = names[current.length % names.length]
    setter(prev => [...prev, name])
  }
  const removeFile = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index))
  }

  const validUntil = getValidUntil(10)

  useEffect(() => {
    const qp     = new URLSearchParams(window.location.search)
    const vendor = qp.get("vendor") ?? ""
    setVendorName(vendor)

    const stored  = localStorage.getItem("npd_records_v1")
    const records: NPDRecord[] = stored ? JSON.parse(stored) : mockNPDs
    const found   = records.find(n => n.id === npdId)
      ?? mockNPDs.find(n => n.id === npdId)
      ?? mockNPDs[0]
    setNpd(found)

    const d = new Date(); d.setDate(d.getDate() + 7)
    setSupplyDate(d.toISOString().split("T")[0])

    if (vendor) {
      const rawLive = localStorage.getItem(LIVE_QUOTATIONS_KEY)
      const allLive: Record<string, Record<string, LiveQuotation>> = rawLive ? JSON.parse(rawLive) : {}
      const existing = allLive[npdId]?.[vendor]

      // Restore submission state if already submitted
      if (existing?.feasible === true && existing?.formValues) {
        setFeasible("yes")
        setSupplyDate(existing.formValues.supplyDate || d.toISOString().split("T")[0])
        setEstimatedPrice(existing.formValues.estimatedPrice || "")
        setSubmitted(true)
      } else if (existing?.feasible === false) {
        setFeasible("no")
        if (existing?.query) setSupplierQuery(existing.query)
        setSubmitted(true)
      }

      // Check for existing RND reply
      if (existing?.feasible === false && existing?.rndReply) {
        setPendingRndReply(existing.rndReply)
        setPendingRndReplyDoc(existing.rndReplyDoc ?? "")
        setPendingQuery(existing.query ?? "")
        setQueryHistory(existing.queryHistory ?? [])
      } else if (existing?.queryHistory && existing.queryHistory.length > 0) {
        setQueryHistory(existing.queryHistory)
      }

      // Check for price negotiation request from sourcing
      const rawNeg = localStorage.getItem(PRICE_NEG_KEY)
      const allNeg: Record<string, Record<string, NegotiationRecord>> = rawNeg ? JSON.parse(rawNeg) : {}
      const vendorNeg = allNeg[npdId]?.[vendor]
      if (vendorNeg) {
        setPriceNegRecord(vendorNeg)
        const latest = vendorNeg.rounds[vendorNeg.rounds.length - 1]
        if (latest?.supplierResponse) setNegSubmitted(true)
      }
    }
  }, [npdId])

  // Poll for incoming price negotiations
  useEffect(() => {
    if (!npdId || !vendorName) return
    const interval = setInterval(() => {
      const rawNeg = localStorage.getItem(PRICE_NEG_KEY)
      if (!rawNeg) return
      const allNeg: Record<string, Record<string, NegotiationRecord>> = JSON.parse(rawNeg)
      const vendorNeg = allNeg[npdId]?.[vendorName]
      if (vendorNeg) {
        setPriceNegRecord(vendorNeg)
        const latest = vendorNeg.rounds[vendorNeg.rounds.length - 1]
        if (latest?.supplierResponse) setNegSubmitted(true)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [npdId, vendorName])

  const handleGateSubmit = () => {
    if (!vendorName || !feasibleChoice) return
    if (feasibleChoice === "no" || feasibleChoice === "cannot") {
      const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      const raw  = localStorage.getItem(LIVE_QUOTATIONS_KEY)
      const all: Record<string, Record<string, LiveQuotation>> = raw ? JSON.parse(raw) : {}
      if (!all[npdId]) all[npdId] = {}
      const prev = all[npdId][vendorName]

      const existingHistory: LiveQuotation["queryHistory"] = prev?.queryHistory ?? []
      if (prev?.query && prev?.rndReply) {
        existingHistory.push({
          query:       prev.query,
          rndReply:    prev.rndReply,
          rndReplyDoc: prev.rndReplyDoc,
          repliedAt:   prev.rndRepliedAt,
        })
      }

      all[npdId][vendorName] = {
        vendorName,
        status:        "submitted",
        feasible:      false,
        formValues:    prev?.formValues ?? {},
        submittedAt:   today,
        revisionCount: prev ? prev.revisionCount + 1 : 1,
        ...(feasibleChoice === "no" && supplierQuery.trim() ? { query: supplierQuery.trim() } : {}),
        queryHistory:  existingHistory.length > 0 ? existingHistory : undefined,
      }
      localStorage.setItem(LIVE_QUOTATIONS_KEY, JSON.stringify(all))
      setFeasible(feasibleChoice)
    } else {
      setFeasible("yes")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorName) return
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    const raw  = localStorage.getItem(LIVE_QUOTATIONS_KEY)
    const all: Record<string, Record<string, LiveQuotation>> = raw ? JSON.parse(raw) : {}
    if (!all[npdId]) all[npdId] = {}
    const prev = all[npdId][vendorName]

    // Preserve query history if there was a previous query+reply
    const existingHistory: LiveQuotation["queryHistory"] = prev?.queryHistory ?? []
    if (prev?.query && prev?.rndReply) {
      existingHistory.push({
        query:       prev.query,
        rndReply:    prev.rndReply,
        rndReplyDoc: prev.rndReplyDoc,
        repliedAt:   prev.rndRepliedAt,
      })
    }

    all[npdId][vendorName] = {
      vendorName,
      status:        "submitted",
      feasible:      true,
      formValues:    { supplyDate, estimatedPrice },
      submittedAt:   today,
      revisionCount: prev ? prev.revisionCount + 1 : 1,
      queryHistory:  existingHistory.length > 0 ? existingHistory : undefined,
    }
    localStorage.setItem(LIVE_QUOTATIONS_KEY, JSON.stringify(all))
    setSubmitted(true)
  }

  if (!npd) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    )
  }

  // Query submitted screen
  if (feasible === "no") {
    const spocContact = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
    const allCatalogVendorsQuery = Object.values(VENDOR_CATALOG).flat()
    const vendorRecordQuery = allCatalogVendorsQuery.find(v => v.name === vendorName)
    const vendorSpocNameQuery = vendorRecordQuery?.spocName ?? vendorName
    const npdPortalUrl = typeof window !== "undefined" ? `${window.location.origin}/supplier/quote/${npd.id}?vendor=${encodeURIComponent(vendorName)}` : ""
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-lg w-full py-10 px-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Clarification Query Submitted</h2>
            <p className="text-sm text-slate-500 mt-1">Your query has been forwarded to the R&amp;D team.</p>
          </div>
          {/* Email to R&D */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email 1 — R&amp;D Team</span>
            </div>
            <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
              <p><strong>To:</strong> {DEFAULT_RND_CONTACT.name} ({DEFAULT_RND_CONTACT.email})</p>
              <p><strong>Subject:</strong> Supplier Query — {npd.itemName} ({npd.id})</p>
              <hr className="border-slate-200" />
              <p>Dear {DEFAULT_RND_CONTACT.name},</p>
              <p><strong>{vendorName}</strong> has reviewed the requirement for <em>{npd.itemName}</em> ({npd.id}) and has raised a clarification query before confirming feasibility.</p>
              {supplierQuery && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 italic text-slate-800">
                  &ldquo;{supplierQuery}&rdquo;
                </div>
              )}
              <p>Please review and provide a clarification so that the supplier can re-assess and confirm their feasibility.</p>
              <div className="mt-1">
                <a
                  href={`/npd/${npd.id}#vendor-queries`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
                >
                  Provide Clarification →
                </a>
              </div>
              <p className="pt-1">Regards,<br /><strong>{vendorSpocNameQuery}</strong><br /><span className="text-slate-500">{vendorName}</span></p>
            </div>
          </div>

          {/* Email to Sourcing */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email 2 — Sourcing SPOC</span>
            </div>
            <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
              <p><strong>To:</strong> {spocContact.name}{spocContact.email ? ` (${spocContact.email})` : ""}</p>
              <p><strong>Subject:</strong> Supplier Query — {npd.itemName} ({npd.id})</p>
              <hr className="border-slate-200" />
              <p>Dear {spocContact.name},</p>
              <p><strong>{vendorName}</strong> has raised a clarification query for <em>{npd.itemName}</em> ({npd.id}). Please coordinate with the R&amp;D team to provide a timely response so the supplier can confirm feasibility.</p>
              {supplierQuery && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 italic text-slate-800">
                  &ldquo;{supplierQuery}&rdquo;
                </div>
              )}
              <p className="pt-1">Regards,<br /><strong>{vendorSpocNameQuery}</strong><br /><span className="text-slate-500">{vendorName}</span></p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">You will receive a new portal link once R&amp;D has responded. You may close this window.</p>
        </div>
      </div>
    )
  }

  // Cannot manufacture screen
  if (feasible === "cannot") {
    const spocContact = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
    const allCatalogVendorsCannot = Object.values(VENDOR_CATALOG).flat()
    const vendorRecordCannot = allCatalogVendorsCannot.find(v => v.name === vendorName)
    const vendorSpocNameCannot = vendorRecordCannot?.spocName ?? vendorName
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-lg w-full py-10 px-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Response Submitted — Not Feasible</h2>
            <p className="text-sm text-slate-500 mt-1">Your response has been recorded and the team has been notified.</p>
          </div>
          {/* Email to R&D */}
          <div className="rounded-xl border border-red-200 bg-slate-50 overflow-hidden">
            <div className="bg-red-900 px-4 py-2.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-red-300" />
              <span className="text-[11px] font-semibold text-red-200 uppercase tracking-wider">Email 1 — R&amp;D Team</span>
            </div>
            <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
              <p><strong>To:</strong> {DEFAULT_RND_CONTACT.name} ({DEFAULT_RND_CONTACT.email})</p>
              <p><strong>Subject:</strong> Supplier Unable to Fulfil — {npd.itemName} ({npd.id})</p>
              <hr className="border-slate-200" />
              <p>Dear {DEFAULT_RND_CONTACT.name},</p>
              <p><strong>{vendorName}</strong> has confirmed that they are <strong className="text-red-700">unable to manufacture</strong> the requirement for <em>{npd.itemName}</em> ({npd.id}) and cannot proceed with this enquiry.</p>
              <p>Kindly consider alternative vendors or revised specifications at the earliest.</p>
              <p className="pt-1">Regards,<br /><strong>{vendorSpocNameCannot}</strong><br /><span className="text-slate-500">{vendorName}</span></p>
            </div>
          </div>

          {/* Email to Sourcing */}
          <div className="rounded-xl border border-red-200 bg-slate-50 overflow-hidden">
            <div className="bg-red-900 px-4 py-2.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-red-300" />
              <span className="text-[11px] font-semibold text-red-200 uppercase tracking-wider">Email 2 — Sourcing SPOC</span>
            </div>
            <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
              <p><strong>To:</strong> {spocContact.name}{spocContact.email ? ` (${spocContact.email})` : ""}</p>
              <p><strong>Subject:</strong> Supplier Unable to Fulfil — {npd.itemName} ({npd.id})</p>
              <hr className="border-slate-200" />
              <p>Dear {spocContact.name},</p>
              <p><strong>{vendorName}</strong> has confirmed that they are <strong className="text-red-700">unable to fulfil</strong> the requirement for <em>{npd.itemName}</em> ({npd.id}). Please explore alternative vendors and update the NPD record accordingly.</p>
              <p className="pt-1">Regards,<br /><strong>{vendorSpocNameCannot}</strong><br /><span className="text-slate-500">{vendorName}</span></p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">You may close this window.</p>
        </div>
      </div>
    )
  }

  // Feasible — submitted screen
  if (submitted) {
    const spocContact = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
    const dispDate = supplyDate ? new Date(supplyDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : supplyDate
    const allCatalogVendors = Object.values(VENDOR_CATALOG).flat()
    const vendorRecord = allCatalogVendors.find(v => v.name === vendorName)
    const vendorSpocName = vendorRecord?.spocName ?? vendorName
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-lg w-full py-10 px-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Response Submitted</h2>
            <p className="text-sm text-slate-500 mt-1">Your confirmation has been recorded. The team has been notified.</p>
          </div>
          {/* Email to R&D */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email 1 — R&amp;D Team</span>
            </div>
            <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
              <p><strong>To:</strong> {DEFAULT_RND_CONTACT.name} ({DEFAULT_RND_CONTACT.email})</p>
              <p><strong>Subject:</strong> Feasibility Confirmed — {npd.itemName} ({npd.id})</p>
              <hr className="border-slate-200" />
              <p>Dear {DEFAULT_RND_CONTACT.name},</p>
              <p><strong>{vendorName}</strong> has confirmed the <strong>feasibility</strong> for <em>{npd.itemName}</em> ({npd.id}) and is ready to proceed with sample dispatch.</p>
              <p><strong>Committed Dispatch Date:</strong> {dispDate}</p>
              {npd.sampleQty && (
                <p><strong>Sample Quantity Required:</strong> {npd.sampleQty} pcs</p>
              )}
              <p className="pt-1">Regards,<br /><strong>{vendorSpocName}</strong><br /><span className="text-slate-500">{vendorName}</span></p>
            </div>
          </div>

          {/* Email to Sourcing */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email 2 — Sourcing SPOC</span>
            </div>
            <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
              <p><strong>To:</strong> {spocContact.name}{spocContact.email ? ` (${spocContact.email})` : ""}</p>
              <p><strong>Subject:</strong> Feasibility Confirmed — {npd.itemName} ({npd.id})</p>
              <hr className="border-slate-200" />
              <p>Dear {spocContact.name},</p>
              <p><strong>{vendorName}</strong> has confirmed the <strong>feasibility</strong> for <em>{npd.itemName}</em> ({npd.id}) and is ready to proceed with sample dispatch.</p>
              <p><strong>Committed Dispatch Date:</strong> {dispDate}</p>
              {npd.sampleQty && (
                <p><strong>Sample Quantity Required:</strong> {npd.sampleQty} pcs</p>
              )}
              <p>Please take note and coordinate the next steps accordingly.</p>
              <p className="pt-1">Regards,<br /><strong>{vendorSpocName}</strong><br /><span className="text-slate-500">{vendorName}</span></p>
            </div>
          </div>

          {/* Price Negotiation — round-based, matches ECN Sourcing pattern */}
          {priceNegRecord && (() => {
            const negLatest = priceNegRecord.rounds[priceNegRecord.rounds.length - 1]
            const negPending = priceNegRecord && !priceNegRecord.approvedAt && negLatest && !negLatest.supplierResponse
            const negResponded = priceNegRecord && !priceNegRecord.approvedAt && negLatest?.supplierResponse
            const negAgreed = priceNegRecord?.approvedAt

            return (
              <>
                {/* Negotiation round — sourcing has sent a target, supplier responds */}
                {negPending && (
                  <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" /> Price Negotiation — Round {negLatest.round}
                    </h2>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Your initial quote</span>
                      <span className="text-sm font-bold text-slate-800">₹{parseFloat(estimatedPrice || "0").toLocaleString("en-IN")} / unit</span>
                    </div>
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
                          const raw = localStorage.getItem(PRICE_NEG_KEY)
                          const all: Record<string, Record<string, NegotiationRecord>> = raw ? JSON.parse(raw) : {}
                          if (!all[npdId]) all[npdId] = {}
                          const updated: NegotiationRecord = {
                            ...priceNegRecord,
                            rounds: priceNegRecord.rounds.map((r, idx) =>
                              idx === priceNegRecord.rounds.length - 1
                                ? { ...r, supplierResponse: { price: negLatest.targetPrice, currency: negLatest.currency, docs: [], submittedAt: Date.now() } }
                                : r
                            ),
                            approvedAt: Date.now(),
                            approvedBy: vendorName,
                            finalPrice: negLatest.targetPrice,
                            finalCurrency: negLatest.currency,
                          }
                          all[npdId][vendorName] = updated
                          localStorage.setItem(PRICE_NEG_KEY, JSON.stringify(all))
                          setPriceNegRecord(updated)
                          setNegSubmitted(true)
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
                          <input type="number" min="0" step="0.01" placeholder="e.g. 45.00" value={negPrice} onChange={e => setNegPrice(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                      <button
                        onClick={() => {
                          if (!negPrice || parseFloat(negPrice) <= 0) return
                          const raw = localStorage.getItem(PRICE_NEG_KEY)
                          const all: Record<string, Record<string, NegotiationRecord>> = raw ? JSON.parse(raw) : {}
                          if (!all[npdId]) all[npdId] = {}
                          const updated: NegotiationRecord = {
                            ...priceNegRecord,
                            rounds: priceNegRecord.rounds.map((r, idx) =>
                              idx === priceNegRecord.rounds.length - 1
                                ? { ...r, supplierResponse: { price: negPrice, currency: negCurrency, docs: [...negDocs], submittedAt: Date.now() } }
                                : r
                            ),
                          }
                          all[npdId][vendorName] = updated
                          localStorage.setItem(PRICE_NEG_KEY, JSON.stringify(all))
                          setPriceNegRecord(updated)
                          setNegSubmitted(true)
                        }}
                        disabled={!negPrice || parseFloat(negPrice) <= 0}
                        className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
                      >
                        Submit Counter-Quote
                      </button>
                    </div>
                  </div>
                )}

                {/* Responded to a round — awaiting Amber review */}
                {negResponded && (
                  <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-3">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" /> Price Negotiation — Round {negLatest!.round}
                    </h2>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Your initial quote</span>
                      <span className="text-sm font-bold text-slate-800">₹{parseFloat(estimatedPrice || "0").toLocaleString("en-IN")} / unit</span>
                    </div>
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
                {negAgreed && (
                  <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Price agreed — {currSymbol(priceNegRecord.finalCurrency ?? "INR")}{parseFloat(priceNegRecord.finalPrice!).toLocaleString("en-IN")} / unit</p>
                        <p className="text-xs text-emerald-700 mt-0.5">Amber will proceed to the next stage.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )
          })()}

          <p className="text-xs text-slate-400 text-center">You may close this window.</p>
        </div>
      </div>
    )
  }

  const spocContact: ContactInfo = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
  const rndContact: ContactInfo  = DEFAULT_RND_CONTACT

  return (
    <SupplierPortalShell portalLabel="Vendor Feasibility" maxWidth="4xl">

        {/* NPD Hero */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[10px] font-bold tracking-widest bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full mb-3">
                {npd.id}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{npd.itemName}</h1>
              <p className="text-sm text-slate-500">
                <span className="text-slate-400">Category:</span> {npd.itemCategory} · {npd.productLine}
              </p>
              {vendorName && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Enquiry Issued To</p>
                  <p className="text-sm font-semibold text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 inline-block">
                    {vendorName}
                  </p>
                </div>
              )}
              {npd.sampleQty && (
                <div className="mt-3 inline-flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Sample Qty Required</span>
                  <span className="text-sm font-bold text-violet-900">{npd.sampleQty} pcs</span>
                  <span className="text-[10px] text-violet-500">as specified by R&amp;D</span>
                </div>
              )}
            </div>

            <div className="shrink-0 md:w-72 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Key Contacts</p>
              <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                  <UserCircle className="w-5 h-5 text-violet-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">R&amp;D Owner</p>
                  <p className="text-sm font-bold text-slate-800">{rndContact.name}</p>
                  {rndContact.email && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 shrink-0" />{rndContact.email}
                    </p>
                  )}
                  {rndContact.phone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0" />{rndContact.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                  <UserCircle className="w-5 h-5 text-teal-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sourcing Representative</p>
                  <p className="text-sm font-bold text-slate-800">{spocContact.name}</p>
                  {spocContact.email && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 shrink-0" />{spocContact.email}
                    </p>
                  )}
                  {spocContact.phone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0" />{spocContact.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Documents */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Reference Documents</h2>
          {npd.driveLink ? (
            <>
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-700 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Engineering Drawing &amp; Specification</p>
                    <p className="text-xs text-blue-600 truncate max-w-xs">{npd.driveLink}</p>
                  </div>
                </div>
                <a
                  href={npd.driveLink} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 ml-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-blue-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Document
                </a>
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span><strong>Important:</strong> Please save the documents to your device and review them before submitting your response. This is a temporary link and may not remain accessible.</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400 italic">
              <AlertTriangle className="w-4 h-4" /> No drawing link attached. Contact the SPOC.
            </div>
          )}
        </div>

        {/* Query history (shown when there are previous rounds) */}
        {queryHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(v => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                Previous Query / Reply History ({queryHistory.length} round{queryHistory.length !== 1 ? "s" : ""})
              </h2>
              {historyOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {historyOpen && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {queryHistory.map((h, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-4 space-y-2 bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Round {i + 1}</p>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-600">Your Query:</p>
                      <p className="text-sm text-slate-800 italic bg-white border border-slate-200 rounded p-2">&ldquo;{h.query}&rdquo;</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-600">R&amp;D Response:</p>
                      <p className="text-sm text-slate-800 bg-white border border-slate-200 rounded p-2">{h.rndReply}</p>
                      {h.rndReplyDoc && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {h.rndReplyDoc}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* R&D replied to previous query — show before feasibility gate */}
        {pendingRndReply && feasible === null && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-bold text-emerald-900">R&amp;D has responded to your query</h2>
                <p className="text-sm text-emerald-700 mt-0.5">
                  Please review the clarification below and re-assess your feasibility.
                </p>
              </div>
            </div>
            {pendingQuery && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-600">Your query:</p>
                <p className="text-sm text-slate-700 italic bg-white border border-slate-200 rounded-lg p-3">&ldquo;{pendingQuery}&rdquo;</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-600">R&amp;D Clarification:</p>
              <div className="bg-white border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-slate-900">{pendingRndReply}</p>
                {pendingRndReplyDoc && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-2">
                    <FileText className="w-3 h-3" /> {pendingRndReplyDoc}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-emerald-700 font-medium">
              Based on this clarification, please re-confirm your feasibility below.
            </p>
          </div>
        )}

        {/* Feasibility gate */}
        {feasible === null && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {pendingRndReply ? "Re-Assess Feasibility" : "Feasibility Confirmation Required"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Based on the provided specifications and documents, please confirm your capability to fulfil this requirement.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFeasibleChoice("yes")}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-4 text-left transition-colors ${
                  feasibleChoice === "yes"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  feasibleChoice === "yes" ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                }`}>
                  {feasibleChoice === "yes" && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div>
                  <p className={`text-sm font-bold ${feasibleChoice === "yes" ? "text-emerald-800" : "text-slate-700"}`}>
                    Yes, we can proceed
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Confirm dispatch date for sample submission</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFeasibleChoice("cannot")}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-4 text-left transition-colors ${
                  feasibleChoice === "cannot"
                    ? "border-red-400 bg-red-50"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  feasibleChoice === "cannot" ? "border-red-500 bg-red-500" : "border-slate-300"
                }`}>
                  {feasibleChoice === "cannot" && <XCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div>
                  <p className={`text-sm font-bold ${feasibleChoice === "cannot" ? "text-red-800" : "text-slate-700"}`}>
                    Cannot manufacture
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">This requirement is not feasible for us</p>
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={handleGateSubmit}
              disabled={!feasibleChoice}
              className={`w-full disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors ${
                feasibleChoice === "cannot" ? "bg-red-700 hover:bg-red-600" : "bg-emerald-700 hover:bg-emerald-600"
              }`}
            >
              {feasibleChoice === "cannot" ? "Confirm — Cannot Manufacture" : "Confirm Feasibility"}
            </button>
            <p className="text-xs text-slate-400 text-center">
              Your response will be used for planning sourcing and development timelines.
            </p>
          </div>
        )}

        {/* Dispatch date form (shown only after yes is confirmed) */}
        {feasible === "yes" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">Sample Dispatch Confirmation</h2>
            {npd.sampleQty && (
              <div className="mb-5 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800">
                  <strong>Sample Quantity Required:</strong> {npd.sampleQty} pcs, as specified by the R&amp;D team.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Committed Sample Dispatch Date <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-400">Date by which samples will be dispatched</p>
                  <input
                    type="date" required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    value={supplyDate}
                    onChange={e => setSupplyDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Estimated Unit Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-400">Estimated price per unit for the sample</p>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">₹</span>
                    <input
                      type="number" required min="0" step="0.01"
                      className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="0.00"
                      value={estimatedPrice}
                      onChange={e => setEstimatedPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Supporting Document
                </label>
                <p className="text-xs text-slate-400">Upload challan, receipt, or shipping confirmation</p>
                <button
                  type="button"
                  onClick={() => setDocAttached(true)}
                  disabled={docAttached}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 w-full ${
                    docAttached
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 cursor-default"
                      : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {docAttached ? (
                    <><CheckCircle className="w-4 h-4" /> Attached</>
                  ) : (
                    <><FileText className="w-4 h-4" /> Add Document</>
                  )}
                </button>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl px-6 py-3 transition-colors"
                >
                  Submit Confirmation
                </button>
              </div>
            </form>
          </div>
        )}
    </SupplierPortalShell>
  )
}
