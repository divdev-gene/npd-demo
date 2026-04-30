"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  mockNPDs, PLANT_SUPPLIER_RESP_KEY, PART_ASSIGNMENT_KEY, type NPDRecord,
  SPOC_CONTACTS, DEFAULT_RND_CONTACT, type ContactInfo,
} from "@/lib/mockData"
import {
  CheckCircle2, Package, UserCircle, Mail, Phone,
} from "lucide-react"

export default function SupplierPlantDeliveryPage() {
  const params  = useParams()
  const npdId   = params.id as string

  const [npd,           setNpd]          = useState<NPDRecord | null>(null)
  const [vendorName,    setVendorName]   = useState("")
  const [partNumber,    setPartNumber]   = useState("")
  const [deliveryDate,  setDeliveryDate] = useState("")
  const [sampleQty,     setSampleQty]   = useState("")
  const [justSubmitted, setJustSubmitted] = useState(false)

  useEffect(() => {
    const qp     = new URLSearchParams(window.location.search)
    const vendor = qp.get("vendor") ?? ""
    setVendorName(vendor)

    const stored  = localStorage.getItem("npd_records_v1")
    const records: NPDRecord[] = stored ? JSON.parse(stored) : mockNPDs
    const found   = records.find(n => n.id === npdId) ?? mockNPDs.find(n => n.id === npdId) ?? mockNPDs[0]
    setNpd(found)

    const rawPart = localStorage.getItem(PART_ASSIGNMENT_KEY)
    const allPart: Record<string, { partNumber: string; assignedAt: string }> = rawPart ? JSON.parse(rawPart) : {}
    if (allPart[npdId]) setPartNumber(allPart[npdId].partNumber)

    const rawResp = localStorage.getItem(PLANT_SUPPLIER_RESP_KEY)
    const allResp: Record<string, { deliveryDate: string; sampleQty: number; submittedAt: string }> = rawResp ? JSON.parse(rawResp) : {}
    if (allResp[npdId]) {
      setDeliveryDate(allResp[npdId].deliveryDate)
      setSampleQty(String(allResp[npdId].sampleQty))
    }
  }, [npdId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliveryDate || !sampleQty) return
    const all: Record<string, { deliveryDate: string; sampleQty: number; submittedAt: string }> = JSON.parse(localStorage.getItem(PLANT_SUPPLIER_RESP_KEY) ?? "{}")
    all[npdId] = {
      deliveryDate,
      sampleQty: parseInt(sampleQty),
      submittedAt: new Date().toLocaleString("en-IN"),
    }
    localStorage.setItem(PLANT_SUPPLIER_RESP_KEY, JSON.stringify(all))
    setJustSubmitted(true)
  }

  if (!npd) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading…</p>
    </div>
  )

  /* ─── Submitted confirmation ─── */
  if (justSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center py-14 px-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Delivery Details Submitted</h2>
          <p className="text-slate-500 text-sm">
            Thank you. Our plant team has been notified and will confirm receipt.
          </p>
          <div className="mt-5 bg-slate-50 rounded-xl p-4 text-left space-y-2 border border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Delivery Date</span>
              <span className="font-semibold text-slate-800">{deliveryDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Sample Qty</span>
              <span className="font-semibold text-slate-800">{sampleQty} pcs</span>
            </div>
            {partNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Part Number</span>
                <span className="font-mono font-bold text-blue-800">{partNumber}</span>
              </div>
            )}
          </div>
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
            <span className="text-sm font-bold text-slate-700">Supplier Delivery Portal</span>
          </div>
          {partNumber && (
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
              <Package className="w-3.5 h-3.5" />
              Part No: {partNumber}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* NPD Hero */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Part info */}
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[10px] font-bold tracking-widest bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full mb-3">
                {npdId}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{npd.itemName}</h1>
              <p className="text-sm text-slate-500">
                <span className="text-slate-400">Category:</span> {npd.itemCategory} · {npd.productLine}
              </p>
              {vendorName && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Delivery From</p>
                  <p className="text-sm font-semibold text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 inline-block">
                    {vendorName}
                  </p>
                </div>
              )}
            </div>

            {/* Contacts */}
            <div className="shrink-0 md:w-72 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Key Contacts</p>
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

        {/* Delivery form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Confirm Delivery Details</h2>
          <p className="text-sm text-slate-500 mb-6">
            Please provide the expected delivery date and the number of samples you will be delivering to our plant.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Number of Samples (pcs) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={sampleQty}
                  onChange={e => setSampleQty(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={!deliveryDate || !sampleQty}
                className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
              >
                Submit Delivery Details
              </button>
            </div>
          </form>
          <p className="text-xs text-slate-400 text-center mt-4">
            Note: Your confirmed delivery schedule will be shared with the plant and R&amp;D team.
          </p>
        </div>
      </main>
    </div>
  )
}
