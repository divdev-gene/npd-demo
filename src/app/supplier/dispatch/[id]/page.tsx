"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { mockNPDs, type NPDRecord } from "@/lib/mockData"
import {
  CheckCircle, CheckCircle2, UploadCloud, Truck, UserCircle,
} from "lucide-react"

const DISPATCH_SUBMITTED_KEY = "supplier_dispatch_submitted_v1"

export default function SupplierDispatchPage() {
  const params  = useParams()
  const npdId   = params.id as string

  const [npd,          setNpd]          = useState<NPDRecord | null>(null)
  const [vendorName,   setVendorName]   = useState("")
  const [proofDoc,     setProofDoc]     = useState("")
  const [submitted,    setSubmitted]    = useState(false)
  const [dispatchDate, setDispatchDate] = useState("")

  useEffect(() => {
    const qp     = new URLSearchParams(window.location.search)
    const vendor = qp.get("vendor") ?? ""
    setVendorName(vendor)

    const stored  = localStorage.getItem("npd_records_v1")
    const records: NPDRecord[] = stored ? JSON.parse(stored) : mockNPDs
    const found   = records.find(n => n.id === npdId) ?? mockNPDs.find(n => n.id === npdId) ?? mockNPDs[0]
    setNpd(found)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDispatchDate(tomorrow.toISOString().split("T")[0])

    const raw = localStorage.getItem(DISPATCH_SUBMITTED_KEY)
    const all: Record<string, boolean> = raw ? JSON.parse(raw) : {}
    if (all[npdId]) setSubmitted(true)
  }, [npdId])

  const handleDispatch = () => {
    const raw = localStorage.getItem(DISPATCH_SUBMITTED_KEY)
    const all: Record<string, { vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string }> =
      raw ? JSON.parse(raw) : {}
    all[npdId] = {
      vendorName,
      dispatchDate,
      docs: [proofDoc],
      submittedAt: new Date().toLocaleString("en-IN"),
    }
    localStorage.setItem(DISPATCH_SUBMITTED_KEY, JSON.stringify(all))
    setSubmitted(true)
  }

  if (!npd) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center py-14 px-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <Truck className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Dispatch Confirmed</h2>
          <p className="text-slate-500 text-sm">
            {vendorName && <><strong>{vendorName}</strong>'s </>}
            dispatch details for <strong>{npdId}</strong> have been submitted.
            The Sourcing SPOC will be notified.
          </p>
          <p className="text-xs text-slate-400 mt-4">You may close this window.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-3">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/amber-logo.png" alt="Amber" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-sm font-bold text-slate-700">Supplier Dispatch Portal</span>
          </div>
          <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
            Supplier Defence
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* NPD summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <span className="inline-block text-[10px] font-bold tracking-widest bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full mb-3">
                {npd.id}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{npd.itemName}</h1>
              <p className="text-sm text-slate-500">{npd.itemCategory} · {npd.productLine}</p>
              {vendorName && (
                <p className="text-sm font-semibold text-orange-900 mt-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5 inline-block">
                  Dispatching as: {vendorName}
                </p>
              )}
            </div>
            <div className="shrink-0 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 self-start">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <UserCircle className="w-6 h-6 text-teal-700" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sourcing SPOC</p>
                <p className="text-sm font-bold text-slate-800">{npd.spoc}</p>
                <p className="text-xs text-slate-400">{npd.productLine}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Proof of Dispatch upload */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-orange-500" /> Proof of Dispatch
          </h2>
          <p className="text-sm text-slate-500">
            Upload one document confirming dispatch — a challan, receipt, or shipping confirmation.
          </p>
          <div
            onClick={() => setProofDoc(prev => prev ? "" : `dispatch_proof_${npdId}.pdf`)}
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
              proofDoc
                ? "border-emerald-400 bg-emerald-50"
                : "border-slate-300 hover:border-orange-400 hover:bg-orange-50/40"
            }`}
          >
            {proofDoc ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-emerald-700">{proofDoc}</p>
                <p className="text-xs text-emerald-500">Click to remove</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="w-10 h-10 text-slate-300 mb-1" />
                <p className="text-sm font-semibold text-slate-600">Click to upload</p>
                <p className="text-xs text-slate-400">Challan / Receipt / Shipping confirmation · PDF, JPG, PNG</p>
              </div>
            )}
          </div>
        </div>

        {/* Dispatch date + submit */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-500" /> Dispatch Details
          </h2>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">
              Confirmed Dispatch Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dispatchDate}
              onChange={e => setDispatchDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-400 max-w-xs"
            />
          </div>

          {proofDoc ? (
            <button
              onClick={handleDispatch}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl px-6 py-3 transition-colors flex items-center justify-center gap-2"
            >
              <Truck className="w-5 h-5" /> Confirm Dispatch
            </button>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <p className="text-sm text-slate-400">Upload proof of dispatch to confirm.</p>
            </div>
          )}

          {proofDoc && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4" /> Document ready — confirm dispatch above.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
