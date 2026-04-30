"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { mockNPDs, PLANT_SUPPLIER_RESP_KEY, PART_ASSIGNMENT_KEY, type NPDRecord } from "@/lib/mockData"
import { CheckCircle, Package } from "lucide-react"

export default function SupplierPlantDeliveryPage() {
  const params  = useParams()
  const npdId   = params.id as string

  const [npd,          setNpd]         = useState<NPDRecord | null>(null)
  const [vendorName,   setVendorName]  = useState("")
  const [partNumber,   setPartNumber]  = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [sampleQty,    setSampleQty]   = useState("")
  const [submitted,    setSubmitted]   = useState(false)

  useEffect(() => {
    const qp     = new URLSearchParams(window.location.search)
    const vendor = qp.get("vendor") ?? ""
    setVendorName(vendor)

    const stored  = localStorage.getItem("npd_records_v1")
    const records: NPDRecord[] = stored ? JSON.parse(stored) : mockNPDs
    const found   = records.find(n => n.id === npdId) ?? mockNPDs.find(n => n.id === npdId) ?? mockNPDs[0]
    setNpd(found)

    // Load assigned part number
    const rawPart = localStorage.getItem(PART_ASSIGNMENT_KEY)
    const allPart: Record<string, { partNumber: string; assignedAt: string }> = rawPart ? JSON.parse(rawPart) : {}
    if (allPart[npdId]) setPartNumber(allPart[npdId].partNumber)

    // Check if already submitted
    const rawResp = localStorage.getItem(PLANT_SUPPLIER_RESP_KEY)
    const allResp: Record<string, { deliveryDate: string; sampleQty: number; submittedAt: string }> = rawResp ? JSON.parse(rawResp) : {}
    if (allResp[npdId]) {
      setDeliveryDate(allResp[npdId].deliveryDate)
      setSampleQty(String(allResp[npdId].sampleQty))
      setSubmitted(true)
    }
  }, [npdId])

  const handleSubmit = () => {
    if (!deliveryDate || !sampleQty) return
    const all: Record<string, { deliveryDate: string; sampleQty: number; submittedAt: string }> = JSON.parse(localStorage.getItem(PLANT_SUPPLIER_RESP_KEY) ?? "{}")
    all[npdId] = {
      deliveryDate,
      sampleQty: parseInt(sampleQty),
      submittedAt: new Date().toLocaleString("en-IN"),
    }
    localStorage.setItem(PLANT_SUPPLIER_RESP_KEY, JSON.stringify(all))
    setSubmitted(true)
  }

  if (!npd) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading…</div>

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div className="bg-orange-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Amber Enterprises</p>
                <p className="text-white font-bold text-base leading-tight">Plant Delivery Confirmation</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 space-y-1.5 border-b border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">NPD ID</span>
              <span className="font-mono font-bold text-slate-800">{npdId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Item</span>
              <span className="font-semibold text-slate-800 text-right max-w-[220px]">{npd.itemName}</span>
            </div>
            {vendorName && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Vendor</span>
                <span className="font-semibold text-slate-800">{vendorName}</span>
              </div>
            )}
            {partNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Part Number</span>
                <span className="font-mono font-bold text-orange-700">{partNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-slate-800">Delivery Details Submitted</p>
              <p className="text-sm text-slate-500 mt-1">Thank you. Our plant team has been notified.</p>
              <div className="mt-4 bg-slate-50 rounded-xl p-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Delivery Date</span>
                  <span className="font-semibold text-slate-800">{deliveryDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Sample Qty</span>
                  <span className="font-semibold text-slate-800">{sampleQty} pcs</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-bold text-slate-800 mb-0.5">Confirm Delivery Details</p>
                <p className="text-xs text-slate-500">Please provide the expected delivery date and number of samples you will deliver.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Delivery Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Number of Samples (pcs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={sampleQty}
                    onChange={e => setSampleQty(e.target.value)}
                    placeholder="e.g. 5"
                    min="1"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-slate-50"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!deliveryDate || !sampleQty}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Submit Delivery Details
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">Amber Enterprises Supplier Portal · Confidential</p>
      </div>
    </div>
  )
}
