"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  getStageName, VENDOR_CATALOG, SPOC_NAMES, NPD_STAGES, TOTAL_NPD_STAGES,
  MOCK_SUPPLIER_DOCS, SUPPLIER_DOCS_KEY,
  MOCK_VENDOR_QUOTATIONS, VENDOR_QUOTE_APPROVALS_KEY,
  LIVE_QUOTATIONS_KEY, ENQUIRY_SENT_KEY, VENDOR_RFQ_TEMPLATE_KEY, DEFAULT_RFQ_TEMPLATE, VENDOR_EMAIL, COMPOSED_EMAILS_KEY,
  VENDOR_STATUS_KEY, DEFAULT_STATUS_TEMPLATE, VENDOR_STATUS_TEMPLATE_KEY, VENDOR_DATE_APPROVAL_KEY,
  SUPPLIER_DISPATCH_KEY, DELIVERY_ACCEPTANCE_KEY,
  PART_ASSIGNMENT_KEY, PLANT_SUPPLIER_RESP_KEY, PLANT_ACCEPTANCE_KEY, REJECTED_PARTS_KEY,
  PUSH_NOTIFICATIONS_KEY, RND_EVAL_KEY, AICM_FETCH_KEY,
  DELIVERY_DETAILS_KEY, AMBER_PLANTS,
  DEFAULT_RND_CONTACT, DEFAULT_RND_HEAD,
  getTestsByCategory, getTotalTestDays,
  type VendorRecord, type SupplierDoc, type VendorQuotation, type LiveQuotation, type VendorStatusResponse, type PushNotification, type TestResult,
} from "@/lib/mockData"
import { useNPDs } from "@/lib/npdContext"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, Circle, CheckCircle, Clock, AlertCircle, FileText,
  Send, MessageSquare, Mail, ShieldCheck, XCircle, Star, Copy, ExternalLink, Link2,
  FolderOpen, UploadCloud, Download, Package, Bell,
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
  const [copied, setCopied] = useState(false)

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
              onClick={() => {
                navigator.clipboard.writeText(portalUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              {copied ? "Copied!" : <><Copy className="w-3 h-3" /> Copy</>}
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

function EmailCard({ to, subject, body }: { to: string; subject: string; body: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[10px] text-slate-400 shrink-0">To: {to} ·</span>
          <span className="text-xs font-semibold text-white truncate">{subject}</span>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(`To: ${to}\nSubject: ${subject}\n\n${body}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="shrink-0 ml-3 text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1"
        >
          <Copy className="w-3 h-3" />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="px-5 py-4 text-sm text-slate-900 leading-relaxed bg-white [&_p]:mb-3 [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  )
}

function PushSentBadge({ to }: { to: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
      <Bell className="w-3 h-3 shrink-0" />
      <span>Push notification sent to <strong>{to}</strong></span>
    </div>
  )
}

function savePush(title: string, body: string, npdId: string, icon: PushNotification["icon"] = "mail") {
  const raw = localStorage.getItem(PUSH_NOTIFICATIONS_KEY)
  const all: PushNotification[] = raw ? JSON.parse(raw) : []
  all.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    body,
    time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    to: "internal",
    npdId,
    icon,
    read: false,
  })
  localStorage.setItem(PUSH_NOTIFICATIONS_KEY, JSON.stringify(all))
  window.dispatchEvent(new Event("push_notification"))
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
  const TQR_STATUS_KEY = `tqr_status_v1`
  const [tqrStatus, setTqrStatusState] = useState("pending")
  const setTqrStatus = (s: string) => {
    setTqrStatusState(s)
    const raw = localStorage.getItem(TQR_STATUS_KEY)
    const all: Record<string, string> = raw ? JSON.parse(raw) : {}
    all[npdId] = s
    localStorage.setItem(TQR_STATUS_KEY, JSON.stringify(all))
  }
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

  // ── Supplier Dispatch ───────────────────────────────────────────────────
  const [defenceAdvanced, setDefenceAdvanced] = useState(false)

  // ── Delivery Details (sourcing fills location + qty for stage 7) ─────────
  const [deliveryDetails, setDeliveryDetails] = useState<{ location: string; requiredQty: string; setAt: string } | null>(null)
  const [deliveryLocation, setDeliveryLocation] = useState("")
  const [deliveryReqQty,   setDeliveryReqQty]   = useState("")
  const [deliveryDetailsSubmitted, setDeliveryDetailsSubmitted] = useState(false)


  // ── Query reply form (keyed by vendorName) ──────────────────────────────
  const [queryReplyText, setQueryReplyText] = useState<Record<string, string>>({})
  const [queryReplyDoc,  setQueryReplyDoc]  = useState<Record<string, string>>({})

  // ── Dispatch info from supplier portal ──────────────────────────────────
  const [dispatchInfo, setDispatchInfo] = useState<{
    vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string
  } | null>(null)

  // ── Delivery acceptance (two-step: user submits, head approves) ──────────
  const [deliveryDoc,          setDeliveryDoc]          = useState("")
  const [deliverySubmitted,    setDeliverySubmitted]    = useState(false)
  const [deliveryHeadApproved, setDeliveryHeadApproved] = useState(false)

  // ── Stage 8: Plant Delivery Acceptance ───────────────────────────────────
  const [partAssigned,           setPartAssigned]           = useState(false)
  const [assignedPartNumber,     setAssignedPartNumber]     = useState("")
  const [plantDeliveryDate,      setPlantDeliveryDate]      = useState("")
  const [plantDeliveryQty,       setPlantDeliveryQty]       = useState("")
  const [plantSupplierSubmitted, setPlantSupplierSubmitted] = useState(false)
  const [plantDeliveryDoc,       setPlantDeliveryDoc]       = useState("")
  const [plantDeliveryAccepted,  setPlantDeliveryAccepted]  = useState(false)
  const [plantVerdict,           setPlantVerdict]           = useState<"accepted" | "not_good" | null>(null)
  const [verdictSelection,       setVerdictSelection]       = useState<"accepted" | "not_good" | null>(null)
  const [plantRemarks,           setPlantRemarks]           = useState("")
  const [testResults,            setTestResults]            = useState<Record<string, string>>({})
  const [evalSubmitted,          setEvalSubmitted]          = useState(false)
  const [evalStartedAt,          setEvalStartedAt]          = useState<string | null>(null)
  const [aicmFetched,            setAicmFetched]            = useState(false)
  const [aicmLoading,            setAicmLoading]            = useState(false)
  const [aicmPanelOpen,          setAicmPanelOpen]          = useState(false)

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

    const rawDispatch = localStorage.getItem(SUPPLIER_DISPATCH_KEY)
    const allDispatch: Record<string, { vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string }> = rawDispatch ? JSON.parse(rawDispatch) : {}
    setDispatchInfo(allDispatch[npdId] ?? null)

    const rawAcceptance = localStorage.getItem(DELIVERY_ACCEPTANCE_KEY)
    const allAcceptance: Record<string, { docName: string; acceptedAt: string; headApproved: boolean }> = rawAcceptance ? JSON.parse(rawAcceptance) : {}
    if (allAcceptance[npdId]) {
      setDeliveryDoc(allAcceptance[npdId].docName)
      setDeliverySubmitted(true)
      if (allAcceptance[npdId].headApproved) setDeliveryHeadApproved(true)
    } else {
      setDeliveryDoc("")
      setDeliverySubmitted(false)
      setDeliveryHeadApproved(false)
    }

    const rawDD = localStorage.getItem(DELIVERY_DETAILS_KEY)
    const allDD: Record<string, { location: string; requiredQty: string; setAt: string }> = rawDD ? JSON.parse(rawDD) : {}
    if (allDD[npdId]) {
      setDeliveryDetails(allDD[npdId])
      setDeliveryLocation(allDD[npdId].location)
      setDeliveryReqQty(allDD[npdId].requiredQty)
      setDeliveryDetailsSubmitted(true)
    }

    // Stage 8 — part assignment
    const rawPartAssign = localStorage.getItem(PART_ASSIGNMENT_KEY)
    const allPartAssign: Record<string, { partNumber: string; assignedAt: string }> = rawPartAssign ? JSON.parse(rawPartAssign) : {}
    if (allPartAssign[npdId]) {
      setPartAssigned(true)
      setAssignedPartNumber(allPartAssign[npdId].partNumber)
    } else {
      setPartAssigned(false)
      setAssignedPartNumber("")
    }

    // Stage 8 — supplier delivery response
    const rawPlantSupp = localStorage.getItem(PLANT_SUPPLIER_RESP_KEY)
    const allPlantSupp: Record<string, { deliveryDate: string; sampleQty: number; submittedAt: string }> = rawPlantSupp ? JSON.parse(rawPlantSupp) : {}
    if (allPlantSupp[npdId]) {
      setPlantDeliveryDate(allPlantSupp[npdId].deliveryDate)
      setPlantDeliveryQty(String(allPlantSupp[npdId].sampleQty))
      setPlantSupplierSubmitted(true)
    } else {
      setPlantDeliveryDate("")
      setPlantDeliveryQty("")
      setPlantSupplierSubmitted(false)
    }

    // Stage 8 — plant acceptance + verdict
    const rawPlantAcc = localStorage.getItem(PLANT_ACCEPTANCE_KEY)
    const allPlantAcc: Record<string, { docName: string; acceptedAt: string; verdict?: "accepted" | "not_good"; remarks?: string }> = rawPlantAcc ? JSON.parse(rawPlantAcc) : {}
    if (allPlantAcc[npdId]) {
      setPlantDeliveryDoc(allPlantAcc[npdId].docName)
      setPlantDeliveryAccepted(true)
      if (allPlantAcc[npdId].verdict) {
        setPlantVerdict(allPlantAcc[npdId].verdict!)
        setVerdictSelection(allPlantAcc[npdId].verdict!)
        setPlantRemarks(allPlantAcc[npdId].remarks ?? "")
      }
    } else {
      setPlantDeliveryDoc("")
      setPlantDeliveryAccepted(false)
      setPlantVerdict(null)
      setVerdictSelection(null)
      setPlantRemarks("")
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem("poc_role")
    if (stored) setCurrentRole(stored)
    setBaseUrl(window.location.origin)

    // TQR status
    const rawTqr = localStorage.getItem(TQR_STATUS_KEY)
    const allTqr: Record<string, string> = rawTqr ? JSON.parse(rawTqr) : {}
    if (allTqr[npdId]) setTqrStatusState(allTqr[npdId])

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

    // Dispatch info from supplier portal
    const rawDispatch = localStorage.getItem(SUPPLIER_DISPATCH_KEY)
    const allDispatch: Record<string, { vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string }> = rawDispatch ? JSON.parse(rawDispatch) : {}
    setDispatchInfo(allDispatch[npdId] ?? null)

    // Delivery acceptance (two-step)
    const rawAcceptance = localStorage.getItem(DELIVERY_ACCEPTANCE_KEY)
    const allAcceptance: Record<string, { docName: string; acceptedAt: string; headApproved: boolean }> = rawAcceptance ? JSON.parse(rawAcceptance) : {}
    if (allAcceptance[npdId]) {
      setDeliveryDoc(allAcceptance[npdId].docName)
      setDeliverySubmitted(true)
      if (allAcceptance[npdId].headApproved) setDeliveryHeadApproved(true)
    }

    // RND evaluation results
    const rawEval = localStorage.getItem(RND_EVAL_KEY)
    const allEval: Record<string, { results: Record<string, string>; submittedAt: string; startedAt: string }> = rawEval ? JSON.parse(rawEval) : {}
    if (allEval[npdId]) {
      setTestResults(allEval[npdId].results)
      if (allEval[npdId].submittedAt) setEvalSubmitted(true)
      setEvalStartedAt(allEval[npdId].startedAt)
    }

    // Delivery details (sourcing-set location + qty for stage 7)
    const rawDD = localStorage.getItem(DELIVERY_DETAILS_KEY)
    const allDD: Record<string, { location: string; requiredQty: string; setAt: string }> = rawDD ? JSON.parse(rawDD) : {}
    if (allDD[npdId]) {
      setDeliveryDetails(allDD[npdId])
      setDeliveryLocation(allDD[npdId].location)
      setDeliveryReqQty(allDD[npdId].requiredQty)
      setDeliveryDetailsSubmitted(true)
    }

    // AICM fetch state
    const rawAicm = localStorage.getItem(AICM_FETCH_KEY)
    const allAicm: Record<string, boolean> = rawAicm ? JSON.parse(rawAicm) : {}
    if (allAicm[npdId]) setAicmFetched(true)

    // Refresh live data when supplier submits in another tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === LIVE_QUOTATIONS_KEY || e.key === SUPPLIER_DOCS_KEY || e.key === VENDOR_STATUS_KEY || e.key === SUPPLIER_DISPATCH_KEY || e.key === DELIVERY_ACCEPTANCE_KEY || e.key === PLANT_SUPPLIER_RESP_KEY || e.key === PLANT_ACCEPTANCE_KEY) refreshLiveData()
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

  // Track when stage 5 starts + fire reminder push when overdue or 1 day left
  useEffect(() => {
    if (activeStage !== 5) return
    const totalDays = getTotalTestDays(npd.itemCategory)
    if (totalDays === 0) return
    const rawEval = localStorage.getItem(RND_EVAL_KEY)
    const allEval: Record<string, { results: Record<string, string>; submittedAt: string; startedAt: string }> = rawEval ? JSON.parse(rawEval) : {}
    if (!allEval[npdId]) {
      // Record start time for this NPD evaluation
      const now = new Date().toISOString()
      allEval[npdId] = { results: {}, submittedAt: "", startedAt: now }
      localStorage.setItem(RND_EVAL_KEY, JSON.stringify(allEval))
      setEvalStartedAt(now)
      // Reminder push: evaluation started
      savePush(
        `Evaluation Started — ${npdId}`,
        `R&D testing for ${npd.itemName} has begun. Est. completion: ${totalDays} day(s). Deadline: ${new Date(Date.now() + totalDays * 86400000).toLocaleDateString("en-IN")}.`,
        npdId, "alert"
      )
    } else if (!evalStartedAt) {
      setEvalStartedAt(allEval[npdId].startedAt)
    }
  }, [activeStage])

  // Auto-advance to stage 7 when TQR is fully approved (stage 6 is a pass-through milestone)
  useEffect(() => {
    if (tqrStatus === "fully_approved" && activeStage < 7) {
      const pn = partAssigned ? assignedPartNumber : autoAssignPartNumber(npdId)
      setActiveStage(7)
      updateNPD(npdId, { stage: 7, stageName: NPD_STAGES[6] })
    }
  }, [tqrStatus])

  // Auto-advance to stage 4 when supplier submits dispatch via portal
  useEffect(() => {
    if (dispatchInfo && activeStage < 4) {
      setActiveStage(4)
      updateNPD(npdId, { stage: 4, stageName: NPD_STAGES[3] })
    }
  }, [dispatchInfo])

  // Auto-assign part number if stage is ≥ 6 and none is assigned yet
  useEffect(() => {
    if (activeStage >= 6 && !partAssigned) {
      autoAssignPartNumber(npdId)
    }
  }, [activeStage, partAssigned])

  // Auto-advance to stage 8 (Summary & Closure) when plant accepts the part
  useEffect(() => {
    if (plantVerdict === "accepted" && activeStage < 8) {
      setActiveStage(8)
      updateNPD(npdId, { stage: 8, stageName: NPD_STAGES[7] })
    }
  }, [plantVerdict])

  const totalStages = (() => {
    const t = npd.typeOfWork
    if (t.includes("ECN") || t.includes("NTD")) return 10
    if (t.includes("Compliance")) return 6
    if (t.includes("PP")) return 4
    return TOTAL_NPD_STAGES
  })()
  const stageProgress = Array.from({ length: totalStages }, (_, idx) => ({
    step: idx + 1,
    name: getStageName(idx + 1, npd.typeOfWork),
    status: (idx + 1) < activeStage ? "complete" : (idx + 1) === activeStage ? "current" : "upcoming"
  }))

  const isSpocOrSourcing = SPOC_NAMES.includes(currentRole) ||
    currentRole === "sourcing_head" || currentRole === "super_admin"
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"
  const isPlantUser = currentRole === "plant_user" || currentRole === "super_admin"

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
      .replace(/Amber Sourcing Operations/g, npd.spoc)
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

    // Advance stage to 2 — Supplier Sourcing & Quotation
    if (activeStage < 2) {
      setActiveStage(2)
      updateNPD(npdId, { stage: 2, stageName: NPD_STAGES[1] })
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
    // Approving a vendor updates the supplier name and advances to Stage 3 — Supplier Dispatch
    if (decision === "approved") {
      const updates: Partial<typeof npd> = { supplier: vendorName }
      if (activeStage < 3) {
        setActiveStage(3)
        updates.stage = 3
        updates.stageName = NPD_STAGES[2]
      }
      updateNPD(npdId, updates)
    }
  }

  const submitQueryReply = (vendorName: string) => {
    const reply = queryReplyText[vendorName]?.trim()
    if (!reply) return
    const raw = localStorage.getItem(LIVE_QUOTATIONS_KEY)
    const all: Record<string, Record<string, LiveQuotation>> = raw ? JSON.parse(raw) : {}
    const prev = all[npdId]?.[vendorName]
    if (!prev) return
    const updated: LiveQuotation = {
      ...prev,
      rndReply: reply,
      rndRepliedAt: new Date().toLocaleString("en-IN"),
      // keep feasible: false so supplier must re-assess via the portal link
      ...(queryReplyDoc[vendorName] ? { rndReplyDoc: queryReplyDoc[vendorName] } : {}),
    }
    all[npdId][vendorName] = updated
    localStorage.setItem(LIVE_QUOTATIONS_KEY, JSON.stringify(all))
    setLiveQuotes(prev => ({ ...prev, [vendorName]: updated }))
    setQueryReplyText(prev => { const next = { ...prev }; delete next[vendorName]; return next })
    setQueryReplyDoc(prev => { const next = { ...prev }; delete next[vendorName]; return next })
    savePush(`R&D Replied to Query — ${npdId}`, `R&D sent clarification to ${vendorName} for ${npd.itemName}. Awaiting supplier re-assessment.`, npdId, "mail")
  }

  const submitDelivery = () => {
    const acceptance = { docName: deliveryDoc, acceptedAt: new Date().toLocaleString("en-IN"), headApproved: true }
    const raw = localStorage.getItem(DELIVERY_ACCEPTANCE_KEY)
    const all: Record<string, typeof acceptance> = raw ? JSON.parse(raw) : {}
    all[npdId] = acceptance
    localStorage.setItem(DELIVERY_ACCEPTANCE_KEY, JSON.stringify(all))
    setDeliverySubmitted(true)
    setDeliveryHeadApproved(true)
    setActiveStage(5)
    updateNPD(npdId, { stage: 5, stageName: NPD_STAGES[4] })
    savePush(`Delivery Confirmed — ${npdId}`, `R&D User confirmed receipt for ${npd.itemName}. Advancing to RND Testing.`, npdId, "check")
  }

  const approveDelivery = () => {
    const raw = localStorage.getItem(DELIVERY_ACCEPTANCE_KEY)
    const all: Record<string, { docName: string; acceptedAt: string; headApproved: boolean }> = raw ? JSON.parse(raw) : {}
    if (!all[npdId]) return
    all[npdId].headApproved = true
    localStorage.setItem(DELIVERY_ACCEPTANCE_KEY, JSON.stringify(all))
    setDeliveryHeadApproved(true)
    setActiveStage(5)
    updateNPD(npdId, { stage: 5, stageName: NPD_STAGES[4] })
    savePush(`Delivery Approved — ${npdId}`, `R&D Head approved the delivery for ${npd.itemName}. Advancing to RND Testing.`, npdId, "check")
  }

  const autoAssignPartNumber = (id: string): string => {
    const seq = id.replace(/\D/g, "").slice(-4).padStart(4, "0")
    const pn = `AMB-PT-${new Date().getFullYear()}-${seq}`
    const all: Record<string, { partNumber: string; assignedAt: string }> = JSON.parse(localStorage.getItem(PART_ASSIGNMENT_KEY) ?? "{}")
    all[id] = { partNumber: pn, assignedAt: new Date().toLocaleString("en-IN") }
    localStorage.setItem(PART_ASSIGNMENT_KEY, JSON.stringify(all))
    setPartAssigned(true)
    setAssignedPartNumber(pn)
    savePush(`Part No. Assigned — ${id}`, `Part No. ${pn} assigned for ${npd.itemName}. Sourcing: coordinate plant delivery with supplier.`, id, "package")
    return pn
  }

  const submitPlantSupplierResponse = () => {
    if (!plantDeliveryDate || !plantDeliveryQty) return
    const all: Record<string, { deliveryDate: string; sampleQty: number; submittedAt: string }> = JSON.parse(localStorage.getItem(PLANT_SUPPLIER_RESP_KEY) ?? "{}")
    all[npdId] = { deliveryDate: plantDeliveryDate, sampleQty: parseInt(plantDeliveryQty), submittedAt: new Date().toLocaleString("en-IN") }
    localStorage.setItem(PLANT_SUPPLIER_RESP_KEY, JSON.stringify(all))
    setPlantSupplierSubmitted(true)
  }

  const confirmPlantDelivery = () => {
    if (!plantDeliveryDoc) return
    const now = new Date().toLocaleString("en-IN")
    const all: Record<string, { docName: string; acceptedAt: string; verdict?: string; remarks?: string }> = JSON.parse(localStorage.getItem(PLANT_ACCEPTANCE_KEY) ?? "{}")
    all[npdId] = { docName: plantDeliveryDoc, acceptedAt: now }
    localStorage.setItem(PLANT_ACCEPTANCE_KEY, JSON.stringify(all))
    setPlantDeliveryAccepted(true)
  }

  const submitPlantVerdict = (verdict: "accepted" | "not_good") => {
    const now = new Date().toLocaleString("en-IN")
    const all: Record<string, { docName: string; acceptedAt: string; verdict?: string; remarks?: string }> = JSON.parse(localStorage.getItem(PLANT_ACCEPTANCE_KEY) ?? "{}")
    all[npdId] = { ...(all[npdId] ?? { docName: plantDeliveryDoc, acceptedAt: now }), verdict, remarks: plantRemarks }
    localStorage.setItem(PLANT_ACCEPTANCE_KEY, JSON.stringify(all))
    setPlantVerdict(verdict)
    const verdictMsg = `Plant verdict for ${npdId} (${npd.itemName}, Part No. ${assignedPartNumber}): ${verdict === "accepted" ? "Accepted ✓ — approved for production." : "Not Good ✗ — revision required."}${plantRemarks ? ` Remarks: ${plantRemarks}` : ""}`
    const verdictIcon = verdict === "accepted" ? "check" : "alert"
    savePush(`[${verdict === "accepted" ? "✓ Accepted" : "✗ Not Good"}] Plant Verdict — ${npdId}`, verdictMsg, npdId, verdictIcon)
    savePush(`[${verdict === "accepted" ? "✓ Accepted" : "✗ Not Good"}] Plant Verdict — ${npdId}`, verdictMsg, npdId, verdictIcon)
    if (verdict === "not_good" && assignedPartNumber) {
      const rejected: Array<{ npdId: string; partNumber: string; itemName: string; rejectedAt: string }> = JSON.parse(localStorage.getItem(REJECTED_PARTS_KEY) ?? "[]")
      if (!rejected.some(r => r.npdId === npdId)) {
        rejected.push({ npdId, partNumber: assignedPartNumber, itemName: npd.itemName, rejectedAt: now })
        localStorage.setItem(REJECTED_PARTS_KEY, JSON.stringify(rejected))
      }
    }
  }

  const demoAdvanceStage = () => {
    if (activeStage >= TOTAL_NPD_STAGES) return
    const next = activeStage + 1

    // Stage 2→3: auto-approve first vendor if none locked yet
    if (activeStage === 2 && (!npd.supplier || npd.supplier === "Pending Assignment")) {
      const firstVendor = getVendors(npd.itemCategory)[0]?.name ?? sentVendors[0]
      if (firstVendor) {
        setVendorApproval(firstVendor, "approved") // internally advances to stage 3
        return
      }
    }
    // Stage 3→4: mark dispatch done
    if (activeStage === 3) setDefenceAdvanced(true)
    // Stage 4→5: auto-complete two-step delivery acceptance
    if (activeStage === 4) {
      const docName = "demo_delivery_confirmation.jpg"
      const acceptance = { docName, acceptedAt: new Date().toLocaleString("en-IN"), headApproved: true }
      const rawA = localStorage.getItem(DELIVERY_ACCEPTANCE_KEY)
      const allA: Record<string, typeof acceptance> = rawA ? JSON.parse(rawA) : {}
      allA[npdId] = acceptance
      localStorage.setItem(DELIVERY_ACCEPTANCE_KEY, JSON.stringify(allA))
      setDeliveryDoc(docName)
      setDeliverySubmitted(true)
      setDeliveryHeadApproved(true)
    }
    // Stage 5→6: auto-complete TQR
    if (activeStage === 5) setTqrStatus("fully_approved")
    // Stage 6→7: auto-assign part number
    if (activeStage === 6) autoAssignPartNumber(npdId)
    // Stage 7→8: auto-satisfy supplier response + plant acceptance, then advance to stage 8
    if (activeStage === 7) {
      const now = new Date().toLocaleString("en-IN")
      const suppAll: Record<string, { deliveryDate: string; sampleQty: number; submittedAt: string }> = JSON.parse(localStorage.getItem(PLANT_SUPPLIER_RESP_KEY) ?? "{}")
      suppAll[npdId] = { deliveryDate: "30 May 2026", sampleQty: 5, submittedAt: now }
      localStorage.setItem(PLANT_SUPPLIER_RESP_KEY, JSON.stringify(suppAll))
      setPlantDeliveryDate("30 May 2026")
      setPlantDeliveryQty("5")
      setPlantSupplierSubmitted(true)
      const accAll: Record<string, { docName: string; acceptedAt: string; verdict?: string; remarks?: string }> = JSON.parse(localStorage.getItem(PLANT_ACCEPTANCE_KEY) ?? "{}")
      accAll[npdId] = { docName: "demo_plant_receipt.jpg", acceptedAt: now, verdict: "accepted", remarks: "" }
      localStorage.setItem(PLANT_ACCEPTANCE_KEY, JSON.stringify(accAll))
      setPlantDeliveryDoc("demo_plant_receipt.jpg")
      setPlantDeliveryAccepted(true)
      setPlantVerdict("accepted")
      setVerdictSelection("accepted")
    }

    setActiveStage(next)
    updateNPD(npdId, { stage: next, stageName: NPD_STAGES[next - 1] })
  }

  const demoRevertStage = () => {
    if (activeStage <= 1) return
    const prev = activeStage - 1
    setActiveStage(prev)
    updateNPD(npdId, { stage: prev, stageName: NPD_STAGES[prev - 1] })
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
        vendorName:  lq.vendorName,
        tier:        "—",
        status:      "submitted" as const,
        sampleQty:   parseInt(lq.formValues.sampleQty || lq.formValues.q2 || "") || null,
        supplyDate:  lq.formValues.supplyDate || lq.formValues.q1 || null,
        submittedAt: lq.submittedAt,
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
        {/* Demo navigation strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Demo Controls</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={activeStage <= 1}
              onClick={demoRevertStage}
              className="text-xs h-7 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              ← Previous Stage
            </Button>
            <Button
              size="sm"
              disabled={activeStage >= TOTAL_NPD_STAGES}
              onClick={demoAdvanceStage}
              className="text-xs h-7 bg-slate-800 hover:bg-slate-700 text-white"
            >
              Demo: Next Stage →
            </Button>
          </div>
        </div>
      </div>

      {/* 8-Stage Progress Bar — segmented */}
      <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex min-w-[700px] gap-1">
          {stageProgress.map((stage) => (
            <div
              key={stage.step}
              className={`flex-1 rounded-md px-2 py-2.5 flex flex-col gap-1 transition-all ${
                stage.status === "complete" ? "bg-blue-900" :
                stage.status === "current"  ? "bg-blue-700 ring-2 ring-blue-400 ring-offset-1" :
                "bg-slate-100"
              }`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                stage.status === "complete" || stage.status === "current" ? "text-blue-200" : "text-slate-400"
              }`}>
                Step {stage.step}
              </span>
              <span className={`text-[11px] font-semibold leading-tight ${
                stage.status === "complete" ? "text-white" :
                stage.status === "current"  ? "text-white" :
                "text-slate-400"
              }`}>
                {stage.name}
              </span>
            </div>
          ))}
        </div>
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
            <CardContent className="pt-5 flex flex-col-reverse gap-4">

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
                    ["Raised By", npd.raisedBy === "rnd_head" ? DEFAULT_RND_HEAD.name : DEFAULT_RND_CONTACT.name],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400 text-xs">{label}</span>
                      <span className="text-slate-800 font-medium text-xs text-right max-w-[140px] truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage 4 — RND Evaluation (proof of delivery) */}
              {activeStage >= 4 && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 4  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 4 ? "border-blue-400 bg-white shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 4
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-blue-700 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-blue-700">4</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 4 — RND Evaluation</h4>
                    {activeStage > 4 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Completed</Badge>}
                  </div>
                  {activeStage === 4 && (
                    <div className="space-y-4">

                      {/* Part 1 — Dispatch context strip */}
                      {dispatchInfo ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Dispatch Details (from supplier portal)
                          </p>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-700">
                            <span><span className="text-slate-400">Supplier:</span> <strong>{dispatchInfo.vendorName}</strong></span>
                            <span><span className="text-slate-400">Dispatch Date:</span> <strong>{dispatchInfo.dispatchDate}</strong></span>
                            <span><span className="text-slate-400">Proof of Dispatch:</span> <strong>{dispatchInfo.docs.length > 0 ? dispatchInfo.docs[0] : "—"}</strong></span>
                          </div>
                          {dispatchInfo.docs.length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                              {dispatchInfo.docs.map((doc, i) => (
                                <li key={i} className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                  <FileText className="w-3 h-3 shrink-0 text-slate-400" /> {doc}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Dispatch details not submitted via portal. You can still accept below.
                        </p>
                      )}

                      {/* Part 2 — Delivery acceptance */}
                      {deliverySubmitted ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-800">Receipt Confirmed</p>
                            <p className="text-xs text-emerald-600">POD: {deliveryDoc}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-slate-600">Upload proof of delivery to confirm receipt.</p>
                          <div
                            onClick={() => {
                              if (!deliveryDoc) setDeliveryDoc("delivery_confirmation.jpg")
                              else setDeliveryDoc("")
                            }}
                            className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                              deliveryDoc ? "border-emerald-400 bg-emerald-50" : "border-blue-300 hover:border-blue-400 hover:bg-blue-50/40 bg-white"
                            }`}
                          >
                            {deliveryDoc ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <p className="text-sm font-semibold text-emerald-700">{deliveryDoc}</p>
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
                          {deliveryDoc && (
                            <Button
                              className="bg-blue-900 hover:bg-blue-800 text-white"
                              onClick={submitDelivery}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Confirm Receipt
                            </Button>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}

              {/* Stage 5 — RND Testing & TQR */}
              {activeStage >= 5 && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 5  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 5 ? "border-emerald-400 bg-white shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 5
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-emerald-600">5</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 5 — RND Testing &amp; TQR</h4>
                    {activeStage > 5 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Completed</Badge>}
                  </div>
                  {activeStage === 5 && (
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
                            <p className="text-sm mt-1">Notifications sent to supplier and sourcing team.</p>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">Notifications sent</p>
                          <EmailCard
                            to={npd.supplier}
                            subject={`✓ Testing Complete — ${npdId}: ${npd.itemName}`}
                            body={`<p>Dear <strong>${npd.supplier}</strong>,</p><p>We are pleased to inform you that the R&amp;D testing for the following part has been completed and approved.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Category</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Status</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#059669">✓ R&amp;D Testing Approved</td></tr></table><p>Our sourcing team will be in touch shortly with delivery location and sample quantity details. Please be ready to confirm your delivery date.</p><p style="color:#64748b;font-size:12px">Amber Enterprises R&amp;D System</p>`}
                          />
                          <EmailCard
                            to={npd.spoc}
                            subject={`TQR Approved — Action Required: Set Delivery Details for ${npdId}`}
                            body={`<p>Dear <strong>${npd.spoc}</strong>,</p><p>The TQR evaluation for the following NPD has been fully approved by the R&amp;D Head.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr></table><p><strong>Next Step:</strong> Please log in to the NPD system and fill in the delivery location and required sample quantity (Stage 7 — Sample Delivery Coordination). The supplier delivery date request will be sent automatically once you submit.</p><p style="color:#64748b;font-size:12px">Amber Enterprises R&amp;D System</p>`}
                          />
                          <PushSentBadge to={npd.supplier} />
                          <PushSentBadge to={npd.spoc} />
                        </div>
                      ) : (() => {
                        const tests = getTestsByCategory(npd.itemCategory)
                        const totalDays = getTotalTestDays(npd.itemCategory)
                        const allFilled = tests.length === 0 || tests.every(t => (testResults[t.testName] ?? "").trim() !== "")

                        // Deadline reminder calculation
                        const deadlineEl = (() => {
                          if (!evalStartedAt) return null
                          const started = new Date(evalStartedAt)
                          const deadline = new Date(started.getTime() + totalDays * 24 * 60 * 60 * 1000)
                          const nowMs = Date.now()
                          const daysLeft = Math.ceil((deadline.getTime() - nowMs) / (1000 * 60 * 60 * 24))
                          const overdue = daysLeft < 0
                          const urgent  = !overdue && daysLeft <= 1
                          const color   = overdue ? "bg-red-50 border-red-200 text-red-800" : urgent ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-100 text-blue-800"
                          const label   = overdue ? `Evaluation overdue by ${Math.abs(daysLeft)}d` : daysLeft === 0 ? "Evaluation due today" : `${daysLeft}d remaining to complete evaluation`
                          return (
                            <div className={`rounded-lg border ${color}`}>
                              <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">
                                <Clock className="w-4 h-4 shrink-0" />
                                {label}
                              </div>
                              <div className="border-t border-current/10 px-4 py-2 flex items-center justify-between text-xs font-medium opacity-80">
                                <span>Est. total: <strong>{totalDays}d</strong></span>
                                <span>Deadline: <strong>{deadline.toLocaleDateString("en-IN")}</strong></span>
                              </div>
                            </div>
                          )
                        })()

                        // Build test results rows for email
                        const evalTableRows = tests.map((t, i) => {
                          const val = testResults[t.testName] ?? "—"
                          const bg = i % 2 === 0 ? "#f8fafc" : "#ffffff"
                          return `<tr style="background:${bg}"><td style="padding:7px 12px;border:1px solid #e2e8f0">${t.testName}</td><td style="padding:7px 12px;border:1px solid #e2e8f0;color:#64748b">${t.testType}</td><td style="padding:7px 12px;border:1px solid #e2e8f0;text-align:center">${t.unit}</td><td style="padding:7px 12px;border:1px solid #e2e8f0;text-align:center">${t.expectedRange ?? "—"}</td><td style="padding:7px 12px;border:1px solid #e2e8f0;font-weight:600">${val}</td></tr>`
                        }).join("")

                        return (
                          <div className="space-y-4">
                            {/* Deadline reminder */}
                            {deadlineEl}

                            {/* Total TAT banner */}
                            {tests.length > 0 && (
                              <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Evaluation TAT</span>
                                <span className="text-sm font-bold text-blue-900">{totalDays} day{totalDays !== 1 ? "s" : ""}</span>
                              </div>
                            )}

                            {/* Test entry form — R&D user only, before submission */}
                            {isRnd && !evalSubmitted && tests.length > 0 && (
                              <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                                  <span className="text-sm font-bold text-white">R&amp;D Test Evaluation — {npd.itemCategory}</span>
                                  <span className="text-xs text-slate-400">{tests.length} tests · {totalDays}d total TAT</span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[28%]">Test</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                        <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit</th>
                                        <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected</th>
                                        <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">TAT (d)</th>
                                        <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[18%]">Result / Findings</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {tests.map((t, i) => (
                                        <tr key={t.testName} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                          <td className="px-4 py-2.5 font-medium text-slate-800">{t.testName}</td>
                                          <td className="px-3 py-2.5 text-slate-500 text-xs">{t.testType}</td>
                                          <td className="px-3 py-2.5 text-center text-slate-500 text-xs">{t.unit}</td>
                                          <td className="px-3 py-2.5 text-center text-xs text-slate-500">{t.expectedRange ?? "—"}</td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">{t.durationDays}d</span>
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <input
                                              type="text"
                                              placeholder="Enter findings"
                                              value={testResults[t.testName] ?? ""}
                                              onChange={e => setTestResults(prev => ({ ...prev, [t.testName]: e.target.value }))}
                                              className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                                  <span className="text-xs text-slate-500">{tests.filter(t => (testResults[t.testName] ?? "").trim() !== "").length}/{tests.length} tests filled</span>
                                  <Button
                                    size="sm"
                                    disabled={!allFilled}
                                    className="bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-40"
                                    onClick={() => {
                                      const now = new Date().toISOString()
                                      const startedTs = evalStartedAt ?? now
                                      const rawEval = localStorage.getItem(RND_EVAL_KEY)
                                      const allEval: Record<string, { results: Record<string, string>; submittedAt: string; startedAt: string }> = rawEval ? JSON.parse(rawEval) : {}
                                      allEval[npdId] = { results: testResults, submittedAt: now, startedAt: startedTs }
                                      localStorage.setItem(RND_EVAL_KEY, JSON.stringify(allEval))
                                      if (!evalStartedAt) setEvalStartedAt(startedTs)
                                      setEvalSubmitted(true)
                                    }}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Save Evaluation Results
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Results view (read-only after submission) */}
                            {evalSubmitted && tests.length > 0 && (
                              <div className="border border-emerald-200 rounded-xl overflow-hidden">
                                <div className="bg-emerald-700 px-4 py-2.5 flex items-center justify-between">
                                  <span className="text-sm font-bold text-white">Evaluation Results — {npd.itemCategory}</span>
                                  <span className="text-xs text-emerald-200">Submitted · {tests.length} tests · {totalDays}d TAT</span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Test</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                        <th className="text-center px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit</th>
                                        <th className="text-center px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected</th>
                                        <th className="text-center px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">TAT (d)</th>
                                        <th className="text-center px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Result / Findings</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {tests.map((t, i) => (
                                        <tr key={t.testName} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                          <td className="px-4 py-2.5 font-medium text-slate-800">{t.testName}</td>
                                          <td className="px-3 py-2.5 text-slate-500 text-xs">{t.testType}</td>
                                          <td className="px-3 py-2.5 text-center text-xs text-slate-500">{t.unit}</td>
                                          <td className="px-3 py-2.5 text-center text-xs text-slate-500">{t.expectedRange ?? "—"}</td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">{t.durationDays}d</span>
                                          </td>
                                          <td className="px-3 py-2.5 text-center font-semibold text-slate-800">{testResults[t.testName] || "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-col md:flex-row items-center justify-between bg-blue-50 p-5 rounded-lg border border-blue-100 gap-4">
                              <div>
                                <p className="text-sm font-bold text-blue-900">Sample Evaluation Actions</p>
                                <p className="text-xs text-blue-700 mt-1">
                                  {evalSubmitted ? "Evaluation complete. Approve to route to R&D Head." : "Complete all test results above before approving."}
                                </p>
                              </div>
                              {tqrStatus === "pending" ? (
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 bg-white" onClick={() => setTqrStatus("rejecting")}>
                                    <XCircle className="w-4 h-4 mr-2" /> Reject Sample
                                  </Button>
                                  <Button
                                    disabled={!evalSubmitted}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                    onClick={() => {
                                      setTqrStatus("approved_by_user")
                                      savePush(`TQR Sign-off Required — ${npdId}`, `R&D User approved TQR for ${npd.itemName}. Awaiting your final sign-off.`, npdId, "check")
                                    }}>
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
                                      if (!partAssigned) autoAssignPartNumber(npdId)
                                      setTqrStatus("fully_approved")
                                      savePush(`TQR Approved — ${npdId}`, `R&D Head approved TQR for ${npd.itemName}. Advancing to Sample Delivery Coordination.`, npdId, "check")
                                    }}>
                                      <CheckCircle2 className="w-4 h-4 mr-2" /> Final R&amp;D Head Approval
                                    </Button>
                                  </div>
                                </div>
                              ) : tqrStatus === "approved_by_user" ? (
                                <div className="space-y-3">
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1 text-sm font-medium">
                                    <Clock className="w-4 h-4 mr-1" /> Pending R&amp;D Head Approval
                                  </Badge>
                                  <EmailCard
                                    to={DEFAULT_RND_HEAD.name}
                                    subject={`TQR Sign-off Required — ${npdId}: ${npd.itemName}`}
                                    body={`<p>Dear <strong>${DEFAULT_RND_HEAD.name}</strong>,</p><p>The R&amp;D User has completed the TQR evaluation for the following NPD and it is awaiting your final sign-off.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Category</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr></table>${tests.length > 0 ? `<p><strong>Test Evaluation Results:</strong></p><table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px"><thead><tr style="background:#1e3a5f;color:#fff"><th style="padding:7px 10px;text-align:left">Test</th><th style="padding:7px 10px;text-align:left">Type</th><th style="padding:7px 10px;text-align:center">Unit</th><th style="padding:7px 10px;text-align:center">Expected</th><th style="padding:7px 10px;text-align:center">Result</th></tr></thead><tbody>${evalTableRows}</tbody></table>` : ""}<p>Please log in to review and provide your final approval or rejection.</p><p style="color:#64748b;font-size:12px">Amber Enterprises R&amp;D System</p>`}
                                  />
                                  <PushSentBadge to={DEFAULT_RND_HEAD.name} />
                                </div>
                              ) : (
                                <div className="text-slate-500 italic text-sm">Action locked for your current role.</div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Stage 6 — RND Approval (rnd_head only) */}
              {activeStage >= 6 && (currentRole === "rnd_head" || currentRole === "super_admin") && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 6  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 6 ? "border-purple-400 bg-purple-50/30 shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 6
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-purple-700 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-purple-700">6</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 6 — Part Number Assigned</h4>
                    {activeStage > 6 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
                  </div>
                  {activeStage === 6 && (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-700 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Part Number</p>
                          <p className="text-xl font-mono font-bold text-blue-900">{assignedPartNumber || "—"}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">TQR approved. Coordinate sample delivery with sourcing team (Stage 7).</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">Notifications sent</p>
                      <EmailCard
                        to={npd.spoc}
                        subject={`Part No. ${assignedPartNumber} Assigned — Action Required: ${npdId}`}
                        body={`<p>Dear <strong>${npd.spoc}</strong>,</p><p>R&amp;D testing for the following NPD has been completed and approved. A part number has been assigned.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Assigned Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:#1e3a5f">${assignedPartNumber}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Status</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#059669">✓ TQR Approved</td></tr></table><p><strong>Action Required:</strong> Please log in to the NPD portal and upload the <strong>sample quantity</strong> and <strong>delivery plant</strong> details for Stage 7 — Sample Delivery Coordination.</p><p style="color:#64748b;font-size:12px">Amber Enterprises R&amp;D System</p>`}
                      />
                      <EmailCard
                        to={npd.supplier}
                        subject={`✓ Testing Approved — Part No. ${assignedPartNumber} Assigned | ${npdId}`}
                        body={`<p>Dear <strong>${npd.supplier}</strong>,</p><p>We are pleased to inform you that R&amp;D testing for your submitted sample has been completed and approved.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Assigned Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:#1e3a5f">${assignedPartNumber}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Testing Status</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#059669">✓ Approved</td></tr></table><p>Our sourcing team will be in touch shortly with the sample delivery location and required quantity. Please be ready to confirm your delivery date once you receive the portal link.</p><p style="color:#64748b;font-size:12px">Amber Enterprises R&amp;D System · ${npd.spoc}</p>`}
                      />
                      <PushSentBadge to={npd.spoc} />
                      <PushSentBadge to={npd.supplier} />
                    </div>
                  )}
                  {activeStage > 6 && (
                    <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 inline-flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-700 shrink-0" />
                        <span className="text-sm font-mono font-bold text-blue-900">{assignedPartNumber}</span>
                        <span className="text-xs text-blue-600 ml-1">assigned</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications sent</p>
                      <EmailCard
                        to={npd.spoc}
                        subject={`Part No. ${assignedPartNumber} Assigned — Action Required: ${npdId}`}
                        body={`<p>Dear <strong>${npd.spoc}</strong>,</p><p>R&amp;D testing for the following NPD has been completed and approved. A part number has been assigned.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Assigned Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:#1e3a5f">${assignedPartNumber}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Status</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#059669">✓ TQR Approved</td></tr></table><p><strong>Action Required:</strong> Please log in to the NPD portal and upload the <strong>sample quantity</strong> and <strong>delivery plant</strong> details for Stage 7 — Sample Delivery Coordination.</p><p style="color:#64748b;font-size:12px">Amber Enterprises R&amp;D System</p>`}
                      />
                      <EmailCard
                        to={npd.supplier}
                        subject={`✓ Testing Approved — Part No. ${assignedPartNumber} Assigned | ${npdId}`}
                        body={`<p>Dear <strong>${npd.supplier}</strong>,</p><p>We are pleased to inform you that R&amp;D testing for your submitted sample has been completed and approved.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Assigned Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:#1e3a5f">${assignedPartNumber}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Testing Status</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#059669">✓ Approved</td></tr></table><p>Our sourcing team will be in touch shortly with the sample delivery location and required quantity. Please be ready to confirm your delivery date once you receive the portal link.</p><p style="color:#64748b;font-size:12px">Amber Enterprises R&amp;D System · ${npd.spoc}</p>`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── Stage 7: Plant Delivery Acceptance ── */}
              {activeStage >= 7 && (
                <div className={`rounded-xl border p-4 ${
                  activeStage === 7 ? "border-orange-300 bg-orange-50/30 shadow-sm" : "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 7
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-orange-600 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-orange-600">7</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 7 — Sample Delivery &amp; Plant Acceptance</h4>
                    {plantVerdict === "accepted" && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Part Accepted</Badge>}
                    {plantVerdict === "not_good" && <Badge className="bg-red-100 text-red-700 border-none text-xs ml-auto">Not Good</Badge>}
                  </div>
                  {activeStage === 7 && (
                    <div className="space-y-4">

                      {/* Part + sourcing coordination status */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <p className="text-sm font-bold text-emerald-800">TQR Approved — Part No. <span className="font-mono">{assignedPartNumber}</span></p>
                        </div>
                        <p className="text-xs text-emerald-700">
                          Sourcing team is coordinating delivery details with the supplier.
                        </p>
                        {plantVerdict === "accepted" && (
                          <p className="text-xs text-emerald-700 mt-1.5 font-semibold">✓ Plant user accepted the part — NPD complete.</p>
                        )}
                        {plantVerdict === "not_good" && (
                          <p className="text-xs text-red-700 mt-1.5 font-semibold">✗ Part failed plant testing — revision needed.</p>
                        )}
                        {!plantVerdict && (
                          <p className="text-xs text-slate-500 mt-1.5 italic">
                            {plantDeliveryAccepted ? "Plant user testing in progress…" :
                             plantSupplierSubmitted ? "Awaiting plant user delivery acceptance…" :
                             "Awaiting supplier delivery confirmation…"}
                          </p>
                        )}
                      </div>

                      {/* Verdict notification emails */}
                      {plantVerdict === "accepted" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications sent</p>
                          <EmailCard
                            to={DEFAULT_RND_CONTACT.name}
                            subject={`✓ Part Accepted — ${npdId}: ${npd.itemName}`}
                            body={`<p>Dear <strong>${DEFAULT_RND_CONTACT.name}</strong>,</p><p>Great news! The plant testing verdict for the following NPD has been approved.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700">${assignedPartNumber}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Verdict</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#059669">✓ Accepted — Approved for Production</td></tr></table><p>The part has been approved for production. This NPD is now complete.</p><p style="color:#64748b;font-size:12px">Amber Enterprises R&amp;D System</p>`}
                          />
                          <EmailCard
                            to={npd.spoc}
                            subject={`✓ Part Accepted — ${npdId}: ${npd.itemName}`}
                            body={`<p>Dear <strong>${npd.spoc}</strong>,</p><p>The plant testing verdict for <strong>${npdId}</strong> has been approved. The NPD is now complete.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700">${assignedPartNumber}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Verdict</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#059669">✓ Accepted — Approved for Production</td></tr></table><p style="color:#64748b;font-size:12px">Amber Enterprises Plant Team</p>`}
                          />
                          <PushSentBadge to={DEFAULT_RND_CONTACT.name} />
                          <PushSentBadge to={npd.spoc} />
                        </div>
                      )}
                      {plantVerdict === "not_good" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications sent</p>
                          <EmailCard
                            to={DEFAULT_RND_CONTACT.name}
                            subject={`✗ Part Not Good — ${npdId}: ${npd.itemName}`}
                            body={`<p>Dear <strong>${DEFAULT_RND_CONTACT.name}</strong>,</p><p>The plant testing verdict for the following NPD has been returned for revision.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700">${assignedPartNumber}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Verdict</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#dc2626">✗ Not Good — Returned for Revision</td></tr>${plantRemarks ? `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Remarks</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-style:italic">${plantRemarks}</td></tr>` : ""}</table><p>This part number has been recorded. When raising a new revision request, select <strong>${assignedPartNumber}</strong> from the previous part number dropdown.</p><p style="color:#64748b;font-size:12px">Amber Enterprises R&amp;D System</p>`}
                          />
                          <EmailCard
                            to={npd.spoc}
                            subject={`✗ Part Not Good — ${npdId}: ${npd.itemName}`}
                            body={`<p>Dear <strong>${npd.spoc}</strong>,</p><p>The plant testing verdict for <strong>${npdId}</strong> has been returned for revision. Please coordinate with the supplier.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700">${assignedPartNumber}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Verdict</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#dc2626">✗ Not Good — Returned for Revision</td></tr>${plantRemarks ? `<tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Remarks</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-style:italic">${plantRemarks}</td></tr>` : ""}</table><p style="color:#64748b;font-size:12px">Amber Enterprises Plant Team</p>`}
                          />
                          <PushSentBadge to={DEFAULT_RND_CONTACT.name} />
                          <PushSentBadge to={npd.spoc} />
                        </div>
                      )}

                      {/* Step C — Plant user delivery acceptance — shown for plant_user inside RND section too (super_admin) */}
                      {plantSupplierSubmitted && !plantDeliveryAccepted && isPlantUser && (
                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <p className="text-sm font-bold text-slate-800 mb-1">Accept Delivery</p>
                            <p className="text-xs text-slate-500 mb-3">Upload a delivery receipt or photo as proof of receipt.</p>
                            {plantDeliveryDoc ? (
                              <div className="flex items-center gap-2 mb-3 text-sm text-slate-700">
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="font-medium">{plantDeliveryDoc}</span>
                                <button onClick={() => setPlantDeliveryDoc("")} className="text-xs text-red-400 hover:text-red-600 ml-auto">Remove</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setPlantDeliveryDoc("delivery_receipt_" + npdId + ".jpg")}
                                className="w-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-orange-400 hover:bg-orange-50/40 transition-colors mb-3"
                              >
                                <UploadCloud className="w-5 h-5 text-slate-400" />
                                <span className="text-xs text-slate-400">PDF, PNG or JPG</span>
                                <span className="text-xs font-semibold text-orange-600">Click to upload</span>
                              </button>
                            )}
                            <Button size="sm" disabled={!plantDeliveryDoc} onClick={confirmPlantDelivery}>
                              Confirm Receipt
                            </Button>
                          </div>
                      )}

                      {/* Step D — Plant testing verdict */}
                      {plantDeliveryAccepted && plantVerdict === null && isPlantUser && (
                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <p className="text-sm font-bold text-slate-800 mb-0.5">Testing Verdict</p>
                            <p className="text-xs text-slate-500 mb-3">
                              <span className="text-emerald-600 font-semibold">✓ Delivery accepted</span> — {plantDeliveryDoc}. Submit testing result.
                            </p>
                            <div className="flex gap-2 mb-3">
                              <button
                                onClick={() => setVerdictSelection("accepted")}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                                  verdictSelection === "accepted"
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                    : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/40"
                                }`}
                              >
                                ✓ Accepted
                              </button>
                              <button
                                onClick={() => setVerdictSelection("not_good")}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                                  verdictSelection === "not_good"
                                    ? "border-red-400 bg-red-50 text-red-800"
                                    : "border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50/40"
                                }`}
                              >
                                ✗ Not Good
                              </button>
                            </div>
                            <textarea
                              value={plantRemarks}
                              onChange={e => setPlantRemarks(e.target.value)}
                              placeholder="Remarks (optional)"
                              rows={2}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-3"
                            />
                            <Button size="sm" disabled={verdictSelection === null} onClick={() => verdictSelection && submitPlantVerdict(verdictSelection)}>
                              Submit Verdict
                            </Button>
                          </div>
                      )}

                      {/* Completed state */}
                      {plantVerdict !== null && (
                        plantVerdict === "accepted" ? (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 text-center">
                            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <p className="text-base font-bold text-emerald-800">Part Accepted — NPD Complete</p>
                            <p className="text-sm text-emerald-700 mt-1">Part No. <strong>{assignedPartNumber}</strong> has been approved for production.</p>
                            {plantRemarks && <p className="text-xs text-emerald-600 mt-2 italic">&ldquo;{plantRemarks}&rdquo;</p>}
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                            <p className="text-base font-bold text-red-800">Part Not Good — Returned for Revision</p>
                            <p className="text-sm text-red-700 mt-1">Part No. <strong>{assignedPartNumber}</strong> failed plant testing. Previous part number recorded for future revision requests.</p>
                            {plantRemarks && <p className="text-xs text-red-600 mt-2 italic">&ldquo;{plantRemarks}&rdquo;</p>}
                          </div>
                        )
                      )}

                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>

          {/* ── Section 2: Sourcing Info (read-only) ─────────────── */}
          {activeStage >= 2 && (
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
                      {activeStage < 2 ? "Awaiting Release" :
                       activeStage === 2 ? "Awaiting Quotations" :
                       activeStage === 3 ? "Awaiting Dispatch" :
                       activeStage >= 4 ? "Supplier Dispatched" : "—"}
                    </p>
                  </div>
                </div>
                {/* Vendor feasibility denial queries */}
                {Object.entries(liveQuotes).some(([, lq]) => lq.feasible === false && lq.query) && (
                  <div className="mt-4 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendor Queries</p>
                    {Object.entries(liveQuotes)
                      .filter(([, lq]) => lq.feasible === false && lq.query)
                      .map(([vendorName, lq]) => (
                        <div
                          key={vendorName}
                          className={`rounded-lg border p-3 ${lq.rndReply ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}
                        >
                          <div className="flex items-start gap-2">
                            {lq.rndReply
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold ${lq.rndReply ? "text-emerald-800" : "text-amber-800"}`}>
                                {vendorName} — {lq.rndReply ? "R&D Replied — Awaiting Supplier Re-Assessment" : "Query Raised"}
                              </p>
                              <p className="text-xs text-slate-600 mt-0.5 italic">Query: &quot;{lq.query}&quot;</p>
                              {lq.rndReply ? (
                                <div className="mt-2 space-y-2">
                                  <p className="text-xs text-slate-700">Reply: {lq.rndReply}</p>
                                  {lq.rndReplyDoc && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                      <FileText className="w-3 h-3" /> {lq.rndReplyDoc}
                                    </p>
                                  )}
                                  <EmailCard
                                    to={vendorName}
                                    subject={`R&D Clarification — ${npdId}: ${npd.itemName}`}
                                    body={(() => {
                                      const portalUrl = `${baseUrl}/supplier/quote/${npdId}?vendor=${encodeURIComponent(vendorName)}`
                                      return `<p>Dear <strong>${vendorName}</strong>,</p><p>Thank you for your query regarding <strong>${npd.itemName}</strong> (${npdId}). Our R&amp;D team has reviewed it and provided the following clarification:</p><blockquote style="border-left:3px solid #1e3a5f;margin:12px 0;padding:8px 14px;background:#f8fafc;color:#1e293b;font-style:italic">${lq.query}</blockquote><p><strong>R&amp;D Response:</strong><br/>${lq.rndReply}</p>${lq.rndReplyDoc ? `<p style="font-size:12px;color:#64748b">Attached document: ${lq.rndReplyDoc}</p>` : ""}<p>Based on this clarification, kindly re-assess your feasibility and submit your updated response using the link below.</p><div style="margin:16px 0;"><a href="${portalUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Re-Assess &amp; Submit Response →</a></div><p>Regards,<br/><strong>${npd.spoc}</strong><br/>Amber Enterprises Sourcing Team</p>`
                                    })()}
                                  />
                                </div>
                              ) : (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    rows={2}
                                    value={queryReplyText[vendorName] ?? ""}
                                    onChange={e => setQueryReplyText(prev => ({ ...prev, [vendorName]: e.target.value }))}
                                    placeholder="Type your reply to this query…"
                                    className="w-full text-xs border border-amber-300 rounded-md px-2 py-1.5 focus:ring-amber-400 focus:border-amber-400 bg-white"
                                  />
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div
                                      onClick={() => {
                                        const fakeDoc = `rnd_reply_${vendorName.toLowerCase().replace(/\s+/g, "_")}.pdf`
                                        setQueryReplyDoc(prev => ({
                                          ...prev,
                                          [vendorName]: queryReplyDoc[vendorName] ? "" : fakeDoc,
                                        }))
                                      }}
                                      className={`cursor-pointer flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors ${
                                        queryReplyDoc[vendorName]
                                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                          : "bg-white border-slate-300 text-slate-500 hover:border-amber-400"
                                      }`}
                                    >
                                      <UploadCloud className="w-3 h-3" />
                                      {queryReplyDoc[vendorName] ? queryReplyDoc[vendorName] : "Attach doc (optional)"}
                                    </div>
                                    <Button
                                      size="sm"
                                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
                                      disabled={!(queryReplyText[vendorName]?.trim())}
                                      onClick={() => submitQueryReply(vendorName)}
                                    >
                                      <Send className="w-3 h-3 mr-1" /> Send Reply
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
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

      {/* ═══════════════════ PLANT USER SECTION ═══════════════════ */}
      {isPlantUser && !isRnd && activeStage === 7 && (
        <div className="space-y-6">

          <Card>
            <CardHeader className="pb-3 border-b bg-slate-50">
              <CardTitle className="text-base">Stage 7 — Plant Delivery Acceptance</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Accept the delivery from the supplier and submit your testing verdict</p>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">

              {/* Supplier delivery info */}
              {plantSupplierSubmitted ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-800 mb-2">Supplier Confirmed Delivery</p>
                  <div className="flex gap-6 text-sm text-blue-700">
                    <span>Delivery Date: <strong>{plantDeliveryDate}</strong></span>
                    <span>Sample Qty: <strong>{plantDeliveryQty} pcs</strong></span>
                  </div>
                  {assignedPartNumber && (
                    <p className="text-xs text-blue-600 mt-1.5">Part No: <strong>{assignedPartNumber}</strong></p>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-700 italic">Awaiting supplier to confirm delivery date and sample quantity.</p>
                </div>
              )}

              {/* Delivery acceptance */}
              {plantSupplierSubmitted && !plantDeliveryAccepted && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-sm font-bold text-slate-800 mb-1">Accept Delivery</p>
                  <p className="text-xs text-slate-500 mb-3">Upload a delivery receipt or photo as proof of receipt.</p>
                  {plantDeliveryDoc ? (
                    <div className="flex items-center gap-2 mb-3 text-sm text-slate-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium">{plantDeliveryDoc}</span>
                      <button onClick={() => setPlantDeliveryDoc("")} className="text-xs text-red-400 hover:text-red-600 ml-auto">Remove</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPlantDeliveryDoc("delivery_receipt_" + npdId + ".jpg")}
                      className="w-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-orange-400 hover:bg-orange-50/40 transition-colors mb-3"
                    >
                      <UploadCloud className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-400">PDF, PNG or JPG</span>
                      <span className="text-xs font-semibold text-orange-600">Click to upload</span>
                    </button>
                  )}
                  <Button size="sm" disabled={!plantDeliveryDoc} onClick={confirmPlantDelivery}>
                    Confirm Receipt
                  </Button>
                </div>
              )}

              {/* Verdict */}
              {plantDeliveryAccepted && plantVerdict === null && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-sm font-bold text-slate-800 mb-0.5">Testing Verdict</p>
                  <p className="text-xs text-slate-500 mb-3">
                    <span className="text-emerald-600 font-semibold">✓ Delivery accepted</span> — {plantDeliveryDoc}. Submit testing result.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setVerdictSelection("accepted")}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        verdictSelection === "accepted"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/40"
                      }`}
                    >
                      ✓ Accepted
                    </button>
                    <button
                      onClick={() => setVerdictSelection("not_good")}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        verdictSelection === "not_good"
                          ? "border-red-400 bg-red-50 text-red-800"
                          : "border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50/40"
                      }`}
                    >
                      ✗ Not Good
                    </button>
                  </div>
                  <textarea
                    value={plantRemarks}
                    onChange={e => setPlantRemarks(e.target.value)}
                    placeholder="Remarks (optional)"
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-3"
                  />
                  <Button size="sm" disabled={verdictSelection === null} onClick={() => verdictSelection && submitPlantVerdict(verdictSelection)}>
                    Submit Verdict
                  </Button>
                </div>
              )}

              {/* Completed state */}
              {plantVerdict !== null && (
                <div className="space-y-3">
                  {plantVerdict === "accepted" ? (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 text-center">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-base font-bold text-emerald-800">Part Accepted — NPD Complete</p>
                      <p className="text-sm text-emerald-700 mt-1">Part No. <strong>{assignedPartNumber}</strong> has been approved for production.</p>
                      {plantRemarks && <p className="text-xs text-emerald-600 mt-2 italic">&ldquo;{plantRemarks}&rdquo;</p>}
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                      <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <p className="text-base font-bold text-red-800">Part Not Good — Returned for Revision</p>
                      <p className="text-sm text-red-700 mt-1">Part No. <strong>{assignedPartNumber}</strong> failed testing. Previous part number saved for future revision requests.</p>
                      {plantRemarks && <p className="text-xs text-red-600 mt-2 italic">&ldquo;{plantRemarks}&rdquo;</p>}
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications sent</p>
                  {[DEFAULT_RND_CONTACT.name, npd.spoc].map(recipient => (
                    <EmailCard
                      key={recipient}
                      to={recipient}
                      subject={`[${plantVerdict === "accepted" ? "✓ Accepted" : "✗ Not Good"}] Plant Testing Verdict — ${npdId}`}
                      body={`<p>Dear <strong>${recipient}</strong>,</p><p>The plant testing verdict for the following NPD has been submitted by the Plant Team.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace">${assignedPartNumber}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Verdict</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:${plantVerdict === "accepted" ? "#059669" : "#dc2626"}">${plantVerdict === "accepted" ? "✓ Accepted — Approved for Production" : "✗ Not Good — Returned for Revision"}</td></tr>${plantRemarks ? `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Remarks</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-style:italic">${plantRemarks}</td></tr>` : ""}</table><p>${plantVerdict === "accepted" ? "The part has been approved for production. Please proceed with the next steps." : "The part has been returned for revision. Please coordinate with the supplier for corrections."}</p><p style="color:#64748b;font-size:12px">Amber Enterprises Plant Team</p>`}
                    />
                  ))}
                  <PushSentBadge to={DEFAULT_RND_CONTACT.name} />
                  <PushSentBadge to={npd.spoc} />
                </div>
              )}

            </CardContent>
          </Card>

          {/* Document Library — plant user access */}
          <Card>
            <CardHeader className="pb-3 border-b bg-slate-50">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-700" /> Document Library
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
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
                    <a href={npd.driveLink} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 ml-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-blue-100">
                      <ExternalLink className="w-3.5 h-3.5" /> Open Drive
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No drawing link was attached during request creation.</p>
                )}
              </div>
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
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {supplierDocs.map((doc, i) => {
                      const ext = doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE"
                      const extColor = ext === "PDF" ? "bg-red-100 text-red-700" : ext === "XLSX" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
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

      {/* ═══════════════════ STAGE 8 — NPD SUMMARY & CLOSURE ═══════════════════ */}
      {activeStage >= 8 && (
        <Card className="border-emerald-200 shadow-sm">
          <CardHeader className="bg-emerald-50 border-b border-emerald-200 pb-3">
            <CardTitle className="text-emerald-900 flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5" /> Stage 8 — NPD Summary &amp; Closure
            </CardTitle>
            <p className="text-xs text-emerald-700 mt-0.5">Full lifecycle record for this NPD. View the complete MIS report.</p>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">

            {/* ── A: Project Details ─────────────────────────── */}
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">A. Project Details</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { label: "NPD ID",      value: npdId },
                  { label: "Item",        value: npd.itemName },
                  { label: "Category",    value: npd.itemCategory },
                  { label: "Product Line",value: npd.productLine },
                  { label: "Location",    value: npd.rAndDDivision },
                  { label: "SPOC",        value: npd.spoc },
                  { label: "Type of Work",value: npd.typeOfWork },
                  { label: "Total TAT",   value: `${npd.totalTat} days` },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-[12px] font-semibold text-slate-800 mt-0.5 truncate" title={item.value}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── B: Supplier & Sourcing ─────────────────────── */}
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">B. Supplier &amp; Sourcing</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Allocated Supplier</p>
                  <p className="text-[12px] font-semibold text-slate-800 mt-0.5">{npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : "—"}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RFQ Sent To</p>
                  <p className="text-[12px] font-semibold text-slate-800 mt-0.5">{sentVendors.length > 0 ? sentVendors.join(", ") : npd.supplier ?? "—"}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Delivery Location (Required)</p>
                  <p className="text-[12px] font-semibold text-slate-800 mt-0.5">{deliveryLocation || "—"}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Required Sample Qty</p>
                  <p className="text-[12px] font-semibold text-slate-800 mt-0.5">{deliveryReqQty ? `${deliveryReqQty} pcs` : "—"}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Quotations Received</p>
                  <p className="text-[12px] font-semibold text-slate-800 mt-0.5">{Object.keys(liveQuotes).length > 0 ? `${Object.keys(liveQuotes).length} vendor(s)` : "—"}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">R&amp;D Owner</p>
                  <p className="text-[12px] font-semibold text-slate-800 mt-0.5">{DEFAULT_RND_CONTACT.name}</p>
                </div>
              </div>
            </div>

            {/* ── C: Dispatch & Delivery Timeline ───────────── */}
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">C. Dispatch &amp; Delivery</p>
              {dispatchInfo ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                  {[
                    { label: "Dispatching Supplier", value: dispatchInfo.vendorName },
                    { label: "Dispatch Date (Actual)", value: dispatchInfo.dispatchDate },
                    { label: "No. of Samples Provided", value: plantDeliveryQty ? `${plantDeliveryQty} pcs` : deliveryReqQty ? `${deliveryReqQty} pcs` : "—" },
                    { label: "Proof of Dispatch", value: dispatchInfo.docs.length > 0 ? dispatchInfo.docs[0] : "Submitted" },
                    { label: "Supplier Confirmed Delivery", value: plantDeliveryDate || "—" },
                  ].map(item => (
                    <div key={item.label} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-[12px] font-semibold text-blue-900 mt-0.5 truncate" title={item.value}>{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-slate-400 italic">Dispatch details not yet recorded.</p>
              )}
            </div>

            {/* ── D: R&D Testing ─────────────────────────────── */}
            {(() => {
              const tests = getTestsByCategory(npd.itemCategory)
              if (tests.length === 0) return null
              return (
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">D. R&amp;D Test Results</p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{npd.itemCategory}</span>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        {evalStartedAt && <span>Started: {new Date(evalStartedAt).toLocaleDateString("en-IN")}</span>}
                        <span>{tests.length} tests</span>
                      </div>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {["Test Name","Type","Unit","Expected","Result"].map(h => (
                            <th key={h} className={`px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${h === "Test Name" ? "text-left" : "text-center"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map((t, i) => (
                          <tr key={t.testName} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="px-4 py-2 font-medium text-slate-800">{t.testName}</td>
                            <td className="px-3 py-2 text-center text-xs text-slate-500">{t.testType}</td>
                            <td className="px-3 py-2 text-center text-xs text-slate-500">{t.unit}</td>
                            <td className="px-3 py-2 text-center text-xs text-slate-500">{t.expectedRange ?? "—"}</td>
                            <td className="px-3 py-2 text-center font-semibold text-slate-800">{testResults[t.testName] ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {npd.tqrScore && (
                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                      {[
                        { label: "Technology (T)", value: npd.tqrScore.t },
                        { label: "Quality (Q)",    value: npd.tqrScore.q },
                        { label: "Reliability (R)",value: npd.tqrScore.r },
                        { label: "TQR Composite",  value: npd.tqrScore.composite },
                      ].map(s => (
                        <div key={s.label} className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-center">
                          <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">{s.label}</p>
                          <p className="text-[18px] font-black text-violet-800 leading-tight">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── E: Plant Verdict ───────────────────────────── */}
            {plantVerdict && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">E. Plant Verdict</p>
                <div className={`rounded-xl border p-4 flex items-center gap-3 ${plantVerdict === "accepted" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  {plantVerdict === "accepted"
                    ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    : <XCircle    className="w-5 h-5 text-red-500 shrink-0" />}
                  <div>
                    <p className={`text-sm font-bold ${plantVerdict === "accepted" ? "text-emerald-800" : "text-red-800"}`}>
                      {plantVerdict === "accepted" ? "Accepted — Approved for Production" : "Not Good — Returned for Revision"}
                    </p>
                    {plantRemarks && <p className="text-xs mt-0.5 text-slate-500 italic">{plantRemarks}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── F: Closure Details ─────────────────────────── */}
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">F. Closure</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Part Number</p>
                  <p className="text-[13px] font-mono font-bold text-blue-800 mt-0.5">{assignedPartNumber || "—"}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cost from AICM</p>
                  <p className="text-[13px] font-bold text-slate-800 mt-0.5">{npd.cost != null ? `₹ ${npd.cost.toFixed(2)}` : "—"}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Final Status</p>
                  <p className="text-[12px] font-semibold text-emerald-700 mt-0.5">{plantVerdict === "accepted" ? "Closed — Approved" : "Closed — Pending Revision"}</p>
                </div>
                <div className={`rounded-lg border p-3 flex items-center gap-2 text-sm ${
                  npd.tatHealth === "green" ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : npd.tatHealth === "amber" ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-red-50 border-red-200 text-red-800"
                }`}>
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-bold">
                    TAT: {npd.tatHealth === "black" || npd.tatHealth === "red" ? "Overdue" : `${npd.tatDaysRemaining}d left`} / {npd.totalTat}d
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
              <Link href={`/report/${npdId}`}>
                <Button className="bg-emerald-700 hover:bg-emerald-600 text-white">
                  <FileText className="w-4 h-4 mr-2" /> View NPD Report
                </Button>
              </Link>

              {/* Fetch Part Details from AICM */}
              <Button
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                disabled={aicmLoading}
                onClick={() => {
                  if (aicmFetched) {
                    setAicmPanelOpen(v => !v)
                    return
                  }
                  setAicmLoading(true)
                  setTimeout(() => {
                    setAicmLoading(false)
                    setAicmFetched(true)
                    setAicmPanelOpen(true)
                    const all: Record<string, boolean> = JSON.parse(localStorage.getItem(AICM_FETCH_KEY) ?? "{}")
                    all[npdId] = true
                    localStorage.setItem(AICM_FETCH_KEY, JSON.stringify(all))
                  }, 1000)
                }}
              >
                {aicmLoading ? (
                  <><span className="w-4 h-4 mr-2 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin inline-block" /> Fetching…</>
                ) : (
                  <><Star className="w-4 h-4 mr-2" /> Fetch Part Details from AICM</>
                )}
              </Button>
            </div>

            {/* AICM inline panel */}
            {aicmPanelOpen && aicmFetched && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Star className="w-4 h-4" /> AICM Part Record
                  </p>
                  <button onClick={() => setAicmPanelOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg border border-blue-100 px-3 py-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Part Number</p>
                    <p className="text-sm font-mono font-bold text-blue-800 mt-0.5">{assignedPartNumber || "—"}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-blue-100 px-3 py-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Part Name</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{npd.itemName}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-blue-100 px-3 py-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit Cost (₹)</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">₹{npd.cost ?? 850}</p>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* ═══════════════════ SOURCING SECTION ═══════════════════ */}
      {isSpocOrSourcing && (
        <div className="flex flex-col-reverse gap-6">
          {currentRole === "super_admin" && (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">Sourcing Team</span>
            </div>
          )}

          {/* ── Section 1: Supplier Sourcing & Quotations ──── */}
          {activeStage < 2 ? (
            <Card>
              <CardContent className="py-8 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Waiting for NPD request to be initiated</p>
                <p className="text-xs mt-1">This section unlocks once the NPD reaches Stage 2.</p>
              </CardContent>
            </Card>
          ) : activeStage >= 7 ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">Sourcing Complete — {npd.supplier}</p>
                <p className="text-xs text-emerald-700 mt-0.5">Enquiry dispatched · Quotation approved · Supplier locked in</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">Stage 2 ✓</span>
            </div>
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
                ) : activeStage >= 3 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-5 py-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-900">Enquiry Dispatched — {sentVendors.length} Vendor{sentVendors.length !== 1 ? "s" : ""}</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Supplier locked. Links and email drafts are hidden to avoid confusion.</p>
                    </div>
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
                            <div key={vendorName} className="space-y-2">
                              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                {/* Email header bar */}
                                <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="text-[10px] text-slate-400 shrink-0">To: {vendorName} ·</span>
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

                const samplesVal  = live ? (parseInt(live.formValues.sampleQty || live.formValues.q2 || "") || null) : v.sampleQty
                const supplyVal   = live ? (live.formValues.supplyDate || live.formValues.q1 || v.supplyDate) : v.supplyDate
                const submittedAt = live ? live.submittedAt : v.submittedAt

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
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                            <MessageSquare className="w-3.5 h-3.5" /> {live?.rndReply ? "RND Replied — Awaiting Re-Assessment" : "Query Raised"}
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
                        <p className="text-sm text-slate-500 italic">Vendor has raised a clarification query regarding this requirement.</p>
                        {live?.query && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" /> Clarification Query from Vendor
                            </p>
                            <p className="text-sm text-amber-900 italic">&ldquo;{live.query}&rdquo;</p>
                            <p className="text-[10px] text-amber-600 mt-1.5">Sent to R&amp;D Owner for review · {live.submittedAt}</p>
                          </div>
                        )}
                        {live?.rndReply && (
                          <div className="space-y-2">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                              <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> R&amp;D Replied — Awaiting Supplier Re-Assessment
                              </p>
                              <p className="text-sm text-emerald-900">{live.rndReply}</p>
                              {live.rndReplyDoc && <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1"><FileText className="w-3 h-3" />{live.rndReplyDoc}</p>}
                            </div>
                            <EmailCard
                              to={v.vendorName}
                              subject={`R&D Clarification — ${npdId}: ${npd.itemName}`}
                              body={(() => {
                                const portalUrl = `${baseUrl}/supplier/quote/${npdId}?vendor=${encodeURIComponent(v.vendorName)}`
                                return `<p>Dear <strong>${v.vendorName}</strong>,</p><p>Thank you for your query regarding <strong>${npd.itemName}</strong> (${npdId}). Our R&amp;D team has reviewed it and provided the following clarification:</p><blockquote style="border-left:3px solid #1e3a5f;margin:12px 0;padding:8px 14px;background:#f8fafc;color:#1e293b;font-style:italic">${live.query}</blockquote><p><strong>R&amp;D Response:</strong><br/>${live.rndReply}</p>${live.rndReplyDoc ? `<p style="font-size:12px;color:#64748b">Attached document: ${live.rndReplyDoc}</p>` : ""}<p>Based on this clarification, kindly re-assess your feasibility and submit your updated response using the link below.</p><div style="margin:16px 0;"><a href="${portalUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Re-Assess &amp; Submit Response →</a></div><p>Regards,<br/><strong>${npd.spoc}</strong><br/>Amber Enterprises Sourcing Team</p>`
                              })()}
                            />
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
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {[
                            { label: "Supply Date", value: supplyVal  ?? "—" },
                            { label: "Samples",     value: samplesVal !== null ? `${samplesVal} pcs` : "—" },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                              <p className="text-sm font-semibold mt-0.5 text-slate-800">{value}</p>
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
                              {needsDateApproval && (
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

                        {/* Reminder email draft — shown when vendor has submitted and has a supply date */}
                        {isSpocOrSourcing && isSubmitted && supplyVal && !vendorStatuses[v.vendorName] && (() => {
                          const { subject, body, statusLink } = buildReminderEmail(v.vendorName, supplyVal)
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


                        {/* Approve / Reject — only for SPOCs and sourcing roles */}
                        {!approval && !isReNegotiating && isSubmitted && (
                          <div className="flex gap-3 pt-2 border-t border-slate-100 flex-wrap">
                            <button
                              onClick={() => setVendorApproval(v.vendorName, "rejected")}
                              className="flex items-center gap-1.5 text-sm font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-lg px-4 py-2 transition-colors"
                            >
                              <XCircle className="w-4 h-4" /> Reject
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
          {activeStage >= 3 && activeStage >= 7 && dispatchInfo && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">Dispatch Confirmed — {dispatchInfo.vendorName}</p>
                <p className="text-xs text-emerald-700 mt-0.5">Dispatched on {dispatchInfo.dispatchDate} · Proof of dispatch submitted</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">Stage 3 ✓</span>
            </div>
          )}
          {activeStage >= 3 && activeStage < 7 && (
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

                {dispatchInfo ? (
                  <div className="bg-white border border-emerald-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Supplier Submitted Dispatch Details
                      </p>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        deliverySubmitted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {deliverySubmitted ? "Delivery Accepted" : "Pending RND Acceptance"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400 uppercase tracking-wider font-bold">Supplier</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{dispatchInfo.vendorName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wider font-bold">Dispatch Date</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{dispatchInfo.dispatchDate}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wider font-bold">Submitted</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{dispatchInfo.submittedAt}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wider font-bold">Proof of Dispatch</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{dispatchInfo.docs.length} document{dispatchInfo.docs.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    {dispatchInfo.docs.length > 0 && (
                      <ul className="space-y-1">
                        {dispatchInfo.docs.map((doc, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" /> {doc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 italic flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Awaiting dispatch submission from {npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : sentVendors[0] ?? "supplier"}
                    </p>
                    {activeStage <= 3 && (() => {
                      const vendor = npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : sentVendors[0] ?? ""
                      const dispatchUrl = `${baseUrl}/supplier/dispatch/${npdId}${vendor ? `?vendor=${encodeURIComponent(vendor)}` : ""}`
                      return (
                        <>
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
                          {vendor && (
                            <EmailCard
                              to={vendor}
                              subject={`Dispatch Confirmation Required — ${npdId}`}
                              body={`<p>Dear <strong>${vendor}</strong>,</p><p>Today is your dispatch date for <strong>${npd.itemName}</strong> (${npdId}). Please upload your proof of dispatch and confirm your dispatch details using the button below.</p><div style="margin:16px 0;"><a href="${dispatchUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Open Dispatch Portal →</a></div><p>Amber Enterprises Sourcing Team</p>`}
                            />
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}

                {!dispatchInfo && (
                  <div className="pt-1 border-t border-orange-100">
                    <p className="text-[10px] text-slate-400 mb-2">Manual override (if supplier did not use portal):</p>
                    {!defenceAdvanced ? (
                      <Button
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                        onClick={() => {
                          setDefenceAdvanced(true)
                          setActiveStage(4)
                          updateNPD(npdId, { stage: 4, stageName: NPD_STAGES[3] })
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Mark Dispatched &amp; Advance to RND Evaluation
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Dispatched — Advanced to RND Evaluation
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Section 2b: Plant Delivery (stage 7) ──────────────────────────── */}
          {activeStage >= 7 && activeStage < 8 && (() => {
            const supplier = npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : sentVendors[0] ?? ""
            const portalUrl = supplier ? `${baseUrl}/supplier/plant-delivery/${npdId}?vendor=${encodeURIComponent(supplier)}` : ""
            return (
              <Card className="border-orange-300 shadow-sm">
                <CardHeader className="bg-orange-50 border-b border-orange-200 pb-3">
                  <CardTitle className="text-orange-900 flex items-center gap-2 text-base">
                    <Package className="w-5 h-5" /> Plant Delivery Coordination
                  </CardTitle>
                  <p className="text-xs text-orange-700 mt-0.5">Part No: <strong>{assignedPartNumber || "—"}</strong> · Send the portal link to the supplier for delivery confirmation</p>
                </CardHeader>
                <CardContent className="pt-5 space-y-3">
                  {/* Step 1: Sourcing fills delivery details */}
                  {!deliveryDetailsSubmitted ? (
                        <div className="space-y-4">
                          <p className="text-sm text-slate-600">
                            Fill in the delivery location and required sample quantity. The supplier will then receive a form to confirm their delivery date.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Delivery Location <span className="text-red-500">*</span></label>
                              <select
                                value={deliveryLocation}
                                onChange={e => setDeliveryLocation(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                              >
                                <option value="">Select plant…</option>
                                {AMBER_PLANTS.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Required Sample Qty (pcs) <span className="text-red-500">*</span></label>
                              <input
                                type="number"
                                min="1"
                                value={deliveryReqQty}
                                onChange={e => setDeliveryReqQty(e.target.value)}
                                placeholder="e.g. 5"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                              />
                            </div>
                          </div>
                          <Button
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            disabled={!deliveryLocation || !deliveryReqQty}
                            onClick={() => {
                              const details = { location: deliveryLocation, requiredQty: deliveryReqQty, setAt: new Date().toLocaleString("en-IN") }
                              const raw = localStorage.getItem(DELIVERY_DETAILS_KEY)
                              const all: Record<string, typeof details> = raw ? JSON.parse(raw) : {}
                              all[npdId] = details
                              localStorage.setItem(DELIVERY_DETAILS_KEY, JSON.stringify(all))
                              setDeliveryDetails(details)
                              setDeliveryDetailsSubmitted(true)
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Save &amp; Send to Supplier
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                            <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Delivery Details Set</p>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-blue-700">
                              <span><span className="text-slate-400">Location:</span> <strong>{deliveryDetails?.location}</strong></span>
                              <span><span className="text-slate-400">Required Qty:</span> <strong>{deliveryDetails?.requiredQty} pcs</strong></span>
                              <span><span className="text-slate-400">Part No.:</span> <strong className="font-mono">{assignedPartNumber}</strong></span>
                            </div>
                          </div>
                          {!plantSupplierSubmitted ? (
                            <>
                              {portalUrl && (
                                <>
                                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2.5">
                                    <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="text-xs text-blue-700 font-mono truncate flex-1">{portalUrl}</span>
                                    <button
                                      onClick={() => { navigator.clipboard.writeText(portalUrl); setCopiedVendor("plant_sourcing_link"); setTimeout(() => setCopiedVendor(null), 2000) }}
                                      className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                                    >
                                      {copiedVendor === "plant_sourcing_link" ? "Copied!" : <><Copy className="w-3 h-3" /> Copy</>}
                                    </button>
                                    <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-blue-700">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                  <EmailCard
                                    to={supplier}
                                    subject={`Delivery Date Request — ${npdId}: ${npd.itemName}`}
                                    body={`<p>Dear <strong>${supplier}</strong>,</p><p>R&amp;D testing for <strong>${npd.itemName}</strong> has been approved. We require sample delivery at our plant at the details below.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#1e3a5f"><td colspan="2" style="padding:10px 12px;font-weight:700;font-size:14px;color:#fff;letter-spacing:0.04em">Part No. ${assignedPartNumber}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Delivery Location</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${deliveryLocation}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Required Qty</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${deliveryReqQty} pcs</td></tr></table><p>Please confirm your delivery date using the button below:</p><div style="margin:16px 0;"><a href="${portalUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Confirm Delivery Date →</a></div><p style="color:#64748b;font-size:12px">Amber Enterprises Sourcing Team · ${npd.spoc}</p>`}
                                  />
                                </>
                              )}
                              <p className="text-[10px] text-slate-400">⏳ Awaiting supplier delivery date confirmation</p>
                            </>
                          ) : (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-1.5">
                              <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> Supplier Confirmed Delivery Date
                              </p>
                              <div className="flex gap-6 text-sm text-emerald-700">
                                <span>Date: <strong>{plantDeliveryDate}</strong></span>
                                <span>Location: <strong>{deliveryDetails?.location}</strong></span>
                              </div>
                              {plantVerdict && (
                                <p className={`text-xs font-semibold mt-1 ${plantVerdict === "accepted" ? "text-emerald-700" : "text-red-700"}`}>
                                  {plantVerdict === "accepted" ? "✓ Plant user accepted the part" : "✗ Plant user rejected — revision required"}
                                </p>
                              )}
                            </div>
                          )}
                          {!plantVerdict && plantSupplierSubmitted && <PushSentBadge to="Plant User" />}
                          {plantVerdict && (
                            <>
                              <EmailCard
                                to={npd.spoc}
                                subject={`[${plantVerdict === "accepted" ? "✓ Accepted" : "✗ Not Good"}] Plant Testing Verdict — ${npdId}`}
                                body={`<p>Dear <strong>${npd.spoc}</strong>,</p><p>The plant testing verdict for the following NPD has been submitted.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#1e3a5f"><td colspan="2" style="padding:10px 12px;font-weight:700;font-size:14px;color:#fff;letter-spacing:0.04em">Part No. ${assignedPartNumber}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">NPD ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Verdict</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:${plantVerdict === "accepted" ? "#059669" : "#dc2626"}">${plantVerdict === "accepted" ? "✓ Accepted — Approved for Production" : "✗ Not Good — Returned for Revision"}</td></tr>${plantRemarks ? `<tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Remarks</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-style:italic">${plantRemarks}</td></tr>` : ""}</table><p style="color:#64748b;font-size:12px">Amber Enterprises Plant Team</p>`}
                              />
                              <PushSentBadge to={npd.spoc} />
                            </>
                          )}
                        </div>
                      )}
                </CardContent>
              </Card>
            )
          })()}

        </div>
      )}

    </div>
  )
}
