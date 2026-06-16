"use client"
import React, { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2, Circle, ChevronRight, ArrowLeft, Wrench,
  AlertTriangle, ExternalLink, Plus, Trash2, Copy, Check,
  Users, Clock, Package, Building2, Paperclip, X, FileSpreadsheet
} from "lucide-react"
import {
  getNTDRecord, getNTDInitiation, setNTDInitiation, getNTDSpec, setNTDSpec,
  getNTDRFQ, setNTDRFQ, getNTDQuotation, setNTDQuotation,
  getNTDSelection, setNTDSelection, getNTDHandoff, setNTDHandoff,
  getNTDDFM, getNTDMould, getNTDMfg, setNTDMfg, getNTDTrials, setNTDTrials,
  getNTDStage11, setNTDStage11, advanceNTDStage, saveNTDRecord,
  appendActivity, getMouldSubStage, getDFMProgress, getMouldProgress,
  getTrialProgress, getStage11CurrentSubstep, isNTDComplete,
  createVersionedFile, addFileVersion, generateVendorToken,
  getActiveCommodities, allCommoditiesAcknowledged,
  allInspectionsSubmitted,
} from "@/lib/ntd"
import { VENDOR_CATALOG } from "@/lib/mockData"
import { NTD_COMMODITIES, type NTDCommodity, type PriceCategory, type ComponentCategorySelection } from "@/types/ntd"
import type { NTDRecord, NTDStage, NTDRole, NTDRFQData, NTDMfgData, NTDStage2Query } from "@/types/ntd"
import { ActivityFeed } from "@/components/ntd/ActivityFeed"
import { VersionedFileInput } from "@/components/ntd/VersionedFileInput"

const STAGE_NAMES: Record<number, string> = {
  1: "Initiation", 2: "Spec & Sign-off", 3: "RFQ Dispatch", 4: "Quotation Review",
  5: "Supplier Selection", 6: "Design Handoff", 7: "DFM", 8: "Mould Design",
  9: "Manufacturing", 10: "Trials", 11: "Commissioning",
}

// Sourcing SPOCs use their name as the poc_role value
const SOURCING_SPOC_ROLES = ["Rahul Sharma", "Karan Mehta", "Priya Rajan", "Amit Kumar", "Varun Joshi", "Rohan Desai"]

function toNTDRole(pocRole: string): NTDRole {
  if (pocRole === "rnd_head") return "rnd_head"
  if (pocRole === "sourcing_head") return "sourcing_head"
  if (pocRole === "super_admin") return "super_admin"
  if (pocRole === "exim") return "exim"
  if (pocRole.startsWith("rnd")) return "rnd"
  if (pocRole.startsWith("sourcing") || SOURCING_SPOC_ROLES.includes(pocRole)) return "sourcing"
  return "rnd"
}

function StageCard({
  stageNum, colorClass, title, children, doneLabel, stage,
}: {
  stageNum: number; colorClass: string; title: string; children: React.ReactNode; doneLabel?: string; stage: number
}) {
  const isDone = stage > stageNum
  const isActive = stage === stageNum
  const isUpcoming = stage === stageNum - 1

  if (isDone) return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-slate-700">Stage {stageNum} — {STAGE_NAMES[stageNum]}</p>
        {doneLabel && <p className="text-[11px] text-slate-400">{doneLabel}</p>}
      </div>
    </div>
  )

  if (isUpcoming) return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 opacity-50">
      <Circle className="w-4 h-4 text-slate-400 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-slate-500">Stage {stageNum} — {STAGE_NAMES[stageNum]}</p>
        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Upcoming</span>
      </div>
    </div>
  )

  if (!isActive) return null

  return (
    <div className={`bg-white border-l-4 ${colorClass} border border-t-0 border-b-0 border-r-0 rounded-xl shadow-sm`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colorClass.replace("border-l-4 ", "").replace("border-", "bg-")}`} />
        <h3 className="font-semibold text-slate-800 text-sm">Stage {stageNum} — {title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
      aria-label="Copy link">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

export default function NTDDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [currentRole, setCurrentRole] = useState("")
  const [record, setRecord] = useState<NTDRecord | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "documents">("overview")

  // Stage-specific state
  const [specSheet, setSpecSheet] = useState("")
  const [specSheetFileName, setSpecSheetFileName] = useState("")
  const [comparisons, setComparisons] = useState<{ id: string; vendor_name: string; spec_doc_link: string; notes: string }[]>([])
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [customVendorName, setCustomVendorName] = useState("")
  const [mfgUpdate, setMfgUpdate] = useState("")
  const [mfgStartDate, setMfgStartDate] = useState("")
  const [mfgEta, setMfgEta] = useState("")
  // Per-commodity mfg update text (commodity → update note)
  const [mfgV2Updates, setMfgV2Updates] = useState<Record<string, string>>({})

  // Stage 2 — per-commodity sourcing extra fields (No. of Cavity, Runner Type, Mould)
  const [sourcingExtraFields, setSourcingExtraFields] = useState<Partial<Record<NTDCommodity, {
    noOfCavity: string
    runnerType: string
    mould: string
  }>>>({})

  // Stage 2 query
  const [queryText, setQueryText] = useState("")
  const [queryResponseText, setQueryResponseText] = useState<Record<string, string>>({})

  // Stage 4 negotiation (per vendor)
  const [counterText, setCounterText] = useState<Record<string, string>>({})
  const [counterPrice, setCounterPrice] = useState<Record<string, string>>({})
  const [messageDocLinks, setMessageDocLinks] = useState<Record<string, string>>({})

  // Stage 6 component builder
  const [components, setComponents] = useState<{ id: string; name: string }[]>([{ id: "C01", name: "" }])
  const [finalDesignSlots, setFinalDesignSlots] = useState<{ id: string; slotName: string; link: string; fileName?: string }[]>([{ id: "1", slotName: "", link: "" }])

  // Per-component manufacturing readiness tracking (componentId → ready)
  const [componentMfgReady, setComponentMfgReady] = useState<Record<string, boolean>>({})

  const readFileAsDataURL = (file: File, onDone: (dataUrl: string, name: string) => void) => {
    if (file.size > 8 * 1024 * 1024) { alert("File too large (max 8 MB). Use a Drive link instead."); return }
    const reader = new FileReader()
    reader.onload = () => onDone(reader.result as string, file.name)
    reader.readAsDataURL(file)
  }

  // Stage 11
  const [s11Step, setS11Step] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)

  // Pause polling while user is typing in any input to prevent focus loss
  const isEditingRef = React.useRef(false)
  const pausePolling = () => { isEditingRef.current = true }
  const resumePolling = () => { isEditingRef.current = false }

  const reload = useCallback(() => {
    const r = getNTDRecord(id)
    if (r) setRecord(r)
    setS11Step(getStage11CurrentSubstep(id))
  }, [id])

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
    const saved = localStorage.getItem(`ntd_sourcing_extras_${id}`)
    if (saved) setSourcingExtraFields(JSON.parse(saved))
    const mfgReady = localStorage.getItem(`ntd_mfg_ready_${id}`)
    if (mfgReady) setComponentMfgReady(JSON.parse(mfgReady))
    reload()
    const t = setInterval(() => { if (!isEditingRef.current) reload() }, 3000)
    const onRole = () => setCurrentRole(localStorage.getItem("poc_role") ?? "")
    window.addEventListener("rolechange", onRole)
    return () => { clearInterval(t); window.removeEventListener("rolechange", onRole) }
  }, [reload])

  // Stage 6 — poll for all-commodity acknowledgement → advance to Stage 7
  const activeStageForS6 = record?.current_stage
  useEffect(() => {
    if (activeStageForS6 !== 6) return
    const handoff = getNTDHandoff(id)
    if (!handoff?.submitted_at) return
    const interval = setInterval(() => {
      if (allCommoditiesAcknowledged(id)) {
        clearInterval(interval)
        advanceNTDStage(id, 7, "system", "rnd")
        reload()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [activeStageForS6, id, reload])

  if (!record) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">NTD record not found.</p>
      </div>
    )
  }

  const stage = record.current_stage
  const ntdRole = toNTDRole(currentRole)
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"
  const isSourcing = currentRole.startsWith("sourcing") || SOURCING_SPOC_ROLES.includes(currentRole) || currentRole === "super_admin"
  const canApprove = currentRole === "rnd_head" || currentRole === "super_admin"
  const isExim = currentRole === "exim" || currentRole === "super_admin"

  const initData = getNTDInitiation(id)
  const specData = getNTDSpec(id)
  const rfqData = getNTDRFQ(id)
  const quotationData = getNTDQuotation(id)
  // category_selections now live inside ntd_quotation_{id}[vendorId].category_selections
  const selectionData = getNTDSelection(id)
  const handoffData = getNTDHandoff(id)
  const dfmData = getNTDDFM(id)
  const mouldData = getNTDMould(id)
  const mfgData = getNTDMfg(id)
  const mfgV2Data: Record<string, NTDMfgData> = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem(`ntd_mfg_v2_${id}`) ?? "{}")
    : {}
  const trialsData = getNTDTrials(id)
  const s11Data = getNTDStage11(id)

  const mouldSubStage = getMouldSubStage(id)
  const dfmProgress = getDFMProgress(id)
  const mouldProgress = getMouldProgress(id)
  const expectedComponentTotal = handoffData?.components?.length ?? initData?.components?.length ?? 0
  const dfmDenominator = dfmProgress.total > 0 ? dfmProgress.total : expectedComponentTotal
  const mouldDenominator = mouldProgress.total > 0 ? mouldProgress.total : expectedComponentTotal
  const trialProgress = getTrialProgress(id)
  const complete = isNTDComplete(id)

  // ── Stage 10 — Mark samples received (R&D action) ──
  const handleMarkSamplesReceivedMain = (trialNo: number) => {
    const fresh = getNTDTrials(id)
    if (!fresh) return
    const updated = {
      ...fresh,
      trials: fresh.trials.map(t => t.trial_no === trialNo
        ? { ...t, status: "samples_received" as const, samples_received_at: new Date().toISOString() }
        : t)
    }
    setNTDTrials(id, updated)
    appendActivity(id, currentRole, ntdRole, 10, "samples_received", `Samples received for Trial T${trialNo}`, { trial_no: trialNo })
    reload()
  }

  // ── Demo advance/revert ──
  const demoAdvance = () => {
    if (stage < 11) {
      const next = (stage + 1) as NTDStage
      advanceNTDStage(id, next, "demo", "super_admin")
      reload()
    }
  }
  const demoRevert = () => {
    if (stage > 1) {
      const r = getNTDRecord(id)
      if (!r) return
      saveNTDRecord({ ...r, current_stage: (stage - 1) as NTDStage })
      reload()
    }
  }

  // ── Stage 2 sign-off (sourcing only) ──
  const handleSpecSignOff = () => {
    const now = new Date().toISOString()
    const existing = specData ?? {
      spec_sheet: createVersionedFile("Spec Sheet", "", currentRole),
      comparisons: [],
      queries: [],
      sourcing_signed: false, sourcing_signed_by: "", sourcing_signed_at: "",
    }
    const updated = { ...existing, sourcing_signed: true, sourcing_signed_by: currentRole, sourcing_signed_at: now }
    setNTDSpec(id, updated)
    appendActivity(id, currentRole, ntdRole, 2, "stage_complete", "Stage 2 sourcing sign-off — advancing to RFQ Dispatch")
    advanceNTDStage(id, 3, currentRole, ntdRole)
    reload()
  }

  // ── Stage 2: toggle semi-Progressive flag per commodity ──
  const handleToggleSemiProgressive = (commodity: NTDCommodity) => {
    if (!initData) return
    const current = initData.semi_Progressive?.[commodity] ?? false
    const updated: typeof initData = {
      ...initData,
      semi_Progressive: { ...(initData.semi_Progressive ?? {}), [commodity]: !current },
    }
    setNTDInitiation(id, updated)
    reload()
  }

  // ── Stage 2: persist sourcing extra fields to localStorage ──
  const handleSaveSourcingExtras = (commodity: NTDCommodity, field: "noOfCavity" | "runnerType" | "mould", value: string) => {
    setSourcingExtraFields(prev => {
      const next = { ...prev, [commodity]: { ...(prev[commodity] ?? { noOfCavity: "", runnerType: "", mould: "" }), [field]: value } }
      localStorage.setItem(`ntd_sourcing_extras_${id}`, JSON.stringify(next))
      return next
    })
  }

  // ── Toggle a component's manufacturing readiness ──
  const handleToggleMfgReady = (componentId: string) => {
    setComponentMfgReady(prev => {
      const next = { ...prev, [componentId]: !prev[componentId] }
      localStorage.setItem(`ntd_mfg_ready_${id}`, JSON.stringify(next))
      return next
    })
    appendActivity(id, currentRole, ntdRole, 9, "manufacturing_update",
      `Component ${componentId} marked ${componentMfgReady[componentId] ? "not ready" : "ready"} for manufacturing`)
  }

  // ── Stage 2 query: raise (sourcing) ──
  const handleRaiseQuery = () => {
    if (!queryText.trim()) return
    const existing = specData ?? {
      spec_sheet: createVersionedFile("Spec Sheet", specSheet, currentRole),
      comparisons: comparisons.map(c => ({ row_id: c.id, vendor_name: c.vendor_name, spec_doc_link: c.spec_doc_link, notes: c.notes })),
      queries: [],
      sourcing_signed: false, sourcing_signed_by: "", sourcing_signed_at: "",
    }
    const query: NTDStage2Query = {
      query_id: String(Date.now()),
      text: queryText.trim(),
      raised_by: currentRole,
      raised_at: new Date().toISOString(),
      resolved: false,
    }
    setNTDSpec(id, { ...existing, queries: [...(existing.queries ?? []), query] })
    appendActivity(id, currentRole, ntdRole, 2, "query_posted", `Query raised: "${queryText.trim()}"`)
    setQueryText("")
    reload()
  }

  // ── Stage 2 query: resolve (R&D) ──
  const handleResolveQuery = (queryId: string) => {
    if (!specData) return
    const response = queryResponseText[queryId]?.trim() ?? ""
    const now = new Date().toISOString()
    const updated = {
      ...specData,
      queries: specData.queries.map(q =>
        q.query_id === queryId
          ? { ...q, resolved: true, response, resolved_by: currentRole, resolved_at: now }
          : q
      ),
    }
    setNTDSpec(id, updated)
    appendActivity(id, currentRole, ntdRole, 2, "query_posted", `Query resolved by ${currentRole}`)
    setQueryResponseText(prev => { const next = { ...prev }; delete next[queryId]; return next })
    reload()
  }

  // ── Stage 2 spec file revision ──
  const handleSpecFileAction = (action: "upload" | "revise", link: string, note?: string) => {
    if (!specData) return
    const newSpec = addFileVersion(specData.spec_sheet, link, currentRole, note)
    setNTDSpec(id, { ...specData, spec_sheet: newSpec })
    appendActivity(id, currentRole, ntdRole, 2, "file_uploaded", `Spec sheet updated — v${newSpec.current_version}`)
    reload()
  }

  // ── Stage 3 RFQ dispatch ──
  const handleAddVendorToRFQ = (vendorName: string, isCatalog: boolean, commodity: string) => {
    const existing = rfqData ?? { vendors: {} }
    const vendorId = `vendor_${commodity.replace(/\s+/g, "_")}_${Date.now()}`
    setNTDRFQ(id, {
      vendors: {
        ...existing.vendors,
        [vendorId]: {
          vendor_name: vendorName,
          is_catalog: isCatalog,
          commodity: commodity as import("@/types/ntd").NTDCommodity,
          token: generateVendorToken(),
          nda_required: !isCatalog,
          nda_signed: isCatalog,
          sent: false,
          sent_at: "",
          sent_by: "",
        }
      }
    })
    reload()
  }

  const handleAdvanceFromRFQ = () => {
    const existing = rfqData ?? { vendors: {} }
    const now = new Date().toISOString()
    const updatedVendors: Record<string, typeof existing.vendors[string]> = {}
    for (const [vid, v] of Object.entries(existing.vendors)) {
      updatedVendors[vid] = { ...v, sent: true, sent_at: now, sent_by: currentRole }
    }
    const updated: NTDRFQData = { vendors: updatedVendors }
    setNTDRFQ(id, updated)
    appendActivity(id, currentRole, ntdRole, 3, "stage_complete", "RFQs dispatched to all commodity vendor pools")
    advanceNTDStage(id, 4, currentRole, ntdRole)
    reload()
  }

  // ── Stage 4 negotiation ──
  const handleSendCounter = (vendorId: string, vendorName: string) => {
    const text = counterText[vendorId]?.trim()
    if (!text) return
    const price = counterPrice[vendorId] ? Number(counterPrice[vendorId]) : undefined
    const docLink = messageDocLinks[vendorId]?.trim() || ""
    const existing = quotationData ?? {}
    const q = existing[vendorId] ?? { quotation: undefined, thread: [], status: "sent" as const }
    const msg: Record<string, unknown> = {
      message_id: String(Date.now()),
      author_name: currentRole,
      author_type: "internal" as const,
      text,
      counter_offer: price,
      created_at: new Date().toISOString(),
    }
    if (docLink) msg.doc_link = docLink
    const updatedQ = {
      ...q,
      status: "negotiating" as const,
      thread: [...q.thread, msg] as typeof q.thread,
    }
    setNTDQuotation(id, { ...existing, [vendorId]: updatedQ })
    appendActivity(id, currentRole, ntdRole, 4, "negotiation_round", `Counter sent to ${vendorName}${price ? ` — ₹${price.toLocaleString()}` : ""}`, { vendor_id: vendorId })
    setCounterText(prev => { const n = { ...prev }; delete n[vendorId]; return n })
    setCounterPrice(prev => { const n = { ...prev }; delete n[vendorId]; return n })
    setMessageDocLinks(prev => { const n = { ...prev }; delete n[vendorId]; return n })
    reload()
  }

  const handleAcceptVendorPrice = (vendorId: string, vendorName: string, acceptedPrice: number, currency: string) => {
    const existing = quotationData ?? {}
    const q = existing[vendorId]
    if (!q) return
    const updatedQuotation = q.quotation
      ? { ...q.quotation, amount: acceptedPrice, currency, last_updated_at: new Date().toISOString() }
      : q.quotation
    setNTDQuotation(id, {
      ...existing,
      [vendorId]: { ...q, quotation: updatedQuotation ?? q.quotation, status: "finalized" },
    })
    appendActivity(id, currentRole, ntdRole, 4, "negotiation_round", `Accepted price ${currency} ${acceptedPrice.toLocaleString()} from ${vendorName}`, { vendor_id: vendorId })
    reload()
  }

  // ── Stage 5 selection ──
  const handleSelectCommoditySupplier = (commodity: string, vendorId: string, vendorName: string) => {
    const existing = selectionData ?? {
      selections: {},
      sourcing_approved: false, sourcing_approved_by: "", sourcing_approved_at: "",
      rnd_acknowledged: false, rnd_acknowledged_by: "", rnd_acknowledged_at: "",
    }
    const updatedSelections = { ...existing.selections, [commodity]: { vendor_id: vendorId, vendor_name: vendorName } }
    const activeCommodities = getActiveCommodities(id)
    const allSelected = activeCommodities.every(c => updatedSelections[c]?.vendor_name)

    const updated = {
      ...existing,
      selections: updatedSelections,
      ...(allSelected ? { sourcing_approved: true, sourcing_approved_by: currentRole, sourcing_approved_at: new Date().toISOString() } : {}),
    }
    setNTDSelection(id, updated)
    appendActivity(id, currentRole, ntdRole, 5, "supplier_selected", `${commodity} supplier selected: ${vendorName}`, { vendor_id: vendorId })
    reload()
  }

  const handleRndAcknowledge = () => {
    if (!selectionData) return
    const updated = {
      ...selectionData,
      rnd_acknowledged: true,
      rnd_acknowledged_by: currentRole,
      rnd_acknowledged_at: new Date().toISOString(),
    }
    setNTDSelection(id, updated)
    // Write selectedSuppliers to the master NTD record
    const r = getNTDRecord(id)
    if (r) {
      const suppliersMap: Record<string, string> = {}
      Object.entries(selectionData.selections ?? {}).forEach(([commodity, sel]) => {
        suppliersMap[commodity] = sel.vendor_name
      })
      saveNTDRecord({ ...r, selectedSuppliers: suppliersMap })
    }
    if (updated.sourcing_approved && updated.rnd_acknowledged) {
      advanceNTDStage(id, 6, currentRole, ntdRole)
    }
    appendActivity(id, currentRole, ntdRole, 5, "supplier_acknowledged", "R&D acknowledged all supplier selections")
    reload()
  }

  // ── Stage 6 handoff ──
  const handleSubmitHandoff = () => {
    // Use components from initiation data (already have commodity field)
    // Exclude merged components — only active ones go to handoff
    const initComps = (initData?.components ?? []).filter(c => c.status !== "merged")
    // Merge with any name overrides from local state
    const comps = initComps.length > 0
      ? initComps
      : components.filter(c => c.name.trim()).map(c => ({
          componentId: c.id,
          name: c.name,
          commodity: "Sheet Metal" as import("@/types/ntd").NTDCommodity,
        }))
    if (comps.length === 0) return
    const finalFiles = finalDesignSlots.filter(s => s.slotName.trim() && s.link.trim()).map(s => createVersionedFile(s.slotName, s.link, currentRole))
    // Initialize per-commodity acknowledgement map
    const activeCommodities = getActiveCommodities(id)
    const ackByCommodity: Record<string, boolean> = {}
    activeCommodities.forEach(c => { ackByCommodity[c] = false })
    setNTDHandoff(id, {
      components: comps,
      component_count: comps.length,
      final_designs: finalFiles,
      submitted_by: currentRole,
      submitted_at: new Date().toISOString(),
      supplier_acknowledged: false,
      supplier_acknowledged_at: "",
      supplier_acknowledged_by_commodity: ackByCommodity,
    })
    const r = getNTDRecord(id)
    if (r) saveNTDRecord({ ...r, component_count: comps.length })
    appendActivity(id, currentRole, ntdRole, 6, "supplier_submitted", `Design handoff submitted — ${comps.length} components`)
    reload()
  }

  const handleSimulateSupplierAck = () => {
    if (!handoffData) return
    // Acknowledge all commodities
    const activeCommodities = getActiveCommodities(id)
    const ackByCommodity: Record<string, boolean> = {}
    activeCommodities.forEach(c => { ackByCommodity[c] = true })
    const updated = {
      ...handoffData,
      supplier_acknowledged: true,
      supplier_acknowledged_at: new Date().toISOString(),
      supplier_acknowledged_by_commodity: ackByCommodity,
    }
    setNTDHandoff(id, updated)
    advanceNTDStage(id, 7, currentRole, ntdRole)
    appendActivity(id, currentRole, ntdRole, 6, "supplier_acknowledged", "All commodity suppliers acknowledged design handoff")
    reload()
  }

  // ── Stage 9 Manufacturing ──
  const handleMfgStart = () => {
    setNTDMfg(id, {
      mfg_start_date: mfgStartDate || new Date().toISOString().split("T")[0],
      eta_date: mfgEta || "",
      updates: [],
      status: "in_progress",
      completed_by: "",
      completed_at: "",
    })
    appendActivity(id, currentRole, ntdRole, 9, "manufacturing_update", "Manufacturing started")
    reload()
  }

  const handleMfgUpdate = () => {
    if (!mfgData || !mfgUpdate.trim()) return
    const updated: NTDMfgData = {
      ...mfgData,
      updates: [...mfgData.updates, { update_id: String(Date.now()), date: new Date().toISOString().split("T")[0], note: mfgUpdate.trim(), posted_by: currentRole, posted_by_role: currentRole }]
    }
    setNTDMfg(id, updated)
    appendActivity(id, currentRole, ntdRole, 9, "manufacturing_update", mfgUpdate.trim())
    setMfgUpdate("")
    reload()
  }

  const handleMfgComplete = () => {
    if (!mfgData) return
    setNTDMfg(id, { ...mfgData, status: "complete", completed_by: currentRole, completed_at: new Date().toISOString() })
    advanceNTDStage(id, 10, currentRole, ntdRole)
    appendActivity(id, currentRole, ntdRole, 9, "manufacturing_complete", "Manufacturing marked complete")
    reload()
  }

  // ── Stage 9 Per-commodity Manufacturing (v2) ──
  const defaultMfgRecord = (): NTDMfgData => ({
    mfg_start_date: "", eta_date: "", updates: [], status: "not_started", completed_by: "", completed_at: "",
  })

  const getMfgV2Data = (): Record<string, NTDMfgData> => {
    if (typeof window === "undefined") return {}
    return JSON.parse(localStorage.getItem(`ntd_mfg_v2_${id}`) ?? "{}")
  }

  const handleMarkMfgComplete = (commodity: string) => {
    const mfgV2Data = getMfgV2Data()
    const current = mfgV2Data[commodity] ?? defaultMfgRecord()
    const updated = { ...current, status: "complete" as const, completed_by: currentRole, completed_at: new Date().toISOString() }
    const newV2 = { ...mfgV2Data, [commodity]: updated }
    localStorage.setItem(`ntd_mfg_v2_${id}`, JSON.stringify(newV2))
    appendActivity(id, currentRole, ntdRole, 9, "manufacturing_complete", `${commodity} manufacturing marked complete`)
    const activeCommodities = getActiveCommodities(id)
    const allComplete = activeCommodities.every(c => newV2[c]?.status === "complete")
    if (allComplete) {
      advanceNTDStage(id, 10, currentRole, ntdRole)
    }
    reload()
  }

  const handlePostMfgUpdate = (commodity: string, note: string) => {
    const mfgV2Data = getMfgV2Data()
    const current = mfgV2Data[commodity] ?? defaultMfgRecord()
    const update = {
      update_id: crypto.randomUUID(),
      date: new Date().toISOString(),
      note,
      posted_by: currentRole,
      posted_by_role: ntdRole,
    }
    const updated = {
      ...current,
      status: current.status === "not_started" ? "in_progress" as const : current.status,
      updates: [...(current.updates ?? []), update],
    }
    localStorage.setItem(`ntd_mfg_v2_${id}`, JSON.stringify({ ...mfgV2Data, [commodity]: updated }))
    setMfgV2Updates(prev => ({ ...prev, [commodity]: "" }))
    reload()
  }

  // ── Build card stack ──
  const cards: React.ReactNode[] = []

  // Stage 1 — always done (auto-submitted at creation); show spec files for reference
  cards.push(
    <div key="s1" className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700">Stage 1 — Initiation</p>
          {initData && (
            <p className="text-[11px] text-slate-400">
              Submitted by {initData.submitted_by}
              {initData.tech_spec_sheets && Object.keys(initData.tech_spec_sheets).length > 0 && ` · ${Object.keys(initData.tech_spec_sheets).length} spec sheet(s)`}
              {initData.part_specs.length > 0 && ` · ${initData.part_specs.length} spec file(s)`}
            </p>
          )}
        </div>
      </div>
      {initData && (
        <div className="border-t border-slate-200 px-4 py-2.5 space-y-2">
          {initData.notes && (
            <p className="text-xs text-slate-500 italic">{initData.notes}</p>
          )}
          <div className="flex flex-wrap gap-3">
            {initData.tech_spec_sheets && Object.entries(initData.tech_spec_sheets).map(([commodity, sheet]) =>
              sheet && (
                sheet.link.startsWith("http") ? (
                  <a key={commodity} href={sheet.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                    {sheet.file_name}
                    <span className="text-slate-400 ml-1">· {commodity}</span>
                  </a>
                ) : (
                  <span key={commodity} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                    {sheet.file_name}
                    <span className="text-slate-400 ml-1">· {commodity}</span>
                  </span>
                )
              )
            )}
            {initData.part_specs.map(f => {
              const link = f.versions.find(v => v.version_no === f.current_version)?.link ?? ""
              return link ? (
                <a key={f.file_id} href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-700 hover:underline">
                  <ExternalLink className="w-3 h-3" />
                  {f.slot_name}
                  <span className="text-slate-400">v{f.current_version}</span>
                </a>
              ) : (
                <span key={f.file_id} className="flex items-center gap-1 text-xs text-slate-400">
                  <ExternalLink className="w-3 h-3" /> {f.slot_name} (no link)
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  // Stage 2 — Component Review & Sourcing Sign-off
  if (stage >= 1) {
    const s2Queries = specData?.queries ?? []
    const hasOpenQuery = s2Queries.some(q => !q.resolved)
    cards.push(
      <StageCard key="s2" stageNum={2} stage={stage} colorClass="border-teal-500" title="Component Review & Sign-off"
        doneLabel={specData?.sourcing_signed ? `Approved by ${specData.sourcing_signed_by}` : undefined}>
        <div className="space-y-6">

          {/* ── Per-commodity component tables ── */}
          {initData?.components && initData.components.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Components <span className="ml-1 font-normal text-slate-400 normal-case">({initData.components.length} total)</span>
              </p>
              {NTD_COMMODITIES.map(commodity => {
                const comps = initData.components.filter(c => c.commodity === commodity && c.status !== "merged")
                if (comps.length === 0 && !(initData.components.some(c => c.commodity === commodity))) return null
                const isSP = initData.semi_Progressive?.[commodity] ?? false
                const canEditSourcing = isSourcing && !specData?.sourcing_signed
                const sourcingData = sourcingExtraFields[commodity] ?? { noOfCavity: "", runnerType: "", mould: "" }
                return (
                  <div key={commodity} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">

                    {/* ── Commodity header row ── */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                      {/* Left: commodity identity */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-sm font-bold text-slate-800 leading-none">{commodity}</span>
                        <span className="shrink-0 text-[10px] bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full">
                          {comps.length} {comps.length !== 1 ? "components" : "component"}
                        </span>
                        {isSP && (
                          <span className="shrink-0 text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">SP</span>
                        )}
                      </div>
                      {/* Right: semi-Progressive toggle (Sheet Metal only) */}
                      {isSourcing && commodity === "Sheet Metal" && (
                        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0" title={stage >= 3 ? "Locked after RFQ dispatch" : "Enable semi-Progressive pricing for this commodity"}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isSP}
                            disabled={stage >= 3}
                            onClick={() => handleToggleSemiProgressive(commodity)}
                            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed ${isSP ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-slate-200"}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 translate-y-px rounded-full bg-white shadow transition-transform ${isSP ? "translate-x-3.5" : "translate-x-0.5"}`} />
                          </button>
                          <span className="text-[11px] font-medium text-slate-600">Semi-Progressive</span>
                        </label>
                      )}
                    </div>

                    {/* ── Column headers ── */}
                    <div className="grid grid-cols-[52px_2fr_1fr_1fr_1fr_1fr_0.8fr_1fr_0.5fr] gap-3 px-4 py-2 bg-slate-50/60 border-b border-slate-100 items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Part Name</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Ref. No.</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Drg. No.</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Size (mm)</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Material</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">QPS</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Wt. (gms)</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Spec</span>
                    </div>

                    {/* ── Component rows ── */}
                    <div className="divide-y divide-slate-100 bg-white">
                      {comps.map(c => {
                        const specSheet = initData?.tech_spec_sheets?.[commodity]
                        return (
                        <div
                          key={c.componentId}
                          className="grid grid-cols-[52px_2fr_1fr_1fr_1fr_1fr_0.8fr_1fr_0.5fr] gap-3 px-4 py-3 items-center text-sm hover:bg-slate-50/60"
                        >
                          <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-center">{c.componentId}</span>
                          <span className="text-slate-700 font-medium truncate" title={c.name}>{c.name}</span>
                          <span className="text-slate-600 text-center truncate" title={c.referenceNo || "-"}>{c.referenceNo || "-"}</span>
                          <span className="text-slate-600 text-center truncate" title={c.drgNo || "-"}>{c.drgNo || "-"}</span>
                          <span className="text-slate-600 text-center truncate" title={c.partSize || "-"}>{c.partSize || "-"}</span>
                          <span className="text-slate-600 text-center truncate" title={c.material || "-"}>{c.material || "-"}</span>
                          <span className="text-slate-600 text-center truncate" title={c.qps || "-"}>{c.qps || "-"}</span>
                          <span className="text-slate-600 text-center truncate" title={c.drwgWeight || "-"}>{c.drwgWeight || "-"}</span>
                          <span className="text-center">
                            {specSheet?.link ? (
                              <a href={specSheet.link} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
                                title={`Download ${specSheet.file_name}`}>
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </span>
                        </div>
                      )})}
                    </div>

                    {/* ── Sourcing mould details ── */}
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mould Details</p>
                      <div className="grid grid-cols-3 gap-3">
                        {(["noOfCavity", "runnerType", "mould"] as const).map(field => {
                          const label = field === "noOfCavity" ? "No. of Cavity" : field === "runnerType" ? "Runner Type" : "Mould"
                          const value = sourcingData[field]
                          return (
                            <div key={field}>
                              <label className="text-[10px] font-semibold text-slate-500 mb-1 block">{label}</label>
                              {canEditSourcing ? (
                                <input
                                  type="text"
                                  value={value}
                                  onChange={e => handleSaveSourcingExtras(commodity, field, e.target.value)}
                                  onFocus={pausePolling}
                                  onBlur={resumePolling}
                                  placeholder={`Enter ${label.toLowerCase()}...`}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                                />
                              ) : (
                                <span className="block text-sm text-slate-700 py-1.5">{value || <span className="text-slate-300 italic">—</span>}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
              <p className="text-sm text-amber-800">No components found from Stage 1 initiation.</p>
            </div>
          )}

          {/* ── Query thread ── */}
          {s2Queries.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Queries</p>
                {hasOpenQuery && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {s2Queries.filter(q => !q.resolved).length} open
                  </span>
                )}
              </div>
              {s2Queries.map(q => (
                <div key={q.query_id}
                  className={`rounded-xl border p-4 space-y-3 ${q.resolved ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{q.text}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Raised by {q.raised_by} · {new Date(q.raised_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${q.resolved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {q.resolved ? "Resolved" : "Open"}
                    </span>
                  </div>
                  {q.resolved && q.response && (
                    <div className="bg-white border border-emerald-200 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">R&D Response</p>
                      <p className="text-sm text-slate-700">{q.response}</p>
                      <p className="text-[10px] text-slate-400 mt-1">by {q.resolved_by} · {new Date(q.resolved_at!).toLocaleString()}</p>
                    </div>
                  )}
                  {!q.resolved && isRnd && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={queryResponseText[q.query_id] ?? ""}
                        onChange={e => setQueryResponseText(prev => ({ ...prev, [q.query_id]: e.target.value }))}
                        placeholder="Type your response..."
                        rows={2}
                        aria-label="Response to query"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                      />
                      <button onClick={() => handleResolveQuery(q.query_id)}
                        className="text-sm font-semibold bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg transition-colors">
                        Respond & Resolve
                      </button>
                    </div>
                  )}
                  {!q.resolved && !isRnd && (
                    <p className="text-xs text-amber-700 italic">Awaiting R&D response...</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Raise query (sourcing only) ── */}
          {isSourcing && !specData?.sourcing_signed && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Raise a Query to R&D</p>
              </div>
              <div className="flex gap-2">
                <label htmlFor="s2-query-input" className="sr-only">Query text</label>
                <input
                  id="s2-query-input"
                  type="text"
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  placeholder="Describe your query or concern…"
                  className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
                />
                <button onClick={handleRaiseQuery} disabled={!queryText.trim()}
                  className="flex items-center gap-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Raise Query
                </button>
              </div>
            </div>
          )}

          {/* ── Sourcing sign-off ── */}
          <div className={`rounded-xl border px-5 py-4 transition-colors ${specData?.sourcing_signed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Sourcing Approval</p>
            {specData?.sourcing_signed ? (
              <div>
                <p className="text-sm text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Approved by {specData.sourcing_signed_by}
                </p>
                <p className="text-xs text-slate-400 mt-1">{new Date(specData.sourcing_signed_at).toLocaleString()}</p>
              </div>
            ) : isSourcing ? (
              <div className="space-y-3">
                {hasOpenQuery && (
                  <p className="text-sm text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> Resolve all open queries before approving.
                  </p>
                )}
                <button
                  onClick={handleSpecSignOff}
                  disabled={hasOpenQuery}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors">
                  Approve &amp; Advance to Stage 3 →
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Awaiting sourcing approval</p>
            )}
          </div>

        </div>
      </StageCard>
    )
  }

  // Stage 3 — RFQ Dispatch
  if (stage >= 2) cards.push(
    <StageCard key="s3" stageNum={3} stage={stage} colorClass="border-indigo-500" title="RFQ Dispatch"
      doneLabel={rfqData ? `${Object.values(rfqData.vendors).filter(v => v.sent).length} RFQs sent` : undefined}>
      {(() => {
        const activeCommodities = getActiveCommodities(id)
        const vendors = rfqData?.vendors ?? {}
        const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
        return (
          <div className="space-y-5">
            {activeCommodities.map(commodity => {
              const catalogVendors = (VENDOR_CATALOG as Record<string, { name: string; tier: string; spocName?: string }[]>)[commodity] ?? []

              return (
                <div key={commodity} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{commodity}</span>
                    <span className="text-[10px] text-slate-400">{catalogVendors.length} catalog vendors</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {catalogVendors.map(cv => {
                        const existingEntry = Object.entries(vendors).find(([, v]) => v.vendor_name === cv.name && v.commodity === commodity)
                        const isAdded = !!existingEntry
                        const [existingId, existingVendor] = existingEntry ?? ["", null]
                        const rfqUrl = existingVendor ? `${baseUrl}/rfq/ntd/${id}/${existingVendor.token}` : ""

                        return (
                          <div key={cv.name} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${isAdded ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
                            <input type="checkbox" checked={isAdded}
                              onChange={() => {
                                if (isAdded) {
                                  const { [existingId]: _removed, ...rest } = vendors
                                  setNTDRFQ(id, { vendors: rest })
                                  reload()
                                } else {
                                  handleAddVendorToRFQ(cv.name, true, commodity)
                                }
                              }}
                              className="mt-0.5 rounded border-slate-300 accent-indigo-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800">{cv.name}</p>
                              <p className="text-[10px] text-slate-400">{cv.tier}{cv.spocName ? ` · ${cv.spocName}` : ""}</p>
                              {isAdded && existingVendor && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  {existingVendor.sent && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                      <CheckCircle2 className="w-3 h-3" /> RFQ Sent
                                    </span>
                                  )}
                                  {rfqUrl && <CopyButton text={rfqUrl} />}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {isSourcing && (
                      <div className="flex items-center gap-2 pt-1">
                        <input type="text" autoComplete="off"
                          placeholder={`Add custom ${commodity} vendor...`}
                          value={customVendorName}
                          onFocus={pausePolling} onBlur={resumePolling}
                          onChange={e => setCustomVendorName(e.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        <button onClick={() => {
                          if (customVendorName.trim()) {
                            handleAddVendorToRFQ(customVendorName.trim(), false, commodity)
                            setCustomVendorName("")
                          }
                        }} disabled={!customVendorName.trim()}
                          className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                          <Plus className="w-3 h-3 inline mr-1" />Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {activeCommodities.length === 0 && (
              <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-800">No commodity components defined. Complete Stage 1 with component commodities first.</p>
              </div>
            )}

            {isSourcing && stage === 3 && (
              <button onClick={handleAdvanceFromRFQ}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-700 hover:bg-indigo-800 text-white transition-colors">
                Send RFQs to All &amp; Proceed to Quotation Review →
              </button>
            )}
          </div>
        )
      })()}
    </StageCard>
  )

  // Stage 4 — Quotation & Negotiation
  if (stage >= 3) cards.push(
    <StageCard key="s4" stageNum={4} stage={stage} colorClass="border-amber-500" title="Quotation & Negotiation"
      doneLabel={quotationData ? `${Object.values(quotationData).filter(v => v.status === "finalized").length} finalized` : undefined}>
      <div className="space-y-5">
        {rfqData && NTD_COMMODITIES.map(commodity => {
          const commodityVendors = Object.entries(rfqData.vendors).filter(([, v]) => v.commodity === commodity)
          if (commodityVendors.length === 0) return null

          const finalizedCount = commodityVendors.filter(([vid]) => quotationData?.[vid]?.status === "finalized").length
          const quoteCount = commodityVendors.filter(([vid]) => quotationData?.[vid]?.quotation).length

          return (
            <div key={commodity} className="space-y-2">
              {/* Commodity section header */}
              <div className="flex items-center gap-3 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                  {commodity}
                </span>
                <span className="text-[11px] text-slate-400">
                  {finalizedCount}/{commodityVendors.length} finalized · {quoteCount} quoted
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Vendor cards for this commodity */}
              {commodityVendors.map(([vid, vendor]) => {
          const q = quotationData?.[vid]
          const isFinalized = q?.status === "finalized"
          const lastVendorCounter = [...(q?.thread ?? [])].reverse().find(m => m.author_type === "vendor" && m.counter_offer)
          const lastInternalCounter = [...(q?.thread ?? [])].reverse().find(m => m.author_type === "internal" && m.counter_offer)
          const vendorAwaitingResponse = q?.thread.length && q.thread[q.thread.length - 1].author_type === "vendor"
          const rfqUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/rfq/ntd/${id}/${vendor.token}`

          return (
            <div key={vid} className={`rounded-xl border overflow-hidden ${isFinalized ? "border-emerald-200" : "border-slate-200"}`}>

              {/* ── Header ── */}
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${isFinalized ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
                <p className="font-semibold text-slate-800 text-sm truncate flex-1">{vendor.vendor_name}</p>
                {vendorAwaitingResponse && !isFinalized && (
                  <span className="shrink-0 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full animate-pulse">
                    Vendor replied
                  </span>
                )}
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isFinalized ? "bg-emerald-100 text-emerald-700"
                  : q?.status === "negotiating" ? "bg-amber-100 text-amber-700"
                  : q?.status === "quotation_received" ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-500"}`}>
                  {isFinalized ? "Finalized ✓" : q?.status === "negotiating" ? "Negotiating" : q?.status === "quotation_received" ? "Quote received" : "Awaiting quote"}
                </span>
                <div className="shrink-0 flex items-center gap-1 text-[9px] text-slate-400 font-medium pl-1 border-l border-slate-200">
                  <span className="hidden sm:inline">RFQ link</span>
                  <CopyButton text={rfqUrl} />
                </div>
              </div>

              {/* ── Body: two-column split ── */}
              <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] divide-x divide-slate-100">

                {/* Left — quote summary + per-component category selection */}
                <div className="p-3 space-y-2">
                  {q?.quotation ? (
                    <>
                      {/* Lead time + doc */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Lead time</p>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{q.quotation.lead_time_days}d</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Currency</p>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{q.quotation.currency}</p>
                        </div>
                      </div>

                      {/* Per-component pricing table with inline category selection for sourcing */}
                      {q.quotation.component_prices && (() => {
                        const vendorComps = (initData?.components ?? []).filter(c => c.commodity === vendor.commodity && c.status !== "merged")
                        if (vendorComps.length === 0) return null
                        const hasSP = initData?.semi_Progressive?.[vendor.commodity as NTDCommodity] ?? false
                        const catSels = q.category_selections ?? {}

                        const categoryLabel: Record<PriceCategory, string> = { stage: "Stage", Progressive: "Progressive", semi_Progressive: "Semi" }

                        const selectedTotal = vendorComps.reduce((sum, comp) => {
                          const sel = catSels[comp.componentId]
                          if (!sel) return sum
                          const cp = q.quotation!.component_prices![comp.componentId]
                          if (!cp) return sum
                          return sum + (sel.selected_category === "stage" ? (cp.stage ?? 0)
                            : sel.selected_category === "Progressive" ? (cp.Progressive ?? 0)
                            : (cp.semi_Progressive ?? 0))
                        }, 0)

                        const allSelected = vendorComps.every(c => !!catSels[c.componentId])

                        return (
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                              Quoted Prices {isSourcing && <span className="text-amber-500">— select category per component</span>}
                            </p>
                            <div className="rounded-lg border border-slate-100 overflow-hidden">
                              <table className="w-full text-[10px]">
                                <thead>
                                  <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="px-2 py-1.5 text-left font-semibold text-slate-400 w-[30%]">Comp</th>
                                    <th className="px-2 py-1.5 text-right font-bold text-blue-600 border-l border-blue-50">Stage</th>
                                    <th className="px-2 py-1.5 text-right font-bold text-amber-600 border-l border-amber-50">Progressive</th>
                                    {hasSP && <th className="px-2 py-1.5 text-right font-bold text-indigo-600 border-l border-indigo-50">Semi</th>}
                                    <th className="px-2 py-1.5 text-center font-bold text-emerald-600 border-l border-slate-100 w-[80px]">
                                      {isSourcing ? "Apply" : "Applied"}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {vendorComps.map(comp => {
                                    const cp = q.quotation!.component_prices![comp.componentId]
                                    const sel = catSels[comp.componentId]
                                    const appliedPrice = sel && cp
                                      ? sel.selected_category === "stage" ? (cp.stage ?? 0)
                                      : sel.selected_category === "Progressive" ? (cp.Progressive ?? 0)
                                      : (cp.semi_Progressive ?? 0)
                                      : null

                                    return (
                                      <tr key={comp.componentId} className={`hover:bg-slate-50 ${sel ? "bg-emerald-50/30" : ""}`}>
                                        <td className="px-2 py-1.5">
                                          <span className="font-mono text-[9px] font-bold text-slate-400 mr-1">{comp.componentId}</span>
                                          <span className="text-slate-700 truncate">{comp.name}</span>
                                        </td>
                                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 border-l border-blue-50">
                                          {cp ? (cp.stage ?? 0).toLocaleString() : "—"}
                                        </td>
                                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 border-l border-amber-50">
                                          {cp ? (cp.Progressive ?? 0).toLocaleString() : "—"}
                                        </td>
                                        {hasSP && (
                                          <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 border-l border-indigo-50">
                                            {cp ? (cp.semi_Progressive ?? 0).toLocaleString() : "—"}
                                          </td>
                                        )}
                                        <td className="px-2 py-1.5 border-l border-slate-100 text-center">
                                          {isSourcing ? (
                                            <select
                                              value={sel?.selected_category ?? ""}
                                              onChange={e => {
                                                if (!e.target.value) return
                                                const cat = e.target.value as PriceCategory
                                                const price = cat === "stage" ? (cp?.stage ?? 0)
                                                  : cat === "Progressive" ? (cp?.Progressive ?? 0)
                                                  : (cp?.semi_Progressive ?? 0)
                                                const existing = getNTDQuotation(id) ?? {}
                                                const newSelections: Record<string, ComponentCategorySelection> = {
                                                  ...(existing[vid]?.category_selections ?? {}),
                                                  [comp.componentId]: { selected_category: cat, base_price: price, currency: q.quotation!.currency },
                                                }
                                                setNTDQuotation(id, {
                                                  ...existing,
                                                  [vid]: { ...existing[vid]!, category_selections: newSelections },
                                                })
                                                reload()
                                              }}
                                              className="text-[10px] rounded border border-slate-200 bg-white px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400 w-full"
                                            >
                                              <option value="">—</option>
                                              <option value="stage">Stage</option>
                                              <option value="Progressive">Progressive</option>
                                              {hasSP && <option value="semi_Progressive">Semi</option>}
                                            </select>
                                          ) : (
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sel ? "bg-emerald-100 text-emerald-700" : "text-slate-300"}`}>
                                              {sel ? categoryLabel[sel.selected_category] : "—"}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                                {allSelected && (
                                  <tfoot>
                                    <tr className="border-t-2 border-emerald-200 bg-emerald-50">
                                      <td colSpan={hasSP ? 4 : 3} className="px-2 py-2 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                                        Selected Total
                                      </td>
                                      <td className="px-2 py-2 text-right border-l border-emerald-200">
                                        <span className="text-sm font-bold text-emerald-800 tabular-nums">{q.quotation.currency} {selectedTotal.toLocaleString()}</span>
                                      </td>
                                    </tr>
                                  </tfoot>
                                )}
                              </table>
                            </div>
                            {/* Auto-fill counter-price hint */}
                            {allSelected && isSourcing && !isFinalized && (
                              <button
                                onClick={() => {
                                  setCounterPrice(prev => ({ ...prev, [vid]: String(selectedTotal) }))
                                  setCounterText(prev => ({ ...prev, [vid]: prev[vid] ?? `Negotiating on selected total: ${q.quotation!.currency} ${selectedTotal.toLocaleString()}` }))
                                }}
                                className="w-full text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors text-left"
                              >
                                ↓ Use selected total ({q.quotation.currency} {selectedTotal.toLocaleString()}) as counter-price
                              </button>
                            )}
                          </div>
                        )
                      })()}

                      {/* Quoted category totals (read-only reference) */}
                      {(q.quotation.stage_price != null || q.quotation.Progressive_price != null) && (
                        <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 space-y-0.5">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Quoted totals</p>
                          {q.quotation.stage_price != null && (
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Stage</span>
                              <span className="font-semibold text-slate-700">{q.quotation.currency} {q.quotation.stage_price.toLocaleString()}</span>
                            </div>
                          )}
                          {q.quotation.Progressive_price != null && (
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Progressive</span>
                              <span className="font-semibold text-slate-700">{q.quotation.currency} {q.quotation.Progressive_price.toLocaleString()}</span>
                            </div>
                          )}
                          {q.quotation.semi_Progressive_price != null && (
                            <div className="flex justify-between text-[10px]">
                              <span className="text-indigo-500">Semi-Progressive</span>
                              <span className="font-semibold text-indigo-700">{q.quotation.currency} {q.quotation.semi_Progressive_price.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {q.quotation.doc_link
                        ? <a href={q.quotation.doc_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline"><ExternalLink className="w-3 h-3" />Quote doc</a>
                        : <p className="text-[10px] text-slate-400">No doc attached</p>}

                      {isFinalized && (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold pt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Finalized
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-3 space-y-1">
                      <p className="text-[11px] text-slate-400 italic">No quote yet.</p>
                      <p className="text-[10px] text-slate-400">Share RFQ link for vendor to submit.</p>
                    </div>
                  )}
                </div>

                {/* Right — thread + actions */}
                <div className="p-3 flex flex-col gap-2">

                  {/* Thread — capped height, scrolls internally */}
                  {q?.thread && q.thread.length > 0 ? (
                    <div className="max-h-28 overflow-y-auto space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-1.5">
                      {q.thread.map(msg => (
                        <div key={msg.message_id}
                          className={`rounded-md px-2.5 py-1.5 text-[10px] w-fit max-w-[90%] ${msg.author_type === "internal" ? "bg-blue-900 text-white ml-auto" : "bg-white border border-slate-200 text-slate-800"}`}>
                          <p className={`text-[8px] font-bold mb-0.5 ${msg.author_type === "internal" ? "text-blue-200" : "text-slate-400"}`}>
                            {msg.author_type === "internal" ? `Sourcing — ${msg.author_name}` : `Vendor — ${vendor.vendor_name}`}
                          </p>
                          <p className="leading-snug">{msg.text}</p>
                          {(msg as any).doc_link && (
                            <a href={(msg as any).doc_link} target="_blank" rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 mt-0.5 text-[9px] font-semibold underline ${msg.author_type === "internal" ? "text-blue-200" : "text-blue-600"}`}>
                              <ExternalLink className="w-2.5 h-2.5" /> Attached doc
                            </a>
                          )}
                          {msg.counter_offer && (
                            <p className={`mt-0.5 text-[9px] font-bold ${msg.author_type === "internal" ? "text-blue-200" : "text-amber-700"}`}>
                              Counter: {q.quotation?.currency ?? "₹"} {msg.counter_offer.toLocaleString()}
                            </p>
                          )}
                          <p className={`text-[7px] mt-0.5 ${msg.author_type === "internal" ? "text-blue-300" : "text-slate-400"}`}>
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-400 text-center">
                      No messages yet
                    </div>
                  )}

                  {/* Sourcing action area — always below thread, never hidden */}
                  {isSourcing && !isFinalized && (
                    <div className="space-y-2">
                      {lastVendorCounter && (
                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                          <div>
                            <p className="text-[9px] font-semibold text-amber-900">Vendor counter</p>
                            <p className="text-xs font-bold text-amber-800">{q?.quotation?.currency ?? "₹"} {lastVendorCounter.counter_offer!.toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => handleAcceptVendorPrice(vid, vendor.vendor_name, lastVendorCounter.counter_offer!, q?.quotation?.currency ?? "INR")}
                            className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg transition-colors">
                            Accept & Finalize
                          </button>
                        </div>
                      )}
                      <textarea
                        value={counterText[vid] ?? ""}
                        onChange={e => setCounterText(prev => ({ ...prev, [vid]: e.target.value }))}
                        onFocus={pausePolling}
                        onBlur={resumePolling}
                        autoComplete="off"
                        placeholder="Message or negotiation note…"
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                      />
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={messageDocLinks[vid] ?? ""}
                          onChange={e => setMessageDocLinks(prev => ({ ...prev, [vid]: e.target.value }))}
                          onFocus={pausePolling}
                          onBlur={resumePolling}
                          autoComplete="off"
                          placeholder="Attach doc link (optional)"
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold">₹</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={counterPrice[vid] ?? ""}
                            onChange={e => setCounterPrice(prev => ({ ...prev, [vid]: e.target.value }))}
                            onFocus={pausePolling}
                            onBlur={resumePolling}
                            placeholder="Counter price (opt.)"
                            className="w-full rounded-lg border border-slate-200 pl-5 pr-2 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                        <button
                          onClick={() => handleSendCounter(vid, vendor.vendor_name)}
                          disabled={!counterText[vid]?.trim()}
                          className="text-[10px] font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          Send
                        </button>
                        {q?.quotation && (
                          <button onClick={() => {
                            const existing = quotationData ?? {}
                            setNTDQuotation(id, { ...existing, [vid]: { ...q, status: "finalized" } })
                            appendActivity(id, currentRole, ntdRole, 4, "quotation_submitted", `Quotation finalized for ${vendor.vendor_name}`, { vendor_id: vid })
                            reload()
                          }}
                            className="text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                            Finalize
                          </button>
                        )}
                      </div>
                      {lastInternalCounter && (
                        <p className="text-[9px] text-slate-400">
                          Last sent: {q?.quotation?.currency ?? "₹"} {lastInternalCounter.counter_offer!.toLocaleString()} — awaiting vendor reply
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
            </div>
          )
        })}

        {isSourcing && quotationData && Object.values(quotationData).some(v => v.status === "finalized") && (
          <button onClick={() => { advanceNTDStage(id, 5, currentRole, ntdRole); reload() }}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Proceed to Supplier Selection <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </StageCard>
  )

  // Stage 5 — Supplier Selection (comparison per commodity)
  if (stage >= 4) cards.push(
    <StageCard key="s5" stageNum={5} stage={stage} colorClass="border-blue-500" title="Supplier Selection"
      doneLabel={selectionData?.sourcing_approved ? `${Object.keys(selectionData.selections ?? {}).length} supplier(s) selected` : undefined}>
      {(() => {
        const activeCommodities = getActiveCommodities(id)
        const vendors = rfqData?.vendors ?? {}
        const quotations = quotationData ?? {}
        const currentSelections = selectionData?.selections ?? {}

        return (
          <div className="space-y-6">
            {activeCommodities.map(commodity => {
              const commodityVendors = Object.entries(vendors)
                .filter(([, v]) => v.commodity === commodity)
              const finalizedVendors = commodityVendors
                .filter(([vid]) => quotations[vid]?.status === "finalized")
              const commodityComponents = (initData?.components ?? [])
                .filter(c => c.commodity === commodity && c.status !== "merged")
              const selected = currentSelections[commodity]

              return (
                <div key={commodity} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{commodity}</span>
                      <span className="text-[10px] text-slate-400">{finalizedVendors.length} / {commodityVendors.length} vendors finalized</span>
                    </div>
                    {selected && (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> {selected.vendor_name}
                      </span>
                    )}
                  </div>

                  {finalizedVendors.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-slate-400 italic">No finalized vendors yet — complete Stage 4 negotiations first.</div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {finalizedVendors.map(([vid, vendor]) => {
                        const q = quotations[vid]?.quotation
                        const catSels = quotations[vid]?.category_selections ?? {}
                        const isSelected = selected?.vendor_id === vid
                        const effectiveTotal = commodityComponents.reduce((sum, comp) => {
                          const sel = catSels[comp.componentId]
                          const cp = q?.component_prices?.[comp.componentId]
                          if (!cp) return sum
                          const cat = sel?.selected_category ?? "stage"
                          return sum + (cat === "stage" ? (cp.stage ?? 0)
                            : cat === "Progressive" ? (cp.Progressive ?? 0)
                            : (cp.semi_Progressive ?? 0))
                        }, 0)
                        const categoryLabel: Record<string, string> = { stage: "Stage", Progressive: "Progressive", semi_Progressive: "Semi" }

                        return (
                          <div
                            key={vid}
                            className={`rounded-xl border overflow-hidden transition-colors ${
                              isSelected
                                ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-300"
                                : selected
                                ? "border-slate-200 bg-white opacity-60"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{vendor.vendor_name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400">{commodityComponents.length} component{commodityComponents.length !== 1 ? "s" : ""}</span>
                                    <span className="text-[9px] text-slate-300">|</span>
                                    <span className="text-[10px] text-slate-400">{q ? `${q.lead_time_days}d lead time` : ""}</span>
                                    <span className="text-[9px] text-slate-300">|</span>
                                    <span className="text-[10px] text-slate-400">{q ? q.currency : ""}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  {effectiveTotal != null && (
                                    <p className="text-lg font-black text-slate-900 tabular-nums leading-none">{q?.currency} {effectiveTotal.toLocaleString()}</p>
                                  )}
                                  <p className="text-[10px] text-slate-400 mt-0.5">{q ? `Total: ${q.currency} ${(q.amount ?? 0).toLocaleString()}` : ""}</p>
                                </div>
                                {isSourcing && !selected && (
                                  <button
                                    onClick={() => handleSelectCommoditySupplier(commodity, vid, vendor.vendor_name)}
                                    className="text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                                  >
                                    Select Supplier
                                  </button>
                                )}
                              </div>
                            </div>
                            {q?.component_prices && (
                              <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                                <p className="text-[10px] font-semibold text-slate-400">Per-component pricing — selected category</p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[10px] border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-100">
                                        <th className="px-2 py-1 text-left font-semibold text-slate-400">Component</th>
                                        <th className="px-2 py-1 text-center font-semibold text-slate-400">Category</th>
                                        <th className="px-2 py-1 text-right font-semibold text-slate-400">Price</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {commodityComponents.map(comp => {
                                        const cp = q.component_prices![comp.componentId]
                                        const catSel = catSels[comp.componentId]
                                        const cat = catSel?.selected_category ?? "stage"
                                        const price = cat === "stage" ? (cp?.stage ?? 0)
                                          : cat === "Progressive" ? (cp?.Progressive ?? 0)
                                          : (cp?.semi_Progressive ?? 0)
                                        const catColor = cat === "stage" ? "text-blue-700 bg-blue-50" :
                                          cat === "Progressive" ? "text-amber-700 bg-amber-50" :
                                          "text-indigo-700 bg-indigo-50"
                                        return (
                                          <tr key={comp.componentId}>
                                            <td className="px-2 py-1.5 text-slate-700">
                                              <span className="font-mono font-bold text-slate-400 mr-1">{comp.componentId}</span>
                                              {comp.name}
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${catColor}`}>
                                                {categoryLabel[cat] ?? cat}
                                              </span>
                                            </td>
                                            <td className={`px-2 py-1.5 text-right tabular-nums font-bold ${cat === "stage" ? "text-blue-700" : cat === "Progressive" ? "text-amber-700" : "text-indigo-700"}`}>
                                              {q?.currency ?? ""} {price.toLocaleString()}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t border-slate-100">
                                        <td className="px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Selected total</td>
                                        <td />
                                        <td className="px-2 py-1.5 text-right font-bold text-emerald-700 tabular-nums">
                                          {effectiveTotal != null ? (q?.currency ?? "") + " " + effectiveTotal.toLocaleString() : "—"}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {selectionData?.sourcing_approved && !selectionData.rnd_acknowledged && isRnd && (
              <div className="border border-indigo-200 rounded-xl bg-indigo-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-indigo-800">Acknowledge Supplier Selections</p>
                <div className="space-y-1">
                  {Object.entries(selectionData.selections ?? {}).map(([commodity, sel]) => (
                    <div key={commodity} className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-500 w-24 shrink-0">{commodity}</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-slate-700">{sel.vendor_name}</span>
                    </div>
                  ))}
                </div>
                <button onClick={handleRndAcknowledge}
                  className="w-full py-2 rounded-lg text-sm font-semibold bg-indigo-700 hover:bg-indigo-800 text-white transition-colors">
                  Acknowledge All Selections
                </button>
              </div>
            )}

            {selectionData?.sourcing_approved && !selectionData.rnd_acknowledged && !isRnd && (
              <p className="text-xs text-slate-400 italic">Awaiting R&D acknowledgement...</p>
            )}

            {selectionData?.rnd_acknowledged && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-sm text-emerald-800">Supplier selections acknowledged by {selectionData.rnd_acknowledged_by}</p>
              </div>
            )}
          </div>
        )
      })()}
    </StageCard>
  )

  // Stage 6 — Design Handoff
  if (stage >= 5) {
    const s6Commodities = getActiveCommodities(id)
    const s6Suppliers = record.selectedSuppliers ?? {}
    const s6AckMap = handoffData?.supplier_acknowledged_by_commodity ?? {}
    const s6AllAcked = handoffData?.supplier_acknowledged === true
    const s6DoneLabel = s6AllAcked
      ? `${handoffData?.component_count ?? 0} components · All suppliers acknowledged`
      : undefined
    cards.push(
      <StageCard key="s6" stageNum={6} stage={stage} colorClass="border-emerald-500" title="Final Design Handoff"
        doneLabel={s6DoneLabel}>
        <div className="space-y-4">
          {!handoffData?.submitted_by ? isRnd ? (
            <div className="space-y-4">
              {/* Component preview from initiation data */}
              {initData?.components && initData.components.filter(c => c.status !== "merged").length > 0 ? (
                <div className="space-y-2">
                  {(() => { const activeComps = initData.components.filter(c => c.status !== "merged"); return (
                  <>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Components ({activeComps.length})</p>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">Component list is locked from Stage 1 and cannot be changed.</p>
                  </div>
                  {activeComps.map(c => (
                    <div key={c.componentId} className="flex gap-2 items-center text-xs text-slate-700">
                      <span className="font-bold text-slate-400 w-10">{c.componentId}</span>
                      <span className="flex-1">{c.name}</span>
                      <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{c.commodity}</span>
                    </div>
                  ))}
                  </>
                  )})()}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Components ({components.length})</p>
                    <button onClick={() => {
                      const nextNum = String(components.length + 1).padStart(2, "0")
                      setComponents(prev => [...prev, { id: `C${nextNum}`, name: "" }])
                    }}
                      className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add Component
                    </button>
                  </div>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">Component list cannot be changed after submission.</p>
                  </div>
                  {components.map(c => (
                    <div key={c.id} className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-slate-400 w-10">{c.id}</span>
                      <input type="text" placeholder="Component name" value={c.name}
                        onChange={e => setComponents(prev => prev.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                      <button onClick={() => components.length > 1 && setComponents(prev => prev.filter(x => x.id !== c.id))}
                        disabled={components.length === 1}
                        className="p-1.5 text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Final design files — click to mark uploaded */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Final Design Files</p>
                  <button onClick={() => setFinalDesignSlots(prev => [...prev, { id: String(Date.now()), slotName: "", link: "" }])}
                    className="text-xs text-emerald-700 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Slot</button>
                </div>
                {finalDesignSlots.map(slot => {
                  const isUploaded = !!slot.link
                  return (
                  <div key={slot.id} className="flex gap-2 bg-slate-50 rounded-lg p-2 flex-wrap items-center">
                    <input type="text" placeholder="File name" value={slot.slotName}
                      onChange={e => setFinalDesignSlots(prev => prev.map(s => s.id === slot.id ? { ...s, slotName: e.target.value } : s))}
                      className="w-40 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                    <button type="button"
                      onClick={() => setFinalDesignSlots(prev => prev.map(s => s.id === slot.id ? { ...s, link: isUploaded ? "" : "uploaded", fileName: isUploaded ? "" : s.slotName || "file" } : s))}
                      className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${isUploaded ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 border border-transparent"}`}>
                      {isUploaded ? <><CheckCircle2 className="w-3.5 h-3.5" /> Uploaded</> : "Click to Upload"}
                    </button>
                    <button type="button" onClick={() => setFinalDesignSlots(prev => prev.filter(s => s.id !== slot.id))}
                      className="p-1 text-slate-300 hover:text-red-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )})}
              </div>

              <button onClick={handleSubmitHandoff}
                disabled={!initData?.components?.length && components.every(c => !c.name.trim())}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                Submit & Notify Suppliers
              </button>
            </div>
          ) : <p className="text-sm text-slate-400 italic">Awaiting R&D to submit design handoff...</p>
          : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">{handoffData.component_count} components submitted by {handoffData.submitted_by}</p>

              {/* Per-commodity acknowledgement tracker */}
              {s6Commodities.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supplier Acknowledgement</p>
                  {s6Commodities.map(commodity => {
                    const supplierName = s6Suppliers[commodity] ?? "—"
                    const acked = s6AckMap[commodity] === true
                    const portalUrl = `/supplier/ntd/${id}?commodity=${encodeURIComponent(commodity)}`
                    const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${portalUrl}`
                    return (
                      <div key={commodity} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${acked ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700">{commodity}</p>
                          <p className="text-[11px] text-slate-500 truncate">{supplierName}</p>
                        </div>
                        {acked ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                            </span>
                            {s6Suppliers[commodity] && (<>
                              <Link href={`/ntd/${id}/dfm`}
                                className="text-[10px] font-semibold bg-purple-700 hover:bg-purple-800 text-white px-2.5 py-1 rounded-lg transition-colors">
                                DFM
                              </Link>
                              <Link href={`/ntd/${id}/mould-design`}
                                className="text-[10px] font-semibold bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg transition-colors">
                                Mould
                              </Link>
                            </>)}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium">
                              <Clock className="w-3.5 h-3.5" /> Awaiting
                            </div>
                            <code className="text-[10px] bg-white border border-amber-200 px-1.5 py-0.5 rounded hidden sm:block">{portalUrl}</code>
                            <CopyButton text={fullUrl} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Fallback: single supplier portal (no commodity data) */
                <div className="space-y-2">
                  {!s6AllAcked && (
                    <>
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <p className="text-xs text-amber-800">Awaiting supplier acknowledgement</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500">Supplier portal:</p>
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">/supplier/ntd/{id}</code>
                        <CopyButton text={`${typeof window !== "undefined" ? window.location.origin : ""}/supplier/ntd/${id}`} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {!s6AllAcked && isRnd && (
                <button onClick={handleSimulateSupplierAck}
                  className="text-xs font-semibold border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors">
                  ⚡ Simulate All Suppliers Acknowledged (demo)
                </button>
              )}

              {s6AllAcked && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All suppliers acknowledged — proceeding to DFM
                </div>
              )}
            </div>
          )}
        </div>
      </StageCard>
    )
  }

  // Stage 7 — DFM
  if (stage >= 6) cards.push(
    <StageCard key="s7" stageNum={7} stage={stage} colorClass="border-purple-500" title="DFM Review"
      doneLabel={dfmData?.stage_complete ? `${dfmProgress.approved}/${dfmDenominator} approved` : undefined}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">{dfmProgress.approved} / {dfmDenominator} components approved</p>
            {dfmDenominator > 0 && (
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-48 mt-1">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.round((dfmProgress.approved / dfmDenominator) * 100)}%` }} />
              </div>
            )}
          </div>
          {stage === 7 && (
            <Link href={`/ntd/${id}/dfm`}
              className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
              Open DFM Review <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        {/* Per-component DFM status + mfg readiness */}
        {dfmData && dfmData.components.length > 0 && (
          <div className="space-y-1.5">
            {dfmData.components.map(comp => {
              const isApproved = comp.final_status === "approved"
              const isReady = componentMfgReady[comp.componentId] ?? false
              return (
                <div key={comp.componentId} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${isApproved ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100 bg-white"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">{comp.componentId}</span>
                    <span className="text-xs text-slate-700 truncate">{comp.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${isApproved ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {isApproved ? "Approved" : comp.final_status === "revision_required" ? "Revise" : comp.final_status === "under_review" ? "Review" : "Pending"}
                    </span>
                  </div>
                  {isApproved && !dfmData.stage_complete && (
                    <button
                      onClick={() => handleToggleMfgReady(comp.componentId)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors shrink-0 ${isReady ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700"}`}
                    >
                      {isReady ? "Ready for Mfg" : "Mark Ready for Mfg"}
                    </button>
                  )}
                  {isApproved && dfmData.stage_complete && (
                    <span className={`text-[10px] font-semibold shrink-0 ${isReady ? "text-emerald-600" : "text-slate-400"}`}>
                      {isReady ? "✓ Ready for Mfg" : "Not marked for Mfg"}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </StageCard>
  )

  // Stage 8 — Mould Design
  if (stage >= 7) cards.push(
    <StageCard key="s8" stageNum={8} stage={stage} colorClass="border-slate-500" title="Mould Design"
      doneLabel={mouldData?.stage_complete ? `${mouldProgress.approved} components approved` : undefined}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${mouldSubStage === "8A" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
            Sub-stage {mouldSubStage}
          </span>
          {mouldSubStage === "8A" && (
            <p className="text-sm text-slate-600">{mouldProgress.approved} / {mouldDenominator} components approved</p>
          )}
        </div>
        {/* Per-component mould status + mfg readiness */}
        {mouldData && mouldData.components.length > 0 && (
          <div className="space-y-1.5">
            {mouldData.components.map(comp => {
              const isApproved = comp.final_status === "approved"
              const isReady = componentMfgReady[comp.componentId] ?? false
              return (
                <div key={comp.componentId} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${isApproved ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100 bg-white"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">{comp.componentId}</span>
                    <span className="text-xs text-slate-700 truncate">{comp.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${isApproved ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {isApproved ? "Approved" : comp.final_status === "revision_required" ? "Revise" : comp.final_status === "under_review" ? "Review" : "Pending"}
                    </span>
                  </div>
                  {isApproved && (
                    <button
                      onClick={() => handleToggleMfgReady(comp.componentId)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors shrink-0 ${isReady ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700"}`}
                    >
                      {isReady ? "Ready for Mfg" : "Mark Ready for Mfg"}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {stage === 8 && (
          <Link href={`/ntd/${id}/mould-design`}
            className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
            Open Mould Design Review <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </StageCard>
  )

  // Stage 9 — Manufacturing (per-commodity dashboard)
  const activeCommodities9 = getActiveCommodities(id)
  const allMfgComplete = activeCommodities9.length > 0 &&
    activeCommodities9.every(c => mfgV2Data[c]?.status === "complete")

  if (stage >= 8) cards.push(
    <StageCard key="s9" stageNum={9} stage={stage} colorClass="border-blue-500" title="Manufacturing"
      doneLabel={allMfgComplete ? `All ${activeCommodities9.length} commodity supplier(s) complete` : undefined}>
      <div className="space-y-4">
        {activeCommodities9.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No active commodities found. Complete Stage 5 supplier selection first.</p>
        ) : (
          <>
            {/* Per-commodity progress overview */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">
                {activeCommodities9.filter(c => mfgV2Data[c]?.status === "complete").length} / {activeCommodities9.length} suppliers complete
              </span>
            </div>
            {/* Per-commodity cards */}
            <div className="space-y-3">
              {activeCommodities9.map(commodity => {
                const supplierName = record?.selectedSuppliers?.[commodity] ?? "—"
                const commData = mfgV2Data[commodity]
                const commStatus = commData?.status ?? "not_started"
                const commUpdates = commData?.updates ?? []
                const updateNote = mfgV2Updates[commodity] ?? ""

                const commodityComponents = (initData?.components ?? []).filter(
                  c => c.commodity === commodity && c.status !== "merged"
                )
                const readyCount = commodityComponents.filter(c => componentMfgReady[c.componentId]).length
                const totalCount = commodityComponents.length

                return (
                  <div key={commodity} className={`rounded-xl border p-4 space-y-3 ${
                    commStatus === "complete" ? "border-emerald-200 bg-emerald-50" :
                    commStatus === "in_progress" ? "border-amber-200 bg-amber-50" :
                    "border-slate-200 bg-slate-50"
                  }`}>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{commodity}</p>
                        <p className="text-xs text-slate-500">Supplier: <span className="font-medium text-slate-700">{supplierName}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{readyCount}/{totalCount} components ready</span>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          commStatus === "complete" ? "bg-emerald-100 text-emerald-700" :
                          commStatus === "in_progress" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-200 text-slate-500"
                        }`}>
                          {commStatus === "complete" ? "Complete" : commStatus === "in_progress" ? "In Progress" : "Not Started"}
                        </span>
                      </div>
                    </div>

                    {/* Per-component readiness list */}
                    {commodityComponents.length > 0 && (
                      <div className="space-y-1">
                        {commodityComponents.map(comp => {
                          const isReady = componentMfgReady[comp.componentId] ?? false
                          return (
                            <div key={comp.componentId} className="flex items-center justify-between rounded-lg bg-white border border-slate-100 px-3 py-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[9px] font-bold text-slate-400 shrink-0">{comp.componentId}</span>
                                <span className="text-[11px] text-slate-700 truncate">{comp.name}</span>
                              </div>
                              <span className={`text-[10px] font-semibold shrink-0 ${isReady ? "text-emerald-600" : "text-slate-400"}`}>
                                {isReady ? "✓ Ready" : "Pending DFM/Mould"}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Supplier portal link — shown until timeline submitted */}
                    {commStatus === "not_started" && (() => {
                      const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/supplier/ntd/${id}?commodity=${encodeURIComponent(commodity)}`
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Supplier Portal</p>
                            <p className="text-xs text-slate-500 truncate">{portalUrl}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a href={portalUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                              <ExternalLink className="w-3 h-3" /> Open
                            </a>
                            <CopyButton text={portalUrl} />
                          </div>
                        </div>
                      )
                    })()}

                    {/* Delivery timeline phases (from supplier submission) */}
                    {commData && (commData.phases ?? []).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier Delivery Timeline</p>
                        {commData.phases!.map(p => (
                          <div key={p.name} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-slate-100">
                            <span className="text-slate-600">{p.name}</span>
                            <span className="font-bold text-slate-800">{p.days} days</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-xs bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-200">
                          <span className="font-bold text-blue-700">Total · Expected Delivery</span>
                          <span className="font-black text-blue-900">
                            {commData.phases!.reduce((s, p) => s + p.days, 0)}d
                            {commData.eta_date ? ` · ${new Date(commData.eta_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Completion strip */}
                    {commStatus === "complete" && commData && (
                      <div className="flex items-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed by <span className="font-semibold">{commData.completed_by}</span> · {new Date(commData.completed_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Updates feed */}
                    {commUpdates.length > 0 && (
                      <div className="space-y-1.5 max-h-28 overflow-y-auto">
                        {[...commUpdates].reverse().map(u => (
                          <div key={u.update_id} className="text-xs bg-white rounded-lg px-3 py-2 border border-slate-100">
                            <span className="text-slate-400">{new Date(u.date).toLocaleDateString()}</span>
                            <span className="text-slate-500 mx-1">·</span>
                            <span className="font-medium text-slate-500 mr-1">{u.posted_by}</span>
                            {u.note}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions (Sourcing only, not complete) */}
                    {commStatus !== "complete" && isSourcing && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Post a status update..."
                          value={updateNote}
                          onFocus={pausePolling}
                          onBlur={resumePolling}
                          onChange={e => setMfgV2Updates(prev => ({ ...prev, [commodity]: e.target.value }))}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                          onClick={() => { if (updateNote.trim()) handlePostMfgUpdate(commodity, updateNote.trim()) }}
                          disabled={!updateNote.trim()}
                          className="text-xs font-semibold bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Post
                        </button>
                        <button
                          onClick={() => handleMarkMfgComplete(commodity)}
                          className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Mark Complete
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </StageCard>
  )

  // Stage 10 — Trials
  if (stage >= 9) cards.push(
    <StageCard key="s10" stageNum={10} stage={stage} colorClass="border-orange-500" title="Trials"
      doneLabel={trialsData?.stage_complete ? `All ${trialProgress.total} components passed` : undefined}>
      <div className="space-y-3">
        {/* Summary row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">{trialProgress.passed} / {trialProgress.total} components passed (cumulative)</p>
            {trialsData && <p className="text-xs text-slate-400">{trialsData.trials.length} trial(s) conducted</p>}
          </div>
          {stage === 10 && (
            <Link href={`/ntd/${id}/trials`}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
              Open Trials <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Per-trial dispatch / received cards */}
        {stage === 10 && trialsData && trialsData.trials.length > 0 && (
          <div className="space-y-2">
            {trialsData.trials.map(t => {
              const isPending     = t.status === "pending"
              const isDispatched  = t.status === "samples_dispatched"
              const isReceived    = ["samples_received", "testing", "complete"].includes(t.status)
              return (
                <div key={t.trial_no} className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 ${
                  isReceived   ? "border-indigo-200 bg-indigo-50" :
                  isDispatched ? "border-blue-200 bg-blue-50" :
                  "border-slate-200 bg-slate-50"
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isReceived ? "bg-indigo-600 text-white" :
                      isDispatched ? "bg-blue-600 text-white" :
                      "bg-slate-300 text-slate-600"
                    }`}>T{t.trial_no}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {isReceived   ? (t.status === "complete" ? "Complete" : "Samples Received") :
                         isDispatched ? "Samples Dispatched by Supplier" :
                         "Awaiting Supplier Dispatch"}
                      </p>
                      {isDispatched && t.samples_dispatched_at && (
                        <p className="text-[10px] text-blue-500">
                          Dispatched {new Date(t.samples_dispatched_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                      {isReceived && t.samples_received_at && (
                        <p className="text-[10px] text-indigo-500">
                          Received {new Date(t.samples_received_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* R&D action: mark received */}
                  {isDispatched && isRnd && (
                    <button
                      onClick={() => handleMarkSamplesReceivedMain(t.trial_no)}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Received
                    </button>
                  )}

                  {isPending && (
                    <span className="text-[10px] text-slate-400 italic shrink-0">Awaiting supplier</span>
                  )}
                  {isReceived && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      t.status === "complete" && t.result === "all_pass" ? "bg-emerald-100 text-emerald-700" :
                      t.status === "complete" ? "bg-red-100 text-red-700" :
                      "bg-indigo-100 text-indigo-700"
                    }`}>
                      {t.status === "complete" ? (t.result === "all_pass" ? "All Pass" : "Partial Fail") : "In Testing"}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Supplier portal link */}
        {stage === 10 && (() => {
          const supplierUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/supplier/ntd/${id}`
          return (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Supplier Portal</p>
                <p className="text-xs text-slate-500 truncate">{supplierUrl}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a href={supplierUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                  <ExternalLink className="w-3 h-3" /> Open
                </a>
                <CopyButton text={supplierUrl} />
              </div>
            </div>
          )
        })()}
      </div>
    </StageCard>
  )

  // Stage 11 — Commissioning
  if (stage >= 10) {
    const subStepNames = ["Inspection Report", "Commissioning", "Shipment", "EXIM Clearance", "Arrival", "Final Sign-off"]
    cards.push(
      <StageCard key="s11" stageNum={11} stage={stage} colorClass="border-slate-600" title="Commissioning & Dispatch"
        doneLabel={complete ? "NTD Complete" : undefined}>
        <div className="space-y-4">
          {/* Sub-step progress bar */}
          <div className="flex gap-1">
            {subStepNames.map((name, i) => {
              const stepNum = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6
              const isDoneStep = s11Step > stepNum || complete
              const isCurrentStep = s11Step === stepNum && !complete
              return (
                <div key={i} className={`flex-1 rounded px-1.5 py-1.5 text-center transition-all ${
                  isDoneStep ? "bg-emerald-600" : isCurrentStep ? "bg-blue-700 ring-1 ring-blue-400 ring-offset-1" : "bg-slate-100"
                }`}>
                  <p className={`text-[9px] font-bold truncate ${isDoneStep || isCurrentStep ? "text-white" : "text-slate-400"}`}>{name}</p>
                </div>
              )
            })}
          </div>

          {complete ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="font-semibold text-emerald-800">NTD Complete — Tool approved and received</p>
            </div>
          ) : (
            <div className="text-sm text-slate-600">
              {s11Step === 1 && (
                <div className="space-y-3">
                  <p className="text-slate-500">Step 1: Each commodity supplier must submit a Final Inspection Report</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">/supplier/ntd/{id}</code>
                    <CopyButton text={`${typeof window !== "undefined" ? window.location.origin : ""}/supplier/ntd/${id}`} />
                  </div>
                  {(() => {
                    const activeCommodities = getActiveCommodities(id)
                    const inspections = s11Data?.inspection ?? {}
                    return (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700">
                          Final Inspection Reports — {Object.keys(inspections).length} / {activeCommodities.length} submitted
                        </p>
                        {activeCommodities.map(commodity => {
                          const insp = inspections[commodity]
                          const supplierName = record?.selectedSuppliers?.[commodity] ?? commodity
                          return (
                            <div key={commodity} className={`border rounded-xl p-3 ${insp ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                              <div className="flex items-center justify-between mb-1">
                                <div>
                                  <span className="text-xs font-bold text-slate-700">{commodity}</span>
                                  <span className="ml-2 text-xs text-slate-400">{supplierName}</span>
                                </div>
                                {insp
                                  ? <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Submitted</span>
                                  : <span className="text-xs text-amber-600 font-semibold">Awaiting</span>
                                }
                              </div>
                              {insp && (
                                <p className="text-xs text-slate-500">Submitted by {insp.submitted_by} · {new Date(insp.submitted_at).toLocaleDateString()}</p>
                              )}
                              {!insp && (
                                <p className="text-xs text-slate-400 italic">Supplier will upload via portal</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              )}
              {s11Step === 2 && isSourcing && (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-700">Step 2: Commissioning</p>
                  <button onClick={() => {
                    const existing = s11Data ?? { inspection: null, commissioning: null, shipment: null, exim: null, arrival: null, final_approval: null }
                    setNTDStage11(id, { ...existing, commissioning: { checklist_items: [], pack_list: createVersionedFile("Pack List", "", currentRole), invoice: createVersionedFile("Invoice", "", currentRole), completed_by: currentRole, completed_at: new Date().toISOString() } })
                    appendActivity(id, currentRole, ntdRole, 11, "stage_complete", "Commissioning completed")
                    reload()
                  }}
                    className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors">
                    Mark Commissioning Complete
                  </button>
                </div>
              )}
              {s11Step === 3 && isSourcing && (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-700">Step 3: Shipment Setup</p>
                  <button onClick={() => {
                    const existing = s11Data ?? { inspection: null, commissioning: null, shipment: null, exim: null, arrival: null, final_approval: null }
                    setNTDStage11(id, { ...existing, shipment: { exim_docs: [], mode: "sea", tracking_id: "TRK-DEMO", dispatched_at: new Date().toISOString(), dispatched_by: currentRole } })
                    appendActivity(id, currentRole, ntdRole, 11, "shipment_update", "Shipment confirmed")
                    reload()
                  }}
                    className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors">
                    Confirm Shipment
                  </button>
                </div>
              )}
              {s11Step === 4 && (isExim || currentRole === "super_admin") && (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-700">Step 4: EXIM Clearance</p>
                  <button onClick={() => {
                    const existing = s11Data ?? { inspection: null, commissioning: null, shipment: null, exim: null, arrival: null, final_approval: null }
                    setNTDStage11(id, { ...existing, exim: { updates: [], cleared: true, cleared_at: new Date().toISOString() } })
                    appendActivity(id, currentRole, ntdRole, 11, "exim_update", "EXIM cleared")
                    reload()
                  }}
                    className="text-sm font-semibold bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg transition-colors">
                    Mark EXIM Cleared
                  </button>
                </div>
              )}
              {s11Step === 5 && isSourcing && (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-700">Step 5: Tool Arrival</p>
                  <button onClick={() => {
                    const existing = s11Data ?? { inspection: null, commissioning: null, shipment: null, exim: null, arrival: null, final_approval: null }
                    setNTDStage11(id, { ...existing, arrival: { arrived_at: new Date().toISOString(), confirmed_by: currentRole } })
                    appendActivity(id, currentRole, ntdRole, 11, "stage_complete", "Tool arrived at Gurugram plant")
                    reload()
                  }}
                    className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors">
                    Confirm Tool Arrived at Gurugram
                  </button>
                </div>
              )}
              {s11Step === 6 && (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-700">Step 6: Final Sign-off (Both Required)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-lg border px-3 py-2 ${s11Data?.final_approval?.rnd_head_approved ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">R&D Head</p>
                      {s11Data?.final_approval?.rnd_head_approved
                        ? <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</p>
                        : canApprove ? (
                          <button onClick={() => {
                            const existing = s11Data ?? { inspection: null, commissioning: null, shipment: null, exim: null, arrival: null, final_approval: null }
                            const fa = existing.final_approval ?? { rnd_head_approved: false, rnd_head_by: "", rnd_head_at: "", sourcing_head_approved: false, sourcing_head_by: "", sourcing_head_at: "", ntd_complete: false }
                            const updated = { ...fa, rnd_head_approved: true, rnd_head_by: currentRole, rnd_head_at: new Date().toISOString() }
                            const complete = updated.rnd_head_approved && updated.sourcing_head_approved
                            setNTDStage11(id, { ...existing, final_approval: { ...updated, ntd_complete: complete } })
                            if (complete) {
                              const r = getNTDRecord(id)
                              if (r) saveNTDRecord({ ...r, status: "complete" })
                              appendActivity(id, currentRole, ntdRole, 11, "ntd_complete", "NTD marked complete — dual sign-off")
                            } else {
                              appendActivity(id, currentRole, ntdRole, 11, "dual_signed", "R&D Head signed off")
                            }
                            reload()
                          }}
                            className="mt-1 text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1 rounded-lg transition-colors">
                            Approve
                          </button>
                        ) : <p className="text-xs text-slate-400 italic">Pending</p>}
                    </div>
                    <div className={`rounded-lg border px-3 py-2 ${s11Data?.final_approval?.sourcing_head_approved ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Sourcing Head</p>
                      {s11Data?.final_approval?.sourcing_head_approved
                        ? <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</p>
                        : (currentRole === "sourcing_head" || currentRole === "super_admin") ? (
                          <button onClick={() => {
                            const existing = s11Data ?? { inspection: null, commissioning: null, shipment: null, exim: null, arrival: null, final_approval: null }
                            const fa = existing.final_approval ?? { rnd_head_approved: false, rnd_head_by: "", rnd_head_at: "", sourcing_head_approved: false, sourcing_head_by: "", sourcing_head_at: "", ntd_complete: false }
                            const updated = { ...fa, sourcing_head_approved: true, sourcing_head_by: currentRole, sourcing_head_at: new Date().toISOString() }
                            const complete = updated.rnd_head_approved && updated.sourcing_head_approved
                            setNTDStage11(id, { ...existing, final_approval: { ...updated, ntd_complete: complete } })
                            if (complete) {
                              const r = getNTDRecord(id)
                              if (r) saveNTDRecord({ ...r, status: "complete" })
                              appendActivity(id, currentRole, ntdRole, 11, "ntd_complete", "NTD marked complete — dual sign-off")
                            } else {
                              appendActivity(id, currentRole, ntdRole, 11, "dual_signed", "Sourcing Head signed off")
                            }
                            reload()
                          }}
                            className="mt-1 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white px-3 py-1 rounded-lg transition-colors">
                            Approve
                          </button>
                        ) : <p className="text-xs text-slate-400 italic">Pending</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </StageCard>
    )
  }

  // Build stepper pills
  const stageProgress = Array.from({ length: 11 }, (_, i) => {
    const s = i + 1
    return {
      step: s,
      name: s === 8 ? `8${mouldSubStage}` : String(s),
      label: STAGE_NAMES[s] ?? String(s),
      status: stage > s ? "complete" : stage === s ? "current" : "upcoming",
    }
  })

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 py-6 animate-in fade-in duration-300">
      {/* Back link */}
      <Link href="/ntd" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Tool Development
      </Link>

      {/* Header card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          {/* Left */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">{record.id}</span>
              {complete && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Complete</span>}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{record.title}</h1>
            <p className="text-slate-500 text-sm">New Tool Development · {record.component_count != null ? `${record.component_count} Components` : "Components TBD"}</p>
            <span className="inline-block bg-slate-100 text-slate-700 border-none text-xs px-2.5 py-1 rounded-full">New Tool Development (NTD)</span>
          </div>

          {/* Right: 2×2 info tiles */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Assigned SPOC</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">Rohan Desai</p>
              <p className="text-[10px] text-slate-400">Others</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Building2 className="w-3 h-3" /> Supplier</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-tight line-clamp-2">
                {record.supplier ?? <span className="text-slate-400 italic font-normal text-xs">TBD</span>}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Package className="w-3 h-3" /> Components</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {record.component_count ?? <span className="text-slate-400 italic text-xs font-normal">Set in Stage 6</span>}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 w-[160px] h-[90px] overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Wrench className="w-3 h-3" /> Current Stage</p>
              <p className="text-sm font-semibold text-blue-900 mt-0.5 leading-tight line-clamp-2">
                {complete ? "Complete" : `${stage}. ${STAGE_NAMES[stage]}`}
              </p>
            </div>
          </div>
        </div>

        {/* Demo controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Demo Controls</span>
          <div className="flex items-center gap-2">
            <button
              onClick={demoRevert}
              disabled={stage <= 1}
              className="text-xs h-7 px-3 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Previous Stage
            </button>
            <span className="text-xs text-slate-400 font-medium">Stage {stage} / 11</span>
            <button
              onClick={demoAdvance}
              disabled={stage >= 11 || complete}
              className="text-xs h-7 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Demo: Next Stage →
            </button>
          </div>
        </div>
      </div>

      {/* Stage stepper */}
      <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex min-w-[900px] gap-1">
          {stageProgress.map(s => {
            const chipBg = s.status === "complete" ? "bg-blue-900"
              : s.status === "current" ? "bg-blue-700 ring-2 ring-blue-400 ring-offset-1"
              : "bg-slate-100"
            const labelColor = s.status !== "upcoming" ? "text-blue-200" : "text-slate-400"
            const nameColor = s.status !== "upcoming" ? "text-white" : "text-slate-400"
            return (
              <div key={s.step} className={`flex-1 rounded-md px-2 py-2.5 flex flex-col gap-1 transition-all duration-300 ${chipBg}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${labelColor}`}>
                  {s.step === 8 ? `Step ${s.step}${mouldSubStage}` : `Step ${s.step}`}
                </span>
                <span className={`text-[11px] font-semibold leading-tight ${nameColor}`}>{STAGE_NAMES[s.step]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab("overview")}
          className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${activeTab === "overview" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Overview
        </button>
        <button onClick={() => setActiveTab("activity")}
          className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${activeTab === "activity" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Activity
        </button>
        <button onClick={() => setActiveTab("documents")}
          className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${activeTab === "documents" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Documents
        </button>
      </div>

      {/* Content */}
      {activeTab === "overview" ? (
        <div className="space-y-3">
          {[...cards].reverse()}
        </div>
      ) : activeTab === "activity" ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <ActivityFeed ntdId={id} />
        </div>
      ) : (
        /* Documents tab — all VersionedFiles across every stage */
        (() => {
          type DocEntry = { stage: string; label: string; file: import("@/types/ntd").VersionedFile }
          const docs: DocEntry[] = []

          // Stage 1 part specs
          initData?.part_specs.forEach(f => docs.push({ stage: "Stage 1 — Initiation", label: f.slot_name, file: f }))
          // Stage 2 spec sheet
          if (specData?.spec_sheet) docs.push({ stage: "Stage 2 — Spec Sheet", label: "Spec Sheet", file: specData.spec_sheet })
          // Stage 6 final designs
          handoffData?.final_designs.forEach(f => docs.push({ stage: "Stage 6 — Design Handoff", label: f.slot_name, file: f }))
          // Stage 7 DFM files
          dfmData?.components.forEach(c => {
            if (c.ppt) docs.push({ stage: "Stage 7 — DFM", label: `${c.name} — PPT`, file: c.ppt })
            if (c.design_3d) docs.push({ stage: "Stage 7 — DFM", label: `${c.name} — 3D Design`, file: c.design_3d })
          })
          // Stage 8 mould files
          mouldData?.components.forEach(c => {
            if (c.mould_3d) docs.push({ stage: "Stage 8 — Mould Design", label: `${c.name} — Mould 3D`, file: c.mould_3d })
            if (c.mfa_ppt) docs.push({ stage: "Stage 8 — Mould Design", label: `${c.name} — MFA PPT`, file: c.mfa_ppt })
          })
          mouldData?.joint_review?.supplier_files.forEach(f => docs.push({ stage: "Stage 8 — Joint Review", label: f.slot_name, file: f }))
          // Stage 11 — per-commodity inspection reports
          if (s11Data?.inspection) {
            Object.entries(s11Data.inspection).forEach(([commodity, insp]) => {
              if (insp?.report) docs.push({ stage: "Stage 11 — Commissioning", label: `Final Inspection Report (${commodity})`, file: insp.report })
            })
          }
          if (s11Data?.commissioning?.pack_list) docs.push({ stage: "Stage 11 — Commissioning", label: "Pack List", file: s11Data.commissioning.pack_list })
          if (s11Data?.commissioning?.invoice) docs.push({ stage: "Stage 11 — Commissioning", label: "Invoice", file: s11Data.commissioning.invoice })
          s11Data?.shipment?.exim_docs.forEach(f => docs.push({ stage: "Stage 11 — Shipment", label: f.slot_name, file: f }))

          // Group by stage
          const grouped = docs.reduce<Record<string, DocEntry[]>>((acc, d) => {
            acc[d.stage] = acc[d.stage] ?? []
            acc[d.stage].push(d)
            return acc
          }, {})

          return docs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No documents yet. Files will appear here as stages progress.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([stageName, entries]) => (
                <div key={stageName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-600">{stageName}</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {entries.map((d, i) => {
                      const latestLink = d.file.versions.find(v => v.version_no === d.file.current_version)?.link ?? ""
                      const latestUploader = d.file.versions.find(v => v.version_no === d.file.current_version)?.uploaded_by ?? ""
                      return (
                        <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{d.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              v{d.file.current_version} · {d.file.versions.length} version(s)
                              {latestUploader && ` · ${latestUploader}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {d.file.approved && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Approved</span>
                            )}
                            {latestLink ? (
                              <a href={latestLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors">
                                <ExternalLink className="w-3 h-3" /> Open
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No link</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()
      )}
    </div>
  )
}
