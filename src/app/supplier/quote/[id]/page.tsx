"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  mockNPDs, LIVE_QUOTATIONS_KEY,
  type NPDRecord, type LiveQuotation,
  SPOC_CONTACTS, DEFAULT_RND_CONTACT, type ContactInfo,
} from "@/lib/mockData"
import {
  CheckCircle2, FileText, ExternalLink, UserCircle,
  Clock, AlertTriangle, XCircle, Phone, Mail, CheckCircle,
} from "lucide-react"

function getValidUntil(daysFromNow = 10) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

export default function SupplierQuotePage() {
  const params = useParams()
  const npdId  = params.id as string

  const [npd,           setNpd]          = useState<NPDRecord | null>(null)
  const [vendorName,    setVendorName]   = useState<string>("")
  const [feasibleChoice, setFeasibleChoice] = useState<"yes" | "no" | null>(null)
  const [feasible,      setFeasible]     = useState<"yes" | "no" | null>(null)
  const [supplierQuery,  setSupplierQuery] = useState("")
  const [sampleQty,     setSampleQty]    = useState("")
  const [supplyDate,    setSupplyDate]   = useState("")
  const [submitted,     setSubmitted]    = useState(false)
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
  }, [npdId])

  const handleGateSubmit = () => {
    if (!vendorName || !feasibleChoice) return
    if (feasibleChoice === "no") {
      const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      const raw  = localStorage.getItem(LIVE_QUOTATIONS_KEY)
      const all: Record<string, Record<string, LiveQuotation>> = raw ? JSON.parse(raw) : {}
      if (!all[npdId]) all[npdId] = {}
      all[npdId][vendorName] = {
        vendorName,
        status:        "submitted",
        feasible:      false,
        formValues:    {},
        submittedAt:   today,
        revisionCount: all[npdId][vendorName] ? all[npdId][vendorName].revisionCount + 1 : 1,
        ...(supplierQuery.trim() ? { query: supplierQuery.trim() } : {}),
      }
      localStorage.setItem(LIVE_QUOTATIONS_KEY, JSON.stringify(all))
      setFeasible("no")
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
    all[npdId][vendorName] = {
      vendorName,
      status:        "submitted",
      feasible:      true,
      formValues:    { sampleQty, supplyDate },
      submittedAt:   today,
      revisionCount: prev ? prev.revisionCount + 1 : 1,
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

  // Not-feasible screen
  if (feasible === "no") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center py-14 px-8">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Response Recorded</h2>
          <p className="text-slate-500 text-sm">
            Thank you for letting us know. Your response for <strong>{npd.id}</strong> has been
            logged. The Sourcing SPOC will follow up if needed.
          </p>
          <p className="text-xs text-slate-400 mt-4">You may close this window.</p>
        </div>
      </div>
    )
  }

  // Submitted screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center py-14 px-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Response Submitted</h2>
          <p className="text-slate-500 text-sm">
            {vendorName && <><strong>{vendorName}</strong>&apos;s </>}
            response for <strong>{npd.id}</strong> has been registered. The Sourcing SPOC will review and follow up.
          </p>
          <p className="text-xs text-slate-400 mt-4">You may close this window.</p>
        </div>
      </div>
    )
  }

  const spocContact: ContactInfo = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "—", phone: "—" }
  const rndContact: ContactInfo  = DEFAULT_RND_CONTACT

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/amber-logo.png" alt="Amber" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-sm font-bold text-slate-700">Supplier Response Portal</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <Clock className="w-3.5 h-3.5" />
            Response Deadline: {validUntil}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* NPD Hero — part info left, contacts right */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Part info */}
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
            </div>

            {/* Points of contact */}
            <div className="shrink-0 md:w-72 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Key Contacts</p>
              {/* R&D */}
              <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                  <UserCircle className="w-5 h-5 text-violet-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">R&amp;D Owner</p>
                  <p className="text-sm font-bold text-slate-800">{rndContact.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 shrink-0" />{rndContact.email}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 shrink-0" />{rndContact.phone}
                  </p>
                </div>
              </div>
              {/* SPOC */}
              <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                  <UserCircle className="w-5 h-5 text-teal-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sourcing Representative</p>
                  <p className="text-sm font-bold text-slate-800">{spocContact.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 shrink-0" />{spocContact.email}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 shrink-0" />{spocContact.phone}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Documents — always visible */}
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
              <p className="text-xs text-slate-500 italic pl-1">
                Please review the attached documents carefully before submitting your response.
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400 italic">
              <AlertTriangle className="w-4 h-4" /> No drawing link attached. Contact the SPOC.
            </div>
          )}
        </div>

        {/* Feasibility gate — radio-style selection + Submit */}
        {feasible === null && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Feasibility Confirmation Required</h2>
              <p className="text-sm text-slate-500 mt-1">
                Based on the provided specifications and documents, please confirm your capability to fulfill this requirement.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFeasibleChoice("yes")}
                className={`flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-colors ${
                  feasibleChoice === "yes"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  feasibleChoice === "yes" ? "border-blue-600 bg-blue-600" : "border-slate-300"
                }`}>
                  {feasibleChoice === "yes" && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div>
                  <p className={`text-sm font-bold ${feasibleChoice === "yes" ? "text-blue-900" : "text-slate-700"}`}>
                    We can meet this requirement
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Sample quantity and estimated delivery timeline will be shared</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFeasibleChoice("no")}
                className={`flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-colors ${
                  feasibleChoice === "no"
                    ? "border-red-400 bg-red-50"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  feasibleChoice === "no" ? "border-red-500 bg-red-500" : "border-slate-300"
                }`}>
                  {feasibleChoice === "no" && <XCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div>
                  <p className={`text-sm font-bold ${feasibleChoice === "no" ? "text-red-800" : "text-slate-700"}`}>
                    Unable to meet this requirement
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">This requirement cannot be supported based on current capabilities.</p>
                </div>
              </button>
            </div>
            {feasibleChoice === "no" && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Raise a Clarification Query <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <p className="text-xs text-slate-500">
                  If you need more information from the R&amp;D team before confirming, describe your query below. It will be sent to the R&amp;D owner for review.
                </p>
                <textarea
                  rows={3}
                  placeholder="e.g. Please clarify the dimensional tolerance on the inner diameter…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-red-400 focus:border-red-400 resize-none"
                  value={supplierQuery}
                  onChange={e => setSupplierQuery(e.target.value)}
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleGateSubmit}
              disabled={!feasibleChoice}
              className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
            >
              Submit Response
            </button>
            <p className="text-xs text-slate-400 text-center">
              Note: Your response will be used for planning sourcing and development timelines.
            </p>
          </div>
        )}

        {/* 2-field form (shown only after yes is confirmed) */}
        {feasible === "yes" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">Your Response</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Sample Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min={1} required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 max-w-xs"
                  value={sampleQty}
                  onChange={e => setSampleQty(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Supply Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date" required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 max-w-xs"
                  value={supplyDate}
                  onChange={e => setSupplyDate(e.target.value)}
                />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl px-6 py-3 transition-colors"
                >
                  Submit Response
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
