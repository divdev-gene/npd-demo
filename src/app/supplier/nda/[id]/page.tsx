"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { mockNPDs, NDA_STATUS_KEY, type NPDRecord } from "@/lib/mockData"
import { CheckCircle2, ShieldCheck, FileText, Building2, Mail } from "lucide-react"


const NDA_TEXT = `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into between Amber Enterprises India Limited ("Disclosing Party") and the Supplier identified below ("Receiving Party").

1. PURPOSE
The Disclosing Party intends to share confidential technical information, drawings, specifications, and requirements ("Confidential Information") related to a New Product Development (NPD) project solely for the purpose of evaluating feasibility and submitting a commercial proposal.

2. CONFIDENTIALITY OBLIGATIONS
The Receiving Party agrees to:
(a) Keep all Confidential Information strictly confidential and not disclose it to any third party without prior written consent.
(b) Use the Confidential Information solely for the purpose described above.
(c) Limit access to employees who have a need-to-know and are bound by equivalent confidentiality obligations.
(d) Not reverse engineer, copy, or reproduce any drawings, specifications, or proprietary designs.

3. EXCLUSIONS
This Agreement does not apply to information that is publicly available, independently developed, or lawfully obtained from a third party without restriction.

4. RETURN OF INFORMATION
Upon request, the Receiving Party shall promptly return or destroy all Confidential Information and certify destruction in writing.

5. TERM
This Agreement remains in effect for three (3) years from the date of signing or until the Confidential Information enters the public domain, whichever is earlier.

6. REMEDIES
The Receiving Party acknowledges that breach of this Agreement may cause irreparable harm and that Amber Enterprises shall be entitled to seek injunctive relief in addition to any other available remedies.

7. GOVERNING LAW
This Agreement shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in New Delhi.

By digitally signing below, the Receiving Party agrees to be bound by the terms of this Agreement.`

export default function SupplierNdaPage() {
  const params = useParams()
  const router = useRouter()
  const npdId = params.id as string

  const [npd, setNpd] = useState<NPDRecord | null>(null)
  const [vendorName, setVendorName] = useState("")
  const [signerName, setSignerName] = useState("")
  const [designation, setDesignation] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadySigned, setAlreadySigned] = useState(false)
  const [signedAt, setSignedAt] = useState("")
  const [countdown, setCountdown] = useState(5)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [])

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search)
    const vendor = qp.get("vendor") ?? ""
    setVendorName(vendor)

    const stored = localStorage.getItem("npd_records_v1")
    const records: NPDRecord[] = stored ? JSON.parse(stored) : mockNPDs
    const found = records.find(n => n.id === npdId) ?? mockNPDs.find(n => n.id === npdId) ?? null
    setNpd(found)

    if (vendor) {
      const rawNda = localStorage.getItem(NDA_STATUS_KEY)
      const allNda: Record<string, Record<string, { signed: boolean; signedBy?: string; signedAt?: string }>> = rawNda ? JSON.parse(rawNda) : {}
      const status = allNda[npdId]?.[vendor]
      if (status?.signed) {
        setAlreadySigned(true)
        setSignedAt(status.signedAt ?? "")
        // Populate signerName from stored value so the confirmation email greets correctly
        if (status.signedBy) setSignerName(status.signedBy.split(" (")[0])
      }
    }
  }, [npdId])

  const handleSign = () => {
    if (!signerName.trim() || !agreed) return
    const now = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    const rawNda = localStorage.getItem(NDA_STATUS_KEY)
    const allNda: Record<string, Record<string, { signed: boolean; signedBy?: string; signedAt?: string }>> = rawNda ? JSON.parse(rawNda) : {}
    if (!allNda[npdId]) allNda[npdId] = {}
    allNda[npdId][vendorName] = { signed: true, signedBy: `${signerName.trim()}${designation.trim() ? ` (${designation.trim()})` : ""}`, signedAt: now }
    localStorage.setItem(NDA_STATUS_KEY, JSON.stringify(allNda))
    setSubmitted(true)
    setSignedAt(now)

    // Auto-redirect to supplier portal after countdown
    let count = 5
    countdownRef.current = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        clearInterval(countdownRef.current!)
        router.push(`/supplier/quote/${npdId}?vendor=${encodeURIComponent(vendorName)}`)
      }
    }, 1000)
  }

  if (!npd) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (alreadySigned || submitted) {
    const displayName = signerName || vendorName

    // Email to the vendor: NDA acknowledgement
    const vendorEmailSubject = `NDA Acknowledged — Amber Enterprises India Limited`
    const vendorEmailBody = `<p>Dear <strong>${displayName}</strong>,</p><p>Thank you for signing the Non-Disclosure Agreement with <strong>Amber Enterprises India Limited</strong>. Your digital signature has been successfully recorded on <strong>${signedAt}</strong>.</p><p>You are now authorised to receive confidential project specifications from our team. Our sourcing team will be in touch with further details shortly.</p><p>We look forward to working with you on this project.</p><p>Regards,<br/><strong>Sourcing Team</strong><br/><span style="color:#64748b;font-size:12px">Amber Enterprises India Limited</span></p>`

    // Email to Amber sourcing: vendor has signed
    const sourcingEmailSubject = `NDA Signed — ${vendorName}`
    const sourcingEmailBody = `<p>Dear <strong>${npd?.spoc ?? "Sourcing Team"}</strong>,</p><p>This is to inform you that <strong>${vendorName}</strong> has successfully signed the Non-Disclosure Agreement.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px"><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;width:40%">Vendor</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${vendorName}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Signed By</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${displayName}</td></tr><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Signed At</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${signedAt}</td></tr></table><p>You may now proceed with sharing the project specifications with this vendor.</p><p>Regards,<br/><strong>${displayName}</strong><br/><span style="color:#64748b;font-size:12px">${vendorName}</span></p>`

    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Confirmation card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mx-auto">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">NDA Signed</h1>
              <p className="text-sm text-slate-500 mt-1">
                {alreadySigned && !submitted
                  ? "This NDA has already been signed for your organisation."
                  : "Thank you. Your digital signature has been recorded."}
              </p>
              {submitted && (
                <p className="text-xs text-blue-600 font-semibold mt-2">
                  Redirecting to the project portal in {countdown}s…
                </p>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-left space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between"><span className="text-slate-400">Vendor</span><strong className="max-w-[200px] truncate text-right">{vendorName}</strong></div>
              <div className="flex justify-between"><span className="text-slate-400">Disclosing Party</span><strong>Amber Enterprises India Limited</strong></div>
              {signedAt && <div className="flex justify-between"><span className="text-slate-400">Signed At</span><strong>{signedAt}</strong></div>}
            </div>
          </div>

          {/* Email to vendor */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Your Confirmation Email</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[10px] text-slate-400 shrink-0">To: {vendorName} ·</span>
                <span className="text-xs font-semibold text-white truncate">{vendorEmailSubject}</span>
              </div>
              <div className="px-5 py-4 text-sm text-slate-900 leading-relaxed bg-white [&_p]:mb-3 [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: vendorEmailBody }} />
            </div>
          </div>

          {/* Email to Amber sourcing */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Notification Sent to Amber Sourcing</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[10px] text-slate-400 shrink-0">To: Amber Sourcing ·</span>
                <span className="text-xs font-semibold text-white truncate">{sourcingEmailSubject}</span>
              </div>
              <div className="px-5 py-4 text-sm text-slate-900 leading-relaxed bg-white [&_p]:mb-3 [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: sourcingEmailBody }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-900 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Amber Enterprises · Supplier NDA Portal</p>
              <h1 className="text-xl font-bold text-slate-900">Non-Disclosure Agreement</h1>
              <p className="text-sm text-slate-500 mt-1">
                Please read the agreement carefully and sign digitally to proceed.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between"><span className="text-slate-400">Vendor</span><strong className="max-w-[240px] truncate text-right">{vendorName || "—"}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">Disclosing Party</span><strong>Amber Enterprises India Limited</strong></div>
          </div>
        </div>

        {/* NDA Document */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-white">Confidentiality Agreement — Amber Enterprises India Limited</span>
          </div>
          <div className="p-6 max-h-80 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{NDA_TEXT}</pre>
          </div>
        </div>

        {/* Signature Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700">Digital Signature</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block">
                Authorised Signatory Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Full name of authorised representative"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block">
                Designation / Title
              </label>
              <input
                type="text"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                placeholder="e.g. Director, Head of Sales"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div onClick={() => setAgreed(v => !v)} className="flex items-start gap-3 cursor-pointer group">
              <div className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${agreed ? "bg-blue-900 border-blue-900" : "border-slate-300 group-hover:border-blue-400"}`}>
                {agreed && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className="text-sm text-slate-700 leading-relaxed select-none">
                I, <strong>{signerName || "___________"}</strong>, on behalf of <strong>{vendorName || "my organisation"}</strong>, confirm that I have read, understood, and agree to be bound by all terms of this Non-Disclosure Agreement with Amber Enterprises India Limited.
              </span>
            </div>
          </div>

          <button
            onClick={handleSign}
            disabled={!signerName.trim() || !agreed}
            className="w-full py-3 rounded-xl font-bold text-sm bg-blue-900 text-white hover:bg-blue-800 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Sign NDA Digitally
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            By clicking &quot;Sign NDA Digitally&quot; you are providing a legally binding digital signature. This action is recorded with a timestamp.
          </p>
        </div>
      </div>
    </div>
  )
}
