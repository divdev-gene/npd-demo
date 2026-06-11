"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Send, ExternalLink, CheckCircle2, RefreshCw, FileText, Package } from "lucide-react"
import type { NTDRFQVendor } from "@/types/ntd"
import {
  getNTDRecord, getNTDInitiation, getNTDSpec, getNTDRFQ,
  getNTDQuotation, setNTDQuotation, appendActivity,
} from "@/lib/ntd"
import { SupplierPortalShell } from "@/components/SupplierPortalShell"

export default function VendorRFQPage() {
  const params = useParams()
  const ntdId = params.ntdId as string
  const vendorToken = params.vendorToken as string

  const [vendor, setVendor] = useState<NTDRFQVendor | null>(null)
  const [vendorId, setVendorId] = useState("")

  // Quote form fields
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [leadTime, setLeadTime] = useState("")
  const [docLink, setDocLink] = useState("")
  const [notes, setNotes] = useState("")
  const [counterNote, setCounterNote] = useState("")

  // UI state
  const [showCounterForm, setShowCounterForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false) // pause polling while user types
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const rfq = getNTDRFQ(ntdId)
    if (!rfq) return
    const entry = Object.entries(rfq.vendors).find(([, v]) => v.token === vendorToken)
    if (entry) { setVendorId(entry[0]); setVendor(entry[1]) }
    // Poll for sourcing counter-offers, but skip ticks while user is typing
    const t = setInterval(() => { if (!isEditing) setTick(n => n + 1) }, 3000)
    return () => clearInterval(t)
  }, [ntdId, vendorToken, isEditing])

  if (!vendor) return (
    <SupplierPortalShell portalLabel="Vendor RFQ Portal" maxWidth="3xl">
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-slate-800">Invalid or expired link</p>
          <p className="text-sm text-slate-500">Contact your procurement point of contact.</p>
        </div>
      </div>
    </SupplierPortalShell>
  )

  const record = getNTDRecord(ntdId)
  const initData = getNTDInitiation(ntdId)
  const specData = getNTDSpec(ntdId)
  const quotationData = getNTDQuotation(ntdId)
  const vendorQ = quotationData?.[vendorId]
  const isFinalized = vendorQ?.status === "finalized"

  // Latest sourcing counter (most recent internal message with a counter_offer)
  const latestSourcingCounter = vendorQ?.thread
    ? [...vendorQ.thread].reverse().find(m => m.author_type === "internal" && m.counter_offer)
    : undefined

  // Collect reference files for the combined card
  const partSpecLinks: { label: string; link: string }[] = (initData?.part_specs ?? []).flatMap(f => {
    const link = f.versions.find(v => v.version_no === f.current_version)?.link ?? ""
    return link ? [{ label: f.slot_name, link }] : []
  })
  const specSheetLink = specData?.spec_sheet
    ? specData.spec_sheet.versions.find(v => v.version_no === specData.spec_sheet.current_version)?.link ?? ""
    : ""
  const hasReferenceFiles = partSpecLinks.length > 0 || !!specSheetLink

  const handleSubmitInitialQuote = () => {
    if (!amount || !leadTime) return
    const existing = quotationData ?? {}
    const now = new Date().toISOString()
    setNTDQuotation(ntdId, {
      ...existing,
      [vendorId]: {
        quotation: {
          amount: Number(amount),
          currency,
          lead_time_days: Number(leadTime),
          doc_link: docLink,
          notes,
          submitted_at: now,
          last_updated_at: now,
        },
        thread: vendorQ?.thread ?? [],
        status: "quotation_received",
      }
    })
    appendActivity(ntdId, vendor.vendor_name, "vendor", 4, "quotation_submitted",
      `Initial quote submitted: ${currency} ${Number(amount).toLocaleString()}`, { vendor_id: vendorId })
    setAmount(""); setLeadTime(""); setDocLink(""); setNotes("")
    setTick(n => n + 1)
  }

  const handleSubmitCounter = () => {
    if (!amount) return
    const existing = quotationData ?? {}
    const q = existing[vendorId] ?? { quotation: undefined, thread: [], status: "sent" as const }
    const now = new Date().toISOString()
    const msgText = counterNote.trim() || `Counter quote: ${currency} ${Number(amount).toLocaleString()}`
    setNTDQuotation(ntdId, {
      ...existing,
      [vendorId]: {
        quotation: {
          ...q.quotation!,
          amount: Number(amount),
          currency,
          lead_time_days: leadTime ? Number(leadTime) : q.quotation?.lead_time_days ?? 0,
          doc_link: (docLink || q.quotation?.doc_link) ?? "",
          notes: (counterNote || q.quotation?.notes) ?? "",
          submitted_at: q.quotation?.submitted_at ?? now,
          last_updated_at: now,
        },
        thread: [...q.thread, {
          message_id: String(Date.now()),
          author_name: vendor.vendor_name,
          author_type: "vendor",
          text: msgText,
          counter_offer: Number(amount),
          created_at: now,
        }],
        status: "negotiating",
      }
    })
    appendActivity(ntdId, vendor.vendor_name, "vendor", 4, "negotiation_round",
      `Vendor counter: ${currency} ${Number(amount).toLocaleString()}`, { vendor_id: vendorId })
    setAmount(""); setLeadTime(""); setDocLink(""); setCounterNote("")
    setShowCounterForm(false)
    setTick(n => n + 1)
  }

  return (
    <SupplierPortalShell portalLabel="Vendor RFQ Portal" maxWidth="3xl">

      {/* ── Title / welcome strip ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Request for Quotation</p>
        <h1 className="text-xl font-bold text-slate-900 leading-snug">{record?.title ?? ntdId}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome, <span className="font-semibold text-slate-700">{vendor.vendor_name}</span> — please review the reference documents below and submit your quotation.
        </p>
      </div>

      {/* ── Combined reference files card ── */}
      {hasReferenceFiles && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-700">Reference Documents</h2>
          </div>

          {partSpecLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Part Spec Files</p>
              <div className="flex flex-wrap gap-2">
                {partSpecLinks.map(({ label, link }) => (
                  <a key={label} href={link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-400 hover:text-slate-900 px-3 py-1.5 rounded-full shadow-sm transition-colors">
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {specSheetLink && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Spec Sheet</p>
              <a href={specSheetLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-400 hover:text-slate-900 px-3 py-1.5 rounded-full shadow-sm transition-colors">
                <ExternalLink className="w-3 h-3 text-slate-400" />
                Spec Sheet v{specData?.spec_sheet.current_version}
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Commodity scope + component list ── */}
      {(() => {
        const myCommodityComponents = (initData?.components ?? []).filter(c => c.commodity === vendor.commodity)
        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-700">Scope of This RFQ</h2>
            </div>

            {/* Commodity badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Commodity:</span>
              <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                {vendor.commodity}
              </span>
            </div>

            {/* Component table */}
            {myCommodityComponents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Components ({myCommodityComponents.length})
                </p>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-500 w-20">ID</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Component Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myCommodityComponents.map(comp => (
                        <tr key={comp.componentId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-semibold text-slate-600">{comp.componentId}</td>
                          <td className="px-4 py-2.5 text-slate-800">{comp.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-400">
                  Your quotation should cover all {myCommodityComponents.length} component{myCommodityComponents.length !== 1 ? "s" : ""} listed above.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Component details will be available once the tool design is finalized.</p>
            )}
          </div>
        )
      })()}

      {/* ── Main quotation / negotiation card ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card header */}
        <div className={`px-6 py-4 border-b border-slate-100 ${isFinalized ? "bg-emerald-50" : ""}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              {isFinalized ? "Quotation Finalized" : vendorQ?.quotation ? "Quotation & Negotiation" : "Submit Your Quotation"}
            </h2>
            {vendorQ?.quotation && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                isFinalized ? "bg-emerald-100 text-emerald-700"
                : vendorQ.status === "negotiating" ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"}`}>
                {isFinalized ? "Finalized ✓" : vendorQ.status === "negotiating" ? "Negotiating" : "Quote received"}
              </span>
            )}
          </div>
          {vendorQ?.quotation && (
            <p className="text-xs text-slate-500 mt-1">
              Current quote: <span className="font-semibold text-slate-700">{vendorQ.quotation.currency} {vendorQ.quotation.amount.toLocaleString()}</span>
              {" · "}{vendorQ.quotation.lead_time_days} days lead time
            </p>
          )}
        </div>

        {isFinalized ? (
          <div className="px-6 py-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800">
                Finalized at {vendorQ?.quotation?.currency} {vendorQ?.quotation?.amount?.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">This negotiation is closed. Thank you.</p>
            </div>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-5">

            {/* Sourcing counter offer banner */}
            {latestSourcingCounter && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
                <RefreshCw className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Sourcing Counter Offer</p>
                  <p className="text-xl font-bold text-blue-900">
                    {vendorQ?.quotation?.currency ?? "INR"} {latestSourcingCounter.counter_offer!.toLocaleString()}
                  </p>
                  {latestSourcingCounter.text && (
                    <p className="text-xs text-blue-700 mt-1 italic">"{latestSourcingCounter.text}"</p>
                  )}
                  {!showCounterForm && (
                    <button onClick={() => { setShowCounterForm(true); setAmount(String(latestSourcingCounter.counter_offer ?? "")) }}
                      className="mt-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-lg transition-colors">
                      Respond with Counter Quote
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Initial quotation form */}
            {!vendorQ?.quotation && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input type="text" inputMode="numeric" autoComplete="off"
                      value={amount} onChange={e => setAmount(e.target.value)}
                      onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white">
                      <option>INR</option><option>USD</option><option>EUR</option><option>CNY</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Lead Time (days) <span className="text-red-500">*</span>
                  </label>
                  <input type="text" inputMode="numeric" autoComplete="off"
                    value={leadTime} onChange={e => setLeadTime(e.target.value)}
                    onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                    placeholder="e.g. 30"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Quote Document Link</label>
                  <input type="text" autoComplete="off"
                    value={docLink} onChange={e => setDocLink(e.target.value)}
                    onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                    placeholder="Drive / SharePoint link"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    autoComplete="off"
                    onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
                </div>
                <button onClick={handleSubmitInitialQuote} disabled={!amount || !leadTime}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors">
                  <Send className="w-4 h-4" /> Submit Quotation
                </button>
              </div>
            )}

            {/* Counter quote form (shown after sourcing counters or vendor clicks "Respond") */}
            {vendorQ?.quotation && showCounterForm && (
              <div className="space-y-4 border border-amber-200 bg-amber-50 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-amber-900">Submit Counter Quote</p>
                  <button onClick={() => setShowCounterForm(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-amber-800">
                      Your Price <span className="text-red-500">*</span>
                    </label>
                    <input type="text" inputMode="numeric" autoComplete="off"
                      value={amount} onChange={e => setAmount(e.target.value)}
                      onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                      placeholder="Counter amount"
                      className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-amber-800">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                      <option>INR</option><option>USD</option><option>EUR</option><option>CNY</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-amber-800">Lead Time (days)</label>
                  <input type="text" inputMode="numeric" autoComplete="off"
                    value={leadTime} onChange={e => setLeadTime(e.target.value)}
                    onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                    placeholder={String(vendorQ.quotation.lead_time_days)}
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-amber-800">Note to Sourcing</label>
                  <textarea value={counterNote} onChange={e => setCounterNote(e.target.value)} rows={2}
                    autoComplete="off"
                    onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                    placeholder="Explain your counter offer..."
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                </div>
                <button onClick={handleSubmitCounter} disabled={!amount}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:bg-amber-200 disabled:text-amber-400 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors">
                  <Send className="w-4 h-4" /> Submit Counter Quote
                </button>
              </div>
            )}

            {/* "Update quote" button when vendor has submitted but no active counter form */}
            {vendorQ?.quotation && !showCounterForm && !latestSourcingCounter && (
              <button onClick={() => setShowCounterForm(true)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors">
                Update / Revise Your Quote
              </button>
            )}

            {/* Negotiation thread */}
            {vendorQ && vendorQ.thread.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Negotiation Thread</p>
                <div className="space-y-2 max-h-56 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-2">
                  {vendorQ.thread.map(msg => (
                    <div key={msg.message_id}
                      className={`rounded-lg px-3 py-2 text-xs w-fit max-w-[85%] space-y-1 ${
                        msg.author_type === "internal"
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-200 text-slate-800 ml-auto"
                      }`}>
                      <p className={`text-[9px] font-bold ${msg.author_type === "internal" ? "text-slate-400" : "text-slate-400"}`}>
                        {msg.author_type === "internal" ? "Sourcing" : "You"}
                        {" · "}{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p>{msg.text}</p>
                      {msg.counter_offer && (
                        <p className={`font-bold ${msg.author_type === "internal" ? "text-slate-300" : "text-amber-700"}`}>
                          Counter: {vendorQ.quotation?.currency ?? "INR"} {msg.counter_offer.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SupplierPortalShell>
  )
}
