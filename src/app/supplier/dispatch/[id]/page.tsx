"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { fetchVendors, type VmsVendor } from "@/lib/vendors"
import { mockNPDs, SPOC_CONTACTS, DEFAULT_RND_CONTACT, MULTI_DISPATCH_KEY, type NPDRecord } from "@/lib/mockData"
import {
  CheckCircle, CheckCircle2, UploadCloud, Truck, UserCircle, Mail,
} from "lucide-react"
import { SupplierPortalShell } from "@/components/SupplierPortalShell"

const DISPATCH_SUBMITTED_KEY = "supplier_dispatch_submitted_v1"

export default function SupplierDispatchPage() {
  const params  = useParams()
  const npdId   = params.id as string

  const [npd,          setNpd]          = useState<NPDRecord | null>(null)
  const [vendorName,   setVendorName]   = useState("")
  const [proofDoc,     setProofDoc]     = useState("")
  const [submitted,    setSubmitted]    = useState(false)
  const [allVendors, setAllVendors] = useState<VmsVendor[]>([])
  useEffect(() => { fetchVendors().then(setAllVendors) }, [])
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

    // Check multi-vendor key scoped to this vendor (not the flat legacy key)
    const rawMulti = localStorage.getItem(MULTI_DISPATCH_KEY)
    const allMulti: Record<string, Record<string, unknown>> = rawMulti ? JSON.parse(rawMulti) : {}
    if (vendor && allMulti[npdId]?.[vendor]) setSubmitted(true)
  }, [npdId])

  const handleDispatch = () => {
    const submittedAt = new Date().toLocaleString("en-IN")
    const dispatchRecord = { vendorName, dispatchDate, docs: proofDoc ? [proofDoc] : [], submittedAt }

    // Write to legacy key (backward compat)
    const raw = localStorage.getItem(DISPATCH_SUBMITTED_KEY)
    const all: Record<string, typeof dispatchRecord> = raw ? JSON.parse(raw) : {}
    all[npdId] = dispatchRecord
    localStorage.setItem(DISPATCH_SUBMITTED_KEY, JSON.stringify(all))

    // Write to multi-vendor key keyed by vendorName
    const rawMulti = localStorage.getItem(MULTI_DISPATCH_KEY)
    const allMulti: Record<string, Record<string, { dispatchDate: string; docs: string[]; submittedAt: string }>> =
      rawMulti ? JSON.parse(rawMulti) : {}
    if (!allMulti[npdId]) allMulti[npdId] = {}
    allMulti[npdId][vendorName] = { dispatchDate, docs: dispatchRecord.docs, submittedAt }
    localStorage.setItem(MULTI_DISPATCH_KEY, JSON.stringify(allMulti))

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
    const spocContact = npd ? (SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }) : { name: "", email: "", phone: "" }
    const vendorRec   = allVendors.find(v => v.company_name === vendorName)
    const vendorSpoc  = vendorRec?.contact_person_name ?? vendorName
    const etaFormatted = dispatchDate ? new Date(dispatchDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Not specified"
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-lg w-full py-10 px-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Truck className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Dispatch Confirmed</h2>
            <p className="text-sm text-slate-500 mt-1">
              Your dispatch details have been submitted. The Amber team has been notified.
            </p>
          </div>

          {/* Email to Sourcing */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email 1 — Sourcing SPOC</span>
            </div>
            <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
              <p><strong>To:</strong> {spocContact.name}{spocContact.email ? ` (${spocContact.email})` : ""}</p>
              <p><strong>Subject:</strong> Dispatch Confirmed — {npd?.itemName} ({npdId})</p>
              <hr className="border-slate-200" />
              <p>Dear {spocContact.name},</p>
              <p><strong>{vendorName}</strong> has confirmed dispatch of samples for <em>{npd?.itemName}</em> ({npdId}).</p>
              <p><strong>NPD ID:</strong> {npdId}</p>
              <p><strong>Item:</strong> {npd?.itemName}</p>
              <p><strong>Commodity:</strong> {npd?.itemCategory}</p>
              <p><strong>Expected Arrival (ETA):</strong> {etaFormatted}</p>
              {proofDoc && <p><strong>Proof of Dispatch:</strong> {proofDoc}</p>}
              <p>Kindly coordinate receipt and initiate R&amp;D evaluation upon arrival.</p>
              <p className="pt-1">Regards,<br /><strong>{vendorSpoc}</strong><br /><span className="text-slate-500">{vendorName}</span></p>
            </div>
          </div>

          {/* Email to R&D */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email 2 — R&amp;D Team</span>
            </div>
            <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
              <p><strong>To:</strong> {DEFAULT_RND_CONTACT.name} ({DEFAULT_RND_CONTACT.email})</p>
              <p><strong>Subject:</strong> Samples Dispatched — {npd?.itemName} ({npdId})</p>
              <hr className="border-slate-200" />
              <p>Dear {DEFAULT_RND_CONTACT.name},</p>
              <p><strong>{vendorName}</strong> has dispatched samples for <em>{npd?.itemName}</em> ({npdId}) and they are expected to arrive by <strong>{etaFormatted}</strong>.</p>
              <p><strong>NPD ID:</strong> {npdId}</p>
              <p><strong>Item:</strong> {npd?.itemName}</p>
              <p><strong>Commodity:</strong> {npd?.itemCategory}</p>
              <p><strong>Supplier:</strong> {vendorName}</p>
              <p><strong>Expected Arrival (ETA):</strong> {etaFormatted}</p>
              {proofDoc && <p><strong>Proof of Dispatch:</strong> {proofDoc}</p>}
              <p>Please prepare for sample receipt and initiate evaluation on arrival.</p>
              <p className="pt-1">Regards,<br /><strong>{vendorSpoc}</strong><br /><span className="text-slate-500">{vendorName}</span></p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">You may close this window.</p>
        </div>
      </div>
    )
  }

  return (
    <SupplierPortalShell portalLabel="Sample Dispatch">

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

        {/* ETA + submit */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-500" /> Dispatch Details
          </h2>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">
              Expected Arrival Date at Amber (ETA) <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-400 mb-2">When do you expect the samples to arrive at the Amber R&amp;D facility?</p>
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
    </SupplierPortalShell>
  )
}
