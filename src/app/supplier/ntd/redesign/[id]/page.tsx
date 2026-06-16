"use client"
import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import {
  CheckCircle2, ExternalLink, Upload, AlertTriangle, RefreshCcw, FileText,
  ChevronDown, ChevronUp, Paperclip, X,
} from "lucide-react"
import {
  getNTDRecord, getNTDHandoff, getNTDDFM, getNTDMould, setNTDMould,
  getNTDRedesign, createVersionedFile, addFileVersion,
  appendActivity, getSLADeadline,
} from "@/lib/ntd"
import type { NTDMouldComponent, MouldReview } from "@/types/ntd"
import { SupplierPortalShell } from "@/components/SupplierPortalShell"

export default function SupplierRedesignPortal() {
  const params = useParams()
  const id = params.id as string

  const [uploads, setUploads] = useState<Record<string, { mould_3d: string; mfa_ppt: string; mould3dFileName?: string; mfaPptFileName?: string }>>({})
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})

  const readFileAsDataURL = (file: File, onDone: (dataUrl: string, name: string) => void) => {
    if (file.size > 8 * 1024 * 1024) { alert("File too large (max 8 MB). Use a Drive link instead."); return }
    const reader = new FileReader()
    reader.onload = () => onDone(reader.result as string, file.name)
    reader.readAsDataURL(file)
  }
  const [dfmOpen, setDfmOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // All localStorage reads happen only on the client inside useEffect
  const [record, setRecord] = useState<ReturnType<typeof getNTDRecord>>(null)
  const [handoff, setHandoff] = useState<ReturnType<typeof getNTDHandoff>>(null)
  const [dfmData, setDfmData] = useState<ReturnType<typeof getNTDDFM>>(null)
  const [redesignData, setRedesignData] = useState<ReturnType<typeof getNTDRedesign>>(null)
  const [mouldData, setMouldData] = useState<ReturnType<typeof getNTDMould>>(null)

  const reload = useCallback(() => {
    setRecord(getNTDRecord(id))
    setHandoff(getNTDHandoff(id))
    setDfmData(getNTDDFM(id))
    setRedesignData(getNTDRedesign(id))
    setMouldData(getNTDMould(id))
  }, [id])

  useEffect(() => {
    setMounted(true)
    reload()
    const t = setInterval(reload, 3000)
    return () => clearInterval(t)
  }, [reload])

  // Render nothing on server / before client mount to avoid hydration mismatch
  if (!mounted) return null

  if (!record || !handoff || !mouldData) {
    return (
      <SupplierPortalShell portalLabel="Mould Redesign" maxWidth="2xl">
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-slate-400">NTD record not found.</p>
        </div>
      </SupplierPortalShell>
    )
  }

  // Latest active redesign round
  const latestRound = redesignData?.redesign_rounds.slice().reverse().find(r => !r.resolved_at)
  const failedIds = latestRound?.failed_component_ids ?? []
  const failedComponents = mouldData.components.filter(c => failedIds.includes(c.componentId))

  // Components that are still actionable (not yet approved/under_review after resubmit)
  const pendingComponents = failedComponents.filter(c => c.final_status !== "approved")
  const allSubmitted = pendingComponents.length > 0 && pendingComponents.every(c =>
    c.final_status === "under_review" || submitted[c.componentId]
  )

  const handleUpload = (componentId: string) => {
    const up = uploads[componentId]
    if (!up?.mould_3d?.trim() || !up?.mfa_ppt?.trim()) return
    const fresh = getNTDMould(id)
    if (!fresh) return
    const now = new Date().toISOString()
    const sla = getSLADeadline(now)
    const pendingReview: MouldReview = { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "", sla_deadline: sla }
    const updated = {
      ...fresh,
      components: fresh.components.map((c: NTDMouldComponent) => {
        if (c.componentId !== componentId) return c
        return {
          ...c,
          mould_3d: c.mould_3d.versions[0]?.link === ""
            ? createVersionedFile("Mould 3D", up.mould_3d, "supplier")
            : addFileVersion(c.mould_3d, up.mould_3d, "supplier"),
          mfa_ppt: c.mfa_ppt.versions[0]?.link === ""
            ? createVersionedFile("MFA PPT", up.mfa_ppt, "supplier")
            : addFileVersion(c.mfa_ppt, up.mfa_ppt, "supplier"),
          rnd_review: pendingReview,
          sourcing_review: pendingReview,
          final_status: "under_review" as const,
          iteration_no: (c.iteration_no ?? 1) + 1,
        }
      })
    }
    setNTDMould(id, updated)
    appendActivity(id, "supplier", "supplier", 8, "supplier_submitted",
      `Redesign Round ${latestRound?.round_no ?? "?"} — Mould files resubmitted for ${componentId}`,
      { component_id: componentId })
    setSubmitted(prev => ({ ...prev, [componentId]: true }))
    setUploads(prev => { const n = { ...prev }; delete n[componentId]; return n })
  }

  return (
    <SupplierPortalShell portalLabel="Mould Redesign" maxWidth="2xl">
      {/* Title strip */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">New Tool Development</p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-base font-bold text-slate-900">{record.title}</h1>
          <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
            {record.id}
          </span>
        </div>
        {latestRound && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <RefreshCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-xs font-semibold text-amber-800">
              Redesign Round {latestRound.round_no} — triggered by Trial T{latestRound.triggered_by_trial}
            </p>
          </div>
        )}
      </div>

      {/* No active redesign */}
      {failedComponents.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No active redesign required.</p>
          <p className="text-sm text-slate-400 mt-1">All components have been approved or no trial has failed yet.</p>
        </div>
      )}

      {/* All submitted */}
      {allSubmitted && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">All redesign files submitted for review.</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              R&D and Sourcing will review the resubmitted designs. You'll be notified of the verdict.
            </p>
          </div>
        </div>
      )}

      {/* DFM reference files */}
      {dfmData && dfmData.components.some(c => c.final_status === "approved") && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <button onClick={() => setDfmOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <p className="font-semibold text-slate-800 text-sm">DFM Approved Reference Files</p>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">
                {dfmData.components.filter(c => c.final_status === "approved").length} components
              </span>
            </div>
            {dfmOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {dfmOpen && (
            <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-emerald-50/40">
              {dfmData.components.filter(c => c.final_status === "approved").map(c => {
                const pptLink = c.ppt.versions.find(v => v.version_no === c.ppt.current_version)?.link
                const d3Link = c.design_3d.versions.find(v => v.version_no === c.design_3d.current_version)?.link
                return (
                  <div key={c.componentId} className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-600">{c.componentId} — {c.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {pptLink && (
                        <a href={pptLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-white border border-emerald-200 text-emerald-800 font-medium px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
                          <ExternalLink className="w-3 h-3" /> PPT (v{c.ppt.current_version})
                        </a>
                      )}
                      {d3Link && (
                        <a href={d3Link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-white border border-emerald-200 text-emerald-800 font-medium px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
                          <ExternalLink className="w-3 h-3" /> 3D Design (v{c.design_3d.current_version})
                        </a>
                      )}
                      {c.rnd_docs?.map(doc => {
                        const docLink = doc.versions.find(v => v.version_no === doc.current_version)?.link
                        return docLink ? (
                          <a key={doc.file_id} href={docLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-white border border-blue-200 text-blue-700 font-medium px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                            <ExternalLink className="w-3 h-3" /> {doc.slot_name}
                          </a>
                        ) : null
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Reviewer feedback from previous round */}
      {failedComponents.some(c =>
        (c.rnd_review?.verdict === "rejected" || c.sourcing_review?.verdict === "rejected") &&
        c.final_status !== "under_review"
      ) && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Feedback from Last Review</p>
          {failedComponents.filter(c =>
            (c.rnd_review?.verdict === "rejected" || c.sourcing_review?.verdict === "rejected") &&
            c.final_status !== "under_review"
          ).map(c => (
            <div key={c.componentId} className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 space-y-2">
              <p className="text-xs font-bold text-red-800">{c.componentId} — {c.name}</p>
              {c.rnd_review?.verdict === "rejected" && c.rnd_review.comments && (
                <div>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">R&D Feedback</p>
                  <p className="text-xs text-red-700 mt-0.5">{c.rnd_review.comments}</p>
                </div>
              )}
              {c.sourcing_review?.verdict === "rejected" && c.sourcing_review.comments && (
                <div>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Sourcing Feedback</p>
                  <p className="text-xs text-red-700 mt-0.5">{c.sourcing_review.comments}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload forms — one per failed component */}
      {pendingComponents.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Submit Redesigned Files
          </p>
          {pendingComponents.map(comp => {
            const up = uploads[comp.componentId] ?? { mould_3d: "", mfa_ppt: "" }
            const isUnderReview = comp.final_status === "under_review" || submitted[comp.componentId]
            return (
              <div key={comp.componentId}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isUnderReview ? "border-amber-200" : "border-slate-200"}`}>
                {/* Component header */}
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isUnderReview ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100"}`}>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{comp.componentId} — {comp.name}</p>
                    {comp.iteration_no > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5">Iteration {comp.iteration_no}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isUnderReview ? "bg-amber-100 text-amber-700"
                    : comp.final_status === "revision_required" ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-500"
                  }`}>
                    {isUnderReview ? "Under Review" : comp.final_status === "revision_required" ? "Revision Required" : "Pending"}
                  </span>
                </div>

                {isUnderReview ? (
                  <div className="px-5 py-5 flex items-center gap-3 text-amber-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p className="text-sm font-medium">Files submitted — awaiting R&D and Sourcing review.</p>
                  </div>
                ) : (
                  <div className="px-5 py-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Mould 3D Design <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        {up.mould3dFileName ? (
                          <div className="flex-1 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                            <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="text-sm text-blue-700 truncate flex-1">{up.mould3dFileName}</span>
                            <button type="button" onClick={() => setUploads(prev => ({ ...prev, [comp.componentId]: { ...prev[comp.componentId], mould_3d: "", mould3dFileName: "" } }))}><X className="w-3.5 h-3.5 text-slate-400" /></button>
                          </div>
                        ) : (
                          <input type="text" autoComplete="off" placeholder="Drive / SharePoint link to 3D file" value={up.mould_3d}
                            onChange={e => setUploads(prev => ({ ...prev, [comp.componentId]: { ...prev[comp.componentId] ?? { mould_3d: "", mfa_ppt: "" }, mould_3d: e.target.value, mould3dFileName: "" } }))}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        )}
                        <label className="cursor-pointer flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-700 px-3 py-2.5 rounded-lg transition-colors shrink-0" title="Attach file">
                          <Paperclip className="w-3.5 h-3.5" />
                          <input type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) readFileAsDataURL(f, (url, name) => setUploads(prev => ({ ...prev, [comp.componentId]: { ...prev[comp.componentId] ?? { mould_3d: "", mfa_ppt: "" }, mould_3d: url, mould3dFileName: name } }))) }} />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> MFA Report (PPT) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        {up.mfaPptFileName ? (
                          <div className="flex-1 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                            <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="text-sm text-blue-700 truncate flex-1">{up.mfaPptFileName}</span>
                            <button type="button" onClick={() => setUploads(prev => ({ ...prev, [comp.componentId]: { ...prev[comp.componentId], mfa_ppt: "", mfaPptFileName: "" } }))}><X className="w-3.5 h-3.5 text-slate-400" /></button>
                          </div>
                        ) : (
                          <input type="text" autoComplete="off" placeholder="Drive / SharePoint link to PPT file" value={up.mfa_ppt}
                            onChange={e => setUploads(prev => ({ ...prev, [comp.componentId]: { ...prev[comp.componentId] ?? { mould_3d: "", mfa_ppt: "" }, mfa_ppt: e.target.value, mfaPptFileName: "" } }))}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        )}
                        <label className="cursor-pointer flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-700 px-3 py-2.5 rounded-lg transition-colors shrink-0" title="Attach file">
                          <Paperclip className="w-3.5 h-3.5" />
                          <input type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) readFileAsDataURL(f, (url, name) => setUploads(prev => ({ ...prev, [comp.componentId]: { ...prev[comp.componentId] ?? { mould_3d: "", mfa_ppt: "" }, mfa_ppt: url, mfaPptFileName: name } }))) }} />
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpload(comp.componentId)}
                      disabled={!up.mould_3d?.trim() || !up.mfa_ppt?.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
                      <Upload className="w-4 h-4" /> Submit Redesigned Files for {comp.componentId}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SupplierPortalShell>
  )
}
