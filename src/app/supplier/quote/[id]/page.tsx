"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  mockNPDs, SUPPLIER_FORM_DEFAULTS, SUPPLIER_FORM_KEY,
  SUPPLIER_DOCS_KEY, LIVE_QUOTATIONS_KEY,
  type NPDRecord, type FormQuestion, type SupplierDoc, type LiveQuotation,
} from "@/lib/mockData"
import {
  CheckCircle2, FileText, ExternalLink, UserCircle,
  Clock, AlertTriangle, CheckCircle, AlertCircle, RotateCcw,
} from "lucide-react"

function getValidUntil(daysFromNow = 10) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

const MOCK_FILE: Record<string, string> = {
  "Quality Certificates & Test Reports": "ISO_9001_Certificate.pdf",
  default: "document_uploaded.pdf",
}

export default function SupplierQuotePage() {
  const params = useParams()
  const npdId  = params.id as string

  const [npd,           setNpd]          = useState<NPDRecord | null>(null)
  const [vendorName,    setVendorName]   = useState<string>("")
  const [questions,     setQuestions]    = useState<FormQuestion[]>(SUPPLIER_FORM_DEFAULTS)
  const [submitted,     setSubmitted]    = useState(false)
  const [formValues,    setFormValues]   = useState<Record<string, string>>({})
  const [uploadedFiles, setUploadedFiles]= useState<Record<string, string>>({})
  const [prevQuotation, setPrevQuotation]= useState<LiveQuotation | null>(null)
  const validUntil = getValidUntil(10)

  useEffect(() => {
    // Read vendor from query param
    const params  = new URLSearchParams(window.location.search)
    const vendor  = params.get("vendor") ?? ""
    setVendorName(vendor)

    // NPD data
    const stored  = localStorage.getItem("npd_records_v1")
    const records: NPDRecord[] = stored ? JSON.parse(stored) : mockNPDs
    const found   = records.find(n => n.id === npdId) ?? mockNPDs.find(n => n.id === npdId) ?? mockNPDs[0]
    setNpd(found)

    // Form questions
    const qStored = localStorage.getItem(SUPPLIER_FORM_KEY)
    if (qStored) { try { setQuestions(JSON.parse(qStored)) } catch { /* keep defaults */ } }

    // Previous quotation (re-submission scenario)
    if (vendor) {
      const raw = localStorage.getItem(LIVE_QUOTATIONS_KEY)
      const all: Record<string, Record<string, LiveQuotation>> = raw ? JSON.parse(raw) : {}
      const existing = all[npdId]?.[vendor]
      if (existing) {
        setPrevQuotation(existing)
        setFormValues(existing.formValues ?? {})
      } else {
        // Pre-fill demo defaults so the form isn't blank
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 7)
        const dispatchDate = tomorrow.toISOString().split("T")[0]
        setFormValues({
          q1: dispatchDate,
          q2: "5",
          q3: "285",
          q4: "0",
          q5: "2.5",
          q6: "0",
          q7: "8",
          q8: "15",
          q9: "5000",
          q10: "90 Days Credit",
          q11: "21",
        })
      }
    }
  }, [npdId])

  const setValue = (id: string, val: string) =>
    setFormValues(prev => ({ ...prev, [id]: val }))

  const toggleFile = (q: FormQuestion) => {
    setUploadedFiles(prev => {
      if (prev[q.id]) { const n = { ...prev }; delete n[q.id]; return n }
      return { ...prev, [q.id]: MOCK_FILE[q.label] ?? MOCK_FILE.default }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

    // Save quotation to live_quotations
    const raw  = localStorage.getItem(LIVE_QUOTATIONS_KEY)
    const all: Record<string, Record<string, LiveQuotation>> = raw ? JSON.parse(raw) : {}
    if (!all[npdId]) all[npdId] = {}

    const prev = all[npdId][vendorName]
    const newQuotation: LiveQuotation = {
      vendorName,
      status:       "submitted",
      formValues,
      submittedAt:  today,
      revisionCount: prev ? prev.revisionCount + 1 : 1,
    }
    all[npdId][vendorName] = newQuotation
    localStorage.setItem(LIVE_QUOTATIONS_KEY, JSON.stringify(all))

    // Save uploaded files to supplier docs
    const docEntries: SupplierDoc[] = Object.entries(uploadedFiles).map(([qId, fileName]) => {
      const q = questions.find(x => x.id === qId)
      return { fileName, questionLabel: q?.label ?? "Document", submittedAt: today, sizeMB: "—", submittedBy: vendorName || (npd?.supplier ?? "Supplier") }
    })
    if (docEntries.length > 0) {
      const dRaw = localStorage.getItem(SUPPLIER_DOCS_KEY)
      const dAll: Record<string, SupplierDoc[]> = dRaw ? JSON.parse(dRaw) : {}
      dAll[npdId] = [...(dAll[npdId] ?? []), ...docEntries]
      localStorage.setItem(SUPPLIER_DOCS_KEY, JSON.stringify(dAll))
    }

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
    const isRevision = (prevQuotation?.revisionCount ?? 0) > 0
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center py-14 px-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {isRevision ? "Revised Quotation Submitted" : "Quotation Submitted"}
          </h2>
          <p className="text-slate-500 text-sm">
            {vendorName && <><strong>{vendorName}</strong>'s </>}
            {isRevision ? "revised quotation" : "quotation"} for <strong>{npd.id}</strong> has been
            registered in the Amber NPD Portal. The SPOC will review and follow up.
          </p>
          <p className="text-xs text-slate-400 mt-4">You may close this window.</p>
        </div>
      </div>
    )
  }

  const isReNegotiation = prevQuotation?.status === "re_negotiation"
  const revisionNo      = prevQuotation ? prevQuotation.revisionCount + 1 : 1

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/amber-logo.png" alt="Amber" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-sm font-bold text-slate-700">Supplier Enquiry Portal</span>
          </div>
          <div className="flex items-center gap-3">
            {prevQuotation && (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">
                Rev {revisionNo}
              </span>
            )}
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              <Clock className="w-3.5 h-3.5" />
              Valid until {validUntil}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* NPD Hero */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <span className="inline-block text-[10px] font-bold tracking-widest bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full mb-3">
                {npd.id}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{npd.itemName}</h1>
              <p className="text-sm text-slate-500">{npd.itemCategory} · {npd.productLine}</p>
              {vendorName && (
                <p className="text-sm font-semibold text-blue-900 mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 inline-block">
                  Quotation requested from: {vendorName}
                </p>
              )}
            </div>
            <div className="shrink-0 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 self-start">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <UserCircle className="w-6 h-6 text-teal-700" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned SPOC</p>
                <p className="text-sm font-bold text-slate-800">{npd.spoc}</p>
                <p className="text-xs text-slate-400">{npd.productLine}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Re-negotiation banner */}
        {isReNegotiation && prevQuotation.reNegotiationMsg && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 mb-1">
                  Revision Requested by Sourcing SPOC
                  <span className="ml-2 font-normal text-amber-600 text-xs">({prevQuotation.reNegotiationAt})</span>
                </p>
                <p className="text-sm text-amber-800 bg-white border border-amber-200 rounded-lg px-3 py-2 mt-1">
                  "{prevQuotation.reNegotiationMsg}"
                </p>
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Please update your quotation below and resubmit.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Drawing / Documents */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Technical Documents</h2>
          {npd.driveLink ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-700 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Drawing / Spec Sheet Folder</p>
                  <p className="text-xs text-blue-600 truncate max-w-xs">{npd.driveLink}</p>
                </div>
              </div>
              <a
                href={npd.driveLink} target="_blank" rel="noopener noreferrer"
                className="shrink-0 ml-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-blue-50"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Drive
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400 italic">
              <AlertTriangle className="w-4 h-4" /> No drawing link attached. Contact the SPOC.
            </div>
          )}
        </div>

        {/* Quotation Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              {isReNegotiation ? "Revised Quotation Details" : "Quotation Details"}
            </h2>
            {prevQuotation && (
              <span className="text-xs text-slate-400">
                Previously submitted: {prevQuotation.submittedAt}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {questions.map(q => (
              <div key={q.id} className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  {q.label}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {q.type === "text" && (
                  <input type="text" required={q.required}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formValues[q.id] ?? ""} onChange={e => setValue(q.id, e.target.value)} />
                )}
                {q.type === "number" && (
                  <input type="number" required={q.required} min={0}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formValues[q.id] ?? ""} onChange={e => setValue(q.id, e.target.value)} />
                )}
                {q.type === "date" && (
                  <input type="date" required={q.required}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formValues[q.id] ?? ""} onChange={e => setValue(q.id, e.target.value)} />
                )}
                {q.type === "textarea" && (
                  <textarea required={q.required} rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                    value={formValues[q.id] ?? ""} onChange={e => setValue(q.id, e.target.value)} />
                )}
                {q.type === "select" && q.options && (
                  <select required={q.required}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={formValues[q.id] ?? ""} onChange={e => setValue(q.id, e.target.value)}>
                    <option value="">Select…</option>
                    {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {q.type === "file" && (
                  <div
                    onClick={() => toggleFile(q)}
                    className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors select-none ${
                      uploadedFiles[q.id]
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/30"
                    }`}
                  >
                    {uploadedFiles[q.id] ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-sm font-semibold text-emerald-700">{uploadedFiles[q.id]}</span>
                        <span className="text-xs text-emerald-500 ml-1">(click to remove)</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-600">Click to attach document</p>
                        <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG, XLSX accepted</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-slate-100">
              <button type="submit"
                className="w-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl px-6 py-3 transition-colors">
                {isReNegotiation ? "Submit Revised Quotation" : "Submit Final Quotation"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
