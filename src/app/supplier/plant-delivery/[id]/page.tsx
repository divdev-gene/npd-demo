"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  mockNPDs, PLANT_SUPPLIER_RESP_KEY, PART_ASSIGNMENT_KEY, DELIVERY_DETAILS_KEY,
  type NPDRecord, SPOC_CONTACTS, DEFAULT_RND_CONTACT, VENDOR_CATALOG, type ContactInfo,
} from "@/lib/mockData"
import {
  CheckCircle2, Package, UserCircle, Mail, Phone, MapPin,
} from "lucide-react"
import { SupplierPortalShell } from "@/components/SupplierPortalShell"

function EmailCard({ to, subject, body }: { to: string; subject: string; body: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden text-left">
      <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-300 truncate">To: {to}</span>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(`To: ${to}\nSubject: ${subject}\n\n${body.replace(/<[^>]+>/g, "")}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="shrink-0 text-[10px] font-semibold text-slate-400 hover:text-white flex items-center gap-1"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="px-4 py-3 space-y-1">
        <p className="text-[11px] font-bold text-slate-500 truncate">{subject}</p>
        <div className="text-[12px] text-slate-700 leading-relaxed space-y-1.5 pt-1" dangerouslySetInnerHTML={{ __html: body }} />
      </div>
    </div>
  )
}

export default function SupplierPlantDeliveryPage() {
  const params  = useParams()
  const npdId   = params.id as string

  const [npd,              setNpd]              = useState<NPDRecord | null>(null)
  const [vendorName,       setVendorName]       = useState("")
  const [partNumber,       setPartNumber]       = useState("")
  const [deliveryLocation, setDeliveryLocation] = useState("")
  const [requiredQty,      setRequiredQty]      = useState("")
  const [deliveryDate,     setDeliveryDate]     = useState("")
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [justSubmitted,    setJustSubmitted]    = useState(false)

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

    const rawDetails = localStorage.getItem(DELIVERY_DETAILS_KEY)
    const allDetails: Record<string, { location: string; requiredQty: string; setAt: string }> = rawDetails ? JSON.parse(rawDetails) : {}
    if (allDetails[npdId]) {
      setDeliveryLocation(allDetails[npdId].location)
      setRequiredQty(allDetails[npdId].requiredQty)
    }

    const rawResp = localStorage.getItem(PLANT_SUPPLIER_RESP_KEY)
    const allResp: Record<string, { deliveryDate: string; sampleQty: number; submittedAt: string }> = rawResp ? JSON.parse(rawResp) : {}
    if (allResp[npdId]) {
      setDeliveryDate(allResp[npdId].deliveryDate)
      setAlreadySubmitted(true)
    }
  }, [npdId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliveryDate) return
    const all: Record<string, { deliveryDate: string; sampleQty: number; submittedAt: string }> =
      JSON.parse(localStorage.getItem(PLANT_SUPPLIER_RESP_KEY) ?? "{}")
    all[npdId] = {
      deliveryDate,
      sampleQty: parseInt(requiredQty) || 0,
      submittedAt: new Date().toLocaleString("en-IN"),
    }
    localStorage.setItem(PLANT_SUPPLIER_RESP_KEY, JSON.stringify(all))
    setJustSubmitted(true)
    setAlreadySubmitted(true)
  }

  if (!npd) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading…</p>
    </div>
  )

  if (justSubmitted || alreadySubmitted) {
    const spocContact: ContactInfo = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
    const allCatalogV = Object.values(VENDOR_CATALOG).flat()
    const vendorRec   = allCatalogV.find(v => v.name === vendorName)
    const vendorSpoc  = vendorRec?.spocName ?? vendorName
    const deliveryDateFormatted = deliveryDate
      ? new Date(deliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : deliveryDate
    const detailTable = `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px">${partNumber ? `<tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;width:40%">Part Number</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">${partNumber}</td></tr>` : ""}<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">NPD ID</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npdId}</td></tr><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${vendorName}</td></tr>${deliveryLocation ? `<tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Delivery Location</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${deliveryLocation}</td></tr>` : ""}${requiredQty ? `<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Required Qty</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${requiredQty} pcs</td></tr>` : ""}<tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Confirmed Delivery Date</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:#059669">${deliveryDateFormatted}</td></tr></table>`
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-lg w-full py-10 px-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Delivery Date Confirmed</h2>
            <p className="text-sm text-slate-500 mt-1">
              Your delivery date has been submitted. The Amber sourcing team has been notified.
            </p>
          </div>

          {/* Email to Sourcing SPOC */}
          <EmailCard
            to={spocContact.name}
            subject={`Delivery Date Confirmed — ${npd.itemName} (${npdId})`}
            body={`<p>Dear <strong>${spocContact.name}</strong>,</p><p><strong>${vendorName}</strong> has confirmed their delivery date for <em>${npd.itemName}</em> (${npdId}).</p>${detailTable}<p>Kindly coordinate receipt and update the NPD record accordingly.</p><p>Regards,<br/><strong>${vendorSpoc}</strong><br/><span style="color:#64748b;font-size:12px">${vendorName}</span></p>`}
          />

          {/* Email to R&D Contact */}
          <EmailCard
            to={DEFAULT_RND_CONTACT.name}
            subject={`Delivery Date Confirmed — ${npd.itemName} (${npdId})`}
            body={`<p>Dear <strong>${DEFAULT_RND_CONTACT.name}</strong>,</p><p><strong>${vendorName}</strong> has confirmed their delivery date for <em>${npd.itemName}</em> (${npdId}).</p>${detailTable}<p>Please be prepared to accept the delivery and initiate the acceptance process on arrival.</p><p>Regards,<br/><strong>${vendorSpoc}</strong><br/><span style="color:#64748b;font-size:12px">${vendorName}</span></p>`}
          />

          <p className="text-xs text-slate-400 text-center">You may close this window.</p>
        </div>
      </div>
    )
  }

  const spocContact: ContactInfo = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "—", phone: "—" }
  const rndContact: ContactInfo  = DEFAULT_RND_CONTACT

  return (
    <SupplierPortalShell portalLabel="Plant Delivery" maxWidth="4xl">

        {/* NPD Hero */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[10px] font-bold tracking-widest bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full mb-3">
                {npdId}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{npd.itemName}</h1>
              <p className="text-sm text-slate-500">{npd.itemCategory} · {npd.productLine}</p>
              {vendorName && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Delivering From</p>
                  <p className="text-sm font-semibold text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 inline-block">
                    {vendorName}
                  </p>
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
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3 shrink-0" />{rndContact.email}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{rndContact.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                  <UserCircle className="w-5 h-5 text-teal-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sourcing Representative</p>
                  <p className="text-sm font-bold text-slate-800">{spocContact.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3 shrink-0" />{spocContact.email}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{spocContact.phone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery requirements (set by sourcing) */}
        {(deliveryLocation || requiredQty || partNumber) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
            <p className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <Package className="w-4 h-4" /> Delivery Requirements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {partNumber && (
                <div className="bg-white rounded-lg border border-blue-100 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Part Number</p>
                  <p className="text-sm font-mono font-bold text-blue-800 mt-0.5">{partNumber}</p>
                </div>
              )}
              {deliveryLocation && (
                <div className="bg-white rounded-lg border border-blue-100 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Location</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />{deliveryLocation}
                  </p>
                </div>
              )}
              {requiredQty && (
                <div className="bg-white rounded-lg border border-blue-100 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Required Qty</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{requiredQty} pcs</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Date confirmation form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Confirm Your Delivery Date</h2>
          <p className="text-sm text-slate-500 mb-6">
            Please confirm the date on which you will deliver the samples to the specified location.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5 max-w-xs">
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
            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={!deliveryDate}
                className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
              >
                Confirm Delivery Date
              </button>
            </div>
          </form>
          <p className="text-xs text-slate-400 text-center mt-4">
            Your confirmed delivery date will be shared with the plant and sourcing team.
          </p>
        </div>
    </SupplierPortalShell>
  )
}
