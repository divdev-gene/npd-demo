"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { CheckCircle2, ExternalLink, Upload, FileText, Paperclip, X } from "lucide-react"
import { SupplierPortalShell } from "@/components/SupplierPortalShell"
import {
  getNTDRecord, getNTDInitiation, getNTDHandoff, setNTDHandoff, getNTDDFM, setNTDDFM,
  getNTDMould, setNTDMould, getNTDTrials, setNTDTrials,
  getNTDStage11, setNTDStage11, getCurrentNTDStage,
  createVersionedFile, addFileVersion, appendActivity, getSLADeadline,
  getActiveCommodities,
} from "@/lib/ntd"
import type { NTDDFMComponent, NTDMouldComponent, MouldReview, VersionedFile, NTDMfgData } from "@/types/ntd"

export default function SupplierNTDPortal() {
  const params = useParams()
  const id = params.id as string

  const [stage, setStage] = useState(1)
  const [record, setRecord] = useState<ReturnType<typeof getNTDRecord>>(null)
  const [activeCommodities, setActiveCommodities] = useState<string[]>([])
  const [selectedCommodity, setSelectedCommodity] = useState<string>("")

  const [refreshKey, setRefreshKey] = useState(0)
  const forceRefresh = () => setRefreshKey(k => k + 1)
  const [dfmUploads, setDFMUploads] = useState<Record<string, { ppt: string; design_3d: string; pptFileName?: string; design3dFileName?: string }>>({})
  const [mouldUploads, setMouldUploads] = useState<Record<string, { mould_3d: string; mfa_ppt: string; mould3dFileName?: string; mfaPptFileName?: string }>>({})
  const [mfgStartDate, setMfgStartDate] = useState("")
  const [mfgPhaseDays, setMfgPhaseDays] = useState({ rmSourcing: "", building: "", delivery: "" })
  const [mfgUpdate, setMfgUpdate] = useState("")
  const [inspectionLink, setInspectionLink] = useState("")
  const [inspectionFileName, setInspectionFileName] = useState("")
  const [trialsState, setTrialsState] = useState<ReturnType<typeof getNTDTrials>>(null)
  const [dispatchDates, setDispatchDates] = useState<Record<number, string>>({})
  const [dispatchEtas, setDispatchEtas] = useState<Record<number, string>>({})

  const readFileAsDataURL = (file: File, onDone: (dataUrl: string, name: string) => void) => {
    if (file.size > 8 * 1024 * 1024) { alert("File too large (max 8 MB). Use a Drive link instead."); return }
    const reader = new FileReader()
    reader.onload = () => onDone(reader.result as string, file.name)
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    const r = getNTDRecord(id)
    setRecord(r)
    if (r) setStage(getCurrentNTDStage(id))

    const commodities = getActiveCommodities(id)
    setActiveCommodities(commodities)

    // Init selectedCommodity from URL param if valid, else first commodity
    const urlCommodity = new URLSearchParams(window.location.search).get("commodity")
    if (urlCommodity && commodities.includes(urlCommodity)) {
      setSelectedCommodity(urlCommodity)
    } else if (commodities.length > 0) {
      setSelectedCommodity(commodities[0])
    }

    setTrialsState(getNTDTrials(id))

    const t = setInterval(() => {
      const r2 = getNTDRecord(id)
      if (r2) setStage(getCurrentNTDStage(id))
      setTrialsState(getNTDTrials(id))
    }, 3000)
    return () => clearInterval(t)
  }, [id])

  if (!record) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400">NTD record not found.</p>
    </div>
  )

  const handoff = getNTDHandoff(id)
  const dfmData = getNTDDFM(id)
  const initData = getNTDInitiation(id)
  const mouldData = getNTDMould(id)
  const trialsData = trialsState ?? getNTDTrials(id)
  const s11Data = getNTDStage11(id)

  // ── Stage 6 — per-commodity acknowledgement ──────────────────
  const isAcknowledged = !!(handoff?.supplier_acknowledged_by_commodity?.[selectedCommodity])

  const handleAcknowledge = () => {
    if (!handoff) return
    const updated = {
      ...handoff,
      supplier_acknowledged_by_commodity: {
        ...(handoff.supplier_acknowledged_by_commodity ?? {}),
        [selectedCommodity]: true,
      },
    }
    setNTDHandoff(id, updated)
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 6, "supplier_acknowledged",
      `${selectedCommodity} supplier acknowledged design handoff`)
    forceRefresh()
  }

  // ── Stage 7 — DFM submission per commodity ──────────────────
  const myCommodityDFMComponents = (dfmData?.components ?? []).filter(c => {
    const initComp = initData?.components.find(ic => ic.componentId === c.componentId)
    return initComp?.commodity === selectedCommodity && c.final_status !== "approved"
  })

  const handleDFMUpload = (componentId: string) => {
    const uploads = dfmUploads[componentId]
    if (!uploads?.ppt || !uploads?.design_3d) return
    if (!dfmData) return
    const updated = {
      ...dfmData,
      components: dfmData.components.map((c: NTDDFMComponent) => {
        if (c.componentId !== componentId) return c
        return {
          ...c,
          ppt: c.ppt.versions.length === 0 || c.ppt.versions[0].link === ""
            ? createVersionedFile("DFM PPT", uploads.ppt, selectedCommodity + "-supplier")
            : addFileVersion(c.ppt, uploads.ppt, selectedCommodity + "-supplier"),
          design_3d: c.design_3d.versions.length === 0 || c.design_3d.versions[0].link === ""
            ? createVersionedFile("3D Design", uploads.design_3d, selectedCommodity + "-supplier")
            : addFileVersion(c.design_3d, uploads.design_3d, selectedCommodity + "-supplier"),
          final_status: "under_review" as const,
          iteration_no: c.iteration_no + 1,
        }
      })
    }
    setNTDDFM(id, updated)
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 7, "supplier_submitted",
      `DFM files uploaded for ${componentId}`, { component_id: componentId })
    setDFMUploads(prev => { const n = { ...prev }; delete n[componentId]; return n })
  }

  // ── Stage 8 — Mould design submission per commodity ─────────
  const myCommodityMouldComponents = (mouldData?.components ?? []).filter(c => {
    const initComp = initData?.components.find(ic => ic.componentId === c.componentId)
    return initComp?.commodity === selectedCommodity && c.final_status !== "approved" && !c.locked
  })

  const handleMouldUpload = (componentId: string) => {
    const uploads = mouldUploads[componentId]
    if (!uploads?.mould_3d || !uploads?.mfa_ppt) return
    if (!mouldData) return
    const now = new Date().toISOString()
    const sla = getSLADeadline(now)
    const pendingReview: MouldReview = { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "", sla_deadline: sla }
    const updated = {
      ...mouldData,
      components: mouldData.components.map((c: NTDMouldComponent) => {
        if (c.componentId !== componentId) return c
        return {
          ...c,
          mould_3d: c.mould_3d.versions[0]?.link === ""
            ? createVersionedFile("Mould 3D", uploads.mould_3d, selectedCommodity + "-supplier")
            : addFileVersion(c.mould_3d, uploads.mould_3d, selectedCommodity + "-supplier"),
          mfa_ppt: c.mfa_ppt.versions[0]?.link === ""
            ? createVersionedFile("MFA PPT", uploads.mfa_ppt, selectedCommodity + "-supplier")
            : addFileVersion(c.mfa_ppt, uploads.mfa_ppt, selectedCommodity + "-supplier"),
          rnd_review: pendingReview,
          sourcing_review: pendingReview,
          final_status: "under_review" as const,
          iteration_no: c.iteration_no + 1,
        }
      })
    }
    setNTDMould(id, updated)
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 8, "supplier_submitted",
      `Mould design files uploaded for ${componentId}`, { component_id: componentId })
    setMouldUploads(prev => { const n = { ...prev }; delete n[componentId]; return n })
  }

  // ── Stage 9 — Manufacturing ──────────────────────────────────
  const getMfgV2 = (): Record<string, NTDMfgData> => {
    try { return JSON.parse(localStorage.getItem(`ntd_mfg_v2_${id}`) ?? "{}") } catch { return {} }
  }
  const setMfgV2 = (data: Record<string, NTDMfgData>) => {
    localStorage.setItem(`ntd_mfg_v2_${id}`, JSON.stringify(data))
  }

  const totalMfgDays = (Number(mfgPhaseDays.rmSourcing) || 0) + (Number(mfgPhaseDays.building) || 0) + (Number(mfgPhaseDays.delivery) || 0)
  const expectedDelivery = (() => {
    if (!mfgStartDate || totalMfgDays === 0) return ""
    const d = new Date(mfgStartDate)
    d.setDate(d.getDate() + totalMfgDays)
    return d.toISOString().split("T")[0]
  })()

  // Read current commodity's mfg record from v2 store
  const mfgV2ForCommodity: NTDMfgData | null = (() => {
    const v2 = getMfgV2()
    return v2[selectedCommodity] ?? null
  })()

  const handleMfgStart = () => {
    const phases: import("@/types/ntd").MfgPhase[] = [
      { name: "RM Sourcing", days: Number(mfgPhaseDays.rmSourcing) || 0 },
      { name: "Building / Manufacturing", days: Number(mfgPhaseDays.building) || 0 },
      { name: "Delivery / Shipping", days: Number(mfgPhaseDays.delivery) || 0 },
    ]
    const record: NTDMfgData = {
      mfg_start_date: mfgStartDate,
      eta_date: expectedDelivery,
      updates: [],
      status: "in_progress",
      completed_by: "",
      completed_at: "",
      phases,
    }
    const v2 = getMfgV2()
    setMfgV2({ ...v2, [selectedCommodity]: record })
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 9, "manufacturing_update",
      `${selectedCommodity} supplier submitted delivery timeline — ${totalMfgDays} days total, expected ${expectedDelivery}`)
    forceRefresh()
  }

  const handleMfgUpdatePost = () => {
    const current = getMfgV2()[selectedCommodity]
    if (!current || !mfgUpdate.trim()) return
    const v2 = getMfgV2()
    setMfgV2({ ...v2, [selectedCommodity]: { ...current, updates: [...current.updates, { update_id: String(Date.now()), date: new Date().toISOString().split("T")[0], note: mfgUpdate.trim(), doc_link: undefined, posted_by: selectedCommodity + "-supplier", posted_by_role: "supplier" }] } })
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 9, "manufacturing_update", mfgUpdate.trim())
    setMfgUpdate("")
    forceRefresh()
  }

  const handleMfgComplete = () => {
    const current = getMfgV2()[selectedCommodity]
    if (!current) return
    const v2 = getMfgV2()
    setMfgV2({ ...v2, [selectedCommodity]: { ...current, status: "complete", completed_by: selectedCommodity + "-supplier", completed_at: new Date().toISOString() } })
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 9, "manufacturing_complete", `${selectedCommodity} supplier marked manufacturing complete`)
    forceRefresh()
  }

  // ── Stage 10 — Sample dispatch ───────────────────────────────
  const handleDispatchSamples = (trialNo: number) => {
    const fresh = getNTDTrials(id)
    if (!fresh) return
    const dispatchDate = dispatchDates[trialNo] || new Date().toISOString().split("T")[0]
    const eta = dispatchEtas[trialNo] || ""
    const updated = {
      ...fresh,
      trials: fresh.trials.map(t => t.trial_no === trialNo
        ? {
            ...t,
            status: "samples_dispatched" as const,
            samples_dispatched_at: new Date(dispatchDate).toISOString(),
            // store eta in a loose field for display
            ...(eta ? { samples_eta: eta } : {}),
          }
        : t)
    }
    setNTDTrials(id, updated)
    setTrialsState(updated)
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 10, "samples_dispatched",
      `Trial T${trialNo} samples dispatched on ${dispatchDate}${eta ? `, ETA ${eta}` : ""}`, { trial_no: trialNo })
    forceRefresh()
  }

  // ── Stage 11 — Inspection report ────────────────────────────
  const inspectionForCommodity = s11Data?.inspection?.[selectedCommodity] ?? null

  const handleInspectionSubmit = () => {
    if (!inspectionLink.trim()) return
    const existing = s11Data ?? { inspection: null, commissioning: null, shipment: null, exim: null, arrival: null, final_approval: null }
    const report = createVersionedFile("Final Inspection Report", inspectionLink.trim(), selectedCommodity + "-supplier")
    const updated = {
      ...existing,
      inspection: {
        ...(existing.inspection ?? {}),
        [selectedCommodity]: {
          report,
          submitted_by: selectedCommodity + "-supplier",
          submitted_at: new Date().toISOString(),
        }
      }
    }
    setNTDStage11(id, updated)
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 11, "supplier_submitted",
      `Final inspection report submitted for ${selectedCommodity}`)
    setInspectionLink("")
  }

  return (
    <SupplierPortalShell portalLabel="NTD Tool Development" maxWidth="2xl">
      {/* NTD title strip */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">New Tool Development</p>
          <h1 className="text-base font-bold text-slate-900">{record.title}</h1>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stage</span>
          <p className="text-2xl font-black text-slate-800">{stage}</p>
        </div>
      </div>

      {/* Commodity selector — demo operator switch */}
      {activeCommodities.length > 1 && (
        <div className="mb-2 flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3">
          <label className="text-sm font-semibold text-slate-600">Viewing as:</label>
          <select
            value={selectedCommodity}
            onChange={e => setSelectedCommodity(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {activeCommodities.map(c => (
              <option key={c} value={c}>{c} Supplier</option>
            ))}
          </select>
          <span className="text-xs text-slate-400 italic">Switch to simulate a different commodity supplier&apos;s view</span>
        </div>
      )}
      {activeCommodities.length === 1 && selectedCommodity && (
        <div className="mb-2 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Commodity:</span>
          <span className="text-sm font-semibold text-indigo-900">{selectedCommodity}</span>
        </div>
      )}

      {/* Stage 6 — Acknowledge handoff */}
      {stage === 6 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800">Design Handoff Receipt</h2>
          {handoff && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">{handoff.component_count} component(s) · {handoff.final_designs.length} design file(s)</p>
              {handoff.final_designs.map(f => (
                <a key={f.file_id} href={f.versions[0]?.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> {f.slot_name}
                </a>
              ))}
            </div>
          )}
          {isAcknowledged
            ? <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Acknowledged by {selectedCommodity} Supplier</div>
            : <button onClick={handleAcknowledge} className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors">Confirm Receipt of All Files</button>}
        </div>
      )}

      {/* Stage 7 — DFM */}
      {stage === 7 && dfmData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Stage 7</p>
                <h2 className="text-base font-bold text-white mt-0.5">Design for Manufacturability (DFM)</h2>
                <p className="text-xs text-indigo-300 mt-0.5">{selectedCommodity} components</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {dfmData.components.filter(c => c.final_status === "approved").length}
                  <span className="text-indigo-400 text-lg"> / {dfmData.components.length}</span>
                </p>
                <p className="text-xs text-indigo-300">total approved</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-indigo-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-300 rounded-full transition-all duration-500"
                style={{ width: dfmData.components.length > 0 ? `${Math.round((dfmData.components.filter(c => c.final_status === "approved").length / dfmData.components.length) * 100)}%` : "0%" }} />
            </div>
          </div>

          <div className="p-6 space-y-4">
            {myCommodityDFMComponents.length === 0 ? (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="font-semibold text-emerald-800">All your {selectedCommodity} components are approved.</p>
              </div>
            ) : (
              myCommodityDFMComponents.map(c => {
                const isApproved = c.final_status === "approved"
                const revComments = [
                  ...(c.ppt?.comments ?? []).filter(cm => !cm.resolved).map(cm => ({ file: "DFM PPT", text: cm.text, requiresRevision: cm.requires_revision, attachmentLink: cm.attachment_link, attachmentName: cm.attachment_name })),
                  ...(c.design_3d?.comments ?? []).filter(cm => !cm.resolved).map(cm => ({ file: "3D Design", text: cm.text, requiresRevision: cm.requires_revision, attachmentLink: cm.attachment_link, attachmentName: cm.attachment_name })),
                ]
                const rndDocs = (c as NTDDFMComponent).rnd_docs ?? []
                const pptVer = c.ppt?.current_version ?? 0
                const d3dVer = c.design_3d?.current_version ?? 0
                const hasPrevSubmission = pptVer > 0 || d3dVer > 0

                return (
                  <div key={c.componentId} className={`rounded-xl border overflow-hidden ${
                    isApproved ? "border-emerald-200 opacity-60"
                    : c.final_status === "revision_required" ? "border-red-300"
                    : c.final_status === "under_review" ? "border-amber-200"
                    : "border-slate-200"
                  }`}>
                    {/* Component header */}
                    <div className={`flex items-center justify-between px-4 py-3 ${
                      isApproved ? "bg-emerald-50"
                      : c.final_status === "revision_required" ? "bg-red-50"
                      : c.final_status === "under_review" ? "bg-amber-50"
                      : "bg-slate-50"
                    }`}>
                      <div className="flex items-center gap-2.5">
                        {isApproved
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : <span className={`w-2.5 h-2.5 rounded-full ${
                              c.final_status === "revision_required" ? "bg-red-500"
                              : c.final_status === "under_review" ? "bg-amber-400"
                              : "bg-slate-300"}`} />}
                        <p className="font-bold text-slate-800 text-sm">{c.componentId} — {c.name}</p>
                        {c.iteration_no > 1 && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            Iteration {c.iteration_no}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isApproved ? "bg-emerald-100 text-emerald-700"
                        : c.final_status === "revision_required" ? "bg-red-100 text-red-700"
                        : c.final_status === "under_review" ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"}`}>
                        {isApproved ? "Approved" : c.final_status === "under_review" ? "Under Review" : c.final_status === "revision_required" ? "Revision Required" : "Pending"}
                      </span>
                    </div>

                    {!isApproved && (
                      <div className="p-4 space-y-4">
                        {/* R&D Reference Docs */}
                        {rndDocs.length > 0 && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                            <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">R&D Reference Documents</p>
                            <p className="text-[11px] text-indigo-600">R&D has shared the following documents for your reference:</p>
                            <div className="space-y-1.5">
                              {rndDocs.map(doc => {
                                const link = doc.versions.find(v => v.version_no === doc.current_version)?.link ?? ""
                                return (
                                  <a key={doc.file_id} href={link} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-3 py-2 hover:bg-indigo-50 transition-colors group">
                                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <span className="text-xs font-medium text-indigo-800 flex-1">{doc.slot_name}</span>
                                    <span className="text-[10px] text-indigo-400">v{doc.current_version}</span>
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* R&D feedback */}
                        {revComments.length > 0 && (
                          <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Feedback from R&D</p>
                            {revComments.map((rc, i) => (
                              <div key={i} className={`rounded-lg p-2 space-y-1 ${rc.requiresRevision ? "bg-red-50 border border-red-200" : "bg-white border border-slate-200"}`}>
                                <div className="flex items-start gap-2 text-xs">
                                  <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded text-[10px] ${rc.requiresRevision ? "text-red-500 bg-red-100" : "text-slate-500 bg-slate-100"}`}>{rc.file}</span>
                                  {rc.requiresRevision && (
                                    <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">Revision Required</span>
                                  )}
                                  <span className="text-slate-700">{rc.text}</span>
                                </div>
                                {rc.attachmentLink && (
                                  rc.attachmentLink.startsWith("data:") ? (
                                    <a href={rc.attachmentLink} download={rc.attachmentName ?? "attachment"} target="_blank" rel="noopener noreferrer"
                                      className="ml-1 flex items-center gap-1.5 text-[10px] text-blue-700 hover:underline font-medium">
                                      <Paperclip className="w-3 h-3 shrink-0" />
                                      {rc.attachmentName ?? "Attached file"}
                                    </a>
                                  ) : (
                                    <a href={rc.attachmentLink} target="_blank" rel="noopener noreferrer"
                                      className="ml-1 flex items-center gap-1.5 text-[10px] text-blue-700 hover:underline font-medium">
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                      {rc.attachmentName ?? rc.attachmentLink}
                                    </a>
                                  )
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Current submission summary */}
                        {hasPrevSubmission && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Your Current Submission</p>
                            <div className="flex gap-4">
                              {pptVer > 0 && (
                                <a href={c.ppt.versions.find(v => v.version_no === pptVer)?.link ?? "#"}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium">
                                  <ExternalLink className="w-3 h-3" /> DFM PPT
                                  <span className={`text-[10px] px-1 py-0.5 rounded font-bold ${c.ppt?.approved ? "bg-emerald-100 text-emerald-700" : revComments.some(r => r.file === "DFM PPT") ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                                    v{pptVer}{c.ppt?.approved ? " ✓" : ""}
                                  </span>
                                </a>
                              )}
                              {d3dVer > 0 && (
                                <a href={c.design_3d.versions.find(v => v.version_no === d3dVer)?.link ?? "#"}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium">
                                  <ExternalLink className="w-3 h-3" /> 3D Design
                                  <span className={`text-[10px] px-1 py-0.5 rounded font-bold ${c.design_3d?.approved ? "bg-emerald-100 text-emerald-700" : revComments.some(r => r.file === "3D Design") ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                                    v{d3dVer}{c.design_3d?.approved ? " ✓" : ""}
                                  </span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Upload form — only if not fully under review without revisions needed */}
                        {c.final_status !== "under_review" && (
                          <div className="space-y-2.5">
                            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              {c.final_status === "revision_required" ? "Upload Revised Files" : "Submit Files"}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-500">DFM PPT</p>
                                <div className="flex gap-1.5">
                                  {dfmUploads[c.componentId]?.pptFileName ? (
                                    <div className="flex-1 flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2">
                                      <Paperclip className="w-3 h-3 text-blue-600 shrink-0" />
                                      <span className="text-xs text-blue-700 truncate flex-1">{dfmUploads[c.componentId].pptFileName}</span>
                                      <button type="button" onClick={() => setDFMUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], ppt: "", pptFileName: "" } }))}><X className="w-3 h-3 text-slate-400" /></button>
                                    </div>
                                  ) : (
                                    <input type="text" autoComplete="off" placeholder="Drive / SharePoint link"
                                      value={dfmUploads[c.componentId]?.ppt ?? ""}
                                      onChange={e => setDFMUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], ppt: e.target.value, pptFileName: "" } }))}
                                      className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                  )}
                                  <label className="cursor-pointer flex items-center bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-400 hover:text-slate-600 px-2 py-2 rounded-lg transition-colors shrink-0" title="Attach file">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <input type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) readFileAsDataURL(f, (url, name) => setDFMUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], ppt: url, pptFileName: name } }))) }} />
                                  </label>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-500">3D Design</p>
                                <div className="flex gap-1.5">
                                  {dfmUploads[c.componentId]?.design3dFileName ? (
                                    <div className="flex-1 flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2">
                                      <Paperclip className="w-3 h-3 text-blue-600 shrink-0" />
                                      <span className="text-xs text-blue-700 truncate flex-1">{dfmUploads[c.componentId].design3dFileName}</span>
                                      <button type="button" onClick={() => setDFMUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], design_3d: "", design3dFileName: "" } }))}><X className="w-3 h-3 text-slate-400" /></button>
                                    </div>
                                  ) : (
                                    <input type="text" autoComplete="off" placeholder="Drive / SharePoint link"
                                      value={dfmUploads[c.componentId]?.design_3d ?? ""}
                                      onChange={e => setDFMUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], design_3d: e.target.value, design3dFileName: "" } }))}
                                      className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                  )}
                                  <label className="cursor-pointer flex items-center bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-400 hover:text-slate-600 px-2 py-2 rounded-lg transition-colors shrink-0" title="Attach file">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <input type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) readFileAsDataURL(f, (url, name) => setDFMUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], design_3d: url, design3dFileName: name } }))) }} />
                                  </label>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => handleDFMUpload(c.componentId)}
                              disabled={!dfmUploads[c.componentId]?.ppt || !dfmUploads[c.componentId]?.design_3d}
                              className="flex items-center gap-2 text-sm font-semibold bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors">
                              <Upload className="w-4 h-4" />
                              {c.final_status === "revision_required" ? "Submit Revised Files" : "Submit Files for Review"}
                            </button>
                          </div>
                        )}

                        {/* Under review notice */}
                        {c.final_status === "under_review" && (
                          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                            <p className="text-xs text-amber-800 font-medium">Files submitted — awaiting R&D review</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Stage 8 — Mould Design */}
      {stage === 8 && mouldData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-blue-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Stage 8</p>
                <h2 className="text-base font-bold text-white mt-0.5">Mould Design & MFA Submission</h2>
                <p className="text-xs text-blue-300 mt-0.5">{selectedCommodity} components</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {mouldData.components.filter(c => c.final_status === "approved" || c.locked).length}
                  <span className="text-blue-400 text-lg"> / {mouldData.components.length}</span>
                </p>
                <p className="text-xs text-blue-300">total approved</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-blue-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-300 rounded-full transition-all duration-500"
                style={{ width: mouldData.components.length > 0 ? `${Math.round((mouldData.components.filter(c => c.final_status === "approved" || c.locked).length / mouldData.components.length) * 100)}%` : "0%" }} />
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* DFM approved files reference */}
            {dfmData && dfmData.components.some(c => c.final_status === "approved") && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-800">DFM Approved Reference Files</p>
                </div>
                <p className="text-xs text-emerald-700">Use these approved DFM files as reference for your mould design submissions.</p>
                <div className="space-y-2">
                  {dfmData.components.filter(c => {
                    const initComp = initData?.components.find(ic => ic.componentId === c.componentId)
                    return c.final_status === "approved" && initComp?.commodity === selectedCommodity
                  }).map(c => {
                    const pptLink = c.ppt?.versions.find(v => v.version_no === c.ppt.current_version)?.link ?? ""
                    const d3dLink = c.design_3d?.versions.find(v => v.version_no === c.design_3d.current_version)?.link ?? ""
                    const rndDocs = (c as NTDDFMComponent).rnd_docs ?? []
                    return (
                      <div key={c.componentId} className="bg-white border border-emerald-200 rounded-lg px-3 py-2.5 space-y-2">
                        <p className="text-xs font-bold text-slate-700">{c.componentId} — {c.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {pptLink && (
                            <a href={pptLink} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium border border-blue-200 rounded-lg px-2.5 py-1">
                              <ExternalLink className="w-3 h-3" /> DFM PPT v{c.ppt.current_version}
                            </a>
                          )}
                          {d3dLink && (
                            <a href={d3dLink} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium border border-blue-200 rounded-lg px-2.5 py-1">
                              <ExternalLink className="w-3 h-3" /> 3D Design v{c.design_3d.current_version}
                            </a>
                          )}
                          {rndDocs.map(doc => {
                            const docLink = doc.versions.find(v => v.version_no === doc.current_version)?.link ?? ""
                            return docLink ? (
                              <a key={doc.file_id} href={docLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-indigo-700 hover:underline font-medium border border-indigo-200 rounded-lg px-2.5 py-1">
                                <ExternalLink className="w-3 h-3" /> {doc.slot_name}
                              </a>
                            ) : null
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Component cards — filtered to this commodity */}
            {myCommodityMouldComponents.length === 0 ? (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="font-semibold text-emerald-800">All your {selectedCommodity} components are approved — awaiting joint review.</p>
              </div>
            ) : (
              myCommodityMouldComponents.map(c => {
                const isApproved = c.final_status === "approved" || c.locked
                const mouldVer = c.mould_3d?.current_version ?? 0
                const mfaVer = c.mfa_ppt?.current_version ?? 0
                const hasPrevSubmission = mouldVer > 0 || mfaVer > 0

                // Revision feedback from either reviewer
                const rndRejected = c.rnd_review?.verdict === "rejected"
                const sourcingRejected = c.sourcing_review?.verdict === "rejected"
                type MouldFeedbackItem = { from: string; text: string; requiresRevision: boolean; attachmentLink?: string; attachmentName?: string }
                // Verdict-level comments (shown regardless of verdict, if non-empty)
                const verdictFeedback: MouldFeedbackItem[] = [
                  ...(c.rnd_review?.comments ? [{ from: "R&D", text: c.rnd_review.comments, requiresRevision: rndRejected }] : []),
                  ...(c.sourcing_review?.comments ? [{ from: "Sourcing", text: c.sourcing_review.comments, requiresRevision: sourcingRejected }] : []),
                ]
                // File-level comments (same pattern as DFM)
                const fileComments: MouldFeedbackItem[] = [
                  ...(c.mould_3d?.comments ?? []).filter(cm => !cm.resolved).map(cm => ({ from: "Mould 3D", text: cm.text, requiresRevision: cm.requires_revision, attachmentLink: cm.attachment_link, attachmentName: cm.attachment_name })),
                  ...(c.mfa_ppt?.comments ?? []).filter(cm => !cm.resolved).map(cm => ({ from: "MFA PPT", text: cm.text, requiresRevision: cm.requires_revision, attachmentLink: cm.attachment_link, attachmentName: cm.attachment_name })),
                ]
                const revFeedback: MouldFeedbackItem[] = [...verdictFeedback, ...fileComments]

                return (
                  <div key={c.componentId} className={`rounded-xl border overflow-hidden ${
                    isApproved ? "border-emerald-200 opacity-60"
                    : c.final_status === "revision_required" ? "border-red-300"
                    : c.final_status === "under_review" ? "border-amber-200"
                    : "border-slate-200"
                  }`}>
                    {/* Component header */}
                    <div className={`flex items-center justify-between px-4 py-3 ${
                      isApproved ? "bg-emerald-50"
                      : c.final_status === "revision_required" ? "bg-red-50"
                      : c.final_status === "under_review" ? "bg-amber-50"
                      : "bg-slate-50"
                    }`}>
                      <div className="flex items-center gap-2.5">
                        {isApproved
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : <span className={`w-2.5 h-2.5 rounded-full ${
                              c.final_status === "revision_required" ? "bg-red-500"
                              : c.final_status === "under_review" ? "bg-amber-400"
                              : "bg-slate-300"}`} />}
                        <p className="font-bold text-slate-800 text-sm">{c.componentId} — {c.name}</p>
                        {(c.iteration_no ?? 1) > 1 && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            Iteration {c.iteration_no}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isApproved ? "bg-emerald-100 text-emerald-700"
                        : c.final_status === "revision_required" ? "bg-red-100 text-red-700"
                        : c.final_status === "under_review" ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"}`}>
                        {isApproved ? "Approved" : c.final_status === "under_review" ? "Under Review"
                          : c.final_status === "revision_required" ? "Revision Required" : "Pending"}
                      </span>
                    </div>

                    {!isApproved && (
                      <div className="p-4 space-y-4">
                        {/* Review verdicts */}
                        {(c.rnd_review?.verdict !== "pending" || c.sourcing_review?.verdict !== "pending") && (
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "R&D Review", review: c.rnd_review },
                              { label: "Sourcing Review", review: c.sourcing_review },
                            ].map(({ label, review }) => review && (
                              <div key={label} className={`rounded-lg border px-3 py-2 text-xs ${
                                review.verdict === "approved" ? "border-emerald-200 bg-emerald-50"
                                : review.verdict === "rejected" ? "border-red-200 bg-red-50"
                                : "border-slate-200 bg-slate-50"}`}>
                                <p className="font-bold text-slate-500 text-[10px] uppercase mb-1">{label}</p>
                                {review.verdict === "approved" && (
                                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                    <CheckCircle2 className="w-3 h-3" /> Approved
                                  </span>
                                )}
                                {review.verdict === "rejected" && (
                                  <span className="text-red-700 font-semibold">Revision requested</span>
                                )}
                                {review.verdict === "pending" && (
                                  <span className="text-slate-400 italic">Pending</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Feedback from reviewers */}
                        {revFeedback.length > 0 && (
                          <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Feedback from Reviewers</p>
                            {revFeedback.map((f, i) => (
                              <div key={i} className={`rounded-lg p-2 space-y-1 ${f.requiresRevision ? "bg-red-50 border border-red-200" : "bg-white border border-slate-200"}`}>
                                <div className="flex items-start gap-2 text-xs">
                                  <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded text-[10px] ${f.requiresRevision ? "text-red-500 bg-red-100" : "text-slate-500 bg-slate-100"}`}>{f.from}</span>
                                  {f.requiresRevision && (
                                    <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">Revision Required</span>
                                  )}
                                  <span className="text-slate-700">{f.text}</span>
                                </div>
                                {f.attachmentLink && (
                                  f.attachmentLink.startsWith("data:") ? (
                                    <a href={f.attachmentLink} download={f.attachmentName ?? "attachment"} target="_blank" rel="noopener noreferrer"
                                      className="ml-1 flex items-center gap-1.5 text-[10px] text-blue-700 hover:underline font-medium">
                                      <Paperclip className="w-3 h-3 shrink-0" />
                                      {f.attachmentName ?? "Attached file"}
                                    </a>
                                  ) : (
                                    <a href={f.attachmentLink} target="_blank" rel="noopener noreferrer"
                                      className="ml-1 flex items-center gap-1.5 text-[10px] text-blue-700 hover:underline font-medium">
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                      {f.attachmentName ?? f.attachmentLink}
                                    </a>
                                  )
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Current submission */}
                        {hasPrevSubmission && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Your Current Submission</p>
                            <div className="flex gap-4">
                              {mouldVer > 0 && (
                                <a href={c.mould_3d.versions.find(v => v.version_no === mouldVer)?.link ?? "#"}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium">
                                  <ExternalLink className="w-3 h-3" /> Mould 3D
                                  <span className={`text-[10px] px-1 py-0.5 rounded font-bold ${rndRejected || sourcingRejected ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                                    v{mouldVer}
                                  </span>
                                </a>
                              )}
                              {mfaVer > 0 && (
                                <a href={c.mfa_ppt.versions.find(v => v.version_no === mfaVer)?.link ?? "#"}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium">
                                  <ExternalLink className="w-3 h-3" /> MFA PPT
                                  <span className={`text-[10px] px-1 py-0.5 rounded font-bold ${rndRejected || sourcingRejected ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                                    v{mfaVer}
                                  </span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Upload form */}
                        {c.final_status !== "under_review" && (
                          <div className="space-y-2.5">
                            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              {c.final_status === "revision_required" ? "Upload Revised Files" : "Submit Files"}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-500">Mould 3D</p>
                                <div className="flex gap-1.5">
                                  {mouldUploads[c.componentId]?.mould3dFileName ? (
                                    <div className="flex-1 flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2">
                                      <Paperclip className="w-3 h-3 text-blue-600 shrink-0" />
                                      <span className="text-xs text-blue-700 truncate flex-1">{mouldUploads[c.componentId].mould3dFileName}</span>
                                      <button type="button" onClick={() => setMouldUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], mould_3d: "", mould3dFileName: "" } }))}><X className="w-3 h-3 text-slate-400" /></button>
                                    </div>
                                  ) : (
                                    <input type="text" autoComplete="off" placeholder="Drive / SharePoint link"
                                      value={mouldUploads[c.componentId]?.mould_3d ?? ""}
                                      onChange={e => setMouldUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], mould_3d: e.target.value, mould3dFileName: "" } }))}
                                      className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                  )}
                                  <label className="cursor-pointer flex items-center bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-400 hover:text-slate-600 px-2 py-2 rounded-lg transition-colors shrink-0" title="Attach file">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <input type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) readFileAsDataURL(f, (url, name) => setMouldUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], mould_3d: url, mould3dFileName: name } }))) }} />
                                  </label>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-500">MFA PPT</p>
                                <div className="flex gap-1.5">
                                  {mouldUploads[c.componentId]?.mfaPptFileName ? (
                                    <div className="flex-1 flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2">
                                      <Paperclip className="w-3 h-3 text-blue-600 shrink-0" />
                                      <span className="text-xs text-blue-700 truncate flex-1">{mouldUploads[c.componentId].mfaPptFileName}</span>
                                      <button type="button" onClick={() => setMouldUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], mfa_ppt: "", mfaPptFileName: "" } }))}><X className="w-3 h-3 text-slate-400" /></button>
                                    </div>
                                  ) : (
                                    <input type="text" autoComplete="off" placeholder="Drive / SharePoint link"
                                      value={mouldUploads[c.componentId]?.mfa_ppt ?? ""}
                                      onChange={e => setMouldUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], mfa_ppt: e.target.value, mfaPptFileName: "" } }))}
                                      className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                  )}
                                  <label className="cursor-pointer flex items-center bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-400 hover:text-slate-600 px-2 py-2 rounded-lg transition-colors shrink-0" title="Attach file">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <input type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) readFileAsDataURL(f, (url, name) => setMouldUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], mfa_ppt: url, mfaPptFileName: name } }))) }} />
                                  </label>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => handleMouldUpload(c.componentId)}
                              disabled={!mouldUploads[c.componentId]?.mould_3d || !mouldUploads[c.componentId]?.mfa_ppt}
                              className="flex items-center gap-2 text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors">
                              <Upload className="w-4 h-4" />
                              {c.final_status === "revision_required" ? "Submit Revised Files" : "Submit Files for Review"}
                            </button>
                          </div>
                        )}

                        {/* Under review notice */}
                        {c.final_status === "under_review" && (
                          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                            <p className="text-xs text-amber-800 font-medium">Files submitted — awaiting R&D &amp; Sourcing review</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Stage 9 — Delivery Timeline */}
      {stage === 9 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-blue-900 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Stage 9</p>
            <h2 className="text-base font-bold text-white mt-0.5">Delivery Timeline</h2>
            <p className="text-xs text-blue-300 mt-0.5">{selectedCommodity} — submit your expected schedule</p>
          </div>

          <div className="p-6 space-y-5">
            {!mfgV2ForCommodity ? (
              /* ── Submission form ── */
              <div className="space-y-5">
                {/* Start date */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Manufacturing Start Date</label>
                  <input type="date" value={mfgStartDate} onChange={e => setMfgStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>

                {/* Phase rows */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Duration per Phase (days)</p>
                  {([
                    { key: "rmSourcing", label: "RM Sourcing", desc: "Procurement of raw materials" },
                    { key: "building",   label: "Building / Manufacturing", desc: "Tool building and machining" },
                    { key: "delivery",   label: "Delivery / Shipping", desc: "Dispatch to Amber Enterprises" },
                  ] as const).map(phase => (
                    <div key={phase.key} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{phase.label}</p>
                        <p className="text-[11px] text-slate-400">{phase.desc}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number" min="0" placeholder="0"
                          value={mfgPhaseDays[phase.key]}
                          onChange={e => setMfgPhaseDays(prev => ({ ...prev, [phase.key]: e.target.value }))}
                          className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <span className="text-xs text-slate-400 w-8">days</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary row */}
                {totalMfgDays > 0 && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Duration</p>
                      <p className="text-2xl font-black text-blue-900">{totalMfgDays} <span className="text-sm font-semibold">days</span></p>
                    </div>
                    {expectedDelivery && (
                      <div className="text-right">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Expected Delivery</p>
                        <p className="text-base font-bold text-blue-900">
                          {new Date(expectedDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleMfgStart}
                  disabled={!mfgStartDate || totalMfgDays === 0}
                  className="flex items-center gap-2 text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg transition-colors">
                  Submit Delivery Timeline
                </button>
              </div>
            ) : mfgV2ForCommodity.status !== "complete" ? (
              /* ── In-progress view ── */
              <div className="space-y-4">
                {/* Phase breakdown summary */}
                {(mfgV2ForCommodity.phases ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Submitted Timeline</p>
                    {mfgV2ForCommodity.phases!.map(p => (
                      <div key={p.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                        <span className="text-sm text-slate-700">{p.name}</span>
                        <span className="text-sm font-bold text-slate-800">{p.days} days</span>
                      </div>
                    ))}
                    {/* Total + expected delivery */}
                    <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase">Total</p>
                        <p className="text-lg font-black text-blue-900">
                          {mfgV2ForCommodity.phases!.reduce((s, p) => s + p.days, 0)} days
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-blue-600 uppercase">Expected Delivery</p>
                        <p className="text-sm font-bold text-blue-900">
                          {mfgV2ForCommodity.eta_date
                            ? new Date(mfgV2ForCommodity.eta_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">Start: {mfgV2ForCommodity.mfg_start_date}</p>
                  </div>
                )}

                {/* Status updates */}
                {(mfgV2ForCommodity.updates ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status Updates</p>
                    {[...(mfgV2ForCommodity.updates ?? [])].reverse().map(u => (
                      <div key={u.update_id} className="text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <span className="text-slate-400">{u.date}</span>
                        <span className="mx-1 text-slate-300">·</span>
                        <span>{u.note}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Post update */}
                <div className="flex gap-2">
                  <input type="text" placeholder="Post a status update..." value={mfgUpdate} onChange={e => setMfgUpdate(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={handleMfgUpdatePost} disabled={!mfgUpdate.trim()}
                    className="text-sm font-semibold bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">Post</button>
                </div>
                <button onClick={handleMfgComplete}
                  className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Mark Manufacturing Complete
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Manufacturing complete
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stage 10 — Trial Sample Dispatch */}
      {stage === 10 && trialsData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-orange-700 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-200">Stage 10</p>
            <h2 className="text-base font-bold text-white mt-0.5">Sample Dispatch</h2>
            <p className="text-xs text-orange-200 mt-0.5">Confirm dispatch of trial samples to Amber Enterprises</p>
          </div>

          <div className="p-6 space-y-4">
            {trialsData.trials.length === 0 && (
              <p className="text-sm text-slate-400 italic">No trials initiated yet. Awaiting R&D.</p>
            )}

            {trialsData.trials.map(t => {
              const isPending     = t.status === "pending"
              const isDispatched  = t.status === "samples_dispatched"
              const isReceived    = t.status === "samples_received"
              const isTesting     = t.status === "testing"
              const isComplete    = t.status === "complete"
              const isDone        = isReceived || isTesting || isComplete

              return (
                <div key={t.trial_no} className={`rounded-xl border p-4 space-y-3 ${
                  isComplete  ? "border-emerald-200 bg-emerald-50" :
                  isDone      ? "border-indigo-200 bg-indigo-50" :
                  isDispatched ? "border-blue-200 bg-blue-50" :
                  "border-slate-200 bg-slate-50"
                }`}>
                  {/* Trial header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                        isComplete ? "bg-emerald-600 text-white" :
                        isDone ? "bg-indigo-600 text-white" :
                        isDispatched ? "bg-blue-600 text-white" :
                        "bg-slate-300 text-slate-600"
                      }`}>T{t.trial_no}</div>
                      <p className="font-semibold text-slate-800">Trial {t.trial_no}</p>
                      {t.initiated_at && (
                        <span className="text-[10px] text-slate-400">
                          Initiated {new Date(t.initiated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      isComplete  ? "bg-emerald-100 text-emerald-700" :
                      isTesting   ? "bg-amber-100 text-amber-700" :
                      isReceived  ? "bg-indigo-100 text-indigo-700" :
                      isDispatched ? "bg-blue-100 text-blue-700" :
                      "bg-slate-200 text-slate-500"
                    }`}>
                      {isComplete ? "Complete" : isTesting ? "In Testing" : isReceived ? "Received by R&D" : isDispatched ? "Dispatched" : "Awaiting Dispatch"}
                    </span>
                  </div>

                  {/* Pending — dispatch form */}
                  {isPending && (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs text-slate-500">Enter dispatch details and confirm once samples are shipped.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Date</label>
                          <input type="date" value={dispatchDates[t.trial_no] ?? ""}
                            onChange={e => setDispatchDates(prev => ({ ...prev, [t.trial_no]: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Arrival (ETA)</label>
                          <input type="date" value={dispatchEtas[t.trial_no] ?? ""}
                            onChange={e => setDispatchEtas(prev => ({ ...prev, [t.trial_no]: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                        </div>
                      </div>
                      <button
                        onClick={() => handleDispatchSamples(t.trial_no)}
                        disabled={!dispatchDates[t.trial_no]}
                        className="flex items-center gap-2 text-sm font-semibold bg-orange-700 hover:bg-orange-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors">
                        Confirm Sample Dispatch
                      </button>
                    </div>
                  )}

                  {/* Dispatched — confirmation card */}
                  {isDispatched && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-blue-800">Samples dispatched</p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          {t.samples_dispatched_at
                            ? `Dispatched on ${new Date(t.samples_dispatched_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                            : ""}
                          {(t as Record<string, unknown>).samples_eta
                            ? ` · ETA ${new Date((t as Record<string, unknown>).samples_eta as string).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                            : ""}
                        </p>
                        <p className="text-xs text-blue-500 mt-1">Awaiting R&D to confirm receipt at plant.</p>
                      </div>
                    </div>
                  )}

                  {/* Received / Testing / Complete */}
                  {(isReceived || isTesting || isComplete) && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2.5 text-sm">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isComplete ? "text-emerald-600" : "text-indigo-600"}`} />
                      <div>
                        <p className={`font-semibold ${isComplete ? "text-emerald-800" : "text-indigo-800"}`}>
                          {isComplete ? "Trial complete" : isTesting ? "R&D testing in progress" : "Samples received by R&D"}
                        </p>
                        {t.samples_received_at && (
                          <p className="text-xs text-indigo-500 mt-0.5">
                            Received {new Date(t.samples_received_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {isComplete && t.result && (
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.result === "all_pass" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}>
                            {t.result === "all_pass" ? "All Pass" : "Partial Fail"}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stage 11 — Inspection report */}
      {stage === 11 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800">Stage 11 — Final Inspection Report</h2>
          <p className="text-xs text-slate-500">Submit the final inspection report for the <strong>{selectedCommodity}</strong> components.</p>
          {inspectionForCommodity ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Inspection report submitted
              </div>
              <a href={inspectionForCommodity.report.versions.find(v => v.version_no === inspectionForCommodity.report.current_version)?.link ?? "#"}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium">
                <ExternalLink className="w-3 h-3" /> {inspectionForCommodity.report.slot_name}
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                {inspectionFileName ? (
                  <div className="flex-1 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-sm text-blue-700 truncate flex-1">{inspectionFileName}</span>
                    <button type="button" onClick={() => { setInspectionLink(""); setInspectionFileName("") }}
                      className="text-slate-400 hover:text-slate-600 shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <input type="text" autoComplete="off" placeholder="Drive link to inspection report" value={inspectionLink}
                    onChange={e => { setInspectionLink(e.target.value); setInspectionFileName("") }}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                )}
                <label className="cursor-pointer flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors shrink-0"
                  title="Attach a file">
                  <Paperclip className="w-4 h-4" />
                  <input type="file" className="sr-only"
                    onChange={e => { const f = e.target.files?.[0]; if (f) readFileAsDataURL(f, (url, name) => { setInspectionLink(url); setInspectionFileName(name) }) }} />
                </label>
              </div>
              <button onClick={handleInspectionSubmit} disabled={!inspectionLink.trim()}
                className="flex items-center gap-1.5 text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
                <Upload className="w-4 h-4" /> Submit Inspection Report
              </button>
            </div>
          )}
        </div>
      )}

      {stage < 6 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-sm">NTD is at Stage {stage}. Supplier actions begin at Stage 6.</p>
        </div>
      )}
    </SupplierPortalShell>
  )
}
