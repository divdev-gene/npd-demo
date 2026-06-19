"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  getStageName, getBundleChildren, NPD_BUNDLE_KEY, SPOC_NAMES, SPOC_CONTACTS, NPD_STAGES, NCD_STAGES, TOTAL_NPD_STAGES, moduleLabel,
  MOCK_SUPPLIER_DOCS, SUPPLIER_DOCS_KEY,
  MOCK_VENDOR_QUOTATIONS, VENDOR_QUOTE_APPROVALS_KEY,
  LIVE_QUOTATIONS_KEY, ENQUIRY_SENT_KEY, VENDOR_RFQ_TEMPLATE_KEY, DEFAULT_RFQ_TEMPLATE, VENDOR_EMAIL, COMPOSED_EMAILS_KEY,
  VENDOR_STATUS_KEY, DEFAULT_STATUS_TEMPLATE, VENDOR_STATUS_TEMPLATE_KEY, VENDOR_DATE_APPROVAL_KEY,
  SUPPLIER_DISPATCH_KEY, DELIVERY_ACCEPTANCE_KEY,
  PART_ASSIGNMENT_KEY, PLANT_SUPPLIER_RESP_KEY, PLANT_ACCEPTANCE_KEY, REJECTED_PARTS_KEY,
  PUSH_NOTIFICATIONS_KEY, RND_EVAL_KEY, AICM_FETCH_KEY,
  DELIVERY_DETAILS_KEY, AMBER_PLANTS, NDA_STATUS_KEY, SOURCING_APPROVAL_KEY, TAT_EXTENSION_REQ_KEY, REQUESTED_VENDORS_KEY,
  MULTI_DISPATCH_KEY, VENDOR_SAMPLES_KEY, VENDOR_TESTS_KEY, VENDOR_VERDICTS_KEY, FINAL_VENDOR_KEY,
  DQA_TESTS_KEY, DQA_TESTS,
  ECN_STAGE1_KEY, ECN_RND_APPROVAL_KEY, ECN_SOURCING_DISPATCH_KEY,
  ECN_PRICE_ESTIMATION_KEY, ECN_DQA_TESTS_KEY, ECN_HEAD_APPROVAL_KEY, NCD_PP_PRICING_KEY,
  ECN_NEGOTIATION_KEY, ECN_INITIAL_QUOTE_KEY,
  ECN_PLANT_EVAL_KEY, AS_PLANT_EVAL_KEY,
  AS_STAGE1_KEY, AS_RND_APPROVAL_KEY, type ASStage1Data,
  DEFAULT_RND_CONTACT, DEFAULT_RND_HEAD,
  getTestsByCategory, getTotalTestDays,
  type NPDRecord, type SupplierDoc, type VendorQuotation, type LiveQuotation, type VendorStatusResponse, type PushNotification, type TestResult,
} from "@/lib/mockData"
import { fetchVendors, getCachedVendors, type VmsVendor } from "@/lib/vendors"
import { useNPDs } from "@/lib/npdContext"
import { downloadMISReport, reportPrefix } from "@/lib/reportGenerator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, Circle, CheckCircle, Clock, AlertCircle, FileText,
  Send, MessageSquare, Mail, ShieldCheck, XCircle, Star, Copy, ExternalLink, Link2,
  FolderOpen, UploadCloud, Download, Package, Bell, TimerReset, Truck,
  FlaskConical, ClipboardCheck, AlertTriangle,
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
          className="bg-blue-900 hover:bg-blue-800 active:scale-[0.98] transition-transform text-white"
          disabled={!reSampleQty || !reSampleDate || !vendor}
          onClick={() => setGenerated(true)}
        >
          <Send className="w-4 h-4 mr-2" /> Generate Re-Sample Link
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

import { type NegotiationRound, type NegotiationRecord } from "@/lib/npdTypes"

function getVendors(category: string, allVendors: VmsVendor[]): VmsVendor[] {
  const cat = category.toLowerCase()
  return allVendors.filter(v =>
    v.commodity_code?.toLowerCase() === cat ||
    v.business_vertical?.toLowerCase().includes(cat) ||
    cat.includes(v.business_vertical?.toLowerCase() ?? "")
  )
}


export default function NpdDetailView() {
  const params = useParams()
  const npdId = params.id as string
  const { npds, updateNPD } = useNPDs()

  const npd = npds.find(n => n.id === npdId) || npds[0]
  const [activeStage, setActiveStage] = useState(npd?.stage ?? 1)
  const [currentRole, setCurrentRole] = useState("rnd_user")
  const TQR_STATUS_KEY = `tqr_status_v1`
  const RND_APPROVAL_DECISION_KEY = `rnd_approval_decision_v1`
  const [tqrStatus, setTqrStatusState] = useState("pending")
  const setTqrStatus = (s: string) => {
    setTqrStatusState(s)
    const raw = localStorage.getItem(TQR_STATUS_KEY)
    const all: Record<string, string> = raw ? JSON.parse(raw) : {}
    all[npdId] = s
    localStorage.setItem(TQR_STATUS_KEY, JSON.stringify(all))
  }
  const [allVendors, setAllVendors] = useState<VmsVendor[]>([])
  useEffect(() => { fetchVendors().then(setAllVendors) }, [])
  const [rndApprovalDecision, setRndApprovalDecision] = useState<"approved" | "rejected_rnd" | "rejected_dqa" | null>(null)
  const [rndRejectionReason,  setRndRejectionReason]  = useState("")
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
  const [dateApprovals,   setDateApprovals]   = useState<Record<string, { decision: "approved" | "rejected"; decidedAt: string }>>({})
  const [copiedReminder,  setCopiedReminder]  = useState<string | null>(null)
  const PRICE_NEG_KEY = "price_negotiation_v1"
  const [priceNegData, setPriceNegData] = useState<Record<string, NegotiationRecord>>({})
  const [counterOpen,     setCounterOpen]     = useState<Record<string, boolean>>({})
  const [counterDate,     setCounterDate]     = useState<Record<string, string>>({})
  const [counterMsg,      setCounterMsg]      = useState<Record<string, string>>({})

  // ── TAT Extension ───────────────────────────────────────────────────────
  const tatExtendRef = useRef<HTMLDivElement>(null)
  const [tatExtendOpen,     setTatExtendOpen]     = useState(false)
  const [tatExtendDays,     setTatExtendDays]     = useState("")
  const [tatExtendReason,   setTatExtendReason]   = useState("")
  const [tatExtended,       setTatExtended]       = useState(false)
  const [tatExtendedByDays, setTatExtendedByDays] = useState(0)

  // ── Sourcing Approval (Stage 2 gate) ────────────────────────────────────
  const [sourcingApproved,    setSourcingApproved]    = useState(false)
  const [sourcingApprovedBy,  setSourcingApprovedBy]  = useState("")
  const [sourcingApprovedAt,  setSourcingApprovedAt]  = useState("")
  const [sourcingApprovalNote, setSourcingApprovalNote] = useState("")
  const [sourcingTatExtendOpen, setSourcingTatExtendOpen] = useState(false)
  const [sourcingTatDays,     setSourcingTatDays]     = useState("")
  const [sourcingTatReason,   setSourcingTatReason]   = useState("")

  // ── TAT Extension Request (sourcing → R&D approval) ─────────────────────
  const [tatExtReqPending,   setTatExtReqPending]   = useState(false)
  const [tatExtReqDays,      setTatExtReqDays]      = useState(0)
  const [tatExtReqReason,    setTatExtReqReason]    = useState("")
  const [tatExtReqAt,        setTatExtReqAt]        = useState("")
  const [tatExtRndDecision,  setTatExtRndDecision]  = useState<"approved" | "rejected" | null>(null)
  const [tatExtRndAt,        setTatExtRndAt]        = useState("")

  // ── NDA (before RFQ dispatch) ────────────────────────────────────────────
  const [ndaSent, setNdaSent] = useState(false)
  const [ndaStatuses, setNdaStatuses] = useState<Record<string, { signed: boolean; signedBy?: string; signedAt?: string }>>({})

  // ── Requested / new vendors ───────────────────────────────────────────────
  const [requestedVendors, setRequestedVendors] = useState<Array<{ name: string; contact: string; email: string; phone: string }>>([])
  const [newVendorFormOpen, setNewVendorFormOpen] = useState(false)
  const [newVendorName,    setNewVendorName]    = useState("")
  const [newVendorContact, setNewVendorContact] = useState("")
  const [newVendorEmail,   setNewVendorEmail]   = useState("")
  const [newVendorPhone,   setNewVendorPhone]   = useState("")

  // ── Multi-vendor dispatch / testing / verdict ────────────────────────────
  const [multiDispatch, setMultiDispatch] = useState<Record<string, { dispatchDate: string; docs: string[]; submittedAt: string }>>({})
  const [vendorSamples, setVendorSamples] = useState<Record<string, boolean>>({})
  const [vendorTests,   setVendorTests]   = useState<Record<string, { results: Record<string, string>; status: string; submittedAt?: string }>>({})
  const [vendorVerdicts, setVendorVerdicts] = useState<Record<string, { verdict: "accepted" | "rejected"; remarks: string; at: string }>>({})
  const [finalVendor,    setFinalVendor]    = useState("")
  const [activeTestVendor, setActiveTestVendor] = useState("")

  // ── Supplier Dispatch ───────────────────────────────────────────────────
  const [defenceAdvanced, setDefenceAdvanced] = useState(false)

  // ── Delivery Details (sourcing fills location + qty for stage 7) ─────────
  const [deliveryDetails, setDeliveryDetails] = useState<{ location: string; requiredQty: string; setAt: string } | null>(null)
  const [deliveryLocation, setDeliveryLocation] = useState<string>(AMBER_PLANTS[0])
  const [deliveryReqQty,   setDeliveryReqQty]   = useState("")
  const [deliveryDetailsSubmitted, setDeliveryDetailsSubmitted] = useState(false)


  // ── Query reply form (keyed by vendorName) ──────────────────────────────
  const [queryReplyText, setQueryReplyText] = useState<Record<string, string>>({})
  const [queryReplyDoc,  setQueryReplyDoc]  = useState<Record<string, string>>({})

  // ── Dispatch info from supplier portal ──────────────────────────────────
  const [dispatchInfo, setDispatchInfo] = useState<{
    vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string
  } | null>(null)

  // ── Delivery acceptance ───────────────────────────────────────────────────
  const [deliveryDoc,          setDeliveryDoc]          = useState("")
  const [deliverySubmitted,    setDeliverySubmitted]    = useState(false)
  const [deliveryHeadApproved, setDeliveryHeadApproved] = useState(false)
  const [samplesNotReceived,   setSamplesNotReceived]   = useState(false)

  // ── Stage 8: Sample Dispatch & R&D Acceptance ────────────────────────────
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
  const [evalSubmitted,          setEvalSubmitted]          = useState<Record<string, boolean>>({})
  const [evalStartedAt,          setEvalStartedAt]          = useState<string | null>(null)
  const [dqaResults,             setDqaResults]             = useState<Record<string, { value: string; status: string }>>({})
  const [dqaSubmitted,           setDqaSubmitted]           = useState(false)
  const [evalSupportingDocs,     setEvalSupportingDocs]     = useState<string[]>([])
  const [headActionReason,       setHeadActionReason]       = useState("")
  const [aicmFetched,            setAicmFetched]            = useState(false)
  const [aicmLoading,            setAicmLoading]            = useState(false)
  const [aicmPanelOpen,          setAicmPanelOpen]          = useState(false)
  // Stage 7 verdict card expand state (R&D head reject flows)
  const [showRejectRndReason,    setShowRejectRndReason]    = useState(false)
  const [showRejectDqaReason,    setShowRejectDqaReason]    = useState(false)

  // ── ECN-specific state ────────────────────────────────────────────────────
  const [ecnStage1Data,         setEcnStage1Data]          = useState<null | { submittedBy: string; submittedAt: number }>(null)
  const [ecnRndApproval,        setEcnRndApproval]         = useState<null | { verdict: "approved" | "pending" | "rejected"; approvedBy: string; approvedAt: number; note?: string; tatExtension?: { requested: boolean; days?: number; reason?: string; requestedAt?: number; rndDecision?: { decision: "approved" | "rejected"; decidedBy: string; decidedAt: number } } }>(null)
  const [ecnSourcingDispatch,   setEcnSourcingDispatch]    = useState<null | { portalSentAt: number; sentBy: string; submission?: { dispatchDate: string; docs: string[]; submittedAt: number }; statusUpdate?: { onTrack: "yes" | "no"; newDate?: string; notes: string; updatedAt: number; dateApproved?: { approvedBy: string; approvedAt: number } }; received?: { markedBy: string; markedAt: number; doc?: string } }>(null)
  const [ecnReceiptDoc,         setEcnReceiptDoc]          = useState("")
  // ECN TAT extension form locals
  const [ecnTatExtDays,         setEcnTatExtDays]          = useState("")
  const [ecnTatExtReason,       setEcnTatExtReason]        = useState("")
  const [ecnTatExtFormOpen,     setEcnTatExtFormOpen]      = useState(false)
  // ECN R&D test results
  const [ecnRndTestResults,     setEcnRndTestResults]      = useState<Record<string, string>>({})
  const [ecnRndTestSubmitted,   setEcnRndTestSubmitted]    = useState(false)
  // ECN DQA results
  const [ecnDqaResults,         setEcnDqaResults]          = useState<Record<string, { value: string; status: string }>>({})
  const [ecnDqaSubmitted,       setEcnDqaSubmitted]        = useState(false)
  // ECN new keys
  const [ecnPriceEstimation,    setEcnPriceEstimation]     = useState<null | { pricePerUnit: string; currency: string; submittedAt: number }>(null)
  const [ecnDqaTestsData,       setEcnDqaTestsData]        = useState<null | { results: Record<string, { value: string; status: string }>; submittedAt: number; submittedBy: string }>(null)
  const [ecnHeadApproval,       setEcnHeadApproval]        = useState<null | { verdict: "approved" | "rejected"; remarks?: string; approvedBy: string; approvedAt: number }>(null)
  const [ecnHeadRemarks,        setEcnHeadRemarks]         = useState("")
  // Plant Evaluation & Testing (ECN + AS Stage 7)
  const [ecnPlantEval,     setEcnPlantEval]     = useState<{ results: Record<string, string>; submittedAt: number; submittedBy: string } | null>(null)
  const [asPlantEval,      setAsPlantEval]      = useState<{ results: Record<string, string>; submittedAt: number; submittedBy: string } | null>(null)
  const [ecnPlantTestResults, setEcnPlantTestResults] = useState<Record<string, string>>({})
  const [asPlantTestResults,  setAsPlantTestResults]  = useState<Record<string, string>>({})
  // ECN Price Negotiation (Stage 2)
  const [ecnInitialQuote,    setEcnInitialQuote]     = useState<{ price: string; currency: "INR" | "USD" | "EUR"; date: string; docs: string[]; submittedAt: number } | null>(null)
  const [ecnNegotiation,     setEcnNegotiation]     = useState<NegotiationRecord | null>(null)
  const [negTargetPrice,     setNegTargetPrice]      = useState("")
  const [negCurrency,        setNegCurrency]         = useState<"INR" | "USD" | "EUR">("INR")
  const [ncdPpPricing,          setNcdPpPricing]           = useState<null | { ppPrice: string; currency: string; moq: string; leadTime: string; submittedBy: string; submittedAt: number }>(null)
  const [ncdPpPrice,            setNcdPpPrice]             = useState("")
  const [ncdPpCurrency,         setNcdPpCurrency]          = useState<"INR" | "USD" | "EUR">("INR")
  const [ncdPpMoq,              setNcdPpMoq]               = useState("")
  const [ncdPpLeadTime,         setNcdPpLeadTime]          = useState("")

  // ── Alt Supplier-specific state ───────────────────────────────────────────
  const [asStage1Data,    setAsStage1Data]    = useState<ASStage1Data | null>(null)
  const [asRndApproval,   setAsRndApproval]   = useState<null | { approvedBy: string; approvedAt: number; note?: string }>(null)

  const [asRndRemarks,    setAsRndRemarks]    = useState("")

  // Derived from state — declared early so useEffect closures below can reference it safely
  const isNCD = npd?.typeOfWork === "New Component Development (NCD)" || npd?.typeOfWork === "New Product Development (NPD)"
  const isECN = npd?.typeOfWork === "Engineering Change Notice (ECN)"
  const isAltSupplier = npd?.typeOfWork?.includes("Alternative Supplier") ?? false
  const hasNewVendorSelected = Array.from(selectedVendors).some(v => requestedVendors.some(rv => rv.name === v))
  const ndaRequired = !isNCD || hasNewVendorSelected || isAltSupplier
  // allNdasSigned: true only when NDA is actually required and all vendors have signed
  const allNdasSigned = ndaRequired && ndaSent && Array.from(selectedVendors).every(v => ndaStatuses[v]?.signed)

  const enquiryValidUntil = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 10)
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  })()

  useEffect(() => {
    if (!tatExtendOpen) return
    const handler = (e: MouseEvent) => {
      if (tatExtendRef.current && !tatExtendRef.current.contains(e.target as Node)) {
        setTatExtendOpen(false)
        setTatExtendDays("")
        setTatExtendReason("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [tatExtendOpen])

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
    const allDateAppr: Record<string, Record<string, { decision: "approved" | "rejected"; decidedAt: string }>> = rawDateAppr ? JSON.parse(rawDateAppr) : {}
    setDateApprovals(allDateAppr[npdId] ?? {})

    const rawDispatch = localStorage.getItem(SUPPLIER_DISPATCH_KEY)
    const allDispatch: Record<string, { vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string }> = rawDispatch ? JSON.parse(rawDispatch) : {}
    setDispatchInfo(allDispatch[npdId] ?? null)

    const rawPriceNeg = localStorage.getItem(PRICE_NEG_KEY)
    const allPriceNeg: Record<string, Record<string, NegotiationRecord>> = rawPriceNeg ? JSON.parse(rawPriceNeg) : {}
    setPriceNegData(allPriceNeg[npdId] ?? {})

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
      const initial = getVendors(npd?.itemCategory ?? "", allVendors)
      if (initial.length > 0) setSelectedVendors(new Set([initial[0].company_name]))
    }

    // Vendor statuses
    const rawStatus = localStorage.getItem(VENDOR_STATUS_KEY)
    const allStatus: Record<string, Record<string, VendorStatusResponse>> = rawStatus ? JSON.parse(rawStatus) : {}
    setVendorStatuses(allStatus[npdId] ?? {})

    const rawDateAppr = localStorage.getItem(VENDOR_DATE_APPROVAL_KEY)
    const allDateAppr: Record<string, Record<string, { decision: "approved" | "rejected"; decidedAt: string }>> = rawDateAppr ? JSON.parse(rawDateAppr) : {}
    setDateApprovals(allDateAppr[npdId] ?? {})

    // Dispatch info from supplier portal
    const rawDispatch = localStorage.getItem(SUPPLIER_DISPATCH_KEY)
    const allDispatch: Record<string, { vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string }> = rawDispatch ? JSON.parse(rawDispatch) : {}
    setDispatchInfo(allDispatch[npdId] ?? null)

    // Price negotiation data
    const rawPriceNegInit = localStorage.getItem(PRICE_NEG_KEY)
    const allPriceNegInit: Record<string, Record<string, NegotiationRecord>> = rawPriceNegInit ? JSON.parse(rawPriceNegInit) : {}
    setPriceNegData(allPriceNegInit[npdId] ?? {})

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
      setEvalStartedAt(allEval[npdId].startedAt)
    }

    const rawDqa = localStorage.getItem(DQA_TESTS_KEY)
    const allDqa: Record<string, { results: Record<string, { value: string; status: string }>; submittedAt: string }> = rawDqa ? JSON.parse(rawDqa) : {}
    if (allDqa[npdId]) {
      setDqaResults(allDqa[npdId].results)
      if (allDqa[npdId].submittedAt) setDqaSubmitted(true)
    }

    // RND Approval decision
    const rawRndDecision = localStorage.getItem(RND_APPROVAL_DECISION_KEY)
    const allRndDecision: Record<string, { decision: "approved" | "rejected_rnd" | "rejected_dqa"; reason: string; at: string }> = rawRndDecision ? JSON.parse(rawRndDecision) : {}
    if (allRndDecision[npdId]) {
      setRndApprovalDecision(allRndDecision[npdId].decision)
      setRndRejectionReason(allRndDecision[npdId].reason ?? "")
    }

    // Delivery details (sourcing-set location + qty for stage 8)
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

    // NDA status
    const rawNda = localStorage.getItem(NDA_STATUS_KEY)
    const allNda: Record<string, Record<string, { signed: boolean; signedBy?: string; signedAt?: string }>> = rawNda ? JSON.parse(rawNda) : {}
    if (allNda[npdId]) {
      setNdaStatuses(allNda[npdId])
      const anyNda = Object.keys(allNda[npdId]).length > 0
      if (anyNda) setNdaSent(true)
    }

    // Sourcing approval
    const rawSA = localStorage.getItem(SOURCING_APPROVAL_KEY)
    const allSA: Record<string, { approved: boolean; approvedBy: string; approvedAt: string; note?: string }> = rawSA ? JSON.parse(rawSA) : {}
    if (allSA[npdId]?.approved) {
      setSourcingApproved(true)
      setSourcingApprovedBy(allSA[npdId].approvedBy)
      setSourcingApprovedAt(allSA[npdId].approvedAt)
    }

    // Requested vendors
    const rawRV = localStorage.getItem(REQUESTED_VENDORS_KEY)
    const allRV: Record<string, Array<{ name: string; contact: string; email: string; phone: string }>> = rawRV ? JSON.parse(rawRV) : {}
    if (allRV[npdId]) setRequestedVendors(allRV[npdId])

    // TAT extension request
    const rawTE = localStorage.getItem(TAT_EXTENSION_REQ_KEY)
    const allTE: Record<string, { days: number; reason: string; requestedAt: string; decision?: "approved" | "rejected"; decidedAt?: string }> = rawTE ? JSON.parse(rawTE) : {}
    if (allTE[npdId]) {
      const te = allTE[npdId]
      setTatExtReqDays(te.days)
      setTatExtReqReason(te.reason)
      setTatExtReqAt(te.requestedAt)
      if (te.decision) {
        setTatExtRndDecision(te.decision)
        setTatExtRndAt(te.decidedAt ?? "")
        setTatExtReqPending(false)
      } else {
        setTatExtReqPending(true)
      }
    }

    // Multi-vendor dispatch
    const rawMD = localStorage.getItem(MULTI_DISPATCH_KEY)
    const allMD: Record<string, Record<string, { dispatchDate: string; docs: string[]; submittedAt: string }>> = rawMD ? JSON.parse(rawMD) : {}
    if (allMD[npdId]) setMultiDispatch(allMD[npdId])

    // Vendor samples received
    const rawVS = localStorage.getItem(VENDOR_SAMPLES_KEY)
    const allVS: Record<string, Record<string, boolean>> = rawVS ? JSON.parse(rawVS) : {}
    if (allVS[npdId]) setVendorSamples(allVS[npdId])

    // Vendor test results
    const rawVT = localStorage.getItem(VENDOR_TESTS_KEY)
    const allVT: Record<string, Record<string, { results: Record<string, string>; status: string; submittedAt?: string }>> = rawVT ? JSON.parse(rawVT) : {}
    if (allVT[npdId]) {
      setVendorTests(allVT[npdId])
      // Derive per-vendor evalSubmitted from vendor test status
      const initEval: Record<string, boolean> = {}
      for (const vendor of Object.keys(allVT[npdId])) {
        initEval[vendor] = allVT[npdId][vendor].status === "complete"
      }
      setEvalSubmitted(initEval)
    }

    // Vendor verdicts
    const rawVV = localStorage.getItem(VENDOR_VERDICTS_KEY)
    const allVV: Record<string, Record<string, { verdict: "accepted" | "rejected"; remarks: string; at: string }>> = rawVV ? JSON.parse(rawVV) : {}
    if (allVV[npdId]) setVendorVerdicts(allVV[npdId])

    // Final selected vendor
    const rawFV = localStorage.getItem(FINAL_VENDOR_KEY)
    const allFV: Record<string, string> = rawFV ? JSON.parse(rawFV) : {}
    if (allFV[npdId]) setFinalVendor(allFV[npdId])

    // ECN — Stage 1
    const rawEcnS1 = localStorage.getItem(ECN_STAGE1_KEY)
    if (rawEcnS1) {
      const allS1 = JSON.parse(rawEcnS1)
      if (allS1[npdId]) setEcnStage1Data(allS1[npdId])
    }
    // ECN — R&D Approval
    const rawEcnRnd = localStorage.getItem(ECN_RND_APPROVAL_KEY)
    if (rawEcnRnd) {
      const allRnd = JSON.parse(rawEcnRnd)
      if (allRnd[npdId]) setEcnRndApproval(allRnd[npdId])
    }
    // ECN — Sourcing Dispatch
    const rawEcnSD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
    if (rawEcnSD) {
      const allSD = JSON.parse(rawEcnSD)
      if (allSD[npdId]) setEcnSourcingDispatch(allSD[npdId])
    }
    // ECN — Price Estimation
    const rawEcnPE = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
    if (rawEcnPE) {
      const allPE = JSON.parse(rawEcnPE)
      if (allPE[npdId]) setEcnPriceEstimation(allPE[npdId])
    }
    // ECN — DQA Tests (new key)
    const rawEcnDqa = localStorage.getItem(ECN_DQA_TESTS_KEY)
    if (rawEcnDqa) {
      const allEcnDqa = JSON.parse(rawEcnDqa)
      if (allEcnDqa[npdId]) {
        setEcnDqaTestsData(allEcnDqa[npdId])
        setEcnDqaResults(allEcnDqa[npdId].results)
        setEcnDqaSubmitted(true)
      }
    }
    // ECN — Head Approval
    const rawEcnHA = localStorage.getItem(ECN_HEAD_APPROVAL_KEY)
    if (rawEcnHA) {
      const allEcnHA = JSON.parse(rawEcnHA)
      if (allEcnHA[npdId]) setEcnHeadApproval(allEcnHA[npdId])
    }
    // NCD — PP Pricing
    const rawNcdPP = localStorage.getItem(NCD_PP_PRICING_KEY)
    if (rawNcdPP) {
      const allNcdPP = JSON.parse(rawNcdPP)
      if (allNcdPP[npdId]) setNcdPpPricing(allNcdPP[npdId])
    }
    // ECN — Initial supplier quote (Stage 2)
    const rawIQ = localStorage.getItem(ECN_INITIAL_QUOTE_KEY)
    if (rawIQ) {
      const allIQ = JSON.parse(rawIQ)
      if (allIQ[npdId]) setEcnInitialQuote(allIQ[npdId])
    }
    // ECN — Stage 2 Negotiation
    const rawEcnNeg = localStorage.getItem(ECN_NEGOTIATION_KEY)
    if (rawEcnNeg) {
      const allNeg = JSON.parse(rawEcnNeg)
      if (allNeg[npdId]) setEcnNegotiation(allNeg[npdId])
    }
    // ECN — DQA results (DQA_TESTS_KEY) — same key as NCD; already loaded above in rawDqa/allDqa
    if (allDqa[npdId]) {
      setEcnDqaResults(allDqa[npdId].results)
      setEcnDqaSubmitted(true)
    }

    // Alt Supplier — Stage 1 sourcing submission
    const rawAs1 = localStorage.getItem(AS_STAGE1_KEY)
    if (rawAs1) {
      const allAs1 = JSON.parse(rawAs1)
      if (allAs1[npdId]) setAsStage1Data(allAs1[npdId])
    }
    // Alt Supplier — R&D approval
    const rawAsRnd = localStorage.getItem(AS_RND_APPROVAL_KEY)
    if (rawAsRnd) {
      const allAsRnd = JSON.parse(rawAsRnd)
      if (allAsRnd[npdId]) setAsRndApproval(allAsRnd[npdId])
    }
    // ECN — Plant Evaluation (Stage 7)
    const rawEcnPlantEval = localStorage.getItem(ECN_PLANT_EVAL_KEY)
    if (rawEcnPlantEval) {
      const allEcnPlantEval = JSON.parse(rawEcnPlantEval)
      if (allEcnPlantEval[npdId]) { setEcnPlantEval(allEcnPlantEval[npdId]); setEcnPlantTestResults(allEcnPlantEval[npdId].results) }
    }
    // AS — Plant Evaluation (Stage 7)
    const rawAsPlantEval = localStorage.getItem(AS_PLANT_EVAL_KEY)
    if (rawAsPlantEval) {
      const allAsPlantEval = JSON.parse(rawAsPlantEval)
      if (allAsPlantEval[npdId]) { setAsPlantEval(allAsPlantEval[npdId]); setAsPlantTestResults(allAsPlantEval[npdId].results) }
    }

    // Refresh live data when supplier submits in another tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === LIVE_QUOTATIONS_KEY || e.key === SUPPLIER_DOCS_KEY || e.key === VENDOR_STATUS_KEY || e.key === SUPPLIER_DISPATCH_KEY || e.key === DELIVERY_ACCEPTANCE_KEY || e.key === PLANT_SUPPLIER_RESP_KEY || e.key === PLANT_ACCEPTANCE_KEY || e.key === NDA_STATUS_KEY || e.key === MULTI_DISPATCH_KEY || e.key === PRICE_NEG_KEY) {
        refreshLiveData()
        // Reload NDA statuses
        const rawN = localStorage.getItem(NDA_STATUS_KEY)
        const allN: Record<string, Record<string, { signed: boolean; signedBy?: string; signedAt?: string }>> = rawN ? JSON.parse(rawN) : {}
        if (allN[npdId]) setNdaStatuses(allN[npdId])
        // Reload multi-dispatch
        const rawMD2 = localStorage.getItem(MULTI_DISPATCH_KEY)
        const allMD2: Record<string, Record<string, { dispatchDate: string; docs: string[]; submittedAt: string }>> = rawMD2 ? JSON.parse(rawMD2) : {}
        if (allMD2[npdId]) setMultiDispatch(allMD2[npdId])
      }
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

  // Auto-advance to stage 8 when TQR is fully approved at RND Approval (stage 7) — NCD/NPD only
  useEffect(() => {
    if (isNCD && tqrStatus === "fully_approved" && activeStage === 7) {
      setActiveStage(8)
      updateNPD(npdId, { stage: 8, stageName: NPD_STAGES[7] })
    }
  }, [tqrStatus, activeStage])

  // Auto-dispatch enquiry the moment all selected vendors have signed the NDA
  useEffect(() => {
    if (allNdasSigned && !enquiryDispatched && selectedVendors.size > 0) {
      dispatchEnquiry()
    }
  }, [allNdasSigned])

  // Auto-advance to stage 5 when ALL vendors have dispatched — NCD/NPD only
  useEffect(() => {
    if (isNCD && sentVendors.length > 0 && sentVendors.every(v => multiDispatch[v]) && activeStage < 5) {
      setActiveStage(5)
      updateNPD(npdId, { stage: 5, stageName: NPD_STAGES[4] })
    }
  }, [multiDispatch])

  // Auto-assign part number if stage is ≥ 7 (RND Approval) and none is assigned yet — NCD/NPD only
  useEffect(() => {
    if (isNCD && activeStage >= 7 && !partAssigned && !isAltSupplier) {
      autoAssignPartNumber(npdId)
    }
  }, [activeStage, partAssigned])

  // Auto-advance to stage 9 (Summary & Closure) when plant accepts the part — NCD/NPD only
  useEffect(() => {
    if (isNCD && plantVerdict === "accepted" && activeStage < 9) {
      setActiveStage(9)
      updateNPD(npdId, { stage: 9, stageName: NPD_STAGES[8] })
    }
  }, [plantVerdict])

  // Sync testResults when switching vendor tabs so each vendor sees their own data
  useEffect(() => {
    const vendor = activeTestVendor || sentVendors[0]
    if (vendor && vendorTests[vendor]) {
      setTestResults(vendorTests[vendor].results)
    } else {
      setTestResults({})
    }
  }, [activeTestVendor])
  // On initial vendorTests load, sync active vendor's data without clearing flat-key fallback
  useEffect(() => {
    const vendor = activeTestVendor || sentVendors[0]
    if (vendor && vendorTests[vendor]) {
      setTestResults(vendorTests[vendor].results)
    }
  }, [vendorTests])

  // ECN: auto-advance stage 3 → 4 when supplier submits dispatch portal
  // AS: dispatch happens at stage 4 (after price approval advances to 4), so excluded here
  useEffect(() => {
    if (!isECN || !npd || activeStage !== 3) return
    if (ecnSourcingDispatch?.submission?.submittedAt) {
      updateNPD(npdId, { stage: 4, stageName: getStageName(4, npd.typeOfWork) })
      setActiveStage(4)
    }
  }, [ecnSourcingDispatch?.submission?.submittedAt, activeStage, isECN])

  // AS: auto-advance stage 3 → 4 when price negotiation is approved
  useEffect(() => {
    if (!isAltSupplier || !npd || activeStage !== 3) return
    if (ecnNegotiation?.approvedAt) {
      updateNPD(npdId, { stage: 4, stageName: getStageName(4, npd.typeOfWork) })
      setActiveStage(4)
    }
  }, [ecnNegotiation?.approvedAt, isAltSupplier, activeStage])

  // ECN: poll ECN_SOURCING_DISPATCH_KEY every 3s at stage 3
  // AS: poll at stage 4 (dispatch happens after price approval)
  useEffect(() => {
    if (!isECN && !isAltSupplier) return
    const stageToWatch = isAltSupplier ? 4 : 3
    if (activeStage !== stageToWatch) return
    const interval = setInterval(() => {
      const raw = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
      if (!raw) return
      const all = JSON.parse(raw)
      if (all[npdId]) setEcnSourcingDispatch(all[npdId])
    }, 3000)
    return () => clearInterval(interval)
  }, [isECN, isAltSupplier, activeStage, npdId])

  // ECN (stage 2) and AS (stage 3): poll ECN_INITIAL_QUOTE_KEY + ECN_NEGOTIATION_KEY every 3s
  useEffect(() => {
    const shouldPoll = (isECN && activeStage === 2) || (isAltSupplier && activeStage === 3)
    if (!shouldPoll) return
    const interval = setInterval(() => {
      if (isECN || isAltSupplier) {
        const rawIQ = localStorage.getItem(ECN_INITIAL_QUOTE_KEY)
        if (rawIQ) {
          const allIQ = JSON.parse(rawIQ)
          if (allIQ[npdId]) setEcnInitialQuote(allIQ[npdId])
        }
      }
      const rawN = localStorage.getItem(ECN_NEGOTIATION_KEY)
      if (rawN) {
        const all: Record<string, NegotiationRecord> = JSON.parse(rawN)
        if (all[npdId]) setEcnNegotiation(all[npdId])
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isECN, isAltSupplier, activeStage, npdId])

  // Poll price negotiation data for NCD/NPD (stage 2-3)
  useEffect(() => {
    if (isECN || isAltSupplier) return
    const interval = setInterval(() => {
      const raw = localStorage.getItem(PRICE_NEG_KEY)
      if (!raw) return
      const all = JSON.parse(raw)
      if (all[npdId]) setPriceNegData(all[npdId])
    }, 3000)
    return () => clearInterval(interval)
  }, [isECN, isAltSupplier, npdId])

  // Auto-approve vendor when supplier accepts a price negotiation target
  useEffect(() => {
    if (isECN || isAltSupplier) return
    Object.entries(priceNegData).forEach(([vendor, record]) => {
      if (record?.approvedAt && !quoteApprovals[vendor]) {
        setVendorApproval(vendor, "approved")
      }
    })
  }, [priceNegData, isECN, isAltSupplier])



  const totalStages = (() => {
    const t = npd.typeOfWork
    if (t.includes("ECN")) return 8
    if (t.includes("NTD")) return 10
    if (t.includes("Compliance")) return 6
    if (t.includes("Alternative Supplier")) return 8
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
  const isPlantUser = isRnd

  const sendNdas = () => {
    const vendorList = Array.from(selectedVendors)
    const rawNda = localStorage.getItem(NDA_STATUS_KEY)
    const allNda: Record<string, Record<string, { signed: boolean; signedBy?: string; signedAt?: string }>> = rawNda ? JSON.parse(rawNda) : {}
    if (!allNda[npdId]) allNda[npdId] = {}
    vendorList.forEach(v => {
      if (!allNda[npdId][v]) allNda[npdId][v] = { signed: false }
    })
    localStorage.setItem(NDA_STATUS_KEY, JSON.stringify(allNda))
    setNdaStatuses(allNda[npdId])
    setNdaSent(true)
  }

  const handleAddNewVendor = () => {
    if (!newVendorName.trim()) return
    const entry = { name: newVendorName.trim(), contact: newVendorContact.trim(), email: newVendorEmail.trim(), phone: newVendorPhone.trim() }
    const updated = [...requestedVendors, entry]
    setRequestedVendors(updated)
    const raw = localStorage.getItem(REQUESTED_VENDORS_KEY)
    const all: Record<string, typeof updated> = raw ? JSON.parse(raw) : {}
    all[npdId] = updated
    localStorage.setItem(REQUESTED_VENDORS_KEY, JSON.stringify(all))
    setNewVendorName(""); setNewVendorContact(""); setNewVendorEmail(""); setNewVendorPhone("")
    setNewVendorFormOpen(false)
  }

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
    // Build a lookup of vendorName → spocName from the catalog
    const emails = vendorList.map(vName => {
      const vendorRecord = allVendors.find(v => v.company_name === vName)
      const vendorSpocName = vendorRecord?.contact_person_name ?? vName
      const portalLink = `${baseUrl}/supplier/quote/${npdId}?vendor=${encodeURIComponent(vName)}`
      const filled = template
        .replace(/{npd_id}/g,       npdId)
        .replace(/{item_name}/g,    npd.itemName)
        .replace(/{commodity}/g,    npd.itemCategory)
        .replace(/{vendor_name}/g,  vName)
        .replace(/{vendor_spoc}/g,  vendorSpocName)
        .replace(/{spoc_name}/g,    npd.spoc)
        .replace(/{portal_link}/g,  portalLink)
        .replace(/{valid_until}/g,  enquiryValidUntil)
        .replace(/{drawing_link}/g, npd.driveLink || "Not attached")
        .replace(/Amber Sourcing Operations/g, npd.spoc)
      const lines = filled.split("\n")
      const subject = lines[0].replace(/^Subject:\s*/i, "").trim()
      const bodyLines = lines.slice(1)
      // Convert plain text lines to HTML; replace the portal link line with a button
      const buttonHtml = `<div style="margin:16px 0;"><a href="${portalLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Click here to submit your feasibility response →</a></div>`
      const renderLine = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      const body = bodyLines.map(line => {
        const trimmed = line.trim()
        if (trimmed === "" ) return `<div style="height:8px"></div>`
        if (trimmed === portalLink || trimmed === "{portal_link}") return buttonHtml
        return `<p style="margin:0 0 4px 0;">${renderLine(trimmed)}</p>`
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
    const entry = { decision, decidedAt: new Date().toLocaleString("en-IN") }
    const next = { ...dateApprovals, [vendorName]: entry }
    setDateApprovals(next)
    const raw = localStorage.getItem(VENDOR_DATE_APPROVAL_KEY)
    const all: Record<string, Record<string, { decision: "approved" | "rejected"; decidedAt: string }>> = raw ? JSON.parse(raw) : {}
    all[npdId] = next
    localStorage.setItem(VENDOR_DATE_APPROVAL_KEY, JSON.stringify(all))
  }

  const submitCounterProposal = (vendorName: string) => {
    const date = counterDate[vendorName]
    if (!date) return
    const raw = localStorage.getItem(VENDOR_STATUS_KEY)
    const all: Record<string, Record<string, VendorStatusResponse>> = raw ? JSON.parse(raw) : {}
    if (!all[npdId]?.[vendorName]) return
    const updated: VendorStatusResponse = {
      ...all[npdId][vendorName],
      negotiationStatus:  "sourcing_countered",
      sourcingCounterDate: date,
      sourcingCounterMsg:  counterMsg[vendorName] || undefined,
      sourcingCounteredAt: new Date().toLocaleString("en-IN"),
    }
    all[npdId][vendorName] = updated
    localStorage.setItem(VENDOR_STATUS_KEY, JSON.stringify(all))
    setVendorStatuses(prev => ({ ...prev, [vendorName]: updated }))
    setCounterOpen(prev => ({ ...prev, [vendorName]: false }))
    savePush(`Counter-Proposal Sent — ${npdId}`, `Sourcing sent a counter date to ${vendorName} for ${npd.itemName}. Awaiting supplier response.`, npdId, "mail")
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
    // Approving a vendor updates the supplier name (first approved vendor wins)
    if (decision === "approved" && !npd.supplier) {
      const updates: Partial<typeof npd> = { supplier: vendorName }
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
    const acceptance = { docName: "receipt_confirmed", acceptedAt: new Date().toLocaleString("en-IN"), headApproved: true }
    const raw = localStorage.getItem(DELIVERY_ACCEPTANCE_KEY)
    const all: Record<string, typeof acceptance> = raw ? JSON.parse(raw) : {}
    all[npdId] = acceptance
    localStorage.setItem(DELIVERY_ACCEPTANCE_KEY, JSON.stringify(all))
    setDeliverySubmitted(true)
    setDeliveryHeadApproved(true)
    savePush(`Delivery Confirmed — ${npdId}`, `R&D User confirmed receipt for ${npd.itemName}. Advancing to RND Testing.`, npdId, "check")
  }

  const advanceToTesting = () => {
    setActiveStage(5)
    updateNPD(npdId, { stage: 5, stageName: NPD_STAGES[4] })
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
    savePush(`Part No. Assigned — ${id}`, `Part No. ${pn} assigned for ${npd.itemName}. Sourcing: coordinate sample dispatch with supplier.`, id, "package")
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

  const saveRndDecision = (decision: "approved" | "rejected_rnd" | "rejected_dqa", reason = "") => {
    setRndApprovalDecision(decision)
    setRndRejectionReason(reason)
    const all: Record<string, { decision: string; reason: string; at: string }> = JSON.parse(localStorage.getItem(RND_APPROVAL_DECISION_KEY) ?? "{}")
    all[npdId] = { decision, reason, at: new Date().toLocaleString("en-IN") }
    localStorage.setItem(RND_APPROVAL_DECISION_KEY, JSON.stringify(all))
  }

  const clearRndDecisionStorage = () => {
    const rawDecision = localStorage.getItem(RND_APPROVAL_DECISION_KEY)
    if (rawDecision) {
      const allDecision = JSON.parse(rawDecision)
      delete allDecision[npdId]
      localStorage.setItem(RND_APPROVAL_DECISION_KEY, JSON.stringify(allDecision))
    }
    setRndApprovalDecision(null)
    setRndRejectionReason("")
  }

  // Stage 7 rejection: send back to DQA (stage 6)
  const rejectDqa = (reason = "") => {
    saveRndDecision("rejected_dqa", reason)
    setActiveStage(6)
    updateNPD(npdId, { stage: 6, stageName: NPD_STAGES[5] })
    setDqaSubmitted(false)
    const rawDqa = localStorage.getItem(DQA_TESTS_KEY)
    if (rawDqa) {
      const allDqa = JSON.parse(rawDqa)
      delete allDqa[npdId]
      localStorage.setItem(DQA_TESTS_KEY, JSON.stringify(allDqa))
    }
    clearRndDecisionStorage()
    savePush(`DQA Rejected — ${npdId}`, `R&D Head rejected DQA results for ${npd.itemName}. DQA team must re-run testing.`, npdId, "alert")
  }

  // Stage 7 rejection: send back to R&D Testing (stage 5)
  const rejectRndTesting = (reason = "") => {
    saveRndDecision("rejected_rnd", reason)
    setActiveStage(5)
    updateNPD(npdId, { stage: 5, stageName: NPD_STAGES[4] })
    setEvalSubmitted({})
    setTqrStatusState("pending")
    const rawE = localStorage.getItem(RND_EVAL_KEY)
    if (rawE) {
      const allE = JSON.parse(rawE)
      delete allE[npdId]
      localStorage.setItem(RND_EVAL_KEY, JSON.stringify(allE))
    }
    clearRndDecisionStorage()
    savePush(`R&D Testing Rejected — ${npdId}`, `R&D Head rejected R&D test results for ${npd.itemName}. R&D team must re-evaluate.`, npdId, "alert")
  }

  const demoAdvanceStage = () => {
    if (activeStage >= totalStages) return
    const next = activeStage + 1

    // ECN-specific demo advance
    if (isECN) {
      // Stage 1 no longer reachable via advance (auto-completed at creation)
      // Stage 2→3: sourcing sends RFQ → write ECN_RND_APPROVAL_KEY
      if (activeStage === 2) {
        const entry = { verdict: "approved" as const, approvedBy: currentRole, approvedAt: Date.now() }
        const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_RND_APPROVAL_KEY) ?? "{}")
        all[npdId] = entry
        localStorage.setItem(ECN_RND_APPROVAL_KEY, JSON.stringify(all))
        setEcnRndApproval(entry)
      }
      // Stage 3→4: supplier submitted (demo: write dispatch + received)
      if (activeStage === 3) {
        const entry = {
          portalSentAt: Date.now() - 3600000,
          sentBy: currentRole,
          submission: { dispatchDate: new Date().toLocaleDateString("en-IN"), docs: ["demo_docs.pdf"], submittedAt: Date.now() - 1800000 },
          received: { markedBy: currentRole, markedAt: Date.now() }
        }
        const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_SOURCING_DISPATCH_KEY) ?? "{}")
        all[npdId] = entry
        localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all))
        setEcnSourcingDispatch(entry)
        // Also write demo price estimation
        const pe = { pricePerUnit: "250", currency: "INR", submittedAt: Date.now() }
        const allPe: Record<string, typeof pe> = JSON.parse(localStorage.getItem(ECN_PRICE_ESTIMATION_KEY) ?? "{}")
        allPe[npdId] = pe
        localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(allPe))
        setEcnPriceEstimation(pe)
      }
      // Stage 4→5: auto-fill R&D test results
      if (activeStage === 4) {
        const supplier = npd.supplier
        const rawVT = localStorage.getItem(VENDOR_TESTS_KEY)
        const allVT: Record<string, Record<string, { results: Record<string, string>; status: string; submittedAt?: string }>> = rawVT ? JSON.parse(rawVT) : {}
        if (!allVT[npdId]) allVT[npdId] = {}
        allVT[npdId][supplier] = { results: { "Visual Inspection": "Pass", "Dimensional Check": "Pass", "Material Verification": "99.8%" }, status: "submitted", submittedAt: new Date().toLocaleString("en-IN") }
        localStorage.setItem(VENDOR_TESTS_KEY, JSON.stringify(allVT))
        setEcnRndTestResults({ "Visual Inspection": "Pass", "Dimensional Check": "Pass", "Material Verification": "99.8%" })
        setEcnRndTestSubmitted(true)
      }
      // Stage 5→6: auto-fill DQA results using ECN_DQA_TESTS_KEY
      if (activeStage === 5) {
        const autoDqa = Object.fromEntries(DQA_TESTS.map(t => [t.testName, { value: t.unit === "Pass/Fail" ? "Pass" : "100", status: "pass" }]))
        setEcnDqaResults(autoDqa)
        setEcnDqaSubmitted(true)
        const dqaEntry = { results: autoDqa, submittedAt: Date.now(), submittedBy: currentRole }
        const allEcnDqa: Record<string, typeof dqaEntry> = JSON.parse(localStorage.getItem(ECN_DQA_TESTS_KEY) ?? "{}")
        allEcnDqa[npdId] = dqaEntry
        localStorage.setItem(ECN_DQA_TESTS_KEY, JSON.stringify(allEcnDqa))
        setEcnDqaTestsData(dqaEntry)
      }
      // Stage 6→7: R&D Head approves combined results → write ECN_HEAD_APPROVAL_KEY
      if (activeStage === 6) {
        const entry = { verdict: "approved" as const, remarks: "Demo approval", approvedBy: currentRole, approvedAt: Date.now() }
        const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_HEAD_APPROVAL_KEY) ?? "{}")
        all[npdId] = entry
        localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all))
        setEcnHeadApproval(entry)
      }
      // Stage 7→8: R&D submits plant evaluation
      if (activeStage === 7) {
        const tests = getTestsByCategory(npd.itemCategory).length > 0 ? getTestsByCategory(npd.itemCategory) : getTestsByCategory("Others")
        const autoResults = Object.fromEntries(tests.map(t => [t.testName, t.unit === "Pass/Fail" ? "Pass" : "OK"]))
        const entry = { results: autoResults, submittedAt: Date.now(), submittedBy: currentRole }
        const allPE: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_PLANT_EVAL_KEY) ?? "{}")
        allPE[npdId] = entry
        localStorage.setItem(ECN_PLANT_EVAL_KEY, JSON.stringify(allPE))
        setEcnPlantEval(entry)
        setEcnPlantTestResults(autoResults)
      }
      setActiveStage(next)
      updateNPD(npdId, { stage: next, stageName: getStageName(next, npd.typeOfWork) })
      return
    }

    // AS-specific demo advance
    if (isAltSupplier) {
      // Stage 7→8: R&D submits plant evaluation
      if (activeStage === 7) {
        const tests = getTestsByCategory(npd.itemCategory).length > 0 ? getTestsByCategory(npd.itemCategory) : getTestsByCategory("Others")
        const autoResults = Object.fromEntries(tests.map(t => [t.testName, t.unit === "Pass/Fail" ? "Pass" : "OK"]))
        const entry = { results: autoResults, submittedAt: Date.now(), submittedBy: currentRole }
        const allPE: Record<string, typeof entry> = JSON.parse(localStorage.getItem(AS_PLANT_EVAL_KEY) ?? "{}")
        allPE[npdId] = entry
        localStorage.setItem(AS_PLANT_EVAL_KEY, JSON.stringify(allPE))
        setAsPlantEval(entry)
        setAsPlantTestResults(autoResults)
      }
      setActiveStage(next)
      updateNPD(npdId, { stage: next, stageName: getStageName(next, npd.typeOfWork) })
      return
    }

    // Stage 2→3: auto-approve first vendor if none locked yet
    if (activeStage === 2 && (!npd.supplier || npd.supplier === "Pending Assignment")) {
      const firstVendor = getVendors(npd.itemCategory, allVendors)[0]?.company_name ?? sentVendors[0]
      if (firstVendor) {
        setVendorApproval(firstVendor, "approved") // internally advances to stage 3
        return
      }
    }
    // Stage 3→4: mark dispatch done
    if (activeStage === 3) setDefenceAdvanced(true)
    // Stage 4→5: mark samples received and advance to testing
    if (activeStage === 4) {
      setDeliverySubmitted(true)
      setSamplesNotReceived(false)
      // advanceToTesting handles setActiveStage(5) + updateNPD itself, so return early
      setActiveStage(5)
      updateNPD(npdId, { stage: 5, stageName: NPD_STAGES[4] })
      return
    }
    // Stage 5→6: auto-complete R&D eval so DQA stage opens cleanly
    if (activeStage === 5) {
      const allEval: Record<string, boolean> = {}
      sentVendors.forEach(v => { allEval[v] = true })
      setEvalSubmitted(allEval)
    }
    // Stage 6→7: auto-complete DQA results
    if (activeStage === 6) {
      const autoDqa = Object.fromEntries(DQA_TESTS.map(t => [t.testName, { value: t.unit === "Pass/Fail" ? "Pass" : "100", status: "pass" }]))
      setDqaResults(autoDqa)
      setDqaSubmitted(true)
      const all: Record<string, { results: typeof autoDqa; submittedAt: string }> = JSON.parse(localStorage.getItem(DQA_TESTS_KEY) ?? "{}")
      all[npdId] = { results: autoDqa, submittedAt: new Date().toLocaleString("en-IN") }
      localStorage.setItem(DQA_TESTS_KEY, JSON.stringify(all))
    }
    // Stage 7→8: auto-assign part number + TQR (skip for Alternative Supplier)
    if (activeStage === 7 && !isAltSupplier) {
      autoAssignPartNumber(npdId)
      setTqrStatus("fully_approved")
    }
    // Stage 8→9: auto-fill NCD PP pricing + supplier response + plant acceptance
    if (activeStage === 8) {
      const pp = { ppPrice: "275", currency: "INR", moq: "500", leadTime: "30", submittedBy: currentRole, submittedAt: Date.now() }
      const allPP: Record<string, typeof pp> = JSON.parse(localStorage.getItem(NCD_PP_PRICING_KEY) ?? "{}")
      allPP[npdId] = pp
      localStorage.setItem(NCD_PP_PRICING_KEY, JSON.stringify(allPP))
      setNcdPpPricing(pp)
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

    // ECN-specific revert
    if (isECN) {
      if (activeStage === 2) {
        setEcnRndApproval(null)
        const rawRnd = localStorage.getItem(ECN_RND_APPROVAL_KEY)
        if (rawRnd) { const all = JSON.parse(rawRnd); delete all[npdId]; localStorage.setItem(ECN_RND_APPROVAL_KEY, JSON.stringify(all)) }
      }
      if (activeStage === 3) {
        setEcnSourcingDispatch(null)
        setEcnPriceEstimation(null)
        const rawSD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
        if (rawSD) { const all = JSON.parse(rawSD); delete all[npdId]; localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all)) }
        const rawPE = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
        if (rawPE) { const all = JSON.parse(rawPE); delete all[npdId]; localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(all)) }
      }
      if (activeStage === 4) {
        setEcnRndTestResults({}); setEcnRndTestSubmitted(false)
        const rawVT = localStorage.getItem(VENDOR_TESTS_KEY)
        if (rawVT) { const all = JSON.parse(rawVT); if (all[npdId]) { delete all[npdId][npd.supplier]; localStorage.setItem(VENDOR_TESTS_KEY, JSON.stringify(all)) } }
        // Clear dispatch submission so auto-advance doesn't immediately re-fire at stage 3
        const rawSD4 = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
        if (rawSD4) { const all = JSON.parse(rawSD4); delete all[npdId]; localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all)) }
        setEcnSourcingDispatch(null)
        const rawPE4 = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
        if (rawPE4) { const all = JSON.parse(rawPE4); delete all[npdId]; localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(all)) }
        setEcnPriceEstimation(null)
      }
      if (activeStage === 5) {
        setEcnDqaResults({}); setEcnDqaSubmitted(false); setEcnDqaTestsData(null)
        const rawEcnDqa = localStorage.getItem(ECN_DQA_TESTS_KEY)
        if (rawEcnDqa) { const all = JSON.parse(rawEcnDqa); delete all[npdId]; localStorage.setItem(ECN_DQA_TESTS_KEY, JSON.stringify(all)) }
      }
      if (activeStage === 6) {
        setEcnHeadApproval(null); setEcnHeadRemarks("")
        const rawHA = localStorage.getItem(ECN_HEAD_APPROVAL_KEY)
        if (rawHA) { const all = JSON.parse(rawHA); delete all[npdId]; localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all)) }
      }
      if (activeStage === 8) {
        setEcnPlantEval(null); setEcnPlantTestResults({})
        const rawPE = localStorage.getItem(ECN_PLANT_EVAL_KEY)
        if (rawPE) { const all = JSON.parse(rawPE); delete all[npdId]; localStorage.setItem(ECN_PLANT_EVAL_KEY, JSON.stringify(all)) }
      }
      // Clear negotiation key when rolling back from stage 2 or beyond
      if (activeStage >= 2) {
        const rawNeg = localStorage.getItem(ECN_NEGOTIATION_KEY)
        if (rawNeg) { const all = JSON.parse(rawNeg); delete all[npdId]; localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all)) }
        setEcnNegotiation(null)
      }
      setActiveStage(prev)
      updateNPD(npdId, { stage: prev, stageName: getStageName(prev, npd.typeOfWork) })
      return
    }

    // AS-specific revert (stages 1-8, shares ECN keys for stages 3-6)
    if (isAltSupplier) {
      if (activeStage === 2) {
        setAsRndApproval(null); setAsRndRemarks("")
        const rawRnd = localStorage.getItem(AS_RND_APPROVAL_KEY)
        if (rawRnd) { const all = JSON.parse(rawRnd); delete all[npdId]; localStorage.setItem(AS_RND_APPROVAL_KEY, JSON.stringify(all)) }
      }
      if (activeStage === 3) {
        setEcnSourcingDispatch(null)
        const rawSD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
        if (rawSD) { const all = JSON.parse(rawSD); delete all[npdId]; localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all)) }
        setEcnNegotiation(null)
        const rawNeg = localStorage.getItem(ECN_NEGOTIATION_KEY)
        if (rawNeg) { const all = JSON.parse(rawNeg); delete all[npdId]; localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all)) }
        setEcnInitialQuote(null)
        const rawIQ = localStorage.getItem(ECN_INITIAL_QUOTE_KEY)
        if (rawIQ) { const all = JSON.parse(rawIQ); delete all[npdId]; localStorage.setItem(ECN_INITIAL_QUOTE_KEY, JSON.stringify(all)) }
      }
      if (activeStage === 4) {
        setEcnRndTestResults({}); setEcnRndTestSubmitted(false)
        const rawVT = localStorage.getItem(VENDOR_TESTS_KEY)
        if (rawVT) { const all = JSON.parse(rawVT); if (all[npdId]) { delete all[npdId][npd.supplier]; localStorage.setItem(VENDOR_TESTS_KEY, JSON.stringify(all)) } }
        setEcnSourcingDispatch(null)
        const rawSD4 = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
        if (rawSD4) { const all = JSON.parse(rawSD4); delete all[npdId]; localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all)) }
        setEcnNegotiation(null)
        const rawNeg4 = localStorage.getItem(ECN_NEGOTIATION_KEY)
        if (rawNeg4) { const all = JSON.parse(rawNeg4); delete all[npdId]; localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all)) }
        setEcnInitialQuote(null)
        const rawIQ4 = localStorage.getItem(ECN_INITIAL_QUOTE_KEY)
        if (rawIQ4) { const all = JSON.parse(rawIQ4); delete all[npdId]; localStorage.setItem(ECN_INITIAL_QUOTE_KEY, JSON.stringify(all)) }
        setEcnPriceEstimation(null)
        const rawPE = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
        if (rawPE) { const all = JSON.parse(rawPE); delete all[npdId]; localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(all)) }
      }
      if (activeStage === 5) {
        setEcnDqaResults({}); setEcnDqaSubmitted(false); setEcnDqaTestsData(null)
        const rawDqa = localStorage.getItem(ECN_DQA_TESTS_KEY)
        if (rawDqa) { const all = JSON.parse(rawDqa); delete all[npdId]; localStorage.setItem(ECN_DQA_TESTS_KEY, JSON.stringify(all)) }
      }
      if (activeStage === 6) {
        setEcnHeadApproval(null); setEcnHeadRemarks("")
        const rawHA = localStorage.getItem(ECN_HEAD_APPROVAL_KEY)
        if (rawHA) { const all = JSON.parse(rawHA); delete all[npdId]; localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all)) }
      }
      if (activeStage === 7) {
        setAsPlantEval(null); setAsPlantTestResults({})
        const rawPE = localStorage.getItem(AS_PLANT_EVAL_KEY)
        if (rawPE) { const all = JSON.parse(rawPE); delete all[npdId]; localStorage.setItem(AS_PLANT_EVAL_KEY, JSON.stringify(all)) }
      }
      setActiveStage(prev)
      updateNPD(npdId, { stage: prev, stageName: getStageName(prev, npd.typeOfWork) })
      return
    }

    // Reset state for the stage we're leaving so it's fully interactive when revisited
    if (activeStage === 2) {
      setEnquiryDispatched(false)
      setSelectedVendors(new Set())
      setNdaSent(false)
      setNdaStatuses({})
      const rawN = localStorage.getItem(NDA_STATUS_KEY)
      if (rawN) {
        const allN = JSON.parse(rawN)
        delete allN[npdId]
        localStorage.setItem(NDA_STATUS_KEY, JSON.stringify(allN))
      }
    }
    if (activeStage === 3) {
      // Clear quote approvals so stage 3 is fully open
      setQuoteApprovals({})
      localStorage.removeItem(VENDOR_QUOTE_APPROVALS_KEY)
    }
    if (activeStage === 4) {
      setDefenceAdvanced(false)
    }
    if (activeStage === 5) {
      // Reset delivery acceptance so stage 4 is open
      setDeliveryDoc("")
      setDeliverySubmitted(false)
      setDeliveryHeadApproved(false)
      setSamplesNotReceived(false)
      const rawA = localStorage.getItem(DELIVERY_ACCEPTANCE_KEY)
      if (rawA) {
        const allA = JSON.parse(rawA)
        delete allA[npdId]
        localStorage.setItem(DELIVERY_ACCEPTANCE_KEY, JSON.stringify(allA))
      }
    }
    if (activeStage === 6) {
      // Reset DQA results so stage 6 is open
      setDqaResults({})
      setDqaSubmitted(false)
      const rawDqa = localStorage.getItem(DQA_TESTS_KEY)
      if (rawDqa) {
        const allDqa = JSON.parse(rawDqa)
        delete allDqa[npdId]
        localStorage.setItem(DQA_TESTS_KEY, JSON.stringify(allDqa))
      }
    }
    if (activeStage === 7) {
      // Reset evaluation so stage 5 is open
      setEvalSubmitted({})
      setTqrStatusState("pending")
      setRejectReason("")
      setTestResults({})
      setEvalSupportingDocs([])
      setEvalStartedAt(null)
      const rawT = localStorage.getItem(TQR_STATUS_KEY)
      if (rawT) {
        const allT = JSON.parse(rawT)
        delete allT[npdId]
        localStorage.setItem(TQR_STATUS_KEY, JSON.stringify(allT))
      }
      const rawE = localStorage.getItem(RND_EVAL_KEY)
      if (rawE) {
        const allE = JSON.parse(rawE)
        delete allE[npdId]
        localStorage.setItem(RND_EVAL_KEY, JSON.stringify(allE))
      }
    }
    if (activeStage === 8) {
      setNcdPpPricing(null); setNcdPpPrice(""); setNcdPpMoq(""); setNcdPpLeadTime("")
      const rawNcdPP = localStorage.getItem(NCD_PP_PRICING_KEY)
      if (rawNcdPP) { const all = JSON.parse(rawNcdPP); delete all[npdId]; localStorage.setItem(NCD_PP_PRICING_KEY, JSON.stringify(all)) }
    }
    if (activeStage === 9) {
      setPlantVerdict(null); setPlantDeliveryAccepted(false); setPlantDeliveryDoc(""); setPlantSupplierSubmitted(false); setVerdictSelection(null)
      const rawAcc = localStorage.getItem(PLANT_ACCEPTANCE_KEY)
      if (rawAcc) { const all = JSON.parse(rawAcc); delete all[npdId]; localStorage.setItem(PLANT_ACCEPTANCE_KEY, JSON.stringify(all)) }
      const rawSupp = localStorage.getItem(PLANT_SUPPLIER_RESP_KEY)
      if (rawSupp) { const all = JSON.parse(rawSupp); delete all[npdId]; localStorage.setItem(PLANT_SUPPLIER_RESP_KEY, JSON.stringify(all)) }
    }

    setActiveStage(prev)
    updateNPD(npdId, { stage: prev, stageName: getStageName(prev, npd.typeOfWork) })
  }

  const catalogVendors = getVendors(npd.itemCategory, allVendors)
  const vendors = [
    ...catalogVendors.map(v => ({
      company_name: v.company_name,
      contact_person_name: v.contact_person_name,
      email: v.email,
      phone_number: v.phone_number,
      isRequested: false,
    })),
    ...requestedVendors.map(rv => ({
      company_name: rv.name,
      contact_person_name: rv.contact,
      email: rv.email,
      phone_number: rv.phone,
      isRequested: true,
    })),
  ]

  const handleTatExtend = () => {
    const days = parseInt(tatExtendDays)
    if (!days || days <= 0) return
    const newRemaining = (npd.tatDaysRemaining ?? 0) + days
    const newTotal     = (npd.totalTat ?? 0) + days
    const newHealth: NPDRecord["tatHealth"] =
      newRemaining < 0 ? "black" :
      newRemaining === 0 ? "red" :
      newRemaining <= 3  ? "amber" : "green"
    updateNPD(npdId, { tatDaysRemaining: newRemaining, totalTat: newTotal, tatHealth: newHealth })
    const reasonSuffix = tatExtendReason ? ` Reason: ${tatExtendReason}` : ""
    const pushMsg = `TAT for ${npd.itemName} (${npdId}) extended by ${days} day${days > 1 ? "s" : ""} by R&D. New deadline: ${newTotal}d total · ${newRemaining}d remaining.${reasonSuffix}`
    // Notify SPOC, R&D Head, and Sourcing Head
    savePush(`TAT Extended — ${npdId}`, `[${npd.spoc}] ${pushMsg}`, npdId, "alert")
    savePush(`TAT Extended — ${npdId}`, `[R&D Head] ${pushMsg}`, npdId, "alert")
    savePush(`TAT Extended — ${npdId}`, `[Sourcing Head] ${pushMsg}`, npdId, "alert")
    setTatExtended(true)
    setTatExtendedByDays(days)
    setTatExtendOpen(false)
    setTatExtendDays("")
    setTatExtendReason("")
  }

  const handleTatExtensionRequest = () => {
    const days = parseInt(sourcingTatDays)
    if (!days || days <= 0) return
    const now = new Date().toLocaleString("en-IN")
    const raw = localStorage.getItem(TAT_EXTENSION_REQ_KEY)
    const all: Record<string, { days: number; reason: string; requestedAt: string; decision?: "approved" | "rejected"; decidedAt?: string }> = raw ? JSON.parse(raw) : {}
    all[npdId] = { days, reason: sourcingTatReason, requestedAt: now }
    localStorage.setItem(TAT_EXTENSION_REQ_KEY, JSON.stringify(all))
    setTatExtReqPending(true)
    setTatExtReqDays(days)
    setTatExtReqReason(sourcingTatReason)
    setTatExtReqAt(now)
    setTatExtRndDecision(null)
    setSourcingTatExtendOpen(false)
    setSourcingTatDays("")
    setSourcingTatReason("")
    savePush(`TAT Extension Requested — ${npdId}`, `[R&D] Sourcing requests +${days}d TAT extension for ${npd.itemName}. Reason: ${sourcingTatReason || "—"}. Please approve or reject.`, npdId, "alert")
  }

  const handleTatExtRndDecide = (decision: "approved" | "rejected") => {
    const now = new Date().toLocaleString("en-IN")
    const raw = localStorage.getItem(TAT_EXTENSION_REQ_KEY)
    const all: Record<string, { days: number; reason: string; requestedAt: string; decision?: "approved" | "rejected"; decidedAt?: string }> = raw ? JSON.parse(raw) : {}
    if (all[npdId]) {
      all[npdId] = { ...all[npdId], decision, decidedAt: now }
      localStorage.setItem(TAT_EXTENSION_REQ_KEY, JSON.stringify(all))
    }
    setTatExtRndDecision(decision)
    setTatExtRndAt(now)
    setTatExtReqPending(false)
    if (decision === "approved") {
      const days = tatExtReqDays
      const newRemaining = (npd.tatDaysRemaining ?? 0) + days
      const newTotal     = (npd.totalTat ?? 0) + days
      const newHealth: NPDRecord["tatHealth"] =
        newRemaining < 0 ? "black" : newRemaining === 0 ? "red" : newRemaining <= 3 ? "amber" : "green"
      updateNPD(npdId, { tatDaysRemaining: newRemaining, totalTat: newTotal, tatHealth: newHealth })
      savePush(`TAT Extension Approved — ${npdId}`, `[Sourcing] R&D approved +${days}d TAT extension for ${npd.itemName}. You may now sign off and assign a vendor.`, npdId, "check")
    } else {
      savePush(`TAT Extension Rejected — ${npdId}`, `[Sourcing] R&D rejected the TAT extension request for ${npd.itemName}. You may sign off with the original TAT.`, npdId, "alert")
    }
  }

  const handleSourcingApprove = () => {
    const now = new Date().toLocaleString("en-IN")
    const approver = currentRole
    // Optionally extend TAT at approval time
    if (sourcingTatDays && parseInt(sourcingTatDays) > 0) {
      const days = parseInt(sourcingTatDays)
      const newRemaining = (npd.tatDaysRemaining ?? 0) + days
      const newTotal     = (npd.totalTat ?? 0) + days
      const newHealth: NPDRecord["tatHealth"] =
        newRemaining < 0 ? "black" : newRemaining === 0 ? "red" : newRemaining <= 3 ? "amber" : "green"
      updateNPD(npdId, { tatDaysRemaining: newRemaining, totalTat: newTotal, tatHealth: newHealth })
      savePush(`TAT Extended — ${npdId}`, `[Sourcing] TAT extended by ${days}d at approval. Reason: ${sourcingTatReason || "sourcing review"}`, npdId, "alert")
    }
    const record = { approved: true, approvedBy: approver, approvedAt: now, note: sourcingApprovalNote }
    const raw = localStorage.getItem(SOURCING_APPROVAL_KEY)
    const all: Record<string, typeof record> = raw ? JSON.parse(raw) : {}
    all[npdId] = record
    localStorage.setItem(SOURCING_APPROVAL_KEY, JSON.stringify(all))
    setSourcingApproved(true)
    setSourcingApprovedBy(approver)
    setSourcingApprovedAt(now)
    setSourcingTatExtendOpen(false)
    savePush(`Sourcing Approved — ${npdId}`, `[${npd.spoc}] ${moduleLabel(npd.typeOfWork)} ${npdId} (${npd.itemName}) approved by sourcing. Vendor assignment unlocked.`, npdId, "check")
  }

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

  const isDqaRole = currentRole === "dqa_engineer" || currentRole === "dqa_lead"
  if (isAltSupplier && !isRnd && !isDqaRole && npd.raisedBy !== currentRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 text-center">
        <div className="text-slate-400 text-5xl">🔒</div>
        <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-sm">This Alternative Supplier request is only visible to the requester and R&D team members.</p>
      </div>
    )
  }

  // ── NPD Bundle overview ───────────────────────────────────────────────────
  if (npd.isBundle) {
    const children = getBundleChildren(npd.id, npds)
    const doneCount = children.filter(c => c.stage >= 8).length
    const allDone = children.length > 0 && doneCount === children.length
    const TAT_COLOR: Record<string, string> = { green: "#10b981", amber: "#f59e0b", red: "#ef4444", black: "#dc2626" }
    const isSpoc = SPOC_NAMES.includes(currentRole)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [bundleDownloading, setBundleDownloading] = useState(false)

    return (
      <div className="space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-300">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full font-mono">{npd.id}</span>
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  <Package className="w-3 h-3" /> NPD Bundle
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{npd.itemName}</h1>
              <p className="text-slate-500 text-sm">{npd.productLine} · Raised by {npd.raisedBy ?? "—"}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress</p>
                <p className="text-2xl font-bold text-slate-800">{doneCount}<span className="text-slate-400 text-base">/{children.length}</span></p>
                <p className="text-[11px] text-slate-400">sub-requests complete</p>
              </div>
              <div className="w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={allDone ? "#10b981" : "#2563eb"} strokeWidth="3.2"
                    strokeDasharray={`${children.length ? (doneCount / children.length) * 100 : 0} 100`}
                    strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {allDone && (
            <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">All sub-requests complete — NPD closed.</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <Link href={`/report/${npd.id}`}>
              <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5">
                <FileText className="w-3.5 h-3.5" /> View Report
              </Button>
            </Link>
            <Button
              size="sm"
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
              disabled={bundleDownloading || children.length === 0}
              onClick={() => {
                setBundleDownloading(true)
                downloadMISReport([npd], `${reportPrefix([npd])}_Bundle_${npd.id}.xlsx`, npds)
                  .catch(console.error)
                  .finally(() => setBundleDownloading(false))
              }}
            >
              <Download className="w-3.5 h-3.5" />
              {bundleDownloading ? "Generating…" : `Download .xlsx (${children.length} sheet${children.length !== 1 ? "s" : ""})`}
            </Button>
          </div>
        </div>

        {/* Sub-request grid */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">Sub-Requests</span>
            <span className="text-[11px] text-slate-400">{children.length} NCD items</span>
          </div>
          {children.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400 italic">No sub-requests found.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {children.map(child => {
                const isDone = child.stage >= 8
                const isOwned = child.spoc === currentRole
                const dimmed = isSpoc && !isOwned
                return (
                  <div key={child.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${dimmed ? "opacity-40" : ""}`}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TAT_COLOR[child.tatHealth] ?? "#cbd5e1" }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-bold text-blue-700">{child.id}</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{child.bundleItemName ?? child.itemName}</p>
                    </div>
                    <div className="hidden sm:block w-36 shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Commodity</p>
                      <p className="text-xs text-slate-600 truncate">{child.itemCategory || "—"}</p>
                    </div>
                    <div className="hidden md:block w-32 shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">SPOC</p>
                      <p className="text-xs text-slate-600 truncate">{child.spoc}</p>
                    </div>
                    <div className="w-36 shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Stage</p>
                      <p className="text-xs text-slate-600 truncate">{getStageName(child.stage, child.typeOfWork)}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {isDone && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                      )}
                      {isDone ? (
                        <Link href={`/npd/${child.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full hover:bg-slate-100 transition-colors">
                          Open →
                        </Link>
                      ) : dimmed ? (
                        <span className="text-[11px] text-slate-300 italic px-3">—</span>
                      ) : (
                        <Link href={`/npd/${child.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors">
                          Open →
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-300">

      {/* Bundle back-link for child records */}
      {npd.parentId && (
        <Link href={`/npd/${npd.parentId}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 hover:text-blue-900 transition-colors">
          <Package className="w-3.5 h-3.5" />
          ← Back to NPD Bundle {npd.parentId}
        </Link>
      )}

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
          {/* Right column: 2×2 info chips — fixed size so grid never shifts */}
          <div className="grid grid-cols-2 gap-3 shrink-0 overflow-visible">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned SPOC</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{npd.spoc}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Locked Supplier</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-tight line-clamp-2">
                {npd.supplier && npd.supplier !== "Pending Assignment"
                  ? npd.supplier
                  : <span className="text-slate-400 italic font-normal text-xs">Pending Assignment</span>}
              </p>
            </div>
            {/* TAT chip — outer shell is overflow-visible for the popup; inner layer clips content */}
            <div ref={tatExtendRef} className="relative w-[160px] h-[90px] overflow-visible">
              {/* inner: styled chip that clips its own content */}
              <div className={`absolute inset-0 rounded-lg border px-4 py-2.5 overflow-hidden ${
                npd.tatHealth === "black" ? "bg-red-50 border-red-200"
                : npd.tatHealth === "red"   ? "bg-red-50 border-red-200"
                : npd.tatHealth === "amber" ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
              }`}>
                <div className="flex items-start justify-between gap-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TAT Health</p>
                  {tatExtended && (
                    <span className="inline-flex items-center gap-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      +{tatExtendedByDays}d
                    </span>
                  )}
                </div>
                <p className={`text-sm font-bold mt-0.5 ${tatColor}`}>{tatLabel}</p>

                {(currentRole === "rnd_user" || currentRole === "rnd_head") && (
                  <button
                    onClick={() => setTatExtendOpen(true)}
                    className={`mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-blue-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md transition-colors ${tatExtendOpen ? "invisible" : ""}`}
                  >
                    <TimerReset className="w-3 h-3" />
                    Extend TAT
                  </button>
                )}
              </div>

              {/* popup: escapes the chip via the overflow-visible outer shell */}
              {tatExtendOpen && (currentRole === "rnd_user" || currentRole === "rnd_head") && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white border border-blue-200 rounded-xl shadow-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <TimerReset className="w-3.5 h-3.5 text-blue-600" /> Extend TAT
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={tatExtendDays}
                      onChange={e => setTatExtendDays(e.target.value)}
                      placeholder="Days"
                      className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                    <span className="text-xs text-slate-400">days added to TAT</span>
                  </div>
                  <input
                    type="text"
                    value={tatExtendReason}
                    onChange={e => setTatExtendReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  <div className="flex gap-2 pt-0.5">
                    <button
                      onClick={handleTatExtend}
                      disabled={!tatExtendDays || parseInt(tatExtendDays) <= 0}
                      className="flex-1 bg-blue-900 hover:bg-blue-800 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold px-3 py-1.5 rounded-lg"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => { setTatExtendOpen(false); setTatExtendDays(""); setTatExtendReason("") }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-relaxed">Notifies SPOC, R&D Head & Sourcing Head</p>
                </div>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Stage</p>
              <p className="text-sm font-semibold text-blue-900 mt-0.5 leading-tight line-clamp-2">
                {activeStage}. {getStageName(activeStage, npd.typeOfWork)}
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
              disabled={activeStage >= totalStages}
              onClick={demoAdvanceStage}
              className="text-xs h-7 bg-slate-800 hover:bg-slate-700 text-white"
            >
              Demo: Next Stage →
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar — segmented */}
      <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex min-w-[700px] gap-1">
          {stageProgress.map((stage) => {
            const chipBg = stage.status === "complete" ? "bg-blue-900"
              : stage.status === "current" ? "bg-blue-700 ring-2 ring-blue-400 ring-offset-1"
              : "bg-slate-100"
            const labelColor = (stage.status === "complete" || stage.status === "current")
              ? "text-blue-200" : "text-slate-400"
            const nameColor = stage.status === "complete"
              ? "text-white"
              : stage.status === "current" ? "text-white"
              : "text-slate-400"
            const displayName = stage.name
            return (
              <div key={stage.step} className={`flex-1 rounded-md px-2 py-2.5 flex flex-col gap-1 transition-all duration-300 ${chipBg}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${labelColor}`}>Step {stage.step}</span>
                <span className={`text-[11px] font-semibold leading-tight ${nameColor}`}>{displayName}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════ RND SECTION ═══════════════════ */}
      {isRnd && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {currentRole === "super_admin" && (
            <div className="flex items-center gap-2">
              <span className="bg-blue-900 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">R&amp;D Team</span>
            </div>
          )}

          {/* ═══ ECN FLOW — R&D view (all 8 stages, newest first) ═══ */}
          {isAltSupplier && (() => {
  const asCards: React.ReactNode[] = []

  // ── AS Stage 1: Sourcing Request Initiation ──────────────────────────────
  {
    const isActive = activeStage === 1
    const isDone   = activeStage > 1
    asCards.push(
      <div key="as-s1" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-amber-300 bg-amber-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-amber-600 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 1 — Sourcing Request Initiation</h4>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Submitted</Badge>}
          {isActive && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Awaiting Sourcing</Badge>}
        </div>
        {isDone && asStage1Data && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs border-b border-slate-100 pb-1">
              <span className="text-slate-400">Proposed Supplier</span>
              <span className="font-semibold text-slate-800">{asStage1Data.supplierName}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-slate-100 pb-1">
              <span className="text-slate-400">Reason</span>
              <span className="font-semibold text-slate-800 max-w-[200px] text-right">{asStage1Data.reason}</span>
            </div>
            {asStage1Data.changeObjective && (
              <div className="flex justify-between text-xs border-b border-slate-100 pb-1">
                <span className="text-slate-400">Objective</span>
                <span className="font-semibold text-slate-800">{asStage1Data.changeObjective}</span>
              </div>
            )}
            {asStage1Data.docsLink && (
              <div className="flex justify-between text-xs border-b border-slate-100 pb-1">
                <span className="text-slate-400">Docs Link</span>
                <span className="font-semibold text-blue-700">{asStage1Data.docsLink}</span>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">Submitted by {asStage1Data.submittedBy} · {new Date(asStage1Data.submittedAt).toLocaleString("en-IN")}</p>
          </div>
        )}
        {isActive && (
          <p className="text-xs text-slate-400 italic">Sourcing is preparing the alternate supplier request.</p>
        )}
      </div>
    )
  }

  // ── AS Stage 2: R&D Review & Approval ────────────────────────────────────
  if (activeStage >= 2) {
    const isActive = activeStage === 2
    const isDone   = activeStage > 2
    const approved = !!asRndApproval
    asCards.push(
      <div key="as-s2" className={`rounded-xl border p-4 ${isDone || approved ? "bg-slate-50 border-slate-200" : isActive ? "border-teal-300 bg-teal-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone || approved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-teal-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 2 — R&D Review &amp; Approval</h4>
          {(isDone || approved) && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Approved</Badge>}
          {isActive && !approved && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D</Badge>}
        </div>
        {asStage1Data && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 mb-3 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sourcing Request</p>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Proposed Supplier</span><span className="font-semibold text-slate-800">{asStage1Data.supplierName}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Existing Part No.</span><span className="font-semibold text-slate-800">{npd.existingPartNumber ?? "—"}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Reason</span><span className="font-semibold text-slate-800 max-w-[200px] text-right">{asStage1Data.reason}</span></div>
          </div>
        )}
        {isActive && !approved && isRnd && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 space-y-3">
            <p className="text-xs font-semibold text-teal-800">Review &amp; Approve</p>
            <textarea
              rows={2}
              placeholder="Remarks (optional)…"
              value={asRndRemarks}
              onChange={e => setAsRndRemarks(e.target.value)}
              className="w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-400"
            />
            <button
              onClick={() => {
                const entry = { approvedBy: currentRole, approvedAt: Date.now(), note: asRndRemarks || undefined }
                const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(AS_RND_APPROVAL_KEY) ?? "{}")
                all[npdId] = entry
                localStorage.setItem(AS_RND_APPROVAL_KEY, JSON.stringify(all))
                setAsRndApproval(entry)
                updateNPD(npdId, { stage: 3, stageName: getStageName(3, npd.typeOfWork) })
                setActiveStage(3)
              }}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5"
            ><CheckCircle className="w-3.5 h-3.5" />Approve &amp; Proceed</button>
          </div>
        )}
        {(isDone || approved) && asRndApproval && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center gap-2 mt-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-800">Approved by {asRndApproval.approvedBy}</p>
              {asRndApproval.note && <p className="text-[11px] text-slate-600 mt-0.5">"{asRndApproval.note}"</p>}
              <p className="text-[10px] text-slate-400">{new Date(asRndApproval.approvedAt).toLocaleString("en-IN")}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── AS Stages 3-6: reuse ECN rendering ───────────────────────────────────
  const supplier = npd.supplier
  const vendorTestEntry = vendorTests[supplier] ?? null
  const ecnRndTestsList = getTestsByCategory(npd.itemCategory).length > 0
    ? getTestsByCategory(npd.itemCategory)
    : getTestsByCategory("Others")
  const sd = ecnSourcingDispatch
  const portalUrl = `${baseUrl}/supplier/ecn-sourcing/${npdId}`

  if (activeStage >= 3) {
    const isActive   = activeStage === 3
    const isDone     = activeStage > 3
    const asNeg      = ecnNegotiation
    const negDone    = !!asNeg?.approvedAt
    const negPending = asNeg && !negDone
    asCards.push(
      <div key="as-s3" className={`rounded-xl border p-4 space-y-3 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-indigo-300 bg-indigo-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Truck className="w-4 h-4 text-indigo-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 3 — Price Negotiation &amp; Sample Dispatch</h4>
          <span className="text-xs text-slate-500 ml-1">Supplier: <strong>{supplier}</strong></span>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
          {isActive && negPending && !sd?.submission && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Negotiating</Badge>}
          {isActive && negDone && !sd?.submission && <Badge className="bg-blue-100 text-blue-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting Dispatch</Badge>}
          {isActive && sd?.submission && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Dispatched</Badge>}
        </div>

        {/* Negotiation summary (R&D read-only) */}
        {isActive && !ecnInitialQuote && (
          <p className="text-xs text-slate-400 italic">Supplier will submit their price quote via the portal. Sourcing will then negotiate.</p>
        )}
        {isActive && ecnInitialQuote && !asNeg && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">Supplier&apos;s quoted price</span>
            <span className="text-sm font-bold text-slate-800">
              {ecnInitialQuote.currency === "INR" ? "₹" : ecnInitialQuote.currency === "USD" ? "$" : "€"}{parseFloat(ecnInitialQuote.price).toLocaleString("en-IN")} / unit
            </span>
          </div>
        )}
        {asNeg && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price Negotiation Status</p>
            {negDone && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800">Price Agreed</p>
                  <p className="text-[11px] text-emerald-700">
                    {asNeg.finalCurrency === "INR" ? "₹" : asNeg.finalCurrency === "USD" ? "$" : "€"}
                    {parseFloat(asNeg.finalPrice ?? "0").toLocaleString("en-IN")} / unit
                  </p>
                </div>
              </div>
            )}
            {negPending && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 space-y-1">
                <p className="text-xs font-semibold text-amber-800">Round {asNeg.rounds.length} in progress</p>
                {asNeg.rounds.length > 0 && (() => {
                  const lr = asNeg.rounds[asNeg.rounds.length - 1]
                  return (
                    <div className="flex gap-4 text-xs">
                      <span className="text-slate-500">Target sent: <strong className="text-slate-800">
                        {lr.currency === "INR" ? "₹" : lr.currency === "USD" ? "$" : "€"}{parseFloat(lr.targetPrice).toLocaleString("en-IN")}
                      </strong></span>
                      {lr.supplierResponse && (
                        <span className="text-slate-500">Counter: <strong className="text-slate-800">
                          {lr.supplierResponse.currency === "INR" ? "₹" : lr.supplierResponse.currency === "USD" ? "$" : "€"}{parseFloat(lr.supplierResponse.price).toLocaleString("en-IN")}
                        </strong></span>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* Dispatch details once done */}
        {sd?.submission && (
          <div className="border-t border-slate-200 pt-2 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Details</p>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Date</p>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">{sd.submission.dispatchDate ?? "—"}</p>
            </div>
            {sd.submission.docs?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sd.submission.docs.map((doc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200">
                    <FileText className="w-3 h-3 text-slate-400" />{doc}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (activeStage >= 4 && (currentRole === "rnd_user" || currentRole === "rnd_head" || currentRole === "super_admin")) {
    const isActive   = activeStage === 4
    const isDone     = activeStage > 4
    const savedTests = vendorTestEntry
    const sd4        = ecnSourcingDispatch
    const deliveryAccepted = !!sd4?.received
    asCards.push(
      <div key="as-s4" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-emerald-300 bg-emerald-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-emerald-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 4 — R&D Testing</h4>
          <span className="text-xs text-slate-500 ml-1">Supplier: <strong>{supplier}</strong></span>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Submitted</Badge>}
        </div>
        {isActive && !deliveryAccepted && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-indigo-800">Accept Delivery</p>
            <p className="text-[11px] text-indigo-600">Confirm receipt of samples from <strong>{supplier}</strong> before testing.</p>
            <div onClick={() => setEcnReceiptDoc(prev => prev ? "" : `delivery_receipt_${npdId}.pdf`)}
              className={`rounded-lg border-2 border-dashed p-3 text-center cursor-pointer transition-all ${ecnReceiptDoc ? "border-emerald-400 bg-emerald-50" : "border-indigo-300 hover:border-indigo-400"}`}>
              {ecnReceiptDoc
                ? <span className="text-xs font-medium text-emerald-700 flex items-center justify-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{ecnReceiptDoc} — click to remove</span>
                : <span className="text-xs text-indigo-500">Click to attach delivery receipt</span>}
            </div>
            <button disabled={!ecnReceiptDoc}
              onClick={() => {
                const received = { markedBy: currentRole, markedAt: Date.now(), doc: ecnReceiptDoc }
                const rawD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
                const allD = rawD ? JSON.parse(rawD) : {}
                allD[npdId] = { ...allD[npdId], received }
                localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(allD))
                setEcnSourcingDispatch(prev => prev ? { ...prev, received } : prev)
              }}
              className="w-full bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1"
            ><CheckCircle className="w-3.5 h-3.5" />Confirm Delivery Receipt</button>
          </div>
        )}
        {isActive && deliveryAccepted && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-800">Delivery accepted</p>
          </div>
        )}
        {isActive && deliveryAccepted && currentRole === "rnd_user" && !(savedTests?.status === "submitted" || ecnRndTestSubmitted) && (
          <div className="space-y-2">
            {ecnRndTestsList.map(t => (
              <div key={t.testName} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-44 shrink-0">{t.testName} ({t.unit})</span>
                <input type="text" placeholder="Result"
                  value={ecnRndTestResults[t.testName] ?? ""}
                  onChange={e => setEcnRndTestResults(prev => ({ ...prev, [t.testName]: e.target.value }))}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs" />
              </div>
            ))}
            <button
              disabled={ecnRndTestsList.some(t => !ecnRndTestResults[t.testName]?.trim())}
              onClick={() => {
                const rawVT = localStorage.getItem(VENDOR_TESTS_KEY)
                const allVT: Record<string, Record<string, { results: Record<string, string>; status: string; submittedAt?: string }>> = rawVT ? JSON.parse(rawVT) : {}
                if (!allVT[npdId]) allVT[npdId] = {}
                allVT[npdId][supplier] = { results: ecnRndTestResults, status: "submitted", submittedAt: new Date().toLocaleString("en-IN") }
                localStorage.setItem(VENDOR_TESTS_KEY, JSON.stringify(allVT))
                setVendorTests(allVT[npdId])
                setEcnRndTestSubmitted(true)
                updateNPD(npdId, { stage: 5, stageName: getStageName(5, npd.typeOfWork) })
                setActiveStage(5)
              }}
              className="mt-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg"
            >Submit R&D Test Results</button>
          </div>
        )}
        {(isDone || savedTests?.status === "submitted" || ecnRndTestSubmitted) && (
          <div className="space-y-1 mt-1">
            {Object.entries(savedTests?.results ?? ecnRndTestResults).map(([name, val]) => (
              <div key={name} className="flex justify-between text-xs border-b border-slate-100 pb-0.5">
                <span className="text-slate-500">{name}</span>
                <span className="font-semibold text-slate-800">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (activeStage >= 5) {
    const isActive = activeStage === 5
    const isDone   = activeStage > 5
    asCards.push(
      <div key="as-s5" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-cyan-300 bg-cyan-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-cyan-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 5 — DQA Testing</h4>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
          {isActive && ecnDqaSubmitted && <Badge className="bg-cyan-100 text-cyan-700 border-none text-xs ml-auto">Results Submitted</Badge>}
        </div>
        {ecnDqaSubmitted || isDone ? (
          <div className="space-y-1">
            {Object.entries(ecnDqaResults).map(([name, r]) => (
              <div key={name} className="flex justify-between text-xs border-b border-slate-100 pb-0.5">
                <span className="text-slate-500">{name}</span>
                <span className={`font-semibold ${r.status === "pass" ? "text-emerald-700" : "text-red-600"}`}>{r.value}</span>
              </div>
            ))}
            {ecnDqaTestsData && <p className="text-[10px] text-slate-400 mt-1">Submitted by {ecnDqaTestsData.submittedBy} · {new Date(ecnDqaTestsData.submittedAt).toLocaleString("en-IN")}</p>}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Awaiting DQA team to submit results.</p>
        )}
      </div>
    )
  }

  const canApprove = currentRole === "rnd_head" || currentRole === "super_admin"

  if (activeStage >= 6) {
    const isActive = activeStage === 6
    const isDone   = activeStage > 6
    const approved = ecnHeadApproval?.verdict === "approved"
    const rejected = ecnHeadApproval?.verdict === "rejected"
    asCards.push(
      <div key="as-s6" className={`rounded-xl border p-4 space-y-4 ${isDone || approved ? "bg-slate-50 border-slate-200" : isActive ? "border-violet-300 bg-violet-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2">
          {isDone || approved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-violet-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 6 — R&D Head Approval</h4>
          <div className="ml-auto flex items-center gap-1.5">
            {(isDone || approved) && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Approved</Badge>}
            {rejected && <Badge className="bg-red-100 text-red-700 border-none text-xs">Rejected</Badge>}
            {isActive && !ecnHeadApproval && canApprove && <Badge className="bg-violet-100 text-violet-700 border-none text-xs">Action Required</Badge>}
            {isActive && !ecnHeadApproval && !canApprove && <Badge className="bg-amber-100 text-amber-700 border-none text-xs">Awaiting R&D Head</Badge>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-emerald-700 px-3 py-2 flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald-300" />
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">R&D Test Results</span>
            </div>
            <div className="p-3">
              {vendorTestEntry?.results ? (
                <div className="divide-y divide-slate-100">
                  {Object.entries(vendorTestEntry.results).map(([name, val]) => (
                    <div key={name} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                      <span className="text-[11px] text-slate-500">{name}</span>
                      <span className="text-[11px] font-semibold text-slate-800 bg-slate-100 rounded px-1.5 py-0.5">{val}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">No results yet</p>}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-cyan-700 px-3 py-2 flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-cyan-300" />
              <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-wider">DQA Test Results</span>
            </div>
            <div className="p-3">
              {ecnDqaSubmitted ? (
                <div className="divide-y divide-slate-100">
                  {Object.entries(ecnDqaResults).map(([name, r]) => (
                    <div key={name} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                      <span className="text-[11px] text-slate-500">{name}</span>
                      <span className={`text-[11px] font-bold rounded px-1.5 py-0.5 ${r.status === "pass" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">No results yet</p>}
            </div>
          </div>
        </div>
        {isActive && !ecnHeadApproval && canApprove && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-3">
            <p className="text-xs font-semibold text-violet-800">Review &amp; Decision</p>
            <textarea rows={2} placeholder="Remarks (optional)…" value={ecnHeadRemarks}
              onChange={e => setEcnHeadRemarks(e.target.value)}
              className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-slate-400" />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const entry = { verdict: "approved" as const, remarks: ecnHeadRemarks || undefined, approvedBy: currentRole, approvedAt: Date.now() }
                  const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_HEAD_APPROVAL_KEY) ?? "{}")
                  all[npdId] = entry
                  localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all))
                  setEcnHeadApproval(entry)
                  updateNPD(npdId, { stage: 7, stageName: getStageName(7, npd.typeOfWork) })
                  setActiveStage(7)
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5"
              ><CheckCircle className="w-3.5 h-3.5" />Approve &amp; Proceed to PP Pricing</button>
              <button
                onClick={() => {
                  const entry = { verdict: "rejected" as const, remarks: ecnHeadRemarks || undefined, approvedBy: currentRole, approvedAt: Date.now() }
                  const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_HEAD_APPROVAL_KEY) ?? "{}")
                  all[npdId] = entry
                  localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all))
                  setEcnHeadApproval(entry)
                }}
                className="bg-white hover:bg-red-50 border border-red-300 text-red-600 text-xs font-bold px-4 py-2.5 rounded-lg"
              >Reject</button>
            </div>
          </div>
        )}
        {ecnHeadApproval && (
          <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${approved ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            {approved ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
            <div>
              <p className={`text-xs font-semibold ${approved ? "text-emerald-800" : "text-red-800"}`}>
                {approved ? "Approved" : "Rejected"} by {ecnHeadApproval.approvedBy}
              </p>
              {ecnHeadApproval.remarks && <p className="text-[11px] text-slate-600 mt-0.5">"{ecnHeadApproval.remarks}"</p>}
              <p className="text-[10px] text-slate-400 mt-0.5">{new Date(ecnHeadApproval.approvedAt).toLocaleString("en-IN")}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── AS Stage 7: Plant Evaluation & Testing (R&D view) ────────────────────
  if (activeStage >= 7) {
    const isActive = activeStage === 7
    const isDone   = activeStage > 7
    const plantTestsList = getTestsByCategory(npd.itemCategory).length > 0
      ? getTestsByCategory(npd.itemCategory)
      : getTestsByCategory("Others")
    asCards.push(
      <div key="as-s7" className={`rounded-xl border p-4 space-y-3 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-orange-300 bg-orange-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-orange-600 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 7 — Plant Evaluation &amp; Testing</h4>
          <div className="ml-auto flex items-center gap-1.5">
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
            {isActive && !asPlantEval && isRnd && <Badge className="bg-orange-100 text-orange-700 border-none text-xs">Action Required</Badge>}
            {isActive && !asPlantEval && !isRnd && <Badge className="bg-amber-100 text-amber-700 border-none text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D</Badge>}
            {isActive && asPlantEval && <Badge className="bg-blue-100 text-blue-700 border-none text-xs">Submitted</Badge>}
          </div>
        </div>

        {isActive && !asPlantEval && isRnd && (
          <div className="space-y-2">
            {plantTestsList.map(t => (
              <div key={t.testName} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-44 shrink-0">{t.testName} ({t.unit})</span>
                <input
                  type="text"
                  placeholder="Result"
                  value={asPlantTestResults[t.testName] ?? ""}
                  onChange={e => setAsPlantTestResults(prev => ({ ...prev, [t.testName]: e.target.value }))}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            ))}
            <button
              disabled={plantTestsList.some(t => !asPlantTestResults[t.testName]?.trim())}
              onClick={() => {
                const entry = { results: asPlantTestResults, submittedAt: Date.now(), submittedBy: currentRole }
                const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(AS_PLANT_EVAL_KEY) ?? "{}")
                all[npdId] = entry
                localStorage.setItem(AS_PLANT_EVAL_KEY, JSON.stringify(all))
                setAsPlantEval(entry)
                updateNPD(npdId, { stage: 8, stageName: getStageName(8, npd.typeOfWork) })
                setActiveStage(8)
              }}
              className="mt-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg"
            >Submit Plant Evaluation</button>
          </div>
        )}

        {isActive && !asPlantEval && !isRnd && (
          <p className="text-xs text-slate-400 italic">Awaiting R&D plant evaluation — R&D will run tests and submit results.</p>
        )}

        {(isDone || asPlantEval) && asPlantEval && (
          <div className="space-y-1 mt-1">
            {Object.entries(asPlantEval.results).map(([name, val]) => (
              <div key={name} className="flex justify-between text-xs border-b border-slate-100 pb-0.5">
                <span className="text-slate-500">{name}</span>
                <span className="font-semibold text-slate-800">{val}</span>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 pt-1">Submitted by {asPlantEval.submittedBy} · {new Date(asPlantEval.submittedAt).toLocaleString("en-IN")}</p>
          </div>
        )}
      </div>
    )
  }

  // ── AS Stage 8: AS Summary & Closure ─────────────────────────────────────
  if (activeStage >= 8) {
    asCards.push(
      <div key="as-s8" className="rounded-xl border border-emerald-300 bg-emerald-50/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <h4 className="font-bold text-slate-800 text-sm">Stage 8 — AS Summary &amp; Closure</h4>
          <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
          {([
            ["Item", npd.itemName],
            ["Qualified Supplier", npd.supplier],
            ["Existing Part No.", npd.existingPartNumber ?? "—"],
            ["Priority", npd.priority],
            ["Total TAT", npd.totalTat ? `${npd.totalTat} days` : "—"],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-400 text-xs">{label}</span>
              <span className="text-slate-800 font-medium text-xs text-right max-w-[160px] truncate">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold text-emerald-700">Alternative Supplier qualification complete.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {[...asCards].reverse()}
    </div>
  )
})()}

          {isECN && (() => {
  const ecnSummaryRows: [string, string][] = [
    ["Part Number",      npd.ecnPartNumber ?? "—"],
    ["Part Name",        npd.ecnPartName ?? npd.itemName],
    ["Existing Supplier", npd.supplier],
    ["Change Description", npd.ecnChangeDescription ?? "—"],
    ["Priority",         npd.priority],
    ["Total TAT",        npd.totalTat ? `${npd.totalTat} days` : "—"],
  ]
  if (npd.driveLink) ecnSummaryRows.push(["Drawing Link", npd.driveLink])
  if (npd.remarks)   ecnSummaryRows.push(["Remarks", npd.remarks])

  const supplier = npd.supplier
  const vendorTestEntry = vendorTests[supplier] ?? null
  const ecnRndTestsList = getTestsByCategory(npd.itemCategory).length > 0
    ? getTestsByCategory(npd.itemCategory)
    : getTestsByCategory("Others")

  const ecnCards: React.ReactNode[] = []

  // ── Stage 1: ECN Request Initialisation + TAT extension sub-flow ──────────
  {
    const s1Active = activeStage === 1
    const s1Done   = activeStage > 1
    ecnCards.push(
      <div key="ecn-s1" className={`rounded-xl border p-4 ${s1Done ? "bg-slate-50 border-slate-200" : s1Active ? "border-amber-300 bg-amber-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {s1Done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-amber-600 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 1 — ECN Request Initialisation</h4>
          {s1Done && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Submitted</Badge>}
          {s1Active && tatExtReqPending && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />TAT Extension Pending</Badge>}
          {s1Active && !tatExtReqPending && tatExtRndDecision && <Badge className={`text-xs ml-auto border-none ${tatExtRndDecision === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>TAT Ext {tatExtRndDecision === "approved" ? "Approved" : "Rejected"}</Badge>}
          {s1Active && !tatExtReqPending && !tatExtRndDecision && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting Sourcing</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {ecnSummaryRows.map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-400 text-xs">{label}</span>
              <span className="text-slate-800 font-medium text-xs text-right max-w-[160px] truncate">{value}</span>
            </div>
          ))}
        </div>
        {ecnStage1Data && (
          <p className="text-[10px] text-slate-400 mt-2">Submitted by {ecnStage1Data.submittedBy} · {new Date(ecnStage1Data.submittedAt).toLocaleString("en-IN")}</p>
        )}
        {/* TAT extension approval — shown to R&D when sourcing has requested one */}
        {s1Active && tatExtReqPending && isRnd && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-800">Sourcing requests <strong>+{tatExtReqDays} days</strong> TAT extension</p>
            {tatExtReqReason && <p className="text-xs text-amber-800 bg-white border border-amber-200 rounded px-2.5 py-1.5 italic">{tatExtReqReason}</p>}
            <p className="text-[10px] text-amber-600">Requested: {tatExtReqAt}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => handleTatExtRndDecide("approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Approve</button>
              <button onClick={() => handleTatExtRndDecide("rejected")} className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />Reject</button>
            </div>
          </div>
        )}
        {s1Active && !tatExtReqPending && tatExtRndDecision && (
          <div className={`mt-3 rounded-lg border p-2.5 flex items-center gap-2 ${tatExtRndDecision === "approved" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            {tatExtRndDecision === "approved" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
            <span className={`text-xs font-semibold ${tatExtRndDecision === "approved" ? "text-emerald-800" : "text-red-700"}`}>TAT extension {tatExtRndDecision} · {tatExtRndAt}</span>
          </div>
        )}
      </div>
    )
  }

  // ── Stage 2: Sourcing Review & RFQ (R&D sees read-only status) ──────────
  if (activeStage >= 2) {
    const isActive = activeStage === 2
    const isDone   = activeStage > 2
    const approved = ecnRndApproval?.verdict === "approved"
    ecnCards.push(
      <div key="ecn-s2" className={`rounded-xl border p-4 ${isDone || approved ? "bg-slate-50 border-slate-200" : isActive ? "border-teal-300 bg-teal-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-2">
          {isDone || approved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-teal-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 2 — Sourcing Review &amp; RFQ</h4>
          {(isDone || approved) && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">RFQ Sent</Badge>}
          {isActive && !approved && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting Sourcing</Badge>}
        </div>
        {isActive && !approved && (
          <p className="text-xs text-slate-400 italic">Sourcing team is reviewing this ECN request and will send an RFQ to {supplier}.</p>
        )}
        {(isDone || approved) && ecnRndApproval && (
          <p className="text-[10px] text-slate-400">RFQ sent by {ecnRndApproval.approvedBy} · {new Date(ecnRndApproval.approvedAt).toLocaleString("en-IN")}</p>
        )}
      </div>
    )
  }

  // ── Stage 3: Supplier Sample Dispatch (R&D sees portal status + can mark received) ──────────
  if (activeStage >= 3) {
    const isActive = activeStage === 3
    const isDone   = activeStage > 3
    const sd = ecnSourcingDispatch
    const portalUrl = `${baseUrl}/supplier/ecn-sourcing/${npdId}`
    ecnCards.push(
      <div key="ecn-s3" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-indigo-300 bg-indigo-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Truck className="w-4 h-4 text-indigo-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 3 — Supplier Sample Dispatch</h4>
          <span className="text-xs text-slate-500 ml-1">Supplier: <strong>{supplier}</strong></span>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Dispatched</Badge>}
          {isActive && !sd?.submission && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Awaiting Supplier</Badge>}
          {isActive && sd?.submission && <Badge className="bg-blue-100 text-blue-700 border-none text-xs ml-auto">Dispatched</Badge>}
        </div>
        {isActive && !sd && (
          <p className="text-xs text-slate-400 italic">Sourcing will send the supplier portal link to {supplier}.</p>
        )}
        {isActive && sd && !sd.submission && (
          <div className="space-y-2">
            <Badge className="bg-blue-100 text-blue-700 border-none text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Portal Link Sent</Badge>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Portal URL</p>
              <span className="text-xs font-mono text-blue-700 break-all">{portalUrl}</span>
            </div>
            <p className="text-xs text-slate-400 italic">Waiting for supplier to submit dispatch documents…</p>
          </div>
        )}
        {sd?.submission && (
          <div className="space-y-2">
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Date</p>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">{sd.submission.dispatchDate ?? "—"}</p>
            </div>
            {sd.submission.docs && sd.submission.docs.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sd.submission.docs.map((doc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200">
                    <FileText className="w-3 h-3 text-slate-400" />{doc}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Stage 4: R&D Testing ─────────────────────────────────────────────────
  if (activeStage >= 4 && (currentRole === "rnd_user" || currentRole === "rnd_head" || currentRole === "super_admin")) {
    const isActive   = activeStage === 4
    const isDone     = activeStage > 4
    const savedTests = vendorTestEntry
    const sd4        = ecnSourcingDispatch
    const deliveryAccepted = !!sd4?.received

    ecnCards.push(
      <div key="ecn-s4" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-emerald-300 bg-emerald-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-emerald-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 4 — R&D Testing</h4>
          <span className="text-xs text-slate-500 ml-1">Supplier: <strong>{supplier}</strong></span>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Submitted</Badge>}
          {isActive && deliveryAccepted && !(savedTests?.status === "submitted" || ecnRndTestSubmitted) && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Testing</Badge>}
          {isActive && (savedTests?.status === "submitted" || ecnRndTestSubmitted) && <Badge className="bg-blue-100 text-blue-700 border-none text-xs ml-auto">Results Submitted</Badge>}
        </div>

        {/* ── Step 1: Accept delivery ── */}
        {isActive && !deliveryAccepted && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600 shrink-0" />
              <p className="text-xs font-semibold text-indigo-800">Accept Delivery</p>
            </div>
            <p className="text-[11px] text-indigo-600">Confirm physical receipt of samples from <strong>{supplier}</strong> and attach a delivery receipt document before proceeding to testing.</p>
            <div
              onClick={() => setEcnReceiptDoc(prev => prev ? "" : `delivery_receipt_${npdId}.pdf`)}
              className={`rounded-lg border-2 border-dashed p-3 text-center cursor-pointer transition-all ${ecnReceiptDoc ? "border-emerald-400 bg-emerald-50" : "border-indigo-300 hover:border-indigo-400"}`}
            >
              {ecnReceiptDoc
                ? <span className="text-xs font-medium text-emerald-700 flex items-center justify-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{ecnReceiptDoc} — click to remove</span>
                : <span className="text-xs text-indigo-500">Click to attach delivery receipt</span>}
            </div>
            <button
              disabled={!ecnReceiptDoc}
              onClick={() => {
                const received = { markedBy: currentRole, markedAt: Date.now(), doc: ecnReceiptDoc }
                const rawD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
                const allD = rawD ? JSON.parse(rawD) : {}
                allD[npdId] = { ...allD[npdId], received }
                localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(allD))
                setEcnSourcingDispatch(prev => prev ? { ...prev, received } : prev)
              }}
              className="w-full bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1"
            ><CheckCircle className="w-3.5 h-3.5" />Confirm Delivery Receipt</button>
          </div>
        )}

        {/* Delivery accepted confirmation */}
        {isActive && deliveryAccepted && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-800">Delivery accepted — {new Date(sd4!.received!.markedAt).toLocaleString("en-IN")}</p>
              {sd4!.received!.doc && <p className="text-[10px] text-emerald-600">Receipt: {sd4!.received!.doc}</p>}
            </div>
          </div>
        )}

        {/* ── Step 2: Testing (only after delivery accepted) ── */}
        {isActive && deliveryAccepted && currentRole === "rnd_user" && !(savedTests?.status === "submitted" || ecnRndTestSubmitted) && (
          <div className="space-y-2">
            {ecnRndTestsList.map(t => (
              <div key={t.testName} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-44 shrink-0">{t.testName} ({t.unit})</span>
                <input
                  type="text" placeholder="Result"
                  value={ecnRndTestResults[t.testName] ?? ""}
                  onChange={e => setEcnRndTestResults(prev => ({ ...prev, [t.testName]: e.target.value }))}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
            ))}
            <button
              disabled={ecnRndTestsList.some(t => !ecnRndTestResults[t.testName]?.trim())}
              onClick={() => {
                const rawVT = localStorage.getItem(VENDOR_TESTS_KEY)
                const allVT: Record<string, Record<string, { results: Record<string, string>; status: string; submittedAt?: string }>> = rawVT ? JSON.parse(rawVT) : {}
                if (!allVT[npdId]) allVT[npdId] = {}
                allVT[npdId][supplier] = { results: ecnRndTestResults, status: "submitted", submittedAt: new Date().toLocaleString("en-IN") }
                localStorage.setItem(VENDOR_TESTS_KEY, JSON.stringify(allVT))
                setVendorTests(allVT[npdId])
                setEcnRndTestSubmitted(true)
                updateNPD(npdId, { stage: 5, stageName: getStageName(5, npd.typeOfWork) })
                setActiveStage(5)
              }}
              className="mt-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg"
            >Submit R&D Test Results</button>
          </div>
        )}
        {(isDone || savedTests?.status === "submitted" || ecnRndTestSubmitted) && (
          <div className="space-y-1 mt-1">
            {Object.entries(savedTests?.results ?? ecnRndTestResults).map(([name, val]) => (
              <div key={name} className="flex justify-between text-xs border-b border-slate-100 pb-0.5">
                <span className="text-slate-500">{name}</span>
                <span className="font-semibold text-slate-800">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Stage 5: DQA Testing (read-only status for R&D) ──────────────────────
  if (activeStage >= 5) {
    const isActive = activeStage === 5
    const isDone   = activeStage > 5
    ecnCards.push(
      <div key="ecn-s5" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-cyan-300 bg-cyan-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-cyan-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 5 — DQA Testing</h4>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
          {isActive && ecnDqaSubmitted && <Badge className="bg-cyan-100 text-cyan-700 border-none text-xs ml-auto">Results Submitted</Badge>}
        </div>
        {ecnDqaSubmitted || isDone ? (
          <div className="space-y-1">
            {Object.entries(ecnDqaResults).map(([name, r]) => (
              <div key={name} className="flex justify-between text-xs border-b border-slate-100 pb-0.5">
                <span className="text-slate-500">{name}</span>
                <span className={`font-semibold ${r.status === "pass" ? "text-emerald-700" : "text-red-600"}`}>{r.value}</span>
              </div>
            ))}
            {ecnDqaTestsData && <p className="text-[10px] text-slate-400 mt-1">Submitted by {ecnDqaTestsData.submittedBy} · {new Date(ecnDqaTestsData.submittedAt).toLocaleString("en-IN")}</p>}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Awaiting DQA team to submit results.</p>
        )}
      </div>
    )
  }

  // ── Stage 6: R&D Head Approval (combined RND + DQA view) ─────────────────
  if (activeStage >= 6) {
    const isActive   = activeStage === 6
    const isDone     = activeStage > 6
    const canApprove = currentRole === "rnd_head" || currentRole === "super_admin"
    const approved   = ecnHeadApproval?.verdict === "approved"
    const rejected   = ecnHeadApproval?.verdict === "rejected"

    ecnCards.push(
      <div key="ecn-s6" className={`rounded-xl border p-4 space-y-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-violet-300 bg-violet-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        {/* Header */}
        <div className="flex items-center gap-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-violet-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 6 — R&D Head Approval</h4>
          <div className="ml-auto flex items-center gap-1.5">
            {approved && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Approved</Badge>}
            {rejected && <Badge className="bg-red-100 text-red-700 border-none text-xs">Rejected</Badge>}
            {isActive && !ecnHeadApproval && canApprove && <Badge className="bg-violet-100 text-violet-700 border-none text-xs">Action Required</Badge>}
            {isActive && !ecnHeadApproval && !canApprove && <Badge className="bg-amber-100 text-amber-700 border-none text-xs">Awaiting R&D Head</Badge>}
          </div>
        </div>

        {/* Test results — two columns */}
        <div className="grid grid-cols-2 gap-3">
          {/* R&D Results */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-emerald-700 px-3 py-2 flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald-300" />
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">R&D Test Results</span>
            </div>
            <div className="p-3">
              {vendorTestEntry?.results ? (
                <div className="divide-y divide-slate-100">
                  {Object.entries(vendorTestEntry.results).map(([name, val]) => (
                    <div key={name} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                      <span className="text-[11px] text-slate-500">{name}</span>
                      <span className="text-[11px] font-semibold text-slate-800 bg-slate-100 rounded px-1.5 py-0.5">{val}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">No results yet</p>}
            </div>
          </div>

          {/* DQA Results */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-cyan-700 px-3 py-2 flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-cyan-300" />
              <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-wider">DQA Test Results</span>
            </div>
            <div className="p-3">
              {ecnDqaSubmitted ? (
                <div className="divide-y divide-slate-100">
                  {Object.entries(ecnDqaResults).map(([name, r]) => (
                    <div key={name} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                      <span className="text-[11px] text-slate-500">{name}</span>
                      <span className={`text-[11px] font-bold rounded px-1.5 py-0.5 ${r.status === "pass" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">No results yet</p>}
            </div>
          </div>
        </div>

        {/* Approval action */}
        {isActive && !ecnHeadApproval && canApprove && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-3">
            <p className="text-xs font-semibold text-violet-800">Review &amp; Decision</p>
            <textarea
              rows={2}
              placeholder="Remarks (optional)…"
              value={ecnHeadRemarks}
              onChange={e => setEcnHeadRemarks(e.target.value)}
              className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-slate-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const entry = { verdict: "approved" as const, remarks: ecnHeadRemarks || undefined, approvedBy: currentRole, approvedAt: Date.now() }
                  const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_HEAD_APPROVAL_KEY) ?? "{}")
                  all[npdId] = entry
                  localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all))
                  setEcnHeadApproval(entry)
                  updateNPD(npdId, { stage: 7, stageName: getStageName(7, npd.typeOfWork) })
                  setActiveStage(7)
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5"
              ><CheckCircle className="w-3.5 h-3.5" />Approve &amp; Proceed to PP Pricing</button>
              <button
                onClick={() => {
                  const entry = { verdict: "rejected" as const, remarks: ecnHeadRemarks || undefined, approvedBy: currentRole, approvedAt: Date.now() }
                  const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_HEAD_APPROVAL_KEY) ?? "{}")
                  all[npdId] = entry
                  localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all))
                  setEcnHeadApproval(entry)
                }}
                className="bg-white hover:bg-red-50 border border-red-300 text-red-600 text-xs font-bold px-4 py-2.5 rounded-lg"
              >Reject</button>
            </div>
          </div>
        )}

        {/* Outcome */}
        {ecnHeadApproval && (
          <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${approved ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            {approved
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
            <div>
              <p className={`text-xs font-semibold ${approved ? "text-emerald-800" : "text-red-800"}`}>
                {approved ? "Approved" : "Rejected"} by {ecnHeadApproval.approvedBy}
              </p>
              {ecnHeadApproval.remarks && <p className="text-[11px] text-slate-600 mt-0.5">"{ecnHeadApproval.remarks}"</p>}
              <p className="text-[10px] text-slate-400 mt-0.5">{new Date(ecnHeadApproval.approvedAt).toLocaleString("en-IN")}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Stage 7: Plant Evaluation & Testing (ECN — R&D view) ─────────────────
  if (activeStage >= 6) {
    const isActive   = activeStage === 7
    const isDone     = activeStage > 7
    const isUpcoming = activeStage === 6
    const plantTestsList = getTestsByCategory(npd.itemCategory).length > 0
      ? getTestsByCategory(npd.itemCategory)
      : getTestsByCategory("Others")
    ecnCards.push(
      <div key="ecn-s7" className={`rounded-xl border p-4 space-y-3 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-orange-300 bg-orange-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-orange-500 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 7 — Plant Evaluation &amp; Testing</h4>
          <div className="ml-auto flex items-center gap-1.5">
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
            {isUpcoming && <Badge className="bg-slate-100 text-slate-400 border-none text-xs">Upcoming</Badge>}
            {isActive && !ecnPlantEval && isRnd && <Badge className="bg-orange-100 text-orange-700 border-none text-xs">Action Required</Badge>}
            {isActive && !ecnPlantEval && !isRnd && <Badge className="bg-amber-100 text-amber-700 border-none text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D</Badge>}
            {isActive && ecnPlantEval && <Badge className="bg-blue-100 text-blue-700 border-none text-xs">Submitted</Badge>}
          </div>
        </div>

        {isActive && !ecnPlantEval && isRnd && (
          <div className="space-y-2">
            {plantTestsList.map(t => (
              <div key={t.testName} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-44 shrink-0">{t.testName} ({t.unit})</span>
                <input
                  type="text"
                  placeholder="Result"
                  value={ecnPlantTestResults[t.testName] ?? ""}
                  onChange={e => setEcnPlantTestResults(prev => ({ ...prev, [t.testName]: e.target.value }))}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            ))}
            <button
              disabled={plantTestsList.some(t => !ecnPlantTestResults[t.testName]?.trim())}
              onClick={() => {
                const entry = { results: ecnPlantTestResults, submittedAt: Date.now(), submittedBy: currentRole }
                const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_PLANT_EVAL_KEY) ?? "{}")
                all[npdId] = entry
                localStorage.setItem(ECN_PLANT_EVAL_KEY, JSON.stringify(all))
                setEcnPlantEval(entry)
                updateNPD(npdId, { stage: 8, stageName: getStageName(8, npd.typeOfWork) })
                setActiveStage(8)
              }}
              className="mt-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg"
            >Submit Plant Evaluation</button>
          </div>
        )}

        {isActive && !ecnPlantEval && !isRnd && (
          <p className="text-xs text-slate-400 italic">Awaiting R&D plant evaluation — R&D will run tests and submit results.</p>
        )}

        {(isDone || ecnPlantEval) && ecnPlantEval && (
          <div className="space-y-1 mt-1">
            {Object.entries(ecnPlantEval.results).map(([name, val]) => (
              <div key={name} className="flex justify-between text-xs border-b border-slate-100 pb-0.5">
                <span className="text-slate-500">{name}</span>
                <span className="font-semibold text-slate-800">{val}</span>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 pt-1">Submitted by {ecnPlantEval.submittedBy} · {new Date(ecnPlantEval.submittedAt).toLocaleString("en-IN")}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Stage 8: ECN Summary & Closure ────────────────────────────────────────
  if (activeStage >= 7) {
    const isUpcoming = activeStage === 7
    ecnCards.push(
      <div key="ecn-s8" className={`rounded-xl border p-4 ${isUpcoming ? "bg-slate-50 border-slate-200 opacity-50" : "border-emerald-300 bg-emerald-50/30"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isUpcoming ? <Circle className="w-4 h-4 text-slate-400 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 8 — ECN Summary &amp; Closure</h4>
          {isUpcoming
            ? <Badge className="bg-slate-100 text-slate-400 border-none text-xs ml-auto">Upcoming</Badge>
            : <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
        </div>
        {!isUpcoming && (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
              {([
                ["Part Number",      npd.ecnPartNumber ?? "—"],
                ["Part Name",        npd.ecnPartName ?? npd.itemName],
                ["Fixed Supplier",   npd.supplier],
                ["Change Desc",      npd.ecnChangeDescription ?? "—"],
                ["Total TAT",        `${npd.totalTat} days`],
                ["Priority",         npd.priority],
                ...(ecnSourcingDispatch?.submission?.dispatchDate
                  ? [["Dispatch Date", ecnSourcingDispatch.submission.dispatchDate] as [string, string]]
                  : []),
                ...(ecnPriceEstimation
                  ? [["Price / Unit", `${ecnPriceEstimation.currency === "INR" ? "₹" : ecnPriceEstimation.currency === "USD" ? "$" : "€"}${parseFloat(ecnPriceEstimation.pricePerUnit).toLocaleString("en-IN")}`] as [string, string]]
                  : []),
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400 text-xs">{label}</span>
                  <span className="text-slate-800 font-medium text-xs text-right max-w-[160px] truncate">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold text-emerald-700">ECN process complete. All stages signed off.</span>
            </div>
          </>
        )}
      </div>
    )
  }

  // Render newest stage first (descending)
  return (
    <div className="space-y-4">
      {[...ecnCards].reverse()}
    </div>
  )
})()}

          {/* ── Section 1: My Actions (NCD/NPD — NOT rendered for ECN or Alt Supplier) ─────── */}
          {!isECN && !isAltSupplier && <Card className="transition-shadow duration-200 hover:shadow-md">
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

              {/* Stage 2 — TAT Extension Request from Sourcing */}
              {activeStage === 2 && tatExtReqPending && (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start gap-2 mb-3">
                    <TimerReset className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-900">Sourcing Requesting TAT Extension</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {npd.spoc} is requesting <strong>+{tatExtReqDays} days</strong> additional TAT for <strong>{npd.itemName}</strong>.
                      </p>
                      {tatExtReqReason && (
                        <p className="text-xs text-amber-800 mt-1.5 bg-white border border-amber-200 rounded px-2.5 py-1.5 italic">{tatExtReqReason}</p>
                      )}
                      <p className="text-[10px] text-amber-600 mt-1.5">Requested: {tatExtReqAt}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleTatExtRndDecide("approved")}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white text-xs font-bold px-3 py-1.5 rounded"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve Extension
                    </button>
                    <button
                      onClick={() => handleTatExtRndDecide("rejected")}
                      className="flex items-center gap-1.5 bg-white hover:bg-red-50 border border-red-300 text-red-700 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Stage 2 — TAT extension decided (history) */}
              {activeStage === 2 && tatExtRndDecision && (
                <div className={`rounded-xl border p-3 flex items-center gap-2 ${tatExtRndDecision === "approved" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  {tatExtRndDecision === "approved"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <p className="text-xs font-semibold text-slate-700">
                    TAT extension of +{tatExtReqDays}d {tatExtRndDecision === "approved" ? "approved" : "rejected"} · {tatExtRndAt}
                  </p>
                </div>
              )}

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
                    <h4 className="font-bold text-slate-800 text-sm">Stage 4 — Design and Feasibility</h4>
                    {activeStage > 4 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Completed</Badge>}
                  </div>
                  {activeStage === 4 && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">Mark samples received per vendor. Once at least one vendor&apos;s samples are confirmed, R&amp;D evaluation can begin.</p>

                      {/* Per-vendor sample receipt */}
                      {sentVendors.map(vendor => {
                        const received = vendorSamples[vendor]
                        const dispatch = multiDispatch[vendor]
                        return (
                          <div key={vendor} className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${received ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {received ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Package className="w-4 h-4 text-slate-400 shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{vendor}</p>
                                {dispatch ? (
                                  <p className="text-[11px] text-slate-400">Dispatched {dispatch.dispatchDate}</p>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic">No dispatch record</p>
                                )}
                              </div>
                            </div>
                            {received ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">Received</span>
                            ) : (
                              <button
                                onClick={() => {
                                  const updated = { ...vendorSamples, [vendor]: true }
                                  setVendorSamples(updated)
                                  const raw = localStorage.getItem(VENDOR_SAMPLES_KEY)
                                  const all: Record<string, Record<string, boolean>> = raw ? JSON.parse(raw) : {}
                                  all[npdId] = updated
                                  localStorage.setItem(VENDOR_SAMPLES_KEY, JSON.stringify(all))
                                  if (!deliverySubmitted) {
                                    setDeliverySubmitted(true)
                                    savePush(`Sample Received — ${npdId}`, `Samples from ${vendor} marked received for ${npd.itemName}.`, npdId, "check")
                                  }
                                }}
                                className="shrink-0 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded transition-colors"
                              >
                                Mark Received
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {sentVendors.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No vendors dispatched yet.</p>
                      )}

                      {/* Proceed to testing once at least one received */}
                      {deliverySubmitted ? (
                        <div className="space-y-4">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <p className="text-sm font-semibold text-emerald-800">Sample receipt confirmed — R&amp;D evaluation has been initiated</p>
                          </div>
                          {/* Email previews */}
                          {(() => {
                            const tests = getTestsByCategory(npd.itemCategory)
                            const totalDays = getTotalTestDays(npd.itemCategory)
                            const tatDate = new Date()
                            tatDate.setDate(tatDate.getDate() + Math.ceil(totalDays))
                            const tatFormatted = tatDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                            const spocContact = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
                            const rndUser = npd.raisedBy === "rnd_head" ? DEFAULT_RND_HEAD.name : DEFAULT_RND_CONTACT.name
                            const testList = tests.map(t => `${t.testName} (${t.durationDays}d)`).join(", ") || "Standard evaluation protocol"
                            const emailBody = (toName: string) =>
                              `<p>Dear <strong>${toName}</strong>,</p><p>The samples for <em>${npd.itemName}</em> (${npdId}) have been received from <strong>${npd.supplier || "the supplier"}</strong>. The R&amp;D team has commenced evaluation and testing as per the defined protocol.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px"><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Commodity</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.supplier || "TBD"}</td></tr><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Tests Initiated</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${testList}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;color:#1e3a5f">Estimated TAT</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:#1e3a5f">${totalDays} working day${totalDays !== 1 ? "s" : ""} — Evaluation report expected by ${tatFormatted}</td></tr></table><p>The evaluation report will be shared with all stakeholders upon completion.</p><p>Regards,<br/><strong>${rndUser}</strong></p>`
                            return (
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications Sent</p>
                                <EmailCard
                                  to={DEFAULT_RND_HEAD.name}
                                  subject={`R&D Evaluation Commenced — ${npd.itemName} (${npdId})`}
                                  body={emailBody(DEFAULT_RND_HEAD.name)}
                                />
                                <EmailCard
                                  to={spocContact.name}
                                  subject={`R&D Evaluation Commenced — ${npd.itemName} (${npdId})`}
                                  body={emailBody(spocContact.name)}
                                />
                              </div>
                            )
                          })()}
                          <div className="pt-2 border-t border-slate-100">
                            <Button className="bg-blue-900 hover:bg-blue-800 active:scale-[0.98] transition-transform text-white" onClick={advanceToTesting}>
                              <CheckCircle className="w-4 h-4 mr-2" /> Proceed to R&amp;D Testing &amp; Evaluation
                            </Button>
                          </div>
                        </div>
                      ) : samplesNotReceived ? (
                        <div className="space-y-4">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-amber-800">Pending Sample Receipt</p>
                              <p className="text-xs text-amber-700 mt-0.5">The response has been recorded. The sourcing team will follow up with the supplier to expedite delivery. Please update this status once samples are received.</p>
                            </div>
                          </div>
                          {/* Email previews */}
                          {(() => {
                            const spocContact = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
                            const rndUser = npd.raisedBy === "rnd_head" ? DEFAULT_RND_HEAD.name : DEFAULT_RND_CONTACT.name
                            const makeBody = (toName: string) =>
                              `<p>Dear <strong>${toName}</strong>,</p><p>The samples for <em>${npd.itemName}</em> (${npdId}) from supplier <strong>${npd.supplier || "TBD"}</strong> have not yet been received as of today.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px"><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.supplier || "TBD"}</td></tr></table><p>Kindly follow up with the supplier to confirm dispatch status and expedite delivery at the earliest.</p><p>Regards,<br/><strong>${rndUser}</strong></p>`
                            return (
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications Sent</p>
                                <EmailCard
                                  to={spocContact.name}
                                  subject={`Samples Not Yet Received — ${npd.itemName} (${npdId})`}
                                  body={makeBody(spocContact.name)}
                                />
                                <EmailCard
                                  to={DEFAULT_RND_HEAD.name}
                                  subject={`Samples Not Yet Received — ${npd.itemName} (${npdId})`}
                                  body={makeBody(DEFAULT_RND_HEAD.name)}
                                />
                              </div>
                            )
                          })()}
                          <Button variant="outline" size="sm" className="text-slate-600" onClick={() => setSamplesNotReceived(false)}>
                            Update Receipt Status
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Please confirm receipt of samples from the supplier</p>
                            <p className="text-xs text-slate-400 mt-0.5">Confirmation of receipt will initiate R&amp;D evaluation and notify the relevant stakeholders.</p>
                          </div>
                          <div className="flex gap-3">
                            <Button
                              className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white"
                              onClick={submitDelivery}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Samples Received — Confirm Receipt
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={() => setSamplesNotReceived(true)}
                            >
                              Samples Not Yet Received
                            </Button>
                          </div>
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
                      {/* Per-vendor testing tab switcher */}
                      {sentVendors.length > 1 && (
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                          {sentVendors.map(v => {
                            const vTest = vendorTests[v]
                            const isDone = vTest?.status === "complete" || vTest?.status === "approved"
                            const isActive = (activeTestVendor || sentVendors[0]) === v
                            return (
                              <button key={v} type="button"
                                onClick={() => setActiveTestVendor(v)}
                                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md px-2 py-1.5 transition-colors truncate ${
                                  isActive ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                                }`}
                              >
                                {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                                <span className="truncate">{v.split(" ")[0]}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {/* Show active vendor name in multi-vendor mode */}
                      {sentVendors.length > 1 && (
                        <p className="text-xs font-bold text-slate-600">
                          Testing: <span className="text-emerald-700">{activeTestVendor || sentVendors[0]}</span>
                          {vendorTests[activeTestVendor || sentVendors[0]]?.status === "complete" &&
                            <span className="ml-2 text-emerald-600 font-normal">— Tests submitted</span>}
                        </p>
                      )}
                      {tqrStatus === "head_sending_back" ? (
                        (() => {
                          const rndUser = npd.raisedBy === "rnd_head" ? DEFAULT_RND_HEAD.name : DEFAULT_RND_CONTACT.name
                          return (
                            <div className="space-y-4 animate-in fade-in zoom-in-95">
                              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                                <h3 className="text-amber-800 font-bold mb-1">Send Back to R&amp;D for Re-testing</h3>
                                <p className="text-xs text-amber-600 mb-4">Provide remarks so the R&amp;D user knows what additional testing is required.</p>
                                <label className="text-sm font-medium text-slate-700">Remarks for R&amp;D <span className="text-red-500">*</span></label>
                                <textarea
                                  className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm focus:ring-amber-500 focus:border-amber-400"
                                  rows={3}
                                  placeholder="Describe what additional tests or data are needed..."
                                  value={headActionReason}
                                  onChange={e => setHeadActionReason(e.target.value)}
                                />
                                <div className="mt-4 flex justify-end gap-3">
                                  <Button variant="outline" onClick={() => setTqrStatus("approved_by_user")}>Cancel</Button>
                                  <Button
                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                    disabled={!headActionReason.trim()}
                                    onClick={() => setTqrStatus("head_sent_back")}
                                  >
                                    <Send className="w-4 h-4 mr-2" /> Confirm &amp; Notify R&amp;D
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })()
                      ) : tqrStatus === "head_sent_back" ? (
                        (() => {
                          const rndUser = npd.raisedBy === "rnd_head" ? DEFAULT_RND_HEAD.name : DEFAULT_RND_CONTACT.name
                          return (
                            <div className="space-y-4">
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <h3 className="text-sm font-bold text-amber-800">Sent Back to R&amp;D for Re-testing</h3>
                                  <p className="text-xs text-amber-600 mt-0.5">R&amp;D user has been notified to conduct additional testing.</p>
                                  {headActionReason && (
                                    <p className="text-xs text-amber-700 italic mt-2 bg-amber-100 border border-amber-200 rounded px-2 py-1.5">&ldquo;{headActionReason}&rdquo;</p>
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notification Sent</p>
                              <EmailCard
                                to={rndUser}
                                subject={`Re-testing Required — ${npd.itemName} (${npdId})`}
                                body={`<p>Dear <strong>${rndUser}</strong>,</p><p>R&amp;D Head has reviewed the evaluation for <em>${npd.itemName}</em> (${npdId}) and has sent it back for additional testing.</p>${headActionReason ? `<div style="border-left:3px solid #d97706;margin:12px 0;padding:8px 14px;background:#fffbeb;color:#78350f;font-style:italic">${headActionReason}</div>` : ""}<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px"><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.supplier}</td></tr></table><p>Please conduct the additional tests as specified and re-submit the evaluation for R&amp;D Head sign-off.</p><p>Regards,<br/><strong>${DEFAULT_RND_HEAD.name}</strong><br/><span style="color:#64748b;font-size:12px">R&amp;D Head, Amber Enterprises</span></p>`}
                              />
                            </div>
                          )
                        })()
                      ) : tqrStatus === "head_rejecting_supplier" ? (
                        (() => {
                          return (
                            <div className="space-y-4 animate-in fade-in zoom-in-95">
                              <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                                <h3 className="text-red-800 font-bold mb-1">Reject — Supplier Not Fit</h3>
                                <p className="text-xs text-red-600 mb-4">Provide the reason. Emails will be sent to supplier, R&amp;D user, and sourcing SPOC.</p>
                                <label className="text-sm font-medium text-slate-700">Reason for Rejection <span className="text-red-500">*</span></label>
                                <textarea
                                  className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm focus:ring-red-500 focus:border-red-500"
                                  rows={3}
                                  placeholder={"Describe why the supplier is not suitable for this " + moduleLabel(npd.typeOfWork) + "..."}
                                  value={headActionReason}
                                  onChange={e => setHeadActionReason(e.target.value)}
                                />
                                <div className="mt-4 flex justify-end gap-3">
                                  <Button variant="outline" onClick={() => setTqrStatus("approved_by_user")}>Cancel</Button>
                                  <Button
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    disabled={!headActionReason.trim()}
                                    onClick={() => setTqrStatus("head_rejected_supplier")}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" /> Confirm Rejection &amp; Notify All
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })()
                      ) : tqrStatus === "head_rejected_supplier" ? (
                        (() => {
                          const spocContact = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
                          const rndUser = npd.raisedBy === "rnd_head" ? DEFAULT_RND_HEAD.name : DEFAULT_RND_CONTACT.name
                          const vRec = allVendors.find(v => v.company_name === npd.supplier)
                          const supplierSpoc = vRec?.contact_person_name ?? (npd.supplier || "Supplier")
                          return (
                            <div className="space-y-4">
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                  <h3 className="text-sm font-bold text-red-800">Supplier Rejected — Not Fit for This NPD</h3>
                                  <p className="text-xs text-red-600 mt-0.5">Supplier, R&amp;D user, and sourcing SPOC have been notified.</p>
                                  {headActionReason && (
                                    <p className="text-xs text-red-700 italic mt-2 bg-red-100 border border-red-200 rounded px-2 py-1.5">&ldquo;{headActionReason}&rdquo;</p>
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications Sent</p>
                              <EmailCard
                                to={supplierSpoc}
                                subject={`Supplier Evaluation Closed — ${npd.itemName} (${npdId})`}
                                body={`<p>Dear <strong>${supplierSpoc}</strong>,</p><p>After thorough review by our R&amp;D Head, we regret to inform you that <strong>${npd.supplier}</strong> has not been found suitable for the following ${moduleLabel(npd.typeOfWork)}. The samples have failed the evaluation and the supplier will not be progressed further for this requirement.</p>${headActionReason ? `<div style="border-left:3px solid #dc2626;margin:12px 0;padding:8px 14px;background:#fff5f5;color:#7f1d1d;font-style:italic">${headActionReason}</div>` : ""}<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px"><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Commodity</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr></table><p>We appreciate your participation in the evaluation process. We may reach out for future opportunities.</p><p>Regards,<br/><strong>${DEFAULT_RND_HEAD.name}</strong><br/><span style="color:#64748b;font-size:12px">R&amp;D Head, Amber Enterprises</span></p>`}
                              />
                              <EmailCard
                                to={rndUser}
                                subject={`Evaluation Closed — Supplier Rejected: ${npd.itemName} (${npdId})`}
                                body={`<p>Dear <strong>${rndUser}</strong>,</p><p>R&amp;D Head has closed the evaluation for <em>${npd.itemName}</em> (${npdId}). <strong>${npd.supplier}</strong> has been deemed not fit for this ${moduleLabel(npd.typeOfWork)}.</p>${headActionReason ? `<div style="border-left:3px solid #dc2626;margin:12px 0;padding:8px 14px;background:#fff5f5;color:#7f1d1d;font-style:italic">${headActionReason}</div>` : ""}<p>No further action is required from your end for this evaluation round. Sourcing will be notified to explore alternative vendors.</p><p>Regards,<br/><strong>${DEFAULT_RND_HEAD.name}</strong><br/><span style="color:#64748b;font-size:12px">R&amp;D Head, Amber Enterprises</span></p>`}
                              />
                              <EmailCard
                                to={spocContact.name}
                                subject={`Supplier Not Fit — Alternative Vendor Required: ${npd.itemName} (${npdId})`}
                                body={`<p>Dear <strong>${spocContact.name}</strong>,</p><p>R&amp;D Head has reviewed the evaluation for <em>${npd.itemName}</em> (${npdId}) and has determined that <strong>${npd.supplier || "the current supplier"}</strong> is not suitable for this ${moduleLabel(npd.typeOfWork)}.</p>${headActionReason ? `<div style="border-left:3px solid #dc2626;margin:12px 0;padding:8px 14px;background:#fff5f5;color:#7f1d1d;font-style:italic">${headActionReason}</div>` : ""}<p><strong>Action Required:</strong> Please initiate alternative vendor selection and re-run the feasibility and sample evaluation process for a suitable supplier.</p><p>Regards,<br/><strong>${DEFAULT_RND_HEAD.name}</strong><br/><span style="color:#64748b;font-size:12px">R&amp;D Head, Amber Enterprises</span></p>`}
                              />
                            </div>
                          )
                        })()
                      ) : tqrStatus === "rejecting" ? (
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
                                  setTqrStatus("rejected")
                                }}
                              >
                                Confirm Rejection &amp; Notify Supplier
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : tqrStatus === "rejected" ? (
                        <div className="space-y-4">
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <h3 className="text-sm font-bold text-red-800">Sample Failed R&amp;D Tests &amp; Evaluation</h3>
                              <p className="text-xs text-red-600 mt-0.5">The supplier and sourcing team have been notified. An updated sample submission is required.</p>
                              {rejectReason && (
                                <p className="text-xs text-red-700 italic mt-2 bg-red-100 border border-red-200 rounded px-2 py-1.5">&ldquo;{rejectReason}&rdquo;</p>
                              )}
                            </div>
                          </div>
                          {/* Email previews */}
                          {(() => {
                            const spocContact = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
                            const rndUser = npd.raisedBy === "rnd_head" ? DEFAULT_RND_HEAD.name : DEFAULT_RND_CONTACT.name
                            const vRec = allVendors.find(v => v.company_name === npd.supplier)
                            const supplierSpoc = vRec?.contact_person_name ?? (npd.supplier || "Supplier")
                            return (
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications Sent</p>
                                <EmailCard
                                  to={npd.supplier ?? "Supplier"}
                                  subject={`Samples Failed Tests & Evaluation — Revised Submission Required: ${npd.itemName} (${npdId})`}
                                  body={`<p>Dear <strong>${supplierSpoc}</strong>,</p><p>After thorough evaluation, the R&amp;D team has determined that the samples submitted for <em>${npd.itemName}</em> (${npdId}) have <strong style="color:#dc2626">failed the tests and evaluation</strong> and do not meet the required specifications.</p>${rejectReason ? `<div style="border-left:3px solid #dc2626;margin:12px 0;padding:8px 14px;background:#fff5f5;color:#7f1d1d;font-style:italic">${rejectReason}</div>` : ""}<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px"><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Commodity</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr></table><p>Kindly review the evaluation remarks and provide a revised sample submission timeline at the earliest. Our sourcing team will coordinate the next steps.</p><p>Regards,<br/><strong>${rndUser}</strong></p>`}
                                />
                                <EmailCard
                                  to={spocContact.name}
                                  subject={`Samples Failed Tests & Evaluation — Action Required: ${npd.itemName} (${npdId})`}
                                  body={`<p>Dear <strong>${spocContact.name}</strong>,</p><p>The R&amp;D team has evaluated the samples submitted by <strong>${npd.supplier || "the supplier"}</strong> for <em>${npd.itemName}</em> (${npdId}). The samples have <strong style="color:#dc2626">failed the tests and evaluation</strong> and do not meet the required specifications.</p>${rejectReason ? `<div style="border-left:3px solid #dc2626;margin:12px 0;padding:8px 14px;background:#fff5f5;color:#7f1d1d;font-style:italic">${rejectReason}</div>` : ""}<p>Please follow up with the supplier to obtain a revised sample submission timeline and update the NPD record accordingly.</p><p>Regards,<br/><strong>${rndUser}</strong></p>`}
                                />
                              </div>
                            )
                          })()}
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
                            body={`<p>Dear <strong>${npd.supplier}</strong>,</p><p>We are pleased to inform you that the R&amp;D testing for the following part has been completed and approved.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Category</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Status</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#059669">✓ R&amp;D Testing Approved</td></tr></table><p>Our sourcing team will be in touch shortly with delivery location and sample quantity details. Please be ready to confirm your delivery date.</p><p style="color:#64748b;font-size:12px">Amber R&amp;D System</p>`}
                          />
                          <EmailCard
                            to={npd.spoc}
                            subject={`TQR Approved — Action Required: Set Delivery Details for ${npdId}`}
                            body={`<p>Dear <strong>${npd.spoc}</strong>,</p><p>The TQR evaluation for the following ${moduleLabel(npd.typeOfWork)} has been fully approved by the R&amp;D Head.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr></table><p><strong>Next Step:</strong> Please log in to the NPD system and fill in the delivery location and required sample quantity (Stage 7 — Sample Dispatch &amp; R&D Acceptance). The supplier delivery date request will be sent automatically once you submit.</p><p style="color:#64748b;font-size:12px">Amber R&amp;D System</p>`}
                          />
                          <PushSentBadge to={npd.supplier} />
                          <PushSentBadge to={npd.spoc} />
                        </div>
                      ) : (() => {
                        const tests = getTestsByCategory(npd.itemCategory)
                        const totalDays = getTotalTestDays(npd.itemCategory)
                        const allFilled = tests.length === 0 || tests.every(t => (testResults[t.testName] ?? "").trim() !== "")
                        const currentVendor = sentVendors.length > 1 ? (activeTestVendor || sentVendors[0]) : (sentVendors[0] || npd.supplier || "")

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
                              <div className="border-t border-current/10 px-4 py-2 flex items-center justify-end text-xs font-medium opacity-80">
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
                            {isRnd && !evalSubmitted[currentVendor] && tests.length > 0 && (
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
                                      const currentVendor = sentVendors.length > 1 ? (activeTestVendor || sentVendors[0]) : (sentVendors[0] || npd.supplier || "")
                                      setEvalSubmitted(prev => ({ ...prev, [currentVendor]: true }))
                                      // Save to per-vendor tests key
                                      if (currentVendor) {
                                        const updated = { ...vendorTests, [currentVendor]: { results: testResults, status: "complete", submittedAt: now } }
                                        setVendorTests(updated)
                                        const rawVT = localStorage.getItem(VENDOR_TESTS_KEY)
                                        const allVT: Record<string, typeof updated> = rawVT ? JSON.parse(rawVT) : {}
                                        allVT[npdId] = updated
                                        localStorage.setItem(VENDOR_TESTS_KEY, JSON.stringify(allVT))
                                      }
                                    }}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Save Evaluation Results
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Supporting documents — R&D user, before submission */}
                            {isRnd && !evalSubmitted[currentVendor] && (
                              <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <UploadCloud className="w-3.5 h-3.5" /> Supporting Documents
                                  </span>
                                  <span className="text-[10px] text-slate-400">{evalSupportingDocs.length} file{evalSupportingDocs.length !== 1 ? "s" : ""} attached</span>
                                </div>
                                <div className="p-4 space-y-3">
                                  <p className="text-xs text-slate-500">Attach test reports, calibration certificates, or any other supporting materials for this evaluation.</p>
                                  {evalSupportingDocs.length > 0 && (
                                    <ul className="space-y-1.5">
                                      {evalSupportingDocs.map((doc, i) => (
                                        <li key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                          <span className="flex items-center gap-1.5 text-xs text-slate-700">
                                            <FileText className="w-3.5 h-3.5 text-slate-400" /> {doc}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setEvalSupportingDocs(prev => prev.filter((_, j) => j !== i))}
                                            className="text-slate-400 hover:text-red-500 text-xs transition-colors"
                                          >
                                            Remove
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const name = `eval_doc_${npdId}_${Date.now()}.pdf`
                                      setEvalSupportingDocs(prev => [...prev, name])
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 transition-colors"
                                  >
                                    <UploadCloud className="w-3.5 h-3.5" /> Attach Document
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Results view (read-only after submission) */}
                            {evalSubmitted[currentVendor] && tests.length > 0 && (
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
                                  {evalSubmitted[currentVendor] ? "Evaluation complete. Approve to route to R&D Head." : "Complete all test results above before approving."}
                                </p>
                              </div>
                              {tqrStatus === "pending" ? (
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 bg-white" onClick={() => setTqrStatus("rejecting")}>
                                    <XCircle className="w-4 h-4 mr-2" /> Reject Sample
                                  </Button>
                                  <Button
                                    disabled={!sentVendors.every(v => evalSubmitted[v])}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                    onClick={() => {
                                      setTqrStatus("approved_by_user")
                                      savePush(`TQR Sign-off Required — ${npdId}`, `R&D User approved TQR for ${npd.itemName}. Awaiting your final sign-off.`, npdId, "check")
                                    }}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve (Route to R&amp;D Head)
                                  </Button>
                                </div>
                              ) : tqrStatus === "approved_by_user" && (currentRole === "rnd_head" || currentRole === "super_admin") ? (
                                <div className="space-y-3">
                                  <p className="text-emerald-700 font-bold text-sm">✓ R&amp;D User Approved. Awaiting Your Sign-off.</p>
                                  <p className="text-xs text-slate-500">Choose one of the three actions below:</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                      onClick={() => {
                                        if (!sentVendors.every(v => evalSubmitted[v])) {
                                          alert("All vendors must complete their evaluation before final approval.")
                                          return
                                        }
                                        setActiveStage(6)
                                        updateNPD(npdId, { stage: 6, stageName: NPD_STAGES[5] })
                                        savePush(`TQR Approved — ${npdId}`, `R&D Head approved TQR for ${npd.itemName}. Advancing to DQA Testing.`, npdId, "check")
                                      }}
                                      className="flex flex-col items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-4 py-4 text-center transition-all"
                                    >
                                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                      <span className="text-sm font-bold text-emerald-800">Approve</span>
                                      <span className="text-[11px] text-emerald-600 leading-tight">Notify sourcing &amp; supplier, advance NPD</span>
                                    </button>
                                    <button
                                      onClick={() => { setHeadActionReason(""); setTqrStatus("head_sending_back") }}
                                      className="flex flex-col items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 px-4 py-4 text-center transition-all"
                                    >
                                      <AlertCircle className="w-6 h-6 text-amber-600" />
                                      <span className="text-sm font-bold text-amber-800">Send Back to R&amp;D</span>
                                      <span className="text-[11px] text-amber-600 leading-tight">Insufficient testing — notify R&amp;D user to re-evaluate</span>
                                    </button>
                                    <button
                                      onClick={() => { setHeadActionReason(""); setTqrStatus("head_rejecting_supplier") }}
                                      className="flex flex-col items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 px-4 py-4 text-center transition-all"
                                    >
                                      <XCircle className="w-6 h-6 text-red-600" />
                                      <span className="text-sm font-bold text-red-800">Reject — Supplier Not Fit</span>
                                      <span className="text-[11px] text-red-600 leading-tight">Notify supplier, R&amp;D &amp; sourcing; close evaluation</span>
                                    </button>
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
                                    body={`<p>Dear <strong>${DEFAULT_RND_HEAD.name}</strong>,</p><p>The R&amp;D User has completed the TQR evaluation for the following ${moduleLabel(npd.typeOfWork)} and it is awaiting your final sign-off.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Category</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr></table>${tests.length > 0 ? `<p><strong>Test Evaluation Results:</strong></p><table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px"><thead><tr style="background:#1e3a5f;color:#fff"><th style="padding:7px 10px;text-align:left">Test</th><th style="padding:7px 10px;text-align:left">Type</th><th style="padding:7px 10px;text-align:center">Unit</th><th style="padding:7px 10px;text-align:center">Expected</th><th style="padding:7px 10px;text-align:center">Result</th></tr></thead><tbody>${evalTableRows}</tbody></table>` : ""}<p>Please log in to review and provide your final approval or rejection.</p><p style="color:#64748b;font-size:12px">Amber R&amp;D System</p>`}
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

              {/* Stage 6 — DQA Testing (visible to all roles) — NCD/NPD only */}
              {activeStage >= 6 && isNCD && (() => {
                const isDqaUser = currentRole === "dqa_engineer" || currentRole === "dqa_lead" || currentRole === "super_admin"
                const canEdit   = isDqaUser && !dqaSubmitted
                const allFilled = DQA_TESTS.every(t => {
                  const r = dqaResults[t.testName]
                  return r && r.value.trim() !== "" && r.status !== "pending"
                })
                return (
                  <div className={`rounded-xl border p-4 ${
                    activeStage > 6  ? "bg-slate-50 border-slate-200 opacity-80" :
                    activeStage === 6 ? "border-cyan-400 bg-cyan-50/30 shadow-sm" :
                    "border-slate-200 bg-slate-50 opacity-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {activeStage > 6
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-cyan-600 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-cyan-700">6</span>
                          </div>}
                      <h4 className="font-bold text-slate-800 text-sm">Stage 6 — DQA Testing</h4>
                      {dqaSubmitted && activeStage === 6 && <Badge className="bg-cyan-100 text-cyan-700 border-none text-xs ml-auto">Results Submitted</Badge>}
                      {activeStage > 6 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
                    </div>

                    {activeStage === 6 && (
                      <div className="space-y-3">

                        {/* Info banner for non-DQA viewers */}
                        {!isDqaUser && !dqaSubmitted && (
                          <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2.5">
                            <span className="text-cyan-600 text-xs">🔬</span>
                            <p className="text-xs text-cyan-800 font-medium">DQA team is currently running reliability tests. Results will appear here once submitted.</p>
                          </div>
                        )}

                        {isDqaUser && !dqaSubmitted && (
                          <p className="text-xs text-slate-500">Fill in results for each test parameter below. All tests must be completed before submission.</p>
                        )}

                        {/* Test table */}
                        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Test Parameter</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Days</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Result / Value</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Verdict</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {DQA_TESTS.map((test, idx) => {
                                const row = dqaResults[test.testName] ?? { value: "", status: "pending", remark: "" }
                                const rowWithRemark = row as { value: string; status: string; remark?: string }
                                const verdictColor = row.status === "pass" ? "bg-emerald-100 text-emerald-700" : row.status === "fail" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-400"
                                return (
                                  <tr key={test.testName} className={`hover:bg-slate-50/60 ${row.status === "fail" ? "bg-red-50/30" : ""}`}>
                                    <td className="px-3 py-2 text-slate-400 text-xs font-mono">{String(idx + 1).padStart(2, "0")}</td>
                                    <td className="px-3 py-2 font-medium text-slate-700 text-xs">{test.testName}</td>
                                    <td className="px-3 py-2 text-slate-500 text-xs">{test.unit}</td>
                                    <td className="px-3 py-2 text-slate-500 text-xs text-center">{test.durationDays}d</td>
                                    <td className="px-3 py-2">
                                      {canEdit ? (
                                        <input
                                          type="text"
                                          value={row.value}
                                          placeholder={test.unit === "Pass/Fail" ? "e.g. Pass" : `e.g. 100`}
                                          onChange={e => setDqaResults(prev => ({ ...prev, [test.testName]: { ...prev[test.testName], value: e.target.value, status: prev[test.testName]?.status ?? "pending", remark: (prev[test.testName] as {value:string;status:string;remark?:string})?.remark ?? "" } }))}
                                          className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-400"
                                        />
                                      ) : (
                                        <span className="text-xs text-slate-700 font-medium">{row.value || "—"}</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {canEdit ? (
                                        <select
                                          value={row.status}
                                          onChange={e => setDqaResults(prev => ({ ...prev, [test.testName]: { ...prev[test.testName], status: e.target.value, value: prev[test.testName]?.value ?? "", remark: (prev[test.testName] as {value:string;status:string;remark?:string})?.remark ?? "" } }))}
                                          className="text-xs border border-slate-200 rounded px-1 py-1 focus:outline-none focus:border-cyan-400 w-full"
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="pass">Pass</option>
                                          <option value="fail">Fail</option>
                                        </select>
                                      ) : (
                                        <Badge className={`text-[10px] border-none ${verdictColor}`}>
                                          {row.status === "pending" ? "Pending" : row.status === "pass" ? "Pass" : "Fail"}
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {canEdit ? (
                                        <input
                                          type="text"
                                          value={rowWithRemark.remark ?? ""}
                                          placeholder="Optional"
                                          onChange={e => setDqaResults(prev => ({ ...prev, [test.testName]: { ...prev[test.testName], remark: e.target.value, value: prev[test.testName]?.value ?? "", status: prev[test.testName]?.status ?? "pending" } }))}
                                          className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-400"
                                        />
                                      ) : (
                                        <span className="text-xs text-slate-500 italic">{rowWithRemark.remark || "—"}</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary row */}
                        {isDqaUser && (
                          <div className="flex items-center gap-4 px-1 text-xs text-slate-500">
                            <span>Total est. duration: <strong className="text-slate-700">{DQA_TESTS.reduce((s, t) => s + t.durationDays, 0)} days</strong></span>
                            <span>Completed: <strong className="text-slate-700">{Object.values(dqaResults).filter(r => r.status !== "pending" && r.value).length} / {DQA_TESTS.length}</strong></span>
                            {Object.values(dqaResults).some(r => r.status === "fail") && (
                              <span className="text-red-600 font-semibold">⚠ {Object.values(dqaResults).filter(r => r.status === "fail").length} test(s) failed</span>
                            )}
                          </div>
                        )}

                        {/* Submit — dqa_lead only */}
                        {!dqaSubmitted && currentRole === "dqa_lead" && (
                          <Button
                            size="sm"
                            className="bg-cyan-700 hover:bg-cyan-600 text-white"
                            disabled={!allFilled}
                            onClick={() => {
                              const all: Record<string, { results: typeof dqaResults; submittedAt: string }> = JSON.parse(localStorage.getItem(DQA_TESTS_KEY) ?? "{}")
                              all[npdId] = { results: dqaResults, submittedAt: new Date().toLocaleString("en-IN") }
                              localStorage.setItem(DQA_TESTS_KEY, JSON.stringify(all))
                              setDqaSubmitted(true)
                            }}
                          >
                            Submit DQA Results
                          </Button>
                        )}
                        {!dqaSubmitted && !allFilled && currentRole === "dqa_lead" && (
                          <p className="text-[11px] text-amber-600">All test results and verdicts must be filled before submission.</p>
                        )}

                        {/* Proceed banner — after submission */}
                        {dqaSubmitted && (currentRole === "dqa_lead" || currentRole === "rnd_head" || currentRole === "super_admin") && (
                          <div className="flex items-center gap-3 bg-cyan-50 border border-cyan-200 rounded-lg px-4 py-3">
                            <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                            <p className="text-sm font-semibold text-cyan-800 flex-1">DQA Testing complete. Ready for RND Approval.</p>
                            <Button
                              size="sm"
                              className="bg-cyan-700 hover:bg-cyan-600 text-white shrink-0"
                              onClick={() => {
                                setActiveStage(7)
                                updateNPD(npdId, { stage: 7, stageName: NPD_STAGES[6] })
                              }}
                            >
                              Proceed to RND Approval
                            </Button>
                          </div>
                        )}

                        {dqaSubmitted && !isDqaUser && currentRole !== "rnd_head" && (
                          <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                            <p className="text-xs text-cyan-800 font-medium">DQA results submitted. Awaiting DQA Lead to proceed to RND Approval.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeStage > 6 && (
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        All {DQA_TESTS.length} DQA tests completed and submitted.
                        {Object.values(dqaResults).some(r => r.status === "fail") && (
                          <span className="ml-2 text-amber-600 font-medium">({Object.values(dqaResults).filter(r => r.status === "fail").length} failed — noted)</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

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
                    <h4 className="font-bold text-slate-800 text-sm">Stage 7 — R&D Approval &amp; Supplier Selection</h4>
                    {activeStage > 7 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
                  </div>

                  {/* ── Test Results Split View + Verdict (stage 7, rnd_head / super_admin) ── */}
                  {activeStage === 7 && (currentRole === "rnd_head" || currentRole === "super_admin") && (() => {
                    const focusVendor = finalVendor || sentVendors[0] || ""
                    const rndTestData = vendorTests[focusVendor]
                    const rndEntries  = rndTestData ? Object.entries(rndTestData.results) : []

                    // Forge will add these to the outer scope; suppress TS until merged
                    // @ts-ignore
                    const decision: "approved" | "rejected_rnd" | "rejected_dqa" | null = typeof rndApprovalDecision !== "undefined" ? rndApprovalDecision : null
                    // @ts-ignore
                    const rejReason: string = typeof rndRejectionReason !== "undefined" ? rndRejectionReason : ""

                    return (
                      <div className="mb-5 space-y-4">

                        {/* Split view — R&D + DQA test results */}
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Test Results Review</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                          {/* Left — R&D Test Results */}
                          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                              <FlaskConical className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">R&amp;D Test Results</span>
                              {focusVendor && (
                                <span className="ml-auto text-[10px] text-slate-400 font-medium truncate max-w-[130px]">{focusVendor}</span>
                              )}
                            </div>
                            {rndEntries.length > 0 ? (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-3 py-1.5 text-left">Test</th>
                                    <th className="px-3 py-1.5 text-left">Result</th>
                                    <th className="px-3 py-1.5 text-left">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {rndEntries.map(([testName, value]) => (
                                    <tr key={testName} className="hover:bg-slate-50/60">
                                      <td className="px-3 py-2 text-[11px] font-medium text-slate-700">{testName}</td>
                                      <td className="px-3 py-2 text-[11px] font-mono text-slate-600">{value || "—"}</td>
                                      <td className="px-3 py-2">
                                        {!value
                                          ? <Badge className="bg-slate-100 text-slate-500 border-none text-[10px] font-semibold">Pending</Badge>
                                          : String(value).toLowerCase() === "fail"
                                            ? <Badge className="bg-red-100 text-red-700 border-none text-[10px] font-semibold">Fail</Badge>
                                            : <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-semibold">Pass</Badge>
                                        }
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="px-4 py-7 text-center">
                                <FlaskConical className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 font-medium">No R&amp;D test results yet</p>
                                <p className="text-[10px] text-slate-300 mt-0.5">Results appear once R&amp;D submits testing</p>
                              </div>
                            )}
                          </div>

                          {/* Right — DQA Test Results */}
                          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                              <ClipboardCheck className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">DQA Test Results</span>
                              {dqaSubmitted && (
                                <Badge className="ml-auto bg-cyan-100 text-cyan-700 border-none text-[10px]">Submitted</Badge>
                              )}
                            </div>
                            {!dqaSubmitted ? (
                              <div className="px-4 py-7 text-center">
                                <ClipboardCheck className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 font-medium">DQA testing not yet complete</p>
                                <p className="text-[10px] text-slate-300 mt-0.5">Awaiting DQA Lead submission</p>
                              </div>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-3 py-1.5 text-left">Test</th>
                                    <th className="px-3 py-1.5 text-left">Value</th>
                                    <th className="px-3 py-1.5 text-left">Verdict</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {DQA_TESTS.map(test => {
                                    const row = dqaResults[test.testName]
                                    return (
                                      <tr key={test.testName} className="hover:bg-slate-50/60">
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-700">{test.testName}</td>
                                        <td className="px-3 py-2 text-[11px] font-mono text-slate-600">{row?.value || "—"}</td>
                                        <td className="px-3 py-2">
                                          {!row || row.status === "pending"
                                            ? <Badge className="bg-slate-100 text-slate-500 border-none text-[10px] font-semibold">Pending</Badge>
                                            : row.status === "fail"
                                              ? <Badge className="bg-red-100 text-red-700 border-none text-[10px] font-semibold">Fail</Badge>
                                              : <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-semibold">Pass</Badge>
                                          }
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>

                        {/* Verdict section — three action cards */}
                        {decision === null ? (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">R&amp;D Head Verdict</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                              {/* Card 1 — Approve Both */}
                              <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/40 p-4 flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="text-sm font-bold text-emerald-800">Approve Both</span>
                                </div>
                                <p className="text-[11px] text-emerald-700 leading-relaxed flex-1">
                                  R&amp;D and DQA results both meet specification. Proceed to supplier selection.
                                </p>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                  // @ts-ignore
                                  onClick={() => saveRndDecision("approved")}
                                >
                                  Confirm Approval
                                </Button>
                              </div>

                              {/* Card 2 — Reject R&D Testing */}
                              <div className="rounded-xl border-2 border-amber-400 bg-amber-50/40 p-4 flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span className="text-sm font-bold text-amber-800">Reject R&amp;D Testing</span>
                                </div>
                                <p className="text-[11px] text-amber-700 leading-relaxed flex-1">
                                  R&amp;D results are out of spec. Stage will revert to R&amp;D Testing (Stage 5).
                                </p>
                                {!showRejectRndReason ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-amber-400 text-amber-800 hover:bg-amber-100 text-xs font-bold"
                                    onClick={() => { setShowRejectRndReason(true); setShowRejectDqaReason(false) }}
                                  >
                                    Reject R&amp;D
                                  </Button>
                                ) : (
                                  <div className="space-y-2">
                                    <textarea
                                      rows={2}
                                      placeholder="Reason for rejection…"
                                      className="w-full text-xs border border-amber-300 rounded px-2 py-1.5 bg-white text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
                                      value={rejReason}
                                      // @ts-ignore
                                      onChange={e => setRndRejectionReason(e.target.value)}
                                    />
                                    <div className="flex gap-1.5">
                                      <Button
                                        size="sm"
                                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex-1"
                                        disabled={!rejReason.trim()}
                                        // @ts-ignore
                                        onClick={() => { saveRndDecision("rejected_rnd", rejReason); setShowRejectRndReason(false) }}
                                      >
                                        Confirm
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        onClick={() => setShowRejectRndReason(false)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Card 3 — Reject DQA Testing */}
                              <div className="rounded-xl border-2 border-red-400 bg-red-50/40 p-4 flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                                  <span className="text-sm font-bold text-red-800">Reject DQA Testing</span>
                                </div>
                                <p className="text-[11px] text-red-700 leading-relaxed flex-1">
                                  DQA results are out of spec. Stage will revert to DQA Testing (Stage 6).
                                </p>
                                {!showRejectDqaReason ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-400 text-red-800 hover:bg-red-100 text-xs font-bold"
                                    onClick={() => { setShowRejectDqaReason(true); setShowRejectRndReason(false) }}
                                  >
                                    Reject DQA
                                  </Button>
                                ) : (
                                  <div className="space-y-2">
                                    <textarea
                                      rows={2}
                                      placeholder="Reason for rejection…"
                                      className="w-full text-xs border border-red-300 rounded px-2 py-1.5 bg-white text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
                                      value={rejReason}
                                      // @ts-ignore
                                      onChange={e => setRndRejectionReason(e.target.value)}
                                    />
                                    <div className="flex gap-1.5">
                                      <Button
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex-1"
                                        disabled={!rejReason.trim()}
                                        // @ts-ignore
                                        onClick={() => { saveRndDecision("rejected_dqa", rejReason); setShowRejectDqaReason(false) }}
                                      >
                                        Confirm
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        onClick={() => setShowRejectDqaReason(false)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>
                          </div>
                        ) : decision === "approved" ? (
                          <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <p className="text-sm font-semibold text-emerald-800">Both approved — Select supplier below</p>
                          </div>
                        ) : decision === "rejected_rnd" ? (
                          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-amber-800">R&amp;D Testing rejected — Stage reverted to R&amp;D Testing</p>
                              {rejReason && <p className="text-xs text-amber-700 mt-1">Reason: {rejReason}</p>}
                            </div>
                          </div>
                        ) : decision === "rejected_dqa" ? (
                          <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
                            <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-red-800">DQA Testing rejected — Stage reverted to DQA Testing</p>
                              {rejReason && <p className="text-xs text-red-700 mt-1">Reason: {rejReason}</p>}
                            </div>
                          </div>
                        ) : null}

                      </div>
                    )
                  })()}

                  {/* Per-vendor verdict table (stage 7 active) */}
                  {activeStage === 7 && sentVendors.length > 0 && !finalVendor && (
                    <div className="space-y-3 mb-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor Evaluation Results</p>
                      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <th className="px-3 py-2 text-left">Vendor</th>
                              <th className="px-3 py-2 text-left">Tests</th>
                              <th className="px-3 py-2 text-left">Verdict</th>
                              <th className="px-3 py-2 text-left">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sentVendors.map(vendor => {
                              const vt = vendorTests[vendor]
                              const verdict = vendorVerdicts[vendor]
                              return (
                                <tr key={vendor} className={verdict?.verdict === "accepted" ? "bg-emerald-50" : verdict?.verdict === "rejected" ? "bg-red-50" : ""}>
                                  <td className="px-3 py-3">
                                    <p className="font-semibold text-slate-900 text-[12px]">{vendor}</p>
                                    {vt?.submittedAt && <p className="text-[10px] text-slate-400 mt-0.5">Tests submitted</p>}
                                  </td>
                                  <td className="px-3 py-3">
                                    {vt ? (
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        {Object.keys(vt.results).length} tests
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">No results</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3">
                                    {verdict ? (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${verdict.verdict === "accepted" ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-red-100 text-red-700 border-red-300"}`}>
                                        {verdict.verdict === "accepted" ? "✓ Accepted" : "✗ Rejected"}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">Pending</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3">
                                    {!verdict ? (
                                      <div className="flex gap-1.5">
                                        <button type="button"
                                          onClick={() => {
                                            const now = new Date().toLocaleString("en-IN")
                                            const updated = { ...vendorVerdicts, [vendor]: { verdict: "accepted" as const, remarks: "", at: now } }
                                            setVendorVerdicts(updated)
                                            const raw = localStorage.getItem(VENDOR_VERDICTS_KEY)
                                            const all: Record<string, typeof updated> = raw ? JSON.parse(raw) : {}
                                            all[npdId] = updated
                                            localStorage.setItem(VENDOR_VERDICTS_KEY, JSON.stringify(all))
                                          }}
                                          className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 px-2 py-1 rounded transition-colors">
                                          Accept
                                        </button>
                                        <button type="button"
                                          onClick={() => {
                                            const now = new Date().toLocaleString("en-IN")
                                            const updated = { ...vendorVerdicts, [vendor]: { verdict: "rejected" as const, remarks: "", at: now } }
                                            setVendorVerdicts(updated)
                                            const raw = localStorage.getItem(VENDOR_VERDICTS_KEY)
                                            const all: Record<string, typeof updated> = raw ? JSON.parse(raw) : {}
                                            all[npdId] = updated
                                            localStorage.setItem(VENDOR_VERDICTS_KEY, JSON.stringify(all))
                                          }}
                                          className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-300 hover:bg-red-100 px-2 py-1 rounded transition-colors">
                                          Reject
                                        </button>
                                      </div>
                                    ) : verdict.verdict === "accepted" ? (
                                      <button type="button"
                                        disabled={!!finalVendor}
                                        onClick={() => {
                                          const now = new Date().toLocaleString("en-IN")
                                          setFinalVendor(vendor)
                                          const raw = localStorage.getItem(FINAL_VENDOR_KEY)
                                          const all: Record<string, string> = raw ? JSON.parse(raw) : {}
                                          all[npdId] = vendor
                                          localStorage.setItem(FINAL_VENDOR_KEY, JSON.stringify(all))
                                          updateNPD(npdId, { supplier: vendor })
                                          if (!isAltSupplier) autoAssignPartNumber(npdId)
                                          savePush(`Supplier Selected — ${npdId}`, `${vendor} selected as final supplier for ${npd.itemName}.${isAltSupplier ? "" : " Part number assigned."}`, npdId, "check")
                                        }}
                                        className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 px-2 py-1 rounded transition-colors disabled:opacity-40">
                                        Select as Supplier
                                      </button>
                                    ) : null}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Final vendor selected */}
                  {activeStage === 7 && finalVendor && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-sm font-semibold text-emerald-800">
                        <span className="font-bold">{finalVendor}</span> selected as final supplier — Part No. {assignedPartNumber || "being assigned…"}
                      </p>
                    </div>
                  )}

                  {(activeStage === 7 || activeStage > 7) && (() => {
                    const s6supplierSpoc = allVendors.find(v => v.company_name === npd.supplier)?.contact_person_name ?? npd.supplier
                    const s6spocContact = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
                    const toSourcingBody = `<p>Dear <strong>${s6spocContact.name}</strong>,</p><p>This is to inform you that R&amp;D testing for the following ${moduleLabel(npd.typeOfWork)} has been successfully completed and approved by the R&amp;D Head. A part number has been assigned.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Commodity</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Assigned Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:#1e3a5f">${assignedPartNumber}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">TQR Status</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#059669">✓ Approved</td></tr></table><p><strong>Action Required:</strong> Kindly log in to the portal and provide the <strong>delivery location</strong> and <strong>required sample quantity</strong> under Stage 7 — Sample Dispatch &amp; R&D Acceptance so we can proceed with the supplier delivery request.</p><p>Regards,<br/><strong>${DEFAULT_RND_HEAD.name}</strong><br/><span style="color:#64748b;font-size:12px">R&amp;D Head, Amber Enterprises</span></p>`
                    const toSupplierBody = `<p>Dear <strong>${s6supplierSpoc}</strong>,</p><p>We are pleased to inform you that the R&amp;D evaluation for your submitted samples has been successfully completed and approved.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Commodity</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Assigned Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:#1e3a5f">${assignedPartNumber}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Testing Status</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#059669">✓ Approved</td></tr></table><p>Our sourcing team will be in touch shortly with the delivery location and required sample quantity. Please be prepared to confirm your delivery date upon receiving the portal link.</p><p>Regards,<br/><strong>${DEFAULT_RND_HEAD.name}</strong><br/><span style="color:#64748b;font-size:12px">R&amp;D Head, Amber Enterprises</span></p>`
                    return (
                      <>
                        {activeStage === 7 && (
                          <div className="space-y-3">
                            {isAltSupplier ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
                                <Package className="w-5 h-5 text-blue-700 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Existing Part No.</p>
                                  <p className="text-xl font-mono font-bold text-blue-900">{npd.existingPartNumber || "—"}</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">No new part number is assigned for Alternative Supplier qualification.</p>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
                                <Package className="w-5 h-5 text-blue-700 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Part Number</p>
                                  <p className="text-xl font-mono font-bold text-blue-900">{assignedPartNumber || "—"}</p>
                                </div>
                              </div>
                            )}
                            <p className="text-sm text-slate-600">TQR approved. Coordinate sample delivery with sourcing team (Stage 7).</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">Notifications sent</p>
                            <EmailCard to={s6spocContact.name} subject={`Part No. ${assignedPartNumber} Assigned — Action Required: ${npdId}`} body={toSourcingBody} />
                            <EmailCard to={s6supplierSpoc} subject={`R&D Testing Approved — Part No. ${assignedPartNumber} Assigned | ${npdId}`} body={toSupplierBody} />
                            <PushSentBadge to={npd.spoc} />
                            <PushSentBadge to={npd.supplier} />
                          </div>
                        )}
                        {activeStage > 7 && (
                          <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 inline-flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-700 shrink-0" />
                              <span className="text-sm font-mono font-bold text-blue-900">{assignedPartNumber}</span>
                              <span className="text-xs text-blue-600 ml-1">assigned</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications sent</p>
                            <EmailCard to={s6spocContact.name} subject={`Part No. ${assignedPartNumber} Assigned — Action Required: ${npdId}`} body={toSourcingBody} />
                            <EmailCard to={s6supplierSpoc} subject={`R&D Testing Approved — Part No. ${assignedPartNumber} Assigned | ${npdId}`} body={toSupplierBody} />
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              {/* ── Stage 8: Sample Dispatch & R&D Acceptance — NCD/NPD only ── */}
              {!isECN && !isAltSupplier && activeStage >= 8 && (
                <div className={`rounded-xl border p-4 ${
                  activeStage === 8 ? "border-orange-300 bg-orange-50/30 shadow-sm" : "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 8
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-orange-600 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-orange-600">8</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 8 — Sample Dispatch &amp; R&D Acceptance</h4>
                    {plantVerdict === "accepted" && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Part Accepted</Badge>}
                    {plantVerdict === "not_good" && <Badge className="bg-red-100 text-red-700 border-none text-xs ml-auto">Not Good</Badge>}
                  </div>
                  {activeStage === 8 && (
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
                          <p className="text-xs text-emerald-700 mt-1.5 font-semibold">✓ R&D user accepted the part — NPD complete.</p>
                        )}
                        {plantVerdict === "not_good" && (
                          <p className="text-xs text-red-700 mt-1.5 font-semibold">✗ Part failed plant testing — revision needed.</p>
                        )}
                        {!plantVerdict && (
                          <p className="text-xs text-slate-500 mt-1.5 italic">
                            {plantDeliveryAccepted ? "R&D user testing in progress…" :
                             plantSupplierSubmitted ? "Awaiting R&D user delivery acceptance…" :
                             "Awaiting supplier delivery confirmation…"}
                          </p>
                        )}
                      </div>

                      {/* Verdict notification emails */}
                      {plantVerdict !== null && (
                        <div className="space-y-2">
                          {(() => {
                            const spocContact8 = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
                            const verdictTable = `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Commodity</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Part No.</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">${assignedPartNumber}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Verdict</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:${plantVerdict === "accepted" ? "#059669" : "#dc2626"}">${plantVerdict === "accepted" ? "✓ Accepted — Approved for Production" : "✗ Not Good — Returned for Revision"}</td></tr>${plantRemarks ? `<tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Remarks</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-style:italic">${plantRemarks}</td></tr>` : ""}</table>`
                            const rndBody = plantVerdict === "accepted"
                              ? `<p>Dear <strong>${DEFAULT_RND_CONTACT.name}</strong>,</p><p>The R&amp;D testing verdict for the following ${moduleLabel(npd.typeOfWork)} has been accepted. The part is approved for production and this NPD is now complete.</p>${verdictTable}<p>No further action is required from your end. Please archive the evaluation records accordingly.</p><p>Regards,<br/><strong>${spocContact8.name}</strong><br/><span style="color:#64748b;font-size:12px">Sourcing SPOC, Amber Enterprises</span></p>`
                              : `<p>Dear <strong>${DEFAULT_RND_CONTACT.name}</strong>,</p><p>The R&amp;D testing verdict for the following ${moduleLabel(npd.typeOfWork)} has been returned for revision. The part did not meet the required standards.</p>${verdictTable}<p>This part number has been recorded. When raising a new revision request, please reference <strong>${assignedPartNumber}</strong> in the previous part number field.</p><p>Regards,<br/><strong>${spocContact8.name}</strong><br/><span style="color:#64748b;font-size:12px">Sourcing SPOC, Amber Enterprises</span></p>`
                            const spocBody = plantVerdict === "accepted"
                              ? `<p>Dear <strong>${spocContact8.name}</strong>,</p><p>The R&amp;D testing verdict for <em>${npd.itemName}</em> (${npdId}) has been accepted and approved for production. This ${moduleLabel(npd.typeOfWork)} is now complete.</p>${verdictTable}<p>Please update your records and close out any pending sourcing actions for this ${moduleLabel(npd.typeOfWork)}.</p><p>Regards,<br/><strong>${DEFAULT_RND_CONTACT.name}</strong><br/><span style="color:#64748b;font-size:12px">R&amp;D Team, Amber Enterprises</span></p>`
                              : `<p>Dear <strong>${spocContact8.name}</strong>,</p><p>The R&amp;D testing verdict for <em>${npd.itemName}</em> (${npdId}) has been returned for revision. The part did not meet the required standards.</p>${verdictTable}<p>Please coordinate with the supplier to initiate a revised sample submission at the earliest.</p><p>Regards,<br/><strong>${DEFAULT_RND_CONTACT.name}</strong><br/><span style="color:#64748b;font-size:12px">R&amp;D Team, Amber Enterprises</span></p>`
                            return (
                              <>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications sent</p>
                                <EmailCard to={DEFAULT_RND_CONTACT.name} subject={`${plantVerdict === "accepted" ? "✓ Part Accepted" : "✗ Part Not Good"} — ${npdId}: ${npd.itemName}`} body={rndBody} />
                                <EmailCard to={spocContact8.name} subject={`${plantVerdict === "accepted" ? "✓ Part Accepted" : "✗ Part Not Good"} — ${npdId}: ${npd.itemName}`} body={spocBody} />
                                <PushSentBadge to={DEFAULT_RND_CONTACT.name} />
                                <PushSentBadge to={npd.spoc} />
                              </>
                            )
                          })()}
                        </div>
                      )}

                      {/* Step C — R&D user delivery acceptance */}
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

              {/* ── Stage 9: Summary & Closure — NCD/NPD only ── */}
              {!isECN && !isAltSupplier && activeStage >= 9 && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <h4 className="font-bold text-slate-800 text-sm">Stage 9 — {getStageName(9, npd.typeOfWork)}</h4>
                    <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">
                      {plantVerdict === "accepted" ? "Part Accepted" : plantVerdict === "not_good" ? "Not Good" : "Complete"}
                    </Badge>
                  </div>
                  <p className="text-xs text-emerald-700">
                    {plantVerdict === "accepted"
                      ? `Part No. ${assignedPartNumber} accepted and approved for production. Full lifecycle record is available below.`
                      : plantVerdict === "not_good"
                      ? `Part No. ${assignedPartNumber} marked not good. ${moduleLabel(npd.typeOfWork)} closed — refer to summary below.`
                      : `${moduleLabel(npd.typeOfWork)} lifecycle complete. View the full summary and MIS report below.`}
                  </p>
                </div>
              )}

            </CardContent>
          </Card>}

          {/* ── Section 2: Sourcing Info (read-only) — NCD/NPD only ─────────── */}
          {!isECN && !isAltSupplier && activeStage >= 2 && (
            <Card className="transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="pb-3 border-b bg-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Sourcing Status</CardTitle>
                  {sentVendors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {sentVendors.map(v => (
                        <a
                          key={v}
                          href={`${baseUrl}/supplier/quote/${npdId}?vendor=${encodeURIComponent(v)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> {v}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
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
                       activeStage === 2 ? "Awaiting Submissions" :
                       activeStage === 3 ? "Awaiting Dispatch" :
                       activeStage >= 4 ? "Supplier Dispatched" : "—"}
                    </p>
                  </div>
                </div>
                {/* Vendor feasibility denial queries */}
                {Object.entries(liveQuotes).some(([, lq]) => lq.feasible === false && lq.query) && (
                  <div id="vendor-queries" className="mt-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <MessageSquare className="w-4 h-4 text-amber-500" />
                      <p className="text-sm font-bold text-slate-700">Vendor Queries</p>
                    </div>
                    {Object.entries(liveQuotes)
                      .filter(([, lq]) => lq.feasible === false && lq.query)
                      .map(([vendorName, lq]) => (
                        <div
                          key={vendorName}
                          className={`rounded-xl border-2 overflow-hidden ${lq.rndReply ? "border-emerald-200" : "border-amber-300"}`}
                        >
                          {/* Card header */}
                          <div className={`flex items-center justify-between px-4 py-3 ${lq.rndReply ? "bg-emerald-50" : "bg-amber-50"}`}>
                            <div className="flex items-center gap-2">
                              {lq.rndReply
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                              <span className={`text-sm font-bold ${lq.rndReply ? "text-emerald-800" : "text-amber-800"}`}>
                                {vendorName}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${lq.rndReply ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {lq.rndReply ? "R&D Replied" : "Query Raised"}
                            </span>
                          </div>

                          {/* Query bubble */}
                          <div className="px-4 py-3 bg-white border-b border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier Query</p>
                            <p className="text-sm text-slate-800 italic bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">&ldquo;{lq.query}&rdquo;</p>
                          </div>

                          {/* Reply area */}
                          <div className="px-4 py-4 bg-white space-y-3">
                            {lq.rndReply ? (
                              <>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">R&amp;D Clarification Sent</p>
                                  <p className="text-sm text-slate-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">{lq.rndReply}</p>
                                  {lq.rndReplyDoc && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1.5">
                                      <FileText className="w-3 h-3" /> {lq.rndReplyDoc}
                                    </p>
                                  )}
                                </div>
                                <EmailCard
                                  to={vendorName}
                                  subject={`R&D Clarification — ${npdId}: ${npd.itemName}`}
                                  body={(() => {
                                    const portalUrl = `${baseUrl}/supplier/quote/${npdId}?vendor=${encodeURIComponent(vendorName)}`
                                    const vRec = allVendors.find(v => v.company_name === vendorName)
                                    const vSpoc = vRec?.contact_person_name ?? vendorName
                                    const rndUser = npd.raisedBy === "rnd_head" ? DEFAULT_RND_HEAD.name : DEFAULT_RND_CONTACT.name
                                    return `<p>Dear <strong>${vSpoc}</strong>,</p><p>Thank you for your query regarding <strong>${npd.itemName}</strong> (${npdId}). Our R&amp;D team has reviewed it and provided the following clarification:</p><blockquote style="border-left:3px solid #1e3a5f;margin:12px 0;padding:8px 14px;background:#f8fafc;color:#1e293b;font-style:italic">${lq.query}</blockquote><p><strong>R&amp;D Response:</strong><br/>${lq.rndReply}</p>${lq.rndReplyDoc ? `<p style="font-size:12px;color:#64748b">Attached document: ${lq.rndReplyDoc}</p>` : ""}<p>Based on this clarification, kindly re-assess your feasibility and submit your updated response using the link below.</p><div style="margin:16px 0;"><a href="${portalUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Re-Assess &amp; Submit Response →</a></div><p>Regards,<br/><strong>${rndUser}</strong></p>`
                                  })()}
                                />
                              </>
                            ) : (
                              <>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Clarification</p>
                                <textarea
                                  rows={3}
                                  value={queryReplyText[vendorName] ?? ""}
                                  onChange={e => setQueryReplyText(prev => ({ ...prev, [vendorName]: e.target.value }))}
                                  placeholder="Type your clarification response to this query…"
                                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white placeholder:text-slate-400 resize-none"
                                />
                                <div className="flex items-center justify-between gap-3">
                                  <div
                                    onClick={() => {
                                      const fakeDoc = `rnd_reply_${vendorName.toLowerCase().replace(/\s+/g, "_")}.pdf`
                                      setQueryReplyDoc(prev => ({
                                        ...prev,
                                        [vendorName]: queryReplyDoc[vendorName] ? "" : fakeDoc,
                                      }))
                                    }}
                                    className={`cursor-pointer flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                                      queryReplyDoc[vendorName]
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                        : "bg-white border-slate-300 text-slate-500 hover:border-amber-400 hover:text-amber-700"
                                    }`}
                                  >
                                    <UploadCloud className="w-3.5 h-3.5" />
                                    {queryReplyDoc[vendorName] ? queryReplyDoc[vendorName] : "Attach document (optional)"}
                                  </div>
                                  <Button
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 h-8"
                                    disabled={!(queryReplyText[vendorName]?.trim())}
                                    onClick={() => submitQueryReply(vendorName)}
                                  >
                                    <Send className="w-3 h-3 mr-1.5" /> Send Clarification
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Section 3: Document Library ──────────────────────── */}
          {/* (shared between NCD and ECN) */}
          <Card className="transition-shadow duration-200 hover:shadow-md">
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

      {/* ═══ ECN/AS Stage 5 — DQA Testing (standalone; visible to dqa + rnd roles) ═══ */}
      {(isECN || isAltSupplier) && activeStage >= 5 && (() => {
        const isActive  = activeStage === 5
        const isDone    = activeStage > 5
        const isDqaUser = currentRole === "dqa_engineer" || currentRole === "dqa_lead"
        const canEdit   = isDqaUser && !ecnDqaSubmitted && isActive
        const allFilled = DQA_TESTS.every(t => {
          const r = ecnDqaResults[t.testName]
          return r && r.value.trim() !== "" && r.status !== "pending"
        })
        return (
          <Card className={`transition-shadow duration-200 ${isDone ? "shadow-sm" : isActive ? "border-cyan-400 shadow-md" : "opacity-60"}`}>
            <CardHeader className={`pb-3 border-b ${isDone ? "bg-slate-50" : isActive ? "bg-cyan-50/40" : "bg-slate-50"}`}>
              <CardTitle className="text-base flex items-center gap-2">
                {isDone
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <FlaskConical className="w-4 h-4 text-cyan-700 shrink-0" />}
                Stage 5 — DQA Testing
                {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
                {isActive && ecnDqaSubmitted && <Badge className="bg-cyan-100 text-cyan-700 border-none text-xs ml-auto">Results Submitted</Badge>}
                {isActive && !ecnDqaSubmitted && isDqaUser && <Badge className="bg-cyan-700 text-white border-none text-xs ml-auto">Action Required</Badge>}
                {isActive && !ecnDqaSubmitted && !isDqaUser && <Badge className="bg-slate-100 text-slate-500 border-none text-xs ml-auto">Awaiting DQA</Badge>}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {isDqaUser && isActive && !ecnDqaSubmitted
                  ? "Fill in all test results and verdicts, then submit to advance to Supplier Sample Dispatch."
                  : "DQA test results for this engineering change notice."}
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-3 py-2 text-left">Test Parameter</th>
                      <th className="px-3 py-2 text-center">Unit</th>
                      <th className="px-3 py-2 text-center">Duration</th>
                      <th className="px-3 py-2 text-center">Result / Value</th>
                      <th className="px-3 py-2 text-center">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DQA_TESTS.map((t, i) => {
                      const r = ecnDqaResults[t.testName]
                      return (
                        <tr key={t.testName} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-3 py-2 font-medium text-slate-700">{t.testName}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{t.unit}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{t.durationDays}d</td>
                          <td className="px-3 py-2 text-center">
                            {canEdit ? (
                              <input
                                type="text" placeholder="Enter result"
                                value={r?.value ?? ""}
                                onChange={e => setEcnDqaResults(prev => ({ ...prev, [t.testName]: { value: e.target.value, status: e.target.value ? "pass" : "pending" } }))}
                                className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-center"
                              />
                            ) : (
                              <span className="font-semibold text-slate-800">{r?.value || "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {canEdit ? (
                              <select
                                value={r?.status ?? "pending"}
                                onChange={e => setEcnDqaResults(prev => ({ ...prev, [t.testName]: { value: prev[t.testName]?.value ?? "", status: e.target.value } }))}
                                className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
                              >
                                <option value="pending">—</option>
                                <option value="pass">Pass</option>
                                <option value="fail">Fail</option>
                              </select>
                            ) : r?.status ? (
                              <Badge className={`${r.status === "pass" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"} border-none text-xs`}>{r.status}</Badge>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {canEdit && (
                <div className="mt-4 flex gap-2 items-center">
                  <button
                    disabled={!allFilled}
                    onClick={() => {
                      const all: Record<string, { results: typeof ecnDqaResults; submittedAt: string }> = JSON.parse(localStorage.getItem(DQA_TESTS_KEY) ?? "{}")
                      all[npdId] = { results: ecnDqaResults, submittedAt: new Date().toLocaleString("en-IN") }
                      localStorage.setItem(DQA_TESTS_KEY, JSON.stringify(all))
                      // Also write to ECN-specific key so R&D Head approval can read it
                      const dqaEntry = { results: ecnDqaResults as Record<string, { value: string; status: string }>, submittedAt: Date.now(), submittedBy: currentRole }
                      const allEcnDqa: Record<string, typeof dqaEntry> = JSON.parse(localStorage.getItem(ECN_DQA_TESTS_KEY) ?? "{}")
                      allEcnDqa[npdId] = dqaEntry
                      localStorage.setItem(ECN_DQA_TESTS_KEY, JSON.stringify(allEcnDqa))
                      setEcnDqaTestsData(dqaEntry)
                      setEcnDqaSubmitted(true)
                      updateNPD(npdId, { stage: 6, stageName: getStageName(6, npd.typeOfWork) })
                      setActiveStage(6)
                    }}
                    className="bg-cyan-700 hover:bg-cyan-800 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg"
                  >
                    Submit DQA Results & Proceed to R&D Head Approval
                  </button>
                  {!allFilled && <span className="text-xs text-slate-400">Fill all results to submit</span>}
                </div>
              )}
              {isActive && (currentRole === "dqa_lead" || currentRole === "super_admin") && ecnDqaSubmitted && (
                <button
                  onClick={() => {
                    updateNPD(npdId, { stage: 6, stageName: getStageName(6, npd.typeOfWork) })
                    setActiveStage(6)
                  }}
                  className="mt-3 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >Proceed to R&D Head Approval →</button>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* ═══════════════════ STAGE 9 — SUMMARY & CLOSURE (NCD/NPD only) ═══════════════════ */}
      {!isECN && !isAltSupplier && activeStage >= 9 && (
        <Card className="border-emerald-200 shadow-sm">
          <CardHeader className="bg-emerald-50 border-b border-emerald-200 pb-3">
            <CardTitle className="text-emerald-900 flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5" /> Stage 9 — {getStageName(9, npd.typeOfWork)}
            </CardTitle>
            <p className="text-xs text-emerald-700 mt-0.5">Full lifecycle record for this {moduleLabel(npd.typeOfWork)}. View the complete MIS report.</p>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">

            {/* ── A: Project Details ─────────────────────────── */}
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">A. Project Details</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { label: `${moduleLabel(npd.typeOfWork)} ID`,      value: npdId },
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
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Enquiry Sent To</p>
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
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Submissions Received</p>
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
                  <FileText className="w-4 h-4 mr-2" /> View {moduleLabel(npd.typeOfWork)} Report
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
        <div className="flex flex-col-reverse gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {currentRole === "super_admin" && (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">Sourcing Team</span>
            </div>
          )}

          {/* ═══ ALT SUPPLIER SOURCING STAGES ═══ */}
          {isAltSupplier && (() => {
  const asSourcingCards: React.ReactNode[] = []
  const portalUrl = `${baseUrl}/supplier/ecn-sourcing/${npdId}`
  const sd = ecnSourcingDispatch

  // ── AS Stage 1: Sourcing fills the request form ──────────────────────────
  {
    const isActive = activeStage === 1
    const isDone   = activeStage > 1
    asSourcingCards.push(
      <div key="as-src-s1" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-amber-300 bg-amber-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-amber-600 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 1 — Sourcing Request Initiation</h4>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Submitted</Badge>}
          {isActive && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Action Required</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
          {[["Existing Part No.", npd.existingPartNumber ?? "—"], ["Item", npd.itemName], ["Priority", npd.priority], ["TAT", npd.totalTat ? `${npd.totalTat} days` : "—"]].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-400 text-xs">{label}</span>
              <span className="text-slate-800 font-medium text-xs text-right max-w-[160px] truncate">{value}</span>
            </div>
          ))}
        </div>
        {(isDone || asStage1Data) && asStage1Data && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs border-b border-slate-100 pb-1"><span className="text-slate-400">Proposed Supplier</span><span className="font-semibold text-slate-800">{asStage1Data.supplierName}</span></div>
            <div className="flex justify-between text-xs border-b border-slate-100 pb-1"><span className="text-slate-400">Reason</span><span className="font-semibold text-slate-800 max-w-[200px] text-right">{asStage1Data.reason}</span></div>
            {asStage1Data.changeObjective && <div className="flex justify-between text-xs border-b border-slate-100 pb-1"><span className="text-slate-400">Objective</span><span className="font-semibold text-slate-800">{asStage1Data.changeObjective}</span></div>}
            {asStage1Data.customerSpecific?.enabled && <div className="flex justify-between text-xs border-b border-slate-100 pb-1"><span className="text-slate-400">Customer Grade</span><span className="font-semibold text-slate-800">{asStage1Data.customerSpecific.grade || "—"}</span></div>}
            {asStage1Data.docsLink && <div className="flex justify-between text-xs"><span className="text-slate-400">Docs</span><span className="font-semibold text-blue-700">{asStage1Data.docsLink}</span></div>}
            <p className="text-[10px] text-slate-400 mt-1">Submitted by {asStage1Data.submittedBy} · {new Date(asStage1Data.submittedAt).toLocaleString("en-IN")}</p>
          </div>
        )}
      </div>
    )
  }

  // ── AS Stage 2: Awaiting R&D Approval ────────────────────────────────────
  if (activeStage >= 2) {
    const isActive = activeStage === 2
    const isDone   = activeStage > 2
    asSourcingCards.push(
      <div key="as-src-s2" className={`rounded-xl border p-4 ${isDone || asRndApproval ? "bg-slate-50 border-slate-200" : isActive ? "border-teal-300 bg-teal-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-2">
          {isDone || asRndApproval ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-teal-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 2 — R&D Review &amp; Approval</h4>
          {(isDone || asRndApproval) && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Approved</Badge>}
          {isActive && !asRndApproval && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D</Badge>}
        </div>
        {isActive && !asRndApproval && <p className="text-xs text-slate-400 italic">R&D team is reviewing the alternate supplier request.</p>}
        {(isDone || asRndApproval) && asRndApproval && (
          <p className="text-[10px] text-slate-400">Approved by {asRndApproval.approvedBy} · {new Date(asRndApproval.approvedAt).toLocaleString("en-IN")}</p>
        )}
      </div>
    )
  }

  // ── AS Stage 3: Price Negotiation + Supplier Sample Dispatch ─────────────
  if (activeStage >= 3) {
    const isActive = activeStage === 3
    const isDone   = activeStage > 3
    const neg      = ecnNegotiation
    const negApproved  = !!neg?.approvedAt
    const currSymbol   = (c: string) => c === "INR" ? "₹" : c === "USD" ? "$" : "€"
    asSourcingCards.push(
      <div key="as-src-s3" className={`rounded-xl border p-4 space-y-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-indigo-300 bg-indigo-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Truck className="w-4 h-4 text-indigo-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 3 — Price Negotiation &amp; Sample Dispatch</h4>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Price Agreed</Badge>}
          {isActive && !ecnInitialQuote && <Badge className="bg-slate-100 text-slate-600 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting Quote</Badge>}
          {isActive && ecnInitialQuote && !negApproved && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Negotiating</Badge>}
          {isActive && negApproved && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Price Agreed</Badge>}
        </div>

        {/* Portal link — always shown when active */}
        {isActive && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier Portal URL</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-blue-700 break-all flex-1">{portalUrl}</span>
              <button onClick={() => navigator.clipboard?.writeText(portalUrl)}
                className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                <Copy className="w-3 h-3" />Copy
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Share this link with <strong>{npd.supplier}</strong> — they will enter their quoted price and you can negotiate from there.</p>
          </div>
        )}

        {/* Supplier initial quote — awaiting submission */}
        {isActive && !ecnInitialQuote && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-amber-800">Awaiting supplier to submit their initial price</p>
          </div>
        )}

        {/* Supplier initial quote received */}
        {isActive && ecnInitialQuote && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Supplier&apos;s Quoted Price</p>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-emerald-900">
                {currSymbol(ecnInitialQuote.currency)}{parseFloat(ecnInitialQuote.price).toLocaleString("en-IN")} <span className="text-xs font-normal">/ unit</span>
              </span>
              <span className="text-[10px] text-emerald-600">Valid until {new Date(ecnInitialQuote.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>
        )}

        {/* Price Negotiation widget — gated behind supplier's initial quote */}
        {isActive && ecnInitialQuote && (() => {
          const latestRound    = neg?.rounds[neg.rounds.length - 1]
          const pendingResponse = latestRound && !latestRound.supplierResponse
          const awaitingApproval = latestRound?.supplierResponse && !neg?.approvedAt

          return (
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price Negotiation</span>
                {negApproved && <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Agreed: {currSymbol(neg!.finalCurrency!)}{parseFloat(neg!.finalPrice!).toLocaleString("en-IN")}</span>}
                {pendingResponse && <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Awaiting Supplier — Round {latestRound.round}</span>}
              </div>

              {/* Round history */}
              {neg && neg.rounds.length > 0 && (
                <div className="space-y-2">
                  {neg.rounds.map(r => (
                    <div key={r.round} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Round {r.round}</span>
                        <span className="text-[10px] text-slate-400">{new Date(r.sentAt).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-slate-500">Target: <strong className="text-slate-800">{currSymbol(r.currency)}{parseFloat(r.targetPrice).toLocaleString("en-IN")}</strong></span>
                        {r.supplierResponse && (
                          <span className="text-slate-500">Supplier: <strong className="text-slate-800">{currSymbol(r.supplierResponse.currency)}{parseFloat(r.supplierResponse.price).toLocaleString("en-IN")}</strong></span>
                        )}
                      </div>
                      {(r.supplierResponse?.docs?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {r.supplierResponse!.docs.map(d => <span key={d} className="text-[10px] bg-slate-100 text-slate-600 rounded px-2 py-0.5">{d}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Approve / Counter */}
              {awaitingApproval && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const updated: NegotiationRecord = {
                        ...neg!,
                        approvedAt: Date.now(),
                        approvedBy: currentRole,
                        finalPrice: latestRound!.supplierResponse!.price,
                        finalCurrency: latestRound!.supplierResponse!.currency,
                      }
                      const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
                      all[npdId] = updated
                      localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
                      setEcnNegotiation(updated)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                  ><CheckCircle className="w-3.5 h-3.5" />Approve Price</button>
                  <button
                    onClick={() => setNegTargetPrice("")}
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg"
                  >Counter with new target ↓</button>
                </div>
              )}

              {/* Send target price form */}
              {!negApproved && !pendingResponse && (!neg || awaitingApproval) && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-800">
                    {!neg ? "Send Counter Target (Round 1)" : `Send Counter Target (Round ${neg.rounds.length + 1})`}
                  </p>
                  <div className="flex gap-2">
                    <select value={negCurrency} onChange={e => setNegCurrency(e.target.value as "INR" | "USD" | "EUR")}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="INR">INR ₹</option>
                      <option value="USD">USD $</option>
                      <option value="EUR">EUR €</option>
                    </select>
                    <input type="number" min="0" step="0.01" placeholder="Your target price / unit"
                      value={negTargetPrice} onChange={e => setNegTargetPrice(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button
                      disabled={!negTargetPrice || parseFloat(negTargetPrice) <= 0}
                      onClick={() => {
                        const existingRounds = neg?.rounds ?? []
                        const newRound: NegotiationRound = {
                          round: existingRounds.length + 1,
                          targetPrice: negTargetPrice,
                          currency: negCurrency,
                          sentAt: Date.now(),
                          sentBy: currentRole,
                        }
                        const updated: NegotiationRecord = { rounds: [...existingRounds, newRound] }
                        const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
                        all[npdId] = updated
                        localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
                        setEcnNegotiation(updated)
                        setNegTargetPrice("")
                      }}
                      className="bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                    >Send to Supplier</button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Price agreed — stage will auto-advance to 4 for dispatch */}
        {(isDone || negApproved) && ecnNegotiation?.finalPrice && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-800">
              Price agreed: {currSymbol(ecnNegotiation.finalCurrency ?? "INR")}{parseFloat(ecnNegotiation.finalPrice).toLocaleString("en-IN")} / unit — proceeding to dispatch
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── AS Stage 4: Supplier Sample Dispatch (dispatch portal link + status) ──
  if (activeStage >= 4) {
    const isActive4 = activeStage === 4
    const isDone4   = activeStage > 4
    asSourcingCards.push(
      <div key="as-src-s4" className={`rounded-xl border p-4 space-y-3 ${isDone4 ? "bg-slate-50 border-slate-200" : isActive4 ? "border-indigo-300 bg-indigo-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2">
          {isDone4 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Truck className="w-4 h-4 text-indigo-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 4 — Supplier Sample Dispatch</h4>
          {isDone4 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Dispatched</Badge>}
          {isActive4 && !ecnSourcingDispatch?.submission && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting Dispatch</Badge>}
          {isActive4 && ecnSourcingDispatch?.submission && <Badge className="bg-blue-100 text-blue-700 border-none text-xs ml-auto">Dispatched</Badge>}
        </div>
        {isActive4 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier Portal URL</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-blue-700 break-all flex-1">{portalUrl}</span>
              <button onClick={() => navigator.clipboard?.writeText(portalUrl)}
                className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                <Copy className="w-3 h-3" />Copy
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Ask <strong>{npd.supplier}</strong> to submit dispatch documents on this portal.</p>
          </div>
        )}
        {ecnSourcingDispatch?.submission && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Date</p>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">{ecnSourcingDispatch.submission.dispatchDate ?? "—"}</p>
              </div>
              {ecnNegotiation?.finalPrice && (
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Agreed Price</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">
                    {(ecnNegotiation.finalCurrency ?? "INR") === "INR" ? "₹" : (ecnNegotiation.finalCurrency ?? "INR") === "USD" ? "$" : "€"}{parseFloat(ecnNegotiation.finalPrice).toLocaleString("en-IN")} / unit
                  </p>
                </div>
              )}
            </div>
            {(ecnSourcingDispatch.submission.docs?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {ecnSourcingDispatch.submission.docs!.map((doc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200">
                    <FileText className="w-3 h-3 text-slate-400" />{doc}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (activeStage >= 5) {
    asSourcingCards.push(
      <div key="as-src-s5" className={`rounded-xl border p-4 ${activeStage > 5 ? "bg-slate-50 border-slate-200" : "border-cyan-300 bg-cyan-50/30"}`}>
        <div className="flex items-center gap-2">
          {activeStage > 5 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-cyan-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 5 — DQA Testing</h4>
          {activeStage > 5 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
          {activeStage === 5 && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">In Progress</Badge>}
        </div>
      </div>
    )
  }

  if (activeStage >= 6) {
    const isActive = activeStage === 6
    const isDone   = activeStage > 6
    const approved = ecnHeadApproval?.verdict === "approved"
    asSourcingCards.push(
      <div key="as-src-s6" className={`rounded-xl border p-4 ${isDone || approved ? "bg-slate-50 border-slate-200" : "border-violet-300 bg-violet-50/30"}`}>
        <div className="flex items-center gap-2">
          {isDone || approved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-violet-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 6 — R&D Head Approval</h4>
          {(isDone || approved) && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Approved</Badge>}
          {isActive && !approved && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D Head</Badge>}
        </div>
      </div>
    )
  }

  // ── AS Stage 7: Plant Evaluation & Testing (sourcing view — read-only) ──────
  if (activeStage >= 7) {
    const isActive = activeStage === 7
    const isDone   = activeStage > 7
    asSourcingCards.push(
      <div key="as-src-s7" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-orange-300 bg-orange-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-orange-600 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 7 — Plant Evaluation &amp; Testing</h4>
          <div className="ml-auto">
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
            {isActive && !asPlantEval && <Badge className="bg-amber-100 text-amber-700 border-none text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D</Badge>}
            {isActive && asPlantEval && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
          </div>
        </div>
        {isActive && !asPlantEval && (
          <p className="text-xs text-slate-400 italic mt-2">R&D is running plant evaluation tests. No sourcing action required at this stage.</p>
        )}
        {asPlantEval && (
          <p className="text-xs text-emerald-700 font-medium mt-2">Plant evaluation submitted by {asPlantEval.submittedBy} · {new Date(asPlantEval.submittedAt).toLocaleString("en-IN")}</p>
        )}
      </div>
    )
  }

  // ── AS Stage 8: Closure banner ────────────────────────────────────────────
  if (activeStage >= 8) {
    asSourcingCards.push(
      <div key="as-src-s8" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <h4 className="font-bold text-slate-800 text-sm">Stage 8 — AS Summary &amp; Closure</h4>
          <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>
        </div>
        <p className="text-xs text-emerald-700 mt-2 font-semibold">Alternative Supplier qualification complete. All stages signed off.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alt Supplier — Sourcing Actions</span>
        <Badge className="bg-slate-100 text-slate-500 border-none text-xs">{getStageName(activeStage, npd.typeOfWork)}</Badge>
      </div>
      {[...asSourcingCards].reverse()}
    </div>
  )
})()}

          {/* ═══ ECN SOURCING STAGES (sourcing primary actor) ═══ */}
          {isECN && (() => {
  const portalUrl = `${baseUrl}/supplier/ecn-sourcing/${npdId}`
  const sd = ecnSourcingDispatch
  const rfqApproved = ecnRndApproval?.verdict === "approved"

  // Build NCD-style RFQ email body for the single fixed supplier
  const buildEcnRfqEmail = () => {
    const template = localStorage.getItem(VENDOR_RFQ_TEMPLATE_KEY) || DEFAULT_RFQ_TEMPLATE
    const filled = template
      .replace(/{npd_id}/g,       npdId)
      .replace(/{item_name}/g,    npd.ecnPartName ?? npd.itemName)
      .replace(/{commodity}/g,    "Engineering Change")
      .replace(/{vendor_name}/g,  npd.supplier)
      .replace(/{vendor_spoc}/g,  npd.supplier)
      .replace(/{spoc_name}/g,    npd.spoc)
      .replace(/{portal_link}/g,  portalUrl)
      .replace(/{valid_until}/g,  enquiryValidUntil)
      .replace(/{drawing_link}/g, npd.driveLink || "Not attached")
      .replace(/Amber Sourcing Operations/g, npd.spoc)
    const lines = filled.split("\n")
    const subject = lines[0].replace(/^Subject:\s*/i, "").trim() || `[RFQ] ECN - ${npd.ecnPartName ?? npd.itemName} - ${npdId}`
    const bodyLines = lines.slice(1)
    const buttonHtml = `<div style="margin:16px 0;"><a href="${portalUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Click here to submit dispatch documents →</a></div>`
    const renderLine = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    const body = bodyLines.map(line => {
      const trimmed = line.trim()
      if (trimmed === "") return `<div style="height:8px"></div>`
      if (trimmed === portalUrl || trimmed === "{portal_link}") return buttonHtml
      return `<p style="margin:0 0 4px 0;">${renderLine(trimmed)}</p>`
    }).join("")
    return { subject, body }
  }

  const sourcingCards: React.ReactNode[] = []

  // Stage 1
  {
    const isActive = activeStage === 1
    const isDone   = activeStage > 1
    const canProceed = !tatExtReqPending
    sourcingCards.push(
      <div key="src-s1" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-amber-300 bg-amber-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-amber-600 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 1 — ECN Request Review</h4>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Done</Badge>}
          {isActive && tatExtReqPending && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&amp;D Approval</Badge>}
          {isActive && !tatExtReqPending && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Action Required</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
          {[["Part Number", npd.ecnPartNumber ?? "—"], ["Part Name", npd.ecnPartName ?? npd.itemName], ["Supplier", npd.supplier], ["Priority", npd.priority], ["TAT", npd.totalTat ? `${npd.totalTat} days` : "—"]].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-400 text-xs">{label}</span>
              <span className="text-slate-800 font-medium text-xs text-right max-w-[160px] truncate">{value}</span>
            </div>
          ))}
        </div>
        {isActive && (() => {
          if (tatExtReqPending) return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800">TAT extension requested: <strong>+{tatExtReqDays} days</strong></p>
              {tatExtReqReason && <p className="text-xs text-amber-700 italic">{tatExtReqReason}</p>}
              <p className="text-[10px] text-amber-600">Requested: {tatExtReqAt} · Waiting for R&D to approve</p>
            </div>
          )
          if (tatExtRndDecision) return (
            <div className={`rounded-lg border p-2.5 flex items-center gap-2 mb-3 ${tatExtRndDecision === "approved" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              {tatExtRndDecision === "approved" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              <span className={`text-xs font-semibold ${tatExtRndDecision === "approved" ? "text-emerald-800" : "text-red-700"}`}>TAT extension {tatExtRndDecision} by R&D · {tatExtRndAt}</span>
            </div>
          )
          return (
            <div className="space-y-2">
              {!sourcingTatExtendOpen ? (
                <button onClick={() => setSourcingTatExtendOpen(true)} className="text-[11px] font-semibold text-slate-500 hover:text-blue-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1"><Clock className="w-3 h-3" />Request TAT Extension (optional)</button>
              ) : (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-800">Request TAT Extension</p>
                  <div className="flex gap-2">
                    <input type="number" min={1} placeholder="Days" value={sourcingTatDays} onChange={e => setSourcingTatDays(e.target.value)} className="w-20 border border-slate-300 rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Reason (required)" value={sourcingTatReason} onChange={e => setSourcingTatReason(e.target.value)} className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleTatExtensionRequest} disabled={!sourcingTatDays || parseInt(sourcingTatDays) <= 0 || !sourcingTatReason.trim()} className="bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Submit Request</button>
                    <button onClick={() => { setSourcingTatExtendOpen(false); setSourcingTatDays(""); setSourcingTatReason("") }} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
        {isActive && canProceed && (
          <button onClick={() => { updateNPD(npdId, { stage: 2, stageName: getStageName(2, npd.typeOfWork) }); setActiveStage(2) }} className="mt-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2"><Send className="w-3.5 h-3.5" />Proceed to Sourcing →</button>
        )}
        {(isDone || isActive) && ecnNegotiation?.approvedAt && (() => {
          const currSymbol = (c: string) => c === "INR" ? "₹" : c === "USD" ? "$" : "€"
          return (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Agreed Price</p>
                  <p className="text-base font-bold text-emerald-900">{currSymbol(ecnNegotiation.finalCurrency ?? "INR")}{parseFloat(ecnNegotiation.finalPrice!).toLocaleString("en-IN")} <span className="text-xs font-normal text-emerald-600">/ unit</span></p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Agreed by {ecnNegotiation.approvedBy} · {new Date(ecnNegotiation.approvedAt!).toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  // Stage 2
  if (activeStage >= 2) {
    const isActive = activeStage === 2
    const isDone   = activeStage > 2
    sourcingCards.push(
      <div key="src-s2" className={`rounded-xl border p-4 ${isDone || rfqApproved ? "bg-slate-50 border-slate-200" : isActive ? "border-teal-300 bg-teal-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone || rfqApproved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-teal-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 2 — Sourcing Review &amp; RFQ</h4>
          {(isDone || rfqApproved) && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">RFQ Sent</Badge>}
          {isActive && !rfqApproved && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Action Required</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
          {[["Part Number", npd.ecnPartNumber ?? "—"], ["Part Name", npd.ecnPartName ?? npd.itemName], ["Supplier", npd.supplier], ["Priority", npd.priority]].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-400 text-xs">{label}</span>
              <span className="text-slate-800 font-medium text-xs text-right max-w-[160px] truncate">{value}</span>
            </div>
          ))}
        </div>
        {isActive && !rfqApproved && (() => {
          const { subject, body } = buildEcnRfqEmail()
          return (
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[10px] text-slate-400 shrink-0">To: {npd.supplier} ·</span>
                    <span className="text-xs font-semibold text-white truncate">{subject}</span>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(`Subject: ${subject}\n\n${body.replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim()}`)} className="shrink-0 ml-3 text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
                </div>
                <div className="p-5 text-sm text-slate-700 leading-relaxed bg-white [&_p]:mb-3 [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: body }} />
              </div>
              <button
                onClick={() => {
                  const entry = { verdict: "approved" as const, approvedBy: currentRole, approvedAt: Date.now() }
                  const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_RND_APPROVAL_KEY) ?? "{}")
                  all[npdId] = entry
                  localStorage.setItem(ECN_RND_APPROVAL_KEY, JSON.stringify(all))
                  setEcnRndApproval(entry)
                  updateNPD(npdId, { stage: 3, stageName: getStageName(3, npd.typeOfWork) })
                  setActiveStage(3)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2"
              ><Mail className="w-3.5 h-3.5" />Send RFQ &amp; Proceed to Supplier Dispatch →</button>
            </div>
          )
        })()}
        {(isDone || rfqApproved) && ecnRndApproval && (
          <p className="text-[10px] text-slate-400">RFQ sent by {ecnRndApproval.approvedBy} · {new Date(ecnRndApproval.approvedAt).toLocaleString("en-IN")}</p>
        )}
        {/* ── Price Negotiation sub-section ── */}
        {isActive && (() => {
          const neg = ecnNegotiation
          const latestRound = neg?.rounds[neg.rounds.length - 1]
          const pendingResponse = latestRound && !latestRound.supplierResponse
          const awaitingApproval = latestRound?.supplierResponse && !neg?.approvedAt
          const approved = !!neg?.approvedAt
          const currSymbol = (c: string) => c === "INR" ? "₹" : c === "USD" ? "$" : "€"
          const iq = ecnInitialQuote

          return (
            <div className="mt-4 border-t border-slate-200 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price Negotiation</span>
                {approved && <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Agreed: {currSymbol(neg!.finalCurrency!)}{parseFloat(neg!.finalPrice!).toLocaleString("en-IN")}</span>}
                {pendingResponse && <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Awaiting Supplier — Round {latestRound.round}</span>}
                {!iq && !neg && <span className="ml-auto text-[10px] text-slate-400">Waiting for supplier&apos;s initial quote…</span>}
              </div>

              {/* Supplier's initial quote */}
              {iq && (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier Initial Quote</span>
                    <span className="text-[10px] text-slate-400">{new Date(iq.submittedAt).toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{currSymbol(iq.currency)}{parseFloat(iq.price).toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">/ unit</span></p>
                  {iq.date && <p className="text-[10px] text-slate-500">Valid until: <strong>{new Date(iq.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong></p>}
                  {iq.docs?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {iq.docs.map(d => <span key={d} className="text-[10px] bg-slate-100 text-slate-600 rounded px-2 py-0.5">{d}</span>)}
                    </div>
                  )}
                  {!neg && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          const updated: NegotiationRecord = {
                            rounds: [{
                              round: 1,
                              targetPrice: iq.price,
                              currency: iq.currency,
                              sentAt: Date.now(),
                              sentBy: currentRole,
                              supplierResponse: { price: iq.price, currency: iq.currency, docs: iq.docs, submittedAt: Date.now() },
                            }],
                            approvedAt: Date.now(),
                            approvedBy: currentRole,
                            finalPrice: iq.price,
                            finalCurrency: iq.currency,
                          }
                          const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
                          all[npdId] = updated
                          localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
                          setEcnNegotiation(updated)
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1"
                      ><CheckCircle className="w-3.5 h-3.5" />Accept Supplier Initial Quote</button>
                    </div>
                  )}
                </div>
              )}

              {/* Round history */}
              {neg && neg.rounds.length > 0 && (
                <div className="space-y-2">
                  {neg.rounds.map(r => (
                    <div key={r.round} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Round {r.round}</span>
                        <span className="text-[10px] text-slate-400">{new Date(r.sentAt).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-slate-500">Target: <strong className="text-slate-800">{currSymbol(r.currency)}{parseFloat(r.targetPrice).toLocaleString("en-IN")}</strong></span>
                        {r.supplierResponse && (
                          <span className="text-slate-500">Supplier: <strong className="text-slate-800">{currSymbol(r.supplierResponse.currency)}{parseFloat(r.supplierResponse.price).toLocaleString("en-IN")}</strong></span>
                        )}
                      </div>
                      {r.supplierResponse && r.supplierResponse.docs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {r.supplierResponse.docs.map(d => (
                            <span key={d} className="text-[10px] bg-slate-100 text-slate-600 rounded px-2 py-0.5">{d}</span>
                          ))}
                        </div>
                      )}
                      {r.supplierResponse && (
                        <p className="text-[10px] text-slate-400">Submitted {new Date(r.supplierResponse.submittedAt).toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Approve / Counter — shown when supplier has responded and not yet approved */}
              {awaitingApproval && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const updated: NegotiationRecord = {
                        ...neg!,
                        approvedAt: Date.now(),
                        approvedBy: currentRole,
                        finalPrice: latestRound!.supplierResponse!.price,
                        finalCurrency: latestRound!.supplierResponse!.currency,
                      }
                      const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
                      all[npdId] = updated
                      localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
                      setEcnNegotiation(updated)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                  ><CheckCircle className="w-3.5 h-3.5" />Approve Price</button>
                  <button
                    onClick={() => {
                      setNegTargetPrice("")
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg"
                  >Counter with new target ↓</button>
                </div>
              )}

              {/* Send target form — only shown after supplier submits initial quote; no rounds yet OR counter clicked */}
              {iq && !approved && !pendingResponse && (!neg || awaitingApproval) && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-800">
                    {!neg ? "Start Price Negotiation" : `Send Counter Target (Round ${(neg.rounds.length) + 1})`}
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={negCurrency}
                      onChange={e => setNegCurrency(e.target.value as "INR" | "USD" | "EUR")}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="INR">INR ₹</option>
                      <option value="USD">USD $</option>
                      <option value="EUR">EUR €</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Target price / unit"
                      value={negTargetPrice}
                      onChange={e => setNegTargetPrice(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      disabled={!negTargetPrice || parseFloat(negTargetPrice) <= 0}
                      onClick={() => {
                        const existingRounds = neg?.rounds ?? []
                        const newRound: NegotiationRound = {
                          round: existingRounds.length + 1,
                          targetPrice: negTargetPrice,
                          currency: negCurrency,
                          sentAt: Date.now(),
                          sentBy: currentRole,
                        }
                        const updated: NegotiationRecord = { rounds: [...existingRounds, newRound] }
                        const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
                        all[npdId] = updated
                        localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
                        setEcnNegotiation(updated)
                        setNegTargetPrice("")
                      }}
                      className="bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                    >Send to Supplier</button>
                  </div>
                  <p className="text-[10px] text-slate-400">Share the same supplier portal link — it will show this target price.</p>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  // Stage 3
  if (activeStage >= 3) {
    const isActive = activeStage === 3
    const isDone   = activeStage > 3
    sourcingCards.push(
      <div key="src-s3" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-indigo-300 bg-indigo-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Send className="w-4 h-4 text-indigo-700 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 3 — Supplier Sample Dispatch</h4>
          <span className="text-xs text-slate-500 ml-1">Supplier: <strong>{npd.supplier}</strong></span>
          {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
          {isActive && sd && !sd.submission && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Awaiting Supplier</Badge>}
        </div>
        {isActive && !sd && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Send the dispatch portal link to <strong>{npd.supplier}</strong> to collect dispatch documents and price estimate.</p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Portal URL</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-blue-700 break-all flex-1">{portalUrl}</span>
                <button onClick={() => navigator.clipboard.writeText(portalUrl)} className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
              </div>
            </div>
            <button
              onClick={() => {
                const entry = { portalSentAt: Date.now(), sentBy: currentRole }
                const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_SOURCING_DISPATCH_KEY) ?? "{}")
                all[npdId] = entry
                localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all))
                setEcnSourcingDispatch(entry)
              }}
              className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-lg"
            >Send Dispatch Portal to Supplier</button>
          </div>
        )}
        {isActive && sd && !sd.submission && (
          <div className="space-y-2">
            <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Portal Link Sent</Badge>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Portal URL</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-blue-700 break-all flex-1">{portalUrl}</span>
                <button onClick={() => navigator.clipboard.writeText(portalUrl)} className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
              </div>
            </div>
            <p className="text-xs text-slate-400 italic">Waiting for {npd.supplier} to submit via portal…</p>
          </div>
        )}
        {(isDone || sd?.submission) && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Date</p>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">{sd?.submission?.dispatchDate ?? "—"}</p>
              </div>
              {ecnPriceEstimation && (
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Price / Unit</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">
                    {ecnPriceEstimation.currency === "INR" ? "₹" : ecnPriceEstimation.currency === "USD" ? "$" : "€"}{parseFloat(ecnPriceEstimation.pricePerUnit).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>
            {sd?.submission?.docs && sd.submission.docs.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sd.submission.docs.map((doc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200">
                    <FileText className="w-3 h-3 text-slate-400" />{doc}
                  </span>
                ))}
              </div>
            )}
            {/* Supplier status update */}
            {sd?.statusUpdate && (() => {
              const su = sd.statusUpdate!
              return (
                <div className={`rounded-lg border px-3 py-2.5 space-y-1.5 ${su.onTrack === "yes" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-center gap-2">
                    {su.onTrack === "yes"
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      : <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <span className={`text-xs font-semibold ${su.onTrack === "yes" ? "text-emerald-800" : "text-red-800"}`}>
                      Supplier: <strong>{su.onTrack === "yes" ? "On track" : "Not on track"}</strong>
                      {su.notes ? ` — ${su.notes}` : ""}
                    </span>
                  </div>
                  {su.onTrack === "no" && su.newDate && (
                    <div className="flex items-center justify-between gap-3 pl-5">
                      <div>
                        <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Proposed New Date</p>
                        <p className="text-xs font-semibold text-red-900">{new Date(su.newDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                      </div>
                      {su.dateApproved ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
                          ✓ Approved by {su.dateApproved.approvedBy}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            const approved = { approvedBy: currentRole, approvedAt: Date.now() }
                            const rawD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
                            const allD = rawD ? JSON.parse(rawD) : {}
                            allD[npdId] = {
                              ...allD[npdId],
                              statusUpdate: { ...su, dateApproved: approved },
                            }
                            localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(allD))
                            setEcnSourcingDispatch(prev => prev ? {
                              ...prev,
                              statusUpdate: { ...su, dateApproved: approved },
                            } : prev)
                          }}
                          className="text-[10px] font-bold bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded-lg whitespace-nowrap"
                        >Approve New Date</button>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    )
  }

  // Stages 4–6: read-only status
  if (activeStage >= 4) sourcingCards.push(
    <div key="src-s4" className={`rounded-xl border p-3 ${activeStage > 4 ? "bg-slate-50 border-slate-200" : "border-emerald-300 bg-emerald-50/30"}`}>
      <div className="flex items-center gap-2">
        {activeStage > 4 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-emerald-700 shrink-0" />}
        <h4 className="font-bold text-slate-800 text-sm">Stage 4 — R&D Testing</h4>
        {activeStage > 4 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
        {activeStage === 4 && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">In Progress</Badge>}
      </div>
    </div>
  )
  if (activeStage >= 5) sourcingCards.push(
    <div key="src-s5" className={`rounded-xl border p-3 ${activeStage > 5 ? "bg-slate-50 border-slate-200" : "border-cyan-300 bg-cyan-50/30"}`}>
      <div className="flex items-center gap-2">
        {activeStage > 5 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-cyan-700 shrink-0" />}
        <h4 className="font-bold text-slate-800 text-sm">Stage 5 — DQA Testing</h4>
        {activeStage > 5 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
        {activeStage === 5 && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">In Progress</Badge>}
      </div>
    </div>
  )
  if (activeStage >= 6) sourcingCards.push(
    <div key="src-s6" className={`rounded-xl border p-3 ${activeStage > 6 ? "bg-slate-50 border-slate-200" : "border-violet-300 bg-violet-50/30"}`}>
      <div className="flex items-center gap-2">
        {activeStage > 6 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-violet-700 shrink-0" />}
        <h4 className="font-bold text-slate-800 text-sm">Stage 6 — R&D Head Approval</h4>
        {activeStage > 6 && ecnHeadApproval?.verdict === "approved" && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Approved</Badge>}
        {activeStage === 6 && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Awaiting R&D Head</Badge>}
      </div>
    </div>
  )
  if (activeStage >= 6) {
    const isActive = activeStage === 7
    const isDone   = activeStage > 7
    sourcingCards.push(
      <div key="src-s7" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-orange-300 bg-orange-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-orange-500 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 7 — Plant Evaluation &amp; Testing</h4>
          <div className="ml-auto">
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
            {!isDone && !isActive && <Badge className="bg-slate-100 text-slate-400 border-none text-xs">Upcoming</Badge>}
            {isActive && !ecnPlantEval && <Badge className="bg-amber-100 text-amber-700 border-none text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D</Badge>}
            {isActive && ecnPlantEval && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
          </div>
        </div>
        {isActive && !ecnPlantEval && (
          <p className="text-xs text-slate-400 italic mt-2">R&D is running plant evaluation tests. No sourcing action required at this stage.</p>
        )}
        {ecnPlantEval && (
          <p className="text-xs text-emerald-700 font-medium mt-2">Plant evaluation submitted by {ecnPlantEval.submittedBy} · {new Date(ecnPlantEval.submittedAt).toLocaleString("en-IN")}</p>
        )}
      </div>
    )
  }
  if (activeStage >= 7) {
    const s8Done = activeStage >= 8
    sourcingCards.push(
      <div key="src-s8" className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${s8Done ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        {s8Done ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Circle className="w-4 h-4 text-slate-400 shrink-0" />}
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-700">Stage 8 — ECN Summary &amp; Closure</p>
          {s8Done && <p className="text-xs text-emerald-700 font-semibold mt-0.5">ECN Complete — All stages signed off</p>}
        </div>
        {!s8Done && <Badge className="bg-slate-100 text-slate-400 border-none text-xs">Upcoming</Badge>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ECN Sourcing Actions</span>
        <Badge className="bg-slate-100 text-slate-500 border-none text-xs">{getStageName(activeStage, npd.typeOfWork)}</Badge>
      </div>
      {[...sourcingCards].reverse()}
    </div>
  )
})()}

          {/* ── Section 1: Supplier Sourcing & Quotations (NCD/NPD only) ── */}
          {!isECN && !isAltSupplier && (activeStage < 2 ? (
            <Card className="transition-shadow duration-200 hover:shadow-md">
              <CardContent className="py-8 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Waiting for {moduleLabel(npd.typeOfWork)} request to be initiated</p>
                <p className="text-xs mt-1">This section unlocks once the request reaches Stage 2.</p>
              </CardContent>
            </Card>
          ) : activeStage === 8 ? (
            <Card className={`transition-shadow duration-200 hover:shadow-md border-orange-300`}>
              <CardHeader className="bg-orange-50 border-b border-orange-200 pb-3">
                <div className="flex items-center gap-2">
                  {ncdPpPricing ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-orange-500 shrink-0" />}
                  <CardTitle className="text-base">Stage 8 — PP Pricing</CardTitle>
                  {ncdPpPricing
                    ? <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Submitted</Badge>
                    : <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Action Required</Badge>}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {ncdPpPricing ? (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {([
                      ["Supplier", npd.supplier ?? "—"],
                      ["PP Price / Unit", `${ncdPpPricing.currency === "INR" ? "₹" : ncdPpPricing.currency === "USD" ? "$" : "€"}${parseFloat(ncdPpPricing.ppPrice).toLocaleString("en-IN")}`],
                      ["MOQ", ncdPpPricing.moq ? `${ncdPpPricing.moq} units` : "—"],
                      ["Lead Time", ncdPpPricing.leadTime ? `${ncdPpPricing.leadTime} days` : "—"],
                      ["Submitted By", ncdPpPricing.submittedBy],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-400 text-xs">{label}</span>
                        <span className="text-slate-800 font-medium text-xs text-right max-w-[160px] truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Enter the final production pricing for the approved supplier.</p>
                    <div className="flex gap-3">
                      <div className="w-28 shrink-0">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                        <select value={ncdPpCurrency} onChange={e => setNcdPpCurrency(e.target.value as "INR" | "USD" | "EUR")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                          <option value="INR">INR ₹</option>
                          <option value="USD">USD $</option>
                          <option value="EUR">EUR €</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">PP Price / Unit <span className="text-red-500">*</span></label>
                        <input type="number" min="0" step="0.01" placeholder="e.g. 140.00" value={ncdPpPrice} onChange={e => setNcdPpPrice(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">MOQ (units)</label>
                        <input type="number" min="1" placeholder="e.g. 500" value={ncdPpMoq} onChange={e => setNcdPpMoq(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Lead Time (days)</label>
                        <input type="number" min="1" placeholder="e.g. 30" value={ncdPpLeadTime} onChange={e => setNcdPpLeadTime(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                    </div>
                    <button
                      disabled={!ncdPpPrice || parseFloat(ncdPpPrice) <= 0}
                      onClick={() => {
                        const entry = { ppPrice: ncdPpPrice, currency: ncdPpCurrency, moq: ncdPpMoq, leadTime: ncdPpLeadTime, submittedBy: currentRole, submittedAt: Date.now() }
                        const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(NCD_PP_PRICING_KEY) ?? "{}")
                        all[npdId] = entry
                        localStorage.setItem(NCD_PP_PRICING_KEY, JSON.stringify(all))
                        setNcdPpPricing(entry)
                      }}
                      className="bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2"
                    ><CheckCircle className="w-3.5 h-3.5" />Submit PP Pricing</button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : activeStage > 8 ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">Sourcing Complete — {npd.supplier}</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {ncdPpPricing
                    ? `PP Pricing: ${ncdPpPricing.currency === "INR" ? "₹" : ncdPpPricing.currency === "USD" ? "$" : "€"}${parseFloat(ncdPpPricing.ppPrice).toLocaleString("en-IN")} / unit · MOQ: ${ncdPpPricing.moq || "—"} · Lead Time: ${ncdPpPricing.leadTime ? `${ncdPpPricing.leadTime}d` : "—"}`
                    : "Enquiry dispatched · Submission approved · Supplier locked in"}
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">Stage 8 ✓</span>
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
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">

                {/* ── R&D Request Brief ──────────────────────────────────────── */}
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  {/* Header bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-bold text-white tracking-wide uppercase">R&D Request Brief</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {sourcingApproved
                        ? <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Sourcing Signed Off
                          </span>
                        : <span className="text-[10px] font-semibold text-amber-300 border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 rounded-full">Awaiting Sign-off</span>
                      }
                    </div>
                  </div>

                  {/* Main fields grid */}
                  <div className="bg-white p-4">
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {([
                        ["Item",           npd.itemName],
                        ["Commodity",      npd.itemCategory],
                        ["Product Line",   npd.productLine],
                        ["Type of Work",   npd.typeOfWork.split(" (")[0]],
                        ["Priority",       npd.priority || "—"],
                        ["Mfg. Location",  npd.manufacturingLocation || "—"],
                        ["Sample Qty",     npd.sampleQty ? `${npd.sampleQty} pcs` : "—"],
                        ["Drawing",        npd.driveLink ? "Attached ↗" : "—"],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                          <p className="text-xs font-semibold text-slate-800 truncate">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* TAT breakdown */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-6">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">TAT — Development</p>
                        <p className="text-xs font-semibold text-slate-800">{npd.tatDevelopment ? `${npd.tatDevelopment}d` : "—"}</p>
                      </div>
                      <div className="text-slate-300 text-sm font-light">+</div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">TAT — Production</p>
                        <p className="text-xs font-semibold text-slate-800">{npd.tatProduction ? `${npd.tatProduction}d` : "—"}</p>
                      </div>
                      <div className="text-slate-300 text-sm font-light">=</div>
                      <div className="bg-blue-50 border border-blue-100 rounded px-2.5 py-1">
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Total TAT</p>
                        <p className="text-xs font-bold text-blue-800">{npd.totalTat ? `${npd.totalTat} days` : "—"}</p>
                      </div>
                    </div>

                    {npd.remarks && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Remarks from R&D
                        </p>
                        <p className="text-xs text-slate-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 leading-relaxed">{npd.remarks}</p>
                      </div>
                    )}
                  </div>

                  {/* ── Sign-off / TAT Extension footer ── */}
                  {sourcingApproved ? (
                    /* ✓ Already signed off */
                    <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-3 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-800">
                        Signed off by {sourcingApprovedBy}
                        <span className="font-normal text-emerald-600 ml-1">· {sourcingApprovedAt}</span>
                      </p>
                    </div>

                  ) : tatExtReqPending ? (
                    /* ⏳ Extension sent, waiting for R&D */
                    <div className="border-t border-amber-200 bg-amber-50 px-5 py-3.5 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">Waiting for R&D approval</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          TAT extension of <span className="font-bold">+{tatExtReqDays} days</span> has been sent to R&D.
                          Sign-off is on hold until they respond.
                        </p>
                        <p className="text-[10px] text-amber-500 mt-1">Requested: {tatExtReqAt}</p>
                      </div>
                    </div>

                  ) : sourcingTatExtendOpen ? (
                    /* 📋 TAT Extension form — sign-off hidden entirely */
                    <div className="border-t border-blue-200 bg-blue-50 px-5 py-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TimerReset className="w-4 h-4 text-blue-600" />
                          <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Request TAT Extension</p>
                        </div>
                        <button
                          onClick={() => { setSourcingTatExtendOpen(false); setSourcingTatDays(""); setSourcingTatReason("") }}
                          className="text-[10px] font-semibold text-blue-400 hover:text-blue-700 transition-colors"
                        >
                          ✕ Cancel
                        </button>
                      </div>

                      {tatExtRndDecision === "rejected" && (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded px-3 py-2">
                          <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <p className="text-[11px] text-red-700">Previous request was rejected. You can submit a new one.</p>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-blue-500 uppercase tracking-widest block">Days to add</label>
                          <input
                            type="number"
                            min={1}
                            value={sourcingTatDays}
                            onChange={e => setSourcingTatDays(e.target.value)}
                            placeholder="e.g. 10"
                            className="w-24 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[9px] font-bold text-blue-500 uppercase tracking-widest block">Reason <span className="text-blue-400 font-normal normal-case">(required)</span></label>
                          <input
                            type="text"
                            value={sourcingTatReason}
                            onChange={e => setSourcingTatReason(e.target.value)}
                            placeholder="e.g. Vendor lead time is longer than expected"
                            className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                      </div>

                      {sourcingTatDays && parseInt(sourcingTatDays) > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-blue-500">Current TAT:</span>
                          <span className="font-semibold text-slate-700">{npd.totalTat ?? 0}d</span>
                          <span className="text-blue-400">→</span>
                          <span className="font-bold text-blue-800">{(npd.totalTat ?? 0) + parseInt(sourcingTatDays)}d</span>
                          <span className="text-blue-500">(+{sourcingTatDays}d)</span>
                        </div>
                      )}

                      <button
                        onClick={handleTatExtensionRequest}
                        disabled={!sourcingTatDays || parseInt(sourcingTatDays) <= 0 || !sourcingTatReason.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all text-white text-sm font-bold px-4 py-2.5 rounded-lg"
                      >
                        <Send className="w-4 h-4" /> Send Extension Request to R&D
                      </button>
                    </div>

                  ) : (
                    /* Default: sign-off row with TAT extension trigger */
                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-3">
                      {tatExtRndDecision === "rejected" && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 shrink-0">
                          <XCircle className="w-3 h-3" /> Extension rejected
                        </span>
                      )}
                      <input
                        type="text"
                        value={sourcingApprovalNote}
                        onChange={e => setSourcingApprovalNote(e.target.value)}
                        placeholder="Sign-off note (optional)"
                        className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-0"
                      />
                      <button
                        onClick={() => setSourcingTatExtendOpen(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 border border-slate-200 hover:border-blue-300 bg-white rounded-md px-3 py-1.5 transition-colors shrink-0"
                      >
                        <TimerReset className="w-3.5 h-3.5" /> Request TAT Extension
                      </button>
                      <button
                        onClick={handleSourcingApprove}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white text-xs font-bold px-4 py-1.5 rounded-md shrink-0"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Sign Off
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Vendor selection + NDA + Quotations: locked until sourcing signs off ── */}
                {!sourcingApproved && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-8 text-center">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-500">Vendor selection is locked</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {tatExtReqPending
                        ? "Waiting for R&D to approve the TAT extension request."
                        : "Sign off on the R&D request above to unlock vendor assignment."}
                    </p>
                  </div>
                )}
                {sourcingApproved && (<>
                {/* ── Vendor selection table (Nova: compact 4-col) ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700">
                      Vendor Registry — <span className="font-normal text-slate-500">{npd.itemCategory}</span>
                    </h3>
                    <span className="text-xs text-slate-400">{selectedVendors.size} selected · {vendors.length} available</span>
                  </div>

                  {vendors.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-slate-400">
                      <p className="text-sm font-medium">No vendors in registry for this commodity.</p>
                      <p className="text-xs mt-1">Use "Add New Vendor" below to onboard one.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="w-10 px-3 py-2.5 text-center"></th>
                            <th className="px-3 py-2.5 text-left">Vendor</th>
                            <th className="px-3 py-2.5 text-left">SPOC</th>
                            <th className="px-3 py-2.5 text-left">Score / Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vendors.map(v => {
                            const isSelected = selectedVendors.has(v.company_name)
                            return (
                              <tr
                                key={v.company_name}
                                onClick={() => setSelectedVendors(prev => {
                                  const next = new Set(prev)
                                  if (next.has(v.company_name)) next.delete(v.company_name)
                                  else next.add(v.company_name)
                                  return next
                                })}
                                className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50 hover:bg-blue-50" : "hover:bg-slate-50"}`}
                              >
                                <td className="px-3 py-3 text-center">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mx-auto transition-colors ${isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                                    {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-900 text-[13px]">{v.company_name}</span>
                                    {v.isRequested && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">NEW</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  {v.contact_person_name ? (
                                    <div>
                                      <p className="text-[12px] font-semibold text-slate-800">{v.contact_person_name}</p>
                                      {v.phone_number && <p className="text-[10px] text-slate-400 mt-0.5">{v.phone_number}</p>}
                                    </div>
                                  ) : <span className="text-[11px] text-slate-400 italic">—</span>}
                                </td>
                                <td className="px-3 py-3">
                                  {v.isRequested ? (
                                    <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">Pending NDA</span>
                                  ) : (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Active</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add New Vendor — below the table */}
                  {!newVendorFormOpen ? (
                    <button
                      type="button"
                      onClick={() => setNewVendorFormOpen(true)}
                      className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900 border border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 rounded-lg py-2.5 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" /> Add New Vendor
                    </button>
                  ) : (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-blue-900">New Vendor Details</p>
                        <p className="text-[10px] text-blue-500">NDA will be required before RFQ</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vendor Name <span className="text-red-500">*</span></label>
                          <input type="text" placeholder="e.g. ABC Components Pvt Ltd"
                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:ring-blue-500 focus:border-blue-500"
                            value={newVendorName} onChange={e => setNewVendorName(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">SPOC Name</label>
                          <input type="text" placeholder="Contact person"
                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:ring-blue-500 focus:border-blue-500"
                            value={newVendorContact} onChange={e => setNewVendorContact(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile No.</label>
                          <input type="tel" placeholder="+91 XXXXX XXXXX"
                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:ring-blue-500 focus:border-blue-500"
                            value={newVendorPhone} onChange={e => setNewVendorPhone(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={!newVendorName.trim()} onClick={handleAddNewVendor}
                          className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded px-3 py-1.5 transition-colors">
                          Add to List
                        </button>
                        <button type="button" onClick={() => setNewVendorFormOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>


                {/* NDA + Dispatch RFQ */}
                {!enquiryDispatched ? (
                  <div className="space-y-4">
                    {/* For NCD with no new vendors: direct dispatch (no NDA required) */}
                    {!ndaRequired ? (
                      <div className={`rounded-lg border p-5 ${selectedVendors.size === 0 ? "bg-slate-50 border-slate-200" : "bg-blue-50 border-blue-200"}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                              <Mail className="w-4 h-4 text-blue-600" /> Dispatch Bulk Enquiry (RFQ)
                            </h4>
                            <p className="text-xs mt-1 text-slate-600 max-w-lg">
                              Send RFQ emails and portal links directly to selected vendors. NDA is not required for component development requests.
                            </p>
                            {selectedVendors.size === 0 && (
                              <p className="text-xs mt-1 text-amber-700 font-semibold">Select at least one vendor above first.</p>
                            )}
                          </div>
                          <Button
                            onClick={dispatchEnquiry}
                            disabled={selectedVendors.size === 0}
                            className="bg-blue-700 hover:bg-blue-800 text-white min-w-[160px] shrink-0"
                          >
                            <Mail className="w-4 h-4 mr-2" /> Dispatch to {selectedVendors.size} Vendor{selectedVendors.size !== 1 ? "s" : ""}
                          </Button>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-4">
                    {/* Step A: Send NDA */}
                    <div className={`rounded-lg border p-5 ${ndaSent ? "bg-slate-50 border-slate-200" : "bg-amber-50 border-amber-200"}`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h4 className={`font-bold flex items-center gap-2 ${ndaSent ? "text-slate-700" : "text-amber-900"}`}>
                            {ndaSent
                              ? <><CheckCircle className="w-4 h-4 text-emerald-500" /> Step 1 — NDA Sent</>
                              : <><ShieldCheck className="w-4 h-4 text-amber-700" /> Step 1 — Send NDA to Vendors</>}
                          </h4>
                          <p className="text-xs mt-1 max-w-lg text-slate-600">
                            {ndaSent
                              ? "NDA links have been sent. Waiting for all selected vendors to digitally sign before the RFQ is unlocked."
                              : "Vendors must sign a Non-Disclosure Agreement before receiving any specification or drawing information. Send the NDA links first."}
                          </p>
                          {selectedVendors.size === 0 && (
                            <p className="text-xs mt-1 text-amber-700 font-semibold">Select at least one vendor above first.</p>
                          )}
                        </div>
                        {!ndaSent && (
                          <Button
                            onClick={sendNdas}
                            disabled={selectedVendors.size === 0}
                            className="bg-amber-600 hover:bg-amber-700 text-white min-w-[160px] shrink-0"
                          >
                            <ShieldCheck className="w-4 h-4 mr-2" /> Send NDA ({selectedVendors.size})
                          </Button>
                        )}
                      </div>

                      {/* NDA status per vendor */}
                      {ndaSent && (
                        <div className="mt-4 space-y-3">
                          {Array.from(selectedVendors).map(vName => {
                            const status = ndaStatuses[vName]
                            const ndaUrl = `${baseUrl}/supplier/nda/${npdId}?vendor=${encodeURIComponent(vName)}`
                            const vendorRecord = allVendors.find(v => v.company_name === vName)
                            const vendorSpocName = vendorRecord?.contact_person_name ?? vName
                            const vendorSpocEmail = vendorRecord?.email ?? ""

                            // Email sent TO vendor asking them to sign (pending state)
                            const ndaInviteBody = `<p>Dear <strong>${vendorSpocName}</strong>,</p><p>Amber Enterprises India Limited is initiating a new development project and would like to engage <strong>${vName}</strong> as a potential partner.</p><p>Before we can share any technical specifications or project details, we require your organisation to sign a <strong>Non-Disclosure Agreement (NDA)</strong> to protect the confidentiality of the information involved.</p><p>Please use the link below to review and digitally sign the NDA at your earliest convenience to proceed with this project.</p><div style="margin:16px 0;"><a href="${ndaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Review &amp; Sign NDA →</a></div><p>Should you have any questions before signing, please do not hesitate to reach out.</p><p>Regards,<br/><strong>${npd.spoc}</strong><br/><span style="color:#64748b;font-size:12px">Sourcing Team, Amber Enterprises India Limited</span></p>`

                            // Email sent TO sourcing once vendor signs (internal notification)
                            const ndaSignedToSourcingBody = `<p>Dear <strong>${npd.spoc}</strong>,</p><p>This is to inform you that <strong>${vName}</strong> has successfully signed the Non-Disclosure Agreement for the project referenced below.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px"><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;width:40%">Vendor</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${vName}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Signed By</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${status?.signedBy ?? "—"}</td></tr><tr style="background:#f8fafc"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">Signed At</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${status?.signedAt ?? "—"}</td></tr><tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:600">${moduleLabel(npd.typeOfWork)} Reference</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${npdId}</td></tr></table><p>You may now proceed with sharing the project specifications with this vendor.</p><p>Regards,<br/><strong>Amber Portal</strong><br/><span style="color:#64748b;font-size:12px">Automated notification — Amber Enterprises India Limited</span></p>`

                            // Confirmation email sent TO vendor after signing
                            const ndaSignedToVendorBody = `<p>Dear <strong>${vendorSpocName}</strong>,</p><p>Thank you for signing the Non-Disclosure Agreement with <strong>Amber Enterprises India Limited</strong>. Your digital signature has been successfully recorded on <strong>${status?.signedAt ?? "—"}</strong>.</p><p>You are now authorised to receive confidential project specifications. Our sourcing team will be in touch with further details shortly.</p><p>We look forward to working with you on this project.</p><p>Regards,<br/><strong>${npd.spoc}</strong><br/><span style="color:#64748b;font-size:12px">Sourcing Team, Amber Enterprises India Limited</span></p>`

                            return (
                              <div key={vName} className={`rounded-lg border ${status?.signed ? "border-emerald-200" : "border-slate-200"}`}>
                                <div className={`flex items-center justify-between gap-3 px-3 py-2.5 ${status?.signed ? "bg-emerald-50" : "bg-white"}`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    {status?.signed
                                      ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                      : <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-800 truncate">{vName}</p>
                                      {status?.signed
                                        ? <p className="text-[11px] text-emerald-700">Signed by {status.signedBy} · {status.signedAt}</p>
                                        : <p className="text-[11px] text-amber-700">Pending signature</p>}
                                    </div>
                                  </div>
                                  {!status?.signed && (
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        onClick={() => { navigator.clipboard.writeText(ndaUrl); setCopiedVendor(`nda-${vName}`); setTimeout(() => setCopiedVendor(null), 2000) }}
                                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                                      >
                                        <Copy className="w-3 h-3" />
                                        {copiedVendor === `nda-${vName}` ? "Copied!" : "Copy NDA Link"}
                                      </button>
                                      <a href={ndaUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-700">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  )}
                                </div>

                                {/* Pending: show NDA invitation email that was sent to vendor */}
                                {!status?.signed && (
                                  <div className="border-t border-slate-100">
                                    <div className="px-3 pt-2 pb-1">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Sent to Vendor</p>
                                    </div>
                                    <EmailCard
                                      to={vendorSpocEmail || vName}
                                      subject={`NDA Required — Please Sign to Proceed · ${npdId}`}
                                      body={ndaInviteBody}
                                    />
                                  </div>
                                )}

                                {/* Signed: show sourcing notification + vendor confirmation */}
                                {status?.signed && (
                                  <div className="border-t border-emerald-100 space-y-0">
                                    <div className="px-3 pt-2 pb-1">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notification to Sourcing</p>
                                    </div>
                                    <EmailCard
                                      to={npd.spoc}
                                      subject={`NDA Signed — ${vName} · ${npdId}`}
                                      body={ndaSignedToSourcingBody}
                                    />
                                    <div className="px-3 pt-3 pb-1 border-t border-emerald-100">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmation to Vendor</p>
                                    </div>
                                    <EmailCard
                                      to={vendorSpocEmail || vName}
                                      subject={`NDA Acknowledged — Amber Enterprises India Limited · ${npdId}`}
                                      body={ndaSignedToVendorBody}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Step B: RFQ — auto-dispatched once all NDAs signed */}
                    <div className={`rounded-lg border p-4 flex items-center gap-3 ${!ndaSent ? "opacity-50 pointer-events-none bg-slate-50 border-slate-200" : allNdasSigned ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
                      {allNdasSigned
                        ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <Clock className="w-4 h-4 text-slate-400 shrink-0" />}
                      <div>
                        <p className={`text-sm font-bold ${allNdasSigned ? "text-blue-900" : "text-slate-500"}`}>
                          Step 2 — Bulk Enquiry {allNdasSigned ? "Auto-Dispatched" : "(Waiting for NDAs)"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {allNdasSigned
                            ? "RFQ emails and portal links have been automatically sent to all vendors upon NDA completion."
                            : "RFQ will be dispatched automatically once all vendors sign the NDA."}
                        </p>
                      </div>
                    </div>
                  </div>
                    )}
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
                {/* ── Price Negotiation (per-vendor) ── */}
                {isSpocOrSourcing && enquiryDispatched && displayQuotations.filter(v => {
                  const live = liveQuotes[v.vendorName]
                  const isSubmitted = live ? live.status !== "re_negotiation" : v.status === "submitted"
                  const priceVal = live ? live.formValues.estimatedPrice : null
                  return isSubmitted && priceVal
                }).length > 0 && (
                  <div className="border-t border-slate-200 pt-4 mt-2 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Price Negotiation</span>
                      <span className="text-[10px] text-slate-400">per vendor</span>
                    </div>
                    {displayQuotations.map(v => {
                      const live = liveQuotes[v.vendorName]
                      const isSubmitted = live ? live.status !== "re_negotiation" : v.status === "submitted"
                      const priceVal = live ? live.formValues.estimatedPrice : null
                      const approval = quoteApprovals[v.vendorName]
                      if (!isSubmitted || !priceVal || approval) return null

                      const neg = priceNegData[v.vendorName]
                      const latestRound = neg?.rounds[neg.rounds.length - 1]
                      const pendingResponse = latestRound && !latestRound.supplierResponse
                      const awaitingApproval = latestRound?.supplierResponse && !neg?.approvedAt
                      const negApproved = !!neg?.approvedAt
                      const currSymbol = (c: string) => c === "INR" ? "₹" : c === "USD" ? "$" : "€"

                      return (
                        <div key={v.vendorName} className="rounded-lg border border-slate-200 bg-white px-4 py-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800">{v.vendorName}</span>
                            {negApproved ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                Agreed: {currSymbol(neg!.finalCurrency!)}{parseFloat(neg!.finalPrice!).toLocaleString("en-IN")}
                              </span>
                            ) : pendingResponse ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                Awaiting Supplier — Round {latestRound.round}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Quote received</span>
                            )}
                          </div>

                          {/* Supplier initial quote - accept */}
                          {!neg && !negApproved && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 space-y-1.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier Initial Quote</p>
                              <p className="text-sm font-bold text-slate-800">₹{parseFloat(priceVal).toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">/ unit</span></p>
                              <button
                                onClick={() => {
                                  const updated: NegotiationRecord = {
                                    rounds: [{ round: 1, targetPrice: priceVal, currency: "INR", sentAt: Date.now(), sentBy: currentRole, supplierResponse: { price: priceVal, currency: "INR", docs: [], submittedAt: Date.now() } }],
                                    approvedAt: Date.now(), approvedBy: currentRole, finalPrice: priceVal, finalCurrency: "INR",
                                  }
                                  const raw = localStorage.getItem(PRICE_NEG_KEY)
                                  const all: Record<string, Record<string, NegotiationRecord>> = raw ? JSON.parse(raw) : {}
                                  if (!all[npdId]) all[npdId] = {}
                                  all[npdId][v.vendorName] = updated
                                  localStorage.setItem(PRICE_NEG_KEY, JSON.stringify(all))
                                  setPriceNegData(prev => ({ ...prev, [v.vendorName]: updated }))
                                  setVendorApproval(v.vendorName, "approved")
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                              ><CheckCircle className="w-3 h-3 mr-1" />Accept Quote</button>
                            </div>
                          )}

                          {/* Round history */}
                          {neg && neg.rounds.length > 0 && (
                            <div className="space-y-1.5">
                              {neg.rounds.map(r => (
                                <div key={r.round} className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs space-y-0.5">
                                  <div className="flex justify-between">
                                    <span className="font-bold text-slate-500">Round {r.round}</span>
                                    <span className="text-slate-400">{new Date(r.sentAt).toLocaleString("en-IN")}</span>
                                  </div>
                                  <span className="text-slate-500">Target: <strong className="text-slate-800">{currSymbol(r.currency)}{parseFloat(r.targetPrice).toLocaleString("en-IN")}</strong></span>
                                  {r.supplierResponse && (
                                    <span className="ml-3 text-slate-500">Supplier: <strong className="text-slate-800">{currSymbol(r.supplierResponse.currency)}{parseFloat(r.supplierResponse.price).toLocaleString("en-IN")}</strong></span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Approve / Counter */}
                          {awaitingApproval && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const updated: NegotiationRecord = { ...neg!, approvedAt: Date.now(), approvedBy: currentRole, finalPrice: latestRound!.supplierResponse!.price, finalCurrency: latestRound!.supplierResponse!.currency }
                                  const raw = localStorage.getItem(PRICE_NEG_KEY)
                                  const all: Record<string, Record<string, NegotiationRecord>> = raw ? JSON.parse(raw) : {}
                                  if (!all[npdId]) all[npdId] = {}
                                  all[npdId][v.vendorName] = updated
                                  localStorage.setItem(PRICE_NEG_KEY, JSON.stringify(all))
                                  setPriceNegData(prev => ({ ...prev, [v.vendorName]: updated }))
                                  setVendorApproval(v.vendorName, "approved")
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                              ><CheckCircle className="w-3 h-3 mr-1" />Approve Price</button>
                              <button
                                onClick={() => setNegTargetPrice("")}
                                className="text-xs font-semibold text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg"
                              >Counter ↓</button>
                            </div>
                          )}

                          {/* Send target form */}
                          {priceVal && !negApproved && !pendingResponse && (!neg || awaitingApproval) && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                              <p className="text-xs font-semibold text-blue-800">
                                {!neg ? "Start Price Negotiation" : `Send Counter Target (Round ${(neg.rounds.length) + 1})`}
                              </p>
                              <div className="flex gap-2">
                                <select
                                  value={negCurrency}
                                  onChange={e => setNegCurrency(e.target.value as "INR" | "USD" | "EUR")}
                                  className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                >
                                  <option value="INR">INR ₹</option>
                                  <option value="USD">USD $</option>
                                  <option value="EUR">EUR €</option>
                                </select>
                                <input
                                  type="number" min="0" step="0.01"
                                  placeholder="Target price / unit"
                                  value={negTargetPrice}
                                  onChange={e => setNegTargetPrice(e.target.value)}
                                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                />
                                <button
                                  disabled={!negTargetPrice || parseFloat(negTargetPrice) <= 0}
                                  onClick={() => {
                                    const existingRounds = neg?.rounds ?? []
                                    const newRound: NegotiationRound = {
                                      round: existingRounds.length + 1,
                                      targetPrice: negTargetPrice,
                                      currency: negCurrency,
                                      sentAt: Date.now(),
                                      sentBy: currentRole,
                                    }
                                    const updated: NegotiationRecord = { rounds: [...existingRounds, newRound] }
                                    const raw = localStorage.getItem(PRICE_NEG_KEY)
                                    const all: Record<string, Record<string, NegotiationRecord>> = raw ? JSON.parse(raw) : {}
                                    if (!all[npdId]) all[npdId] = {}
                                    all[npdId][v.vendorName] = updated
                                    localStorage.setItem(PRICE_NEG_KEY, JSON.stringify(all))
                                    setPriceNegData(prev => ({ ...prev, [v.vendorName]: updated }))
                                    setNegTargetPrice("")
                                  }}
                                  className="bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                                >Send to Supplier</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                </>)}
                </CardContent>
              </Card>


              {/* === VENDOR QUOTATIONS === */}
              <div className="space-y-4">
          {displayQuotations.length === 0 ? (
            <Card className="transition-shadow duration-200 hover:shadow-md">
              <CardContent className="py-16 text-center text-slate-400">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No submissions yet.</p>
                <p className="text-xs mt-1">Send a Bulk Enquiry from the Supplier Sourcing Workflow tab first.</p>
              </CardContent>
            </Card>
          ) : (
            <>

              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Vendors",       value: displayQuotations.length,                                                                                                                                                              color: "text-slate-900" },
                  { label: "Submissions Received", value: displayQuotations.filter(v => { const l = liveQuotes[v.vendorName]; return l ? l.status !== "re_negotiation" : v.status === "submitted" }).length,  color: "text-blue-700"  },
                  { label: "Awaiting Response",   value: displayQuotations.filter(v => { const l = liveQuotes[v.vendorName]; return l ? l.status === "re_negotiation" : v.status === "pending" }).length,     color: "text-amber-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Agreed Prices from negotiation */}
              {(() => {
                const agreedVendors = displayQuotations.filter(v => priceNegData[v.vendorName]?.approvedAt)
                if (agreedVendors.length === 0) return null
                return (
                  <div className="grid grid-cols-1 gap-2">
                    {agreedVendors.map(v => {
                      const neg = priceNegData[v.vendorName]!
                      return (
                        <div key={v.vendorName} className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-emerald-800">Price Agreed — {v.vendorName}</p>
                            <p className="text-sm font-bold text-emerald-900">₹{parseFloat(neg.finalPrice!).toLocaleString("en-IN")} <span className="text-xs font-normal text-emerald-600">/ unit</span></p>
                          </div>
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-full shrink-0">Negotiated</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

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
                const priceVal    = live ? live.formValues.estimatedPrice : null
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
                            <Clock className="w-3.5 h-3.5" /> Awaiting Response
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
                                const vRec2 = allVendors.find(vv => vv.company_name === v.vendorName)
                                const vSpoc2 = vRec2?.contact_person_name ?? v.vendorName
                                const rndUser2 = npd.raisedBy === "rnd_head" ? DEFAULT_RND_HEAD.name : DEFAULT_RND_CONTACT.name
                                return `<p>Dear <strong>${vSpoc2}</strong>,</p><p>Thank you for your query regarding <strong>${npd.itemName}</strong> (${npdId}). Our R&amp;D team has reviewed it and provided the following clarification:</p><blockquote style="border-left:3px solid #1e3a5f;margin:12px 0;padding:8px 14px;background:#f8fafc;color:#1e293b;font-style:italic">${live.query}</blockquote><p><strong>R&amp;D Response:</strong><br/>${live.rndReply}</p>${live.rndReplyDoc ? `<p style="font-size:12px;color:#64748b">Attached document: ${live.rndReplyDoc}</p>` : ""}<p>Based on this clarification, kindly re-assess your feasibility and submit your updated response using the link below.</p><div style="margin:16px 0;"><a href="${portalUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Re-Assess &amp; Submit Response →</a></div><p>Regards,<br/><strong>${rndUser2}</strong></p>`
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

                        {/* Dispatch status response from vendor — negotiation loop */}
                        {(() => {
                          const status = vendorStatuses[v.vendorName]
                          if (!status) return null
                          const dateApprEntry   = dateApprovals[v.vendorName]
                          const dateDecision    = dateApprEntry?.decision
                          const decidedAt       = dateApprEntry?.decidedAt
                          const neg             = status.negotiationStatus
                          const isResolved      = !!dateDecision
                          const isCounterOpen   = counterOpen[v.vendorName]

                          const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""

                          return (
                            <div className={`mb-3 rounded-xl border p-3 space-y-2.5 text-xs animate-in fade-in duration-200 ${
                              status.onTime || dateDecision === "approved" ? "bg-emerald-50 border-emerald-200" :
                              dateDecision === "rejected"                  ? "bg-red-50 border-red-200" :
                              neg === "sourcing_countered"                 ? "bg-blue-50 border-blue-200" :
                                                                             "bg-amber-50 border-amber-200"
                            }`}>

                              {/* Header */}
                              <p className={`font-bold flex items-center gap-1.5 ${
                                status.onTime || dateDecision === "approved" ? "text-emerald-800" :
                                dateDecision === "rejected"                  ? "text-red-700" :
                                neg === "sourcing_countered"                 ? "text-blue-800" :
                                                                               "text-amber-800"
                              }`}>
                                {status.onTime || dateDecision === "approved" ? <CheckCircle className="w-3.5 h-3.5" /> :
                                 dateDecision === "rejected"                  ? <XCircle className="w-3.5 h-3.5" /> :
                                 neg === "sourcing_countered"                 ? <MessageSquare className="w-3.5 h-3.5" /> :
                                                                                <AlertCircle className="w-3.5 h-3.5" />}
                                {status.onTime                             ? "Vendor: On Track" :
                                 dateDecision === "approved"               ? "Date Accepted" :
                                 dateDecision === "rejected"               ? "Date Rejected" :
                                 neg === "sourcing_countered"              ? "Counter-proposal Sent — Awaiting Supplier" :
                                 neg === "supplier_final"                  ? "Supplier Final Proposal (Round 2)" :
                                                                             "Date Change Requested — Action Required"}
                                <span className="font-normal text-slate-400 ml-auto">
                                  {decidedAt ?? status.respondedAt}
                                </span>
                              </p>

                              {/* Round 1: supplier's proposed date */}
                              {!status.onTime && status.newDate && (
                                <div className="bg-white/70 rounded-lg px-3 py-2 space-y-0.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier Proposed</p>
                                  <p className="font-semibold text-slate-800">{fmtDate(status.newDate)}</p>
                                  {status.notes && <p className="text-slate-500 italic">"{status.notes}"</p>}
                                </div>
                              )}

                              {/* Sourcing counter-proposal (shown after counter sent) */}
                              {neg === "sourcing_countered" && status.sourcingCounterDate && (
                                <div className="bg-white/70 rounded-lg px-3 py-2 space-y-0.5 border border-blue-100">
                                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Your Counter-Proposal</p>
                                  <p className="font-semibold text-blue-900">{fmtDate(status.sourcingCounterDate)}</p>
                                  {status.sourcingCounterMsg && <p className="text-slate-500 italic">"{status.sourcingCounterMsg}"</p>}
                                </div>
                              )}

                              {/* Round 2: supplier's final date */}
                              {neg === "supplier_final" && status.supplierFinalDate && (
                                <div className="bg-white/70 rounded-lg px-3 py-2 space-y-0.5 border border-amber-100">
                                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Supplier Final (Round 2)</p>
                                  <p className="font-semibold text-amber-900">{fmtDate(status.supplierFinalDate)}</p>
                                  {status.supplierFinalNotes && <p className="text-slate-500 italic">"{status.supplierFinalNotes}"</p>}
                                </div>
                              )}

                              {/* Actions */}
                              {!isResolved && !status.onTime && (
                                <>
                                  {/* Round 1 actions: Accept / Counter / Reject */}
                                  {!neg && !isCounterOpen && (
                                    <div className="flex gap-2 pt-1 border-t border-amber-200 flex-wrap">
                                      <button onClick={() => setDateApproval(v.vendorName, "rejected")}
                                        className="flex items-center gap-1.5 font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors">
                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                      </button>
                                      <button onClick={() => setCounterOpen(prev => ({ ...prev, [v.vendorName]: true }))}
                                        className="flex items-center gap-1.5 font-semibold text-blue-700 border border-blue-200 bg-white hover:bg-blue-50 rounded-lg px-3 py-1.5 transition-colors">
                                        <MessageSquare className="w-3.5 h-3.5" /> Counter-propose
                                      </button>
                                      <button onClick={() => setDateApproval(v.vendorName, "approved")}
                                        className="flex items-center gap-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5 transition-colors">
                                        <CheckCircle className="w-3.5 h-3.5" /> Accept
                                      </button>
                                    </div>
                                  )}

                                  {/* Counter-propose inline form */}
                                  {!neg && isCounterOpen && (
                                    <div className="pt-2 border-t border-amber-200 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                      <p className="font-bold text-blue-800">Propose a Counter Date</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Date <span className="text-red-500">*</span></label>
                                          <input type="date" value={counterDate[v.vendorName] ?? ""} onChange={e => setCounterDate(prev => ({ ...prev, [v.vendorName]: e.target.value }))}
                                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Message to Supplier</label>
                                          <input type="text" value={counterMsg[v.vendorName] ?? ""} onChange={e => setCounterMsg(prev => ({ ...prev, [v.vendorName]: e.target.value }))}
                                            placeholder="e.g. R&D needs samples by this date"
                                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => setCounterOpen(prev => ({ ...prev, [v.vendorName]: false }))}
                                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg px-3 py-1.5 transition-colors">Cancel</button>
                                        <button onClick={() => submitCounterProposal(v.vendorName)} disabled={!counterDate[v.vendorName]}
                                          className="flex-1 bg-blue-900 hover:bg-blue-800 active:scale-[0.98] transition-transform disabled:opacity-40 text-white font-semibold rounded-lg px-3 py-1.5">
                                          Send Counter-proposal
                                        </button>
                                      </div>
                                      <p className="text-[9px] text-slate-400">Round 1 of 2 — supplier will see this on their portal</p>
                                    </div>
                                  )}

                                  {/* Waiting for supplier to respond to counter */}
                                  {neg === "sourcing_countered" && (
                                    <p className="text-[10px] text-blue-600 font-semibold pt-1 border-t border-blue-100">
                                      Awaiting supplier's response to your counter-proposal…
                                    </p>
                                  )}

                                  {/* Round 2: only Accept or Reject, no more countering */}
                                  {neg === "supplier_final" && (
                                    <div className="flex gap-2 pt-1 border-t border-amber-200">
                                      <button onClick={() => setDateApproval(v.vendorName, "rejected")}
                                        className="flex items-center gap-1.5 font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors">
                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                      </button>
                                      <button onClick={() => setDateApproval(v.vendorName, "approved")}
                                        className="flex items-center gap-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5 transition-colors">
                                        <CheckCircle className="w-3.5 h-3.5" /> Accept Final Date
                                      </button>
                                      <span className="ml-auto text-[9px] text-slate-400 self-center">Max rounds reached</span>
                                    </div>
                                  )}
                                </>
                              )}

                              {isResolved && (
                                <button onClick={() => setDateApproval(v.vendorName, dateDecision === "approved" ? "rejected" : "approved")}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 underline">
                                  Change decision
                                </button>
                              )}

                            </div>
                          )
                        })()}

                        {/* Reminder email draft — hidden only when vendor confirms on track */}
                        {isSpocOrSourcing && isSubmitted && supplyVal && vendorStatuses[v.vendorName]?.onTime !== true && (() => {
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

                        {/* Price Negotiation — styled like ECN */}
                        {isSpocOrSourcing && isSubmitted && priceVal && !approval && (() => {
                          const neg = priceNegData[v.vendorName]
                          const latestRound = neg?.rounds[neg.rounds.length - 1]
                          const pendingResponse = latestRound && !latestRound.supplierResponse
                          const awaitingApproval = latestRound?.supplierResponse && !neg?.approvedAt
                          const negApproved = !!neg?.approvedAt
                          const currSymbol = (c: string) => c === "INR" ? "₹" : c === "USD" ? "$" : "€"

                          return (
                            <div className="mt-4 border-t border-slate-200 pt-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price Negotiation — {v.vendorName}</span>
                                {negApproved && <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Agreed: {currSymbol(neg!.finalCurrency!)}{parseFloat(neg!.finalPrice!).toLocaleString("en-IN")}</span>}
                                {pendingResponse && <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Awaiting Supplier — Round {latestRound.round}</span>}
                                {!neg && !negApproved && <span className="ml-auto text-[10px] text-slate-400">Quote received — accept or negotiate</span>}
                              </div>

                              {/* Supplier's initial quote — with accept button if no negotiation started */}
                              {!neg && !negApproved && (
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier Initial Quote</span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-800">₹{parseFloat(priceVal).toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">/ unit</span></p>
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      onClick={() => {
                                        const updated: NegotiationRecord = {
                                          rounds: [{ round: 1, targetPrice: priceVal, currency: "INR", sentAt: Date.now(), sentBy: currentRole, supplierResponse: { price: priceVal, currency: "INR", docs: [], submittedAt: Date.now() } }],
                                          approvedAt: Date.now(), approvedBy: currentRole, finalPrice: priceVal, finalCurrency: "INR",
                                        }
                                        const raw = localStorage.getItem(PRICE_NEG_KEY)
                                        const all: Record<string, Record<string, NegotiationRecord>> = raw ? JSON.parse(raw) : {}
                                        if (!all[npdId]) all[npdId] = {}
                                        all[npdId][v.vendorName] = updated
                                        localStorage.setItem(PRICE_NEG_KEY, JSON.stringify(all))
                                        setPriceNegData(prev => ({ ...prev, [v.vendorName]: updated }))
                                        setVendorApproval(v.vendorName, "approved")
                                      }}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1"
                                    ><CheckCircle className="w-3.5 h-3.5" />Accept Supplier Initial Quote</button>
                                  </div>
                                </div>
                              )}

                              {/* Round history */}
                              {neg && neg.rounds.length > 0 && (
                                <div className="space-y-2">
                                  {neg.rounds.map(r => (
                                    <div key={r.round} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Round {r.round}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(r.sentAt).toLocaleString("en-IN")}</span>
                                      </div>
                                      <div className="flex gap-4 text-xs">
                                        <span className="text-slate-500">Target: <strong className="text-slate-800">{currSymbol(r.currency)}{parseFloat(r.targetPrice).toLocaleString("en-IN")}</strong></span>
                                        {r.supplierResponse && (
                                          <span className="text-slate-500">Supplier: <strong className="text-slate-800">{currSymbol(r.supplierResponse.currency)}{parseFloat(r.supplierResponse.price).toLocaleString("en-IN")}</strong></span>
                                        )}
                                      </div>
                                      {r.supplierResponse && r.supplierResponse.docs.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                          {r.supplierResponse.docs.map(d => (
                                            <span key={d} className="text-[10px] bg-slate-100 text-slate-600 rounded px-2 py-0.5">{d}</span>
                                          ))}
                                        </div>
                                      )}
                                      {r.supplierResponse && (
                                        <p className="text-[10px] text-slate-400">Submitted {new Date(r.supplierResponse.submittedAt).toLocaleString("en-IN")}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Approve / Counter — shown when supplier has responded and not yet approved */}
                              {awaitingApproval && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const updated: NegotiationRecord = { ...neg!, approvedAt: Date.now(), approvedBy: currentRole, finalPrice: latestRound!.supplierResponse!.price, finalCurrency: latestRound!.supplierResponse!.currency }
                                      const raw = localStorage.getItem(PRICE_NEG_KEY)
                                      const all: Record<string, Record<string, NegotiationRecord>> = raw ? JSON.parse(raw) : {}
                                      if (!all[npdId]) all[npdId] = {}
                                      all[npdId][v.vendorName] = updated
                                      localStorage.setItem(PRICE_NEG_KEY, JSON.stringify(all))
                                      setPriceNegData(prev => ({ ...prev, [v.vendorName]: updated }))
                                      setVendorApproval(v.vendorName, "approved")
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                                  ><CheckCircle className="w-3.5 h-3.5" />Approve Price</button>
                                  <button
                                    onClick={() => setNegTargetPrice("")}
                                    className="text-xs font-semibold text-slate-500 hover:text-red-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg"
                                  >Counter with new target ↓</button>
                                </div>
                              )}

                              {/* Send target form — shown when price exists, not approved, no pending response, and either no neg or awaiting approval */}
                              {priceVal && !negApproved && !pendingResponse && (!neg || awaitingApproval) && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                                  <p className="text-xs font-semibold text-blue-800">
                                    {!neg ? "Start Price Negotiation" : `Send Counter Target (Round ${(neg.rounds.length) + 1})`}
                                  </p>
                                  <div className="flex gap-2">
                                    <select
                                      value={negCurrency}
                                      onChange={e => setNegCurrency(e.target.value as "INR" | "USD" | "EUR")}
                                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="INR">INR ₹</option>
                                      <option value="USD">USD $</option>
                                      <option value="EUR">EUR €</option>
                                    </select>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="Target price / unit"
                                      value={negTargetPrice}
                                      onChange={e => setNegTargetPrice(e.target.value)}
                                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                      disabled={!negTargetPrice || parseFloat(negTargetPrice) <= 0}
                                      onClick={() => {
                                        const existingRounds = neg?.rounds ?? []
                                        const newRound: NegotiationRound = {
                                          round: existingRounds.length + 1,
                                          targetPrice: negTargetPrice,
                                          currency: negCurrency,
                                          sentAt: Date.now(),
                                          sentBy: currentRole,
                                        }
                                        const updated: NegotiationRecord = { rounds: [...existingRounds, newRound] }
                                        const raw = localStorage.getItem(PRICE_NEG_KEY)
                                        const all: Record<string, Record<string, NegotiationRecord>> = raw ? JSON.parse(raw) : {}
                                        if (!all[npdId]) all[npdId] = {}
                                        all[npdId][v.vendorName] = updated
                                        localStorage.setItem(PRICE_NEG_KEY, JSON.stringify(all))
                                        setPriceNegData(prev => ({ ...prev, [v.vendorName]: updated }))
                                        setNegTargetPrice("")
                                      }}
                                      className="bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                                    >Send to Supplier</button>
                                  </div>
                                  <p className="text-[10px] text-slate-400">Share the supplier portal link — it will show this target price.</p>
                                </div>
                              )}
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
                        <p className="text-sm text-slate-400 italic">Supplier has not yet submitted their response.</p>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </>
          )}
              </div>
            </div>
          ))}

          {/* ── Stage 2 → Stage 3 Proceed Gate ── */}
          {!isECN && !isAltSupplier && activeStage === 2 && (() => {
            const allResolved = sentVendors.length > 0 && sentVendors.every(v => quoteApprovals[v] === "approved" || quoteApprovals[v] === "rejected")
            const resolvedCount = sentVendors.filter(v => quoteApprovals[v] === "approved" || quoteApprovals[v] === "rejected").length
            const firstApproved = sentVendors.find(v => quoteApprovals[v] === "approved")
            return (
              <div className={`rounded-xl border p-4 ${allResolved ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {allResolved ? <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" /> : <Circle className="w-5 h-5 text-slate-400 shrink-0" />}
                    <div>
                      <p className="text-sm font-bold text-slate-800">Stage 2 — Sourcing Complete</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {allResolved
                          ? `All ${sentVendors.length} vendor${sentVendors.length !== 1 ? "s" : ""} resolved. Ready to proceed to Supplier Dispatch.`
                          : `${resolvedCount}/${sentVendors.length} vendor${sentVendors.length !== 1 ? "s" : ""} resolved. Awaiting sourcing decision on remaining vendors.`}
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled={!allResolved}
                    onClick={() => {
                      const supplierName = firstApproved || sentVendors[0]
                      const updates: Partial<typeof npd> = { stage: 3, stageName: NPD_STAGES[2], supplier: supplierName }
                      updateNPD(npdId, updates)
                      setActiveStage(3)
                    }}
                    className="bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shrink-0"
                  >
                    <Send className="w-4 h-4 mr-1.5" />Proceed to Supplier Dispatch →
                  </Button>
                </div>
              </div>
            )
          })()}

          {/* ── Section 2: Supplier Dispatch (NCD/NPD only) ────────────────── */}
          {!isECN && !isAltSupplier && activeStage >= 3 && activeStage >= 8 && dispatchInfo && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">Dispatch Confirmed — {dispatchInfo.vendorName}</p>
                <p className="text-xs text-emerald-700 mt-0.5">Dispatched on {dispatchInfo.dispatchDate} · Proof of dispatch submitted</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">Stage 3 ✓</span>
            </div>
          )}
          {!isECN && !isAltSupplier && activeStage >= 3 && activeStage < 8 && (
            <Card className="border-orange-300 shadow-sm">
              <CardHeader className="bg-orange-50 border-b border-orange-200 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-orange-900 flex items-center gap-2 text-base">
                    <Truck className="w-5 h-5" /> Sample Dispatch — {sentVendors.length} Vendor{sentVendors.length !== 1 ? "s" : ""}
                  </CardTitle>
                  <span className="text-xs text-orange-700 bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-full">
                    {Object.keys(multiDispatch).length}/{sentVendors.length} dispatched
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {/* Per-vendor dispatch status rows */}
                {sentVendors.map(vendor => {
                  const dispatch = multiDispatch[vendor]
                  const dispatchUrl = `${baseUrl}/supplier/dispatch/${npdId}?vendor=${encodeURIComponent(vendor)}`
                  const vRec = allVendors.find(v => v.company_name === vendor)
                  const vSpoc = vRec?.contact_person_name ?? vendor
                  return (
                    <div key={vendor} className={`rounded-lg border p-4 ${dispatch ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-white"}`}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {dispatch
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            : <Clock className="w-4 h-4 text-orange-500 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{vendor}</p>
                            {vSpoc !== vendor && <p className="text-[11px] text-slate-400">{vSpoc}</p>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${dispatch ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                          {dispatch ? "Dispatched" : "Pending"}
                        </span>
                      </div>
                      {dispatch ? (
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dispatch Date</p>
                            <p className="font-semibold text-slate-800 mt-0.5">{dispatch.dispatchDate}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Submitted</p>
                            <p className="font-semibold text-slate-800 mt-0.5">{dispatch.submittedAt}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Proof Docs</p>
                            <p className="font-semibold text-slate-800 mt-0.5">{dispatch.docs.filter(Boolean).length > 0 ? dispatch.docs.filter(Boolean).join(", ") : "—"}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-1.5 bg-slate-50 border border-orange-200 rounded px-2.5 py-1.5 min-w-0">
                            <Link2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-[11px] text-blue-700 font-mono truncate">{dispatchUrl}</span>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(dispatchUrl); setCopiedVendor(`dispatch-${vendor}`); setTimeout(() => setCopiedVendor(null), 2000) }}
                            className="shrink-0 text-[10px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 border border-slate-200 rounded px-2 py-1.5">
                            <Copy className="w-3 h-3" />{copiedVendor === `dispatch-${vendor}` ? "Copied!" : "Copy"}
                          </button>
                          <a href={dispatchUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-blue-700 border border-slate-200 rounded p-1.5">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Manual advance if no dispatch portal used */}
                {Object.keys(multiDispatch).length === 0 && !defenceAdvanced && (
                  <div className="pt-1 border-t border-orange-100">
                    <p className="text-[10px] text-slate-400 mb-2">Manual override — if supplier did not use portal:</p>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                      onClick={() => { setDefenceAdvanced(true); setActiveStage(4); updateNPD(npdId, { stage: 4, stageName: NPD_STAGES[3] }) }}>
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Mark All Dispatched &amp; Advance
                    </Button>
                  </div>
                )}
                {defenceAdvanced && Object.keys(multiDispatch).length === 0 && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Marked as dispatched — advanced to Design &amp; Feasibility
                  </span>
                )}


              </CardContent>
            </Card>
          )}

          {/* ── Section 2b: Sample Dispatch (stage 7) — NCD/NPD only ─────── */}
          {!isECN && !isAltSupplier && activeStage >= 8 && activeStage < 9 && (() => {
            const supplier = npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : sentVendors[0] ?? ""
            const supplierSpoc7 = allVendors.find(v => v.company_name === supplier)?.contact_person_name ?? supplier
            const spocContact7 = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "", phone: "" }
            const portalUrl = supplier ? `${baseUrl}/supplier/plant-delivery/${npdId}?vendor=${encodeURIComponent(supplier)}` : ""
            return (
              <Card className="border-orange-300 shadow-sm">
                <CardHeader className="bg-orange-50 border-b border-orange-200 pb-3">
                  <CardTitle className="text-orange-900 flex items-center gap-2 text-base">
                    <Package className="w-5 h-5" /> Sample Dispatch Coordination
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
                              <label className="text-sm font-semibold text-slate-700">R&D Center <span className="text-red-500">*</span></label>
                              <select
                                value={deliveryLocation}
                                onChange={e => setDeliveryLocation(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                              >
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
                                    to={supplierSpoc7}
                                    subject={`Delivery Date Request — ${npdId}: ${npd.itemName}`}
                                    body={`<p>Dear <strong>${supplierSpoc7}</strong>,</p><p>R&amp;D testing for <em>${npd.itemName}</em> (${npdId}) has been successfully completed and approved. We now require sample delivery to our facility at the details below.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#1e3a5f"><td colspan="2" style="padding:10px 12px;font-weight:700;font-size:14px;color:#fff;letter-spacing:0.04em">Part No. ${assignedPartNumber}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Commodity</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemCategory}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Delivery Location</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${deliveryLocation}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Required Quantity</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${deliveryReqQty} pcs</td></tr></table><p>Kindly confirm your delivery date at the earliest by clicking the link below:</p><div style="margin:16px 0;"><a href="${portalUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Confirm Delivery Date →</a></div><p>Regards,<br/><strong>${spocContact7.name}</strong><br/><span style="color:#64748b;font-size:12px">Sourcing SPOC, Amber Enterprises</span></p>`}
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
                                  {plantVerdict === "accepted" ? "✓ R&D user accepted the part" : "✗ R&D user rejected — revision required"}
                                </p>
                              )}
                            </div>
                          )}
                          {!plantVerdict && plantSupplierSubmitted && <PushSentBadge to={DEFAULT_RND_CONTACT.name} />}
                          {plantVerdict && (
                            <>
                              <EmailCard
                                to={npd.spoc}
                                subject={`[${plantVerdict === "accepted" ? "✓ Accepted" : "✗ Not Good"}] R&D Testing Verdict — ${npdId}`}
                                body={`<p>Dear <strong>${npd.spoc}</strong>,</p><p>The plant testing verdict for the following ${moduleLabel(npd.typeOfWork)} has been submitted.</p><table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px"><tr style="background:#1e3a5f"><td colspan="2" style="padding:10px 12px;font-weight:700;font-size:14px;color:#fff;letter-spacing:0.04em">Part No. ${assignedPartNumber}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:40%">${moduleLabel(npd.typeOfWork)} ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npdId}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Item</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.itemName}</td></tr><tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Supplier</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${npd.supplier}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Verdict</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:${plantVerdict === "accepted" ? "#059669" : "#dc2626"}">${plantVerdict === "accepted" ? "✓ Accepted — Approved for Production" : "✗ Not Good — Returned for Revision"}</td></tr>${plantRemarks ? `<tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Remarks</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-style:italic">${plantRemarks}</td></tr>` : ""}</table><p style="color:#64748b;font-size:12px">Amber Enterprises R&D Team</p>`}
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
