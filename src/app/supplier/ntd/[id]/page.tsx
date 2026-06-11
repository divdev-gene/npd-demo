"use client"
import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { CheckCircle2, ExternalLink, Upload, FileText } from "lucide-react"
import { SupplierPortalShell } from "@/components/SupplierPortalShell"
import {
  getNTDRecord, getNTDInitiation, getNTDHandoff, setNTDHandoff, getNTDDFM, setNTDDFM,
  getNTDMould, setNTDMould, getNTDMfg, setNTDMfg, getNTDTrials, setNTDTrials,
  getNTDStage11, setNTDStage11, getCurrentNTDStage,
  createVersionedFile, addFileVersion, appendActivity, getSLADeadline,
  getActiveCommodities,
} from "@/lib/ntd"
import type { NTDDFMComponent, NTDMouldComponent, MouldReview, VersionedFile } from "@/types/ntd"

export default function SupplierNTDPortal() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string

  const [stage, setStage] = useState(1)
  const [record, setRecord] = useState<ReturnType<typeof getNTDRecord>>(null)
  const [activeCommodities, setActiveCommodities] = useState<string[]>([])
  const [selectedCommodity, setSelectedCommodity] = useState<string>("")

  const [dfmUploads, setDFMUploads] = useState<Record<string, { ppt: string; design_3d: string }>>({})
  const [mouldUploads, setMouldUploads] = useState<Record<string, { mould_3d: string; mfa_ppt: string }>>({})
  const [mfgStartDate, setMfgStartDate] = useState("")
  const [mfgEta, setMfgEta] = useState("")
  const [mfgUpdate, setMfgUpdate] = useState("")
  const [inspectionLink, setInspectionLink] = useState("")
  const [trialsState, setTrialsState] = useState<ReturnType<typeof getNTDTrials>>(null)

  useEffect(() => {
    const r = getNTDRecord(id)
    setRecord(r)
    if (r) setStage(getCurrentNTDStage(id))

    const commodities = getActiveCommodities(id)
    setActiveCommodities(commodities)

    // Init selectedCommodity from URL param if valid, else first commodity
    const urlCommodity = searchParams.get("commodity")
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
  }, [id, searchParams])

  if (!record) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400">NTD record not found.</p>
    </div>
  )

  const handoff = getNTDHandoff(id)
  const dfmData = getNTDDFM(id)
  const initData = getNTDInitiation(id)
  const mouldData = getNTDMould(id)
  const mfgData = getNTDMfg(id)
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
    // Force re-render
    setStage(s => s)
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
  const handleMfgStart = () => {
    setNTDMfg(id, { mfg_start_date: mfgStartDate, eta_date: mfgEta, updates: [], status: "in_progress", completed_by: "", completed_at: "" })
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 9, "manufacturing_update", "Supplier confirmed manufacturing start")
  }

  const handleMfgUpdatePost = () => {
    if (!mfgData || !mfgUpdate.trim()) return
    setNTDMfg(id, { ...mfgData, updates: [...mfgData.updates, { update_id: String(Date.now()), date: new Date().toISOString().split("T")[0], note: mfgUpdate.trim(), doc_link: undefined, posted_by: selectedCommodity + "-supplier", posted_by_role: "supplier" }] })
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 9, "manufacturing_update", mfgUpdate.trim())
    setMfgUpdate("")
  }

  const handleMfgComplete = () => {
    if (!mfgData) return
    setNTDMfg(id, { ...mfgData, status: "complete", completed_by: selectedCommodity + "-supplier", completed_at: new Date().toISOString() })
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 9, "manufacturing_complete", "Supplier marked manufacturing complete")
  }

  // ── Stage 10 — Sample dispatch ───────────────────────────────
  const handleDispatchSamples = (trialNo: number) => {
    const fresh = getNTDTrials(id)
    if (!fresh) return
    const updated = {
      ...fresh,
      trials: fresh.trials.map(t => t.trial_no === trialNo
        ? { ...t, status: "samples_dispatched" as const, samples_dispatched_at: new Date().toISOString() }
        : t)
    }
    setNTDTrials(id, updated)
    setTrialsState(updated)
    appendActivity(id, selectedCommodity + "-supplier", "supplier", 10, "samples_dispatched",
      `Trial T${trialNo} samples dispatched`, { trial_no: trialNo })
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
                  ...(c.ppt?.comments ?? []).filter(cm => cm.requires_revision && !cm.resolved).map(cm => ({ file: "DFM PPT", text: cm.text })),
                  ...(c.design_3d?.comments ?? []).filter(cm => cm.requires_revision && !cm.resolved).map(cm => ({ file: "3D Design", text: cm.text })),
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

                        {/* R&D revision feedback */}
                        {revComments.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Revision Feedback from R&D</p>
                            {revComments.map((rc, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="shrink-0 font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">{rc.file}</span>
                                <span className="text-slate-700">{rc.text}</span>
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
                                <p className="text-[10px] text-slate-500">DFM PPT link</p>
                                <input type="text" autoComplete="off" placeholder="Paste Drive / SharePoint link"
                                  value={dfmUploads[c.componentId]?.ppt ?? ""}
                                  onChange={e => setDFMUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], ppt: e.target.value } }))}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-500">3D Design link</p>
                                <input type="text" autoComplete="off" placeholder="Paste Drive / SharePoint link"
                                  value={dfmUploads[c.componentId]?.design_3d ?? ""}
                                  onChange={e => setDFMUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], design_3d: e.target.value } }))}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
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
                const revFeedback = [
                  ...(rndRejected && c.rnd_review.comments ? [{ from: "R&D", text: c.rnd_review.comments }] : []),
                  ...(sourcingRejected && c.sourcing_review.comments ? [{ from: "Sourcing", text: c.sourcing_review.comments }] : []),
                ]

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

                        {/* Revision feedback */}
                        {revFeedback.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Revision Feedback</p>
                            {revFeedback.map((f, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="shrink-0 font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">{f.from}</span>
                                <span className="text-slate-700">{f.text}</span>
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
                                <p className="text-[10px] text-slate-500">Mould 3D link</p>
                                <input type="text" autoComplete="off" placeholder="Paste Drive / SharePoint link"
                                  value={mouldUploads[c.componentId]?.mould_3d ?? ""}
                                  onChange={e => setMouldUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], mould_3d: e.target.value } }))}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-500">MFA PPT link</p>
                                <input type="text" autoComplete="off" placeholder="Paste Drive / SharePoint link"
                                  value={mouldUploads[c.componentId]?.mfa_ppt ?? ""}
                                  onChange={e => setMouldUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], mfa_ppt: e.target.value } }))}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
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

      {/* Stage 9 — Manufacturing */}
      {stage === 9 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800">Stage 9 — Manufacturing</h2>
          {!mfgData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                  <input type="date" value={mfgStartDate} onChange={e => setMfgStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">ETA Date</label>
                  <input type="date" value={mfgEta} onChange={e => setMfgEta(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
              </div>
              <button onClick={handleMfgStart} disabled={!mfgStartDate}
                className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
                Confirm Manufacturing Start
              </button>
            </div>
          ) : mfgData.status !== "complete" ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Start: {mfgData.mfg_start_date} · ETA: {mfgData.eta_date}</p>
              <div className="flex gap-2">
                <input type="text" placeholder="Status update..." value={mfgUpdate} onChange={e => setMfgUpdate(e.target.value)}
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
            <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Manufacturing complete</div>
          )}
        </div>
      )}

      {/* Stage 10 — Trial dispatch */}
      {stage === 10 && trialsData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800">Stage 10 — Sample Dispatch</h2>
          {trialsData.trials.filter(t => t.status === "pending").map(t => (
            <div key={t.trial_no} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <p className="font-semibold text-slate-800">Trial T{t.trial_no}</p>
              <button onClick={() => handleDispatchSamples(t.trial_no)}
                className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-3 py-2 rounded-lg transition-colors">
                Confirm Sample Dispatch
              </button>
            </div>
          ))}
          {trialsData.trials.every(t => t.status !== "pending") && (
            <p className="text-sm text-slate-500 italic">All trial samples dispatched. Awaiting R&D testing.</p>
          )}
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
              <input type="text" autoComplete="off" placeholder="Drive link to inspection report" value={inspectionLink} onChange={e => setInspectionLink(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
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
