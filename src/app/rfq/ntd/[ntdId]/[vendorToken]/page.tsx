"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Send, ExternalLink, CheckCircle2, RefreshCw, FileText, Package, Paperclip, X } from "lucide-react"
import type { NTDRFQVendor, NTDCommodity } from "@/types/ntd"
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

  // Per-component pricing (stage / Progressive / semi-Progressive per component)
  const [compPrices, setCompPrices] = useState<Record<string, { stage: string; Progressive: string; semiProg: string }>>({})

  // Counter quote / other form fields
  const [amount, setAmount] = useState("")       // used only in counter-quote form
  const [currency, setCurrency] = useState("INR")
  const [leadTime, setLeadTime] = useState("")
  const [docLink, setDocLink] = useState("")
  const [docFileName, setDocFileName] = useState("")
  const [notes, setNotes] = useState("")
  const [counterNote, setCounterNote] = useState("")

  const readFileAsDataURL = (file: File, onDone: (dataUrl: string, name: string) => void) => {
    if (file.size > 8 * 1024 * 1024) { alert("File too large (max 8 MB). Use a Drive link instead."); return }
    const reader = new FileReader()
    reader.onload = () => onDone(reader.result as string, file.name)
    reader.readAsDataURL(file)
  }

  const [showCounterForm, setShowCounterForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [tick, setTick] = useState(0)

  const setCompPrice = (compId: string, field: "stage" | "Progressive" | "semiProg", val: string) => {
    setCompPrices(prev => ({
      ...prev,
      [compId]: { ...(prev[compId] ?? { stage: "", Progressive: "", semiProg: "" }), [field]: val },
    }))
  }

  useEffect(() => {
    const rfq = getNTDRFQ(ntdId)
    if (!rfq) return
    const entry = Object.entries(rfq.vendors).find(([, v]) => v.token === vendorToken)
    if (entry) { setVendorId(entry[0]); setVendor(entry[1]) }
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
  const hasSemiProgressive = initData?.semi_Progressive?.[vendor.commodity as NTDCommodity] ?? false
  const hideStage = vendor.commodity === "Plastics" || vendor.commodity === "EPS"

  // Components scoped to this vendor's commodity
  const myCommodityComponents = (initData?.components ?? []).filter(
    c => c.commodity === vendor.commodity && c.status !== "merged"
  )

  // Computed pricing totals from per-component inputs
  const totalStage = myCommodityComponents.reduce((s, c) => s + (Number(compPrices[c.componentId]?.stage) || 0), 0)
  const totalProgressive = myCommodityComponents.reduce((s, c) => s + (Number(compPrices[c.componentId]?.Progressive) || 0), 0)
  const totalSemiProg = hasSemiProgressive
    ? myCommodityComponents.reduce((s, c) => s + (Number(compPrices[c.componentId]?.semiProg) || 0), 0)
    : 0
  const grandTotal = (hideStage ? 0 : totalStage) + totalProgressive + (hasSemiProgressive ? totalSemiProg : 0)

  // Check all required component fields are filled
  const allCompsFilled = myCommodityComponents.length > 0 && myCommodityComponents.every(c => {
    const cp = compPrices[c.componentId]
    return (!hideStage ? !!cp?.stage : true) && !!cp?.Progressive && (!hasSemiProgressive || !!cp?.semiProg)
  })

  const latestSourcingCounter = vendorQ?.thread
    ? [...vendorQ.thread].reverse().find(m => m.author_type === "internal" && m.counter_offer)
    : undefined

  // Reference file links
  const partSpecLinks: { label: string; link: string }[] = (initData?.part_specs ?? []).flatMap(f => {
    const link = f.versions.find(v => v.version_no === f.current_version)?.link ?? ""
    return link ? [{ label: f.slot_name, link }] : []
  })
  const specSheetLink = specData?.spec_sheet
    ? specData.spec_sheet.versions.find(v => v.version_no === specData.spec_sheet.current_version)?.link ?? ""
    : ""
  const commodityTechSpec = initData?.tech_spec_sheets?.[vendor.commodity as NTDCommodity]
  const hasReferenceFiles = partSpecLinks.length > 0 || !!specSheetLink || !!commodityTechSpec

  const handleSubmitInitialQuote = () => {
    if (!leadTime || !allCompsFilled) return
    const hasSP = hasSemiProgressive
    const now = new Date().toISOString()

    const componentPricesData: Record<string, { stage: number; Progressive: number; semi_Progressive?: number }> = {}
    for (const comp of myCommodityComponents) {
      const cp = compPrices[comp.componentId]
      componentPricesData[comp.componentId] = {
        stage: Number(cp?.stage ?? 0),
        Progressive: Number(cp?.Progressive ?? 0),
        ...(hasSP ? { semi_Progressive: Number(cp?.semiProg ?? 0) } : {}),
      }
    }

    const existing = quotationData ?? {}
    setNTDQuotation(ntdId, {
      ...existing,
      [vendorId]: {
        quotation: {
          amount: grandTotal,
          currency,
          lead_time_days: Number(leadTime),
          stage_price: totalStage,
          Progressive_price: totalProgressive,
          ...(hasSP ? { semi_Progressive_price: totalSemiProg } : {}),
          component_prices: componentPricesData,
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
      `Initial quote submitted: ${currency} ${grandTotal.toLocaleString()}`, { vendor_id: vendorId })
    setCompPrices({})
    setLeadTime(""); setDocLink(""); setDocFileName(""); setNotes("")
    setTick(n => n + 1)
  }

  const handleSubmitCounter = () => {
    if (!allCompsFilled) return
    const hasSP = hasSemiProgressive
    const existing = quotationData ?? {}
    const q = existing[vendorId] ?? { quotation: undefined, thread: [], status: "sent" as const }
    const now = new Date().toISOString()

    const componentPricesData: Record<string, { stage: number; Progressive: number; semi_Progressive?: number }> = {}
    for (const comp of myCommodityComponents) {
      const cp = compPrices[comp.componentId]
      componentPricesData[comp.componentId] = {
        stage: Number(cp?.stage ?? 0),
        Progressive: Number(cp?.Progressive ?? 0),
        ...(hasSP ? { semi_Progressive: Number(cp?.semiProg ?? 0) } : {}),
      }
    }

    const newTotal = grandTotal
    const msgText = counterNote.trim() || `Revised quote: ${currency} ${newTotal.toLocaleString()}`
    setNTDQuotation(ntdId, {
      ...existing,
      [vendorId]: {
        quotation: {
          ...q.quotation!,
          amount: newTotal,
          currency,
          lead_time_days: leadTime ? Number(leadTime) : q.quotation?.lead_time_days ?? 0,
          stage_price: totalStage,
          Progressive_price: totalProgressive,
          ...(hasSP ? { semi_Progressive_price: totalSemiProg } : {}),
          component_prices: componentPricesData,
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
          counter_offer: newTotal,
          created_at: now,
        }],
        status: "negotiating",
      }
    })
    appendActivity(ntdId, vendor.vendor_name, "vendor", 4, "negotiation_round",
      `Vendor revised quote: ${currency} ${newTotal.toLocaleString()}`, { vendor_id: vendorId })
    setCompPrices({}); setLeadTime(""); setDocLink(""); setCounterNote("")
    setShowCounterForm(false)
    setTick(n => n + 1)
  }

  return (
    <SupplierPortalShell portalLabel="Vendor RFQ Portal" maxWidth="4xl">

      {/* ── Title strip ── */}
      <div className="bg-white rounded-xl border border-slate-200 border-l-[3px] border-l-slate-900 shadow-sm px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">
            Request for Quotation
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 leading-snug">{record?.title ?? ntdId}</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Welcome, <span className="font-semibold text-slate-700">{vendor.vendor_name}</span> — review the reference documents and submit your quotation per component below.
        </p>
      </div>

      {/* ── Reference Documents ── */}
      {hasReferenceFiles && (
        <div className={`rounded-xl border shadow-sm px-6 py-5 space-y-5 ${commodityTechSpec ? "bg-amber-50/40 border-amber-100" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-700">Reference Documents</h2>
          </div>

          {/* Commodity tech spec sheet (Stage 1) — shown first and prominently */}
          {commodityTechSpec && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                {vendor.commodity} — Tech Spec Sheet
              </p>
              <a href={commodityTechSpec.link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-400 px-4 py-2.5 rounded-xl shadow-sm transition-colors">
                <ExternalLink className="w-4 h-4 text-amber-500 shrink-0" />
                {commodityTechSpec.file_name}
                <span className="ml-1 text-[10px] font-bold bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full">Latest</span>
              </a>
            </div>
          )}

          {/* RFQ spec sheet (Stage 2) + Part spec files (Stage 1) — grouped */}
          {(specSheetLink || partSpecLinks.length > 0) && (
            <div className="space-y-3 pt-1 border-t border-slate-200/60">
              {specSheetLink && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">RFQ Spec Sheet</p>
                  <a href={specSheetLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-400 hover:text-slate-900 px-3 py-1.5 rounded-full shadow-sm transition-colors">
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                    Spec Sheet v{specData?.spec_sheet.current_version}
                  </a>
                </div>
              )}
              {partSpecLinks.length > 0 && (
                <div className="space-y-1.5">
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
            </div>
          )}
        </div>
      )}

      {/* ── Scope card — commodity + component list ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700">Scope of This RFQ</h2>
          <span className="ml-auto inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wide">
            {vendor.commodity}
          </span>
        </div>
        {myCommodityComponents.length > 0 ? (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 w-16">ID</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Component Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myCommodityComponents.map(comp => (
                  <tr key={comp.componentId} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-500 tabular-nums">{comp.componentId}</td>
                    <td className="px-4 py-2.5 text-slate-800 font-medium">{comp.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Component details will be available once the tool design is finalized.</p>
        )}
      </div>

      {/* ── Main quotation card ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                {isFinalized ? "Finalized" : vendorQ.status === "negotiating" ? "Negotiating" : "Quote received"}
              </span>
            )}
          </div>
          {vendorQ?.quotation && (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-xs text-slate-500">
                Total: <span className="font-semibold text-slate-700">{vendorQ.quotation.currency} {vendorQ.quotation.amount.toLocaleString()}</span>
                {" · "}{vendorQ.quotation.lead_time_days} days lead time
              </p>
              {vendorQ.quotation.stage_price != null && (
                <p className="text-[11px] text-slate-400">
                  {`Stage: ${vendorQ.quotation.currency} ${vendorQ.quotation.stage_price.toLocaleString()} · Progressive: ${vendorQ.quotation.currency} ${vendorQ.quotation.Progressive_price?.toLocaleString() ?? "—"}${vendorQ.quotation.semi_Progressive_price != null ? ` · Semi-Prog: ${vendorQ.quotation.currency} ${vendorQ.quotation.semi_Progressive_price.toLocaleString()}` : ""}`}
                </p>
              )}
            </div>
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

            {/* ── Initial quotation form ── */}
            {!vendorQ?.quotation && myCommodityComponents.length > 0 && (
              <div className="space-y-5">
                {/* Currency + Lead Time */}
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white">
                      <option>INR</option><option>USD</option><option>EUR</option><option>CNY</option>
                    </select>
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
                </div>

                {/* ── Per-component pricing — unified table ── */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Component Prices <span className="font-normal text-slate-400">({currency})</span>
                    </p>
                    {hasSemiProgressive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                        Semi-Prog required
                      </span>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className={`px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide bg-slate-50 ${!hideStage ? "w-[38%]" : ""}`}>
                            Component
                          </th>
                          {!hideStage && (
                            <th className="px-3 py-2 text-right text-[10px] font-bold text-blue-700 bg-blue-50/70 border-l border-blue-100 uppercase tracking-wide">
                              Stage
                            </th>
                          )}
                          <th className="px-3 py-2 text-right text-[10px] font-bold text-amber-700 bg-amber-50/70 border-l border-amber-100 uppercase tracking-wide">
                            Progressive
                          </th>
                          {hasSemiProgressive && (
                            <th className="px-3 py-2 text-right text-[10px] font-bold text-indigo-700 bg-indigo-50/70 border-l border-indigo-100 uppercase tracking-wide">
                              Semi-Progressive
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myCommodityComponents.map(comp => (
                          <tr key={comp.componentId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-2 bg-white">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[9px] font-bold text-slate-300 tabular-nums shrink-0">{comp.componentId}</span>
                                <span className="font-medium text-slate-700 text-[11px] truncate">{comp.name}</span>
                              </div>
                            </td>
                            {!hideStage && (
                              <td className="px-2 py-1.5 border-l border-blue-50 bg-blue-50/10">
                                <input type="text" inputMode="numeric" autoComplete="off"
                                  value={compPrices[comp.componentId]?.stage ?? ""}
                                  onChange={e => setCompPrice(comp.componentId, "stage", e.target.value)}
                                  onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                                  placeholder="0"
                                  className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-right text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                              </td>
                            )}
                            <td className="px-2 py-1.5 border-l border-amber-50 bg-amber-50/10">
                              <input type="text" inputMode="numeric" autoComplete="off"
                                value={compPrices[comp.componentId]?.Progressive ?? ""}
                                onChange={e => setCompPrice(comp.componentId, "Progressive", e.target.value)}
                                onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                                placeholder="0"
                                className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-right text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                            </td>
                            {hasSemiProgressive && (
                              <td className="px-2 py-1.5 border-l border-indigo-50 bg-indigo-50/10">
                                <input type="text" inputMode="numeric" autoComplete="off"
                                  value={compPrices[comp.componentId]?.semiProg ?? ""}
                                  onChange={e => setCompPrice(comp.componentId, "semiProg", e.target.value)}
                                  onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                                  placeholder="0"
                                  className="w-full rounded border border-indigo-200 bg-white px-2 py-1 text-right text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Subtotals</td>
                          {!hideStage && (
                            <td className="px-3 py-2 text-right border-l border-blue-100 bg-blue-50/40">
                              <span className="text-[11px] font-bold text-blue-700 tabular-nums">
                                {totalStage > 0 ? totalStage.toLocaleString() : <span className="text-slate-300 font-normal">—</span>}
                              </span>
                            </td>
                          )}
                          <td className="px-3 py-2 text-right border-l border-amber-100 bg-amber-50/40">
                            <span className="text-[11px] font-bold text-amber-700 tabular-nums">
                              {totalProgressive > 0 ? totalProgressive.toLocaleString() : <span className="text-slate-300 font-normal">—</span>}
                            </span>
                          </td>
                          {hasSemiProgressive && (
                            <td className="px-3 py-2 text-right border-l border-indigo-100 bg-indigo-50/40">
                              <span className="text-[11px] font-bold text-indigo-700 tabular-nums">
                                {totalSemiProg > 0 ? totalSemiProg.toLocaleString() : <span className="text-slate-300 font-normal">—</span>}
                              </span>
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Grand total strip — always visible, transitions to dark when filled */}
                  <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    allCompsFilled ? "bg-slate-900 border-slate-900 shadow" : "bg-slate-100 border-slate-200"
                  }`}>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest leading-none text-slate-400">Grand Total</p>
                      <p className="text-[9px] mt-0.5 text-slate-500">
                        {hideStage ? "Progressive" : "Stage + Progressive"}{hasSemiProgressive ? " + Semi" : ""}
                      </p>
                    </div>
                    <span className={`text-lg font-bold tabular-nums ${allCompsFilled ? "text-white" : "text-slate-300"}`}>
                      {allCompsFilled ? `${currency} ${grandTotal.toLocaleString()}` : `${currency} —`}
                    </span>
                  </div>
                </div>

                {/* Doc link */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Quote Document</label>
                  <div className="flex gap-2">
                    {docFileName ? (
                      <div className="flex-1 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-sm text-blue-700 truncate flex-1">{docFileName}</span>
                        <button type="button" onClick={() => { setDocLink(""); setDocFileName("") }}
                          className="text-slate-400 hover:text-slate-600 shrink-0"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <input type="text" autoComplete="off"
                        value={docLink} onChange={e => { setDocLink(e.target.value); setDocFileName("") }}
                        onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                        placeholder="Drive / SharePoint link"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                    )}
                    <label className="cursor-pointer flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-700 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors shrink-0">
                      <Paperclip className="w-3.5 h-3.5" />
                      <input type="file" className="sr-only"
                        onChange={e => { const f = e.target.files?.[0]; if (f) readFileAsDataURL(f, (url, name) => { setDocLink(url); setDocFileName(name) }) }} />
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    autoComplete="off"
                    onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleSubmitInitialQuote}
                    disabled={!leadTime || !allCompsFilled}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors">
                    <Send className="w-4 h-4" />
                    Submit Quotation
                  </button>
                  {(!leadTime || !allCompsFilled) && (
                    <p className="text-[11px] text-slate-400 text-center mt-2">
                      Fill in all component prices and lead time to submit.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Counter quote form — white card with amber left-border accent */}
            {vendorQ?.quotation && showCounterForm && (
              <div className="border border-slate-200 border-l-4 border-l-amber-500 rounded-xl bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                    <p className="text-xs font-bold text-amber-900">Revise Quote</p>
                  </div>
                  <button onClick={() => { setShowCounterForm(false); setCompPrices({}) }}
                    className="text-[10px] text-slate-400 hover:text-slate-700 transition-colors">Cancel</button>
                </div>

                <div className="px-4 py-3 space-y-3">
                {/* Lead time + currency row */}
                <div className="flex gap-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-amber-800">Lead Time (days)</label>
                    <input type="text" inputMode="numeric" autoComplete="off"
                      value={leadTime} onChange={e => setLeadTime(e.target.value)}
                      onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                      placeholder={String(vendorQ.quotation.lead_time_days)}
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

                {/* Per-component pricing table — same structure as initial quote */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Revised Component Prices ({currency})
                  </p>
                  <div className="rounded-xl border border-amber-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-amber-200">
                          <th className="px-3 py-2.5 text-left font-semibold text-slate-500 bg-amber-50/60">Component</th>
                          {!hideStage && (
                            <th className="px-3 py-2.5 text-right font-bold text-blue-700 bg-blue-50 border-l border-blue-100">
                              <span className="block text-[10px] uppercase tracking-wider leading-tight">Stage</span>
                              <span className="text-[9px] font-normal text-blue-400">{currency}</span>
                            </th>
                          )}
                          <th className="px-3 py-2.5 text-right font-bold text-amber-700 bg-amber-100 border-l border-amber-200">
                            <span className="block text-[10px] uppercase tracking-wider leading-tight">Progressive</span>
                            <span className="text-[9px] font-normal text-amber-500">{currency}</span>
                          </th>
                          {hasSemiProgressive && (
                            <th className="px-3 py-2.5 text-right font-bold text-indigo-700 bg-indigo-50 border-l border-indigo-100">
                              <span className="block text-[10px] uppercase tracking-wider leading-tight">Semi-Progressive</span>
                              <span className="text-[9px] font-normal text-indigo-400">{currency}</span>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100 bg-white">
                        {myCommodityComponents.map(comp => {
                          const prevCp = vendorQ.quotation?.component_prices?.[comp.componentId]
                          return (
                            <tr key={comp.componentId} className="hover:bg-amber-50/40 transition-colors">
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">{comp.componentId}</span>
                                  <span className="text-sm font-medium text-slate-700 truncate">{comp.name}</span>
                                </div>
                              </td>
                              {!hideStage && (
                                <td className="px-3 py-2 border-l border-blue-50 bg-blue-50/20">
                                  <input type="text" inputMode="numeric" autoComplete="off"
                                    value={compPrices[comp.componentId]?.stage ?? ""}
                                    onChange={e => setCompPrice(comp.componentId, "stage", e.target.value)}
                                    onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                                    placeholder={String(prevCp?.stage ?? 0)}
                                    className="w-full rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                </td>
                              )}
                              <td className="px-3 py-2 border-l border-amber-100 bg-amber-50/20">
                                <input type="text" inputMode="numeric" autoComplete="off"
                                  value={compPrices[comp.componentId]?.Progressive ?? ""}
                                  onChange={e => setCompPrice(comp.componentId, "Progressive", e.target.value)}
                                  onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                                  placeholder={String(prevCp?.Progressive ?? 0)}
                                  className="w-full rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400" />
                              </td>
                              {hasSemiProgressive && (
                                <td className="px-3 py-2 border-l border-indigo-50 bg-indigo-50/20">
                                  <input type="text" inputMode="numeric" autoComplete="off"
                                    value={compPrices[comp.componentId]?.semiProg ?? ""}
                                    onChange={e => setCompPrice(comp.componentId, "semiProg", e.target.value)}
                                    onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                                    placeholder={String(prevCp?.semi_Progressive ?? 0)}
                                    className="w-full rounded-md border border-indigo-200 bg-indigo-50/60 px-2.5 py-1.5 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-amber-200">
                          <td className="px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-amber-50/60">Total</td>
                          {!hideStage && (
                            <td className="px-3 py-2.5 text-right border-l border-blue-100 bg-blue-50">
                              <span className="text-sm font-bold text-blue-700 tabular-nums">{totalStage > 0 ? `${currency} ${totalStage.toLocaleString()}` : "—"}</span>
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-right border-l border-amber-200 bg-amber-100">
                            <span className="text-sm font-bold text-amber-700 tabular-nums">{totalProgressive > 0 ? `${currency} ${totalProgressive.toLocaleString()}` : "—"}</span>
                          </td>
                          {hasSemiProgressive && (
                            <td className="px-3 py-2.5 text-right border-l border-indigo-100 bg-indigo-50">
                              <span className="text-sm font-bold text-indigo-700 tabular-nums">{totalSemiProg > 0 ? `${currency} ${totalSemiProg.toLocaleString()}` : "—"}</span>
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {allCompsFilled && (
                    <div className="flex items-center justify-between px-4 py-3 bg-amber-600 rounded-xl">
                      <span className="text-xs font-bold text-amber-100 uppercase tracking-wider">Revised Grand Total</span>
                      <span className="text-base font-bold text-white tabular-nums">{currency} {grandTotal.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Note to sourcing */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-amber-800">Note to Sourcing</label>
                  <textarea value={counterNote} onChange={e => setCounterNote(e.target.value)} rows={2}
                    autoComplete="off"
                    onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}
                    placeholder="Explain your revision..."
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                </div>

                <button onClick={handleSubmitCounter} disabled={!allCompsFilled}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:bg-amber-200 disabled:text-amber-400 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors">
                  <Send className="w-4 h-4" /> Submit Revised Quote
                </button>
                {!allCompsFilled && (
                  <p className="text-[11px] text-amber-700 text-center">Fill in all component prices to submit.</p>
                )}
                </div>{/* end px-4 py-3 space-y-3 */}
              </div>
            )}

            {/* Revise quote button — compact, secondary action */}
            {vendorQ?.quotation && !showCounterForm && !latestSourcingCounter && (
              <button
                onClick={() => {
                  const existing = vendorQ.quotation!.component_prices ?? {}
                  const prefilled: Record<string, { stage: string; Progressive: string; semiProg: string }> = {}
                  for (const comp of myCommodityComponents) {
                    const cp = existing[comp.componentId]
                    prefilled[comp.componentId] = {
                      stage: cp ? String(cp.stage) : "",
                      Progressive: cp ? String(cp.Progressive) : "",
                      semiProg: cp ? String(cp.semi_Progressive ?? "") : "",
                    }
                  }
                  setCompPrices(prefilled)
                  setCurrency(vendorQ.quotation!.currency)
                  setShowCounterForm(true)
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors">
                <RefreshCw className="w-3 h-3" />
                Revise Quote
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
                      <p className="text-[9px] font-bold text-slate-400">
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
