"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Send, ExternalLink } from "lucide-react"
import type { NTDRFQVendor } from "@/types/ntd"
import {
  getNTDRecord, getNTDInitiation, getNTDSpec, getNTDRFQ,
  getNTDQuotation, setNTDQuotation, appendActivity,
} from "@/lib/ntd"

export default function VendorRFQPage() {
  const params = useParams()
  const ntdId = params.ntdId as string
  const vendorToken = params.vendorToken as string

  const [vendor, setVendor] = useState<NTDRFQVendor | null>(null)
  const [vendorId, setVendorId] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [leadTime, setLeadTime] = useState("")
  const [docLink, setDocLink] = useState("")
  const [notes, setNotes] = useState("")
  const [reply, setReply] = useState("")
  const [counterOffer, setCounterOffer] = useState("")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const rfq = getNTDRFQ(ntdId)
    if (!rfq) return
    const entry = Object.entries(rfq.vendors).find(([, v]) => v.token === vendorToken)
    if (entry) {
      setVendorId(entry[0])
      setVendor(entry[1])
    }
    const t = setInterval(() => {
      const q = getNTDQuotation(ntdId)
      if (q?.[entry?.[0] ?? ""]?.quotation) setSubmitted(true)
    }, 3000)
    return () => clearInterval(t)
  }, [ntdId, vendorToken])

  if (!vendor) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-lg font-bold text-slate-800">Invalid or expired link</p>
        <p className="text-sm text-slate-500">This RFQ link is not valid. Please contact your procurement contact.</p>
      </div>
    </div>
  )

  const record = getNTDRecord(ntdId)
  const initData = getNTDInitiation(ntdId)
  const specData = getNTDSpec(ntdId)
  const quotationData = getNTDQuotation(ntdId)
  const vendorQuotation = quotationData?.[vendorId]
  const isFinalized = vendorQuotation?.status === "finalized"

  const handleSubmitQuotation = () => {
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
        thread: vendorQuotation?.thread ?? [],
        status: "quotation_received",
      }
    })
    appendActivity(ntdId, vendor?.vendor_name ?? "supplier", "vendor", 4, "quotation_submitted", `Quotation submitted by ${vendor?.vendor_name}`, { vendor_id: vendorId })
    setSubmitted(true)
  }

  const handleSendReply = () => {
    if (!reply.trim()) return
    const existing = quotationData ?? {}
    const q = existing[vendorId] ?? { quotation: undefined, thread: [], status: "sent" as const }
    setNTDQuotation(ntdId, {
      ...existing,
      [vendorId]: {
        ...q,
        thread: [...q.thread, {
          message_id: String(Date.now()),
          author_name: vendor?.vendor_name ?? "Vendor",
          author_type: "vendor",
          text: reply,
          counter_offer: counterOffer ? Number(counterOffer) : undefined,
          created_at: new Date().toISOString(),
        }],
        status: "negotiating",
      }
    })
    setReply("")
    setCounterOffer("")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-900 text-white px-6 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Vendor Portal — RFQ</p>
        <h1 className="text-lg font-bold mt-0.5">{record?.title ?? ntdId}</h1>
        <p className="text-sm text-blue-300">Welcome, {vendor.vendor_name}</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Part spec files */}
        {initData && initData.part_specs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">Part Spec Files</h2>
            {initData.part_specs.map(f => {
              const link = f.versions.find(v => v.version_no === f.current_version)?.link ?? ""
              return (
                <a key={f.file_id} href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> {f.slot_name}
                </a>
              )
            })}
          </div>
        )}

        {/* Spec sheet */}
        {specData?.spec_sheet && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-2">
            <h2 className="font-semibold text-slate-800">Spec Sheet</h2>
            {(() => {
              const link = specData.spec_sheet.versions.find(v => v.version_no === specData.spec_sheet.current_version)?.link ?? ""
              return link ? (
                <a href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> View Spec Sheet v{specData.spec_sheet.current_version}
                </a>
              ) : null
            })()}
          </div>
        )}

        {/* Quotation form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">
            {vendorQuotation?.quotation ? "Your Quotation" : "Submit Quotation"}
          </h2>
          {isFinalized ? (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-sm text-slate-500">This quotation has been finalized. No further changes.</p>
            </div>
          ) : vendorQuotation?.quotation && submitted ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase">Amount</p>
                  <p className="font-bold text-slate-800">{vendorQuotation.quotation.currency} {vendorQuotation.quotation.amount.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase">Lead Time</p>
                  <p className="font-bold text-slate-800">{vendorQuotation.quotation.lead_time_days} days</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">Submitted. Awaiting internal review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Amount</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option>INR</option><option>USD</option><option>EUR</option><option>CNY</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Lead Time (days)</label>
                <input type="number" value={leadTime} onChange={e => setLeadTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Quote Document Link</label>
                <input type="url" value={docLink} onChange={e => setDocLink(e.target.value)}
                  placeholder="Drive / SharePoint link"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
              <button onClick={handleSubmitQuotation} disabled={!amount || !leadTime}
                className="flex items-center gap-2 text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
                <Send className="w-4 h-4" /> Submit Quotation
              </button>
            </div>
          )}
        </div>

        {/* Thread */}
        {vendorQuotation && vendorQuotation.thread.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">Messages</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {vendorQuotation.thread.map(msg => (
                <div key={msg.message_id}
                  className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${msg.author_type === "internal" ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-800 ml-auto"}`}>
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{msg.author_name}
                    {msg.counter_offer ? ` — Counter: ${msg.counter_offer}` : ""}
                  </p>
                  {msg.text}
                </div>
              ))}
            </div>
            {!isFinalized && (
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <input type="text" placeholder="Your reply..." value={reply} onChange={e => setReply(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="number" placeholder="Counter offer" value={counterOffer} onChange={e => setCounterOffer(e.target.value)}
                  className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={handleSendReply} disabled={!reply.trim()}
                  className="text-sm font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
