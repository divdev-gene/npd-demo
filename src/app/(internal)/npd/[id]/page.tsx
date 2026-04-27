"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  getStageName, VENDOR_CATALOG, SPOC_NAMES,
  MOCK_SUPPLIER_DOCS, SUPPLIER_DOCS_KEY,
  MOCK_VENDOR_QUOTATIONS, VENDOR_QUOTE_APPROVALS_KEY,
  LIVE_QUOTATIONS_KEY, ENQUIRY_SENT_KEY, VENDOR_RFQ_TEMPLATE_KEY, DEFAULT_RFQ_TEMPLATE, VENDOR_EMAIL, COMPOSED_EMAILS_KEY,
  VENDOR_STATUS_KEY, DEFAULT_STATUS_TEMPLATE, VENDOR_STATUS_TEMPLATE_KEY, VENDOR_DATE_APPROVAL_KEY,
  type VendorRecord, type SupplierDoc, type VendorQuotation, type LiveQuotation, type VendorStatusResponse,
} from "@/lib/mockData"
import { useNPDs } from "@/lib/npdContext"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, Circle, CheckCircle, Clock, AlertCircle, FileText,
  Send, MessageSquare, Mail, ShieldCheck, XCircle, Star, Copy, ExternalLink, Link2,
  FolderOpen, UploadCloud, Download, DownloadCloud, ClipboardCheck,
  Inbox, Pencil, CornerUpLeft, Bot, RefreshCw
} from "lucide-react"

const NTD_STAGES = [
  "Request Initiation", "R&D Internal Review", "NPD Sourcing Allocation",
  "Supplier Defense", "Sample Submission", "Sample Receipt / MRN",
  "R&D Evaluation", "FPA (First Part Approval)", "Sample Cost Finalization",
  "PP Lot Pricing"
]
const TOTAL_STAGES = NTD_STAGES.length // 10

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

  // ── Mail inbox ──────────────────────────────────────────────────────────
  const [mailFolder,   setMailFolder]   = useState<"inbox" | "sent" | "system">("inbox")
  const [selectedMail, setSelectedMail] = useState<number | null>(0)
  const [replyText,    setReplyText]    = useState("")
  const [replySent,    setReplySent]    = useState<Record<number, boolean>>({})

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
  const [fpaNumber,    setFpaNumber]    = useState("")
  const [fpaDate,      setFpaDate]      = useState("")
  const [fpaApprover,  setFpaApprover]  = useState("")
  const [fpaRemarks,   setFpaRemarks]   = useState("")

  // ── Sample Cost ────────────────────────────────────────────────────────
  const [costSaved,    setCostSaved]    = useState(false)


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

    // Load sample cost saved flag
    try {
      const rawCost = localStorage.getItem("sample_cost_v1")
      const allCost: Record<string, unknown> = rawCost ? JSON.parse(rawCost) : {}
      if (allCost[npdId]) setCostSaved(true)
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

  const stageProgress = NTD_STAGES.map((name, idx) => ({
    step: idx + 1,
    name,
    status: (idx + 1) < activeStage ? "complete" : (idx + 1) === activeStage ? "current" : "upcoming"
  }))

  const advanceStage = () => {
    if (activeStage < TOTAL_STAGES) {
      const next = activeStage + 1
      setActiveStage(next)
      updateNPD(npdId, { stage: next, stageName: getStageName(next, npd.typeOfWork) })
    }
  }

  const deadvanceStage = () => {
    if (activeStage > 1) {
      const prev = activeStage - 1
      setActiveStage(prev)
      updateNPD(npdId, { stage: prev, stageName: getStageName(prev, npd.typeOfWork) })
    }
  }

  const isSpocOrSourcing = SPOC_NAMES.includes(currentRole) ||
    currentRole === "sourcing_head" || currentRole === "super_admin"

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

    // Advance stage to 4 — Supplier Defence
    if (activeStage < 4) {
      setActiveStage(4)
      updateNPD(npdId, { stage: 4, stageName: getStageName(4, npd.typeOfWork) })
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
    // Approving a vendor updates the supplier name and advances to Stage 5 — Sample Submission
    if (decision === "approved") {
      const updates: Partial<typeof npd> = { supplier: vendorName }
      if (activeStage < 5) {
        setActiveStage(5)
        updates.stage = 5
        updates.stageName = getStageName(5, npd.typeOfWork)
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
        dispatchDate: lq.formValues.q1 || null,
        sampleQty:    parseInt(lq.formValues.q2 || "") || null,
        moq:          parseInt(lq.formValues.q9 || "") || null,
        paymentTerms: lq.formValues.q10 || null,
        leadTimeDays: parseInt(lq.formValues.q11 || "") || null,
        submittedAt:  lq.submittedAt,
      })),
  ]

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-3xl font-bold text-slate-900">{npd.id}</h1>
            <Badge className="bg-blue-100 text-blue-900 border-none font-semibold text-sm">
              {npd.typeOfWork.split(" ")[0]}
            </Badge>
            {npd.gradeA && (
              <Badge className="bg-purple-100 text-purple-900 border-none flex items-center gap-1">
                <Star className="w-3 h-3" /> Grade A
              </Badge>
            )}
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priorityColor}`}>{npd.priority}</span>
          </div>
          <p className="text-slate-500 text-lg">{npd.itemName} · {npd.supplier} · {npd.productLine}</p>
        </div>

        <div className="flex items-center gap-6 text-right flex-wrap">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Stage</p>
            <p className="text-base font-bold text-blue-900 mt-0.5">Stage {activeStage}: {getStageName(activeStage, npd.typeOfWork)}</p>
          </div>
          <div className="h-10 w-px bg-slate-200 hidden lg:block" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">TAT Health</p>
            <p className={`text-base font-bold mt-0.5 ${tatColor}`}>{tatLabel}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={deadvanceStage}
              variant="outline"
              className="border-slate-300 text-slate-600"
              disabled={activeStage === 1}
            >
              ← Prev
            </Button>
            <Button
              onClick={advanceStage}
              className="bg-slate-900 text-white"
              disabled={activeStage === TOTAL_STAGES}
            >
              Next → Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <ul className="flex items-center justify-between min-w-[900px]">
          {stageProgress.map((stage, idx) => (
            <li key={stage.step} className="relative flex-1 text-center">
              {idx !== 0 && (
                <div className={`absolute top-4 left-[-10%] right-[50%] h-0.5 w-[120%] -z-10 ${
                  stage.status === "complete" || stage.status === "current" ? "bg-blue-900" : "bg-slate-200"
                }`} />
              )}
              <div className="flex flex-col items-center cursor-help relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${
                  stage.status === "complete" ? "border-emerald-500 text-emerald-500" :
                  stage.status === "current"  ? "border-blue-900 bg-blue-50 text-blue-900 ring-4 ring-blue-100" :
                  "border-slate-300 text-slate-300"
                }`}>
                  {stage.status === "complete"
                    ? <CheckCircle2 className="w-5 h-5" />
                    : <span className="text-sm font-bold">{stage.step}</span>}
                </div>
                <div className="absolute top-10 w-24 text-center pointer-events-none">
                  <span className={`text-[10px] leading-tight font-medium ${
                    stage.status === "current" ? "text-blue-900 font-bold" : "text-slate-500"
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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border text-slate-600 border-slate-200 rounded-lg p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview"  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900">Overview</TabsTrigger>
          <TabsTrigger value="supplier"  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900">Supplier Sourcing Workflow</TabsTrigger>
          <TabsTrigger value="quotes"    className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-900">
            Vendor Quotations
            {(() => {
              const liveOnlyCount = Object.values(liveQuotes)
                .filter(lq => !vendorQuotations.find(vq => vq.vendorName === lq.vendorName) && lq.status !== "re_negotiation" && !quoteApprovals[lq.vendorName])
                .length
              const mockPending = vendorQuotations.filter(v => {
                const live = liveQuotes[v.vendorName]
                const isSubmitted = live ? live.status !== "re_negotiation" : v.status === "submitted"
                return isSubmitted && !quoteApprovals[v.vendorName]
              }).length
              const pending = mockPending + liveOnlyCount
              return pending > 0 ? <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{pending}</span> : null
            })()}
          </TabsTrigger>
          <TabsTrigger value="testing"   className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-900">R&D Testing & TQR</TabsTrigger>
          <TabsTrigger value="costing"   className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-900">
            Sample Cost
          </TabsTrigger>
          <TabsTrigger value="tracking"  className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-900">Parts & Supplier Tracking</TabsTrigger>
          <TabsTrigger value="docs"      className="data-[state=active]:bg-slate-100">Documents Library</TabsTrigger>
          <TabsTrigger value="mail"      className="data-[state=active]:bg-slate-100">Integrated Mail Inbox</TabsTrigger>
        </TabsList>

        {/* ── Overview ──────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Initiation Details — dynamic */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">Initiation Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                {[
                  ["Item Name",    npd.itemName],
                  ["Item Category",npd.itemCategory],
                  ["Type of Work", npd.typeOfWork],
                  ["Product Line", npd.productLine],
                  ["R&D Division", npd.rAndDDivision || "—"],
                  ["Priority",     npd.priority],
                  ["SPOC",         npd.spoc],
                  ["Raised By",    npd.raisedBy === "rnd_head" ? "R&D Head" : "R&D User"],
                  ["Current Stage",`Stage ${activeStage}: ${getStageName(activeStage, npd.typeOfWork)}`],
                  ["TAT Health",   tatLabel],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-500 shrink-0 mr-4">{label}</span>
                    <span className="font-medium text-right text-slate-800">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">Activity Log</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
                  <div>
                    <p className="text-sm font-medium">Request Accepted by Supplier</p>
                    <p className="text-xs text-slate-500">2 days ago · {npd.supplier}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0"><Send className="w-4 h-4 text-blue-500" /></div>
                  <div>
                    <p className="text-sm font-medium">Request Dispatched via ASR</p>
                    <p className="text-xs text-slate-500">3 days ago · {npd.spoc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0"><FileText className="w-4 h-4 text-slate-400" /></div>
                  <div>
                    <p className="text-sm font-medium">Request Initiated</p>
                    <p className="text-xs text-slate-500">4 days ago · {npd.raisedBy === "rnd_head" ? "R&D Head" : "R&D User"}</p>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          {currentRole === "rnd_head" && activeStage < 3 && (
            <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-emerald-900">R&D Head Action Required</CardTitle>
                <CardDescription className="text-emerald-700">
                  Approve this request to automatically assign the appropriate Sourcing SPOC based on commodity ({npd.itemCategory}).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                  onClick={() => {
                    alert(`REQUEST APPROVED.\n\nAutomated hand-off email dispatched to Sourcing Head and ${npd.itemCategory} SPOC.\n\nStatus transitioning to 'NPD Sourcing Allocation'.`)
                    if (activeStage < 3) setActiveStage(3)
                    updateNPD(npdId, { stage: 3, stageName: getStageName(3, npd.typeOfWork) })
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve Request & Trigger Handoff
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Sample Receipt / MRN ───────────────────────────────────────── */}
          {activeStage === 5 && (currentRole.startsWith("rnd") || currentRole === "super_admin") && (
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-blue-50 border-b border-blue-100 pb-3">
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <DownloadCloud className="w-5 h-5" /> Accept Delivery / Raise MRN
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {mrnStatus === "idle" && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Samples dispatched by supplier</p>
                      <p className="text-xs text-blue-700 mt-1">Log receipt when physical delivery is confirmed to move to Sample Receipt stage.</p>
                    </div>
                    <Button className="bg-blue-900 hover:bg-blue-800 text-white shrink-0" onClick={() => setMrnStatus("form")}>
                      <DownloadCloud className="w-4 h-4 mr-2" /> Accept Delivery
                    </Button>
                  </div>
                )}

                {mrnStatus === "form" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">MRN Number <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={mrnNumber}
                          onChange={e => setMrnNumber(e.target.value)}
                          placeholder="e.g. MRN-2026-0042"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Date of Receipt <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={mrnDate}
                          onChange={e => setMrnDate(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Quantity Received <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          value={mrnQty}
                          onChange={e => setMrnQty(e.target.value)}
                          placeholder="e.g. 5"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Condition</label>
                        <select
                          value={mrnCondition}
                          onChange={e => setMrnCondition(e.target.value as "Good" | "Damaged" | "Partial")}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option>Good</option>
                          <option>Damaged</option>
                          <option>Partial</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
                      <textarea
                        rows={2}
                        value={mrnNotes}
                        onChange={e => setMrnNotes(e.target.value)}
                        placeholder="Any observations about the received samples…"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                    </div>
                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                      <Button variant="outline" onClick={() => setMrnStatus("idle")}>Cancel</Button>
                      <Button
                        className="bg-blue-900 hover:bg-blue-800 text-white"
                        disabled={!mrnNumber || !mrnDate || !mrnQty}
                        onClick={() => {
                          const rawMRN = localStorage.getItem("sample_receipt_v1")
                          const allMRN: Record<string, unknown> = rawMRN ? JSON.parse(rawMRN) : {}
                          allMRN[npdId] = {
                            mrnNumber, receivedDate: mrnDate, receivedQty: parseInt(mrnQty),
                            condition: mrnCondition, notes: mrnNotes,
                            supplier: npd.supplier, raisedBy: currentRole,
                            raisedAt: new Date().toLocaleString("en-IN"),
                          }
                          localStorage.setItem("sample_receipt_v1", JSON.stringify(allMRN))
                          setMrnStatus("raised")
                          setActiveStage(6)
                          updateNPD(npdId, { stage: 6, stageName: "Sample Receipt / MRN" })
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Log Receipt & Raise for Approval
                      </Button>
                    </div>
                  </div>
                )}

                {mrnStatus === "raised" && (
                  <div className={`rounded-lg border p-4 flex items-start gap-3 ${mrnApproved ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                    {mrnApproved
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      : <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                    <div>
                      <p className={`text-sm font-bold ${mrnApproved ? "text-emerald-800" : "text-amber-800"}`}>
                        {mrnApproved ? "MRN Approved — R&D Evaluation in Progress" : "MRN Raised — Pending R&D Head Approval"}
                      </p>
                      <p className={`text-xs mt-0.5 ${mrnApproved ? "text-emerald-700" : "text-amber-700"}`}>
                        {mrnApproved
                          ? "R&D Head has approved the sample receipt. Evaluation underway."
                          : "MRN submitted. R&D Head needs to approve from the Approvals tab to begin evaluation."}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeStage >= 6 && mrnStatus !== "idle" && mrnStatus !== "form" && (
            <Card className={`shadow-sm ${mrnApproved ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}`}>
              <CardContent className="py-4 px-5 flex items-center gap-3">
                {mrnApproved
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  : <Clock className="w-5 h-5 text-amber-500 shrink-0" />}
                <div>
                  <p className={`text-sm font-bold ${mrnApproved ? "text-emerald-800" : "text-amber-800"}`}>
                    {mrnApproved ? "Sample Receipt Approved — R&D Evaluation Active" : "MRN Raised — Awaiting R&D Head Approval"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {mrnApproved ? "Stage 7 in progress." : "Approve from the Approvals tab in the left sidebar."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Supplier Sourcing Workflow ─────────────────────────────────────── */}
        <TabsContent value="supplier" className="mt-6 space-y-6">
          {isSpocOrSourcing ? (
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
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-slate-500">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Sourcing Actions Locked</h3>
                <p>Only SPOCs and Sourcing personnel can execute vendor selection and bulk RFQ dispatch.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Sample Cost Finalization ──────────────────────────────────────── */}
        <TabsContent value="costing" className="mt-6">
          <Card className="border-amber-200">
            <CardHeader className="bg-amber-50 border-b border-amber-100 rounded-t-xl">
              <CardTitle className="text-amber-900 flex items-center">
                Sample Cost Finalization
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {costSaved && (
                <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800">Sample cost saved successfully.</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Unit Cost Quoted by Supplier (₹)</label>
                    <input id="sc-unit" type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" defaultValue="310.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Tooling Cost (Amortized / One-time)</label>
                    <input id="sc-tooling" type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" defaultValue="0" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-700">Primary Pkg</label>
                      <input id="sc-ppkg" type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 p-2 border" defaultValue="2.5" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Secondary Pkg</label>
                      <input id="sc-spkg" type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 p-2 border" defaultValue="0" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Transit Pkg</label>
                      <input id="sc-tpkg" type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 p-2 border" defaultValue="8.0" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Estimated Transport Cost / Unit</label>
                    <input id="sc-transport" type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" defaultValue="15.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Confirmed MOQ</label>
                    <input id="sc-moq" type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" defaultValue="5000" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Payment Terms</label>
                    <select id="sc-payment" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 p-2 border">
                      <option>90 Days Credit</option>
                      <option>60 Days Credit</option>
                      <option>LC</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-3 justify-end">
                <Button
                  variant="outline"
                  className="border-amber-300 text-amber-800 hover:bg-amber-50"
                  onClick={() => {
                    const raw = localStorage.getItem("sample_cost_v1")
                    const all: Record<string, unknown> = raw ? JSON.parse(raw) : {}
                    all[npdId] = {
                      unitCost:  (document.getElementById("sc-unit") as HTMLInputElement)?.value,
                      tooling:   (document.getElementById("sc-tooling") as HTMLInputElement)?.value,
                      primaryPkg:(document.getElementById("sc-ppkg") as HTMLInputElement)?.value,
                      moq:       (document.getElementById("sc-moq") as HTMLInputElement)?.value,
                      payment:   (document.getElementById("sc-payment") as HTMLSelectElement)?.value,
                      savedAt:   new Date().toLocaleString("en-IN"),
                    }
                    localStorage.setItem("sample_cost_v1", JSON.stringify(all))
                    setCostSaved(true)
                  }}
                >
                  Save Draft
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-8"
                  onClick={() => {
                    const raw = localStorage.getItem("sample_cost_v1")
                    const all: Record<string, unknown> = raw ? JSON.parse(raw) : {}
                    all[npdId] = {
                      unitCost:  (document.getElementById("sc-unit") as HTMLInputElement)?.value,
                      tooling:   (document.getElementById("sc-tooling") as HTMLInputElement)?.value,
                      primaryPkg:(document.getElementById("sc-ppkg") as HTMLInputElement)?.value,
                      moq:       (document.getElementById("sc-moq") as HTMLInputElement)?.value,
                      payment:   (document.getElementById("sc-payment") as HTMLSelectElement)?.value,
                      savedAt:   new Date().toLocaleString("en-IN"),
                    }
                    localStorage.setItem("sample_cost_v1", JSON.stringify(all))
                    setCostSaved(true)
                    if (activeStage < 10) {
                      setActiveStage(10)
                      updateNPD(npdId, { stage: 10, stageName: getStageName(10, npd.typeOfWork) })
                    }
                  }}
                >
                  Finalise & Push to AICM
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Vendor Quotations ─────────────────────────────────────────────── */}
        <TabsContent value="quotes" className="mt-6 space-y-4">
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

                // formValues are keyed by question ID (q1..q12)
                const unitCostVal  = live ? (parseFloat(live.formValues.q3 || "") || null) : v.unitCost
                const toolingVal   = live ? (parseFloat(live.formValues.q4 || "") || null) : v.toolingCost
                const dispatchVal  = live ? (live.formValues.q1 || v.dispatchDate) : v.dispatchDate
                const samplesVal   = live ? (parseInt(live.formValues.q2 || "") || null) : v.sampleQty
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

                return (
                  <Card key={v.vendorName} className={`border ${
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
                            {(isSubmitted || isReNegotiating) && submittedAt && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {isReNegotiating ? "Re-negotiation sent" : "Submitted on"} {submittedAt}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* Status badge */}
                        {approval === "approved" ? (
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

                    {(isSubmitted || isReNegotiating) ? (
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
        </TabsContent>

        {/* ── R&D Testing & TQR ─────────────────────────────────────────────── */}
        <TabsContent value="testing" className="mt-6">
          <Card>
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle>TQR Scorecard (R&D Sample Evaluation)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
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
                          alert("SAMPLE REJECTED.\n\nAutomated email dispatched to Supplier & Sourcing.\n\nEmail contains:\n1. Your rejection reason\n2. Attached revised drawings\n3. An active portal link for the supplier to submit Revised Sample ETA and Revised Costing.")
                          setTqrStatus("rejected")
                        }}
                      >
                        Confirm Rejection & Notify Supplier
                      </Button>
                    </div>
                  </div>
                </div>
              ) : tqrStatus === "rejected" ? (
                <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg text-center">
                  <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold">Sample Rejected by R&D</h3>
                  <p className="text-sm mt-1">Supplier has been notified to provide an updated sample submission timeline and costing impact.</p>
                </div>
              ) : tqrStatus === "fully_approved" ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-lg text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold">Sample Fully Approved</h3>
                  <p className="text-sm mt-1">Both R&D User and R&D Head have approved. Auto-mail dispatched to Supplier & Sourcing.</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center justify-between bg-blue-50 p-6 rounded-lg border border-blue-100 gap-6 mt-2">
                  <div>
                    <p className="text-sm font-bold text-blue-900">Sample Evaluation Actions</p>
                    <p className="text-xs text-blue-700 mt-1">Review the physical sample and documentation before rendering a final decision.</p>
                  </div>
                  {tqrStatus === "pending" && (currentRole.startsWith("rnd") || currentRole === "super_admin") ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 bg-white" onClick={() => setTqrStatus("rejecting")}>
                        <XCircle className="w-4 h-4 mr-2" /> Reject Sample
                      </Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setTqrStatus("approved_by_user")}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve (Route to R&D Head)
                      </Button>
                    </div>
                  ) : tqrStatus === "approved_by_user" && (currentRole === "rnd_head" || currentRole === "super_admin") ? (
                    <div className="text-right">
                      <p className="text-emerald-700 font-bold mb-2">✓ R&D User Approved. Awaiting Your Sign-off.</p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-end">
                        <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 bg-white" onClick={() => setTqrStatus("rejecting")}>
                          <XCircle className="w-4 h-4 mr-2" /> Override & Reject
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                          alert("APPROVAL COMPLETE.\n\nAutomated email dispatched to Supplier & Sourcing stating NPD Request is Fully Approved.")
                          setTqrStatus("fully_approved")
                        }}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Final R&D Head Approval
                        </Button>
                      </div>
                    </div>
                  ) : tqrStatus === "approved_by_user" ? (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1 text-sm font-medium">
                      <Clock className="w-4 h-4 mr-1" /> Pending R&D Head Approval
                    </Badge>
                  ) : (
                    <div className="text-slate-500 italic text-sm">Action locked for your current role.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── FPA (First Part Approval) ──────────────────────────────────── */}
          {activeStage >= 8 && (
            <Card className="border-purple-200 shadow-sm mt-6">
              <CardHeader className="bg-purple-50 border-b border-purple-100 pb-3">
                <CardTitle className="text-purple-900 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" /> FPA — First Part Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {fpaStatus === "done" ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800">FPA Submitted</p>
                      <p className="text-xs text-emerald-700 mt-0.5">First Part Approval has been logged and is on record.</p>
                    </div>
                  </div>
                ) : fpaStatus === "form" ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">FPA Reference Number</label>
                        <input
                          type="text"
                          value={fpaNumber}
                          onChange={e => setFpaNumber(e.target.value)}
                          placeholder="e.g. FPA-2026-0019"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">FPA Date</label>
                        <input
                          type="date"
                          value={fpaDate}
                          onChange={e => setFpaDate(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Approved By</label>
                        <input
                          type="text"
                          value={fpaApprover}
                          onChange={e => setFpaApprover(e.target.value)}
                          placeholder="Name of approving engineer"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Remarks</label>
                        <input
                          type="text"
                          value={fpaRemarks}
                          onChange={e => setFpaRemarks(e.target.value)}
                          placeholder="e.g. All dimensions within tolerance"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div className="border-2 border-dashed border-purple-200 rounded-lg p-4 text-center hover:bg-purple-50 cursor-pointer">
                      <p className="text-sm text-slate-500">Click to upload FPA signed document (PDF / image)</p>
                    </div>
                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                      <Button variant="outline" onClick={() => setFpaStatus("idle")}>Cancel</Button>
                      <Button
                        className="bg-purple-700 hover:bg-purple-800 text-white"
                        disabled={!fpaNumber || !fpaDate}
                        onClick={() => {
                          const raw = localStorage.getItem("fpa_data_v1")
                          const all: Record<string, unknown> = raw ? JSON.parse(raw) : {}
                          all[npdId] = { fpaNumber, fpaDate, fpaApprover, fpaRemarks, submittedAt: new Date().toLocaleString("en-IN") }
                          localStorage.setItem("fpa_data_v1", JSON.stringify(all))
                          setFpaStatus("done")
                          if (activeStage < 9) {
                            setActiveStage(9)
                            updateNPD(npdId, { stage: 9, stageName: "Sample Cost Finalization" })
                          }
                        }}
                      >
                        <ClipboardCheck className="w-4 h-4 mr-2" /> Submit FPA
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-purple-50/50 rounded-lg p-4 border border-purple-100">
                    <div>
                      <p className="text-sm font-semibold text-purple-900">First Part Approval pending</p>
                      <p className="text-xs text-purple-700 mt-1">Log the FPA once the sample has been dimensionally verified and signed off.</p>
                    </div>
                    <Button className="bg-purple-700 hover:bg-purple-800 text-white shrink-0" onClick={() => setFpaStatus("form")}>
                      <ClipboardCheck className="w-4 h-4 mr-2" /> Add FPA
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Integrated Mail Inbox ─────────────────────────────────────────── */}
        <TabsContent value="mail" className="mt-4">
          {(() => {
            const INBOX_THREADS = [
              {
                id: 0,
                from: `${npd.supplier} — Sales`,
                fromInitials: npd.supplier.slice(0,2).toUpperCase(),
                fromColor: "#1E40AF",
                fromBg: "#EFF6FF",
                subject: `Re: Clarification on Drawing Tolerances — ${npd.id}`,
                preview: `Dear Amber Sourcing team, we received the latest rev of the drawing but wanted to confirm if the ±0.5 mm tolerance on the flare is rigid…`,
                time: "Today, 10:45 AM",
                unread: true,
                body: `<p>Dear Amber Sourcing team,</p>
<p>We received the latest revision of the drawing (<strong>${npd.id}</strong>) but wanted to confirm whether the ±0.5 mm tolerance on the flare geometry is rigid, as our standard tooling for <strong>${npd.itemCategory}</strong> runs at ±0.6 mm.</p>
<p>We can achieve the tighter spec with a dedicated die modification — estimated lead time is 4 additional working days. Please advise if we should proceed.</p>
<p>Best regards,<br />${npd.supplier} Sales Team</p>`,
              },
              {
                id: 1,
                from: `${npd.supplier} — Technical`,
                fromInitials: npd.supplier.slice(0,2).toUpperCase(),
                fromColor: "#1E40AF",
                fromBg: "#EFF6FF",
                subject: `Material Certification — ${npd.id}`,
                preview: `Attached: RoHS Compliance certificate and MSDS for the raw material batch used in your sample production run…`,
                time: "Yesterday, 4:12 PM",
                unread: false,
                body: `<p>Hi Team,</p>
<p>Please find attached:</p>
<ul style="list-style:disc;padding-left:20px;margin:10px 0">
  <li>RoHS Compliance Certificate (valid until Dec 2027)</li>
  <li>MSDS — Raw material batch #AM-2026-119</li>
  <li>Factory Acceptance Test (FAT) report for batch</li>
</ul>
<p>Let us know if additional documentation is required before sample dispatch.</p>
<p>Regards,<br />${npd.supplier} Technical Team</p>`,
              },
              {
                id: 2,
                from: "National Metalfabs",
                fromInitials: "NM",
                fromColor: "#059669",
                fromBg: "#ECFDF5",
                subject: `Sample Dispatch Confirmation — ${npd.id}`,
                preview: `This is to confirm dispatch of 10 samples via Blue Dart courier AWB# 74291832. Expected delivery: 2 business days…`,
                time: "2 days ago",
                unread: false,
                body: `<p>Dear Amber Sourcing,</p>
<p>We are pleased to confirm dispatch of <strong>10 samples</strong> for NPD reference <strong>${npd.id}</strong>.</p>
<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:13px">
  <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0"><td style="padding:6px 10px;font-weight:600">Courier</td><td style="padding:6px 10px">Blue Dart Express</td></tr>
  <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:6px 10px;font-weight:600">AWB#</td><td style="padding:6px 10px">74291832</td></tr>
  <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0"><td style="padding:6px 10px;font-weight:600">ETA</td><td style="padding:6px 10px">2 business days</td></tr>
  <tr><td style="padding:6px 10px;font-weight:600">Packed by</td><td style="padding:6px 10px">QA Dept, NM Faridabad</td></tr>
</table>
<p>Regards,<br />National Metalfabs</p>`,
              },
            ]

            const SYSTEM_THREADS = [
              {
                id: 100,
                from: "Amber ASR · System",
                fromInitials: "AS",
                fromColor: "#7C3AED",
                fromBg: "#F5F3FF",
                subject: `RFQ Dispatched to ${composedEmails.length || 3} Vendors — ${npd.id}`,
                preview: `Automated RFQ emails dispatched to shortlisted suppliers via Amber Sourcing portal. Replies tracked automatically.`,
                time: "3 days ago",
                unread: false,
                body: `<p><strong>Automated System Notice</strong></p>
<p>RFQ emails were dispatched to all shortlisted suppliers for <strong>${npd.id} — ${npd.itemName}</strong>.</p>
<p><strong>${composedEmails.length || 3} suppliers</strong> were contacted. Each email includes:</p>
<ul style="list-style:disc;padding-left:20px;margin:10px 0">
  <li>Technical specification summary</li>
  <li>Quantity and delivery requirements</li>
  <li>Secure portal link for quotation submission</li>
  <li>Drawing folder access (if attached)</li>
</ul>
<p>Replies will be captured automatically when suppliers submit via the portal.</p>`,
              },
              {
                id: 101,
                from: "Amber ASR · System",
                fromInitials: "AS",
                fromColor: "#7C3AED",
                fromBg: "#F5F3FF",
                subject: `NPD Request Created — ${npd.id}`,
                preview: `New NPD request has been initiated. R&D review pending. Assigned SPOC: ${npd.spoc}.`,
                time: "5 days ago",
                unread: false,
                body: `<p><strong>New NPD Initiated</strong></p>
<p>A new sourcing request has been created with the following details:</p>
<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:13px">
  <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0"><td style="padding:6px 10px;font-weight:600">NPD ID</td><td style="padding:6px 10px">${npd.id}</td></tr>
  <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:6px 10px;font-weight:600">Item</td><td style="padding:6px 10px">${npd.itemName}</td></tr>
  <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0"><td style="padding:6px 10px;font-weight:600">Category</td><td style="padding:6px 10px">${npd.itemCategory}</td></tr>
  <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:6px 10px;font-weight:600">SPOC Assigned</td><td style="padding:6px 10px">${npd.spoc}</td></tr>
  <tr style="background:#f8fafc"><td style="padding:6px 10px;font-weight:600">Priority</td><td style="padding:6px 10px">${npd.priority}</td></tr>
</table>`,
              },
            ]

            const SENT_THREADS = composedEmails.map((e, i) => ({
              id: 200 + i,
              from: `To: ${e.vendorName}`,
              fromInitials: e.vendorName.slice(0,2).toUpperCase(),
              fromColor: "#0891B2",
              fromBg: "#ECFEFF",
              subject: e.subject,
              preview: e.body.replace(/<[^>]+>/g, " ").slice(0, 120) + "…",
              time: "3 days ago",
              unread: false,
              body: e.body,
            }))

            const folderThreads =
              mailFolder === "inbox"  ? INBOX_THREADS  :
              mailFolder === "sent"   ? SENT_THREADS   :
              SYSTEM_THREADS

            const selected = folderThreads[selectedMail ?? 0] ?? folderThreads[0]

            return (
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden" style={{ height: 580 }}>
                <div className="flex h-full">

                  {/* ── Folder sidebar ── */}
                  <div className="w-44 shrink-0 border-r border-slate-100 flex flex-col" style={{ background: "#FAFAFA" }}>
                    <div className="px-3 pt-4 pb-3 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">Mail</p>
                    </div>
                    <div className="flex-1 py-2 px-2 space-y-0.5">
                      {[
                        { id: "inbox"  as const, label: "Inbox",  icon: Inbox,   count: INBOX_THREADS.filter(t => t.unread).length },
                        { id: "sent"   as const, label: "Outbox", icon: Send,    count: SENT_THREADS.length },
                        { id: "system" as const, label: "System", icon: Bot,     count: 0 },
                      ].map(f => {
                        const Icon = f.icon
                        const active = mailFolder === f.id
                        return (
                          <button
                            key={f.id}
                            onClick={() => { setMailFolder(f.id); setSelectedMail(0); setReplyText("") }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all"
                            style={{
                              background: active ? "#0F172A" : "transparent",
                              color: active ? "#FFFFFF" : "#64748B",
                            }}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1 text-left">{f.label}</span>
                            {f.count > 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: active ? "rgba(255,255,255,0.2)" : "#EFF6FF", color: active ? "#fff" : "#1E40AF" }}>
                                {f.count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <div className="p-2 border-t border-slate-100">
                      <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
                        <RefreshCw className="w-3 h-3" /> Sync
                      </button>
                    </div>
                  </div>

                  {/* ── Thread list ── */}
                  <div className="w-64 shrink-0 border-r border-slate-100 flex flex-col overflow-hidden">
                    <div className="px-3 pt-3 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-700 capitalize">{mailFolder}</p>
                      <span className="text-[10px] text-slate-400">{folderThreads.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                      {folderThreads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-10">
                          <Mail className="w-7 h-7 text-slate-200 mb-2" />
                          <p className="text-[11px] text-slate-400">No emails yet</p>
                        </div>
                      ) : (
                        folderThreads.map((t, i) => (
                          <button
                            key={t.id}
                            onClick={() => { setSelectedMail(i); setReplyText("") }}
                            className="w-full text-left px-3 py-3 transition-colors hover:bg-slate-50"
                            style={{ background: selectedMail === i ? "#EFF6FF" : undefined, borderLeft: selectedMail === i ? "2px solid #1E40AF" : "2px solid transparent" }}
                          >
                            <div className="flex items-start gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                                style={{ background: t.fromColor }}>
                                {t.fromInitials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <p className={`text-[12px] truncate leading-tight ${t.unread ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}>
                                    {t.from}
                                  </p>
                                  {t.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                                </div>
                                <p className={`text-[11px] truncate mt-0.5 ${t.unread ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                                  {t.subject.replace(` — ${npd.id}`, "")}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">{t.preview}</p>
                                <p className="text-[9px] text-slate-400 mt-1">{t.time}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* ── Reading pane ── */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {selected ? (
                      <>
                        {/* Email header */}
                        <div className="px-5 py-4 border-b border-slate-100">
                          <h3 className="text-[14px] font-bold text-slate-900 leading-tight mb-2">{selected.subject}</h3>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ background: selected.fromColor }}>
                              {selected.fromInitials}
                            </div>
                            <div>
                              <p className="text-[12px] font-semibold text-slate-800">{selected.from}</p>
                              <p className="text-[11px] text-slate-400">To: sourcing@amberenterprises.in · {selected.time}</p>
                            </div>
                            <div className="ml-auto flex items-center gap-1.5">
                              {mailFolder === "inbox" && (
                                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                  {npd.id}
                                </span>
                              )}
                              {selected.unread && (
                                <span className="text-[9px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                                  UNREAD
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Email body */}
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                          <div
                            className="text-[13px] text-slate-700 leading-relaxed [&_p]:mb-3 [&_strong]:font-semibold [&_table]:border-collapse [&_table]:w-full [&_td]:text-[12px] [&_ul]:my-2 [&_li]:mb-1 max-w-2xl"
                            dangerouslySetInnerHTML={{ __html: selected.body }}
                          />
                        </div>

                        {/* Reply area — only in inbox */}
                        {mailFolder === "inbox" && (
                          <div className="border-t border-slate-100 px-5 py-3">
                            {replySent[selected.id] ? (
                              <div className="flex items-center gap-2 text-[12px] text-emerald-600 font-semibold py-1">
                                <CheckCircle2 className="w-4 h-4" /> Reply sent to {selected.from}
                              </div>
                            ) : (
                              <div className="flex gap-3 items-end">
                                <div className="flex-1 relative">
                                  <CornerUpLeft className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
                                  <textarea
                                    rows={2}
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder={`Reply to ${selected.from}…`}
                                    className="w-full pl-9 pr-3 py-2.5 text-[12px] text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400 resize-none"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    if (!replyText.trim()) return
                                    setReplySent(prev => ({ ...prev, [selected.id]: true }))
                                    setReplyText("")
                                  }}
                                  disabled={!replyText.trim()}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition-colors shrink-0"
                                  style={{ background: replyText.trim() ? "#0F172A" : "#CBD5E1", cursor: replyText.trim() ? "pointer" : "not-allowed" }}
                                >
                                  <Send className="w-3.5 h-3.5" /> Send
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Compose bar for sent/outbox */}
                        {mailFolder === "sent" && (
                          <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (selected.body) {
                                  navigator.clipboard.writeText(`Subject: ${selected.subject}\n\n${selected.body.replace(/<[^>]+>/g, "")}`)
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copy to Clipboard
                            </button>
                            <span className="text-[11px] text-slate-400">Sent via Amber Sourcing Portal</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <Mail className="w-10 h-10 mb-3" />
                        <p className="text-[13px] font-medium">Select an email to read</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )
          })()}
        </TabsContent>

        {/* ── Parts & Supplier Tracking ─────────────────────────────────────── */}
        <TabsContent value="tracking" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
              <CardTitle className="text-lg">Multi-Part Tracking Matrix</CardTitle>
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
        </TabsContent>

        {/* ── Documents Library ─────────────────────────────────────────────── */}
        <TabsContent value="docs" className="mt-6 space-y-5">

          {/* Design & Drawing */}
          <Card>
            <CardHeader className="pb-3 border-b bg-blue-50/40">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-700" /> Design & Drawing Folder
              </CardTitle>
              <CardDescription>Shared by R&D during request creation</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
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
            </CardContent>
          </Card>

          {/* Supplier Submissions */}
          <Card>
            <CardHeader className="pb-3 border-b bg-emerald-50/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-emerald-700" /> Supplier Submitted Documents
                  </CardTitle>
                  <CardDescription>Uploaded by suppliers via the enquiry form</CardDescription>
                </div>
                {supplierDocs.length > 0 && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                    {supplierDocs.length} file{supplierDocs.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {supplierDocs.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <UploadCloud className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No documents submitted yet.</p>
                  <p className="text-xs mt-1">Supplier documents will appear here after the enquiry form is submitted.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {supplierDocs.map((doc, i) => {
                    const ext = doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE"
                    const extColor =
                      ext === "PDF"  ? "bg-red-100 text-red-700"  :
                      ext === "XLSX" ? "bg-green-100 text-green-700" :
                      "bg-slate-100 text-slate-600"
                    return (
                      <div key={i} className="flex items-center gap-3 py-3">
                        <div className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded ${extColor}`}>{ext}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {doc.submittedBy} · {doc.submittedAt} · {doc.sizeMB} MB
                          </p>
                        </div>
                        <button className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
