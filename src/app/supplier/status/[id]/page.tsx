"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { mockNPDs, VENDOR_STATUS_KEY, LIVE_QUOTATIONS_KEY, SPOC_CONTACTS, VENDOR_CATALOG, DEFAULT_RND_CONTACT, type NPDRecord, type VendorStatusResponse, type LiveQuotation } from "@/lib/mockData"
import { CheckCircle2, Clock, AlertCircle, UserCircle, Mail, MessageSquare } from "lucide-react"

export default function VendorStatusPage() {
  const params   = useParams()
  const npdId    = params.id as string

  const [npd,         setNpd]        = useState<NPDRecord | null>(null)
  const [vendorName,  setVendorName] = useState("")
  const [dispatchDate, setDispatchDate] = useState("")
  const [onTime,          setOnTime]          = useState<boolean | null>(null)
  const [newDate,         setNewDate]         = useState("")
  const [notes,           setNotes]           = useState("")
  const [submitted,       setSubmitted]       = useState(false)
  const [prevResponse,    setPrevResponse]    = useState<VendorStatusResponse | null>(null)
  const [allowResubmit,   setAllowResubmit]   = useState(false)
  // Round 2 — responding to sourcing counter-proposal
  const [counterAccepted, setCounterAccepted] = useState<boolean | null>(null)
  const [finalDate,       setFinalDate]       = useState("")
  const [finalNotes,      setFinalNotes]      = useState("")

  useEffect(() => {
    const qs     = new URLSearchParams(window.location.search)
    const vendor = qs.get("vendor") ?? ""
    setVendorName(vendor)

    const stored  = localStorage.getItem("npd_records_v1")
    const records: NPDRecord[] = stored ? JSON.parse(stored) : mockNPDs
    const found   = records.find(n => n.id === npdId) ?? mockNPDs.find(n => n.id === npdId) ?? mockNPDs[0]
    setNpd(found)

    // Get original dispatch date from live quotation
    if (vendor) {
      const rawLive = localStorage.getItem(LIVE_QUOTATIONS_KEY)
      const allLive: Record<string, Record<string, LiveQuotation>> = rawLive ? JSON.parse(rawLive) : {}
      const quote = allLive[npdId]?.[vendor]
      if (quote?.formValues?.q1) {
        const d = new Date(quote.formValues.q1)
        setDispatchDate(d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }))
      }

      // Check for previous response
      const rawStatus = localStorage.getItem(VENDOR_STATUS_KEY)
      const allStatus: Record<string, Record<string, VendorStatusResponse>> = rawStatus ? JSON.parse(rawStatus) : {}
      const prev = allStatus[npdId]?.[vendor]
      if (prev) setPrevResponse(prev)
    }
  }, [npdId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onTime === null) return
    const raw  = localStorage.getItem(VENDOR_STATUS_KEY)
    const all: Record<string, Record<string, VendorStatusResponse>> = raw ? JSON.parse(raw) : {}
    const prevCount = all[npdId]?.[vendorName]?.submissionCount ?? 0
    const response: VendorStatusResponse = {
      vendorName,
      onTime,
      newDate:         onTime ? undefined : newDate || undefined,
      notes:           notes.trim() || undefined,
      respondedAt:     new Date().toLocaleString("en-IN"),
      submissionCount: prevCount + 1,
    }
    if (!all[npdId]) all[npdId] = {}
    all[npdId][vendorName] = response
    localStorage.setItem(VENDOR_STATUS_KEY, JSON.stringify(all))
    setPrevResponse(response)
    setAllowResubmit(false)
    setSubmitted(true)
  }

  const handleCounterResponse = (e: React.FormEvent) => {
    e.preventDefault()
    if (counterAccepted === null) return
    const raw = localStorage.getItem(VENDOR_STATUS_KEY)
    const all: Record<string, Record<string, VendorStatusResponse>> = raw ? JSON.parse(raw) : {}
    const existing = all[npdId]?.[vendorName]
    if (!existing) return
    const resolvedDate = counterAccepted ? existing.sourcingCounterDate! : finalDate
    const updated: VendorStatusResponse = {
      ...existing,
      negotiationStatus: "supplier_final",
      supplierFinalDate:  resolvedDate,
      supplierFinalNotes: finalNotes.trim() || undefined,
      supplierFinalAt:    new Date().toLocaleString("en-IN"),
    }
    all[npdId][vendorName] = updated
    localStorage.setItem(VENDOR_STATUS_KEY, JSON.stringify(all))
    setSubmitted(true)
    setPrevResponse(updated)
  }

  if (!npd) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading…</p>
    </div>
  )

  // Counter-proposal response screen (round 2) — must be checked BEFORE the confirmation block
  // so TypeScript doesn't narrow prevResponse to null via the early return below.
  const pendingCounter: VendorStatusResponse | null =
    prevResponse !== null &&
    prevResponse.negotiationStatus === "sourcing_countered" &&
    !prevResponse.supplierFinalDate
      ? prevResponse : null

  if (pendingCounter && !submitted) {
    const counterFmt = pendingCounter.sourcingCounterDate
      ? new Date(pendingCounter.sourcingCounterDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : ""
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-3">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/amber-logo.png" alt="Amber" className="h-7 w-auto object-contain" />
              <div className="h-5 w-px bg-slate-200" />
              <span className="text-sm font-bold text-slate-700">Dispatch Date Negotiation</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
              <Clock className="w-3.5 h-3.5" /> {npdId}
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          {/* Context card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
              <MessageSquare className="w-4 h-4" /> Counter-proposal from Amber Sourcing
            </div>
            <p className="text-sm text-slate-600">
              The Amber sourcing team has reviewed your request and proposed an alternative dispatch date.
              This is round 2 of 2 — your response will be final.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Proposed by Amber Sourcing</p>
              <p className="text-lg font-bold text-blue-900">{counterFmt}</p>
              {pendingCounter.sourcingCounterMsg && (
                <p className="text-sm text-slate-600 italic">"{pendingCounter.sourcingCounterMsg}"</p>
              )}
            </div>
            {/* Original request for reference */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-0.5 text-xs">
              <p className="font-bold text-slate-400 uppercase tracking-wider">Your Original Request</p>
              <p className="font-semibold text-slate-700">
                {pendingCounter.newDate ? new Date(pendingCounter.newDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}
              </p>
              {pendingCounter.notes && <p className="text-slate-500 italic">"{pendingCounter.notes}"</p>}
            </div>
          </div>

          {/* Response form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">Your Response (Final)</h2>
            <form onSubmit={handleCounterResponse} className="space-y-5">
              <div className="flex gap-3">
                <button type="button" onClick={() => setCounterAccepted(true)}
                  className={`flex-1 rounded-xl border-2 py-3 font-semibold text-sm transition-colors ${
                    counterAccepted === true ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-emerald-300"
                  }`}>
                  ✓ Accept Amber's date ({counterFmt})
                </button>
                <button type="button" onClick={() => setCounterAccepted(false)}
                  className={`flex-1 rounded-xl border-2 py-3 font-semibold text-sm transition-colors ${
                    counterAccepted === false ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600 hover:border-amber-300"
                  }`}>
                  ✗ Propose a different date
                </button>
              </div>

              {counterAccepted === false && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Final Proposed Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={finalDate} onChange={e => setFinalDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason / Notes</label>
                    <textarea rows={3} value={finalNotes} onChange={e => setFinalNotes(e.target.value)}
                      placeholder="e.g. Earliest feasible date given current constraints…"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500 resize-none" />
                  </div>
                </div>
              )}

              {counterAccepted === true && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Additional Notes (optional)</label>
                  <textarea rows={2} value={finalNotes} onChange={e => setFinalNotes(e.target.value)}
                    placeholder="Any updates for the Amber team…"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none" />
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <button type="submit" disabled={counterAccepted === null || (counterAccepted === false && !finalDate)}
                  className="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white text-sm font-semibold rounded-xl px-6 py-3 transition-colors">
                  Submit Final Response
                </button>
              </div>
              <p className="text-[11px] text-slate-400 text-center">This is your final response — no further negotiation rounds are available.</p>
            </form>
          </div>
        </main>
      </div>
    )
  }

  if (!allowResubmit && (submitted || prevResponse)) {
    const resp = submitted
      ? { onTime, newDate: onTime ? undefined : newDate, notes }
      : prevResponse!
    const submissionCount = prevResponse?.submissionCount ?? (submitted ? 1 : 0)
    const canUpdate = submissionCount < 2 && !prevResponse?.negotiationStatus
    const spocContact = npd ? (SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }) : { name: "", email: "", phone: "" }
    const allCatalogV = Object.values(VENDOR_CATALOG).flat()
    const vendorRec   = allCatalogV.find(v => v.name === vendorName)
    const vendorSpoc  = vendorRec?.spocName ?? vendorName
    const revisedDate = resp.newDate ? new Date(resp.newDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-lg w-full py-10 px-8 space-y-6">
          <div className="text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${resp.onTime ? "bg-emerald-100" : "bg-amber-100"}`}>
              {resp.onTime
                ? <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                : <AlertCircle className="w-7 h-7 text-amber-600" />}
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {resp.onTime ? "Confirmed — On Track" :
               prevResponse?.negotiationStatus === "supplier_final" ? "Final Response Submitted" :
               "Date Change Submitted"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {resp.onTime
                ? "Your dispatch status has been confirmed. The Amber team has been notified."
                : prevResponse?.negotiationStatus === "supplier_final"
                ? "Your final response has been sent to the Amber sourcing team. No further rounds available."
                : "Your revised date has been submitted to the Amber sourcing team for review."}
            </p>
            {!resp.onTime && revisedDate && (
              <p className="mt-3 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-block">
                Proposed new date: {revisedDate}
              </p>
            )}
          </div>

          {/* Email to Sourcing SPOC */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email — Sourcing SPOC</span>
            </div>
            <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
              <p><strong>To:</strong> {spocContact.name}{spocContact.email ? ` (${spocContact.email})` : ""}</p>
              <p><strong>Subject:</strong> {resp.onTime ? `Dispatch Confirmed On Track — ${npd?.itemName} (${npdId})` : `Dispatch Date Revision Request — ${npd?.itemName} (${npdId})`}</p>
              <hr className="border-slate-200" />
              <p>Dear {spocContact.name},</p>
              {resp.onTime ? (
                <>
                  <p><strong>{vendorName}</strong> has confirmed that the sample dispatch for <em>{npd?.itemName}</em> ({npdId}) is <strong className="text-emerald-700">on track</strong> as per the committed schedule.</p>
                  {resp.notes && (
                    <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 italic text-slate-700">
                      &ldquo;{resp.notes}&rdquo;
                    </div>
                  )}
                  <p>No further action is required at this stage.</p>
                </>
              ) : (
                <>
                  <p><strong>{vendorName}</strong> has indicated that they will <strong className="text-amber-700">not be able to dispatch</strong> the samples for <em>{npd?.itemName}</em> ({npdId}) by the originally committed date.</p>
                  {revisedDate && <p><strong>Proposed New Dispatch Date:</strong> {revisedDate}</p>}
                  {resp.notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 italic text-slate-700">
                      &ldquo;{resp.notes}&rdquo;
                    </div>
                  )}
                  <p>Please review and confirm the revised timeline with the R&amp;D team.</p>
                </>
              )}
              <p className="pt-1">Regards,<br /><strong>{vendorSpoc}</strong><br /><span className="text-slate-500">{vendorName}</span></p>
            </div>
          </div>

          {/* Email to R&D */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email — R&amp;D Team</span>
            </div>
            <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
              <p><strong>To:</strong> {DEFAULT_RND_CONTACT.name} ({DEFAULT_RND_CONTACT.email})</p>
              <p><strong>Subject:</strong> {resp.onTime ? `Dispatch Confirmed On Track — ${npd?.itemName} (${npdId})` : `Dispatch Date Revision — ${npd?.itemName} (${npdId})`}</p>
              <hr className="border-slate-200" />
              <p>Dear {DEFAULT_RND_CONTACT.name},</p>
              {resp.onTime ? (
                <p><strong>{vendorName}</strong> has confirmed their sample dispatch for <em>{npd?.itemName}</em> ({npdId}) is <strong className="text-emerald-700">on track</strong>. No changes to the timeline.</p>
              ) : (
                <>
                  <p><strong>{vendorName}</strong> has requested a dispatch date revision for <em>{npd?.itemName}</em> ({npdId}).</p>
                  {revisedDate && <p><strong>Proposed New Date:</strong> {revisedDate}</p>}
                  {resp.notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 italic text-slate-700">
                      &ldquo;{resp.notes}&rdquo;
                    </div>
                  )}
                  <p>The sourcing SPOC will coordinate the revised schedule.</p>
                </>
              )}
              <p className="pt-1">Regards,<br /><strong>{vendorSpoc}</strong><br /><span className="text-slate-500">{vendorName}</span></p>
            </div>
          </div>

          {canUpdate ? (
            <div className="text-center space-y-2">
              <button
                onClick={() => {
                  setOnTime(null)
                  setNewDate("")
                  setNotes("")
                  setSubmitted(false)
                  setAllowResubmit(true)
                }}
                className="text-sm font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2 transition-colors"
              >
                Update my response
              </button>
              <p className="text-xs text-slate-400">You can update your response once more (1 update remaining).</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center">You may close this window.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-3">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/amber-logo.png" alt="Amber" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-sm font-bold text-slate-700">Dispatch Status Check</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
            <Clock className="w-3.5 h-3.5" /> {npdId}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* NPD info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <span className="inline-block text-[10px] font-bold tracking-widest bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full mb-3">{npdId}</span>
              <h1 className="text-xl font-bold text-slate-900 mb-1">{npd.itemName}</h1>
              <p className="text-sm text-slate-500">{npd.itemCategory} · {npd.productLine}</p>
              {vendorName && (
                <p className="text-sm font-semibold text-blue-900 mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 inline-block">
                  {vendorName}
                </p>
              )}
            </div>
            <div className="shrink-0 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 self-start">
              <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <UserCircle className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SPOC</p>
                <p className="text-sm font-bold text-slate-800">{npd.spoc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Committed date banner */}
        {dispatchDate && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">Your committed dispatch date</p>
              <p className="text-lg font-bold text-amber-700 mt-0.5">{dispatchDate}</p>
            </div>
          </div>
        )}

        {/* Status form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">Dispatch Status Confirmation</h2>
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <p className="text-sm font-semibold text-slate-800 mb-3">
                Will you be able to dispatch by the committed date{dispatchDate ? ` (${dispatchDate})` : ""}?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOnTime(true)}
                  className={`flex-1 rounded-xl border-2 py-3 font-semibold text-sm transition-colors ${
                    onTime === true
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                  }`}
                >
                  ✓ Yes, on track
                </button>
                <button
                  type="button"
                  onClick={() => setOnTime(false)}
                  className={`flex-1 rounded-xl border-2 py-3 font-semibold text-sm transition-colors ${
                    onTime === false
                      ? "border-amber-500 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-amber-300"
                  }`}
                >
                  ✗ No, need to reschedule
                </button>
              </div>
            </div>

            {onTime === false && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Proposed New Dispatch Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason / Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Raw material delay, tooling issue, etc."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500 resize-none"
                  />
                </div>
              </div>
            )}

            {onTime === true && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Additional Notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any updates for the Amber team…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={onTime === null}
                className="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white text-sm font-semibold rounded-xl px-6 py-3 transition-colors"
              >
                Submit Status Update
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
