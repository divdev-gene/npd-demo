"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  getStageName, VENDOR_CATALOG, SPOC_NAMES, NPD_STAGES, TOTAL_NPD_STAGES,
  MOCK_SUPPLIER_DOCS, SUPPLIER_DOCS_KEY,
  MOCK_VENDOR_QUOTATIONS, VENDOR_QUOTE_APPROVALS_KEY,
  LIVE_QUOTATIONS_KEY, ENQUIRY_SENT_KEY, VENDOR_RFQ_TEMPLATE_KEY, DEFAULT_RFQ_TEMPLATE, VENDOR_EMAIL, COMPOSED_EMAILS_KEY,
  VENDOR_STATUS_KEY, DEFAULT_STATUS_TEMPLATE, VENDOR_STATUS_TEMPLATE_KEY, VENDOR_DATE_APPROVAL_KEY,
  type VendorRecord, type SupplierDoc, type VendorQuotation, type LiveQuotation, type VendorStatusResponse,
} from "@/lib/mockData"
import { useNPDs } from "@/lib/npdContext"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, Circle, CheckCircle, Clock, AlertCircle, FileText,
  Send, MessageSquare, Mail, ShieldCheck, XCircle, Star, Copy, ExternalLink, Link2,
  FolderOpen, UploadCloud, Download,
} from "lucide-react"


function ReSamplingForm({ npdId, baseUrl, npd, sentVendors }: {
  npdId: string
  baseUrl: string
  npd: { itemName: string; spoc: string; supplier: string }
  sentVendors: string[]
}) {
  const [reSampleQty, setReSampleQty] = useState("")
  const [reSampleDate, setReSampleDate] = useState("")
  const [generated, setGenerated] = useState(false)

  const vendor = npd.supplier && npd.supplier !== "Pending Assignment"
    ? npd.supplier
    : sentVendors[0] ?? ""

  const portalUrl = vendor
    ? `${baseUrl}/supplier/quote/${npdId}?vendor=${encodeURIComponent(vendor)}&resample=1&qty=${reSampleQty}&date=${reSampleDate}`
    : ""

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">New Sample Quantity</label>
          <input
            type="number"
            value={reSampleQty}
            onChange={e => setReSampleQty(e.target.value)}
            placeholder="e.g. 5"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Expected Supply Date</label>
          <input
            type="date"
            value={reSampleDate}
            onChange={e => setReSampleDate(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      {!generated ? (
        <Button
          className="bg-blue-900 hover:bg-blue-800 text-white"
          disabled={!reSampleQty || !reSampleDate || !vendor}
          onClick={() => setGenerated(true)}
        >
          <Send className="w-4 h-4 mr-2" /> Generate Re-Sample Quote URL
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2.5">
            <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-blue-700 font-mono truncate flex-1">{portalUrl}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(portalUrl) }}
              className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-blue-700">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-xs text-slate-400 italic">Share this link with {vendor} for re-sampling.</p>
        </div>
      )}
    </div>
  )
}

function getVendors(category: string): VendorRecord[] {
  for (const key of Object.keys(VENDOR_CATALOG)) {
    if (category.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(category.toLowerCase())) {
      return VENDOR_CATALOG[key]
    }
  }
  return VENDOR_CATALOG[category] ?? []
}


export default function NpdDetailView() {
  const params = useParams()
  const npdId = params.id as string
  const { npds, updateNPD } = useNPDs()

  const npd = npds.find(n => n.id === npdId) || npds[0]
  const [activeStage, setActiveStage] = useState(npd?.stage ?? 1)
  const [currentRole, setCurrentRole] = useState("rnd_user")
  const [tqrStatus, setTqrStatus] = useState("pending")
  const [rejectReason, setRejectReason] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [enquiryDispatched, setEnquiryDispatched] = useState(false)
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set())
  const [sentVendors, setSentVendors] = useState<string[]>([])
  const [copiedVendor, setCopiedVendor] = useState<string | null>(null)
  const [supplierDocs,       setSupplierDocs]       = useState<SupplierDoc[]>([])
  const [vendorQuotations,   setVendorQuotations]   = useState<VendorQuotation[]>([])
  const [quoteApprovals,     setQuoteApprovals]      = useState<Record<string, "approved" | "rejected">>({})
  const [liveQuotes,         setLiveQuotes]         = useState<Record<string, LiveQuotation>>({})
  const [renegotiatingVendor, setRenegotiatingVendor] = useState<string | null>(null)
  const [reNegMsg, setReNegMsg] = useState("")
  const [composedEmails, setComposedEmails] = useState<{ vendorName: string; subject: string; body: string; portalLink: string }[]>([])
  const [copiedEmail,    setCopiedEmail]    = useState<string | null>(null)
  const [vendorStatuses,  setVendorStatuses]  = useState<Record<string, VendorStatusResponse>>({})
  const [dateApprovals,   setDateApprovals]   = useState<Record<string, "approved" | "rejected">>({})
  const [copiedReminder,  setCopiedReminder]  = useState<string | null>(null)

  // ── MRN / Delivery Acceptance ───────────────────────────────────────────
  const [mrnStatus,    setMrnStatus]    = useState<"idle" | "form" | "raised">("idle")
  const [mrnNumber,    setMrnNumber]    = useState("")
  const [mrnDate,      setMrnDate]      = useState("")
  const [mrnQty,       setMrnQty]       = useState("")
  const [mrnCondition, setMrnCondition] = useState<"Good" | "Damaged" | "Partial">("Good")
  const [mrnNotes,     setMrnNotes]     = useState("")
  const [mrnApproved,  setMrnApproved]  = useState(false)

  // ── FPA ────────────────────────────────────────────────────────────────
  const [fpaStatus,    setFpaStatus]    = useState<"idle" | "form" | "done">("idle")

  // ── Supplier Defence ────────────────────────────────────────────────────
  const [defenceAdvanced, setDefenceAdvanced] = useState(false)

  const [fpaImageUploaded, setFpaImageUploaded] = useState(false)


  const enquiryValidUntil = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 10)
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  })()

  const refreshLiveData = () => {
    const rawLive = localStorage.getItem(LIVE_QUOTATIONS_KEY)
    const allLive: Record<string, Record<string, LiveQuotation>> = rawLive ? JSON.parse(rawLive) : {}
    setLiveQuotes(allLive[npdId] ?? {})

    const rawStored = localStorage.getItem(SUPPLIER_DOCS_KEY)
    const allStored: Record<string, SupplierDoc[]> = rawStored ? JSON.parse(rawStored) : {}
    const mockDocs = MOCK_SUPPLIER_DOCS[npdId] ?? []
    setSupplierDocs([...mockDocs, ...(allStored[npdId] ?? [])])

    const rawStatus = localStorage.getItem(VENDOR_STATUS_KEY)
    const allStatus: Record<string, Record<string, VendorStatusResponse>> = rawStatus ? JSON.parse(rawStatus) : {}
    setVendorStatuses(allStatus[npdId] ?? {})

    const rawDateAppr = localStorage.getItem(VENDOR_DATE_APPROVAL_KEY)
    const allDateAppr: Record<string, Record<string, "approved" | "rejected">> = rawDateAppr ? JSON.parse(rawDateAppr) : {}
    setDateApprovals(allDateAppr[npdId] ?? {})
  }

  useEffect(() => {
    const stored = localStorage.getItem("poc_role")
    if (stored) setCurrentRole(stored)
    setBaseUrl(window.location.origin)

    // Supplier docs (initial)
    const mockDocs  = MOCK_SUPPLIER_DOCS[npdId] ?? []
    const rawStored = localStorage.getItem(SUPPLIER_DOCS_KEY)
    const allStored: Record<string, SupplierDoc[]> = rawStored ? JSON.parse(rawStored) : {}
    setSupplierDocs([...mockDocs, ...(allStored[npdId] ?? [])])

    // Vendor quotations (mock base)
    setVendorQuotations(MOCK_VENDOR_QUOTATIONS[npdId] ?? [])
    const rawApprovals = localStorage.getItem(VENDOR_QUOTE_APPROVALS_KEY)
    const allApprovals: Record<string, Record<string, "approved" | "rejected">> = rawApprovals ? JSON.parse(rawApprovals) : {}
    setQuoteApprovals(allApprovals[npdId] ?? {})

    // Live quotations (initial)
    const rawLive = localStorage.getItem(LIVE_QUOTATIONS_KEY)
    const allLive: Record<string, Record<string, LiveQuotation>> = rawLive ? JSON.parse(rawLive) : {}
    setLiveQuotes(allLive[npdId] ?? {})

    // Composed emails
    const rawEmails = localStorage.getItem(COMPOSED_EMAILS_KEY)
    const allEmails: Record<string, { vendorName: string; subject: string; body: string; portalLink: string }[]> = rawEmails ? JSON.parse(rawEmails) : {}
    if (allEmails[npdId]) setComposedEmails(allEmails[npdId])

    // Sent vendors / enquiry dispatch state
    const rawSent = localStorage.getItem(ENQUIRY_SENT_KEY)
    const allSent: Record<string, string[]> = rawSent ? JSON.parse(rawSent) : {}
    const prevSent = allSent[npdId]
    if (prevSent && prevSent.length > 0) {
      setSentVendors(prevSent)
      setSelectedVendors(new Set(prevSent))
      setEnquiryDispatched(true)
    } else {
      const initial = getVendors(npd?.itemCategory ?? "")
      if (initial.length > 0) setSelectedVendors(new Set([initial[0].name]))
    }

    // Vendor statuses
    const rawStatus = localStorage.getItem(VENDOR_STATUS_KEY)
    const allStatus: Record<string, Record<string, VendorStatusResponse>> = rawStatus ? JSON.parse(rawStatus) : {}
    setVendorStatuses(allStatus[npdId] ?? {})

    const rawDateAppr = localStorage.getItem(VENDOR_DATE_APPROVAL_KEY)
    const allDateAppr: Record<string, Record<string, "approved" | "rejected">> = rawDateAppr ? JSON.parse(rawDateAppr) : {}
    setDateApprovals(allDateAppr[npdId] ?? {})

    // Load MRN state
    try {
      const rawMRN = localStorage.getItem("sample_receipt_v1")
      const allMRN: Record<string, { mrnNumber?: string }> = rawMRN ? JSON.parse(rawMRN) : {}
      if (allMRN[npdId]?.mrnNumber) setMrnStatus("raised")
      const rawAppr = localStorage.getItem("mrn_approval_v1")
      const allAppr: Record<string, "approved" | "rejected"> = rawAppr ? JSON.parse(rawAppr) : {}
      if (rawMRN && allMRN[npdId]?.mrnNumber) {
        const key = allMRN[npdId].mrnNumber!
        if (allAppr[key] === "approved") setMrnApproved(true)
      }
    } catch {}

    // Load FPA state
    try {
      const rawFPA = localStorage.getItem("fpa_data_v1")
      const allFPA: Record<string, unknown> = rawFPA ? JSON.parse(rawFPA) : {}
      if (allFPA[npdId]) setFpaStatus("done")
    } catch {}

    // Refresh live data when supplier submits in another tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === LIVE_QUOTATIONS_KEY || e.key === SUPPLIER_DOCS_KEY || e.key === VENDOR_STATUS_KEY) refreshLiveData()
    }
    const onFocus = () => refreshLiveData()

    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", onFocus)

    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener("rolechange", onRoleChange as EventListener)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("rolechange", onRoleChange as EventListener)
    }
  }, [])

  const stageProgress = NPD_STAGES.map((name, idx) => ({
    step: idx + 1,
    name,
    status: (idx + 1) < activeStage ? "complete" : (idx + 1) === activeStage ? "current" : "upcoming"
  }))

  const advanceStage = () => {
    if (activeStage < TOTAL_NPD_STAGES) {
      const next = activeStage + 1
      setActiveStage(next)
      updateNPD(npdId, { stage: next, stageName: NPD_STAGES[next - 1] ?? getStageName(next, npd.typeOfWork) })
    }
  }

  const isSpocOrSourcing = SPOC_NAMES.includes(currentRole) ||
    currentRole === "sourcing_head" || currentRole === "super_admin"
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"

  const dispatchEnquiry = () => {
    const vendorList = Array.from(selectedVendors)
    setSentVendors(vendorList)
    setEnquiryDispatched(true)
    const raw = localStorage.getItem(ENQUIRY_SENT_KEY)
    const all: Record<string, string[]> = raw ? JSON.parse(raw) : {}
    all[npdId] = vendorList
    localStorage.setItem(ENQUIRY_SENT_KEY, JSON.stringify(all))

    // Compose emails for each vendor
    const template = localStorage.getItem(VENDOR_RFQ_TEMPLATE_KEY) || DEFAULT_RFQ_TEMPLATE
    const emails = vendorList.map(vName => {
      const portalLink = `${baseUrl}/supplier/quote/${npdId}?vendor=${encodeURIComponent(vName)}`
      const filled = template
        .replace(/{npd_id}/g,       npdId)
        .replace(/{item_name}/g,    npd.itemName)
        .replace(/{commodity}/g,    npd.itemCategory)
        .replace(/{vendor_name}/g,  vName)
        .replace(/{portal_link}/g,  portalLink)
        .replace(/{valid_until}/g,  enquiryValidUntil)
        .replace(/{drawing_link}/g, npd.driveLink || "Not attached")
      const lines = filled.split("\n")
      const subject = lines[0].replace(/^Subject:\s*/i, "").trim()
      const bodyLines = lines.slice(1)
      // Convert plain text lines to HTML; replace the portal link line with a button
      const buttonHtml = `<div style="margin:16px 0;"><a href="${portalLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Open Supplier Portal →</a></div>`
      const body = bodyLines.map(line => {
        const trimmed = line.trim()
        if (trimmed === "" ) return `<div style="height:8px"></div>`
        if (trimmed === portalLink || trimmed === "{portal_link}") return buttonHtml
        return `<p style="margin:0 0 4px 0;">${trimmed}</p>`
      }).join("")
      return { vendorName: vName, subject, body, portalLink }
    })
    setComposedEmails(emails)
    const rawEmails = localStorage.getItem(COMPOSED_EMAILS_KEY)
    const allEmails: Record<string, typeof emails> = rawEmails ? JSON.parse(rawEmails) : {}
    allEmails[npdId] = emails
    localStorage.setItem(COMPOSED_EMAILS_KEY, JSON.stringify(allEmails))

    // Advance stage to 3 — NPD Sourcing Allocation
    if (activeStage < 3) {
      setActiveStage(3)
      updateNPD(npdId, { stage: 3, stageName: NPD_STAGES[2] })
    }
  }

  const copyVendorLink = (vendorName: string) => {
    const url = `${baseUrl}/supplier/quote/${npdId}?vendor=${encodeURIComponent(vendorName)}`
    navigator.clipboard.writeText(url)
    setCopiedVendor(vendorName)
    setTimeout(() => setCopiedVendor(null), 2000)
  }

  const sendReNegotiation = (vendorName: string) => {
    if (!reNegMsg.trim()) return
    const raw = localStorage.getItem(LIVE_QUOTATIONS_KEY)
    const all: Record<string, Record<string, LiveQuotation>> = raw ? JSON.parse(raw) : {}
    const prev = all[npdId]?.[vendorName]
    const updated: LiveQuotation = prev
      ? { ...prev, status: "re_negotiation", reNegotiationMsg: reNegMsg.trim(), reNegotiationAt: new Date().toLocaleString("en-IN") }
      : {
          vendorName,
          status: "re_negotiation",
          formValues: {},
          submittedAt: new Date().toLocaleDateString("en-IN"),
          revisionCount: 1,
          reNegotiationMsg: reNegMsg.trim(),
          reNegotiationAt: new Date().toLocaleString("en-IN"),
        }
    if (!all[npdId]) all[npdId] = {}
    all[npdId][vendorName] = updated
    localStorage.setItem(LIVE_QUOTATIONS_KEY, JSON.stringify(all))
    setLiveQuotes(prev => ({ ...prev, [vendorName]: updated }))
    setRenegotiatingVendor(null)
    setReNegMsg("")
  }

  const setDateApproval = (vendorName: string, decision: "approved" | "rejected") => {
    const next = { ...dateApprovals, [vendorName]: decision }
    setDateApprovals(next)
    const raw = localStorage.getItem(VENDOR_DATE_APPROVAL_KEY)
    const all: Record<string, Record<string, "approved" | "rejected">> = raw ? JSON.parse(raw) : {}
    all[npdId] = next
    localStorage.setItem(VENDOR_DATE_APPROVAL_KEY, JSON.stringify(all))
  }

  const buildReminderEmail = (vendorName: string, dispatchDate: string) => {
    const statusLink = `${baseUrl}/supplier/status/${npdId}?vendor=${encodeURIComponent(vendorName)}`
    const template = localStorage.getItem(VENDOR_STATUS_TEMPLATE_KEY) || DEFAULT_STATUS_TEMPLATE
    const filled = template
      .replace(/{npd_id}/g,       npdId)
      .replace(/{item_name}/g,    npd.itemName)
      .replace(/{vendor_name}/g,  vendorName)
      .replace(/{dispatch_date}/g, dispatchDate)
      .replace(/{status_link}/g,  statusLink)
    const lines   = filled.split("\n")
    const subject = lines[0].replace(/^Subject:\s*/i, "").trim()
    const buttonHtml = `<div style="margin:16px 0;"><a href="${statusLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Confirm Dispatch Status →</a></div>`
    const body = lines.slice(1).map(line => {
      const t = line.trim()
      if (t === "") return `<div style="height:8px"></div>`
      if (t === statusLink || t === "{status_link}") return buttonHtml
      return `<p style="margin:0 0 4px 0;">${t}</p>`
    }).join("")
    return { subject, body, statusLink }
  }

  const setVendorApproval = (vendorName: string, decision: "approved" | "rejected") => {
    const next = { ...quoteApprovals, [vendorName]: decision }
    setQuoteApprovals(next)
    const raw  = localStorage.getItem(VENDOR_QUOTE_APPROVALS_KEY)
    const all: Record<string, Record<string, "approved" | "rejected">> = raw ? JSON.parse(raw) : {}
    all[npdId] = next
    localStorage.setItem(VENDOR_QUOTE_APPROVALS_KEY, JSON.stringify(all))
    // Approving a vendor updates the supplier name and advances to Stage 4 — Supplier Defense
    if (decision === "approved") {
      const updates: Partial<typeof npd> = { supplier: vendorName }
      if (activeStage < 4) {
        setActiveStage(4)
        updates.stage = 4
        updates.stageName = NPD_STAGES[3]
      }
      updateNPD(npdId, updates)
    }
  }

  const vendors = getVendors(npd.itemCategory)

  const tatLabel =
    npd.tatHealth === "black" ? "Overdue" :
    npd.tatHealth === "red"   ? "Due Today" :
    `${npd.tatDaysRemaining}d left`

  const tatColor =
    npd.tatHealth === "black" ? "text-red-600" :
    npd.tatHealth === "red"   ? "text-red-500" :
    npd.tatHealth === "amber" ? "text-amber-600" :
    "text-emerald-600"

  const priorityColor =
    npd.priority === "Critical" ? "bg-red-100 text-red-800" :
    npd.priority === "High"     ? "bg-amber-100 text-amber-800" :
    "bg-slate-100 text-slate-700"

  // Merge mock quotations with vendors who submitted live but aren't in the mock list
  const displayQuotations: VendorQuotation[] = [
    ...vendorQuotations,
    ...Object.values(liveQuotes)
      .filter(lq => !vendorQuotations.find(vq => vq.vendorName === lq.vendorName))
      .map(lq => ({
        vendorName:   lq.vendorName,
        tier:         "—",
        status:       "submitted" as const,
        unitCost:     parseFloat(lq.formValues.q3 || "") || null,
        toolingCost:  parseFloat(lq.formValues.q4 || "") || null,
        dispatchDate: lq.formValues.supplyDate || lq.formValues.q1 || null,
        sampleQty:    parseInt(lq.formValues.sampleQty || lq.formValues.q2 || "") || null,
        moq:          parseInt(lq.formValues.q9 || "") || null,
        paymentTerms: lq.formValues.q10 || null,
        leadTimeDays: parseInt(lq.formValues.q11 || "") || null,
        submittedAt:  lq.submittedAt,
      })),
  ]

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* NPD Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          {/* Left column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">{npd.id}</span>
              {npd.gradeA && (
                <Badge className="bg-purple-100 text-purple-900 border-none flex items-center gap-1 text-xs">
                  <Star className="w-3 h-3" /> Grade A
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{npd.itemName}</h1>
            <p className="text-slate-500 text-sm">{npd.itemCategory} · {npd.productLine}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-slate-100 text-slate-700 border-none text-xs">{npd.typeOfWork}</Badge>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priorityColor}`}>{npd.priority}</span>
            </div>
          </div>
          {/* Right column: 2×2 info chips */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 min-w-[140px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned SPOC</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{npd.spoc}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 min-w-[140px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Locked Supplier</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {npd.supplier && npd.supplier !== "Pending Assignment"
                  ? npd.supplier
                  : <span className="text-slate-400 italic font-normal text-xs">Pending Assignment</span>}
              </p>
            </div>
            <div className={`border rounded-lg px-4 py-2.5 min-w-[140px] ${
              npd.tatHealth === "black" ? "bg-red-50 border-red-200" :
              npd.tatHealth === "red"   ? "bg-red-50 border-red-200" :
              npd.tatHealth === "amber" ? "bg-amber-50 border-amber-200" :
              "bg-emerald-50 border-emerald-200"
            }`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TAT Health</p>
              <p className={`text-sm font-bold mt-0.5 ${tatColor}`}>{tatLabel}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 min-w-[140px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Stage</p>
              <p className="text-sm font-semibold text-blue-900 mt-0.5 leading-tight">
                {activeStage}. {NPD_STAGES[activeStage - 1] ?? getStageName(activeStage, npd.typeOfWork)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 8-Stage Progress Bar — read-only */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <ul className="flex items-center justify-between min-w-[700px]">
          {stageProgress.map((stage, idx) => (
            <li key={stage.step} className="relative flex-1 text-center">
              {idx !== 0 && (
                <div className={`absolute top-4 left-[-10%] right-[50%] h-0.5 w-[120%] -z-10 ${
                  stage.status === "complete" || stage.status === "current" ? "bg-blue-900" : "bg-slate-200"
                }`} />
              )}
              <div className="flex flex-col items-center relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${
                  stage.status === "complete" ? "border-blue-900 bg-blue-900 text-white" :
                  stage.status === "current"  ? "border-blue-900 bg-blue-50 text-blue-900 ring-4 ring-blue-100" :
                  "border-slate-300 text-slate-300"
                }`}>
                  {stage.status === "complete"
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <span className="text-xs font-bold">{stage.step}</span>}
                </div>
                <div className="absolute top-10 w-20 text-center pointer-events-none">
                  <span className={`text-[9px] leading-tight font-medium ${
                    stage.status === "current"  ? "text-blue-900 font-bold" :
                    stage.status === "complete" ? "text-slate-600" :
                    "text-slate-400"
                  }`}>
                    {stage.name}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="h-10" />
      </div>

      {/* ═══════════════════ RND SECTION ═══════════════════ */}
      {isRnd && (
        <div className="space-y-6">
          {currentRole === "super_admin" && (
            <div className="flex items-center gap-2">
              <span className="bg-blue-900 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">R&amp;D Team</span>
            </div>
          )}

          {/* ── Section 1: My Actions ─────────────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b bg-slate-50">
              <CardTitle className="text-base">My Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">

              {/* Stage 1 — Request Initialisation (read-only summary) */}
              <div className={`rounded-xl border p-4 ${activeStage > 1 ? "bg-slate-50 border-slate-200" : "border-blue-300 bg-blue-50/30"}`}>
                <div className="flex items-center gap-2 mb-3">
                  {activeStage > 1
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <Circle className="w-4 h-4 text-blue-700 shrink-0" />}
                  <h4 className="font-bold text-slate-800 text-sm">Stage 1 — Request Initialisation</h4>
                  {activeStage > 1 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Completed</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {([
                    ["Item", npd.itemName],
                    ["Category", npd.itemCategory],
                    ["Type of Work", npd.typeOfWork],
                    ["Product Line", npd.productLine],
                    ["R&D Division", npd.rAndDDivision || "—"],
                    ["Raised By", npd.raisedBy === "rnd_head" ? "R&D Head" : "R&D User"],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400 text-xs">{label}</span>
                      <span className="text-slate-800 font-medium text-xs text-right max-w-[140px] truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage 2 — RND Internal Review */}
              {activeStage >= 2 && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 2  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 2 ? "border-blue-400 bg-white shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 2
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-blue-700 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-blue-700">2</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 2 — RND Internal Review</h4>
                    {activeStage > 2 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Released to Sourcing</Badge>}
                  </div>
                  {activeStage === 2 && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Drawing / Spec Folder</p>
                        {npd.driveLink ? (
                          <a
                            href={npd.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2"
                          >
                            <ExternalLink className="w-4 h-4" /> Open Drive Folder
                          </a>
                        ) : (
                          <p className="text-sm text-slate-400 italic">No drawing link attached.</p>
                        )}
                      </div>
                      {currentRole === "rnd_head" ? (
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => {
                            setActiveStage(3)
                            updateNPD(npdId, { stage: 3, stageName: NPD_STAGES[2] })
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Approve &amp; Release to Sourcing
                        </Button>
                      ) : (
                        <p className="text-sm text-slate-400 italic flex items-center gap-1.5">
                          <Clock className="w-4 h-4 shrink-0" /> Awaiting R&amp;D Head sign-off to release to Sourcing.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stage 5 — RND Evaluation (proof of delivery) */}
              {activeStage >= 5 && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 5  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 5 ? "border-blue-400 bg-white shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 5
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-blue-700 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-blue-700">5</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 5 — RND Evaluation</h4>
                    {activeStage > 5 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Completed</Badge>}
                  </div>
                  {activeStage === 5 && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">Samples received from supplier. Upload proof of delivery to confirm receipt and advance to testing.</p>
                      <div
                        onClick={() => setFpaImageUploaded(v => !v)}
                        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                          fpaImageUploaded ? "border-emerald-400 bg-emerald-50" : "border-blue-300 hover:border-blue-400 hover:bg-blue-50/40 bg-white"
                        }`}
                      >
                        {fpaImageUploaded ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="text-sm font-semibold text-emerald-700">delivery_confirmation.jpg</p>
                            <p className="text-xs text-emerald-600">Click to remove</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <UploadCloud className="w-8 h-8 text-blue-400 mb-1" />
                            <p className="text-sm font-semibold text-slate-700">Upload proof of delivery</p>
                            <p className="text-xs text-slate-400">PDF, PNG, JPG accepted</p>
                          </div>
                        )}
                      </div>
                      {fpaImageUploaded && (
                        <Button
                          className="bg-blue-900 hover:bg-blue-800 text-white"
                          onClick={() => {
                            setActiveStage(6)
                            updateNPD(npdId, { stage: 6, stageName: NPD_STAGES[5] })
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Confirm Receipt &amp; Advance to Testing
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stage 6 — RND Testing & TQR */}
              {activeStage >= 6 && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 6  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 6 ? "border-emerald-400 bg-white shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 6
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-emerald-600">6</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 6 — RND Testing &amp; TQR</h4>
                    {activeStage > 6 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Completed</Badge>}
                  </div>
                  {activeStage === 6 && (
                    <div className="space-y-4">
                      {tqrStatus === "rejecting" ? (
                        <div className="space-y-4 animate-in fade-in zoom-in-95">
                          <div className="bg-red-50 border border-red-100 p-4 rounded-lg">
                            <h3 className="text-red-800 font-bold mb-2">Initiate Sample Rejection</h3>
                            <div className="space-y-4 mt-4">
                              <div>
                                <label className="text-sm font-medium text-slate-700">Reason for Rejection <span className="text-red-500">*</span></label>
                                <textarea
                                  className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm focus:ring-red-500 focus:border-red-500"
                                  rows={3}
                                  placeholder="Describe dimensional failures, performance gaps, etc."
                                  onChange={e => setRejectReason(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-slate-700">Upload Revised Drawing (if any)</label>
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center mt-1 bg-white hover:bg-slate-50 cursor-pointer">
                                  <p className="text-sm text-slate-500">Click or drag updated Teamcenter PDF here</p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                              <Button variant="outline" onClick={() => setTqrStatus("pending")}>Cancel</Button>
                              <Button
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={!rejectReason}
                                onClick={() => {
                                  alert("SAMPLE REJECTED.\n\nAutomated email dispatched to Supplier &amp; Sourcing.")
                                  setTqrStatus("rejected")
                                }}
                              >
                                Confirm Rejection &amp; Notify Supplier
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : tqrStatus === "rejected" ? (
                        <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-lg text-center">
                          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                          <h3 className="text-base font-bold">Sample Rejected by R&amp;D</h3>
                          <p className="text-sm mt-1">Supplier has been notified to provide an updated sample submission timeline.</p>
                        </div>
                      ) : tqrStatus === "fully_approved" ? (
                        <div className="space-y-3">
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-lg text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                            <h3 className="text-base font-bold">TQR Fully Approved</h3>
                            <p className="text-sm mt-1">Both R&amp;D User and R&amp;D Head have approved. Auto-mail dispatched.</p>
                          </div>
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                              setActiveStage(7)
                              updateNPD(npdId, { stage: 7, stageName: NPD_STAGES[6] })
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Advance to RND Approval
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row items-center justify-between bg-blue-50 p-5 rounded-lg border border-blue-100 gap-4">
                          <div>
                            <p className="text-sm font-bold text-blue-900">Sample Evaluation Actions</p>
                            <p className="text-xs text-blue-700 mt-1">Review the physical sample and documentation before rendering a decision.</p>
                          </div>
                          {tqrStatus === "pending" ? (
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 bg-white" onClick={() => setTqrStatus("rejecting")}>
                                <XCircle className="w-4 h-4 mr-2" /> Reject Sample
                              </Button>
                              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setTqrStatus("approved_by_user")}>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve (Route to R&amp;D Head)
                              </Button>
                            </div>
                          ) : tqrStatus === "approved_by_user" && (currentRole === "rnd_head" || currentRole === "super_admin") ? (
                            <div className="text-right">
                              <p className="text-emerald-700 font-bold mb-2 text-sm">✓ R&amp;D User Approved. Awaiting Your Sign-off.</p>
                              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 bg-white" onClick={() => setTqrStatus("rejecting")}>
                                  <XCircle className="w-4 h-4 mr-2" /> Override &amp; Reject
                                </Button>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                                  alert("APPROVAL COMPLETE.\n\nAuto-mail dispatched to Supplier &amp; Sourcing.")
                                  setTqrStatus("fully_approved")
                                }}>
                                  <CheckCircle2 className="w-4 h-4 mr-2" /> Final R&amp;D Head Approval
                                </Button>
                              </div>
                            </div>
                          ) : tqrStatus === "approved_by_user" ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1 text-sm font-medium">
                              <Clock className="w-4 h-4 mr-1" /> Pending R&amp;D Head Approval
                            </Badge>
                          ) : (
                            <div className="text-slate-500 italic text-sm">Action locked for your current role.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stage 7 — RND Approval (rnd_head only) */}
              {activeStage >= 7 && (currentRole === "rnd_head" || currentRole === "super_admin") && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 7  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 7 ? "border-purple-400 bg-purple-50/30 shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 7
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-purple-700 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-purple-700">7</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 7 — RND Approval</h4>
                    {activeStage > 7 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Approved</Badge>}
                  </div>
                  {activeStage === 7 && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">All testing complete and TQR approved. Final R&amp;D Head sign-off required before PP lot.</p>
                      <Button
                        className="bg-purple-700 hover:bg-purple-800 text-white"
                        onClick={() => {
                          setActiveStage(8)
                          updateNPD(npdId, { stage: 8, stageName: NPD_STAGES[7] })
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Final Approval — Advance to Re-Sampling
                      </Button>
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>

          {/* ── Section 2: Sourcing Info (read-only) ─────────────── */}
          {activeStage >= 3 && (
            <Card>
              <CardHeader className="pb-3 border-b bg-slate-50">
                <CardTitle className="text-base">Sourcing Status</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Read-only summary of sourcing progress</p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendors Contacted</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{sentVendors.length > 0 ? `${sentVendors.length} vendor${sentVendors.length !== 1 ? "s" : ""}` : "—"}</p>
                    {sentVendors.length > 0 && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sentVendors.slice(0,2).join(", ")}{sentVendors.length > 2 ? ` +${sentVendors.length - 2}` : ""}</p>}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Locked Supplier</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : <span className="text-slate-400 italic font-normal text-xs">Not yet locked</span>}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Date</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {(() => {
                        const live = npd.supplier && liveQuotes[npd.supplier]
                        return (live ? (live.formValues.supplyDate || live.formValues.q1) : null) ?? "—"
                      })()}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sourcing Stage</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {activeStage < 3 ? "Awaiting Release" :
                       activeStage === 3 ? "Awaiting Quotations" :
                       activeStage === 4 ? "Awaiting Dispatch" :
                       activeStage >= 5 ? "Supplier Dispatched" : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Section 3: Document Library ──────────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b bg-slate-50">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-700" /> Document Library
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {/* Design & Drawing Folder */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="w-4 h-4 text-blue-700" />
                  <p className="text-sm font-semibold text-slate-700">Design &amp; Drawing Folder</p>
                </div>
                {npd.driveLink ? (
                  <div className="flex items-center justify-between bg-white border border-blue-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-blue-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">Drawing / Spec Sheet Folder</p>
                        <p className="text-xs text-slate-400 truncate max-w-sm">{npd.driveLink}</p>
                      </div>
                    </div>
                    <a
                      href={npd.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 ml-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-blue-100"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Drive
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No drawing link was attached during request creation.</p>
                )}
              </div>
              {/* Supplier Submitted Documents */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-emerald-700" />
                    <p className="text-sm font-semibold text-slate-700">Supplier Submitted Documents</p>
                  </div>
                  {supplierDocs.length > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                      {supplierDocs.length} file{supplierDocs.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {supplierDocs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    <UploadCloud className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No documents submitted yet.</p>
                    <p className="text-xs mt-1">Supplier documents appear here after form submission.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {supplierDocs.map((doc, i) => {
                      const ext = doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE"
                      const extColor =
                        ext === "PDF"  ? "bg-red-100 text-red-700"  :
                        ext === "XLSX" ? "bg-green-100 text-green-700" :
                        "bg-slate-100 text-slate-600"
                      return (
                        <div key={i} className="flex items-center gap-3 py-3 px-4">
                          <div className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded ${extColor}`}>{ext}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{doc.submittedBy} · {doc.submittedAt} · {doc.sizeMB} MB</p>
                          </div>
                          <button className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      )}
      {/* ═══════════════════ SOURCING SECTION ═══════════════════ */}
      {isSpocOrSourcing && (
        <div className="space-y-6">
          {currentRole === "super_admin" && (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">Sourcing Team</span>
            </div>
          )}

          {/* ── Section 1: Supplier Sourcing & Quotations ──── */}
          {activeStage < 3 ? (
            <Card>
              <CardContent className="py-8 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Waiting for R&amp;D to release to Sourcing</p>
                <p className="text-xs mt-1">R&amp;D Head must approve Stage 2 to unlock this section.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* === SOURCING WORKFLOW === */}
              <Card className="border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">Sourcing Team Actions (ASR Sync)</CardTitle>
                    <CardDescription>
                      Vendor registry filtered for commodity: <strong>{npd.itemCategory}</strong>
                    </CardDescription>
                  </div>
                  <Button variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50">
                    <Mail className="w-4 h-4 mr-2" /> Request New Vendor Addition
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">

                {/* R&D Requirement Brief */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1">
                      <FileText className="w-4 h-4 text-slate-500" /> R&D Requirement Brief
                    </h4>
                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                      <div>
                        <span className="text-slate-500 block text-xs uppercase tracking-wide">Item Name</span>
                        <span className="font-semibold text-slate-900">{npd.itemName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-xs uppercase tracking-wide">Commodity Target</span>
                        <span className="font-semibold text-slate-900">{npd.itemCategory}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-xs uppercase tracking-wide">Plant / R&D Division</span>
                        <span className="font-semibold text-slate-900">{npd.rAndDDivision || "Rajpura Phase 2"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-xs uppercase tracking-wide">Type of Work</span>
                        <span className="font-semibold text-slate-900">{npd.typeOfWork.split(" (")[0]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-100 text-blue-900 text-xs px-3 py-1.5 rounded-md font-bold self-start md:self-auto border border-blue-200">
                    Requirement Locked
                  </div>
                </div>

                {/* Vendor Table */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center justify-between">
                    <span>Registered Vendors — {npd.itemCategory}</span>
                    <Badge className="bg-amber-100 text-amber-800 border-none font-normal">
                      {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} found
                    </Badge>
                  </h3>

                  {vendors.length === 0 ? (
                    <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">
                      <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No vendors registered for this commodity category.</p>
                      <p className="text-xs mt-1">Use the "Request New Vendor Addition" button to onboard one.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 w-10 text-center">Select</th>
                            <th className="px-4 py-3">Vendor / Capacity Details</th>
                            <th className="px-4 py-3">Audit Score</th>
                            <th className="px-4 py-3">Certifications</th>
                            <th className="px-4 py-3">System Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vendors.map((v, i) => {
                            const scoreColor =
                              v.auditScore >= 85 ? "text-emerald-700 bg-emerald-50" :
                              v.auditScore >= 70 ? "text-blue-700 bg-blue-50" :
                              "text-amber-700 bg-amber-50"
                            const matchColor =
                              v.commodityMatch >= 90 ? "text-emerald-600" :
                              v.commodityMatch >= 75 ? "text-amber-600" :
                              "text-red-500"
                            return (
                              <tr key={v.name} className="hover:bg-slate-50">
                                <td className="px-4 py-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedVendors.has(v.name)}
                                    onChange={e => {
                                      setSelectedVendors(prev => {
                                        const next = new Set(prev)
                                        if (e.target.checked) next.add(v.name)
                                        else next.delete(v.name)
                                        return next
                                      })
                                    }}
                                    className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                                  />
                                </td>
                                <td className="px-4 py-4">
                                  <p className="font-semibold text-slate-900 flex items-center gap-2">
                                    {v.name}
                                    <Badge
                                      className={`scale-75 origin-left ${v.tier === "Tier 1" ? "bg-blue-100 text-blue-800 border-none" : "border border-slate-300 bg-white text-slate-600"}`}
                                    >
                                      {v.tier}
                                    </Badge>
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Commodity Match: <span className={`font-bold ${matchColor}`}>{v.commodityMatch}%</span>
                                  </p>
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`font-bold px-2 py-1 rounded text-sm ${scoreColor}`}>
                                    {v.auditScore} / 100
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  {v.certifications.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {v.certifications.map(c => (
                                        <Badge key={c} variant="outline" className="text-[10px] bg-white text-slate-600">
                                          {c}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Pending verification</span>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  {v.status === "verified" && (
                                    <span className="text-emerald-600 font-medium text-xs flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" /> Verified Source
                                    </span>
                                  )}
                                  {v.status === "audit_overdue" && (
                                    <span className="text-amber-600 font-medium text-xs flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" /> Audit Overdue
                                    </span>
                                  )}
                                  {v.status === "new" && (
                                    <span className="text-blue-500 font-medium text-xs flex items-center gap-1">
                                      <Circle className="w-3 h-3" /> New / Unaudited
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Dispatch RFQ */}
                {!enquiryDispatched ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="font-bold text-blue-900">Dispatch Bulk Enquiry</h4>
                      <p className="text-xs text-blue-700 mt-1 max-w-lg">
                        Selected vendors will each receive a unique supplier portal link with the spec sheet and drawing.
                        The form will show a validity of <strong>10 days</strong> from today.
                        {selectedVendors.size === 0 && (
                          <span className="ml-1 text-amber-700 font-semibold">Select at least one vendor above.</span>
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={dispatchEnquiry}
                      disabled={selectedVendors.size === 0}
                      className="bg-blue-900 text-white min-w-[180px] shrink-0"
                    >
                      <Send className="w-4 h-4 mr-2" /> Send Bulk Enquiry ({selectedVendors.size})
                    </Button>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <h4 className="font-bold text-emerald-900">Enquiry Dispatched — {sentVendors.length} Vendor{sentVendors.length !== 1 ? "s" : ""}</h4>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Copy each vendor&apos;s unique link below. Valid until <strong>{enquiryValidUntil}</strong>.
                    </p>
                    <div className="space-y-2">
                      {sentVendors.map(vName => {
                        const url = `${baseUrl}/supplier/quote/${npdId}?vendor=${encodeURIComponent(vName)}`
                        return (
                          <div key={vName} className="bg-white border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{vName}</p>
                              <span className="text-xs text-slate-600 font-mono truncate block">{url}</span>
                            </div>
                            <button
                              onClick={() => copyVendorLink(vName)}
                              className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copiedVendor === vName ? "Copied!" : "Copy"}
                            </button>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-xs font-semibold text-slate-400 hover:text-blue-700"
                              title="Preview supplier form"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )
                      })}
                    </div>

                    {/* Composed Emails */}
                    {composedEmails.length > 0 && (
                      <div className="border-t border-emerald-200 pt-4 space-y-4">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-500" /> Email Drafts
                        </h4>
                        {composedEmails.map(({ vendorName, subject, body }) => {
                          return (
                            <div key={vendorName} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                              {/* Email header bar */}
                              <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-xs font-semibold text-white truncate">{subject}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
                                    setCopiedEmail(vendorName)
                                    setTimeout(() => setCopiedEmail(null), 2000)
                                  }}
                                  className="shrink-0 ml-3 text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  {copiedEmail === vendorName ? "Copied!" : "Copy"}
                                </button>
                              </div>
                              {/* Email body rendered as HTML */}
                              <div
                                className="p-5 text-sm text-slate-700 leading-relaxed bg-white [&_p]:mb-3 [&_strong]:font-semibold [&_table]:my-2"
                                dangerouslySetInnerHTML={{ __html: body }}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>


              {/* === VENDOR QUOTATIONS === */}
              <div className="space-y-4">
          {displayQuotations.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-slate-400">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No quotations yet.</p>
                <p className="text-xs mt-1">Send a Bulk Enquiry from the Supplier Sourcing Workflow tab first.</p>
              </CardContent>
            </Card>
          ) : (
            <>

              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Vendors",       value: displayQuotations.length,                                                                                                                                                              color: "text-slate-900" },
                  { label: "Quotations Received", value: displayQuotations.filter(v => { const l = liveQuotes[v.vendorName]; return l ? l.status !== "re_negotiation" : v.status === "submitted" }).length,  color: "text-blue-700"  },
                  { label: "Awaiting Response",   value: displayQuotations.filter(v => { const l = liveQuotes[v.vendorName]; return l ? l.status === "re_negotiation" : v.status === "pending" }).length,     color: "text-amber-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Quotation cards */}
              {displayQuotations.map(v => {
                const approval = quoteApprovals[v.vendorName]
                const live = liveQuotes[v.vendorName]
                // Live submission overrides mock status
                const isSubmitted = live ? live.status !== "re_negotiation" : v.status === "submitted"
                const isReNegotiating = live?.status === "re_negotiation"
                const revisionCount = live?.revisionCount ?? 0

                // formValues: new form uses sampleQty/supplyDate keys; legacy mock data uses q1/q2 (fallback chain below)
                const unitCostVal  = live ? (parseFloat(live.formValues.q3 || "") || null) : v.unitCost
                const toolingVal   = live ? (parseFloat(live.formValues.q4 || "") || null) : v.toolingCost
                const dispatchVal  = live ? (live.formValues.supplyDate || live.formValues.q1 || v.dispatchDate) : v.dispatchDate
                const samplesVal   = live ? (parseInt(live.formValues.sampleQty || live.formValues.q2 || "") || null) : v.sampleQty
                const moqVal       = live ? (parseInt(live.formValues.q9 || "") || null) : v.moq
                const paymentVal   = live ? (live.formValues.q10 || v.paymentTerms) : v.paymentTerms
                const leadTimeVal  = live ? (parseInt(live.formValues.q11 || "") || null) : v.leadTimeDays
                const submittedAt  = live ? live.submittedAt : v.submittedAt

                // Find cheapest among all submitted vendors
                const allCosts = displayQuotations.map(vq => {
                  const lq = liveQuotes[vq.vendorName]
                  return lq ? (parseFloat(lq.formValues.q3 || "") || null) : vq.unitCost
                }).filter((c): c is number => c !== null)
                const lowestCost = allCosts.length ? Math.min(...allCosts) : null
                const isCheapest = isSubmitted && unitCostVal !== null && unitCostVal === lowestCost && allCosts.length > 1

                const isBeingRenegotiated = renegotiatingVendor === v.vendorName
                const isNotFeasible = live?.feasible === false

                return (
                  <Card key={v.vendorName} className={`border ${
                    isNotFeasible    ? "border-red-200 bg-red-50/20 opacity-60" :
                    approval === "approved" ? "border-emerald-200 bg-emerald-50/30" :
                    approval === "rejected" ? "border-red-200 bg-red-50/20 opacity-60" :
                    isReNegotiating ? "border-amber-200 bg-amber-50/20" :
                    isSubmitted ? "border-slate-200" : "border-dashed border-slate-300 bg-slate-50/50"
                  }`}>
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900">{v.vendorName}</span>
                              <span className="text-[10px] font-bold border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">{v.tier}</span>
                              {isCheapest && (
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Lowest Price</span>
                              )}
                              {revisionCount > 1 && (
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Rev {revisionCount}</span>
                              )}
                            </div>
                            {(isSubmitted || isReNegotiating || isNotFeasible) && submittedAt && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {isReNegotiating ? "Re-negotiation sent" : isNotFeasible ? "Responded on" : "Submitted on"} {submittedAt}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* Status badge */}
                        {isNotFeasible ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Not Feasible
                          </span>
                        ) : approval === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : approval === "rejected" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        ) : isReNegotiating ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                            <MessageSquare className="w-3.5 h-3.5" /> Re-negotiation Sent
                          </span>
                        ) : !isSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5" /> Awaiting Quotation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                            <AlertCircle className="w-3.5 h-3.5" /> Pending Review
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    {isNotFeasible ? (
                      <CardContent className="pt-4 pb-4 space-y-3">
                        <p className="text-sm text-slate-500 italic">Vendor marked this requirement as not feasible.</p>
                        {live?.query && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" /> Clarification Query from Vendor
                            </p>
                            <p className="text-sm text-amber-900 italic">&ldquo;{live.query}&rdquo;</p>
                            <p className="text-[10px] text-amber-600 mt-1.5">Sent to R&amp;D Owner for review · {live.submittedAt}</p>
                          </div>
                        )}
                      </CardContent>
                    ) : (isSubmitted || isReNegotiating) ? (
                      <CardContent className="pt-4">
                        {/* Re-negotiation message banner */}
                        {isReNegotiating && live?.reNegotiationMsg && (
                          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" /> Re-negotiation Message Sent to Supplier
                            </p>
                            <p className="text-sm text-amber-900 italic">&ldquo;{live.reNegotiationMsg}&rdquo;</p>
                            <p className="text-[10px] text-amber-600 mt-1">Sent at {live.reNegotiationAt} · Awaiting supplier re-submission</p>
                          </div>
                        )}

                        {/* Quoted values grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          {[
                            { label: "Unit Cost",     value: unitCostVal !== null ? `₹${unitCostVal.toLocaleString("en-IN")}` : "—" },
                            { label: "Tooling Cost",  value: toolingVal  !== null ? (toolingVal === 0 ? "Nil" : `₹${toolingVal.toLocaleString("en-IN")}`) : "—" },
                            { label: "Dispatch Date", value: dispatchVal ?? "—" },
                            { label: "Samples",       value: samplesVal  !== null ? `${samplesVal} pcs` : "—" },
                            { label: "MOQ",           value: moqVal      !== null ? `${moqVal.toLocaleString("en-IN")} pcs` : "—" },
                            { label: "Payment Terms", value: paymentVal  ?? "—" },
                            { label: "Lead Time",     value: leadTimeVal !== null ? `${leadTimeVal} days` : "—" },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                              <p className={`text-sm font-semibold mt-0.5 ${label === "Unit Cost" && isCheapest ? "text-emerald-700" : "text-slate-800"}`}>{value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Dispatch status response from vendor */}
                        {(() => {
                          const status = vendorStatuses[v.vendorName]
                          if (!status) return null
                          const dateDecision = dateApprovals[v.vendorName]
                          const needsDateApproval = !status.onTime && status.newDate && !dateDecision
                          return (
                            <div className={`mb-3 rounded-lg border p-3 space-y-2 ${
                              status.onTime          ? "bg-emerald-50 border-emerald-200" :
                              dateDecision === "approved" ? "bg-emerald-50 border-emerald-200" :
                              dateDecision === "rejected" ? "bg-red-50 border-red-200" :
                              "bg-amber-50 border-amber-200"
                            }`}>
                              <p className={`text-xs font-bold flex items-center gap-1.5 ${
                                status.onTime || dateDecision === "approved" ? "text-emerald-800" :
                                dateDecision === "rejected" ? "text-red-700" : "text-amber-800"
                              }`}>
                                {status.onTime || dateDecision === "approved"
                                  ? <CheckCircle className="w-3.5 h-3.5" />
                                  : dateDecision === "rejected"
                                  ? <XCircle className="w-3.5 h-3.5" />
                                  : <AlertCircle className="w-3.5 h-3.5" />}
                                {status.onTime ? "Vendor Status: On Track" :
                                 dateDecision === "approved" ? "New Date Approved" :
                                 dateDecision === "rejected" ? "New Date Rejected" :
                                 "Date Change Requested — Action Required"}
                                <span className="font-normal text-slate-400 ml-1">· {status.respondedAt}</span>
                              </p>

                              {!status.onTime && status.newDate && (
                                <p className="text-sm font-semibold text-amber-900">
                                  Proposed new date:{" "}
                                  <span className="font-bold">
                                    {new Date(status.newDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                                  </span>
                                </p>
                              )}
                              {status.notes && (
                                <p className="text-xs text-slate-600 italic">&ldquo;{status.notes}&rdquo;</p>
                              )}

                              {/* Approve / Reject new date */}
                              {isSpocOrSourcing && needsDateApproval && (
                                <div className="flex gap-2 pt-1 border-t border-amber-200">
                                  <button
                                    onClick={() => setDateApproval(v.vendorName, "rejected")}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Reject New Date
                                  </button>
                                  <button
                                    onClick={() => setDateApproval(v.vendorName, "approved")}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5 transition-colors"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Approve New Date
                                  </button>
                                </div>
                              )}
                              {dateDecision && (
                                <button
                                  onClick={() => setDateApproval(v.vendorName, dateDecision === "approved" ? "rejected" : "approved")}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                                >
                                  Change decision
                                </button>
                              )}
                            </div>
                          )
                        })()}

                        {/* Reminder email draft — shown when vendor has submitted and has a dispatch date */}
                        {isSpocOrSourcing && isSubmitted && dispatchVal && !vendorStatuses[v.vendorName] && (() => {
                          const { subject, body, statusLink } = buildReminderEmail(v.vendorName, dispatchVal)
                          return (
                            <div className="mb-3 border border-slate-200 rounded-xl overflow-hidden">
                              <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                                  <span className="text-xs font-bold text-slate-700">Reminder Email Draft</span>
                                  <span className="text-xs text-slate-400 truncate max-w-[200px]">{subject}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(`Subject: ${subject}\n\n${body.replace(/<[^>]+>/g, "")}`)
                                      setCopiedReminder(v.vendorName)
                                      setTimeout(() => setCopiedReminder(null), 2000)
                                    }}
                                    className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" />
                                    {copiedReminder === v.vendorName ? "Copied!" : "Copy"}
                                  </button>
                                  <a
                                    href={statusLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-semibold text-slate-400 hover:text-blue-700 flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" /> Preview
                                  </a>
                                </div>
                              </div>
                              <div
                                className="p-4 text-sm text-slate-700 leading-relaxed bg-white [&_p]:mb-2"
                                dangerouslySetInnerHTML={{ __html: body }}
                              />
                            </div>
                          )
                        })()}

                        {/* Inline re-negotiate message form */}
                        {isBeingRenegotiated && (
                          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-bold text-amber-800">Send Re-negotiation Message to Supplier</p>
                            <textarea
                              className="w-full border border-amber-300 rounded-md p-2 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                              rows={3}
                              placeholder="e.g. Please revise unit cost to ₹265 or below. Tooling cost must be nil for volumes above 5000 pcs."
                              value={reNegMsg}
                              onChange={e => setReNegMsg(e.target.value)}
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => { setRenegotiatingVendor(null); setReNegMsg("") }}
                                className="text-xs font-semibold text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg px-3 py-1.5"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => sendReNegotiation(v.vendorName)}
                                disabled={!reNegMsg.trim()}
                                className="text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-lg px-3 py-1.5 flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" /> Send to Supplier
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Approve / Reject / Re-negotiate — only for SPOCs and sourcing roles */}
                        {isSpocOrSourcing && !approval && !isReNegotiating && !isBeingRenegotiated && isSubmitted && (
                          <div className="flex gap-3 pt-2 border-t border-slate-100 flex-wrap">
                            <button
                              onClick={() => setVendorApproval(v.vendorName, "rejected")}
                              className="flex items-center gap-1.5 text-sm font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-lg px-4 py-2 transition-colors"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                            <button
                              onClick={() => { setRenegotiatingVendor(v.vendorName); setReNegMsg("") }}
                              className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 rounded-lg px-4 py-2 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" /> Re-negotiate
                            </button>
                            <button
                              onClick={() => setVendorApproval(v.vendorName, "approved")}
                              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-4 py-2 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" /> Approve
                            </button>
                          </div>
                        )}
                        {isSpocOrSourcing && approval && (
                          <div className="pt-2 border-t border-slate-100">
                            <button
                              onClick={() => setVendorApproval(v.vendorName, approval === "approved" ? "rejected" : "approved")}
                              className="text-xs text-slate-400 hover:text-slate-600 underline"
                            >
                              Change decision
                            </button>
                          </div>
                        )}
                      </CardContent>
                    ) : (
                      <CardContent className="pt-4 pb-3">
                        <p className="text-sm text-slate-400 italic">Supplier has not yet submitted their quotation.</p>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </>
          )}
              </div>
            </div>
          )}

          {/* ── Section 2: Supplier Dispatch ──────────────────────────────────── */}
          {activeStage >= 4 && (
            <Card className="border-orange-300 shadow-sm">
              <CardHeader className="bg-orange-50 border-b border-orange-200 pb-3">
                <CardTitle className="text-orange-900 flex items-center gap-2 text-base">
                  <ShieldCheck className="w-5 h-5" /> Supplier Dispatch
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">
                <p className="text-sm text-slate-600">
                  Share the dispatch link with <strong>{npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : sentVendors[0] ?? "the selected vendor"}</strong>. They must upload compliance documents and confirm dispatch.
                </p>
                {(() => {
                  const vendor = npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : sentVendors[0] ?? ""
                  const dispatchUrl = `${baseUrl}/supplier/dispatch/${npdId}${vendor ? `?vendor=${encodeURIComponent(vendor)}` : ""}`
                  return (
                    <div className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2.5">
                      <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-blue-700 font-mono truncate flex-1">{dispatchUrl}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(dispatchUrl)
                          setCopiedVendor("dispatch")
                          setTimeout(() => setCopiedVendor(null), 2000)
                        }}
                        className="shrink-0 text-[10px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedVendor === "dispatch" ? "Copied!" : "Copy"}
                      </button>
                      <a href={dispatchUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-blue-700">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )
                })()}
                {!defenceAdvanced ? (
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                    onClick={() => {
                      setDefenceAdvanced(true)
                      setActiveStage(5)
                      updateNPD(npdId, { stage: 5, stageName: NPD_STAGES[4] })
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Mark Dispatched &amp; Advance to RND Evaluation
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Dispatched — Advanced to RND Evaluation
                  </span>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Section 3: Parts & Supplier Tracking ──────────────────────────── */}
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
              <CardTitle className="text-base">Parts &amp; Supplier Tracking</CardTitle>
              <CardDescription>Consolidated timeline view for parts under this NPD project, clubbed by supplier allocation.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left align-middle border-collapse">
                <thead className="bg-white text-slate-500 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Part Number</th>
                    <th className="px-6 py-4 font-semibold">Vendors</th>
                    <th className="px-6 py-4 font-semibold">Tentative ETA</th>
                    <th className="px-6 py-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 font-bold text-slate-900 w-1/4 align-top">PRT-9921-A</td>
                    <td className="px-6 py-5 align-top">
                      <ul className="space-y-1 list-disc pl-4 text-slate-700">
                        <li>{npd.supplier}</li>
                        <li>National Metalfabs</li>
                      </ul>
                    </td>
                    <td className="px-6 py-5 align-top"><span className="font-semibold text-slate-700">10 June 2026</span></td>
                    <td className="px-6 py-5 align-top text-right">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> On Time
                      </Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 font-bold text-slate-900 w-1/4 align-top">PRT-9922-B</td>
                    <td className="px-6 py-5 align-top">
                      <ul className="space-y-1 list-disc pl-4 text-slate-700"><li>Supreme Plastics</li></ul>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <span className="line-through text-slate-400 text-xs mr-2">10 June 2026</span><br />
                      <span className="text-amber-700 font-bold mt-1 inline-block">16 June 2026</span>
                    </td>
                    <td className="px-6 py-5 align-top text-right">
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 shadow-sm mt-3">
                        <AlertCircle className="w-3 h-3 mr-1" /> Approval Pending
                      </Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 font-bold text-slate-900 w-1/4 align-top">PRT-9923-C</td>
                    <td className="px-6 py-5 align-top">
                      <ul className="space-y-1 list-disc pl-4 text-slate-700">
                        <li>{npd.supplier}</li>
                        <li>Alpha Component Systems</li>
                      </ul>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <span className="line-through text-slate-400 text-xs mr-2">12 June 2026</span><br />
                      <span className="text-red-700 font-bold mt-1 inline-block">22 June 2026</span>
                    </td>
                    <td className="px-6 py-5 align-top text-right">
                      <Badge className="bg-red-100 text-red-800 border-red-200 shadow-sm mt-3">
                        <XCircle className="w-3 h-3 mr-1" /> Delayed (Rejected)
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* ── Section 4: Re-Sampling (stage 8 only) ─────────────────────────── */}
          {activeStage === 8 && (
            <Card>
              <CardHeader className="pb-3 border-b bg-slate-50">
                <CardTitle className="text-base">Re-Sampling</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Define new sample quantity and expected supply date</p>
              </CardHeader>
              <CardContent className="pt-5">
                <ReSamplingForm npdId={npdId} baseUrl={baseUrl} npd={npd} sentVendors={sentVendors} />
              </CardContent>
            </Card>
          )}

        </div>
      )}

    </div>
  )
}
