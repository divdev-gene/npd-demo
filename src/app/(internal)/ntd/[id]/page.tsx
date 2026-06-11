"use client"
import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2, Circle, ChevronRight, ArrowLeft, Wrench,
  AlertTriangle, ExternalLink, Plus, Trash2, Copy, Check,
  Users, Clock, Package, Building2
} from "lucide-react"
import {
  getNTDRecord, getNTDInitiation, getNTDSpec, setNTDSpec,
  getNTDRFQ, setNTDRFQ, getNTDQuotation, setNTDQuotation,
  getNTDSelection, setNTDSelection, getNTDHandoff, setNTDHandoff,
  getNTDDFM, getNTDMould, getNTDMfg, setNTDMfg, getNTDTrials,
  getNTDStage11, setNTDStage11, advanceNTDStage, saveNTDRecord,
  appendActivity, getMouldSubStage, getDFMProgress, getMouldProgress,
  getTrialProgress, getStage11CurrentSubstep, isNTDComplete,
  createVersionedFile, addFileVersion, generateVendorToken,
} from "@/lib/ntd"
import type { NTDRecord, NTDStage, NTDRole, NTDRFQData, NTDMfgData, NTDStage2Query } from "@/types/ntd"
import { ActivityFeed } from "@/components/ntd/ActivityFeed"
import { VersionedFileInput } from "@/components/ntd/VersionedFileInput"

const STAGE_NAMES: Record<number, string> = {
  1: "Initiation", 2: "Spec & Sign-off", 3: "RFQ Dispatch", 4: "Quotation Review",
  5: "Supplier Selection", 6: "Design Handoff", 7: "DFM", 8: "Mould Design",
  9: "Manufacturing", 10: "Trials", 11: "Commissioning",
}

const VENDOR_CATALOG = [
  "Precision Tools Ltd", "Global Mould Co", "Apex Engineering", "MasterCraft Tools",
  "TechForm Industries", "Meridian Manufacturing", "Elite Tooling", "ProMould Solutions",
]

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
  const [comparisons, setComparisons] = useState<{ id: string; vendor_name: string; spec_doc_link: string; notes: string }[]>([])
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [customVendorName, setCustomVendorName] = useState("")
  const [mfgUpdate, setMfgUpdate] = useState("")
  const [mfgStartDate, setMfgStartDate] = useState("")
  const [mfgEta, setMfgEta] = useState("")

  // Stage 2 query
  const [queryText, setQueryText] = useState("")
  const [queryResponseText, setQueryResponseText] = useState<Record<string, string>>({})

  // Stage 6 component builder
  const [components, setComponents] = useState<{ id: string; name: string }[]>([{ id: "C01", name: "" }])
  const [finalDesignSlots, setFinalDesignSlots] = useState<{ id: string; slotName: string; link: string }[]>([{ id: "1", slotName: "", link: "" }])

  // Stage 11
  const [s11Step, setS11Step] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)

  const reload = useCallback(() => {
    const r = getNTDRecord(id)
    if (r) setRecord(r)
    setS11Step(getStage11CurrentSubstep(id))
  }, [id])

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
    reload()
    const t = setInterval(reload, 3000)
    const onRole = () => setCurrentRole(localStorage.getItem("poc_role") ?? "")
    window.addEventListener("rolechange", onRole)
    return () => { clearInterval(t); window.removeEventListener("rolechange", onRole) }
  }, [reload])

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
  const selectionData = getNTDSelection(id)
  const handoffData = getNTDHandoff(id)
  const dfmData = getNTDDFM(id)
  const mouldData = getNTDMould(id)
  const mfgData = getNTDMfg(id)
  const trialsData = getNTDTrials(id)
  const s11Data = getNTDStage11(id)

  const mouldSubStage = getMouldSubStage(id)
  const dfmProgress = getDFMProgress(id)
  const mouldProgress = getMouldProgress(id)
  const trialProgress = getTrialProgress(id)
  const complete = isNTDComplete(id)

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
    const existing = specData ?? {
      spec_sheet: createVersionedFile("Spec Sheet", specSheet, currentRole),
      comparisons: comparisons.map(c => ({ row_id: c.id, vendor_name: c.vendor_name, spec_doc_link: c.spec_doc_link, notes: c.notes })),
      queries: [],
      sourcing_signed: false, sourcing_signed_by: "", sourcing_signed_at: "",
    }
    const now = new Date().toISOString()
    const updated = { ...existing, sourcing_signed: true, sourcing_signed_by: currentRole, sourcing_signed_at: now }
    setNTDSpec(id, updated)
    appendActivity(id, currentRole, ntdRole, 2, "stage_complete", "Stage 2 sourcing sign-off — advancing to RFQ Dispatch")
    advanceNTDStage(id, 3, currentRole, ntdRole)
    reload()
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
  const handleSendRFQ = (vendorId: string) => {
    const existing = rfqData ?? { vendors: {} }
    const vendor = existing.vendors[vendorId]
    if (!vendor) return
    const updated: NTDRFQData = {
      vendors: {
        ...existing.vendors,
        [vendorId]: { ...vendor, sent: true, sent_at: new Date().toISOString(), sent_by: currentRole },
      }
    }
    setNTDRFQ(id, updated)
    appendActivity(id, currentRole, ntdRole, 3, "supplier_submitted", `RFQ sent to ${vendor.vendor_name}`, { vendor_id: vendorId })
    reload()
  }

  const handleAddVendorToRFQ = (vendorName: string, isCatalog: boolean) => {
    const existing = rfqData ?? { vendors: {} }
    const vendorId = `vendor_${Date.now()}`
    setNTDRFQ(id, {
      vendors: {
        ...existing.vendors,
        [vendorId]: {
          vendor_name: vendorName,
          is_catalog: isCatalog,
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
    advanceNTDStage(id, 4, currentRole, ntdRole)
    reload()
  }

  // ── Stage 5 selection ──
  const handleSelectSupplier = (vendorId: string, vendorName: string) => {
    const existing = selectionData ?? {
      selected_vendor_id: "", selected_vendor_name: "",
      sourcing_approved: false, sourcing_approved_by: "", sourcing_approved_at: "",
      rnd_acknowledged: false, rnd_acknowledged_by: "", rnd_acknowledged_at: "",
    }
    setNTDSelection(id, { ...existing, selected_vendor_id: vendorId, selected_vendor_name: vendorName, sourcing_approved: true, sourcing_approved_by: currentRole, sourcing_approved_at: new Date().toISOString() })
    const r = getNTDRecord(id)
    if (r) saveNTDRecord({ ...r, supplier: vendorName })
    appendActivity(id, currentRole, ntdRole, 5, "supplier_selected", `Supplier selected: ${vendorName}`, { vendor_id: vendorId })
    reload()
  }

  const handleRndAcknowledge = () => {
    if (!selectionData) return
    const updated = { ...selectionData, rnd_acknowledged: true, rnd_acknowledged_by: currentRole, rnd_acknowledged_at: new Date().toISOString() }
    setNTDSelection(id, updated)
    if (updated.sourcing_approved && updated.rnd_acknowledged) {
      advanceNTDStage(id, 6, currentRole, ntdRole)
    }
    appendActivity(id, currentRole, ntdRole, 5, "supplier_selected", "R&D acknowledged supplier selection")
    reload()
  }

  // ── Stage 6 handoff ──
  const handleSubmitHandoff = () => {
    const comps = components.filter(c => c.name.trim()).map(c => ({ componentId: c.id, name: c.name }))
    if (comps.length === 0) return
    const finalFiles = finalDesignSlots.filter(s => s.slotName.trim() && s.link.trim()).map(s => createVersionedFile(s.slotName, s.link, currentRole))
    setNTDHandoff(id, {
      components: comps,
      component_count: comps.length,
      final_designs: finalFiles,
      submitted_by: currentRole,
      submitted_at: new Date().toISOString(),
      supplier_acknowledged: false,
      supplier_acknowledged_at: "",
    })
    const r = getNTDRecord(id)
    if (r) saveNTDRecord({ ...r, component_count: comps.length })
    appendActivity(id, currentRole, ntdRole, 6, "supplier_submitted", `Design handoff submitted — ${comps.length} components`)
    reload()
  }

  const handleSimulateSupplierAck = () => {
    if (!handoffData) return
    setNTDHandoff(id, { ...handoffData, supplier_acknowledged: true, supplier_acknowledged_at: new Date().toISOString() })
    advanceNTDStage(id, 7, currentRole, ntdRole)
    appendActivity(id, currentRole, ntdRole, 6, "supplier_acknowledged", "Supplier acknowledged design handoff")
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

  // ── Card helpers ──
  function StageCard({
    stageNum, colorClass, title, children, doneLabel,
  }: {
    stageNum: number; colorClass: string; title: string; children: React.ReactNode; doneLabel?: string
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
              Submitted by {initData.submitted_by} · {initData.part_specs.length} spec file(s)
            </p>
          )}
        </div>
      </div>
      {initData && (
        <div className="border-t border-slate-200 px-4 py-2.5 space-y-2">
          {initData.notes && (
            <p className="text-xs text-slate-500 italic">{initData.notes}</p>
          )}
          <div className="flex flex-wrap gap-4">
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

  // Stage 2 — Spec Sheet, Query & Sourcing Sign-off
  if (stage >= 1) {
    const s2Queries = specData?.queries ?? []
    const hasOpenQuery = s2Queries.some(q => !q.resolved)
    cards.push(
      <StageCard key="s2" stageNum={2} colorClass="border-teal-500" title="Spec Sheet & Sign-off"
        doneLabel={specData?.sourcing_signed ? `Approved by ${specData.sourcing_signed_by}` : undefined}>
        <div className="space-y-5">

          {/* ── Spec sheet + vendor comparisons ── */}
          {!specData ? (
            isSourcing ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Spec Sheet Link <span className="text-red-500">*</span>
                  </label>
                  <input type="url" value={specSheet} onChange={e => setSpecSheet(e.target.value)}
                    placeholder="Drive / SharePoint link"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vendor Comparisons</p>
                    <button
                      onClick={() => setComparisons(prev => [...prev, { id: String(Date.now()), vendor_name: "", spec_doc_link: "", notes: "" }])}
                      className="text-xs text-teal-700 hover:text-teal-900 flex items-center gap-1 font-medium">
                      <Plus className="w-3 h-3" /> Add Row
                    </button>
                  </div>
                  {comparisons.length === 0 && (
                    <p className="text-xs text-slate-400 italic px-1">No comparisons added yet — optional</p>
                  )}
                  {comparisons.map(c => (
                    <div key={c.id} className="flex gap-2 items-start bg-slate-50 rounded-lg p-2">
                      <input type="text" placeholder="Vendor name" value={c.vendor_name}
                        onChange={e => setComparisons(prev => prev.map(x => x.id === c.id ? { ...x, vendor_name: e.target.value } : x))}
                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
                      <input type="url" placeholder="Spec doc link" value={c.spec_doc_link}
                        onChange={e => setComparisons(prev => prev.map(x => x.id === c.id ? { ...x, spec_doc_link: e.target.value } : x))}
                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
                      <input type="text" placeholder="Notes" value={c.notes}
                        onChange={e => setComparisons(prev => prev.map(x => x.id === c.id ? { ...x, notes: e.target.value } : x))}
                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
                      <button onClick={() => setComparisons(prev => prev.filter(x => x.id !== c.id))}
                        className="p-1 text-slate-300 hover:text-red-400 transition-colors mt-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-800">Awaiting sourcing to prepare the spec sheet.</p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Spec Sheet</p>
                <VersionedFileInput
                  file={specData.spec_sheet}
                  slotName="Spec Sheet"
                  role={ntdRole}
                  readOnly={!isSourcing}
                  onUpload={link => handleSpecFileAction("upload", link)}
                  onRevise={(link, note) => handleSpecFileAction("revise", link, note)}
                  onAddComment={() => {}}
                  onResolveComment={() => {}}
                />
              </div>
              {specData.comparisons.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vendor Comparisons</p>
                  <div className="space-y-1">
                    {specData.comparisons.map(c => (
                      <div key={c.row_id} className="flex items-center gap-3 text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="font-medium min-w-[120px] text-slate-800">{c.vendor_name || "—"}</span>
                        {c.spec_doc_link ? (
                          <a href={c.spec_doc_link} target="_blank" rel="noopener noreferrer"
                            className="text-blue-700 hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> Doc
                          </a>
                        ) : <span className="text-slate-400">No doc</span>}
                        {c.notes && <span className="text-slate-400">— {c.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Query thread ── */}
          {s2Queries.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Queries
                {hasOpenQuery && <span className="ml-1.5 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{s2Queries.filter(q => !q.resolved).length} open</span>}
              </p>
              {s2Queries.map(q => (
                <div key={q.query_id}
                  className={`rounded-xl border p-3 space-y-2 ${q.resolved ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{q.text}</p>
                      <p className="text-[10px] text-slate-400">Raised by {q.raised_by} · {new Date(q.raised_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${q.resolved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {q.resolved ? "Resolved" : "Open"}
                    </span>
                  </div>
                  {q.resolved && q.response && (
                    <div className="bg-white border border-emerald-200 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase mb-0.5">R&D Response</p>
                      <p className="text-xs text-slate-700">{q.response}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">by {q.resolved_by} · {new Date(q.resolved_at!).toLocaleString()}</p>
                    </div>
                  )}
                  {!q.resolved && isRnd && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={queryResponseText[q.query_id] ?? ""}
                        onChange={e => setQueryResponseText(prev => ({ ...prev, [q.query_id]: e.target.value }))}
                        placeholder="Type your response..."
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                      />
                      <button onClick={() => handleResolveQuery(q.query_id)}
                        className="text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg transition-colors">
                        Respond & Resolve
                      </button>
                    </div>
                  )}
                  {!q.resolved && !isRnd && (
                    <p className="text-[11px] text-amber-700 italic">Awaiting R&D response...</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Raise query (sourcing) ── */}
          {isSourcing && specData && !specData.sourcing_signed && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Raise a Query to R&D</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  placeholder="Type your query..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button onClick={handleRaiseQuery} disabled={!queryText.trim()}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
                  <AlertTriangle className="w-3.5 h-3.5" /> Raise Query
                </button>
              </div>
            </div>
          )}

          {/* ── Sourcing sign-off ── */}
          <div className={`rounded-xl border px-4 py-3 transition-colors ${specData?.sourcing_signed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sourcing Approval</p>
            {specData?.sourcing_signed ? (
              <div>
                <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved by {specData.sourcing_signed_by}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(specData.sourcing_signed_at).toLocaleString()}</p>
              </div>
            ) : isSourcing ? (
              <div className="space-y-2">
                {hasOpenQuery && (
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Resolve all open queries before approving.
                  </p>
                )}
                <button
                  onClick={handleSpecSignOff}
                  disabled={(!specData && !specSheet.trim()) || hasOpenQuery}
                  className="text-xs font-semibold bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors">
                  {!specData ? "Save & Approve →" : "Approve & Advance to Stage 3 →"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Awaiting sourcing approval</p>
            )}
          </div>

        </div>
      </StageCard>
    )
  }

  // Stage 3 — RFQ Dispatch
  if (stage >= 2) cards.push(
    <StageCard key="s3" stageNum={3} colorClass="border-indigo-500" title="RFQ Dispatch"
      doneLabel={rfqData ? `${Object.values(rfqData.vendors).filter(v => v.sent).length} RFQs sent` : undefined}>
      <div className="space-y-4">
        {/* Catalog vendor select */}
        {isSourcing && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Vendors</p>
            <div className="flex flex-wrap gap-2">
              {VENDOR_CATALOG.filter(v => !Object.values(rfqData?.vendors ?? {}).some(rv => rv.vendor_name === v)).map(v => (
                <button key={v} onClick={() => handleAddVendorToRFQ(v, true)}
                  className="text-xs border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors">
                  + {v}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Custom vendor name" value={customVendorName} onChange={e => setCustomVendorName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button onClick={() => { if (customVendorName.trim()) { handleAddVendorToRFQ(customVendorName.trim(), false); setCustomVendorName("") } }}
                disabled={!customVendorName.trim()}
                className="text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                Add Custom
              </button>
            </div>
          </div>
        )}

        {/* Vendor list */}
        {rfqData && Object.entries(rfqData.vendors).length > 0 && (
          <div className="space-y-2">
            {Object.entries(rfqData.vendors).map(([vid, v]) => {
              const rfqUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/rfq/ntd/${id}/${v.token}`
              return (
                <div key={vid} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{v.vendor_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {v.nda_required && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.nda_signed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          NDA {v.nda_signed ? "Signed" : "Required"}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.sent ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                        {v.sent ? "Sent" : "Pending"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.sent && <CopyButton text={rfqUrl} />}
                    {isSourcing && !v.sent && (
                      <button onClick={() => handleSendRFQ(vid)}
                        className="text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg transition-colors">
                        Send RFQ
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {isSourcing && rfqData && Object.values(rfqData.vendors).some(v => v.sent) && (
          <button onClick={handleAdvanceFromRFQ}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Proceed to Quotation Review <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </StageCard>
  )

  // Stage 4 — Quotation Review
  if (stage >= 3) cards.push(
    <StageCard key="s4" stageNum={4} colorClass="border-amber-500" title="Quotation Review"
      doneLabel={quotationData ? `${Object.values(quotationData).filter(v => v.status === "finalized").length} finalized` : undefined}>
      <div className="space-y-3">
        {rfqData && Object.entries(rfqData.vendors).map(([vid, vendor]) => {
          const q = quotationData?.[vid]
          return (
            <div key={vid} className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">{vendor.vendor_name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  q?.status === "finalized" ? "bg-emerald-100 text-emerald-700"
                  : q?.status === "negotiating" ? "bg-amber-100 text-amber-700"
                  : q?.status === "quotation_received" ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-500"}`}>
                  {q?.status ?? "Awaiting Quotation"}
                </span>
              </div>
              {q?.quotation ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Amount</p>
                    <p className="text-sm font-bold text-slate-800">{q.quotation.currency} {q.quotation.amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Lead Time</p>
                    <p className="text-sm font-bold text-slate-800">{q.quotation.lead_time_days}d</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Doc</p>
                    {q.quotation.doc_link
                      ? <a href={q.quotation.doc_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />View</a>
                      : <p className="text-xs text-slate-400">—</p>}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No quotation submitted yet. Share the RFQ URL for the vendor to submit.</p>
              )}
              {/* Thread messages */}
              {q?.thread && q.thread.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {q.thread.map(msg => (
                    <div key={msg.message_id}
                      className={`rounded-lg px-3 py-2 text-xs max-w-[80%] ${msg.author_type === "internal" ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-800 ml-auto"}`}>
                      <p className="font-semibold text-[10px] text-slate-500 mb-0.5">{msg.author_name} {msg.counter_offer ? `— Counter: ${msg.counter_offer}` : ""}</p>
                      {msg.text}
                    </div>
                  ))}
                </div>
              )}
              {isSourcing && q?.status !== "finalized" && (
                <div className="flex gap-2">
                  <button onClick={() => {
                    const existing = quotationData ?? {}
                    setNTDQuotation(id, { ...existing, [vid]: { ...(q ?? { quotation: undefined, thread: [], status: "sent" }), status: "finalized" } })
                    appendActivity(id, currentRole, ntdRole, 4, "quotation_submitted", `Quotation finalized for ${vendor.vendor_name}`, { vendor_id: vid })
                    reload()
                  }}
                    className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                    Mark Finalized
                  </button>
                </div>
              )}
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

  // Stage 5 — Supplier Selection
  if (stage >= 4) cards.push(
    <StageCard key="s5" stageNum={5} colorClass="border-blue-500" title="Supplier Selection"
      doneLabel={selectionData?.sourcing_approved ? `${selectionData.selected_vendor_name} selected` : undefined}>
      <div className="space-y-4">
        {!selectionData?.sourcing_approved ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Select the final supplier from finalized quotations:</p>
            {quotationData && Object.entries(rfqData?.vendors ?? {}).filter(([vid]) => quotationData[vid]?.status === "finalized").map(([vid, vendor]) => (
              <div key={vid} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-800">{vendor.vendor_name}</p>
                  <p className="text-xs text-slate-500">{quotationData[vid]?.quotation?.currency} {quotationData[vid]?.quotation?.amount?.toLocaleString()}</p>
                </div>
                {isSourcing && (
                  <button onClick={() => handleSelectSupplier(vid, vendor.vendor_name)}
                    className="text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white px-3 py-2 rounded-lg transition-colors">
                    Select as Supplier
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">{selectionData.selected_vendor_name}</p>
                <p className="text-xs text-blue-600">Selected by {selectionData.sourcing_approved_by}</p>
              </div>
            </div>
            {!selectionData.rnd_acknowledged ? (
              isRnd ? (
                <button onClick={handleRndAcknowledge}
                  className="text-sm font-semibold bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg transition-colors">
                  R&D Acknowledge Selection
                </button>
              ) : (
                <p className="text-xs text-slate-400 italic">Awaiting R&D acknowledgement...</p>
              )
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                R&D acknowledged by {selectionData.rnd_acknowledged_by}
              </div>
            )}
          </div>
        )}
      </div>
    </StageCard>
  )

  // Stage 6 — Design Handoff
  if (stage >= 5) cards.push(
    <StageCard key="s6" stageNum={6} colorClass="border-emerald-500" title="Final Design Handoff"
      doneLabel={handoffData?.supplier_acknowledged ? `${handoffData.component_count} components · Supplier acknowledged` : undefined}>
      <div className="space-y-4">
        {!handoffData?.submitted_by ? isRnd ? (
          <div className="space-y-4">
            {/* Component builder */}
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

            {/* Final design files */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Final Design Files</p>
                <button onClick={() => setFinalDesignSlots(prev => [...prev, { id: String(Date.now()), slotName: "", link: "" }])}
                  className="text-xs text-emerald-700 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Slot</button>
              </div>
              {finalDesignSlots.map(slot => (
                <div key={slot.id} className="flex gap-2 bg-slate-50 rounded-lg p-2">
                  <input type="text" placeholder="File name" value={slot.slotName}
                    onChange={e => setFinalDesignSlots(prev => prev.map(s => s.id === slot.id ? { ...s, slotName: e.target.value } : s))}
                    className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                  <input type="url" placeholder="Drive link" value={slot.link}
                    onChange={e => setFinalDesignSlots(prev => prev.map(s => s.id === slot.id ? { ...s, link: e.target.value } : s))}
                    className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                </div>
              ))}
            </div>

            <button onClick={handleSubmitHandoff}
              disabled={components.every(c => !c.name.trim())}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Submit & Notify Supplier
            </button>
          </div>
        ) : <p className="text-sm text-slate-400 italic">Awaiting R&D to submit design handoff...</p>
        : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{handoffData.component_count} components submitted by {handoffData.submitted_by}</p>
            {!handoffData.supplier_acknowledged ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-amber-800">Awaiting supplier acknowledgement</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-500">Supplier portal:</p>
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded">/supplier/ntd/{id}</code>
                  <CopyButton text={`${typeof window !== "undefined" ? window.location.origin : ""}/supplier/ntd/${id}`} />
                </div>
                {isRnd && (
                  <button onClick={handleSimulateSupplierAck}
                    className="text-xs font-semibold border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors">
                    ⚡ Simulate Supplier Acknowledgement (demo)
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Supplier acknowledged handoff
              </div>
            )}
          </div>
        )}
      </div>
    </StageCard>
  )

  // Stage 7 — DFM
  if (stage >= 6) cards.push(
    <StageCard key="s7" stageNum={7} colorClass="border-purple-500" title="DFM Review"
      doneLabel={dfmData?.stage_complete ? `${dfmProgress.approved}/${dfmProgress.total} approved` : undefined}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">{dfmProgress.approved} / {dfmProgress.total} components approved</p>
            {dfmProgress.total > 0 && (
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-48 mt-1">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.round((dfmProgress.approved / dfmProgress.total) * 100)}%` }} />
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
      </div>
    </StageCard>
  )

  // Stage 8 — Mould Design
  if (stage >= 7) cards.push(
    <StageCard key="s8" stageNum={8} colorClass="border-slate-500" title="Mould Design"
      doneLabel={mouldData?.stage_complete ? `${mouldProgress.approved} components approved` : undefined}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${mouldSubStage === "8A" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
            Sub-stage {mouldSubStage}
          </span>
          {mouldSubStage === "8A" && (
            <p className="text-sm text-slate-600">{mouldProgress.approved} / {mouldProgress.total} components approved</p>
          )}
        </div>
        {stage === 8 && (
          <Link href={`/ntd/${id}/mould-design`}
            className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
            Open Mould Design Review <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </StageCard>
  )

  // Stage 9 — Manufacturing
  if (stage >= 8) cards.push(
    <StageCard key="s9" stageNum={9} colorClass="border-blue-500" title="Manufacturing"
      doneLabel={mfgData?.status === "complete" ? `Completed · ETA was ${mfgData.eta_date}` : undefined}>
      <div className="space-y-3">
        {!mfgData ? (isSourcing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Start Date</label>
                <input type="date" value={mfgStartDate} onChange={e => setMfgStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">ETA Date</label>
                <input type="date" value={mfgEta} onChange={e => setMfgEta(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <button onClick={handleMfgStart}
              className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors">
              Confirm Manufacturing Start
            </button>
          </div>
        ) : <p className="text-sm text-slate-400 italic">Awaiting manufacturing start confirmation...</p>)
        : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-400 uppercase">Start Date</p>
                <p className="text-sm font-bold text-slate-800">{mfgData.mfg_start_date}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-400 uppercase">ETA</p>
                <p className="text-sm font-bold text-slate-800">{mfgData.eta_date || "—"}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-400 uppercase">Status</p>
                <span className={`text-xs font-bold ${mfgData.status === "complete" ? "text-emerald-700" : "text-blue-700"}`}>
                  {mfgData.status === "complete" ? "Complete" : "In Progress"}
                </span>
              </div>
            </div>
            {/* Updates feed */}
            {mfgData.updates.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {[...mfgData.updates].reverse().map(u => (
                  <div key={u.update_id} className="text-xs bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-400">{u.date}</span> — {u.note}
                  </div>
                ))}
              </div>
            )}
            {mfgData.status !== "complete" && isSourcing && (
              <div className="flex gap-2">
                <input type="text" placeholder="Post a status update..." value={mfgUpdate} onChange={e => setMfgUpdate(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={handleMfgUpdate} disabled={!mfgUpdate.trim()}
                  className="text-xs font-semibold bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                  Post
                </button>
                <button onClick={handleMfgComplete}
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                  Mark Complete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </StageCard>
  )

  // Stage 10 — Trials
  if (stage >= 9) cards.push(
    <StageCard key="s10" stageNum={10} colorClass="border-orange-500" title="Trials"
      doneLabel={trialsData?.stage_complete ? `All ${trialProgress.total} components passed` : undefined}>
      <div className="space-y-3">
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
      </div>
    </StageCard>
  )

  // Stage 11 — Commissioning
  if (stage >= 10) {
    const subStepNames = ["Inspection Report", "Commissioning", "Shipment", "EXIM Clearance", "Arrival", "Final Sign-off"]
    cards.push(
      <StageCard key="s11" stageNum={11} colorClass="border-slate-600" title="Commissioning & Dispatch"
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
                <div className="space-y-2">
                  <p className="text-slate-500">Step 1: Supplier must submit Final Inspection Report</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">/supplier/ntd/{id}</code>
                    <CopyButton text={`${typeof window !== "undefined" ? window.location.origin : ""}/supplier/ntd/${id}`} />
                  </div>
                  {s11Data?.inspection && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Inspection report submitted by {s11Data.inspection.submitted_by}
                    </div>
                  )}
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
          // Stage 11
          if (s11Data?.inspection?.report) docs.push({ stage: "Stage 11 — Commissioning", label: "Final Inspection Report", file: s11Data.inspection.report })
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
